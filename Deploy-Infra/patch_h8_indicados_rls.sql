-- =============================================================================
-- Patch H8 — Fecha vazamento de PII de indicados (RLS usuarios SELECT)
-- Execute no SQL Editor do Supabase.
--
-- - SELECT em usuarios: só própria linha (+ admin)
-- - RPCs de indicação: só código do usuário logado (ou admin)
-- =============================================================================

DROP POLICY IF EXISTS "Usuários podem ver seus dados e indicações" ON public.usuarios;

CREATE POLICY "Usuários podem ver apenas seus próprios dados"
  ON public.usuarios
  FOR SELECT
  USING (
    auth.uid() = id
    OR public.is_user_admin()
  );

COMMENT ON POLICY "Usuários podem ver apenas seus próprios dados" ON public.usuarios IS
  'H8: usuário comum não lê linha de indicados; agregados via obter_indicacao_config_usuario.';

CREATE OR REPLACE FUNCTION public._assert_referral_code_caller(p_referral_code TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_referral_code IS NULL OR TRIM(p_referral_code) = '' THEN
    RETURN;
  END IF;

  IF public.is_user_admin() THEN
    RETURN;
  END IF;

  IF public.get_current_user_referral_code() IS DISTINCT FROM TRIM(p_referral_code) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public._assert_referral_code_caller(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._assert_referral_code_caller(TEXT) FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.count_qualified_referrals(referral_code_param TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._assert_referral_code_caller(referral_code_param);

  IF referral_code_param IS NULL OR TRIM(referral_code_param) = '' THEN
    RETURN 0;
  END IF;

  RETURN (
    SELECT COUNT(*)::INT
    FROM public.usuarios u
    WHERE u.indicado_por = referral_code_param
      AND COALESCE(u.indicacao_recompensa_paga, false) = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.calcular_ganhos_indicacao(p_referral_code TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public._assert_referral_code_caller(p_referral_code);

  IF p_referral_code IS NULL OR TRIM(p_referral_code) = '' THEN
    RETURN 0;
  END IF;

  RETURN COALESCE((
    SELECT SUM(COALESCE(u.indicacao_recompensa_valor_pago, 0))
    FROM public.usuarios u
    WHERE u.indicado_por = p_referral_code
      AND COALESCE(u.indicacao_recompensa_paga, false) = true
  ), 0);
END;
$$;

GRANT EXECUTE ON FUNCTION public.count_qualified_referrals(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calcular_ganhos_indicacao(TEXT) TO authenticated;

COMMENT ON FUNCTION public.count_qualified_referrals(TEXT) IS
  'H8: conta indicados qualificados; só o dono do código ou admin.';

COMMENT ON FUNCTION public.calcular_ganhos_indicacao(TEXT) IS
  'H8: soma ganhos de indicação; só o dono do código ou admin.';
