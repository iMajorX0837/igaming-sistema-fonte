-- Colunas MisticPay em saques + índices
-- Execute no SQL Editor do Supabase

ALTER TABLE public.saques ADD COLUMN IF NOT EXISTS misticpay_job_id TEXT;
ALTER TABLE public.saques ADD COLUMN IF NOT EXISTS misticpay_transaction_id TEXT;
ALTER TABLE public.saques ADD COLUMN IF NOT EXISTS misticpay_status TEXT;

CREATE INDEX IF NOT EXISTS idx_saques_misticpay_transaction_id
  ON public.saques (misticpay_transaction_id)
  WHERE misticpay_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_saques_misticpay_job_id
  ON public.saques (misticpay_job_id)
  WHERE misticpay_job_id IS NOT NULL;

COMMENT ON COLUMN public.saques.misticpay_job_id IS 'ID do job de saque na MisticPay';
COMMENT ON COLUMN public.saques.misticpay_transaction_id IS 'ID da transação de saque na MisticPay';
COMMENT ON COLUMN public.saques.misticpay_status IS 'Status retornado pela MisticPay (ex.: QUEUED, COMPLETO)';
