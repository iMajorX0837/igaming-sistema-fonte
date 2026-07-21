-- =============================================================================
-- ETAPA 4/4 — Permissões (REVOKE / GRANT)
-- Aguarde 5s após etapa 3. Reinicie a PlayFiverAPI ao concluir.
-- =============================================================================

REVOKE ALL ON FUNCTION public.confirmar_deposito_pix_pago_server(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirmar_deposito_pix_pago_server(UUID, UUID, TEXT) TO service_role;

REVOKE EXECUTE ON FUNCTION public.confirmar_deposito_pix_pago(UUID) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.confirmar_deposito_pix_pago(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.confirmar_deposito_pix_pago(UUID) TO service_role;
