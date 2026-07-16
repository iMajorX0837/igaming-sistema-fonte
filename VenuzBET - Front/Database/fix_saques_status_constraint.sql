-- Corrigir constraint da tabela saques para incluir 'pendente'
-- Primeiro, remover a constraint antiga
ALTER TABLE public.saques 
DROP CONSTRAINT IF EXISTS saques_status_check;

-- Adicionar nova constraint com 'pendente' incluído
ALTER TABLE public.saques 
ADD CONSTRAINT saques_status_check 
CHECK (status IN ('aprovado', 'rejeitado', 'pendente'));

