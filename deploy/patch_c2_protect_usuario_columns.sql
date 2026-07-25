-- =============================================================================
-- Patch C2 — Bloqueia self-update de rollover / indicacao / flags sensiveis
-- Execute no SQL Editor do Supabase.
-- =============================================================================

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

  -- C2: rollover
  IF NEW.rollover_pendente IS DISTINCT FROM OLD.rollover_pendente THEN
    RAISE EXCEPTION 'Alteracao de rollover nao permitida';
  END IF;

  IF NEW.rollover_meta IS DISTINCT FROM OLD.rollover_meta THEN
    RAISE EXCEPTION 'Alteracao de rollover nao permitida';
  END IF;

  IF NEW.rollover_inicio IS DISTINCT FROM OLD.rollover_inicio THEN
    RAISE EXCEPTION 'Alteracao de rollover nao permitida';
  END IF;

  -- C2: indicacao
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

  -- Flags / identidade sensivel
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

DROP TRIGGER IF EXISTS protect_usuario_sensitive_columns ON public.usuarios;
CREATE TRIGGER protect_usuario_sensitive_columns
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_usuario_sensitive_columns();

COMMENT ON FUNCTION public.protect_usuario_sensitive_columns() IS
  'Bloqueia UPDATE sensivel para clientes. Bypass: app.skip_usuario_guard ou roles postgres/supabase_admin/service_role.';

-- RPCs de sistema/admin: setam skip antes de tocar colunas protegidas
CREATE OR REPLACE FUNCTION public.aplicar_rollover_deposito(
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
  v_meta_atual NUMERIC;
  v_pendente_atual NUMERIC;
BEGIN
  IF p_usuario_id IS NULL OR COALESCE(p_valor, 0) <= 0 THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(rollover_padrao, 0)
  INTO v_multiplicador
  FROM public.site_config
  WHERE id = 1;

  v_multiplicador := COALESCE(v_multiplicador, 0);
  IF v_multiplicador <= 0 THEN
    RETURN 0;
  END IF;

  v_incremento := ROUND(p_valor * v_multiplicador, 2);

  SELECT COALESCE(rollover_meta, 0), COALESCE(rollover_pendente, 0)
  INTO v_meta_atual, v_pendente_atual
  FROM public.usuarios
  WHERE id = p_usuario_id;

  PERFORM set_config('app.skip_usuario_guard', 'true', true);

  UPDATE public.usuarios
  SET
    rollover_pendente = COALESCE(rollover_pendente, 0) + v_incremento,
    rollover_meta = COALESCE(rollover_meta, 0) + v_incremento,
    rollover_inicio = CASE
      WHEN COALESCE(v_meta_atual, 0) <= 0.009 AND COALESCE(v_pendente_atual, 0) <= 0.009 THEN NOW()
      ELSE rollover_inicio
    END
  WHERE id = p_usuario_id
  RETURNING rollover_pendente INTO v_novo_pendente;

  RETURN COALESCE(v_novo_pendente, 0);
END;
$$;

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
  SET rollover_pendente = GREATEST(0, COALESCE(rollover_pendente, 0) - v_valor_aposta)
  WHERE id = NEW.usuario_id
    AND COALESCE(rollover_pendente, 0) > 0;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.atualizar_indicacao_usuario_admin(
  p_usuario_id UUID,
  p_usar_padrao_plataforma BOOLEAN DEFAULT false,
  p_recompensa NUMERIC DEFAULT NULL,
  p_deposito_minimo NUMERIC DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recompensa NUMERIC;
  v_deposito_min NUMERIC;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id = p_usuario_id) THEN
    RETURN json_build_object('ok', false, 'error', 'Usuario nao encontrado');
  END IF;

  PERFORM set_config('app.skip_usuario_guard', 'true', true);

  IF COALESCE(p_usar_padrao_plataforma, false) THEN
    UPDATE public.usuarios
    SET
      indicacao_recompensa_custom = NULL,
      indicacao_deposito_minimo_custom = NULL,
      updated_at = NOW()
    WHERE id = p_usuario_id;

    RETURN json_build_object('ok', true, 'usa_padrao_plataforma', true);
  END IF;

  IF p_recompensa IS NULL OR p_deposito_minimo IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'Informe recompensa e deposito minimo.');
  END IF;

  v_recompensa := COALESCE(p_recompensa, 0);
  v_deposito_min := COALESCE(p_deposito_minimo, 0);

  IF v_recompensa < 0 THEN
    RETURN json_build_object('ok', false, 'error', 'Recompensa nao pode ser negativa.');
  END IF;

  IF v_deposito_min < 0 THEN
    RETURN json_build_object('ok', false, 'error', 'Deposito minimo nao pode ser negativo.');
  END IF;

  UPDATE public.usuarios
  SET
    indicacao_recompensa_custom = v_recompensa,
    indicacao_deposito_minimo_custom = v_deposito_min,
    updated_at = NOW()
  WHERE id = p_usuario_id;

  RETURN json_build_object(
    'ok', true,
    'recompensa_custom', v_recompensa,
    'deposito_minimo_custom', v_deposito_min,
    'usa_padrao_plataforma', false
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.aplicar_rollover_usuario_admin(
  p_usuario_id UUID,
  p_valor NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valor NUMERIC;
  v_meta_atual NUMERIC;
  v_pendente_atual NUMERIC;
  v_novo_pendente NUMERIC;
  v_nova_meta NUMERIC;
  v_nome TEXT;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  v_valor := ROUND(COALESCE(p_valor, 0), 2);
  IF v_valor <= 0 THEN
    RETURN json_build_object('ok', false, 'error', 'Informe um valor maior que zero.');
  END IF;

  SELECT
    COALESCE(rollover_meta, 0),
    COALESCE(rollover_pendente, 0),
    COALESCE(
      NULLIF(TRIM(usuario_nome), ''),
      NULLIF(TRIM(nome), ''),
      NULLIF(TRIM(usuario), ''),
      split_part(email, '@', 1)
    )
  INTO v_meta_atual, v_pendente_atual, v_nome
  FROM public.usuarios
  WHERE id = p_usuario_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'Usuario nao encontrado');
  END IF;

  PERFORM set_config('app.skip_usuario_guard', 'true', true);

  UPDATE public.usuarios
  SET
    rollover_pendente = COALESCE(rollover_pendente, 0) + v_valor,
    rollover_meta = COALESCE(rollover_meta, 0) + v_valor,
    rollover_inicio = CASE
      WHEN COALESCE(v_meta_atual, 0) <= 0.009 AND COALESCE(v_pendente_atual, 0) <= 0.009 THEN NOW()
      ELSE rollover_inicio
    END,
    updated_at = NOW()
  WHERE id = p_usuario_id
  RETURNING rollover_pendente, rollover_meta
  INTO v_novo_pendente, v_nova_meta;

  PERFORM public.registrar_admin_log(
    'Rollover aplicado ao usuario',
    format('Usuario: %s | Valor adicionado: R$ %s | Novo pendente: R$ %s', COALESCE(v_nome, p_usuario_id::text), v_valor, v_novo_pendente),
    'sucesso',
    'usuarios',
    jsonb_build_object(
      'usuario_id', p_usuario_id,
      'valor_adicionado', v_valor,
      'rollover_pendente', v_novo_pendente,
      'rollover_meta', v_nova_meta
    )
  );

  RETURN json_build_object(
    'ok', true,
    'rollover_pendente', v_novo_pendente,
    'rollover_meta', v_nova_meta
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.desativar_rollover_usuario_admin(p_usuario_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nome TEXT;
  v_pendente NUMERIC;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT
    COALESCE(rollover_pendente, 0),
    COALESCE(
      NULLIF(TRIM(usuario_nome), ''),
      NULLIF(TRIM(nome), ''),
      NULLIF(TRIM(usuario), ''),
      split_part(email, '@', 1)
    )
  INTO v_pendente, v_nome
  FROM public.usuarios
  WHERE id = p_usuario_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'Usuario nao encontrado');
  END IF;

  PERFORM set_config('app.skip_usuario_guard', 'true', true);

  UPDATE public.usuarios
  SET
    rollover_pendente = 0,
    rollover_meta = 0,
    rollover_inicio = NULL,
    updated_at = NOW()
  WHERE id = p_usuario_id;

  PERFORM public.registrar_admin_log(
    'Rollover desativado',
    format('Usuario: %s | Pendente removido: R$ %s', COALESCE(v_nome, p_usuario_id::text), v_pendente),
    'sucesso',
    'usuarios',
    jsonb_build_object(
      'usuario_id', p_usuario_id,
      'rollover_removido', v_pendente
    )
  );

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
    RETURN json_build_object('ok', false, 'error', 'Usuario nao encontrado');
  END IF;

  PERFORM set_config('app.skip_usuario_guard', 'true', true);

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
