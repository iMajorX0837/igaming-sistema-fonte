-- =============================================================================
-- EXECUTE ESTE ARQUIVO INTEIRO no SQL Editor do Supabase (uma vez)
-- Consolida: saques diários + rollover + fix confirmar_deposito_pix_pago
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Saques diários permitidos
-- -----------------------------------------------------------------------------
ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS saques_diarios_permitidos INT NOT NULL DEFAULT 1;

ALTER TABLE public.site_config
  DROP CONSTRAINT IF EXISTS site_config_saques_diarios_permitidos_check;

ALTER TABLE public.site_config
  ADD CONSTRAINT site_config_saques_diarios_permitidos_check
  CHECK (saques_diarios_permitidos >= 1);

COMMENT ON COLUMN public.site_config.saques_diarios_permitidos IS
  'Número máximo de saques permitidos por dia por usuário';

-- -----------------------------------------------------------------------------
-- 2) Rollover configurável
-- -----------------------------------------------------------------------------
ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS rollover_padrao NUMERIC(8,2) NOT NULL DEFAULT 1;

ALTER TABLE public.site_config
  DROP CONSTRAINT IF EXISTS site_config_rollover_padrao_check;

ALTER TABLE public.site_config
  ADD CONSTRAINT site_config_rollover_padrao_check
  CHECK (rollover_padrao >= 0);

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS rollover_pendente NUMERIC(12,2) NOT NULL DEFAULT 0;

ALTER TABLE public.usuarios
  DROP CONSTRAINT IF EXISTS usuarios_rollover_pendente_check;

ALTER TABLE public.usuarios
  ADD CONSTRAINT usuarios_rollover_pendente_check
  CHECK (rollover_pendente >= 0);

COMMENT ON COLUMN public.site_config.rollover_padrao IS
  'Múltiplo padrão de rollover em depósitos (ex.: 2 = apostar 2x o valor depositado antes de sacar). 0 desativa.';
COMMENT ON COLUMN public.usuarios.rollover_pendente IS
  'Valor em apostas que o usuário ainda precisa cumprir antes de sacar.';

-- -----------------------------------------------------------------------------
-- 3) Funções de rollover
-- -----------------------------------------------------------------------------
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

  UPDATE public.usuarios
  SET rollover_pendente = COALESCE(rollover_pendente, 0) + v_incremento
  WHERE id = p_usuario_id
  RETURNING rollover_pendente INTO v_novo_pendente;

  RETURN COALESCE(v_novo_pendente, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.abater_rollover_aposta()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valor_aposta NUMERIC;
BEGIN
  v_valor_aposta := COALESCE(NEW.valor, 0);
  IF v_valor_aposta <= 0 OR NEW.usuario_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.usuarios
  SET rollover_pendente = GREATEST(0, COALESCE(rollover_pendente, 0) - v_valor_aposta)
  WHERE id = NEW.usuario_id
    AND COALESCE(rollover_pendente, 0) > 0;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_abater_rollover_aposta ON public.transacoes_jogos;

CREATE TRIGGER trg_abater_rollover_aposta
  AFTER INSERT ON public.transacoes_jogos
  FOR EACH ROW
  EXECUTE FUNCTION public.abater_rollover_aposta();

CREATE OR REPLACE FUNCTION public.validar_rollover_saque()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pendente NUMERIC;
BEGIN
  SELECT COALESCE(rollover_pendente, 0)
  INTO v_pendente
  FROM public.usuarios
  WHERE id = NEW.usuario_id;

  IF COALESCE(v_pendente, 0) > 0.009 THEN
    RAISE EXCEPTION 'Rollover pendente: aposte mais R$ % antes de sacar.', TRIM(TO_CHAR(v_pendente, 'FM999G999G990D00'))
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_rollover_saque ON public.saques;

CREATE TRIGGER trg_validar_rollover_saque
  BEFORE INSERT ON public.saques
  FOR EACH ROW
  EXECUTE FUNCTION public.validar_rollover_saque();

CREATE OR REPLACE FUNCTION public.validar_limite_saques_diarios()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limite INT;
  v_count INT;
BEGIN
  SELECT COALESCE(saques_diarios_permitidos, 1)
  INTO v_limite
  FROM public.site_config
  WHERE id = 1;

  SELECT COUNT(*)
  INTO v_count
  FROM public.saques
  WHERE usuario_id = NEW.usuario_id
    AND (data_hora AT TIME ZONE 'America/Sao_Paulo')::date =
        (NOW() AT TIME ZONE 'America/Sao_Paulo')::date;

  IF v_count >= v_limite THEN
    RAISE EXCEPTION 'Limite diário de saques atingido. Máximo de % saque(s) por dia.', v_limite
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_limite_saques_diarios ON public.saques;

CREATE TRIGGER trg_validar_limite_saques_diarios
  BEFORE INSERT ON public.saques
  FOR EACH ROW
  EXECUTE FUNCTION public.validar_limite_saques_diarios();

CREATE OR REPLACE FUNCTION public.obter_rollover_usuario()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_pendente NUMERIC;
  v_padrao NUMERIC;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT COALESCE(u.rollover_pendente, 0)
  INTO v_pendente
  FROM public.usuarios u
  WHERE u.id = v_uid;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'user_not_found');
  END IF;

  SELECT COALESCE(sc.rollover_padrao, 1)
  INTO v_padrao
  FROM public.site_config sc
  WHERE sc.id = 1;

  RETURN json_build_object(
    'ok', true,
    'rollover_pendente', COALESCE(v_pendente, 0),
    'rollover_padrao', COALESCE(v_padrao, 1),
    'pode_sacar', COALESCE(v_pendente, 0) <= 0.009
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- 4) Config da plataforma (admin + front)
-- -----------------------------------------------------------------------------
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
      'rollover_padrao', 1
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
    'updated_at', v_config.updated_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.atualizar_config_plataforma_admin(
  p_deposito_minimo NUMERIC DEFAULT NULL,
  p_deposito_maximo NUMERIC DEFAULT NULL,
  p_saque_minimo NUMERIC DEFAULT NULL,
  p_saque_maximo NUMERIC DEFAULT NULL,
  p_saques_diarios_permitidos INT DEFAULT NULL,
  p_rollover_padrao NUMERIC DEFAULT NULL
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

  IF v_dep_min <= 0 OR v_dep_max <= 0 OR v_saq_min <= 0 OR v_saq_max <= 0 THEN
    RETURN json_build_object('ok', false, 'error', 'Os valores devem ser maiores que zero.');
  END IF;

  IF v_saques_dia < 1 THEN
    RETURN json_build_object('ok', false, 'error', 'Saques diários permitidos deve ser no mínimo 1.');
  END IF;

  IF v_rollover < 0 THEN
    RETURN json_build_object('ok', false, 'error', 'Rollover padrão não pode ser negativo.');
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
    updated_at = NOW()
  WHERE id = 1;

  RETURN json_build_object(
    'ok', true,
    'deposito_minimo', v_dep_min,
    'deposito_maximo', v_dep_max,
    'saque_minimo', v_saq_min,
    'saque_maximo', v_saq_max,
    'saques_diarios_permitidos', v_saques_dia,
    'rollover_padrao', v_rollover
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- 5) Depósito PIX (fix json || json + rollover)
-- -----------------------------------------------------------------------------
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

  RETURN (json_build_object(
    'ok', true,
    'already', false,
    'rollover_pendente', COALESCE(v_rollover, 0)
  )::jsonb || COALESCE(v_vip, '{}'::json)::jsonb)::json;
END;
$$;

-- -----------------------------------------------------------------------------
-- 6) Aprovação manual de depósito (admin)
-- -----------------------------------------------------------------------------
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

    RETURN (json_build_object('ok', true, 'already', false)::jsonb || COALESCE(v_vip, '{}'::json)::jsonb)::json;
  END IF;

  UPDATE public.depositos
  SET status = v_status, updated_at = NOW()
  WHERE id = p_deposito_id;

  RETURN json_build_object('ok', true);
END;
$$;

-- -----------------------------------------------------------------------------
-- 7) Permissões
-- -----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.obter_config_plataforma() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_config_plataforma_admin(NUMERIC, NUMERIC, NUMERIC, NUMERIC, INT, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.obter_rollover_usuario() TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirmar_deposito_pix_pago(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_status_deposito_admin(UUID, TEXT) TO authenticated;
