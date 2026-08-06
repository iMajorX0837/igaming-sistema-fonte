-- =============================================================================
-- Patch C5 (+ H2) — Callback PlayFiver atômico (anti double-spend)
-- Execute no SQL Editor do Supabase.
--
-- - INSERT txn_id + UPDATE saldo na mesma transação
-- - ON CONFLICT (txn_id) = idempotente (não credita de novo)
-- - Saldo sempre = saldo_db + win - bet (ignora user_after_balance no app)
-- GRANT só service_role (API).
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
  v_novo_saldo NUMERIC;
  v_debit NUMERIC;
  v_inserted_id UUID;
  v_jogo TEXT;
  v_tipo TEXT;
  v_owner UUID;
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

  -- Trava o usuário (serializa callbacks concorrentes)
  SELECT id, COALESCE(saldo, 0)
  INTO v_usuario_id, v_saldo
  FROM public.usuarios
  WHERE lower(trim(email)) = v_email
  LIMIT 1
  FOR UPDATE;

  IF v_usuario_id IS NULL THEN
    SELECT id, COALESCE(saldo, 0)
    INTO v_usuario_id, v_saldo
    FROM public.usuarios
    WHERE email ILIKE v_email
    LIMIT 1
    FOR UPDATE;
  END IF;

  IF v_usuario_id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'INVALID_USER', 'balance', 0);
  END IF;

  -- 1) Claim idempotente ANTES do débito (retry não pode falhar por saldo)
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
    'Não',
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
        'balance', ROUND(v_saldo, 2)
      );
    END IF;

    SELECT COALESCE(saldo, 0) INTO v_saldo
    FROM public.usuarios
    WHERE id = v_usuario_id;

    RETURN json_build_object(
      'ok', true,
      'duplicate', true,
      'balance', ROUND(v_saldo, 2),
      'usuario_id', v_usuario_id
    );
  END IF;

  -- 2) Só quem ganhou o claim aplica saldo
  v_debit := GREATEST(0, ROUND(v_bet - v_win, 2));
  v_novo_saldo := ROUND(v_saldo + v_win - v_bet, 2);

  IF (v_debit > 0 AND v_saldo + 0.000001 < v_debit) OR v_novo_saldo < 0 THEN
    -- Rollback do INSERT (+ trigger de rollover) via subtransação
    RAISE EXCEPTION 'INSUFFICIENT_USER_FUNDS' USING ERRCODE = 'P0001';
  END IF;

  PERFORM set_config('app.skip_usuario_guard', 'true', true);

  UPDATE public.usuarios
  SET saldo = v_novo_saldo,
      updated_at = NOW()
  WHERE id = v_usuario_id;

  RETURN json_build_object(
    'ok', true,
    'duplicate', false,
    'balance', v_novo_saldo,
    'saldo_anterior', ROUND(v_saldo, 2),
    'usuario_id', v_usuario_id,
    'transacao_id', v_inserted_id
  );
EXCEPTION
  WHEN raise_exception THEN
    IF SQLERRM = 'INSUFFICIENT_USER_FUNDS' THEN
      RETURN json_build_object(
        'ok', false,
        'error', 'INSUFFICIENT_USER_FUNDS',
        'balance', ROUND(COALESCE(v_saldo, 0), 2)
      );
    END IF;
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.processar_callback_playfiver(TEXT, TEXT, NUMERIC, NUMERIC, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.processar_callback_playfiver(TEXT, TEXT, NUMERIC, NUMERIC, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.processar_callback_playfiver(TEXT, TEXT, NUMERIC, NUMERIC, TEXT) TO service_role;

COMMENT ON FUNCTION public.processar_callback_playfiver(TEXT, TEXT, NUMERIC, NUMERIC, TEXT) IS
  'C5: aplica bet/win do webhook PlayFiver com idempotencia por txn_id (service_role only).';
