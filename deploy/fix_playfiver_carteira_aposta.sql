-- =============================================================================
-- Fix — PlayFivers: apostas/ganhos na carteira selecionada (R$ / B$)
--
-- Problema: processar_callback_playfiver antigo misturava carteiras
-- (ex.: debitava R$ e creditava B$, ou usava B$ primeiro mesmo com R$ selecionado).
--
-- Este patch faz TODOS os jogos PlayFivers respeitarem usuarios.carteira_ativa.
-- Execute no SQL Editor do Supabase (após fix_aviator_carteira_aposta.sql se já rodou).
-- =============================================================================

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS carteira_ativa TEXT NOT NULL DEFAULT 'real';

ALTER TABLE public.usuarios
  DROP CONSTRAINT IF EXISTS usuarios_carteira_ativa_check;

ALTER TABLE public.usuarios
  ADD CONSTRAINT usuarios_carteira_ativa_check
  CHECK (carteira_ativa IN ('real', 'bonus'));

COMMENT ON COLUMN public.usuarios.carteira_ativa IS
  'Carteira usada em jogos: real (R$ / saldo) ou bonus (B$ / saldo_bonus).';

CREATE OR REPLACE FUNCTION public._saldo_jogavel_carteira(
  p_saldo NUMERIC,
  p_saldo_bonus NUMERIC,
  p_carteira TEXT
)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT ROUND(
    CASE
      WHEN COALESCE(p_carteira, 'real') = 'bonus' THEN COALESCE(p_saldo_bonus, 0)
      ELSE COALESCE(p_saldo, 0)
    END,
    2
  );
$$;

CREATE OR REPLACE FUNCTION public._carteira_usa_bonus(p_carteira TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(p_carteira, 'real') = 'bonus';
$$;

-- Ganho bet=0 só conta como giros grátis durante a sessão ativa (não 72h depois)
CREATE OR REPLACE FUNCTION public._ganho_eh_de_giros_gratis(
  p_usuario_id UUID,
  p_bet NUMERIC,
  p_win NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_usuario_id IS NULL OR COALESCE(p_bet, 0) > 0 OR COALESCE(p_win, 0) <= 0 THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.cupom_usos cu
    INNER JOIN public.cupons c ON c.id = cu.cupom_id
    WHERE cu.usuario_id = p_usuario_id
      AND c.tipo_bonus = 'giros_gratis'
      AND cu.status_giro IN ('disponivel', 'usado')
      AND cu.giros_ativado_em IS NOT NULL
      AND cu.giros_ativado_em > (TIMEZONE('utc'::text, NOW()) - INTERVAL '30 minutes')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.definir_carteira_ativa(p_carteira TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_carteira TEXT;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  v_carteira := lower(trim(COALESCE(p_carteira, '')));
  IF v_carteira NOT IN ('real', 'bonus') THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_wallet');
  END IF;

  PERFORM set_config('app.skip_usuario_guard', 'true', true);

  UPDATE public.usuarios
  SET carteira_ativa = v_carteira,
      updated_at = NOW()
  WHERE id = v_uid;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'user_not_found');
  END IF;

  RETURN json_build_object('ok', true, 'carteira_ativa', v_carteira);
END;
$$;

CREATE OR REPLACE FUNCTION public.obter_carteira_ativa()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_carteira TEXT;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT COALESCE(u.carteira_ativa, 'real')
  INTO v_carteira
  FROM public.usuarios u
  WHERE u.id = v_uid;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'user_not_found');
  END IF;

  RETURN json_build_object('ok', true, 'carteira_ativa', v_carteira);
END;
$$;

GRANT EXECUTE ON FUNCTION public.definir_carteira_ativa(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.obter_carteira_ativa() TO authenticated;

-- game_launch (service_role): persiste carteira antes do iframe PlayFivers consultar BALANCE
CREATE OR REPLACE FUNCTION public.sync_carteira_ativa_launch(
  p_user_id UUID,
  p_carteira TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_carteira TEXT;
  v_saldo DECIMAL(10, 2);
  v_saldo_bonus DECIMAL(10, 2);
BEGIN
  v_carteira := lower(trim(COALESCE(p_carteira, '')));
  IF v_carteira NOT IN ('real', 'bonus') THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_wallet');
  END IF;

  PERFORM set_config('app.skip_usuario_guard', 'true', true);

  UPDATE public.usuarios
  SET carteira_ativa = v_carteira,
      updated_at = NOW()
  WHERE id = p_user_id
  RETURNING saldo, saldo_bonus, carteira_ativa
  INTO v_saldo, v_saldo_bonus, v_carteira;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'user_not_found');
  END IF;

  RETURN json_build_object(
    'ok', true,
    'carteira_ativa', v_carteira,
    'saldo', COALESCE(v_saldo, 0),
    'saldo_bonus', COALESCE(v_saldo_bonus, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_carteira_ativa_launch(UUID, TEXT) TO service_role;

DROP FUNCTION IF EXISTS public.get_user_by_email(TEXT);

CREATE OR REPLACE FUNCTION public.get_user_by_email(user_email TEXT)
RETURNS TABLE (
  id UUID,
  saldo DECIMAL(10, 2),
  saldo_bonus DECIMAL(10, 2),
  carteira_ativa TEXT,
  email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.saldo,
    COALESCE(u.saldo_bonus, 0)::DECIMAL(10, 2),
    COALESCE(u.carteira_ativa, 'real'),
    u.email
  FROM public.usuarios u
  WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(user_email))
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_by_email(TEXT) TO service_role;

-- =============================================================================
-- PlayFivers — callback único respeita carteira_ativa (slots, live, esportes…)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.processar_callback_playfiver(
  p_email TEXT,
  p_txn_id TEXT,
  p_bet NUMERIC,
  p_win NUMERIC,
  p_jogo TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_txn TEXT;
  v_bet NUMERIC;
  v_win NUMERIC;
  v_usuario_id UUID;
  v_saldo NUMERIC;
  v_saldo_bonus NUMERIC;
  v_carteira TEXT;
  v_usa_bonus BOOLEAN;
  v_novo_saldo NUMERIC;
  v_novo_saldo_bonus NUMERIC;
  v_saldo_jogavel NUMERIC;
  v_inserted_id UUID;
  v_jogo TEXT;
  v_tipo TEXT;
  v_owner UUID;
  v_eh_giros_gratis BOOLEAN;
  v_com_bonus TEXT;
  v_com_bonus_aposta TEXT;
  v_saldo_antes NUMERIC;
  v_saldo_bonus_antes NUMERIC;
BEGIN
  v_email := lower(trim(COALESCE(p_email, '')));
  v_txn := trim(COALESCE(p_txn_id, ''));
  v_bet := ROUND(COALESCE(p_bet, 0)::numeric, 2);
  v_win := ROUND(COALESCE(p_win, 0)::numeric, 2);

  IF v_email = '' THEN
    RETURN json_build_object('ok', false, 'error', 'INVALID_USER', 'balance', 0);
  END IF;

  IF v_txn = '' THEN
    RETURN json_build_object('ok', false, 'error', 'INVALID_TXN', 'balance', 0);
  END IF;

  IF v_bet < 0 OR v_win < 0 THEN
    RETURN json_build_object('ok', false, 'error', 'INVALID_AMOUNT', 'balance', 0);
  END IF;

  SELECT id, COALESCE(saldo, 0), COALESCE(saldo_bonus, 0), COALESCE(carteira_ativa, 'real')
  INTO v_usuario_id, v_saldo, v_saldo_bonus, v_carteira
  FROM public.usuarios
  WHERE lower(trim(email)) = v_email
  LIMIT 1
  FOR UPDATE;

  IF v_usuario_id IS NULL THEN
    SELECT id, COALESCE(saldo, 0), COALESCE(saldo_bonus, 0), COALESCE(carteira_ativa, 'real')
    INTO v_usuario_id, v_saldo, v_saldo_bonus, v_carteira
    FROM public.usuarios
    WHERE email ILIKE v_email
    LIMIT 1
    FOR UPDATE;
  END IF;

  IF v_usuario_id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'INVALID_USER', 'balance', 0);
  END IF;

  v_saldo_antes := v_saldo;
  v_saldo_bonus_antes := v_saldo_bonus;
  v_usa_bonus := public._carteira_usa_bonus(v_carteira);
  v_com_bonus_aposta := NULL;

  -- PlayFivers costuma enviar ganho isolado (bet=0, win>0): herda carteira da aposta recente
  IF v_bet = 0 AND v_win > 0 THEN
    SELECT tj.com_bonus
    INTO v_com_bonus_aposta
    FROM public.transacoes_jogos tj
    WHERE tj.usuario_id = v_usuario_id
      AND COALESCE(tj.valor, 0) > 0
      AND tj.data >= (TIMEZONE('utc'::text, NOW()) - INTERVAL '20 minutes')
    ORDER BY tj.data DESC
    LIMIT 1;

    IF v_com_bonus_aposta = 'Sim' THEN
      v_usa_bonus := true;
      v_carteira := 'bonus';
    ELSIF v_com_bonus_aposta = 'Não' THEN
      v_usa_bonus := false;
      v_carteira := 'real';
    END IF;
  END IF;

  v_saldo_jogavel := public._saldo_jogavel_carteira(v_saldo, v_saldo_bonus, v_carteira);
  v_eh_giros_gratis := public._ganho_eh_de_giros_gratis(v_usuario_id, v_bet, v_win);

  IF v_bet = 0 AND v_win > 0 AND v_com_bonus_aposta IS NOT NULL THEN
    v_eh_giros_gratis := false;
  END IF;

  v_jogo := NULLIF(trim(COALESCE(p_jogo, '')), '');
  IF v_jogo IS NULL THEN
    v_jogo := 'Jogo';
  END IF;
  v_tipo := CASE WHEN v_win > 0 THEN 'Ganhou' ELSE 'Perdeu' END;

  v_com_bonus := CASE
    WHEN v_eh_giros_gratis OR v_usa_bonus THEN 'Sim'
    ELSE 'Não'
  END;

  INSERT INTO public.transacoes_jogos (
    usuario_id, txn_id, tipo, jogo, valor, retorno, status, com_bonus, data
  )
  VALUES (
    v_usuario_id,
    v_txn,
    v_tipo,
    v_jogo,
    v_bet,
    CASE WHEN v_win > 0 THEN v_win ELSE 0 END,
    'Finalizado',
    v_com_bonus,
    TIMEZONE('utc'::text, NOW())
  )
  ON CONFLICT (txn_id) DO NOTHING
  RETURNING id INTO v_inserted_id;

  IF v_inserted_id IS NULL THEN
    SELECT usuario_id INTO v_owner
    FROM public.transacoes_jogos
    WHERE txn_id = v_txn
    LIMIT 1;

    IF v_owner IS DISTINCT FROM v_usuario_id THEN
      RETURN json_build_object(
        'ok', false,
        'error', 'TXN_OWNER_MISMATCH',
        'balance', v_saldo_jogavel
      );
    END IF;

    SELECT COALESCE(saldo, 0), COALESCE(saldo_bonus, 0), COALESCE(carteira_ativa, 'real')
    INTO v_saldo, v_saldo_bonus, v_carteira
    FROM public.usuarios
    WHERE id = v_usuario_id;

    RETURN json_build_object(
      'ok', true,
      'duplicate', true,
      'balance', public._saldo_jogavel_carteira(v_saldo, v_saldo_bonus, v_carteira),
      'usuario_id', v_usuario_id
    );
  END IF;

  -- Ganhos de rodadas grátis (bet=0) sempre vão para B$
  IF v_eh_giros_gratis AND v_win > 0 THEN
    v_novo_saldo := ROUND(v_saldo, 2);
    v_novo_saldo_bonus := ROUND(v_saldo_bonus + v_win, 2);

    PERFORM set_config('app.skip_usuario_guard', 'true', true);

    UPDATE public.usuarios
    SET saldo_bonus = v_novo_saldo_bonus,
        updated_at = NOW()
    WHERE id = v_usuario_id;

    PERFORM public.aplicar_rollover_bonus_giro(v_usuario_id, v_win);

    RETURN json_build_object(
      'ok', true,
      'duplicate', false,
      'balance', public._saldo_jogavel_carteira(v_novo_saldo, v_novo_saldo_bonus, v_carteira),
      'saldo_bonus', v_novo_saldo_bonus,
      'bonus_credit', true,
      'eh_giros_gratis', true,
      'carteira_ativa', v_carteira,
      'carteira_aposta', 'bonus',
      'saldo_anterior', v_saldo_jogavel,
      'saldo_antes', v_saldo_antes,
      'saldo_bonus_antes', v_saldo_bonus_antes,
      'saldo', v_novo_saldo,
      'usuario_id', v_usuario_id,
      'transacao_id', v_inserted_id
    );
  END IF;

  IF v_bet = 0 AND v_win = 0 THEN
    RETURN json_build_object(
      'ok', true,
      'duplicate', false,
      'balance', v_saldo_jogavel,
      'carteira_ativa', v_carteira,
      'usuario_id', v_usuario_id,
      'transacao_id', v_inserted_id
    );
  END IF;

  v_novo_saldo := v_saldo;
  v_novo_saldo_bonus := v_saldo_bonus;

  IF v_usa_bonus THEN
    IF v_saldo_bonus + 0.000001 < v_bet THEN
      RAISE EXCEPTION 'INSUFFICIENT_USER_FUNDS' USING ERRCODE = 'P0001';
    END IF;
    v_novo_saldo_bonus := ROUND(v_saldo_bonus + v_win - v_bet, 2);
  ELSE
    IF v_saldo + 0.000001 < GREATEST(0, ROUND(v_bet - v_win, 2)) AND ROUND(v_saldo + v_win - v_bet, 2) < 0 THEN
      RAISE EXCEPTION 'INSUFFICIENT_USER_FUNDS' USING ERRCODE = 'P0001';
    END IF;
    v_novo_saldo := ROUND(v_saldo + v_win - v_bet, 2);
    IF v_novo_saldo < -0.000001 THEN
      RAISE EXCEPTION 'INSUFFICIENT_USER_FUNDS' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF v_novo_saldo_bonus < -0.000001 THEN
    RAISE EXCEPTION 'INSUFFICIENT_USER_FUNDS' USING ERRCODE = 'P0001';
  END IF;

  PERFORM set_config('app.skip_usuario_guard', 'true', true);

  UPDATE public.usuarios
  SET saldo = v_novo_saldo,
      saldo_bonus = v_novo_saldo_bonus,
      updated_at = NOW()
  WHERE id = v_usuario_id;

  RETURN json_build_object(
    'ok', true,
    'duplicate', false,
    'balance', public._saldo_jogavel_carteira(v_novo_saldo, v_novo_saldo_bonus, v_carteira),
    'saldo', v_novo_saldo,
    'saldo_bonus', v_novo_saldo_bonus,
    'carteira_ativa', v_carteira,
    'carteira_aposta', CASE WHEN v_usa_bonus THEN 'bonus' ELSE 'real' END,
    'eh_giros_gratis', false,
    'bonus_credit', false,
    'herdou_carteira_aposta', v_com_bonus_aposta,
    'saldo_anterior', v_saldo_jogavel,
    'saldo_antes', v_saldo_antes,
    'saldo_bonus_antes', v_saldo_bonus_antes,
    'usuario_id', v_usuario_id,
    'transacao_id', v_inserted_id
  );
EXCEPTION
  WHEN raise_exception THEN
    IF SQLERRM = 'INSUFFICIENT_USER_FUNDS' THEN
      RETURN json_build_object(
        'ok', false,
        'error', 'INSUFFICIENT_USER_FUNDS',
        'balance', public._saldo_jogavel_carteira(
          COALESCE(v_saldo, 0),
          COALESCE(v_saldo_bonus, 0),
          COALESCE(v_carteira, 'real')
        )
      );
    END IF;
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.processar_callback_playfiver(TEXT, TEXT, NUMERIC, NUMERIC, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.processar_callback_playfiver(TEXT, TEXT, NUMERIC, NUMERIC, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.processar_callback_playfiver(TEXT, TEXT, NUMERIC, NUMERIC, TEXT) TO service_role;

COMMENT ON FUNCTION public.processar_callback_playfiver(TEXT, TEXT, NUMERIC, NUMERIC, TEXT) IS
  'PlayFivers: usa carteira_ativa (real=saldo, bonus=saldo_bonus). Rodadas grátis creditam B$.';
