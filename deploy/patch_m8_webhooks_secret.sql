-- =============================================================================
-- Patch M8 — webhooks: secret não acessível via JWT admin (só service_role / API)
-- Execute no SQL Editor do Supabase.
-- =============================================================================

REVOKE ALL ON TABLE public.webhooks FROM anon;
REVOKE ALL ON TABLE public.webhooks FROM authenticated;

COMMENT ON TABLE public.webhooks IS
  'M8: CRUD admin via PlayFiverAPI /api/webhooks (service_role). secret_key nunca no browser.';
