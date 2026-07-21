-- Credenciais MisticPay gerenciadas pelo admin (não expostas ao site público)
-- Execute no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS public.integration_secrets (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  misticpay_ci TEXT NOT NULL DEFAULT '',
  misticpay_cs TEXT NOT NULL DEFAULT '',
  misticpay_api_url TEXT NOT NULL DEFAULT 'https://api.misticpay.com/api',
  misticpay_webhook_secret TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

INSERT INTO public.integration_secrets (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.integration_secrets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin gerencia integration secrets" ON public.integration_secrets;

CREATE POLICY "Admin gerencia integration secrets"
  ON public.integration_secrets FOR ALL
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

REVOKE ALL ON public.integration_secrets FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.integration_secrets TO service_role;

CREATE OR REPLACE FUNCTION public.obter_misticpay_config_admin()
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
    'misticpay_ci', COALESCE(v_row.misticpay_ci, ''),
    'misticpay_api_url', COALESCE(NULLIF(TRIM(v_row.misticpay_api_url), ''), 'https://api.misticpay.com/api'),
    'misticpay_cs_configured', COALESCE(NULLIF(TRIM(v_row.misticpay_cs), ''), '') <> '',
    'misticpay_webhook_secret_configured', COALESCE(NULLIF(TRIM(v_row.misticpay_webhook_secret), ''), '') <> '',
    'updated_at', v_row.updated_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.salvar_misticpay_config_admin(
  p_misticpay_ci TEXT DEFAULT NULL,
  p_misticpay_cs TEXT DEFAULT NULL,
  p_misticpay_api_url TEXT DEFAULT NULL,
  p_misticpay_webhook_secret TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.integration_secrets%ROWTYPE;
  v_ci TEXT;
  v_cs TEXT;
  v_api_url TEXT;
  v_webhook TEXT;
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

  v_ci := COALESCE(NULLIF(TRIM(p_misticpay_ci), ''), NULLIF(TRIM(v_row.misticpay_ci), ''), '');
  v_cs := CASE
    WHEN p_misticpay_cs IS NULL OR TRIM(p_misticpay_cs) = '' THEN COALESCE(v_row.misticpay_cs, '')
    ELSE TRIM(p_misticpay_cs)
  END;
  v_api_url := COALESCE(
    NULLIF(TRIM(p_misticpay_api_url), ''),
    NULLIF(TRIM(v_row.misticpay_api_url), ''),
    'https://api.misticpay.com/api'
  );
  v_webhook := CASE
    WHEN p_misticpay_webhook_secret IS NULL OR TRIM(p_misticpay_webhook_secret) = '' THEN COALESCE(v_row.misticpay_webhook_secret, '')
    ELSE TRIM(p_misticpay_webhook_secret)
  END;

  IF v_ci = '' OR v_cs = '' THEN
    RETURN json_build_object('ok', false, 'error', 'Client ID (CI) e Client Secret (CS) são obrigatórios.');
  END IF;

  UPDATE public.integration_secrets
  SET
    misticpay_ci = v_ci,
    misticpay_cs = v_cs,
    misticpay_api_url = v_api_url,
    misticpay_webhook_secret = v_webhook,
    updated_at = NOW()
  WHERE id = 1;

  RETURN json_build_object(
    'ok', true,
    'misticpay_ci', v_ci,
    'misticpay_api_url', v_api_url,
    'misticpay_cs_configured', true,
    'misticpay_webhook_secret_configured', v_webhook <> ''
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.obter_misticpay_config_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.salvar_misticpay_config_admin(TEXT, TEXT, TEXT, TEXT) TO authenticated;

COMMENT ON TABLE public.integration_secrets IS 'Segredos de integrações (MisticPay etc.). Acesso direto bloqueado para anon; API usa service_role.';
