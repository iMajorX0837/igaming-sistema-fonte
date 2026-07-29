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

