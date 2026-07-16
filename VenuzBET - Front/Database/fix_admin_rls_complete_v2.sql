-- Script completo para corrigir políticas RLS e garantir que admins possam acessar seus dados
-- Execute este script no Supabase SQL Editor
-- VERSÃO 2: Remove todas as políticas antes de criar novas

-- 1. Remover TODAS as políticas existentes da tabela usuarios (múltiplas tentativas)
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  -- Remover todas as políticas da tabela usuarios
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'usuarios' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.usuarios', policy_record.policyname);
    RAISE NOTICE 'Política removida: %', policy_record.policyname;
  END LOOP;
END $$;

-- 2. Criar política que permite ver seus próprios dados (mais simples e direta)
CREATE POLICY "Usuários podem ver seus próprios dados"
  ON public.usuarios
  FOR SELECT
  USING (auth.uid() = id);

-- 3. Criar política para atualização
CREATE POLICY "Usuários podem atualizar seus próprios dados"
  ON public.usuarios
  FOR UPDATE
  USING (auth.uid() = id);

-- 4. Verificar se RLS está habilitado
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- 5. Recriar as funções RPC com permissões corretas
CREATE OR REPLACE FUNCTION public.get_current_admin_user()
RETURNS TABLE (
  id UUID,
  email TEXT,
  cargo TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email, u.cargo
  FROM public.usuarios u
  WHERE u.id = auth.uid() AND u.cargo = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.get_current_admin_user() TO anon, authenticated;

-- 6. Função simplificada para obter cargo
CREATE OR REPLACE FUNCTION public.get_user_cargo()
RETURNS TEXT AS $$
DECLARE
  user_cargo TEXT;
BEGIN
  SELECT cargo INTO user_cargo
  FROM public.usuarios
  WHERE id = auth.uid();
  
  RETURN COALESCE(user_cargo, 'usuario');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.get_user_cargo() TO anon, authenticated;

-- 7. Verificar se as políticas foram criadas corretamente
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'usuarios'
ORDER BY policyname;
