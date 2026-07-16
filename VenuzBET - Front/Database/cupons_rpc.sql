-- Funções RPC do sistema de cupons
-- Execute após cupons.sql no SQL Editor do Supabase

-- ============================================================
-- HELPERS INTERNOS
-- ============================================================

CREATE OR REPLACE FUNCTION public._calcular_bonus_cupom(
  p_tipo_valor TEXT,
  p_valor DECIMAL,
  p_bonus_maximo DECIMAL,
  p_valor_deposito DECIMAL DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_bonus NUMERIC;
BEGIN
  IF p_tipo_valor = 'fixo' THEN
    RETURN ROUND(p_valor, 2);
  END IF;

  IF p_valor_deposito IS NULL OR p_valor_deposito <= 0 THEN
    RETURN 0;
  END IF;

  v_bonus := ROUND(p_valor_deposito * (p_valor / 100.0), 2);

  IF p_bonus_maximo IS NOT NULL AND v_bonus > p_bonus_maximo THEN
    v_bonus := p_bonus_maximo;
  END IF;

  RETURN v_bonus;
END;
$$;

CREATE OR REPLACE FUNCTION public._buscar_cupom_ativo(p_codigo TEXT)
RETURNS public.cupons
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cupom public.cupons;
BEGIN
  SELECT * INTO v_cupom
  FROM public.cupons
  WHERE UPPER(TRIM(codigo)) = UPPER(TRIM(p_codigo))
    AND ativo = true;

  RETURN v_cupom;
END;
$$;

CREATE OR REPLACE FUNCTION public._validar_limites_cupom(
  p_cupom public.cupons,
  p_usuario_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usos_usuario INT;
BEGIN
  IF p_cupom.id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_coupon');
  END IF;

  IF p_cupom.limite_uso_total IS NOT NULL AND p_cupom.usos_total >= p_cupom.limite_uso_total THEN
    RETURN json_build_object('ok', false, 'error', 'usage_limit_reached');
  END IF;

  SELECT COUNT(*)::INT INTO v_usos_usuario
  FROM public.cupom_usos
  WHERE cupom_id = p_cupom.id AND usuario_id = p_usuario_id;

  IF v_usos_usuario >= p_cupom.limite_uso_por_usuario THEN
    RETURN json_build_object('ok', false, 'error', 'user_limit_reached');
  END IF;

  RETURN json_build_object('ok', true);
END;
$$;

-- ============================================================
-- VALIDAR CUPOM (preview sem ativar)
-- ============================================================

CREATE OR REPLACE FUNCTION public.validar_cupom(
  p_codigo TEXT,
  p_valor_deposito NUMERIC DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_cupom public.cupons;
  v_limites JSON;
  v_bonus NUMERIC;
  v_requer_deposito BOOLEAN;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF p_codigo IS NULL OR TRIM(p_codigo) = '' THEN
    RETURN json_build_object('ok', false, 'error', 'empty_code');
  END IF;

  v_cupom := public._buscar_cupom_ativo(p_codigo);

  IF v_cupom.id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_coupon');
  END IF;

  v_limites := public._validar_limites_cupom(v_cupom, v_uid);
  IF NOT (v_limites->>'ok')::BOOLEAN THEN
    RETURN v_limites;
  END IF;

  v_requer_deposito := COALESCE(v_cupom.deposito_minimo, 0) > 0 OR v_cupom.tipo_valor = 'porcentagem';

  IF v_requer_deposito THEN
    IF p_valor_deposito IS NULL OR p_valor_deposito <= 0 THEN
      RETURN json_build_object(
        'ok', true,
        'codigo', v_cupom.codigo,
        'tipo_valor', v_cupom.tipo_valor,
        'valor', v_cupom.valor,
        'tipo_bonus', v_cupom.tipo_bonus,
        'deposito_minimo', COALESCE(v_cupom.deposito_minimo, 0),
        'bonus_maximo', v_cupom.bonus_maximo,
        'requer_deposito', true,
        'bonus_calculado', NULL,
        'mensagem', 'Este cupom deve ser usado durante um depósito.'
      );
    END IF;

    IF COALESCE(v_cupom.deposito_minimo, 0) > 0 AND p_valor_deposito < v_cupom.deposito_minimo THEN
      RETURN json_build_object(
        'ok', false,
        'error', 'min_deposit_not_met',
        'deposito_minimo', v_cupom.deposito_minimo
      );
    END IF;
  END IF;

  v_bonus := public._calcular_bonus_cupom(
    v_cupom.tipo_valor,
    v_cupom.valor,
    v_cupom.bonus_maximo,
    CASE WHEN v_requer_deposito THEN p_valor_deposito ELSE NULL END
  );

  RETURN json_build_object(
    'ok', true,
    'codigo', v_cupom.codigo,
    'tipo_valor', v_cupom.tipo_valor,
    'valor', v_cupom.valor,
    'tipo_bonus', v_cupom.tipo_bonus,
    'deposito_minimo', COALESCE(v_cupom.deposito_minimo, 0),
    'bonus_maximo', v_cupom.bonus_maximo,
    'requer_deposito', v_requer_deposito,
    'bonus_calculado', v_bonus
  );
END;
$$;

-- ============================================================
-- ATIVAR CUPOM (sem depósito — apenas valor fixo)
-- ============================================================

CREATE OR REPLACE FUNCTION public.ativar_cupom(p_codigo TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_cupom public.cupons;
  v_limites JSON;
  v_bonus NUMERIC;
  v_requer_deposito BOOLEAN;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF p_codigo IS NULL OR TRIM(p_codigo) = '' THEN
    RETURN json_build_object('ok', false, 'error', 'empty_code');
  END IF;

  SELECT * INTO v_cupom
  FROM public.cupons
  WHERE UPPER(TRIM(codigo)) = UPPER(TRIM(p_codigo))
    AND ativo = true
  FOR UPDATE;

  IF v_cupom.id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_coupon');
  END IF;

  v_limites := public._validar_limites_cupom(v_cupom, v_uid);
  IF NOT (v_limites->>'ok')::BOOLEAN THEN
    RETURN v_limites;
  END IF;

  v_requer_deposito := COALESCE(v_cupom.deposito_minimo, 0) > 0 OR v_cupom.tipo_valor = 'porcentagem';

  IF v_requer_deposito THEN
    RETURN json_build_object(
      'ok', false,
      'error', 'requires_deposit',
      'deposito_minimo', COALESCE(v_cupom.deposito_minimo, 0)
    );
  END IF;

  v_bonus := public._calcular_bonus_cupom(v_cupom.tipo_valor, v_cupom.valor, v_cupom.bonus_maximo, NULL);

  IF v_bonus <= 0 THEN
    RETURN json_build_object('ok', false, 'error', 'zero_bonus');
  END IF;

  UPDATE public.usuarios
  SET saldo = saldo + v_bonus
  WHERE id = v_uid;

  INSERT INTO public.cupom_usos (cupom_id, usuario_id, valor_bonus, valor_deposito)
  VALUES (v_cupom.id, v_uid, v_bonus, NULL);

  UPDATE public.cupons
  SET usos_total = usos_total + 1, updated_at = NOW()
  WHERE id = v_cupom.id;

  RETURN json_build_object(
    'ok', true,
    'codigo', v_cupom.codigo,
    'valor_bonus', v_bonus,
    'tipo_bonus', v_cupom.tipo_bonus
  );
END;
$$;

-- ============================================================
-- APLICAR CUPOM NO DEPÓSITO (chamado ao confirmar PIX)
-- ============================================================

CREATE OR REPLACE FUNCTION public.aplicar_cupom_deposito(
  p_deposito_id UUID,
  p_codigo TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_cupom public.cupons;
  v_limites JSON;
  v_bonus NUMERIC;
  v_usuario_id UUID;
  v_valor_deposito NUMERIC;
  v_status TEXT;
  v_ja_aplicado BOOLEAN;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF p_codigo IS NULL OR TRIM(p_codigo) = '' THEN
    RETURN json_build_object('ok', false, 'error', 'empty_code');
  END IF;

  SELECT usuario_id, valor, status INTO v_usuario_id, v_valor_deposito, v_status
  FROM public.depositos
  WHERE id = p_deposito_id;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'deposit_not_found');
  END IF;

  IF v_usuario_id != v_uid THEN
    RETURN json_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF v_status != 'aprovado' THEN
    RETURN json_build_object('ok', false, 'error', 'deposit_not_approved');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.cupom_usos WHERE deposito_id = p_deposito_id
  ) INTO v_ja_aplicado;

  IF v_ja_aplicado THEN
    RETURN json_build_object('ok', true, 'already', true);
  END IF;

  SELECT * INTO v_cupom
  FROM public.cupons
  WHERE UPPER(TRIM(codigo)) = UPPER(TRIM(p_codigo))
    AND ativo = true
  FOR UPDATE;

  IF v_cupom.id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_coupon');
  END IF;

  v_limites := public._validar_limites_cupom(v_cupom, v_uid);
  IF NOT (v_limites->>'ok')::BOOLEAN THEN
    RETURN v_limites;
  END IF;

  IF COALESCE(v_cupom.deposito_minimo, 0) > 0 AND v_valor_deposito < v_cupom.deposito_minimo THEN
    RETURN json_build_object(
      'ok', false,
      'error', 'min_deposit_not_met',
      'deposito_minimo', v_cupom.deposito_minimo
    );
  END IF;

  v_bonus := public._calcular_bonus_cupom(
    v_cupom.tipo_valor,
    v_cupom.valor,
    v_cupom.bonus_maximo,
    v_valor_deposito
  );

  IF v_bonus <= 0 THEN
    RETURN json_build_object('ok', false, 'error', 'zero_bonus');
  END IF;

  UPDATE public.usuarios
  SET saldo = saldo + v_bonus
  WHERE id = v_uid;

  INSERT INTO public.cupom_usos (cupom_id, usuario_id, deposito_id, valor_bonus, valor_deposito)
  VALUES (v_cupom.id, v_uid, p_deposito_id, v_bonus, v_valor_deposito);

  UPDATE public.cupons
  SET usos_total = usos_total + 1, updated_at = NOW()
  WHERE id = v_cupom.id;

  UPDATE public.depositos
  SET cupom_codigo = v_cupom.codigo
  WHERE id = p_deposito_id;

  RETURN json_build_object(
    'ok', true,
    'codigo', v_cupom.codigo,
    'valor_bonus', v_bonus,
    'tipo_bonus', v_cupom.tipo_bonus
  );
END;
$$;

-- ============================================================
-- LISTAR HISTÓRICO DE CUPONS DO USUÁRIO
-- ============================================================

CREATE OR REPLACE FUNCTION public.listar_cupons_usuario()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_result JSON;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.created_at DESC), '[]'::json)
  INTO v_result
  FROM (
    SELECT
      cu.id,
      c.codigo AS cupom,
      cu.valor_bonus AS valor,
      cu.valor_deposito,
      'Ativado' AS status,
      TO_CHAR(cu.created_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') AS data,
      cu.created_at
    FROM public.cupom_usos cu
    INNER JOIN public.cupons c ON c.id = cu.cupom_id
    WHERE cu.usuario_id = v_uid
  ) t;

  RETURN json_build_object('ok', true, 'cupons', v_result);
END;
$$;

-- ============================================================
-- GRANTS
-- ============================================================

GRANT EXECUTE ON FUNCTION public.validar_cupom(TEXT, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ativar_cupom(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.aplicar_cupom_deposito(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.listar_cupons_usuario() TO authenticated;

COMMENT ON FUNCTION public.validar_cupom(TEXT, NUMERIC) IS
  'Valida um cupom e retorna preview do bônus. p_valor_deposito opcional para cupons de depósito.';
COMMENT ON FUNCTION public.ativar_cupom(TEXT) IS
  'Ativa cupom de valor fixo sem depósito. Credita saldo real.';
COMMENT ON FUNCTION public.aplicar_cupom_deposito(UUID, TEXT) IS
  'Aplica cupom após depósito aprovado. Credita bônus no saldo real.';
COMMENT ON FUNCTION public.listar_cupons_usuario() IS
  'Lista histórico de cupons ativados pelo usuário autenticado.';
