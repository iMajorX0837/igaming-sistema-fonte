-- Política RLS para permitir que admins vejam todos os usuários
-- Execute este script no Supabase SQL Editor

-- Primeiro, criar função que verifica se usuário é admin (bypass RLS)
CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_cargo TEXT;
BEGIN
  -- Esta função usa SECURITY DEFINER para bypassar RLS
  SELECT cargo INTO user_cargo
  FROM public.usuarios
  WHERE id = auth.uid();
  
  RETURN user_cargo = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Dar permissão para todos executarem
GRANT EXECUTE ON FUNCTION public.is_user_admin() TO anon, authenticated;

-- Remover política existente se houver
DROP POLICY IF EXISTS "Admins podem ver todos os usuários" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_select_own" ON public.usuarios;

-- Criar política que permite admins verem todos os usuários (sem recursão)
CREATE POLICY "Admins podem ver todos os usuários"
  ON public.usuarios
  FOR SELECT
  USING (
    -- Permite ver seus próprios dados OU se for admin (usando função que bypassa RLS), ver todos
    auth.uid() = id 
    OR 
    public.is_user_admin()
  );

-- Verificar políticas criadas
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'usuarios'
ORDER BY policyname;
