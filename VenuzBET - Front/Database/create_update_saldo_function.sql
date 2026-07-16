-- Função RPC para atualizar saldo do usuário ao fazer saque
-- Esta função usa SECURITY DEFINER para bypassar RLS e garantir que o update funcione

CREATE OR REPLACE FUNCTION public.subtrair_saldo_saque(
  p_usuario_id UUID,
  p_valor_saque NUMERIC
)
RETURNS JSON AS $$
DECLARE
  v_saldo_atual NUMERIC;
  v_novo_saldo NUMERIC;
  v_result JSON;
BEGIN
  -- Buscar saldo atual do usuário
  SELECT saldo INTO v_saldo_atual
  FROM public.usuarios
  WHERE id = p_usuario_id;

  -- Verificar se usuário existe
  IF v_saldo_atual IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Usuário não encontrado'
    );
  END IF;

  -- Verificar se há saldo suficiente
  IF v_saldo_atual < p_valor_saque THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Saldo insuficiente',
      'saldo_atual', v_saldo_atual,
      'valor_saque', p_valor_saque
    );
  END IF;

  -- Calcular novo saldo
  v_novo_saldo := v_saldo_atual - p_valor_saque;

  -- Atualizar saldo do usuário
  UPDATE public.usuarios
  SET saldo = v_novo_saldo
  WHERE id = p_usuario_id;

  -- Retornar sucesso com o novo saldo
  RETURN json_build_object(
    'success', true,
    'saldo_anterior', v_saldo_atual,
    'saldo_atual', v_novo_saldo,
    'valor_saque', p_valor_saque
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dar permissão para usuários autenticados executarem a função
GRANT EXECUTE ON FUNCTION public.subtrair_saldo_saque(UUID, NUMERIC) TO authenticated;

-- Comentário explicativo
COMMENT ON FUNCTION public.subtrair_saldo_saque(UUID, NUMERIC) IS 
'Subtrai um valor do saldo do usuário ao realizar um saque. Usa SECURITY DEFINER para bypassar RLS.';

