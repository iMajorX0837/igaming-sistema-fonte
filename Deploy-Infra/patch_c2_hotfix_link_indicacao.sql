-- Hotfix C2: nome correto da coluna link_indicação (com acento)
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

  IF NEW.rollover_pendente IS DISTINCT FROM OLD.rollover_pendente THEN
    RAISE EXCEPTION 'Alteracao de rollover nao permitida';
  END IF;

  IF NEW.rollover_meta IS DISTINCT FROM OLD.rollover_meta THEN
    RAISE EXCEPTION 'Alteracao de rollover nao permitida';
  END IF;

  IF NEW.rollover_inicio IS DISTINCT FROM OLD.rollover_inicio THEN
    RAISE EXCEPTION 'Alteracao de rollover nao permitida';
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
