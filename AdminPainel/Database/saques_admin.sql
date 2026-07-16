-- Gestão avançada de saques no painel admin
-- Execute no SQL Editor do Supabase

ALTER TABLE public.saques ADD COLUMN IF NOT EXISTS origem TEXT NOT NULL DEFAULT 'pix';

ALTER TABLE public.saques DROP CONSTRAINT IF EXISTS saques_status_check;
ALTER TABLE public.saques
  ADD CONSTRAINT saques_status_check
  CHECK (status IN ('aprovado', 'rejeitado', 'pendente', 'falhou'));

ALTER TABLE public.saques DROP CONSTRAINT IF EXISTS saques_origem_check;
ALTER TABLE public.saques
  ADD CONSTRAINT saques_origem_check
  CHECK (origem IN ('pix', 'revenue_share'));

COMMENT ON COLUMN public.saques.origem IS 'Origem do saque: pix (normal) ou revenue_share';

-- Reutiliza função de período (criada em depositos_admin.sql)
CREATE OR REPLACE FUNCTION public._depositos_periodo_range(p_periodo TEXT)
RETURNS TABLE (inicio TIMESTAMPTZ, fim TIMESTAMPTZ)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_hoje DATE := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;
BEGIN
  CASE COALESCE(p_periodo, 'todos')
    WHEN 'hoje' THEN
      inicio := (v_hoje::TIMESTAMP AT TIME ZONE 'America/Sao_Paulo');
      fim := ((v_hoje + 1)::TIMESTAMP AT TIME ZONE 'America/Sao_Paulo');
    WHEN 'ontem' THEN
      inicio := ((v_hoje - 1)::TIMESTAMP AT TIME ZONE 'America/Sao_Paulo');
      fim := (v_hoje::TIMESTAMP AT TIME ZONE 'America/Sao_Paulo');
    WHEN '7dias' THEN
      inicio := ((v_hoje - 6)::TIMESTAMP AT TIME ZONE 'America/Sao_Paulo');
      fim := ((v_hoje + 1)::TIMESTAMP AT TIME ZONE 'America/Sao_Paulo');
    WHEN '30dias' THEN
      inicio := ((v_hoje - 29)::TIMESTAMP AT TIME ZONE 'America/Sao_Paulo');
      fim := ((v_hoje + 1)::TIMESTAMP AT TIME ZONE 'America/Sao_Paulo');
    WHEN 'mes' THEN
      inicio := (date_trunc('month', v_hoje::TIMESTAMP) AT TIME ZONE 'America/Sao_Paulo');
      fim := ((date_trunc('month', v_hoje::TIMESTAMP) + INTERVAL '1 month') AT TIME ZONE 'America/Sao_Paulo');
    ELSE
      inicio := NULL;
      fim := NULL;
  END CASE;
  RETURN NEXT;
END;
$$;

-- Devolve saldo ao rejeitar ou falhar saque pendente
CREATE OR REPLACE FUNCTION public.handle_saque_rejeitado()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('rejeitado', 'falhou') AND OLD.status = 'pendente' THEN
    UPDATE public.usuarios
    SET saldo = saldo + NEW.valor
    WHERE id = NEW.usuario_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS devolver_valor_saque_rejeitado ON public.saques;
CREATE TRIGGER devolver_valor_saque_rejeitado
  AFTER UPDATE OF status ON public.saques
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.handle_saque_rejeitado();

CREATE OR REPLACE FUNCTION public.obter_stats_saques_admin(p_periodo TEXT DEFAULT 'todos')
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inicio TIMESTAMPTZ;
  v_fim TIMESTAMPTZ;
  v_pendente_count INT;
  v_pendente_valor NUMERIC;
  v_aprovado_count INT;
  v_aprovado_valor NUMERIC;
  v_rejeitado_count INT;
  v_rejeitado_valor NUMERIC;
  v_falhou_count INT;
  v_falhou_valor NUMERIC;
  v_revenue_count INT;
  v_revenue_valor NUMERIC;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT r.inicio, r.fim INTO v_inicio, v_fim
  FROM public._depositos_periodo_range(p_periodo) r;

  IF v_inicio IS NULL THEN
    SELECT COUNT(*)::INT, COALESCE(SUM(valor), 0) INTO v_pendente_count, v_pendente_valor
    FROM public.saques WHERE status = 'pendente';

    SELECT COUNT(*)::INT, COALESCE(SUM(valor), 0) INTO v_aprovado_count, v_aprovado_valor
    FROM public.saques WHERE status = 'aprovado';

    SELECT COUNT(*)::INT, COALESCE(SUM(valor), 0) INTO v_rejeitado_count, v_rejeitado_valor
    FROM public.saques WHERE status = 'rejeitado';

    SELECT COUNT(*)::INT, COALESCE(SUM(valor), 0) INTO v_falhou_count, v_falhou_valor
    FROM public.saques WHERE status = 'falhou';

    SELECT COUNT(*)::INT, COALESCE(SUM(valor), 0) INTO v_revenue_count, v_revenue_valor
    FROM public.saques WHERE origem = 'revenue_share' AND status = 'aprovado';
  ELSE
    SELECT COUNT(*)::INT, COALESCE(SUM(valor), 0) INTO v_pendente_count, v_pendente_valor
    FROM public.saques WHERE status = 'pendente' AND data_hora >= v_inicio AND data_hora < v_fim;

    SELECT COUNT(*)::INT, COALESCE(SUM(valor), 0) INTO v_aprovado_count, v_aprovado_valor
    FROM public.saques WHERE status = 'aprovado' AND data_hora >= v_inicio AND data_hora < v_fim;

    SELECT COUNT(*)::INT, COALESCE(SUM(valor), 0) INTO v_rejeitado_count, v_rejeitado_valor
    FROM public.saques WHERE status = 'rejeitado' AND data_hora >= v_inicio AND data_hora < v_fim;

    SELECT COUNT(*)::INT, COALESCE(SUM(valor), 0) INTO v_falhou_count, v_falhou_valor
    FROM public.saques WHERE status = 'falhou' AND data_hora >= v_inicio AND data_hora < v_fim;

    SELECT COUNT(*)::INT, COALESCE(SUM(valor), 0) INTO v_revenue_count, v_revenue_valor
    FROM public.saques
    WHERE origem = 'revenue_share' AND status = 'aprovado'
      AND data_hora >= v_inicio AND data_hora < v_fim;
  END IF;

  RETURN json_build_object(
    'ok', true,
    'pendente_count', v_pendente_count,
    'pendente_valor', v_pendente_valor,
    'aprovado_count', v_aprovado_count,
    'aprovado_valor', v_aprovado_valor,
    'rejeitado_count', v_rejeitado_count,
    'rejeitado_valor', v_rejeitado_valor,
    'falhou_count', v_falhou_count,
    'falhou_valor', v_falhou_valor,
    'revenue_count', v_revenue_count,
    'revenue_valor', v_revenue_valor
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.listar_saques_admin(
  p_status TEXT DEFAULT NULL,
  p_periodo TEXT DEFAULT 'todos',
  p_busca TEXT DEFAULT NULL,
  p_pagina INT DEFAULT 1,
  p_por_pagina INT DEFAULT 11
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inicio TIMESTAMPTZ;
  v_fim TIMESTAMPTZ;
  v_offset INT;
  v_total INT;
  v_items JSON;
  v_busca TEXT;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  v_offset := GREATEST((COALESCE(p_pagina, 1) - 1) * COALESCE(p_por_pagina, 11), 0);
  v_busca := NULLIF(TRIM(p_busca), '');

  SELECT r.inicio, r.fim INTO v_inicio, v_fim
  FROM public._depositos_periodo_range(p_periodo) r;

  SELECT COUNT(*)::INT INTO v_total
  FROM public.saques s
  LEFT JOIN public.usuarios u ON u.id = s.usuario_id
  WHERE
    (v_inicio IS NULL OR (s.data_hora >= v_inicio AND s.data_hora < v_fim))
    AND (
      p_status IS NULL OR p_status = 'todos'
      OR (p_status = 'pendente' AND s.status = 'pendente')
      OR (p_status = 'aprovado' AND s.status = 'aprovado')
      OR (p_status = 'rejeitado' AND s.status = 'rejeitado')
      OR (p_status = 'falhou' AND s.status = 'falhou')
      OR (p_status = 'revenue_share' AND s.origem = 'revenue_share')
    )
    AND (
      v_busca IS NULL
      OR s.id::TEXT ILIKE '%' || v_busca || '%'
      OR s.valor::TEXT ILIKE '%' || v_busca || '%'
      OR s.chave ILIKE '%' || v_busca || '%'
      OR u.email ILIKE '%' || v_busca || '%'
      OR u.nome ILIKE '%' || v_busca || '%'
      OR u.usuario ILIKE '%' || v_busca || '%'
      OR u.usuario_nome ILIKE '%' || v_busca || '%'
      OR u.cpf ILIKE '%' || v_busca || '%'
    );

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_items
  FROM (
    SELECT
      s.id,
      s.usuario_id,
      s.valor,
      s.status,
      s.origem,
      s.key AS metodo_key,
      s.chave AS metodo_chave,
      s.data_hora,
      s.created_at,
      COALESCE(NULLIF(TRIM(u.usuario_nome), ''), NULLIF(TRIM(u.nome), ''), NULLIF(TRIM(u.usuario), ''), split_part(u.email, '@', 1)) AS usuario_nome,
      u.email AS usuario_email,
      u.cargo AS usuario_cargo
    FROM public.saques s
    LEFT JOIN public.usuarios u ON u.id = s.usuario_id
    WHERE
      (v_inicio IS NULL OR (s.data_hora >= v_inicio AND s.data_hora < v_fim))
      AND (
        p_status IS NULL OR p_status = 'todos'
        OR (p_status = 'pendente' AND s.status = 'pendente')
        OR (p_status = 'aprovado' AND s.status = 'aprovado')
        OR (p_status = 'rejeitado' AND s.status = 'rejeitado')
        OR (p_status = 'falhou' AND s.status = 'falhou')
        OR (p_status = 'revenue_share' AND s.origem = 'revenue_share')
      )
      AND (
        v_busca IS NULL
        OR s.id::TEXT ILIKE '%' || v_busca || '%'
        OR s.valor::TEXT ILIKE '%' || v_busca || '%'
        OR s.chave ILIKE '%' || v_busca || '%'
        OR u.email ILIKE '%' || v_busca || '%'
        OR u.nome ILIKE '%' || v_busca || '%'
        OR u.usuario ILIKE '%' || v_busca || '%'
        OR u.usuario_nome ILIKE '%' || v_busca || '%'
        OR u.cpf ILIKE '%' || v_busca || '%'
      )
    ORDER BY s.data_hora DESC
    LIMIT COALESCE(p_por_pagina, 11)
    OFFSET v_offset
  ) t;

  RETURN json_build_object(
    'ok', true,
    'total', v_total,
    'pagina', COALESCE(p_pagina, 1),
    'por_pagina', COALESCE(p_por_pagina, 11),
    'items', v_items
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.atualizar_status_saque_admin(
  p_saque_id UUID,
  p_status TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
  v_dep_status TEXT;
  v_valor NUMERIC;
  v_usuario_email TEXT;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  v_status := LOWER(TRIM(p_status));

  IF v_status NOT IN ('aprovado', 'rejeitado', 'pendente', 'falhou') THEN
    RETURN json_build_object('ok', false, 'error', 'Status inválido');
  END IF;

  SELECT s.status, s.valor, u.email
  INTO v_dep_status, v_valor, v_usuario_email
  FROM public.saques s
  LEFT JOIN public.usuarios u ON u.id = s.usuario_id
  WHERE s.id = p_saque_id
  FOR UPDATE OF s;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'Saque não encontrado');
  END IF;

  IF v_dep_status != 'pendente' AND v_status IN ('aprovado', 'rejeitado', 'falhou') THEN
    RETURN json_build_object('ok', false, 'error', 'Apenas saques pendentes podem ser alterados');
  END IF;

  UPDATE public.saques
  SET status = v_status, updated_at = NOW()
  WHERE id = p_saque_id;

  BEGIN
    PERFORM public.registrar_admin_log(
      'Alterar status de saque',
      format(
        'Saque %s: %s → %s | Valor: R$ %s | Usuário: %s',
        p_saque_id,
        v_dep_status,
        v_status,
        v_valor,
        COALESCE(v_usuario_email, '—')
      ),
      'sucesso',
      'saque',
      jsonb_build_object(
        'saque_id', p_saque_id,
        'status_anterior', v_dep_status,
        'status_novo', v_status,
        'valor', v_valor
      )
    );
  EXCEPTION
    WHEN undefined_function THEN NULL;
    WHEN undefined_table THEN NULL;
  END;

  RETURN json_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.reprovar_pendentes_saques_admin()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  UPDATE public.saques
  SET status = 'rejeitado', updated_at = NOW()
  WHERE status = 'pendente';

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN json_build_object('ok', true, 'reprovados', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.obter_stats_saques_admin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.listar_saques_admin(TEXT, TEXT, TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_status_saque_admin(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reprovar_pendentes_saques_admin() TO authenticated;
