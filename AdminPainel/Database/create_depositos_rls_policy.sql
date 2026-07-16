-- Política RLS para permitir que admins vejam e atualizem depósitos
-- Execute este script no Supabase SQL Editor

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Admins podem ver todos os depósitos" ON public.depositos;
DROP POLICY IF EXISTS "Admins podem atualizar depósitos" ON public.depositos;
DROP POLICY IF EXISTS "depositos_select_own" ON public.depositos;
DROP POLICY IF EXISTS "depositos_update_own" ON public.depositos;

-- Criar política que permite admins verem todos os depósitos
CREATE POLICY "Admins podem ver todos os depósitos"
  ON public.depositos
  FOR SELECT
  USING (
    -- Permite ver seus próprios depósitos OU se for admin, ver todos
    auth.uid() = usuario_id 
    OR 
    public.is_user_admin()
  );

-- Criar política que permite admins atualizarem depósitos
CREATE POLICY "Admins podem atualizar depósitos"
  ON public.depositos
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
WHERE tablename = 'depositos'
ORDER BY policyname;

