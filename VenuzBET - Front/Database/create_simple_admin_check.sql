-- Função SIMPLES que contorna RLS para verificar se usuário é admin
-- Esta função usa SECURITY DEFINER para ignorar políticas RLS

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

-- Dar permissão para todos executarem
GRANT EXECUTE ON FUNCTION public.check_user_is_admin(UUID) TO anon, authenticated;

-- Testar a função (substitua o UUID pelo ID do seu usuário admin)
-- SELECT * FROM public.check_user_is_admin('29f9d602-1bac-4ac3-957e-caef6409cfe7'::UUID);
