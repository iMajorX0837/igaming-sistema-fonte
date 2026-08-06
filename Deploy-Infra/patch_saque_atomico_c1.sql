-- =============================================================================
-- Patch C1 — Saque atômico (débito + insert na mesma transação)
-- Execute no SQL Editor do Supabase (produção/staging).
-- Seguro com a API/front já atualizados para rpc solicitar_saque.
-- =============================================================================

-- 1) Flags de ledger no saque
ALTER TABLE public.saques
  ADD COLUMN IF NOT EXISTS saldo_debitado BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.saques
  ADD COLUMN IF NOT EXISTS saldo_reembolsado BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.saques.saldo_debitado IS
  'true se o saldo foi debitado ao criar o saque; rejeição só reembolsa se true';

COMMENT ON COLUMN public.saques.saldo_reembolsado IS
  'true após devolver o saldo (rejeitado/falhou); evita double refund';

-- Saques pendentes legados (fluxo antigo insert+RPC): assumir que já debitaram
UPDATE public.saques
SET saldo_debitado = true
WHERE status = 'pendente'
  AND saldo_debitado = false;

-- 2) RPC atômica: valida + debita + cria pendente
CREATE OR REPLACE FUNCTION public.solicitar_saque(
  p_valor NUMERIC,
  p_key TEXT,
  p_chave TEXT,
  p_origem TEXT DEFAULT 'pix'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_saldo NUMERIC;
  v_rollover NUMERIC;
  v_min NUMERIC;
  v_max NUMERIC;
  v_limite_dia INT;
  v_count_dia INT;
  v_key TEXT;
  v_chave TEXT;
  v_origem TEXT;
  v_saque_id UUID;
  v_novo_saldo NUMERIC;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  v_key := lower(trim(COALESCE(p_key, '')));
  v_chave := trim(COALESCE(p_chave, ''));
  v_origem := lower(trim(COALESCE(p_origem, 'pix')));

  IF v_origem IS DISTINCT FROM 'pix' THEN
    RETURN json_build_object('success', false, 'error', 'origem_invalida');
  END IF;

  IF v_key NOT IN ('email', 'cpf', 'cnpj', 'telefone', 'chave aleatória') THEN
    RETURN json_build_object('success', false, 'error', 'tipo_chave_invalido');
  END IF;

  IF v_chave = '' THEN
    RETURN json_build_object('success', false, 'error', 'chave_obrigatoria');
  END IF;

  IF p_valor IS NULL OR p_valor <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'valor_invalido');
  END IF;

  SELECT COALESCE(saque_minimo, 50), COALESCE(saque_maximo, 1000000), COALESCE(saques_diarios_permitidos, 1)
  INTO v_min, v_max, v_limite_dia
  FROM public.site_config
  WHERE id = 1;

  v_min := COALESCE(v_min, 50);
  v_max := COALESCE(v_max, 1000000);
  v_limite_dia := COALESCE(v_limite_dia, 1);

  IF p_valor < v_min THEN
    RETURN json_build_object('success', false, 'error', format('Valor mínimo de saque: R$ %s', v_min));
  END IF;

  IF p_valor > v_max THEN
    RETURN json_build_object('success', false, 'error', format('Valor máximo de saque: R$ %s', v_max));
  END IF;

  SELECT COUNT(*)::INT
  INTO v_count_dia
  FROM public.saques
  WHERE usuario_id = v_uid
    AND (data_hora AT TIME ZONE 'America/Sao_Paulo')::date =
        (NOW() AT TIME ZONE 'America/Sao_Paulo')::date;

  IF v_count_dia >= v_limite_dia THEN
    RETURN json_build_object(
      'success', false,
      'error', format('Limite diário de saques atingido. Máximo de %s saque(s) por dia.', v_limite_dia)
    );
  END IF;

  SELECT COALESCE(saldo, 0), COALESCE(rollover_pendente, 0)
  INTO v_saldo, v_rollover
  FROM public.usuarios
  WHERE id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  IF v_rollover > 0.009 THEN
    RETURN json_build_object(
      'success', false,
      'error', format(
        'Rollover pendente: aposte mais R$ %s antes de sacar.',
        trim(to_char(v_rollover, 'FM999G999G990D00'))
      )
    );
  END IF;

  IF v_saldo < p_valor THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Saldo insuficiente',
      'saldo_atual', v_saldo
    );
  END IF;

  v_novo_saldo := round((v_saldo - p_valor)::numeric, 2);

  PERFORM set_config('app.skip_usuario_guard', 'true', true);

  UPDATE public.usuarios
  SET saldo = v_novo_saldo
  WHERE id = v_uid;

  INSERT INTO public.saques (
    usuario_id,
    valor,
    status,
    key,
    chave,
    origem,
    saldo_debitado,
    saldo_reembolsado
  )
  VALUES (
    v_uid,
    p_valor,
    'pendente',
    v_key,
    v_chave,
    'pix',
    true,
    false
  )
  RETURNING id INTO v_saque_id;

  RETURN json_build_object(
    'success', true,
    'saque_id', v_saque_id,
    'saldo_anterior', v_saldo,
    'saldo_atual', v_novo_saldo,
    'valor_saque', p_valor
  );
END;
$$;

COMMENT ON FUNCTION public.solicitar_saque(NUMERIC, TEXT, TEXT, TEXT) IS
  'Cria saque pendente e debita saldo na mesma transação. Único caminho permitido para usuários.';

REVOKE ALL ON FUNCTION public.solicitar_saque(NUMERIC, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.solicitar_saque(NUMERIC, TEXT, TEXT, TEXT) TO authenticated;

-- 3) Refund só se houve débito e ainda não reembolsou
CREATE OR REPLACE FUNCTION public.handle_saque_rejeitado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('rejeitado', 'falhou')
     AND OLD.status = 'pendente'
     AND COALESCE(OLD.saldo_debitado, false) = true
     AND COALESCE(OLD.saldo_reembolsado, false) = false
  THEN
    PERFORM set_config('app.skip_usuario_guard', 'true', true);

    UPDATE public.usuarios
    SET saldo = COALESCE(saldo, 0) + NEW.valor
    WHERE id = NEW.usuario_id;

    NEW.saldo_reembolsado := true;
  END IF;

  RETURN NEW;
END;
$$;

-- BEFORE para poder setar saldo_reembolsado em NEW
DROP TRIGGER IF EXISTS devolver_valor_saque_rejeitado ON public.saques;
CREATE TRIGGER devolver_valor_saque_rejeitado
  BEFORE UPDATE OF status ON public.saques
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.handle_saque_rejeitado();

-- 4) Bloqueia INSERT direto por authenticated (só via solicitar_saque / service_role)
DROP POLICY IF EXISTS "Usuários podem inserir apenas seus próprios saques" ON public.saques;
DROP POLICY IF EXISTS "saques_insert_own" ON public.saques;

-- 5) Revoga debito avulso (nao pode mais debitar sem criar saque)
-- IMPORTANTE: em Postgres o EXECUTE costuma estar em PUBLIC.
REVOKE ALL ON FUNCTION public.subtrair_saldo_saque(UUID, NUMERIC) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.subtrair_saldo_saque(UUID, NUMERIC) FROM anon;
REVOKE ALL ON FUNCTION public.subtrair_saldo_saque(UUID, NUMERIC) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.subtrair_saldo_saque(UUID, NUMERIC) TO service_role;

CREATE OR REPLACE FUNCTION public.subtrair_saldo_saque(
  p_usuario_id UUID,
  p_valor_saque NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('postgres', 'supabase_admin', 'service_role') THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;

  RETURN json_build_object(
    'success', false,
    'error', 'deprecated_use_solicitar_saque'
  );
END;
$$;

COMMENT ON FUNCTION public.subtrair_saldo_saque(UUID, NUMERIC) IS
  'Deprecated. Use solicitar_saque. Bloqueado para clientes.';

