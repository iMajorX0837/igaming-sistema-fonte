-- =============================================================================
-- Patch — Carteira ativa (R$ / B$) escolhida no header
-- Execute após patch_bonus_saldo_jogavel.sql
--
-- - usuarios.carteira_ativa: 'real' | 'bonus'
-- - PlayFivers e Aviator usam só a carteira selecionada
-- - Ganhos de rodadas grátis continuam indo para saldo_bonus
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

-- Proteção C2 — carteira_ativa
CREATE OR REPLACE FUNCTION public.protect_usuario_sensitive_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('app.skip_usuario_guard', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
    RETURN NEW;
  END IF;

  IF NEW.saldo IS DISTINCT FROM OLD.saldo THEN
    RAISE EXCEPTION 'Alteracao de saldo nao permitida';
  END IF;

  IF NEW.saldo_bonus IS DISTINCT FROM OLD.saldo_bonus THEN
    RAISE EXCEPTION 'Alteracao de saldo bonus nao permitida';
  END IF;

  IF NEW.carteira_ativa IS DISTINCT FROM OLD.carteira_ativa THEN
    RAISE EXCEPTION 'Alteracao de carteira ativa nao permitida';
  END IF;

  IF NEW.cargo IS DISTINCT FROM OLD.cargo THEN
    RAISE EXCEPTION 'Alteracao de cargo nao permitida';
  END IF;

  IF NEW.vip_nivel IS DISTINCT FROM OLD.vip_nivel THEN
    RAISE EXCEPTION 'Alteracao de VIP nao permitida';
  END IF;

  IF NEW.total_depositado IS DISTINCT FROM OLD.total_depositado THEN
    RAISE EXCEPTION 'Alteracao de total depositado nao permitida';
  END IF;

  IF NEW.two_factor_enabled IS DISTINCT FROM OLD.two_factor_enabled THEN
    RAISE EXCEPTION 'Alteracao de 2FA nao permitida';
  END IF;

  IF NEW.totp_secret IS DISTINCT FROM OLD.totp_secret THEN
    RAISE EXCEPTION 'Alteracao de 2FA nao permitida';
  END IF;

  IF NEW.totp_pending_secret IS DISTINCT FROM OLD.totp_pending_secret THEN
    RAISE EXCEPTION 'Alteracao de 2FA nao permitida';
  END IF;

  IF NEW.rollover_pendente IS DISTINCT FROM OLD.rollover_pendente THEN
    RAISE EXCEPTION 'Alteracao de rollover nao permitida';
  END IF;

  IF NEW.rollover_meta IS DISTINCT FROM OLD.rollover_meta THEN
    RAISE EXCEPTION 'Alteracao de rollover nao permitida';
  END IF;

  IF NEW.rollover_inicio IS DISTINCT FROM OLD.rollover_inicio THEN
    RAISE EXCEPTION 'Alteracao de rollover nao permitida';
  END IF;

  IF NEW.rollover_bonus_pendente IS DISTINCT FROM OLD.rollover_bonus_pendente THEN
    RAISE EXCEPTION 'Alteracao de rollover bonus nao permitida';
  END IF;

  IF NEW.indicacao_recompensa_custom IS DISTINCT FROM OLD.indicacao_recompensa_custom THEN
    RAISE EXCEPTION 'Alteracao de indicacao nao permitida';
  END IF;

  IF NEW.indicacao_deposito_minimo_custom IS DISTINCT FROM OLD.indicacao_deposito_minimo_custom THEN
    RAISE EXCEPTION 'Alteracao de indicacao nao permitida';
  END IF;

  IF NEW.indicacao_recompensa_paga IS DISTINCT FROM OLD.indicacao_recompensa_paga THEN
    RAISE EXCEPTION 'Alteracao de indicacao nao permitida';
  END IF;

  IF NEW.indicacao_recompensa_valor_pago IS DISTINCT FROM OLD.indicacao_recompensa_valor_pago THEN
    RAISE EXCEPTION 'Alteracao de indicacao nao permitida';
  END IF;

  IF NEW.indicado_por IS DISTINCT FROM OLD.indicado_por THEN
    RAISE EXCEPTION 'Alteracao de indicacao nao permitida';
  END IF;

  IF NEW.link_indicação IS DISTINCT FROM OLD.link_indicação THEN
    RAISE EXCEPTION 'Alteracao de link de indicacao nao permitida';
  END IF;

  IF NEW.ativo IS DISTINCT FROM OLD.ativo THEN
    RAISE EXCEPTION 'Alteracao de status nao permitida';
  END IF;

  IF NEW.verificado IS DISTINCT FROM OLD.verificado THEN
    RAISE EXCEPTION 'Alteracao de verificacao nao permitida';
  END IF;

  IF NEW.kyc_status IS DISTINCT FROM OLD.kyc_status THEN
    RAISE EXCEPTION 'Alteracao de KYC nao permitida';
  END IF;

  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Alteracao de email nao permitida';
  END IF;

  IF NEW.cpf IS DISTINCT FROM OLD.cpf THEN
    RAISE EXCEPTION 'Alteracao de CPF nao permitida';
  END IF;

  IF NEW.playfiver_user_code IS DISTINCT FROM OLD.playfiver_user_code THEN
    RAISE EXCEPTION 'Alteracao de codigo de jogo nao permitida';
  END IF;

  RETURN NEW;
END;
$$;

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

  RETURN FALSE;
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
-- PlayFivers — respeita carteira_ativa
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

  v_usa_bonus := public._carteira_usa_bonus(v_carteira);
  v_saldo_jogavel := public._saldo_jogavel_carteira(v_saldo, v_saldo_bonus, v_carteira);
  v_eh_giros_gratis := public._ganho_eh_de_giros_gratis(v_usuario_id, v_bet, v_win);

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

  -- Ganhos de rodadas grátis sempre vão para B$
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
      'carteira_ativa', v_carteira,
      'saldo_anterior', v_saldo_jogavel,
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
    'saldo_anterior', v_saldo_jogavel,
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

-- =============================================================================
-- Aviator — respeita carteira_ativa
-- (DROP necessário: RETURN TABLE de _aviator_resolve_usuario mudou)
-- =============================================================================
DROP FUNCTION IF EXISTS public.aviator_registrar_perda(TEXT, TEXT, NUMERIC);
DROP FUNCTION IF EXISTS public.aviator_reembolsar_saldo(TEXT, NUMERIC, TEXT);
DROP FUNCTION IF EXISTS public.aviator_creditar_saldo(TEXT, NUMERIC, TEXT, NUMERIC, TEXT);
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

  v_novo_jogavel := public._saldo_jogavel_carteira(v_saldo, v_saldo_bonus, v_carteira);

  RETURN json_build_object(
    'ok', true, 'duplicate', false,
    'balance', v_novo_jogavel,
    'saldo_anterior', ROUND(v_jogavel, 2),
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

  -- Mesma carteira usada no débito da aposta (_bet), não carteira_ativa atual
  v_usa_bonus := public._aviator_usa_bonus_aposta(v_usuario_id, v_txn, NULL);
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
    'carteira_ativa', v_carteira,
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
  v_saldo_bonus NUMERIC;
  v_carteira TEXT;
  v_bet NUMERIC;
  v_txn TEXT;
  v_inserted UUID;
  v_owner UUID;
  v_com_bonus TEXT;
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

  v_com_bonus := CASE WHEN public._carteira_usa_bonus(v_carteira) THEN 'Sim' ELSE 'Não' END;

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
    'carteira_ativa', v_carteira
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

COMMENT ON FUNCTION public.processar_callback_playfiver(TEXT, TEXT, NUMERIC, NUMERIC, TEXT) IS
  'PlayFiver: usa carteira_ativa (real=saldo, bonus=saldo_bonus). Rodadas grátis creditam B$.';
COMMENT ON FUNCTION public.definir_carteira_ativa(TEXT) IS
  'Define carteira ativa do jogador (real ou bonus), sincronizada com o header.';
