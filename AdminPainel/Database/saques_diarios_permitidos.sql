-- Limite diário de saques por usuário
-- Execute no SQL Editor do Supabase

ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS saques_diarios_permitidos INT NOT NULL DEFAULT 1;

ALTER TABLE public.site_config
  DROP CONSTRAINT IF EXISTS site_config_saques_diarios_permitidos_check;

ALTER TABLE public.site_config
  ADD CONSTRAINT site_config_saques_diarios_permitidos_check
  CHECK (saques_diarios_permitidos >= 1);

COMMENT ON COLUMN public.site_config.saques_diarios_permitidos IS
  'Número máximo de saques permitidos por dia por usuário';

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
      'saques_diarios_permitidos', 1
    );
  END IF;

  RETURN json_build_object(
    'ok', true,
    'deposito_minimo', v_config.deposito_minimo,
    'deposito_maximo', v_config.deposito_maximo,
    'saque_minimo', v_config.saque_minimo,
    'saque_maximo', v_config.saque_maximo,
    'saques_diarios_permitidos', COALESCE(v_config.saques_diarios_permitidos, 1),
    'updated_at', v_config.updated_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.atualizar_config_plataforma_admin(
  p_deposito_minimo NUMERIC DEFAULT NULL,
  p_deposito_maximo NUMERIC DEFAULT NULL,
  p_saque_minimo NUMERIC DEFAULT NULL,
  p_saque_maximo NUMERIC DEFAULT NULL,
  p_saques_diarios_permitidos INT DEFAULT NULL
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

  IF v_dep_min <= 0 OR v_dep_max <= 0 OR v_saq_min <= 0 OR v_saq_max <= 0 THEN
    RETURN json_build_object('ok', false, 'error', 'Os valores devem ser maiores que zero.');
  END IF;

  IF v_saques_dia < 1 THEN
    RETURN json_build_object('ok', false, 'error', 'Saques diários permitidos deve ser no mínimo 1.');
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
    updated_at = NOW()
  WHERE id = 1;

  RETURN json_build_object(
    'ok', true,
    'deposito_minimo', v_dep_min,
    'deposito_maximo', v_dep_max,
    'saque_minimo', v_saq_min,
    'saque_maximo', v_saq_max,
    'saques_diarios_permitidos', v_saques_dia
  );
END;
$$;

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

GRANT EXECUTE ON FUNCTION public.obter_config_plataforma() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_config_plataforma_admin(NUMERIC, NUMERIC, NUMERIC, NUMERIC, INT) TO authenticated;
