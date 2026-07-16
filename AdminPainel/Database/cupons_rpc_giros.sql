-- Atualização das RPCs de cupons para suportar rodadas grátis
-- Execute após cupons_giros.sql no SQL Editor do Supabase

-- ============================================================
-- JOGOS PERMITIDOS PARA CUPONS DE RODADAS
-- ============================================================

CREATE OR REPLACE FUNCTION public._jogo_giros_permitido(p_slug TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN LOWER(TRIM(p_slug)) IN (
    'gates-of-olympus',
    'starlight-princess',
    'sweet-bonanza',
    'sugar-rush',
    'starlight-princess-1000',
    'gates-of-olympus-1000',
    'sweet-bonanza-1000',
    'sugar-rush-1000',
    'o-vira-lata-caramelo'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public._validar_cupom_giros(p_cupom public.cupons)
RETURNS JSON
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_cupom.tipo_bonus <> 'giros_gratis' THEN
    RETURN json_build_object('ok', true);
  END IF;

  IF p_cupom.tipo_valor <> 'fixo' THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_spin_coupon_type');
  END IF;

  IF p_cupom.jogo_slug IS NULL OR TRIM(p_cupom.jogo_slug) = '' THEN
    RETURN json_build_object('ok', false, 'error', 'missing_game');
  END IF;

  IF NOT public._jogo_giros_permitido(p_cupom.jogo_slug) THEN
    RETURN json_build_object('ok', false, 'error', 'game_not_allowed');
  END IF;

  IF p_cupom.valor IS NULL OR p_cupom.valor <= 0 OR p_cupom.valor != TRUNC(p_cupom.valor) THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_spin_count');
  END IF;

  RETURN json_build_object('ok', true);
END;
$$;

-- ============================================================
-- CONCEDER GIROS GRÁTIS (interno)
-- ============================================================

CREATE OR REPLACE FUNCTION public._conceder_giros_gratis(
  p_cupom public.cupons,
  p_usuario_id UUID,
  p_deposito_id UUID DEFAULT NULL,
  p_valor_deposito NUMERIC DEFAULT NULL,
  p_origem TEXT DEFAULT 'manual',
  p_status_giro TEXT DEFAULT 'disponivel'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uso_id UUID;
  v_validacao JSON;
BEGIN
  v_validacao := public._validar_cupom_giros(p_cupom);
  IF NOT (v_validacao->>'ok')::BOOLEAN THEN
    RAISE EXCEPTION 'invalid_spin_coupon: %', v_validacao->>'error';
  END IF;

  INSERT INTO public.cupom_usos (
    cupom_id,
    usuario_id,
    deposito_id,
    valor_bonus,
    valor_deposito,
    quantidade_giros,
    jogo_slug,
    jogo_nome,
    origem,
    status_giro
  )
  VALUES (
    p_cupom.id,
    p_usuario_id,
    p_deposito_id,
    0,
    p_valor_deposito,
    TRUNC(p_cupom.valor)::INT,
    p_cupom.jogo_slug,
    p_cupom.jogo_nome,
    p_origem,
    p_status_giro
  )
  RETURNING id INTO v_uso_id;

  UPDATE public.cupons
  SET usos_total = usos_total + 1, updated_at = NOW()
  WHERE id = p_cupom.id;

  RETURN v_uso_id;
END;
$$;

-- ============================================================
-- VALIDAR CUPOM (atualizado)
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
  v_giros_validacao JSON;
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

  v_giros_validacao := public._validar_cupom_giros(v_cupom);
  IF NOT (v_giros_validacao->>'ok')::BOOLEAN THEN
    RETURN json_build_object('ok', false, 'error', v_giros_validacao->>'error');
  END IF;

  v_limites := public._validar_limites_cupom(v_cupom, v_uid);
  IF NOT (v_limites->>'ok')::BOOLEAN THEN
    RETURN v_limites;
  END IF;

  IF v_cupom.tipo_bonus = 'giros_gratis' THEN
    v_requer_deposito := COALESCE(v_cupom.deposito_minimo, 0) > 0;

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
          'quantidade_giros', TRUNC(v_cupom.valor)::INT,
          'jogo_slug', v_cupom.jogo_slug,
          'jogo_nome', v_cupom.jogo_nome,
          'provider_slug', v_cupom.provider_slug,
          'bonus_calculado', NULL,
          'mensagem', 'Este cupom de rodadas deve ser usado durante um depósito.'
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

    RETURN json_build_object(
      'ok', true,
      'codigo', v_cupom.codigo,
      'tipo_valor', v_cupom.tipo_valor,
      'valor', v_cupom.valor,
      'tipo_bonus', v_cupom.tipo_bonus,
      'deposito_minimo', COALESCE(v_cupom.deposito_minimo, 0),
      'bonus_maximo', v_cupom.bonus_maximo,
      'requer_deposito', v_requer_deposito,
      'quantidade_giros', TRUNC(v_cupom.valor)::INT,
      'jogo_slug', v_cupom.jogo_slug,
      'jogo_nome', v_cupom.jogo_nome,
      'provider_slug', v_cupom.provider_slug,
      'bonus_calculado', NULL
    );
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
-- ATIVAR CUPOM (atualizado)
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
  v_giros_validacao JSON;
  v_uso_id UUID;
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

  v_giros_validacao := public._validar_cupom_giros(v_cupom);
  IF NOT (v_giros_validacao->>'ok')::BOOLEAN THEN
    RETURN json_build_object('ok', false, 'error', v_giros_validacao->>'error');
  END IF;

  v_limites := public._validar_limites_cupom(v_cupom, v_uid);
  IF NOT (v_limites->>'ok')::BOOLEAN THEN
    RETURN v_limites;
  END IF;

  IF v_cupom.tipo_bonus = 'giros_gratis' THEN
    v_requer_deposito := COALESCE(v_cupom.deposito_minimo, 0) > 0;

    IF v_requer_deposito THEN
      RETURN json_build_object(
        'ok', false,
        'error', 'requires_deposit',
        'deposito_minimo', COALESCE(v_cupom.deposito_minimo, 0),
        'quantidade_giros', TRUNC(v_cupom.valor)::INT,
        'jogo_nome', v_cupom.jogo_nome
      );
    END IF;

    v_uso_id := public._conceder_giros_gratis(v_cupom, v_uid, NULL, NULL, 'manual', 'disponivel');

    RETURN json_build_object(
      'ok', true,
      'codigo', v_cupom.codigo,
      'tipo_bonus', v_cupom.tipo_bonus,
      'quantidade_giros', TRUNC(v_cupom.valor)::INT,
      'jogo_slug', v_cupom.jogo_slug,
      'jogo_nome', v_cupom.jogo_nome,
      'provider_slug', v_cupom.provider_slug,
      'status_giro', 'disponivel',
      'cupom_uso_id', v_uso_id
    );
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

  INSERT INTO public.cupom_usos (cupom_id, usuario_id, valor_bonus, valor_deposito, origem)
  VALUES (v_cupom.id, v_uid, v_bonus, NULL, 'manual');

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
-- APLICAR CUPOM NO DEPÓSITO (atualizado)
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
  v_giros_validacao JSON;
  v_uso_id UUID;
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

  v_giros_validacao := public._validar_cupom_giros(v_cupom);
  IF NOT (v_giros_validacao->>'ok')::BOOLEAN THEN
    RETURN json_build_object('ok', false, 'error', v_giros_validacao->>'error');
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

  IF v_cupom.tipo_bonus = 'giros_gratis' THEN
    v_uso_id := public._conceder_giros_gratis(
      v_cupom,
      v_uid,
      p_deposito_id,
      v_valor_deposito,
      'deposito',
      'disponivel'
    );

    UPDATE public.depositos
    SET cupom_codigo = v_cupom.codigo
    WHERE id = p_deposito_id;

    RETURN json_build_object(
      'ok', true,
      'codigo', v_cupom.codigo,
      'tipo_bonus', v_cupom.tipo_bonus,
      'quantidade_giros', TRUNC(v_cupom.valor)::INT,
      'jogo_slug', v_cupom.jogo_slug,
      'jogo_nome', v_cupom.jogo_nome,
      'provider_slug', v_cupom.provider_slug,
      'status_giro', 'disponivel',
      'cupom_uso_id', v_uso_id
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

  INSERT INTO public.cupom_usos (cupom_id, usuario_id, deposito_id, valor_bonus, valor_deposito, origem)
  VALUES (v_cupom.id, v_uid, p_deposito_id, v_bonus, v_valor_deposito, 'deposito');

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
-- LISTAR HISTÓRICO (atualizado)
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
      c.tipo_bonus,
      cu.quantidade_giros,
      cu.jogo_slug,
      cu.jogo_nome,
      cu.status_giro,
      cu.origem,
      CASE
        WHEN c.tipo_bonus = 'giros_gratis' AND cu.status_giro = 'pendente_deposito' THEN 'Aguardando depósito'
        WHEN c.tipo_bonus = 'giros_gratis' AND cu.status_giro = 'disponivel' THEN 'Rodadas disponíveis'
        WHEN c.tipo_bonus = 'giros_gratis' AND cu.status_giro = 'usado' THEN 'Rodadas usadas'
        ELSE 'Ativado'
      END AS status,
      TO_CHAR(cu.created_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') AS data,
      cu.created_at
    FROM public.cupom_usos cu
    INNER JOIN public.cupons c ON c.id = cu.cupom_id
    WHERE cu.usuario_id = v_uid
  ) t;

  RETURN json_build_object('ok', true, 'cupons', v_result);
END;
$$;

GRANT EXECUTE ON FUNCTION public._jogo_giros_permitido(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validar_cupom(TEXT, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ativar_cupom(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.aplicar_cupom_deposito(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.listar_cupons_usuario() TO authenticated;
