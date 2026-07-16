-- Adicionar coluna cargo na tabela public.usuarios
-- Esta coluna armazena o cargo/função do usuário no sistema (ex: 'admin', 'moderador', 'usuario')
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS cargo TEXT DEFAULT 'usuario';

-- Criar índice para melhor performance nas consultas por cargo
CREATE INDEX IF NOT EXISTS usuarios_cargo_idx ON public.usuarios(cargo) WHERE cargo IS NOT NULL;

-- Comentário na coluna para documentação
COMMENT ON COLUMN public.usuarios.cargo IS 'Cargo/função do usuário no sistema (admin, moderador, usuario, etc.)';
