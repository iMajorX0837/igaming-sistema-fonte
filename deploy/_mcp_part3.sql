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
