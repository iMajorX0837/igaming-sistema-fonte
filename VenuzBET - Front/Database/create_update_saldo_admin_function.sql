-- Função RPC para atualizar saldo do usuário pelo admin
-- Esta função usa SECURITY DEFINER para bypassar RLS e garantir que o update funcione

CREATE OR REPLACE FUNCTION public.atualizar_saldo_usuario(
  p_usuario_id UUID,
  p_novo_saldo NUMERIC
)
RETURNS JSON AS $$
DECLARE
  v_saldo_anterior NUMERIC;
BEGIN
  -- Buscar saldo atual do usuário
  SELECT saldo INTO v_saldo_anterior
  FROM public.usuarios
  WHERE id = p_usuario_id;

  -- Verificar se usuário existe
  IF v_saldo_anterior IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Usuário não encontrado'
    );
  END IF;

  -- Validar que o novo saldo não é negativo
  IF p_novo_saldo < 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'O saldo não pode ser negativo'
    );
  END IF;

  -- Atualizar saldo do usuário
  UPDATE public.usuarios
  SET saldo = p_novo_saldo
  WHERE id = p_usuario_id;

  -- Retornar sucesso com o novo saldo
  RETURN json_build_object(
    'success', true,
    'saldo_anterior', v_saldo_anterior,
    'saldo_atual', p_novo_saldo
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dar permissão para usuários autenticados executarem a função
GRANT EXECUTE ON FUNCTION public.atualizar_saldo_usuario(UUID, NUMERIC) TO authenticated;

-- Comentário explicativo
COMMENT ON FUNCTION public.atualizar_saldo_usuario(UUID, NUMERIC) IS 
'Atualiza o saldo de um usuário. Usa SECURITY DEFINER para bypassar RLS. Usado pelo painel administrativo.';

