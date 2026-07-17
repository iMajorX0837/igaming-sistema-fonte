-- Fix: estatísticas detalhadas do usuário no admin (valores zerados)
-- Execute no SQL Editor do Supabase

CREATE OR REPLACE FUNCTION public.obter_detalhes_usuario_admin(p_usuario_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario public.usuarios%ROWTYPE;
  v_ultimo_login TIMESTAMPTZ;
  v_sessoes INT;
  v_total_depositos INT;
  v_total_saques INT;
  v_total_apostas INT;
  v_valor_depositos NUMERIC;
  v_valor_saques NUMERIC;
  v_count_depositos_aprovados INT;
  v_count_saques_aprovados INT;
  v_count_apostas INT;
  v_total_apostado NUMERIC;
  v_total_ganho NUMERIC;
  v_valor_depositos_aprovados NUMERIC;
  v_valor_saques_aprovados NUMERIC;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT * INTO v_usuario
  FROM public.usuarios
  WHERE id = p_usuario_id;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'Usuário não encontrado');
  END IF;

  SELECT au.last_sign_in_at INTO v_ultimo_login
  FROM auth.users au
  WHERE au.id = p_usuario_id;

  SELECT COUNT(*)::INT INTO v_sessoes
  FROM auth.sessions s
  WHERE s.user_id = p_usuario_id;

  SELECT COUNT(*)::INT, COALESCE(SUM(valor), 0)
  INTO v_total_depositos, v_valor_depositos
  FROM public.depositos
  WHERE usuario_id = p_usuario_id;

  SELECT COUNT(*)::INT, COALESCE(SUM(valor), 0)
  INTO v_total_saques, v_valor_saques
  FROM public.saques
  WHERE usuario_id = p_usuario_id;

  SELECT COUNT(*)::INT INTO v_total_apostas
  FROM public.transacoes_jogos
  WHERE usuario_id = p_usuario_id;

  SELECT COUNT(*)::INT, COALESCE(SUM(valor), 0)
  INTO v_count_depositos_aprovados, v_valor_depositos_aprovados
  FROM public.depositos
  WHERE usuario_id = p_usuario_id AND LOWER(TRIM(status)) = 'aprovado';

  SELECT COUNT(*)::INT, COALESCE(SUM(valor), 0)
  INTO v_count_saques_aprovados, v_valor_saques_aprovados
  FROM public.saques
  WHERE usuario_id = p_usuario_id AND LOWER(TRIM(status)) = 'aprovado';

  SELECT COUNT(*)::INT, COALESCE(SUM(valor), 0)
  INTO v_count_apostas, v_total_apostado
  FROM public.transacoes_jogos
  WHERE usuario_id = p_usuario_id;

  SELECT COALESCE(SUM(retorno), 0) INTO v_total_ganho
  FROM public.transacoes_jogos
  WHERE usuario_id = p_usuario_id;

  IF COALESCE(v_valor_depositos_aprovados, 0) <= 0 AND COALESCE(v_usuario.total_depositado, 0) > 0 THEN
    v_valor_depositos_aprovados := v_usuario.total_depositado;
    IF v_count_depositos_aprovados <= 0 AND v_total_depositos > 0 THEN
      v_count_depositos_aprovados := v_total_depositos;
    END IF;
  END IF;

  IF COALESCE(v_valor_saques_aprovados, 0) <= 0 AND COALESCE(v_valor_saques, 0) > 0 THEN
    v_valor_saques_aprovados := v_valor_saques;
    IF v_count_saques_aprovados <= 0 AND v_total_saques > 0 THEN
      v_count_saques_aprovados := v_total_saques;
    END IF;
  END IF;

  RETURN json_build_object(
    'ok', true,
    'usuario', json_build_object(
      'id', v_usuario.id,
      'nome', COALESCE(NULLIF(TRIM(v_usuario.usuario_nome), ''), NULLIF(TRIM(v_usuario.nome), ''), NULLIF(TRIM(v_usuario.usuario), ''), split_part(v_usuario.email, '@', 1)),
      'email', v_usuario.email,
      'cpf', v_usuario.cpf,
      'telefone', v_usuario.telefone,
      'data_nascimento', v_usuario.data_nascimento,
      'pais', COALESCE(v_usuario.pais, 'BR'),
      'kyc_status', COALESCE(v_usuario.kyc_status, 'nao_enviado'),
      'verificado', COALESCE(v_usuario.verificado, false),
      'ativo', COALESCE(v_usuario.ativo, true),
      'cargo', COALESCE(v_usuario.cargo, 'usuario'),
      'saldo', COALESCE(v_usuario.saldo, 0),
      'vip_nivel', COALESCE(v_usuario.vip_nivel, 1),
      'total_depositado', COALESCE(v_usuario.total_depositado, 0),
      'created_at', v_usuario.created_at,
      'ultimo_login', v_ultimo_login,
      'sessoes', COALESCE(v_sessoes, 0)
    ),
    'resumo', json_build_object(
      'total_depositos', v_total_depositos,
      'valor_depositos', v_valor_depositos,
      'total_saques', v_total_saques,
      'valor_saques', v_valor_saques,
      'total_apostas', v_total_apostas
    ),
    'estatisticas', json_build_object(
      'total_depositado', COALESCE(v_valor_depositos_aprovados, 0),
      'total_retirado', COALESCE(v_valor_saques_aprovados, 0),
      'total_apostado', COALESCE(v_total_apostado, 0),
      'total_ganho', COALESCE(v_total_ganho, 0),
      'media_deposito', CASE
        WHEN v_count_depositos_aprovados > 0
        THEN ROUND(v_valor_depositos_aprovados / v_count_depositos_aprovados, 2)
        ELSE 0
      END,
      'media_saque', CASE
        WHEN v_count_saques_aprovados > 0
        THEN ROUND(v_valor_saques_aprovados / v_count_saques_aprovados, 2)
        ELSE 0
      END,
      'media_aposta', CASE
        WHEN v_count_apostas > 0
        THEN ROUND(v_total_apostado / v_count_apostas, 2)
        ELSE 0
      END
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.obter_detalhes_usuario_admin(UUID) TO authenticated;
