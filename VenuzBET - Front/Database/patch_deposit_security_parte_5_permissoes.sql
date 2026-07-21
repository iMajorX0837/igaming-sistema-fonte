-- =============================================================================
-- PARTE 5/5 — Bloqueia RPC antigo (rode POR ÚLTIMO)
--
-- ✅ Seguro com API ligada SE o deposit.js já usa confirmar_deposito_pix_pago_server
--    (PlayFiverAPI atualizada — reinicie a API uma vez antes desta parte se ainda
--     não reiniciou desde o update de segurança).
--
-- ❌ Não rode se a API ainda chama confirmar_deposito_pix_pago via JWT do usuário.
-- =============================================================================

REVOKE EXECUTE ON FUNCTION public.confirmar_deposito_pix_pago(UUID) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.confirmar_deposito_pix_pago(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.confirmar_deposito_pix_pago(UUID) TO service_role;
