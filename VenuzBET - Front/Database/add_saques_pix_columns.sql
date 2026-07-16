-- Adicionar colunas de PIX na tabela saques
-- key: tipo de chave PIX (email, cpf, cnpj, telefone, chave aleatória)
-- chave: valor da chave PIX do solicitante

-- Adicionar coluna key (tipo de chave PIX)
ALTER TABLE public.saques 
ADD COLUMN IF NOT EXISTS key TEXT;

-- Adicionar constraint para validar os valores permitidos de key
ALTER TABLE public.saques
DROP CONSTRAINT IF EXISTS saques_key_check;

ALTER TABLE public.saques
ADD CONSTRAINT saques_key_check 
CHECK (key IS NULL OR key IN ('email', 'cpf', 'cnpj', 'telefone', 'chave aleatória'));

-- Adicionar coluna chave (valor da chave PIX)
ALTER TABLE public.saques 
ADD COLUMN IF NOT EXISTS chave TEXT;

-- Adicionar comentários nas colunas para documentação
COMMENT ON COLUMN public.saques.key IS 'Tipo de chave PIX: email, cpf, cnpj, telefone ou chave aleatória';
COMMENT ON COLUMN public.saques.chave IS 'Valor da chave PIX do solicitante';

