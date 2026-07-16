-- Adicionar coluna playfiver_user_code na tabela usuarios
-- Este código será usado para identificar o usuário na API Play Fiver
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS playfiver_user_code TEXT;

-- Criar índice único para playfiver_user_code
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_playfiver_user_code_idx ON public.usuarios(playfiver_user_code);

-- Criar índice para melhor performance nas consultas
CREATE INDEX IF NOT EXISTS usuarios_playfiver_user_code_idx2 ON public.usuarios(playfiver_user_code) WHERE playfiver_user_code IS NOT NULL;

