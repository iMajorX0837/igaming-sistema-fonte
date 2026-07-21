-- =============================================================================
-- PARTE 4/5 — Trigger saques + RLS depósitos (pode rodar com API ligada)
-- =============================================================================

DROP TRIGGER IF EXISTS validate_saque_limits ON public.saques;
CREATE TRIGGER validate_saque_limits
  BEFORE INSERT OR UPDATE OF valor ON public.saques
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_saque_limits();

-- Só a API (service_role) pode inserir depósitos
DROP POLICY IF EXISTS "Usuários podem inserir apenas seus próprios depósitos" ON public.depositos;
DROP POLICY IF EXISTS "depositos_insert_own" ON public.depositos;
