-- Indique e Ganhe por usuário (override individual no admin)
-- Execute no SQL Editor do Supabase

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS indicacao_recompensa_custom NUMERIC(12,2);

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS indicacao_deposito_minimo_custom NUMERIC(12,2);

ALTER TABLE public.usuarios
  DROP CONSTRAINT IF EXISTS usuarios_indicacao_recompensa_custom_check;

ALTER TABLE public.usuarios
  ADD CONSTRAINT usuarios_indicacao_recompensa_custom_check
  CHECK (indicacao_recompensa_custom IS NULL OR indicacao_recompensa_custom >= 0);

ALTER TABLE public.usuarios
  DROP CONSTRAINT IF EXISTS usuarios_indicacao_deposito_minimo_custom_check;

ALTER TABLE public.usuarios
  ADD CONSTRAINT usuarios_indicacao_deposito_minimo_custom_check
  CHECK (indicacao_deposito_minimo_custom IS NULL OR indicacao_deposito_minimo_custom >= 0);

COMMENT ON COLUMN public.usuarios.indicacao_recompensa_custom IS
  'Recompensa personalizada em R$ para este indicador. NULL = usar site_config.indicacao_recompensa.';
COMMENT ON COLUMN public.usuarios.indicacao_deposito_minimo_custom IS
  'Depósito mínimo personalizado do indicado para este indicador. NULL = usar site_config.indicacao_deposito_minimo.';

CREATE OR REPLACE FUNCTION public.obter_indicacao_config_usuario(p_usuario_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario public.usuarios%ROWTYPE;
  v_global_recompensa NUMERIC;
  v_global_deposito_min NUMERIC;
BEGIN
  SELECT * INTO v_usuario
  FROM public.usuarios
  WHERE id = p_usuario_id;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'usuario_nao_encontrado');
  END IF;

  SELECT
    COALESCE(sc.indicacao_recompensa, 100),
    COALESCE(sc.indicacao_deposito_minimo, 50)
  INTO v_global_recompensa, v_global_deposito_min
  FROM public.site_config sc
  WHERE sc.id = 1;

  v_global_recompensa := COALESCE(v_global_recompensa, 100);
  v_global_deposito_min := COALESCE(v_global_deposito_min, 50);

  RETURN json_build_object(
    'ok', true,
    'recompensa', COALESCE(v_usuario.indicacao_recompensa_custom, v_global_recompensa),
    'deposito_minimo', COALESCE(v_usuario.indicacao_deposito_minimo_custom, v_global_deposito_min),
    'recompensa_custom', v_usuario.indicacao_recompensa_custom,
    'deposito_minimo_custom', v_usuario.indicacao_deposito_minimo_custom,
    'usa_padrao_plataforma',
      v_usuario.indicacao_recompensa_custom IS NULL
      AND v_usuario.indicacao_deposito_minimo_custom IS NULL,
    'global_recompensa', v_global_recompensa,
    'global_deposito_minimo', v_global_deposito_min
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.obter_indicacao_usuario_admin(p_usuario_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario public.usuarios%ROWTYPE;
  v_config JSON;
  v_total_indicados INT := 0;
  v_qualificados INT := 0;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT * INTO v_usuario
  FROM public.usuarios
  WHERE id = p_usuario_id;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'Usuário não encontrado');
  END IF;

  v_config := public.obter_indicacao_config_usuario(p_usuario_id);

  IF v_usuario.link_indicação IS NOT NULL AND TRIM(v_usuario.link_indicação) <> '' THEN
    SELECT COUNT(*)::INT
    INTO v_total_indicados
    FROM public.usuarios u
    WHERE u.indicado_por = v_usuario.link_indicação;

    v_qualificados := public.count_qualified_referrals(v_usuario.link_indicação);
  END IF;

  RETURN json_build_object(
    'ok', true,
    'link_indicacao', v_usuario.link_indicação,
    'recompensa_custom', v_usuario.indicacao_recompensa_custom,
    'deposito_minimo_custom', v_usuario.indicacao_deposito_minimo_custom,
    'usa_padrao_plataforma',
      v_usuario.indicacao_recompensa_custom IS NULL
      AND v_usuario.indicacao_deposito_minimo_custom IS NULL,
    'global_recompensa', (v_config->>'global_recompensa')::NUMERIC,
    'global_deposito_minimo', (v_config->>'global_deposito_minimo')::NUMERIC,
    'recompensa_efetiva', (v_config->>'recompensa')::NUMERIC,
    'deposito_minimo_efetivo', (v_config->>'deposito_minimo')::NUMERIC,
    'total_indicados', COALESCE(v_total_indicados, 0),
    'indicados_qualificados', COALESCE(v_qualificados, 0)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.atualizar_indicacao_usuario_admin(
  p_usuario_id UUID,
  p_usar_padrao_plataforma BOOLEAN DEFAULT false,
  p_recompensa NUMERIC DEFAULT NULL,
  p_deposito_minimo NUMERIC DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recompensa NUMERIC;
  v_deposito_min NUMERIC;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id = p_usuario_id) THEN
    RETURN json_build_object('ok', false, 'error', 'Usuário não encontrado');
  END IF;

  IF COALESCE(p_usar_padrao_plataforma, false) THEN
    UPDATE public.usuarios
    SET
      indicacao_recompensa_custom = NULL,
      indicacao_deposito_minimo_custom = NULL,
      updated_at = NOW()
    WHERE id = p_usuario_id;

    RETURN json_build_object('ok', true, 'usa_padrao_plataforma', true);
  END IF;

  IF p_recompensa IS NULL OR p_deposito_minimo IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'Informe recompensa e depósito mínimo.');
  END IF;

  v_recompensa := COALESCE(p_recompensa, 0);
  v_deposito_min := COALESCE(p_deposito_minimo, 0);

  IF v_recompensa < 0 THEN
    RETURN json_build_object('ok', false, 'error', 'Recompensa não pode ser negativa.');
  END IF;

  IF v_deposito_min < 0 THEN
    RETURN json_build_object('ok', false, 'error', 'Depósito mínimo não pode ser negativo.');
  END IF;

  UPDATE public.usuarios
  SET
    indicacao_recompensa_custom = v_recompensa,
    indicacao_deposito_minimo_custom = v_deposito_min,
    updated_at = NOW()
  WHERE id = p_usuario_id;

  RETURN json_build_object(
    'ok', true,
    'recompensa_custom', v_recompensa,
    'deposito_minimo_custom', v_deposito_min,
    'usa_padrao_plataforma', false
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.processar_recompensa_indicacao(
  p_usuario_indicado_id UUID,
  p_deposito_id UUID,
  p_valor_deposito NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_indicado_por TEXT;
  v_ja_paga BOOLEAN;
  v_recompensa NUMERIC;
  v_deposito_min NUMERIC;
  v_global_recompensa NUMERIC;
  v_global_deposito_min NUMERIC;
  v_referrer_id UUID;
  v_aprovados INT;
BEGIN
  IF p_usuario_indicado_id IS NULL THEN
    RETURN json_build_object('ok', true, 'aplicada', false, 'motivo', 'usuario_invalido');
  END IF;

  SELECT u.indicado_por, COALESCE(u.indicacao_recompensa_paga, false)
  INTO v_indicado_por, v_ja_paga
  FROM public.usuarios u
  WHERE u.id = p_usuario_indicado_id;

  IF NOT FOUND OR v_indicado_por IS NULL OR TRIM(v_indicado_por) = '' OR v_ja_paga THEN
    RETURN json_build_object('ok', true, 'aplicada', false);
  END IF;

  SELECT
    COALESCE(sc.indicacao_recompensa, 0),
    COALESCE(sc.indicacao_deposito_minimo, 50)
  INTO v_global_recompensa, v_global_deposito_min
  FROM public.site_config sc
  WHERE sc.id = 1;

  v_global_recompensa := COALESCE(v_global_recompensa, 0);
  v_global_deposito_min := COALESCE(v_global_deposito_min, 0);

  SELECT u.id
  INTO v_referrer_id
  FROM public.usuarios u
  WHERE u.link_indicação = v_indicado_por
  LIMIT 1;

  IF v_referrer_id IS NULL OR v_referrer_id = p_usuario_indicado_id THEN
    RETURN json_build_object('ok', true, 'aplicada', false, 'motivo', 'indicador_invalido');
  END IF;

  SELECT
    COALESCE(u.indicacao_recompensa_custom, v_global_recompensa),
    COALESCE(u.indicacao_deposito_minimo_custom, v_global_deposito_min)
  INTO v_recompensa, v_deposito_min
  FROM public.usuarios u
  WHERE u.id = v_referrer_id;

  v_recompensa := COALESCE(v_recompensa, 0);
  v_deposito_min := COALESCE(v_deposito_min, 0);

  IF v_recompensa <= 0 THEN
    RETURN json_build_object('ok', true, 'aplicada', false, 'motivo', 'desativada');
  END IF;

  SELECT COUNT(*)::INT
  INTO v_aprovados
  FROM public.depositos d
  WHERE d.usuario_id = p_usuario_indicado_id
    AND d.status = 'aprovado';

  IF COALESCE(v_aprovados, 0) != 1 THEN
    RETURN json_build_object('ok', true, 'aplicada', false, 'motivo', 'nao_primeiro_deposito');
  END IF;

  IF COALESCE(p_valor_deposito, 0) < v_deposito_min THEN
    RETURN json_build_object('ok', true, 'aplicada', false, 'motivo', 'deposito_insuficiente');
  END IF;

  UPDATE public.usuarios
  SET saldo = COALESCE(saldo, 0) + v_recompensa
  WHERE id = v_referrer_id;

  UPDATE public.usuarios
  SET
    indicacao_recompensa_paga = true,
    indicacao_recompensa_valor_pago = v_recompensa
  WHERE id = p_usuario_indicado_id;

  RETURN json_build_object(
    'ok', true,
    'aplicada', true,
    'indicador_id', v_referrer_id,
    'valor', v_recompensa,
    'deposito_id', p_deposito_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.obter_indicacao_config_usuario(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.obter_indicacao_usuario_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_indicacao_usuario_admin(UUID, BOOLEAN, NUMERIC, NUMERIC) TO authenticated;
