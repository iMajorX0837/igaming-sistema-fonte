-- =============================================================================
-- ETAPA 3/4 — Triggers de validação (uma tabela por vez)
-- Aguarde 5s após etapa 2.
-- =============================================================================

DROP TRIGGER IF EXISTS validate_deposito_limits ON public.depositos;
CREATE TRIGGER validate_deposito_limits
  BEFORE INSERT OR UPDATE OF valor ON public.depositos
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_deposito_limits();

DROP TRIGGER IF EXISTS validate_saque_limits ON public.saques;
CREATE TRIGGER validate_saque_limits
  BEFORE INSERT OR UPDATE OF valor ON public.saques
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_saque_limits();

-- Impede INSERT direto de depósitos por usuários (somente service_role / API)
DROP POLICY IF EXISTS "Usuários podem inserir apenas seus próprios depósitos" ON public.depositos;
DROP POLICY IF EXISTS "depositos_insert_own" ON public.depositos;
