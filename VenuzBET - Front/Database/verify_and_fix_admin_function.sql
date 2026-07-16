-- Script para verificar e garantir que a função check_user_is_admin existe e funciona
-- Execute este script no Supabase SQL Editor

-- 1. Verificar se a função existe
SELECT 
  proname as function_name,
  pg_get_function_identity_arguments(oid) as arguments,
  prorettype::regtype as return_type
FROM pg_proc
WHERE proname = 'check_user_is_admin'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 2. Se não existir ou estiver incorreta, recriar
DROP FUNCTION IF EXISTS public.check_user_is_admin(UUID);

CREATE OR REPLACE FUNCTION public.check_user_is_admin(user_id UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  cargo TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email, u.cargo
  FROM public.usuarios u
  WHERE u.id = user_id AND u.cargo = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3. Garantir permissões
GRANT EXECUTE ON FUNCTION public.check_user_is_admin(UUID) TO anon, authenticated;

-- 4. Testar a função (substitua pelo ID do seu usuário admin)
-- SELECT * FROM public.check_user_is_admin('29f9d602-1bac-4ac3-957e-caef6409cfe7'::UUID);

-- 5. Verificar permissões
SELECT 
  p.proname as function_name,
  r.rolname as role_name,
  has_function_privilege(r.rolname, p.oid, 'EXECUTE') as can_execute
FROM pg_proc p
CROSS JOIN pg_roles r
WHERE p.proname = 'check_user_is_admin'
  AND p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND r.rolname IN ('anon', 'authenticated')
ORDER BY r.rolname;
