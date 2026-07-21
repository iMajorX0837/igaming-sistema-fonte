-- Função para buscar usuário por email (para uso no webhook)
-- Esta função usa SECURITY DEFINER para bypass do RLS
CREATE OR REPLACE FUNCTION public.get_user_by_email(user_email TEXT)
RETURNS TABLE (
  id UUID,
  saldo DECIMAL(10,2),
  email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.saldo,
    u.email
  FROM public.usuarios u
  WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(user_email))
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Política para permitir que a função seja executada por qualquer role
GRANT EXECUTE ON FUNCTION public.get_user_by_email(TEXT) TO service_role;

