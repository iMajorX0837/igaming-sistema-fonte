-- Função RPC para contar todos os usuários (bypass RLS para admins)
-- Execute este script no Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.get_total_usuarios()
RETURNS INTEGER AS $$
DECLARE
  user_cargo TEXT;
  total_count INTEGER;
BEGIN
  -- Verificar se o usuário atual é admin
  SELECT cargo INTO user_cargo
  FROM public.usuarios
  WHERE id = auth.uid();

  -- Se for admin, retornar total de usuários
  IF user_cargo = 'admin' THEN
    SELECT COUNT(*) INTO total_count
    FROM public.usuarios;
    RETURN total_count;
  ELSE
    -- Se não for admin, retornar apenas seu próprio registro (1)
    RETURN 1;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dar permissão para todos executarem
GRANT EXECUTE ON FUNCTION public.get_total_usuarios() TO anon, authenticated;
