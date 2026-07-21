-- =============================================================================
-- VenuzBET — Hardening de segurança (saldo, cargo, RLS, RPC)
-- Execute no SQL Editor do Supabase (produção/staging).
-- (Cópia idêntica em AdminPainel/Database/patch_security_hardening.sql)
-- =============================================================================

-- 1) Impede que usuários autenticados alterem colunas sensíveis via UPDATE direto
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
    RAISE EXCEPTION 'Alteração de saldo não permitida';
  END IF;

  IF NEW.cargo IS DISTINCT FROM OLD.cargo THEN
    RAISE EXCEPTION 'Alteração de cargo não permitida';
  END IF;

  IF NEW.vip_nivel IS DISTINCT FROM OLD.vip_nivel THEN
    RAISE EXCEPTION 'Alteração de VIP não permitida';
  END IF;

  IF NEW.total_depositado IS DISTINCT FROM OLD.total_depositado THEN
    RAISE EXCEPTION 'Alteração de total depositado não permitida';
  END IF;

  IF NEW.two_factor_enabled IS DISTINCT FROM OLD.two_factor_enabled THEN
    RAISE EXCEPTION 'Alteração de 2FA não permitida';
  END IF;

  IF NEW.totp_secret IS DISTINCT FROM OLD.totp_secret THEN
    RAISE EXCEPTION 'Alteração de 2FA não permitida';
  END IF;

  IF NEW.totp_pending_secret IS DISTINCT FROM OLD.totp_pending_secret THEN
    RAISE EXCEPTION 'Alteração de 2FA não permitida';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_usuario_sensitive_columns ON public.usuarios;
CREATE TRIGGER protect_usuario_sensitive_columns
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_usuario_sensitive_columns();

-- 2) RPC subtrair_saldo_saque — só o próprio usuário
CREATE OR REPLACE FUNCTION public.subtrair_saldo_saque(
  p_usuario_id UUID,
  p_valor_saque NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_saldo_atual NUMERIC;
  v_novo_saldo NUMERIC;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  IF p_usuario_id IS DISTINCT FROM v_uid THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;

  SELECT saldo INTO v_saldo_atual
  FROM public.usuarios
  WHERE id = p_usuario_id;

  IF v_saldo_atual IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  IF v_saldo_atual < p_valor_saque THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Saldo insuficiente',
      'saldo_atual', v_saldo_atual,
      'valor_saque', p_valor_saque
    );
  END IF;

  v_novo_saldo := v_saldo_atual - p_valor_saque;

  PERFORM set_config('app.skip_usuario_guard', 'true', true);
  UPDATE public.usuarios
  SET saldo = v_novo_saldo
  WHERE id = p_usuario_id;

  RETURN json_build_object(
    'success', true,
    'saldo_anterior', v_saldo_atual,
    'saldo_atual', v_novo_saldo,
    'valor_saque', p_valor_saque
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.subtrair_saldo_saque(UUID, NUMERIC) TO authenticated;

-- 3) Garante RLS restritiva em usuarios (própria linha + indicações + admin)
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem ver seus dados e indicações" ON public.usuarios;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios dados" ON public.usuarios;
DROP POLICY IF EXISTS "Admins podem ver todos os usuários" ON public.usuarios;
DROP POLICY IF EXISTS "Admin pode gerenciar usuários" ON public.usuarios;

CREATE POLICY "Usuários podem ver seus dados e indicações"
  ON public.usuarios
  FOR SELECT
  USING (
    auth.uid() = id
    OR (
      indicado_por IS NOT NULL
      AND public.get_current_user_referral_code() IS NOT NULL
      AND indicado_por = public.get_current_user_referral_code()
    )
    OR public.is_user_admin()
  );

CREATE POLICY "Usuários podem atualizar seus próprios dados"
  ON public.usuarios
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admin pode gerenciar usuários"
  ON public.usuarios
  FOR UPDATE
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

COMMENT ON FUNCTION public.protect_usuario_sensitive_columns() IS
  'Bloqueia UPDATE de saldo/cargo/VIP/2FA por usuários autenticados (bypass via app.skip_usuario_guard).';

-- 4) Revoga lookup de usuário por email para clientes (só service_role na API)
REVOKE EXECUTE ON FUNCTION public.get_user_by_email(TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_by_email(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_by_email(TEXT) TO service_role;

-- 5) Config RTP do Aviator — só motor interno (Python via API), não anon no browser
REVOKE EXECUTE ON FUNCTION public.obter_aviator_engine_config() FROM anon;
GRANT EXECUTE ON FUNCTION public.obter_aviator_engine_config() TO service_role;

-- 6) Garante que alteração de saldo exige admin
CREATE OR REPLACE FUNCTION public.atualizar_saldo_usuario(
  p_usuario_id UUID,
  p_novo_saldo NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_saldo_anterior NUMERIC;
  v_usuario_email TEXT;
BEGIN
  IF NOT public.is_user_admin() THEN
    RETURN json_build_object('success', false, 'error', 'Acesso negado');
  END IF;

  SELECT saldo, email INTO v_saldo_anterior, v_usuario_email
  FROM public.usuarios
  WHERE id = p_usuario_id;

  IF v_saldo_anterior IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  IF p_novo_saldo < 0 THEN
    RETURN json_build_object('success', false, 'error', 'O saldo não pode ser negativo');
  END IF;

  PERFORM set_config('app.skip_usuario_guard', 'true', true);
  PERFORM set_config('app.skip_audit', 'true', true);

  UPDATE public.usuarios
  SET saldo = p_novo_saldo, updated_at = NOW()
  WHERE id = p_usuario_id;

  RETURN json_build_object(
    'success', true,
    'saldo_anterior', v_saldo_anterior,
    'saldo_novo', p_novo_saldo,
    'usuario_email', v_usuario_email
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.atualizar_saldo_usuario(UUID, NUMERIC) TO authenticated;
