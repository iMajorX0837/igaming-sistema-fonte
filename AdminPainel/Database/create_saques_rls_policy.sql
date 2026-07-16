-- Política RLS para permitir que admins vejam e atualizem saques
-- Execute este script no Supabase SQL Editor

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Admins podem ver todos os saques" ON public.saques;
DROP POLICY IF EXISTS "Admins podem atualizar saques" ON public.saques;
DROP POLICY IF EXISTS "saques_select_own" ON public.saques;
DROP POLICY IF EXISTS "saques_update_own" ON public.saques;

-- Criar política que permite admins verem todos os saques
CREATE POLICY "Admins podem ver todos os saques"
  ON public.saques
  FOR SELECT
  USING (
    -- Permite ver seus próprios saques OU se for admin, ver todos
    auth.uid() = usuario_id 
    OR 
    public.is_user_admin()
  );

-- Criar política que permite admins atualizarem saques
CREATE POLICY "Admins podem atualizar saques"
  ON public.saques
  FOR UPDATE
  USING (
    -- Permite atualizar se for admin
    public.is_user_admin()
  )
  WITH CHECK (
    -- Permite atualizar se for admin
    public.is_user_admin()
  );

-- Verificar políticas criadas
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'saques'
ORDER BY policyname;

