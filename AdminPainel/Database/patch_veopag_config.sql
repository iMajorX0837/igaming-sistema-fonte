-- VeoPag + gateway veopag na seleção ativa
-- Execute no SQL Editor do Supabase (após patch_bspay_config.sql)

ALTER TABLE public.integration_secrets
  ADD COLUMN IF NOT EXISTS veopag_client_id TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS veopag_client_secret TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS veopag_webhook_secret TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS veopag_api_url TEXT NOT NULL DEFAULT 'https://api.veopag.com';

ALTER TABLE public.integration_secrets
  DROP CONSTRAINT IF EXISTS integration_secrets_payment_gateway_check;

ALTER TABLE public.integration_secrets
  ADD CONSTRAINT integration_secrets_payment_gateway_check
  CHECK (payment_gateway IN ('misticpay', 'bspay', 'veopag'));

CREATE OR REPLACE FUNCTION public.obter_payment_gateway_admin()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.integration_secrets%ROWTYPE;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT * INTO v_row FROM public.integration_secrets WHERE id = 1;

  IF NOT FOUND THEN
    INSERT INTO public.integration_secrets (id) VALUES (1)
    ON CONFLICT (id) DO NOTHING;
    SELECT * INTO v_row FROM public.integration_secrets WHERE id = 1;
  END IF;

  RETURN json_build_object(
    'ok', true,
    'payment_gateway', COALESCE(NULLIF(TRIM(v_row.payment_gateway), ''), 'misticpay'),
    'misticpay_configured',
      COALESCE(NULLIF(TRIM(v_row.misticpay_ci), ''), '') <> ''
      AND COALESCE(NULLIF(TRIM(v_row.misticpay_cs), ''), '') <> '',
    'bspay_configured',
      COALESCE(NULLIF(TRIM(v_row.bspay_client_id), ''), '') <> ''
      AND COALESCE(NULLIF(TRIM(v_row.bspay_client_secret), ''), '') <> ''
      AND COALESCE(NULLIF(TRIM(v_row.bspay_signing_key), ''), '') <> '',
    'veopag_configured',
      COALESCE(NULLIF(TRIM(v_row.veopag_client_id), ''), '') <> ''
      AND COALESCE(NULLIF(TRIM(v_row.veopag_client_secret), ''), '') <> '',
    'updated_at', v_row.updated_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.salvar_payment_gateway_admin(
  p_payment_gateway TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gateway TEXT;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  v_gateway := LOWER(TRIM(COALESCE(p_payment_gateway, '')));

  IF v_gateway NOT IN ('misticpay', 'bspay', 'veopag') THEN
    RETURN json_build_object('ok', false, 'error', 'Gateway inválido. Use misticpay, bspay ou veopag.');
  END IF;

  INSERT INTO public.integration_secrets (id, payment_gateway)
  VALUES (1, v_gateway)
  ON CONFLICT (id) DO UPDATE
  SET payment_gateway = EXCLUDED.payment_gateway,
      updated_at = NOW();

  RETURN json_build_object('ok', true, 'payment_gateway', v_gateway);
END;
$$;

CREATE OR REPLACE FUNCTION public.obter_veopag_config_admin()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.integration_secrets%ROWTYPE;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT * INTO v_row FROM public.integration_secrets WHERE id = 1;

  IF NOT FOUND THEN
    INSERT INTO public.integration_secrets (id) VALUES (1)
    ON CONFLICT (id) DO NOTHING;
    SELECT * INTO v_row FROM public.integration_secrets WHERE id = 1;
  END IF;

  RETURN json_build_object(
    'ok', true,
    'veopag_client_id', COALESCE(v_row.veopag_client_id, ''),
    'veopag_api_url', COALESCE(NULLIF(TRIM(v_row.veopag_api_url), ''), 'https://api.veopag.com'),
    'veopag_client_secret_configured', COALESCE(NULLIF(TRIM(v_row.veopag_client_secret), ''), '') <> '',
    'veopag_webhook_secret_configured', COALESCE(NULLIF(TRIM(v_row.veopag_webhook_secret), ''), '') <> '',
    'updated_at', v_row.updated_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.salvar_veopag_config_admin(
  p_veopag_client_id TEXT DEFAULT NULL,
  p_veopag_client_secret TEXT DEFAULT NULL,
  p_veopag_webhook_secret TEXT DEFAULT NULL,
  p_veopag_api_url TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.integration_secrets%ROWTYPE;
  v_client_id TEXT;
  v_client_secret TEXT;
  v_webhook TEXT;
  v_api_url TEXT;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT * INTO v_row FROM public.integration_secrets WHERE id = 1;

  IF NOT FOUND THEN
    INSERT INTO public.integration_secrets (id) VALUES (1)
    ON CONFLICT (id) DO NOTHING;
    SELECT * INTO v_row FROM public.integration_secrets WHERE id = 1;
  END IF;

  v_client_id := COALESCE(NULLIF(TRIM(p_veopag_client_id), ''), NULLIF(TRIM(v_row.veopag_client_id), ''), '');
  v_client_secret := CASE
    WHEN p_veopag_client_secret IS NULL OR TRIM(p_veopag_client_secret) = '' THEN COALESCE(v_row.veopag_client_secret, '')
    ELSE TRIM(p_veopag_client_secret)
  END;
  v_webhook := CASE
    WHEN p_veopag_webhook_secret IS NULL OR TRIM(p_veopag_webhook_secret) = '' THEN COALESCE(v_row.veopag_webhook_secret, '')
    ELSE TRIM(p_veopag_webhook_secret)
  END;
  v_api_url := COALESCE(
    NULLIF(TRIM(p_veopag_api_url), ''),
    NULLIF(TRIM(v_row.veopag_api_url), ''),
    'https://api.veopag.com'
  );

  IF v_client_id = '' OR v_client_secret = '' THEN
    RETURN json_build_object('ok', false, 'error', 'Client ID e Client Secret são obrigatórios.');
  END IF;

  UPDATE public.integration_secrets
  SET
    veopag_client_id = v_client_id,
    veopag_client_secret = v_client_secret,
    veopag_webhook_secret = v_webhook,
    veopag_api_url = v_api_url,
    updated_at = NOW()
  WHERE id = 1;

  RETURN json_build_object(
    'ok', true,
    'veopag_client_id', v_client_id,
    'veopag_api_url', v_api_url,
    'veopag_client_secret_configured', true,
    'veopag_webhook_secret_configured', v_webhook <> ''
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.obter_veopag_config_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.salvar_veopag_config_admin(TEXT, TEXT, TEXT, TEXT) TO authenticated;

COMMENT ON COLUMN public.integration_secrets.veopag_client_id IS 'Client ID VeoPag (dashboard.veopag.com/credentials)';
