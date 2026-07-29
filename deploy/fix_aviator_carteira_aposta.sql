-- =============================================================================
-- Fix v2 — Aviator: ganho/reembolso SEMPRE na mesma carteira da aposta (R$ / B$)
--
-- Execute TODO este arquivo no SQL Editor do Supabase.
-- Autossuficiente: cria helpers se não existirem e recria funções Aviator.
-- =============================================================================

-- Helpers (idempotentes)
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

CREATE OR REPLACE FUNCTION public._aviator_bet_txn_id(p_txn_id TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN COALESCE(p_txn_id, '') ~ '_(win|refund|crash)$'
      THEN regexp_replace(p_txn_id, '_(win|refund|crash)$', '_bet')
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public._aviator_com_bonus_eh_sim(p_com_bonus TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(trim(COALESCE(p_com_bonus, ''))) IN ('sim', 's', 'true', '1', 'yes');
$$;

CREATE OR REPLACE FUNCTION public._aviator_usa_bonus_aposta(
  p_usuario_id UUID,
  p_txn_id TEXT,
  p_usa_bonus_forcado BOOLEAN DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_bet_txn TEXT;
  v_com_bonus TEXT;
BEGIN
  IF p_usa_bonus_forcado IS NOT NULL THEN
    RETURN p_usa_bonus_forcado;
  END IF;

  v_bet_txn := public._aviator_bet_txn_id(p_txn_id);

  IF v_bet_txn IS NOT NULL THEN
    SELECT t.com_bonus
    INTO v_com_bonus
    FROM public.transacoes_jogos t
    WHERE t.txn_id = v_bet_txn
    LIMIT 1;

    IF v_com_bonus IS NOT NULL THEN
      RETURN public._aviator_com_bonus_eh_sim(v_com_bonus);
    END IF;
  END IF;

  -- Seguro: sem txn _bet, assume R$ (evita jogar ganho real em B$)
  RETURN FALSE;
END;
$$;

DROP FUNCTION IF EXISTS public.aviator_registrar_perda(TEXT, TEXT, NUMERIC);
DROP FUNCTION IF EXISTS public.aviator_reembolsar_saldo(TEXT, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS public.aviator_reembolsar_saldo(TEXT, NUMERIC, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS public.aviator_creditar_saldo(TEXT, NUMERIC, TEXT, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS public.aviator_creditar_saldo(TEXT, NUMERIC, TEXT, NUMERIC, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS public.aviator_debit_saldo(TEXT, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS public._aviator_resolve_usuario(TEXT);

CREATE OR REPLACE FUNCTION public._aviator_resolve_usuario(p_email TEXT)
RETURNS TABLE (
  usuario_id UUID,
  saldo NUMERIC,
  saldo_bonus NUMERIC,
  carteira_ativa TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
BEGIN
  v_email := lower(trim(COALESCE(p_email, '')));
  IF v_email = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT u.id, COALESCE(u.saldo, 0), COALESCE(u.saldo_bonus, 0), COALESCE(u.carteira_ativa, 'real')
  FROM public.usuarios u
  WHERE lower(trim(u.email)) = v_email
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT u.id, COALESCE(u.saldo, 0), COALESCE(u.saldo_bonus, 0), COALESCE(u.carteira_ativa, 'real')
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
  v_saldo_bonus NUMERIC;
  v_carteira TEXT;
  v_usa_bonus BOOLEAN;
  v_valor NUMERIC;
  v_txn TEXT;
  v_jogavel NUMERIC;
  v_novo_jogavel NUMERIC;
  v_inserted UUID;
  v_owner UUID;
  v_com_bonus TEXT;
BEGIN
  v_valor := ROUND(COALESCE(p_valor, 0)::numeric, 2);
  v_txn := NULLIF(trim(COALESCE(p_txn_id, '')), '');

  IF v_valor <= 0 THEN
    RETURN json_build_object('ok', false, 'error', 'INVALID_AMOUNT', 'balance', 0);
  END IF;

  SELECT r.usuario_id, r.saldo, r.saldo_bonus, r.carteira_ativa
  INTO v_usuario_id, v_saldo, v_saldo_bonus, v_carteira
  FROM public._aviator_resolve_usuario(p_email) r;

  IF v_usuario_id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'INVALID_USER', 'balance', 0);
  END IF;

  v_usa_bonus := public._carteira_usa_bonus(v_carteira);
  v_jogavel := public._saldo_jogavel_carteira(v_saldo, v_saldo_bonus, v_carteira);
  v_com_bonus := CASE WHEN v_usa_bonus THEN 'Sim' ELSE 'Não' END;

  IF v_txn IS NOT NULL THEN
    INSERT INTO public.transacoes_jogos (
      usuario_id, txn_id, tipo, jogo, valor, retorno, status, com_bonus, data
    )
    VALUES (
      v_usuario_id, v_txn, 'Perdeu', 'Aviator', 0, 0, 'Finalizado', v_com_bonus,
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
        RETURN json_build_object('ok', false, 'error', 'TXN_OWNER_MISMATCH', 'balance', ROUND(v_jogavel, 2));
      END IF;

      SELECT COALESCE(saldo, 0), COALESCE(saldo_bonus, 0), COALESCE(carteira_ativa, 'real')
      INTO v_saldo, v_saldo_bonus, v_carteira
      FROM public.usuarios
      WHERE id = v_usuario_id;

      RETURN json_build_object(
        'ok', true, 'duplicate', true,
        'balance', public._saldo_jogavel_carteira(v_saldo, v_saldo_bonus, v_carteira),
        'carteira_aposta', CASE WHEN public._carteira_usa_bonus(v_carteira) THEN 'bonus' ELSE 'real' END,
        'usuario_id', v_usuario_id
      );
    END IF;
  END IF;

  IF v_jogavel + 0.000001 < v_valor THEN
    IF v_txn IS NOT NULL THEN
      DELETE FROM public.transacoes_jogos WHERE txn_id = v_txn AND valor = 0;
    END IF;
    RETURN json_build_object(
      'ok', false, 'error', 'INSUFFICIENT_FUNDS',
      'balance', ROUND(v_jogavel, 2)
    );
  END IF;

  PERFORM set_config('app.skip_usuario_guard', 'true', true);

  IF v_usa_bonus THEN
    UPDATE public.usuarios
    SET saldo_bonus = ROUND(v_saldo_bonus - v_valor, 2), updated_at = NOW()
    WHERE id = v_usuario_id
    RETURNING saldo, saldo_bonus, carteira_ativa
    INTO v_saldo, v_saldo_bonus, v_carteira;
  ELSE
    UPDATE public.usuarios
    SET saldo = ROUND(v_saldo - v_valor, 2), updated_at = NOW()
    WHERE id = v_usuario_id
    RETURNING saldo, saldo_bonus, carteira_ativa
    INTO v_saldo, v_saldo_bonus, v_carteira;
  END IF;

  -- Garante com_bonus alinhado à carteira realmente debitada
  IF v_txn IS NOT NULL THEN
    UPDATE public.transacoes_jogos
    SET com_bonus = v_com_bonus
    WHERE txn_id = v_txn AND usuario_id = v_usuario_id;
  END IF;

  v_novo_jogavel := public._saldo_jogavel_carteira(v_saldo, v_saldo_bonus, v_carteira);

  RETURN json_build_object(
    'ok', true, 'duplicate', false,
    'balance', v_novo_jogavel,
    'saldo_anterior', ROUND(v_jogavel, 2),
    'carteira_aposta', CASE WHEN v_usa_bonus THEN 'bonus' ELSE 'real' END,
    'usa_bonus', v_usa_bonus,
    'carteira_ativa', v_carteira,
    'usuario_id', v_usuario_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.aviator_creditar_saldo(
  p_email TEXT,
  p_valor NUMERIC,
  p_txn_id TEXT,
  p_bet_valor NUMERIC DEFAULT 0,
  p_tipo TEXT DEFAULT 'Ganhou',
  p_usa_bonus BOOLEAN DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario_id UUID;
  v_saldo NUMERIC;
  v_saldo_bonus NUMERIC;
  v_carteira TEXT;
  v_usa_bonus BOOLEAN;
  v_valor NUMERIC;
  v_bet NUMERIC;
  v_txn TEXT;
  v_tipo TEXT;
  v_jogavel NUMERIC;
  v_inserted UUID;
  v_owner UUID;
  v_com_bonus TEXT;
BEGIN
  v_valor := ROUND(COALESCE(p_valor, 0)::numeric, 2);
  v_bet := ROUND(COALESCE(p_bet_valor, 0)::numeric, 2);
  v_txn := trim(COALESCE(p_txn_id, ''));
  v_tipo := CASE WHEN lower(trim(COALESCE(p_tipo, ''))) = 'perdeu' THEN 'Perdeu' ELSE 'Ganhou' END;

  IF v_valor <= 0 OR v_txn = '' THEN
    RETURN json_build_object('ok', false, 'error', 'INVALID_AMOUNT', 'balance', 0);
  END IF;

  SELECT r.usuario_id, r.saldo, r.saldo_bonus, r.carteira_ativa
  INTO v_usuario_id, v_saldo, v_saldo_bonus, v_carteira
  FROM public._aviator_resolve_usuario(p_email) r;

  IF v_usuario_id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'INVALID_USER', 'balance', 0);
  END IF;

  v_usa_bonus := public._aviator_usa_bonus_aposta(v_usuario_id, v_txn, p_usa_bonus);
  v_com_bonus := CASE WHEN v_usa_bonus THEN 'Sim' ELSE 'Não' END;

  INSERT INTO public.transacoes_jogos (
    usuario_id, txn_id, tipo, jogo, valor, retorno, status, com_bonus, data
  )
  VALUES (
    v_usuario_id, v_txn, v_tipo, 'Aviator', v_bet,
    CASE WHEN v_tipo = 'Ganhou' THEN v_valor ELSE 0 END,
    'Finalizado', v_com_bonus, TIMEZONE('utc'::text, NOW())
  )
  ON CONFLICT (txn_id) DO NOTHING
  RETURNING id INTO v_inserted;

  IF v_inserted IS NULL THEN
    SELECT usuario_id INTO v_owner
    FROM public.transacoes_jogos
    WHERE txn_id = v_txn
    LIMIT 1;

    IF v_owner IS DISTINCT FROM v_usuario_id THEN
      RETURN json_build_object(
        'ok', false, 'error', 'TXN_OWNER_MISMATCH',
        'balance', public._saldo_jogavel_carteira(v_saldo, v_saldo_bonus, v_carteira)
      );
    END IF;

    SELECT COALESCE(saldo, 0), COALESCE(saldo_bonus, 0), COALESCE(carteira_ativa, 'real')
    INTO v_saldo, v_saldo_bonus, v_carteira
    FROM public.usuarios
    WHERE id = v_usuario_id;

    RETURN json_build_object(
      'ok', true, 'duplicate', true,
      'balance', public._saldo_jogavel_carteira(v_saldo, v_saldo_bonus, v_carteira),
      'usuario_id', v_usuario_id
    );
  END IF;

  PERFORM set_config('app.skip_usuario_guard', 'true', true);

  IF v_usa_bonus THEN
    UPDATE public.usuarios
    SET saldo_bonus = ROUND(v_saldo_bonus + v_valor, 2), updated_at = NOW()
    WHERE id = v_usuario_id
    RETURNING saldo, saldo_bonus, carteira_ativa
    INTO v_saldo, v_saldo_bonus, v_carteira;
  ELSE
    UPDATE public.usuarios
    SET saldo = ROUND(v_saldo + v_valor, 2), updated_at = NOW()
    WHERE id = v_usuario_id
    RETURNING saldo, saldo_bonus, carteira_ativa
    INTO v_saldo, v_saldo_bonus, v_carteira;
  END IF;

  v_jogavel := public._saldo_jogavel_carteira(v_saldo, v_saldo_bonus, v_carteira);

  RETURN json_build_object(
    'ok', true, 'duplicate', false,
    'balance', v_jogavel,
    'saldo_anterior', ROUND(v_jogavel - v_valor, 2),
    'carteira_aposta', CASE WHEN v_usa_bonus THEN 'bonus' ELSE 'real' END,
    'usa_bonus', v_usa_bonus,
    'carteira_ativa', v_carteira,
    'usuario_id', v_usuario_id,
    'transacao_id', v_inserted
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.aviator_reembolsar_saldo(
  p_email TEXT,
  p_valor NUMERIC,
  p_txn_id TEXT,
  p_usa_bonus BOOLEAN DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.aviator_creditar_saldo(p_email, p_valor, p_txn_id, 0, 'Ganhou', p_usa_bonus);
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
  v_saldo_bonus NUMERIC;
  v_carteira TEXT;
  v_bet NUMERIC;
  v_txn TEXT;
  v_inserted UUID;
  v_owner UUID;
  v_com_bonus TEXT;
  v_usa_bonus BOOLEAN;
BEGIN
  v_bet := ROUND(COALESCE(p_bet_valor, 0)::numeric, 2);
  v_txn := trim(COALESCE(p_txn_id, ''));

  IF v_bet <= 0 OR v_txn = '' THEN
    RETURN json_build_object('ok', false, 'error', 'INVALID_AMOUNT');
  END IF;

  SELECT r.usuario_id, r.saldo, r.saldo_bonus, r.carteira_ativa
  INTO v_usuario_id, v_saldo, v_saldo_bonus, v_carteira
  FROM public._aviator_resolve_usuario(p_email) r;

  IF v_usuario_id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'INVALID_USER');
  END IF;

  v_usa_bonus := public._aviator_usa_bonus_aposta(v_usuario_id, v_txn, NULL);
  v_com_bonus := CASE WHEN v_usa_bonus THEN 'Sim' ELSE 'Não' END;

  INSERT INTO public.transacoes_jogos (
    usuario_id, txn_id, tipo, jogo, valor, retorno, status, com_bonus, data
  )
  VALUES (
    v_usuario_id, v_txn, 'Perdeu', 'Aviator', v_bet, 0,
    'Finalizado', v_com_bonus, TIMEZONE('utc'::text, NOW())
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
    'transacao_id', v_inserted,
    'carteira_aposta', CASE WHEN v_usa_bonus THEN 'bonus' ELSE 'real' END,
    'carteira_ativa', v_carteira
  );
END;
$$;

REVOKE ALL ON FUNCTION public._aviator_resolve_usuario(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.aviator_debit_saldo(TEXT, NUMERIC, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.aviator_creditar_saldo(TEXT, NUMERIC, TEXT, NUMERIC, TEXT, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.aviator_reembolsar_saldo(TEXT, NUMERIC, TEXT, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.aviator_registrar_perda(TEXT, TEXT, NUMERIC) FROM PUBLIC;

REVOKE ALL ON FUNCTION public._aviator_resolve_usuario(TEXT) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.aviator_debit_saldo(TEXT, NUMERIC, TEXT) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.aviator_creditar_saldo(TEXT, NUMERIC, TEXT, NUMERIC, TEXT, BOOLEAN) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.aviator_reembolsar_saldo(TEXT, NUMERIC, TEXT, BOOLEAN) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.aviator_registrar_perda(TEXT, TEXT, NUMERIC) FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION public._aviator_resolve_usuario(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.aviator_debit_saldo(TEXT, NUMERIC, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.aviator_creditar_saldo(TEXT, NUMERIC, TEXT, NUMERIC, TEXT, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION public.aviator_reembolsar_saldo(TEXT, NUMERIC, TEXT, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION public.aviator_registrar_perda(TEXT, TEXT, NUMERIC) TO service_role;

COMMENT ON FUNCTION public.aviator_creditar_saldo(TEXT, NUMERIC, TEXT, NUMERIC, TEXT, BOOLEAN) IS
  'Aviator: credita ganho na carteira da aposta (_bet / p_usa_bonus). Fallback: R$.';
