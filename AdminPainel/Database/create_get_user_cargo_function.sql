-- Função RPC para buscar cargo do usuário atual (bypass RLS)
-- Execute este script no Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.get_user_cargo()
RETURNS TEXT AS $$
DECLARE
  user_cargo TEXT;
BEGIN
  -- Buscar cargo do usuário atual usando SECURITY DEFINER para bypassar RLS
  SELECT cargo INTO user_cargo
  FROM public.usuarios
  WHERE id = auth.uid();
  
  RETURN user_cargo;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Dar permissão para todos executarem
GRANT EXECUTE ON FUNCTION public.get_user_cargo() TO anon, authenticated;

