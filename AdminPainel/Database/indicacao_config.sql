-- Sistema Indique e Ganhe (configurável no admin)
-- Execute no SQL Editor do Supabase

ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS indicacao_recompensa NUMERIC(12,2) NOT NULL DEFAULT 100;

ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS indicacao_deposito_minimo NUMERIC(12,2) NOT NULL DEFAULT 50;

ALTER TABLE public.site_config
  DROP CONSTRAINT IF EXISTS site_config_indicacao_recompensa_check;

ALTER TABLE public.site_config
  ADD CONSTRAINT site_config_indicacao_recompensa_check
  CHECK (indicacao_recompensa >= 0);

ALTER TABLE public.site_config
  DROP CONSTRAINT IF EXISTS site_config_indicacao_deposito_minimo_check;

ALTER TABLE public.site_config
  ADD CONSTRAINT site_config_indicacao_deposito_minimo_check
  CHECK (indicacao_deposito_minimo >= 0);

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS indicacao_recompensa_paga BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS indicacao_recompensa_valor_pago NUMERIC(12,2);

COMMENT ON COLUMN public.site_config.indicacao_recompensa IS
  'Valor em R$ creditado ao indicador quando o indicado faz o primeiro depósito qualificado.';
COMMENT ON COLUMN public.site_config.indicacao_deposito_minimo IS
  'Valor mínimo do primeiro depósito do indicado para validar a indicação.';
COMMENT ON COLUMN public.usuarios.indicacao_recompensa_paga IS
  'True quando o indicador já recebeu recompensa por este usuário indicado.';

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
  INTO v_recompensa, v_deposito_min
  FROM public.site_config sc
  WHERE sc.id = 1;

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

  SELECT u.id
  INTO v_referrer_id
  FROM public.usuarios u
  WHERE u.link_indicação = v_indicado_por
  LIMIT 1;

  IF v_referrer_id IS NULL OR v_referrer_id = p_usuario_indicado_id THEN
    RETURN json_build_object('ok', true, 'aplicada', false, 'motivo', 'indicador_invalido');
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

CREATE OR REPLACE FUNCTION public.count_qualified_referrals(referral_code_param TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF referral_code_param IS NULL OR TRIM(referral_code_param) = '' THEN
    RETURN 0;
  END IF;

  RETURN (
    SELECT COUNT(*)::INT
    FROM public.usuarios u
    WHERE u.indicado_por = referral_code_param
      AND COALESCE(u.indicacao_recompensa_paga, false) = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.obter_config_plataforma()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config public.site_config%ROWTYPE;
BEGIN
  SELECT * INTO v_config FROM public.site_config WHERE id = 1;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'ok', true,
      'deposito_minimo', 20,
      'deposito_maximo', 1000000,
      'saque_minimo', 50,
      'saque_maximo', 1000000,
      'saques_diarios_permitidos', 1,
      'rollover_padrao', 1,
      'indicacao_recompensa', 100,
      'indicacao_deposito_minimo', 50
    );
  END IF;

  RETURN json_build_object(
    'ok', true,
    'deposito_minimo', v_config.deposito_minimo,
    'deposito_maximo', v_config.deposito_maximo,
    'saque_minimo', v_config.saque_minimo,
    'saque_maximo', v_config.saque_maximo,
    'saques_diarios_permitidos', COALESCE(v_config.saques_diarios_permitidos, 1),
    'rollover_padrao', COALESCE(v_config.rollover_padrao, 1),
    'indicacao_recompensa', COALESCE(v_config.indicacao_recompensa, 100),
    'indicacao_deposito_minimo', COALESCE(v_config.indicacao_deposito_minimo, 50),
    'updated_at', v_config.updated_at
  );
END;
$$;

DROP FUNCTION IF EXISTS public.atualizar_config_plataforma_admin(NUMERIC, NUMERIC, NUMERIC, NUMERIC, INT);
DROP FUNCTION IF EXISTS public.atualizar_config_plataforma_admin(NUMERIC, NUMERIC, NUMERIC, NUMERIC, INT, NUMERIC);

CREATE OR REPLACE FUNCTION public.atualizar_config_plataforma_admin(
  p_deposito_minimo NUMERIC DEFAULT NULL,
  p_deposito_maximo NUMERIC DEFAULT NULL,
  p_saque_minimo NUMERIC DEFAULT NULL,
  p_saque_maximo NUMERIC DEFAULT NULL,
  p_saques_diarios_permitidos INT DEFAULT NULL,
  p_rollover_padrao NUMERIC DEFAULT NULL,
  p_indicacao_recompensa NUMERIC DEFAULT NULL,
  p_indicacao_deposito_minimo NUMERIC DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config public.site_config%ROWTYPE;
  v_dep_min NUMERIC;
  v_dep_max NUMERIC;
  v_saq_min NUMERIC;
  v_saq_max NUMERIC;
  v_saques_dia INT;
  v_rollover NUMERIC;
  v_ind_recompensa NUMERIC;
  v_ind_dep_min NUMERIC;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT * INTO v_config FROM public.site_config WHERE id = 1;

  IF NOT FOUND THEN
    INSERT INTO public.site_config (id) VALUES (1);
    SELECT * INTO v_config FROM public.site_config WHERE id = 1;
  END IF;

  v_dep_min := COALESCE(p_deposito_minimo, v_config.deposito_minimo);
  v_dep_max := COALESCE(p_deposito_maximo, v_config.deposito_maximo);
  v_saq_min := COALESCE(p_saque_minimo, v_config.saque_minimo);
  v_saq_max := COALESCE(p_saque_maximo, v_config.saque_maximo);
  v_saques_dia := COALESCE(p_saques_diarios_permitidos, v_config.saques_diarios_permitidos, 1);
  v_rollover := COALESCE(p_rollover_padrao, v_config.rollover_padrao, 1);
  v_ind_recompensa := COALESCE(p_indicacao_recompensa, v_config.indicacao_recompensa, 100);
  v_ind_dep_min := COALESCE(p_indicacao_deposito_minimo, v_config.indicacao_deposito_minimo, 50);

  IF v_dep_min <= 0 OR v_dep_max <= 0 OR v_saq_min <= 0 OR v_saq_max <= 0 THEN
    RETURN json_build_object('ok', false, 'error', 'Os valores devem ser maiores que zero.');
  END IF;

  IF v_saques_dia < 1 THEN
    RETURN json_build_object('ok', false, 'error', 'Saques diários permitidos deve ser no mínimo 1.');
  END IF;

  IF v_rollover < 0 THEN
    RETURN json_build_object('ok', false, 'error', 'Rollover padrão não pode ser negativo.');
  END IF;

  IF v_ind_recompensa < 0 THEN
    RETURN json_build_object('ok', false, 'error', 'Recompensa de indicação não pode ser negativa.');
  END IF;

  IF v_ind_dep_min < 0 THEN
    RETURN json_build_object('ok', false, 'error', 'Depósito mínimo de indicação não pode ser negativo.');
  END IF;

  IF v_dep_min > v_dep_max THEN
    RETURN json_build_object('ok', false, 'error', 'Depósito mínimo não pode ser maior que o máximo.');
  END IF;

  IF v_saq_min > v_saq_max THEN
    RETURN json_build_object('ok', false, 'error', 'Saque mínimo não pode ser maior que o máximo.');
  END IF;

  UPDATE public.site_config
  SET
    deposito_minimo = v_dep_min,
    deposito_maximo = v_dep_max,
    saque_minimo = v_saq_min,
    saque_maximo = v_saq_max,
    saques_diarios_permitidos = v_saques_dia,
    rollover_padrao = v_rollover,
    indicacao_recompensa = v_ind_recompensa,
    indicacao_deposito_minimo = v_ind_dep_min,
    updated_at = NOW()
  WHERE id = 1;

  BEGIN
    PERFORM public.registrar_admin_log(
      'Atualizar configurações da plataforma',
      format(
        'Indicação: R$ %s (dep. mín. R$ %s) | Rollover: %sx',
        v_ind_recompensa,
        v_ind_dep_min,
        v_rollover
      ),
      'sucesso',
      'config',
      jsonb_build_object(
        'indicacao_recompensa', v_ind_recompensa,
        'indicacao_deposito_minimo', v_ind_dep_min,
        'rollover_padrao', v_rollover
      )
    );
  EXCEPTION
    WHEN undefined_function THEN NULL;
  END;

  RETURN json_build_object(
    'ok', true,
    'deposito_minimo', v_dep_min,
    'deposito_maximo', v_dep_max,
    'saque_minimo', v_saq_min,
    'saque_maximo', v_saq_max,
    'saques_diarios_permitidos', v_saques_dia,
    'rollover_padrao', v_rollover,
    'indicacao_recompensa', v_ind_recompensa,
    'indicacao_deposito_minimo', v_ind_dep_min
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.confirmar_deposito_pix_pago(p_deposito_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_valor numeric;
  v_status text;
  v_usuario_id uuid;
  v_vip json;
  v_nivel int;
  v_total numeric;
  v_rollover numeric;
  v_indicacao json;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT usuario_id, valor, status INTO v_usuario_id, v_valor, v_status
  FROM public.depositos
  WHERE id = p_deposito_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'deposit_not_found');
  END IF;

  IF v_usuario_id != v_uid THEN
    RETURN json_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF v_status = 'aprovado' THEN
    SELECT vip_nivel, total_depositado INTO v_nivel, v_total
    FROM public.usuarios WHERE id = v_usuario_id;

    RETURN json_build_object(
      'ok', true,
      'already', true,
      'vip_nivel', COALESCE(v_nivel, 1),
      'total_depositado', COALESCE(v_total, 0),
      'subiu_nivel', false,
      'bonus_upgrade', 0
    );
  END IF;

  IF v_status != 'pendente' THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_status');
  END IF;

  UPDATE public.depositos
  SET status = 'aprovado'
  WHERE id = p_deposito_id;

  UPDATE public.usuarios
  SET saldo = saldo + v_valor
  WHERE id = v_usuario_id;

  v_vip := public.processar_vip_deposito(v_usuario_id, p_deposito_id, v_valor);
  v_rollover := public.aplicar_rollover_deposito(v_usuario_id, v_valor);
  v_indicacao := public.processar_recompensa_indicacao(v_usuario_id, p_deposito_id, v_valor);

  RETURN (json_build_object(
    'ok', true,
    'already', false,
    'rollover_pendente', COALESCE(v_rollover, 0),
    'indicacao', v_indicacao
  )::jsonb || COALESCE(v_vip, '{}'::json)::jsonb)::json;
END;
$$;

CREATE OR REPLACE FUNCTION public.atualizar_status_deposito_admin(
  p_deposito_id UUID,
  p_status TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
  v_valor NUMERIC;
  v_dep_status TEXT;
  v_usuario_id UUID;
  v_vip JSON;
  v_indicacao JSON;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  v_status := LOWER(TRIM(p_status));

  IF v_status NOT IN ('aprovado', 'pendente', 'falhou', 'expirado') THEN
    RETURN json_build_object('ok', false, 'error', 'Status inválido');
  END IF;

  SELECT usuario_id, valor, status
  INTO v_usuario_id, v_valor, v_dep_status
  FROM public.depositos
  WHERE id = p_deposito_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'Depósito não encontrado');
  END IF;

  IF v_status = 'aprovado' THEN
    IF v_dep_status = 'aprovado' THEN
      RETURN json_build_object('ok', true, 'already', true);
    END IF;

    IF v_dep_status != 'pendente' THEN
      RETURN json_build_object('ok', false, 'error', 'Apenas depósitos pendentes podem ser aprovados');
    END IF;

    UPDATE public.depositos SET status = 'aprovado', updated_at = NOW() WHERE id = p_deposito_id;
    UPDATE public.usuarios SET saldo = saldo + v_valor WHERE id = v_usuario_id;
    v_vip := public.processar_vip_deposito(v_usuario_id, p_deposito_id, v_valor);
    PERFORM public.aplicar_rollover_deposito(v_usuario_id, v_valor);
    v_indicacao := public.processar_recompensa_indicacao(v_usuario_id, p_deposito_id, v_valor);

    RETURN (json_build_object('ok', true, 'already', false, 'indicacao', v_indicacao)::jsonb
      || COALESCE(v_vip, '{}'::json)::jsonb)::json;
  END IF;

  UPDATE public.depositos
  SET status = v_status, updated_at = NOW()
  WHERE id = p_deposito_id;

  RETURN json_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.obter_config_plataforma() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_config_plataforma_admin(
  NUMERIC, NUMERIC, NUMERIC, NUMERIC, INT, NUMERIC, NUMERIC, NUMERIC
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.processar_recompensa_indicacao(UUID, UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_qualified_referrals(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirmar_deposito_pix_pago(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_status_deposito_admin(UUID, TEXT) TO authenticated;
