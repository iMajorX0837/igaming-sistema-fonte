-- =============================================================================
-- Patch — Saldo bônus jogável na PlayFivers (BALANCE + apostas)
-- Execute após patch_bonus_giros_gratis.sql
--
-- - BALANCE/callback retorna saldo + saldo_bonus (saldo jogável)
-- - Apostas debitam saldo_bonus primeiro, depois saldo
-- - Ganhos de apostas feitas com bônus voltam para saldo_bonus
-- =============================================================================

DROP FUNCTION IF EXISTS public.get_user_by_email(TEXT);

CREATE OR REPLACE FUNCTION public.get_user_by_email(user_email TEXT)
RETURNS TABLE (
  id UUID,
  saldo DECIMAL(10, 2),
  saldo_bonus DECIMAL(10, 2),
  email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.saldo, COALESCE(u.saldo_bonus, 0)::DECIMAL(10, 2), u.email
  FROM public.usuarios u
  WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(user_email))
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_by_email(TEXT) TO service_role;

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
  v_novo_saldo NUMERIC;
  v_novo_saldo_bonus NUMERIC;
  v_saldo_jogavel NUMERIC;
  v_from_bonus NUMERIC;
  v_from_saldo NUMERIC;
  v_inserted_id UUID;
  v_jogo TEXT;
  v_tipo TEXT;
  v_owner UUID;
  v_eh_giros_gratis BOOLEAN;
  v_com_bonus TEXT;
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

  SELECT id, COALESCE(saldo, 0), COALESCE(saldo_bonus, 0)
  INTO v_usuario_id, v_saldo, v_saldo_bonus
  FROM public.usuarios
  WHERE lower(trim(email)) = v_email
  LIMIT 1
  FOR UPDATE;

  IF v_usuario_id IS NULL THEN
    SELECT id, COALESCE(saldo, 0), COALESCE(saldo_bonus, 0)
    INTO v_usuario_id, v_saldo, v_saldo_bonus
    FROM public.usuarios
    WHERE email ILIKE v_email
    LIMIT 1
    FOR UPDATE;
  END IF;

  IF v_usuario_id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'INVALID_USER', 'balance', 0);
  END IF;

  v_eh_giros_gratis := public._ganho_eh_de_giros_gratis(v_usuario_id, v_bet, v_win);
  v_from_bonus := CASE
    WHEN v_eh_giros_gratis THEN 0
    ELSE LEAST(v_saldo_bonus, v_bet)
  END;
  v_com_bonus := CASE
    WHEN v_eh_giros_gratis OR v_from_bonus > 0 THEN 'Sim'
    ELSE 'Não'
  END;

  v_jogo := NULLIF(trim(COALESCE(p_jogo, '')), '');
  IF v_jogo IS NULL THEN
    v_jogo := 'Jogo';
  END IF;
  v_tipo := CASE WHEN v_win > 0 THEN 'Ganhou' ELSE 'Perdeu' END;

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
      v_saldo_jogavel := ROUND(v_saldo + v_saldo_bonus, 2);
      RETURN json_build_object(
        'ok', false,
        'error', 'TXN_OWNER_MISMATCH',
        'balance', v_saldo_jogavel
      );
    END IF;

    SELECT COALESCE(saldo, 0), COALESCE(saldo_bonus, 0)
    INTO v_saldo, v_saldo_bonus
    FROM public.usuarios
    WHERE id = v_usuario_id;

    RETURN json_build_object(
      'ok', true,
      'duplicate', true,
      'balance', ROUND(v_saldo + v_saldo_bonus, 2),
      'usuario_id', v_usuario_id
    );
  END IF;

  -- Ganhos de rodadas grátis (bet = 0)
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
      'balance', ROUND(v_novo_saldo + v_novo_saldo_bonus, 2),
      'saldo_bonus', v_novo_saldo_bonus,
      'bonus_credit', true,
      'saldo_anterior', ROUND(v_saldo + v_saldo_bonus, 2),
      'usuario_id', v_usuario_id,
      'transacao_id', v_inserted_id
    );
  END IF;

  -- Rodada grátis sem retorno
  IF v_bet = 0 AND v_win = 0 THEN
    RETURN json_build_object(
      'ok', true,
      'duplicate', false,
      'balance', ROUND(v_saldo + v_saldo_bonus, 2),
      'usuario_id', v_usuario_id,
      'transacao_id', v_inserted_id
    );
  END IF;

  -- Apostas reais: debita bônus primeiro, depois saldo
  v_from_saldo := ROUND(v_bet - v_from_bonus, 2);

  IF v_from_saldo > v_saldo + 0.000001 THEN
    RAISE EXCEPTION 'INSUFFICIENT_USER_FUNDS' USING ERRCODE = 'P0001';
  END IF;

  v_novo_saldo_bonus := ROUND(v_saldo_bonus - v_from_bonus, 2);
  v_novo_saldo := ROUND(v_saldo - v_from_saldo, 2);

  IF v_win > 0 THEN
    IF v_from_bonus > 0 THEN
      v_novo_saldo_bonus := ROUND(v_novo_saldo_bonus + v_win, 2);
    ELSE
      v_novo_saldo := ROUND(v_novo_saldo + v_win, 2);
    END IF;
  END IF;

  IF v_novo_saldo < -0.000001 OR v_novo_saldo_bonus < -0.000001 THEN
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
    'balance', ROUND(v_novo_saldo + v_novo_saldo_bonus, 2),
    'saldo', v_novo_saldo,
    'saldo_bonus', v_novo_saldo_bonus,
    'saldo_anterior', ROUND(v_saldo + v_saldo_bonus, 2),
    'usuario_id', v_usuario_id,
    'transacao_id', v_inserted_id
  );
EXCEPTION
  WHEN raise_exception THEN
    IF SQLERRM = 'INSUFFICIENT_USER_FUNDS' THEN
      RETURN json_build_object(
        'ok', false,
        'error', 'INSUFFICIENT_USER_FUNDS',
        'balance', ROUND(COALESCE(v_saldo, 0) + COALESCE(v_saldo_bonus, 0), 2)
      );
    END IF;
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.processar_callback_playfiver(TEXT, TEXT, NUMERIC, NUMERIC, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.processar_callback_playfiver(TEXT, TEXT, NUMERIC, NUMERIC, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.processar_callback_playfiver(TEXT, TEXT, NUMERIC, NUMERIC, TEXT) TO service_role;

COMMENT ON FUNCTION public.processar_callback_playfiver(TEXT, TEXT, NUMERIC, NUMERIC, TEXT) IS
  'PlayFiver: saldo jogável = saldo + saldo_bonus; apostas usam bônus primeiro.';
