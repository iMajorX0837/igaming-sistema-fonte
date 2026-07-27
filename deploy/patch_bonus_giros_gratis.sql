-- =============================================================================
-- Patch — Bônus de rodadas grátis (giros_gratis) com rollover separado
-- Execute no SQL Editor do Supabase após os patches anteriores.
--
-- - Ganhos de giros grátis (roleta + cupons) vão para saldo_bonus
-- - Rollover de bônus separado do rollover de depósito (rollover_bonus_pendente)
-- - Multiplicador configurável em site_config.rollover_giros_gratis (padrão 5x)
-- - Conversão manual via RPC converter_bonus_saldo
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Colunas em usuarios e site_config
-- -----------------------------------------------------------------------------
ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS saldo_bonus NUMERIC(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS rollover_bonus_pendente NUMERIC(12, 2) NOT NULL DEFAULT 0;

ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS rollover_giros_gratis NUMERIC(8, 2) NOT NULL DEFAULT 5;

ALTER TABLE public.site_config
  DROP CONSTRAINT IF EXISTS site_config_rollover_giros_gratis_check;

ALTER TABLE public.site_config
  ADD CONSTRAINT site_config_rollover_giros_gratis_check
  CHECK (rollover_giros_gratis >= 0);

ALTER TABLE public.cupom_usos
  ADD COLUMN IF NOT EXISTS giros_ativado_em TIMESTAMPTZ;

COMMENT ON COLUMN public.usuarios.saldo_bonus IS
  'Saldo de bônus (ganhos de rodadas grátis) aguardando rollover para conversão.';
COMMENT ON COLUMN public.usuarios.rollover_bonus_pendente IS
  'Valor em apostas restante para liberar conversão do saldo_bonus (separado do rollover de depósito).';
COMMENT ON COLUMN public.site_config.rollover_giros_gratis IS
  'Multiplicador de rollover aplicado sobre ganhos de giros grátis (ex.: 5 = 5x).';
COMMENT ON COLUMN public.cupom_usos.giros_ativado_em IS
  'Momento em que as rodadas grátis foram ativadas na PlayFivers (status_giro = usado).';

-- -----------------------------------------------------------------------------
-- 2) Histórico de conversões de bônus
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bonus_conversoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  valor NUMERIC(12, 2) NOT NULL CHECK (valor > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_bonus_conversoes_usuario
  ON public.bonus_conversoes(usuario_id, created_at DESC);

ALTER TABLE public.bonus_conversoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuario ve proprias conversoes bonus" ON public.bonus_conversoes;
CREATE POLICY "Usuario ve proprias conversoes bonus"
  ON public.bonus_conversoes FOR SELECT
  USING (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Admin ve todas conversoes bonus" ON public.bonus_conversoes;
CREATE POLICY "Admin ve todas conversoes bonus"
  ON public.bonus_conversoes FOR SELECT
  USING (public.is_user_admin());

GRANT SELECT ON public.bonus_conversoes TO authenticated;

COMMENT ON TABLE public.bonus_conversoes IS
  'Histórico de conversões de saldo_bonus para saldo real.';

-- -----------------------------------------------------------------------------
-- 3) Proteção de colunas sensíveis (C2)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 4) Marca giros_ativado_em ao consumir cupom de rodadas
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_cupom_uso_giros_ativado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status_giro = 'usado'
     AND (OLD.status_giro IS NULL OR OLD.status_giro IS DISTINCT FROM 'usado') THEN
    NEW.giros_ativado_em := COALESCE(NEW.giros_ativado_em, TIMEZONE('utc'::text, NOW()));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cupom_uso_giros_ativado ON public.cupom_usos;
CREATE TRIGGER trg_cupom_uso_giros_ativado
  BEFORE UPDATE ON public.cupom_usos
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_cupom_uso_giros_ativado();

-- -----------------------------------------------------------------------------
-- 5) Detectar ganho de giros grátis
-- -----------------------------------------------------------------------------
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
      AND cu.status_giro = 'usado'
      AND cu.giros_ativado_em IS NOT NULL
      AND cu.giros_ativado_em > (TIMEZONE('utc'::text, NOW()) - INTERVAL '72 hours')
  );
END;
$$;

-- -----------------------------------------------------------------------------
-- 6) Rollover de bônus (giros grátis)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.aplicar_rollover_bonus_giro(
  p_usuario_id UUID,
  p_valor NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_multiplicador NUMERIC;
  v_incremento NUMERIC;
  v_novo_pendente NUMERIC;
BEGIN
  IF p_usuario_id IS NULL OR COALESCE(p_valor, 0) <= 0 THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(rollover_giros_gratis, 5)
  INTO v_multiplicador
  FROM public.site_config
  WHERE id = 1;

  v_multiplicador := COALESCE(v_multiplicador, 0);
  IF v_multiplicador <= 0 THEN
    RETURN 0;
  END IF;

  v_incremento := ROUND(p_valor * v_multiplicador, 2);

  PERFORM set_config('app.skip_usuario_guard', 'true', true);

  UPDATE public.usuarios
  SET rollover_bonus_pendente = COALESCE(rollover_bonus_pendente, 0) + v_incremento
  WHERE id = p_usuario_id
  RETURNING rollover_bonus_pendente INTO v_novo_pendente;

  RETURN COALESCE(v_novo_pendente, 0);
END;
$$;

-- Abate rollover de depósito e de bônus em apostas reais
CREATE OR REPLACE FUNCTION public.abater_rollover_aposta()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valor_aposta NUMERIC;
BEGIN
  v_valor_aposta := COALESCE(NEW.valor, 0);
  IF v_valor_aposta <= 0 OR NEW.usuario_id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM set_config('app.skip_usuario_guard', 'true', true);

  UPDATE public.usuarios
  SET
    rollover_pendente = GREATEST(0, COALESCE(rollover_pendente, 0) - v_valor_aposta),
    rollover_bonus_pendente = GREATEST(0, COALESCE(rollover_bonus_pendente, 0) - v_valor_aposta)
  WHERE id = NEW.usuario_id
    AND (
      COALESCE(rollover_pendente, 0) > 0
      OR COALESCE(rollover_bonus_pendente, 0) > 0
    );

  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 7) Webhook PlayFiver — creditar bônus em ganhos de giros grátis
-- -----------------------------------------------------------------------------
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
  v_debit NUMERIC;
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
  v_com_bonus := CASE WHEN v_eh_giros_gratis THEN 'Sim' ELSE 'Não' END;

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
      'balance', v_novo_saldo,
      'saldo_bonus', v_novo_saldo_bonus,
      'bonus_credit', true,
      'saldo_anterior', ROUND(v_saldo, 2),
      'usuario_id', v_usuario_id,
      'transacao_id', v_inserted_id
    );
  END IF;

  v_debit := GREATEST(0, ROUND(v_bet - v_win, 2));
  v_novo_saldo := ROUND(v_saldo + v_win - v_bet, 2);

  IF (v_debit > 0 AND v_saldo + 0.000001 < v_debit) OR v_novo_saldo < 0 THEN
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

-- -----------------------------------------------------------------------------
-- 8) RPCs para o front — consultar e converter bônus
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.obter_bonus_usuario()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_saldo_bonus NUMERIC;
  v_rollover_bonus NUMERIC;
  v_multiplicador NUMERIC;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT
    COALESCE(u.saldo_bonus, 0),
    COALESCE(u.rollover_bonus_pendente, 0)
  INTO v_saldo_bonus, v_rollover_bonus
  FROM public.usuarios u
  WHERE u.id = v_uid;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'user_not_found');
  END IF;

  SELECT COALESCE(sc.rollover_giros_gratis, 5)
  INTO v_multiplicador
  FROM public.site_config sc
  WHERE sc.id = 1;

  RETURN json_build_object(
    'ok', true,
    'saldo_bonus', ROUND(COALESCE(v_saldo_bonus, 0), 2),
    'rollover_bonus_pendente', ROUND(COALESCE(v_rollover_bonus, 0), 2),
    'rollover_giros_gratis', COALESCE(v_multiplicador, 5),
    'pode_converter',
      COALESCE(v_saldo_bonus, 0) > 0.009
      AND COALESCE(v_rollover_bonus, 0) <= 0.009
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.converter_bonus_saldo()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_saldo NUMERIC;
  v_saldo_bonus NUMERIC;
  v_rollover_bonus NUMERIC;
  v_valor NUMERIC;
  v_novo_saldo NUMERIC;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT
    COALESCE(saldo, 0),
    COALESCE(saldo_bonus, 0),
    COALESCE(rollover_bonus_pendente, 0)
  INTO v_saldo, v_saldo_bonus, v_rollover_bonus
  FROM public.usuarios
  WHERE id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'user_not_found');
  END IF;

  IF COALESCE(v_saldo_bonus, 0) <= 0.009 THEN
    RETURN json_build_object('ok', false, 'error', 'sem_bonus', 'msg', 'Nenhum bônus disponível para converter.');
  END IF;

  IF COALESCE(v_rollover_bonus, 0) > 0.009 THEN
    RETURN json_build_object(
      'ok', false,
      'error', 'rollover_pendente',
      'msg', 'Complete o rollover do bônus antes de converter.',
      'rollover_bonus_pendente', ROUND(v_rollover_bonus, 2)
    );
  END IF;

  v_valor := ROUND(v_saldo_bonus, 2);
  v_novo_saldo := ROUND(v_saldo + v_valor, 2);

  PERFORM set_config('app.skip_usuario_guard', 'true', true);

  UPDATE public.usuarios
  SET
    saldo = v_novo_saldo,
    saldo_bonus = 0,
    updated_at = NOW()
  WHERE id = v_uid;

  INSERT INTO public.bonus_conversoes (usuario_id, valor)
  VALUES (v_uid, v_valor);

  RETURN json_build_object(
    'ok', true,
    'valor_convertido', v_valor,
    'saldo', v_novo_saldo,
    'saldo_bonus', 0
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.obter_bonus_usuario() TO authenticated;
GRANT EXECUTE ON FUNCTION public.converter_bonus_saldo() TO authenticated;

-- -----------------------------------------------------------------------------
-- 9) Config da plataforma — incluir rollover_giros_gratis
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.atualizar_config_plataforma_admin(NUMERIC, NUMERIC, NUMERIC, NUMERIC, INT);
DROP FUNCTION IF EXISTS public.atualizar_config_plataforma_admin(NUMERIC, NUMERIC, NUMERIC, NUMERIC, INT, NUMERIC);
DROP FUNCTION IF EXISTS public.atualizar_config_plataforma_admin(NUMERIC, NUMERIC, NUMERIC, NUMERIC, INT, NUMERIC, NUMERIC, NUMERIC);

-- Cupons já usados antes do patch: permite detectar ganhos por 72h a partir da criação
UPDATE public.cupom_usos cu
SET giros_ativado_em = cu.created_at
FROM public.cupons c
WHERE c.id = cu.cupom_id
  AND c.tipo_bonus = 'giros_gratis'
  AND cu.status_giro = 'usado'
  AND cu.giros_ativado_em IS NULL;

CREATE OR REPLACE FUNCTION public.obter_config_plataforma()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config public.site_config%ROWTYPE;
BEGIN
  SELECT * INTO v_config FROM public.site_config WHERE id = 1;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'ok', true,
      'deposito_minimo', 20,
      'deposito_maximo', 1000000,
      'saque_minimo', 50,
      'saque_maximo', 1000000,
      'saques_diarios_permitidos', 1,
      'rollover_padrao', 1,
      'rollover_giros_gratis', 5,
      'indicacao_recompensa', 100,
      'indicacao_deposito_minimo', 50
    );
  END IF;

  RETURN json_build_object(
    'ok', true,
    'deposito_minimo', v_config.deposito_minimo,
    'deposito_maximo', v_config.deposito_maximo,
    'saque_minimo', v_config.saque_minimo,
    'saque_maximo', v_config.saque_maximo,
    'saques_diarios_permitidos', COALESCE(v_config.saques_diarios_permitidos, 1),
    'rollover_padrao', COALESCE(v_config.rollover_padrao, 1),
    'rollover_giros_gratis', COALESCE(v_config.rollover_giros_gratis, 5),
    'indicacao_recompensa', COALESCE(v_config.indicacao_recompensa, 100),
    'indicacao_deposito_minimo', COALESCE(v_config.indicacao_deposito_minimo, 50),
    'updated_at', v_config.updated_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.atualizar_config_plataforma_admin(
  p_deposito_minimo NUMERIC DEFAULT NULL,
  p_deposito_maximo NUMERIC DEFAULT NULL,
  p_saque_minimo NUMERIC DEFAULT NULL,
  p_saque_maximo NUMERIC DEFAULT NULL,
  p_saques_diarios_permitidos INT DEFAULT NULL,
  p_rollover_padrao NUMERIC DEFAULT NULL,
  p_rollover_giros_gratis NUMERIC DEFAULT NULL,
  p_indicacao_recompensa NUMERIC DEFAULT NULL,
  p_indicacao_deposito_minimo NUMERIC DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config public.site_config%ROWTYPE;
  v_dep_min NUMERIC;
  v_dep_max NUMERIC;
  v_saq_min NUMERIC;
  v_saq_max NUMERIC;
  v_saques_dia INT;
  v_rollover NUMERIC;
  v_rollover_giros NUMERIC;
  v_ind_recompensa NUMERIC;
  v_ind_dep_min NUMERIC;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT * INTO v_config FROM public.site_config WHERE id = 1;

  IF NOT FOUND THEN
    INSERT INTO public.site_config (id) VALUES (1);
    SELECT * INTO v_config FROM public.site_config WHERE id = 1;
  END IF;

  v_dep_min := COALESCE(p_deposito_minimo, v_config.deposito_minimo);
  v_dep_max := COALESCE(p_deposito_maximo, v_config.deposito_maximo);
  v_saq_min := COALESCE(p_saque_minimo, v_config.saque_minimo);
  v_saq_max := COALESCE(p_saque_maximo, v_config.saque_maximo);
  v_saques_dia := COALESCE(p_saques_diarios_permitidos, v_config.saques_diarios_permitidos, 1);
  v_rollover := COALESCE(p_rollover_padrao, v_config.rollover_padrao, 1);
  v_rollover_giros := COALESCE(p_rollover_giros_gratis, v_config.rollover_giros_gratis, 5);
  v_ind_recompensa := COALESCE(p_indicacao_recompensa, v_config.indicacao_recompensa, 100);
  v_ind_dep_min := COALESCE(p_indicacao_deposito_minimo, v_config.indicacao_deposito_minimo, 50);

  IF v_dep_min <= 0 OR v_dep_max <= 0 OR v_saq_min <= 0 OR v_saq_max <= 0 THEN
    RETURN json_build_object('ok', false, 'error', 'Os valores devem ser maiores que zero.');
  END IF;

  IF v_saques_dia < 1 THEN
    RETURN json_build_object('ok', false, 'error', 'Saques diários permitidos deve ser no mínimo 1.');
  END IF;

  IF v_rollover < 0 OR v_rollover_giros < 0 THEN
    RETURN json_build_object('ok', false, 'error', 'Rollover não pode ser negativo.');
  END IF;

  IF v_ind_recompensa < 0 OR v_ind_dep_min < 0 THEN
    RETURN json_build_object('ok', false, 'error', 'Valores de indicação não podem ser negativos.');
  END IF;

  IF v_dep_min > v_dep_max OR v_saq_min > v_saq_max THEN
    RETURN json_build_object('ok', false, 'error', 'Mínimo não pode ser maior que o máximo.');
  END IF;

  UPDATE public.site_config
  SET
    deposito_minimo = v_dep_min,
    deposito_maximo = v_dep_max,
    saque_minimo = v_saq_min,
    saque_maximo = v_saq_max,
    saques_diarios_permitidos = v_saques_dia,
    rollover_padrao = v_rollover,
    rollover_giros_gratis = v_rollover_giros,
    indicacao_recompensa = v_ind_recompensa,
    indicacao_deposito_minimo = v_ind_dep_min,
    updated_at = NOW()
  WHERE id = 1;

  RETURN json_build_object(
    'ok', true,
    'deposito_minimo', v_dep_min,
    'deposito_maximo', v_dep_max,
    'saque_minimo', v_saq_min,
    'saque_maximo', v_saq_max,
    'saques_diarios_permitidos', v_saques_dia,
    'rollover_padrao', v_rollover,
    'rollover_giros_gratis', v_rollover_giros,
    'indicacao_recompensa', v_ind_recompensa,
    'indicacao_deposito_minimo', v_ind_dep_min
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.obter_config_plataforma() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_config_plataforma_admin(
  NUMERIC, NUMERIC, NUMERIC, NUMERIC, INT, NUMERIC, NUMERIC, NUMERIC, NUMERIC
) TO authenticated;

COMMENT ON FUNCTION public.obter_bonus_usuario() IS
  'Retorna saldo_bonus, rollover_bonus_pendente e se pode converter.';
COMMENT ON FUNCTION public.converter_bonus_saldo() IS
  'Converte saldo_bonus para saldo real quando rollover de bônus estiver zerado.';
COMMENT ON FUNCTION public.processar_callback_playfiver(TEXT, TEXT, NUMERIC, NUMERIC, TEXT) IS
  'C5 + bônus: ganhos de giros grátis vão para saldo_bonus com rollover separado.';
