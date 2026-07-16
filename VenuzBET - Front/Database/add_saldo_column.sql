-- Adicionar coluna saldo na tabela public.usuarios
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS saldo DECIMAL(10,2) NOT NULL DEFAULT 0.00;

