-- =============================================================================
-- PARTE 3/5 — Trigger depósitos (pode rodar com API ligada)
-- Valida min/max de depósito no INSERT/UPDATE.
-- =============================================================================

DROP TRIGGER IF EXISTS validate_deposito_limits ON public.depositos;
CREATE TRIGGER validate_deposito_limits
  BEFORE INSERT OR UPDATE OF valor ON public.depositos
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_deposito_limits();
