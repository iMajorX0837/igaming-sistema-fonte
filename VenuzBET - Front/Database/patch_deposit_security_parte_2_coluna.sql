-- =============================================================================
-- PARTE 2/5 — Coluna gateway_check_id (pode rodar com API ligada)
-- Lock rápido (~milissegundos). Se der erro, rode de novo em 10s.
-- =============================================================================

ALTER TABLE public.depositos
  ADD COLUMN IF NOT EXISTS gateway_check_id TEXT;

COMMENT ON COLUMN public.depositos.gateway_check_id IS
  'ID usado na consulta PIX (externalTransactionId ou UUID interno). Só a API confirma depósito.';

CREATE INDEX IF NOT EXISTS depositos_gateway_check_id_idx
  ON public.depositos (gateway_check_id)
  WHERE gateway_check_id IS NOT NULL;
