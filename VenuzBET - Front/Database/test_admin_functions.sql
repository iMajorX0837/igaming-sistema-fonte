-- Script de teste para verificar se as funções RPC estão funcionando
-- Execute este script no Supabase SQL Editor para testar

-- Teste 1: Verificar se as funções existem
SELECT 
  proname as function_name,
  pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc
WHERE proname IN ('get_current_admin_user', 'get_user_cargo', 'is_user_admin')
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Teste 2: Verificar permissões das funções
SELECT 
  p.proname as function_name,
  r.rolname as role_name,
  has_function_privilege(r.rolname, p.oid, 'EXECUTE') as can_execute
FROM pg_proc p
CROSS JOIN pg_roles r
WHERE p.proname IN ('get_current_admin_user', 'get_user_cargo', 'is_user_admin')
  AND p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND r.rolname IN ('anon', 'authenticated')
ORDER BY p.proname, r.rolname;

-- Teste 3: Verificar se há usuários admin na tabela
SELECT id, email, cargo 
FROM public.usuarios 
WHERE cargo = 'admin'
LIMIT 5;
