-- Script SIMPLES para garantir que RLS funcione
-- Execute este script no Supabase SQL Editor

-- 1. Desabilitar RLS temporariamente para limpar políticas
ALTER TABLE public.usuarios DISABLE ROW LEVEL SECURITY;

-- 2. Remover TODAS as políticas
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'usuarios' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.usuarios', policy_record.policyname);
  END LOOP;
END $$;

-- 3. Reabilitar RLS
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- 4. Criar política SIMPLES que permite ver seus próprios dados
CREATE POLICY "usuarios_select_own"
  ON public.usuarios
  FOR SELECT
  USING (auth.uid() = id);

-- 5. Verificar se funcionou
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'usuarios';
