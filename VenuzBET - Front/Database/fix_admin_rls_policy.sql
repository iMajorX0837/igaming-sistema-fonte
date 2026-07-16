-- Garantir que usuários possam ver seus próprios dados na tabela usuarios
-- Isso é necessário para o painel administrativo verificar o cargo

-- Remover políticas antigas que possam estar bloqueando
DROP POLICY IF EXISTS "Usuários podem ver apenas seus próprios dados" ON public.usuarios;
DROP POLICY IF EXISTS "Usuários podem ver seus dados e indicações" ON public.usuarios;

-- Criar política que permite ver seus próprios dados
CREATE POLICY "Usuários podem ver seus próprios dados"
  ON public.usuarios
  FOR SELECT
  USING (auth.uid() = id);

-- Também permitir que usuários atualizem seus próprios dados (se necessário)
CREATE POLICY "Usuários podem atualizar seus próprios dados"
  ON public.usuarios
  FOR UPDATE
  USING (auth.uid() = id);
