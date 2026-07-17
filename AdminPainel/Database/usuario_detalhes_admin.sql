-- Detalhes e gestão de usuários no painel admin
-- Execute no SQL Editor do Supabase

ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS data_nascimento DATE;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS pais TEXT NOT NULL DEFAULT 'BR';
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS kyc_status TEXT NOT NULL DEFAULT 'nao_enviado';
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS verificado BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_kyc_status_check;
ALTER TABLE public.usuarios
  ADD CONSTRAINT usuarios_kyc_status_check
  CHECK (kyc_status IN ('nao_enviado', 'pendente', 'aprovado', 'rejeitado'));

COMMENT ON COLUMN public.usuarios.data_nascimento IS 'Data de nascimento do usuário';
COMMENT ON COLUMN public.usuarios.pais IS 'País do usuário (código ISO)';
COMMENT ON COLUMN public.usuarios.kyc_status IS 'Status da verificação KYC';
COMMENT ON COLUMN public.usuarios.verificado IS 'Conta verificada pelo administrador';

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

  -- Total apostado: soma de todas as transações (Perdeu + Ganhou)
  SELECT COUNT(*)::INT, COALESCE(SUM(valor), 0)
  INTO v_count_apostas, v_total_apostado
  FROM public.transacoes_jogos
  WHERE usuario_id = p_usuario_id;

  -- Total ganho: soma de retornos creditados
  SELECT COALESCE(SUM(retorno), 0) INTO v_total_ganho
  FROM public.transacoes_jogos
  WHERE usuario_id = p_usuario_id;

  -- Fallback: se depositos aprovados estiver vazio, usa total_depositado do perfil
  IF COALESCE(v_valor_depositos_aprovados, 0) <= 0 AND COALESCE(v_usuario.total_depositado, 0) > 0 THEN
    v_valor_depositos_aprovados := v_usuario.total_depositado;
    IF v_count_depositos_aprovados <= 0 AND v_total_depositos > 0 THEN
      v_count_depositos_aprovados := v_total_depositos;
    END IF;
  END IF;

  -- Fallback: se saques aprovados estiver vazio, usa total de saques registrados
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
      'total_depositado', v_valor_depositos_aprovados,
      'total_retirado', v_valor_saques_aprovados,
      'total_apostado', v_total_apostado,
      'total_ganho', v_total_ganho,
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

CREATE OR REPLACE FUNCTION public.listar_sessoes_usuario_admin(p_usuario_id UUID)
RETURNS TABLE (
  id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  user_agent TEXT,
  ip INET
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.created_at,
    s.updated_at,
    s.user_agent,
    s.ip
  FROM auth.sessions s
  WHERE s.user_id = p_usuario_id
  ORDER BY s.updated_at DESC;
END;
$$;

DROP FUNCTION IF EXISTS public.listar_transacoes_usuario_admin(UUID, TEXT, INT);

CREATE OR REPLACE FUNCTION public.listar_transacoes_usuario_admin(
  p_usuario_id UUID,
  p_tipo TEXT DEFAULT 'todos',
  p_limite INT DEFAULT 10,
  p_offset INT DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_depositos JSON;
  v_saques JSON;
  v_apostas JSON;
  v_total_depositos INT := 0;
  v_total_saques INT := 0;
  v_total_apostas INT := 0;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT COUNT(*)::INT INTO v_total_depositos
  FROM public.depositos
  WHERE usuario_id = p_usuario_id;

  SELECT COUNT(*)::INT INTO v_total_saques
  FROM public.saques
  WHERE usuario_id = p_usuario_id;

  SELECT COUNT(*)::INT INTO v_total_apostas
  FROM public.transacoes_jogos
  WHERE usuario_id = p_usuario_id;

  IF p_tipo IN ('todos', 'depositos') THEN
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.data_hora DESC), '[]'::json)
    INTO v_depositos
    FROM (
      SELECT id, valor, status, data_hora, created_at
      FROM public.depositos
      WHERE usuario_id = p_usuario_id
      ORDER BY data_hora DESC
      LIMIT p_limite
      OFFSET p_offset
    ) t;
  ELSE
    v_depositos := '[]'::json;
  END IF;

  IF p_tipo IN ('todos', 'saques') THEN
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.data_hora DESC), '[]'::json)
    INTO v_saques
    FROM (
      SELECT id, valor, status, data_hora, created_at
      FROM public.saques
      WHERE usuario_id = p_usuario_id
      ORDER BY data_hora DESC
      LIMIT p_limite
      OFFSET p_offset
    ) t;
  ELSE
    v_saques := '[]'::json;
  END IF;

  IF p_tipo IN ('todos', 'apostas') THEN
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.data DESC), '[]'::json)
    INTO v_apostas
    FROM (
      SELECT id, jogo, valor, retorno, tipo, status, com_bonus, data, created_at
      FROM public.transacoes_jogos
      WHERE usuario_id = p_usuario_id
      ORDER BY data DESC
      LIMIT p_limite
      OFFSET p_offset
    ) t;
  ELSE
    v_apostas := '[]'::json;
  END IF;

  RETURN json_build_object(
    'ok', true,
    'depositos', v_depositos,
    'saques', v_saques,
    'apostas', v_apostas,
    'total_depositos', v_total_depositos,
    'total_saques', v_total_saques,
    'total_apostas', v_total_apostas
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.atualizar_status_usuario_admin(
  p_usuario_id UUID,
  p_ativo BOOLEAN DEFAULT NULL,
  p_verificado BOOLEAN DEFAULT NULL,
  p_kyc_status TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id = p_usuario_id) THEN
    RETURN json_build_object('ok', false, 'error', 'Usuário não encontrado');
  END IF;

  IF p_kyc_status IS NOT NULL AND p_kyc_status NOT IN ('nao_enviado', 'pendente', 'aprovado', 'rejeitado') THEN
    RETURN json_build_object('ok', false, 'error', 'Status KYC inválido');
  END IF;

  UPDATE public.usuarios
  SET
    ativo = COALESCE(p_ativo, ativo),
    verificado = COALESCE(p_verificado, verificado),
    kyc_status = COALESCE(p_kyc_status, kyc_status),
    updated_at = NOW()
  WHERE id = p_usuario_id;

  RETURN json_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.atualizar_perfil_usuario_admin(
  p_usuario_id UUID,
  p_nome TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_cpf TEXT DEFAULT NULL,
  p_telefone TEXT DEFAULT NULL,
  p_data_nascimento DATE DEFAULT NULL,
  p_pais TEXT DEFAULT NULL,
  p_cargo TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id = p_usuario_id) THEN
    RETURN json_build_object('ok', false, 'error', 'Usuário não encontrado');
  END IF;

  UPDATE public.usuarios
  SET
    nome = COALESCE(NULLIF(TRIM(p_nome), ''), nome),
    usuario_nome = COALESCE(NULLIF(TRIM(p_nome), ''), usuario_nome),
    email = COALESCE(NULLIF(TRIM(p_email), ''), email),
    cpf = COALESCE(NULLIF(TRIM(p_cpf), ''), cpf),
    telefone = COALESCE(NULLIF(TRIM(p_telefone), ''), telefone),
    data_nascimento = COALESCE(p_data_nascimento, data_nascimento),
    pais = COALESCE(NULLIF(TRIM(p_pais), ''), pais),
    cargo = COALESCE(NULLIF(TRIM(p_cargo), ''), cargo),
    updated_at = NOW()
  WHERE id = p_usuario_id;

  RETURN json_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.obter_detalhes_usuario_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.listar_sessoes_usuario_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.listar_transacoes_usuario_admin(UUID, TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_status_usuario_admin(UUID, BOOLEAN, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_perfil_usuario_admin(UUID, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT) TO authenticated;
