-- Gestão de rollover por usuário (painel admin)
-- Execute no SQL Editor do Supabase após rollover_system.sql

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS rollover_meta NUMERIC(12,2) NOT NULL DEFAULT 0;

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS rollover_inicio TIMESTAMPTZ;

ALTER TABLE public.usuarios
  DROP CONSTRAINT IF EXISTS usuarios_rollover_meta_check;

ALTER TABLE public.usuarios
  ADD CONSTRAINT usuarios_rollover_meta_check
  CHECK (rollover_meta >= 0);

COMMENT ON COLUMN public.usuarios.rollover_meta IS
  'Meta total de apostas exigida pelo rollover ativo.';
COMMENT ON COLUMN public.usuarios.rollover_inicio IS
  'Data/hora em que a trava de rollover foi ativada.';

CREATE OR REPLACE FUNCTION public.aplicar_rollover_deposito(
  p_usuario_id UUID,
  p_valor NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_multiplicador NUMERIC;
  v_incremento NUMERIC;
  v_novo_pendente NUMERIC;
  v_meta_atual NUMERIC;
  v_pendente_atual NUMERIC;
BEGIN
  IF p_usuario_id IS NULL OR COALESCE(p_valor, 0) <= 0 THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(rollover_padrao, 0)
  INTO v_multiplicador
  FROM public.site_config
  WHERE id = 1;

  v_multiplicador := COALESCE(v_multiplicador, 0);
  IF v_multiplicador <= 0 THEN
    RETURN 0;
  END IF;

  v_incremento := ROUND(p_valor * v_multiplicador, 2);

  SELECT COALESCE(rollover_meta, 0), COALESCE(rollover_pendente, 0)
  INTO v_meta_atual, v_pendente_atual
  FROM public.usuarios
  WHERE id = p_usuario_id;

  UPDATE public.usuarios
  SET
    rollover_pendente = COALESCE(rollover_pendente, 0) + v_incremento,
    rollover_meta = COALESCE(rollover_meta, 0) + v_incremento,
    rollover_inicio = CASE
      WHEN COALESCE(v_meta_atual, 0) <= 0.009 AND COALESCE(v_pendente_atual, 0) <= 0.009 THEN NOW()
      ELSE rollover_inicio
    END
  WHERE id = p_usuario_id
  RETURNING rollover_pendente INTO v_novo_pendente;

  RETURN COALESCE(v_novo_pendente, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.obter_rollover_usuario_admin(p_usuario_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pendente NUMERIC;
  v_meta NUMERIC;
  v_inicio TIMESTAMPTZ;
  v_apostado NUMERIC;
  v_progresso NUMERIC;
  v_ativo BOOLEAN;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id = p_usuario_id) THEN
    RETURN json_build_object('ok', false, 'error', 'Usuário não encontrado');
  END IF;

  SELECT
    COALESCE(u.rollover_pendente, 0),
    COALESCE(u.rollover_meta, 0),
    u.rollover_inicio
  INTO v_pendente, v_meta, v_inicio
  FROM public.usuarios u
  WHERE u.id = p_usuario_id;

  IF v_meta <= 0.009 AND v_pendente > 0.009 THEN
    v_meta := v_pendente;
  END IF;

  v_ativo := COALESCE(v_pendente, 0) > 0.009;
  v_apostado := GREATEST(0, COALESCE(v_meta, 0) - COALESCE(v_pendente, 0));
  v_progresso := CASE
    WHEN COALESCE(v_meta, 0) > 0.009
    THEN ROUND((v_apostado / v_meta) * 100, 1)
    ELSE 0
  END;

  RETURN json_build_object(
    'ok', true,
    'ativo', v_ativo,
    'rollover_pendente', COALESCE(v_pendente, 0),
    'rollover_meta', COALESCE(v_meta, 0),
    'rollover_apostado', v_apostado,
    'progresso', v_progresso,
    'data_inicio', v_inicio,
    'saques_bloqueados', v_ativo
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.aplicar_rollover_usuario_admin(
  p_usuario_id UUID,
  p_valor NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valor NUMERIC;
  v_meta_atual NUMERIC;
  v_pendente_atual NUMERIC;
  v_novo_pendente NUMERIC;
  v_nova_meta NUMERIC;
  v_nome TEXT;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  v_valor := ROUND(COALESCE(p_valor, 0), 2);
  IF v_valor <= 0 THEN
    RETURN json_build_object('ok', false, 'error', 'Informe um valor maior que zero.');
  END IF;

  SELECT
    COALESCE(rollover_meta, 0),
    COALESCE(rollover_pendente, 0),
    COALESCE(
      NULLIF(TRIM(usuario_nome), ''),
      NULLIF(TRIM(nome), ''),
      NULLIF(TRIM(usuario), ''),
      split_part(email, '@', 1)
    )
  INTO v_meta_atual, v_pendente_atual, v_nome
  FROM public.usuarios
  WHERE id = p_usuario_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'Usuário não encontrado');
  END IF;

  UPDATE public.usuarios
  SET
    rollover_pendente = COALESCE(rollover_pendente, 0) + v_valor,
    rollover_meta = COALESCE(rollover_meta, 0) + v_valor,
    rollover_inicio = CASE
      WHEN COALESCE(v_meta_atual, 0) <= 0.009 AND COALESCE(v_pendente_atual, 0) <= 0.009 THEN NOW()
      ELSE rollover_inicio
    END,
    updated_at = NOW()
  WHERE id = p_usuario_id
  RETURNING rollover_pendente, rollover_meta
  INTO v_novo_pendente, v_nova_meta;

  PERFORM public.registrar_admin_log(
    'Rollover aplicado ao usuário',
    format('Usuário: %s | Valor adicionado: R$ %s | Novo pendente: R$ %s', COALESCE(v_nome, p_usuario_id::text), v_valor, v_novo_pendente),
    'sucesso',
    'usuarios',
    jsonb_build_object(
      'usuario_id', p_usuario_id,
      'valor_adicionado', v_valor,
      'rollover_pendente', v_novo_pendente,
      'rollover_meta', v_nova_meta
    )
  );

  RETURN json_build_object(
    'ok', true,
    'rollover_pendente', v_novo_pendente,
    'rollover_meta', v_nova_meta
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.desativar_rollover_usuario_admin(p_usuario_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nome TEXT;
  v_pendente NUMERIC;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT
    COALESCE(rollover_pendente, 0),
    COALESCE(
      NULLIF(TRIM(usuario_nome), ''),
      NULLIF(TRIM(nome), ''),
      NULLIF(TRIM(usuario), ''),
      split_part(email, '@', 1)
    )
  INTO v_pendente, v_nome
  FROM public.usuarios
  WHERE id = p_usuario_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'Usuário não encontrado');
  END IF;

  UPDATE public.usuarios
  SET
    rollover_pendente = 0,
    rollover_meta = 0,
    rollover_inicio = NULL,
    updated_at = NOW()
  WHERE id = p_usuario_id;

  PERFORM public.registrar_admin_log(
    'Rollover desativado',
    format('Usuário: %s | Pendente removido: R$ %s', COALESCE(v_nome, p_usuario_id::text), v_pendente),
    'sucesso',
    'usuarios',
    jsonb_build_object(
      'usuario_id', p_usuario_id,
      'rollover_removido', v_pendente
    )
  );

  RETURN json_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.obter_rollover_usuario_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.aplicar_rollover_usuario_admin(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.desativar_rollover_usuario_admin(UUID) TO authenticated;
