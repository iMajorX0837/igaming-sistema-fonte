-- Função para verificar se o usuário atual é admin
-- Esta função usa SECURITY DEFINER para contornar políticas RLS
CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_cargo TEXT;
BEGIN
  SELECT cargo INTO user_cargo
  FROM public.usuarios
  WHERE id = auth.uid();
  
  RETURN user_cargo = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Garantir permissões para a função
GRANT EXECUTE ON FUNCTION public.is_user_admin() TO anon, authenticated;

-- Função para obter dados do usuário admin atual
-- Retorna uma tabela com os dados do usuário se for admin
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

-- Garantir permissões para a função
GRANT EXECUTE ON FUNCTION public.get_current_admin_user() TO anon, authenticated;

-- Função simplificada que retorna apenas o cargo do usuário atual
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

-- Garantir permissões para a função
GRANT EXECUTE ON FUNCTION public.get_user_cargo() TO anon, authenticated;
