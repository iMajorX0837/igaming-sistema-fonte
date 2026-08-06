-- =============================================================================
-- Fix: Indicações qualificadas na ReferralPage
-- H8 passou a contar só indicacao_recompensa_paga=true; a UI promete
-- "primeiro depósito >= mínimo". Alinha contagem com a regra de negócio.
-- Execute no SQL Editor do Supabase.
-- =============================================================================

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

  IF TRIM(COALESCE(public.get_current_user_referral_code(), '')) IS DISTINCT FROM TRIM(p_referral_code) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.count_qualified_referrals(referral_code_param TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_deposito_min NUMERIC;
  v_global_min NUMERIC;
BEGIN
  PERFORM public._assert_referral_code_caller(referral_code_param);

  v_code := TRIM(referral_code_param);
  IF v_code IS NULL OR v_code = '' THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(sc.indicacao_deposito_minimo, 50)
  INTO v_global_min
  FROM public.site_config sc
  WHERE sc.id = 1;

  v_global_min := COALESCE(v_global_min, 50);

  SELECT COALESCE(u.indicacao_deposito_minimo_custom, v_global_min)
  INTO v_deposito_min
  FROM public.usuarios u
  WHERE u.link_indicação = v_code
  LIMIT 1;

  v_deposito_min := COALESCE(v_deposito_min, v_global_min, 50);

  RETURN (
    SELECT COUNT(*)::INT
    FROM public.usuarios u
    WHERE u.indicado_por = v_code
      AND (
        COALESCE(u.indicacao_recompensa_paga, false) = true
        OR COALESCE((
          SELECT d.valor
          FROM public.depositos d
          WHERE d.usuario_id = u.id
            AND d.status = 'aprovado'
          ORDER BY COALESCE(d.data_hora, d.created_at) ASC
          LIMIT 1
        ), 0) >= v_deposito_min
      )
  );
END;
$$;

COMMENT ON FUNCTION public.count_qualified_referrals(TEXT) IS
  'Indicados com 1º depósito aprovado >= mínimo (ou recompensa já paga). H8: só dono do código ou admin.';

CREATE OR REPLACE FUNCTION public.calcular_ganhos_indicacao(p_referral_code TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
  v_deposito_min NUMERIC;
  v_recompensa NUMERIC;
  v_global_min NUMERIC;
  v_global_recompensa NUMERIC;
BEGIN
  PERFORM public._assert_referral_code_caller(p_referral_code);

  v_code := TRIM(p_referral_code);
  IF v_code IS NULL OR v_code = '' THEN
    RETURN 0;
  END IF;

  SELECT
    COALESCE(sc.indicacao_recompensa, 0),
    COALESCE(sc.indicacao_deposito_minimo, 50)
  INTO v_global_recompensa, v_global_min
  FROM public.site_config sc
  WHERE sc.id = 1;

  v_global_recompensa := COALESCE(v_global_recompensa, 0);
  v_global_min := COALESCE(v_global_min, 50);

  SELECT
    COALESCE(u.indicacao_recompensa_custom, v_global_recompensa),
    COALESCE(u.indicacao_deposito_minimo_custom, v_global_min)
  INTO v_recompensa, v_deposito_min
  FROM public.usuarios u
  WHERE u.link_indicação = v_code
  LIMIT 1;

  v_recompensa := COALESCE(v_recompensa, v_global_recompensa, 0);
  v_deposito_min := COALESCE(v_deposito_min, v_global_min, 50);

  RETURN COALESCE((
    SELECT SUM(
      CASE
        WHEN COALESCE(u.indicacao_recompensa_paga, false) THEN
          COALESCE(u.indicacao_recompensa_valor_pago, v_recompensa, 0)
        WHEN COALESCE((
          SELECT d.valor
          FROM public.depositos d
          WHERE d.usuario_id = u.id
            AND d.status = 'aprovado'
          ORDER BY COALESCE(d.data_hora, d.created_at) ASC
          LIMIT 1
        ), 0) >= v_deposito_min THEN
          v_recompensa
        ELSE 0
      END
    )
    FROM public.usuarios u
    WHERE u.indicado_por = v_code
  ), 0);
END;
$$;

COMMENT ON FUNCTION public.calcular_ganhos_indicacao(TEXT) IS
  'Soma ganhos de indicação (pagos + qualificados com 1º depósito >= mínimo). H8: só dono do código ou admin.';
