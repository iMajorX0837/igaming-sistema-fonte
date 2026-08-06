-- Follow-up C1: revoga de verdade o subtrair_saldo_saque para clientes.
-- Em Postgres, EXECUTE costuma estar em PUBLIC — REVOKE só de authenticated não basta.

REVOKE ALL ON FUNCTION public.subtrair_saldo_saque(UUID, NUMERIC) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.subtrair_saldo_saque(UUID, NUMERIC) FROM anon;
REVOKE ALL ON FUNCTION public.subtrair_saldo_saque(UUID, NUMERIC) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.subtrair_saldo_saque(UUID, NUMERIC) TO service_role;

-- Defesa em profundidade: mesmo se alguém re-grantar, só service_role passa
CREATE OR REPLACE FUNCTION public.subtrair_saldo_saque(
  p_usuario_id UUID,
  p_valor_saque NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('postgres', 'supabase_admin', 'service_role') THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;

  RETURN json_build_object(
    'success', false,
    'error', 'deprecated_use_solicitar_saque'
  );
END;
$$;

COMMENT ON FUNCTION public.subtrair_saldo_saque(UUID, NUMERIC) IS
  'Deprecated. Use solicitar_saque. Bloqueado para clientes.';
