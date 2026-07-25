-- =============================================================================
-- Patch H3 — Aviator wallet atômico (anti race / double credit)
-- Execute no SQL Editor do Supabase.
--
-- debit/credit/refund: FOR UPDATE + saldo atômico
-- credit/refund/perda: idempotência por txn_id (ON CONFLICT)
-- GRANT só service_role (API Aviator).
-- =============================================================================

CREATE OR REPLACE FUNCTION public._aviator_resolve_usuario(p_email TEXT)
RETURNS TABLE (usuario_id UUID, saldo NUMERIC)
LANGUAGE plpgsql
AS $$
DECLARE
  v_email TEXT;
BEGIN
  v_email := lower(trim(COALESCE(p_email, '')));
  IF v_email = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT u.id, COALESCE(u.saldo, 0)
  FROM public.usuarios u
  WHERE lower(trim(u.email)) = v_email
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT u.id, COALESCE(u.saldo, 0)
  FROM public.usuarios u
  WHERE u.email ILIKE v_email
  LIMIT 1
  FOR UPDATE;
END;
$$;

CREATE OR REPLACE FUNCTION public.aviator_debit_saldo(
  p_email TEXT,
  p_valor NUMERIC,
  p_txn_id TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario_id UUID;
  v_saldo NUMERIC;
  v_valor NUMERIC;
  v_txn TEXT;
  v_novo NUMERIC;
  v_inserted UUID;
  v_owner UUID;
BEGIN
  v_valor := ROUND(COALESCE(p_valor, 0)::numeric, 2);
  v_txn := NULLIF(trim(COALESCE(p_txn_id, '')), '');

  IF v_valor <= 0 THEN
    RETURN json_build_object('ok', false, 'error', 'INVALID_AMOUNT', 'balance', 0);
  END IF;

  SELECT r.usuario_id, r.saldo
  INTO v_usuario_id, v_saldo
  FROM public._aviator_resolve_usuario(p_email) r;

  IF v_usuario_id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'INVALID_USER', 'balance', 0);
  END IF;

  IF v_txn IS NOT NULL THEN
    INSERT INTO public.transacoes_jogos (
      usuario_id, txn_id, tipo, jogo, valor, retorno, status, com_bonus, data
    )
    VALUES (
      v_usuario_id, v_txn, 'Perdeu', 'Aviator', 0, 0, 'Finalizado', 'Não',
      TIMEZONE('utc'::text, NOW())
    )
    ON CONFLICT (txn_id) DO NOTHING
    RETURNING id INTO v_inserted;

    IF v_inserted IS NULL THEN
      SELECT usuario_id INTO v_owner
      FROM public.transacoes_jogos
      WHERE txn_id = v_txn
      LIMIT 1;

      IF v_owner IS DISTINCT FROM v_usuario_id THEN
        RETURN json_build_object('ok', false, 'error', 'TXN_OWNER_MISMATCH', 'balance', ROUND(v_saldo, 2));
      END IF;

      SELECT COALESCE(saldo, 0) INTO v_saldo FROM public.usuarios WHERE id = v_usuario_id;
      RETURN json_build_object(
        'ok', true, 'duplicate', true,
        'balance', ROUND(v_saldo, 2),
        'usuario_id', v_usuario_id
      );
    END IF;
  END IF;

  IF v_saldo + 0.000001 < v_valor THEN
    IF v_txn IS NOT NULL THEN
      DELETE FROM public.transacoes_jogos WHERE txn_id = v_txn AND valor = 0;
    END IF;
    RETURN json_build_object(
      'ok', false, 'error', 'INSUFFICIENT_FUNDS',
      'balance', ROUND(v_saldo, 2)
    );
  END IF;

  v_novo := ROUND(v_saldo - v_valor, 2);

  PERFORM set_config('app.skip_usuario_guard', 'true', true);
  UPDATE public.usuarios
  SET saldo = v_novo, updated_at = NOW()
  WHERE id = v_usuario_id;

  RETURN json_build_object(
    'ok', true, 'duplicate', false,
    'balance', v_novo,
    'saldo_anterior', ROUND(v_saldo, 2),
    'usuario_id', v_usuario_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.aviator_creditar_saldo(
  p_email TEXT,
  p_valor NUMERIC,
  p_txn_id TEXT,
  p_bet_valor NUMERIC DEFAULT 0,
  p_tipo TEXT DEFAULT 'Ganhou'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario_id UUID;
  v_saldo NUMERIC;
  v_valor NUMERIC;
  v_bet NUMERIC;
  v_txn TEXT;
  v_tipo TEXT;
  v_novo NUMERIC;
  v_inserted UUID;
  v_owner UUID;
BEGIN
  v_valor := ROUND(COALESCE(p_valor, 0)::numeric, 2);
  v_bet := ROUND(COALESCE(p_bet_valor, 0)::numeric, 2);
  v_txn := trim(COALESCE(p_txn_id, ''));
  v_tipo := CASE WHEN lower(trim(COALESCE(p_tipo, ''))) = 'perdeu' THEN 'Perdeu' ELSE 'Ganhou' END;

  IF v_valor <= 0 OR v_txn = '' THEN
    RETURN json_build_object('ok', false, 'error', 'INVALID_AMOUNT', 'balance', 0);
  END IF;

  SELECT r.usuario_id, r.saldo
  INTO v_usuario_id, v_saldo
  FROM public._aviator_resolve_usuario(p_email) r;

  IF v_usuario_id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'INVALID_USER', 'balance', 0);
  END IF;

  INSERT INTO public.transacoes_jogos (
    usuario_id, txn_id, tipo, jogo, valor, retorno, status, com_bonus, data
  )
  VALUES (
    v_usuario_id, v_txn, v_tipo, 'Aviator', v_bet,
    CASE WHEN v_tipo = 'Ganhou' THEN v_valor ELSE 0 END,
    'Finalizado', 'Não', TIMEZONE('utc'::text, NOW())
  )
  ON CONFLICT (txn_id) DO NOTHING
  RETURNING id INTO v_inserted;

  IF v_inserted IS NULL THEN
    SELECT usuario_id INTO v_owner
    FROM public.transacoes_jogos
    WHERE txn_id = v_txn
    LIMIT 1;

    IF v_owner IS DISTINCT FROM v_usuario_id THEN
      RETURN json_build_object('ok', false, 'error', 'TXN_OWNER_MISMATCH', 'balance', ROUND(v_saldo, 2));
    END IF;

    SELECT COALESCE(saldo, 0) INTO v_saldo FROM public.usuarios WHERE id = v_usuario_id;
    RETURN json_build_object(
      'ok', true, 'duplicate', true,
      'balance', ROUND(v_saldo, 2),
      'usuario_id', v_usuario_id
    );
  END IF;

  v_novo := ROUND(v_saldo + v_valor, 2);

  PERFORM set_config('app.skip_usuario_guard', 'true', true);
  UPDATE public.usuarios
  SET saldo = v_novo, updated_at = NOW()
  WHERE id = v_usuario_id;

  RETURN json_build_object(
    'ok', true, 'duplicate', false,
    'balance', v_novo,
    'saldo_anterior', ROUND(v_saldo, 2),
    'usuario_id', v_usuario_id,
    'transacao_id', v_inserted
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.aviator_reembolsar_saldo(
  p_email TEXT,
  p_valor NUMERIC,
  p_txn_id TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.aviator_creditar_saldo(p_email, p_valor, p_txn_id, 0, 'Ganhou');
END;
$$;

CREATE OR REPLACE FUNCTION public.aviator_registrar_perda(
  p_email TEXT,
  p_txn_id TEXT,
  p_bet_valor NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario_id UUID;
  v_saldo NUMERIC;
  v_bet NUMERIC;
  v_txn TEXT;
  v_inserted UUID;
  v_owner UUID;
BEGIN
  v_bet := ROUND(COALESCE(p_bet_valor, 0)::numeric, 2);
  v_txn := trim(COALESCE(p_txn_id, ''));

  IF v_bet <= 0 OR v_txn = '' THEN
    RETURN json_build_object('ok', false, 'error', 'INVALID_AMOUNT');
  END IF;

  SELECT r.usuario_id, r.saldo
  INTO v_usuario_id, v_saldo
  FROM public._aviator_resolve_usuario(p_email) r;

  IF v_usuario_id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'INVALID_USER');
  END IF;

  INSERT INTO public.transacoes_jogos (
    usuario_id, txn_id, tipo, jogo, valor, retorno, status, com_bonus, data
  )
  VALUES (
    v_usuario_id, v_txn, 'Perdeu', 'Aviator', v_bet, 0,
    'Finalizado', 'Não', TIMEZONE('utc'::text, NOW())
  )
  ON CONFLICT (txn_id) DO NOTHING
  RETURNING id INTO v_inserted;

  IF v_inserted IS NULL THEN
    SELECT usuario_id INTO v_owner
    FROM public.transacoes_jogos
    WHERE txn_id = v_txn
    LIMIT 1;

    IF v_owner IS DISTINCT FROM v_usuario_id THEN
      RETURN json_build_object('ok', false, 'error', 'TXN_OWNER_MISMATCH');
    END IF;

    RETURN json_build_object('ok', true, 'duplicate', true, 'usuario_id', v_usuario_id);
  END IF;

  RETURN json_build_object(
    'ok', true, 'duplicate', false,
    'usuario_id', v_usuario_id,
    'transacao_id', v_inserted
  );
END;
$$;

REVOKE ALL ON FUNCTION public._aviator_resolve_usuario(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.aviator_debit_saldo(TEXT, NUMERIC, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.aviator_creditar_saldo(TEXT, NUMERIC, TEXT, NUMERIC, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.aviator_reembolsar_saldo(TEXT, NUMERIC, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.aviator_registrar_perda(TEXT, TEXT, NUMERIC) FROM PUBLIC;

REVOKE ALL ON FUNCTION public._aviator_resolve_usuario(TEXT) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.aviator_debit_saldo(TEXT, NUMERIC, TEXT) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.aviator_creditar_saldo(TEXT, NUMERIC, TEXT, NUMERIC, TEXT) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.aviator_reembolsar_saldo(TEXT, NUMERIC, TEXT) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.aviator_registrar_perda(TEXT, TEXT, NUMERIC) FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION public._aviator_resolve_usuario(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.aviator_debit_saldo(TEXT, NUMERIC, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.aviator_creditar_saldo(TEXT, NUMERIC, TEXT, NUMERIC, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.aviator_reembolsar_saldo(TEXT, NUMERIC, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.aviator_registrar_perda(TEXT, TEXT, NUMERIC) TO service_role;

COMMENT ON FUNCTION public.aviator_debit_saldo(TEXT, NUMERIC, TEXT) IS
  'H3: débito Aviator atômico com idempotência opcional por txn_id (service_role).';
