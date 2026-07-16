-- Funções RPC da Roleta de Prêmios
-- Execute após prize_wheel.sql e cupons_rpc_giros.sql no SQL Editor do Supabase

-- ============================================================
-- OBTER CONFIGURAÇÃO DA ROLETA
-- ============================================================

CREATE OR REPLACE FUNCTION public.obter_roleta_config()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config public.prize_wheel_config;
  v_segments JSON;
BEGIN
  SELECT * INTO v_config
  FROM public.prize_wheel_config
  WHERE id = 1 AND ativo = true;

  IF v_config.id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'wheel_disabled');
  END IF;

  SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.ordem, t.label), '[]'::json)
  INTO v_segments
  FROM (
    SELECT
      s.id,
      s.label,
      s.peso,
      s.ordem,
      c.codigo AS cupom_codigo,
      c.tipo_bonus,
      TRUNC(c.valor)::INT AS quantidade_giros,
      c.jogo_slug,
      c.jogo_nome,
      c.provider_slug,
      COALESCE(c.deposito_minimo, 0) AS deposito_minimo
    FROM public.prize_wheel_segments s
    INNER JOIN public.cupons c ON c.id = s.cupom_id
    WHERE s.ativo = true
      AND c.ativo = true
      AND c.tipo_bonus = 'giros_gratis'
  ) t;

  IF json_array_length(v_segments) = 0 THEN
    RETURN json_build_object('ok', false, 'error', 'no_segments');
  END IF;

  RETURN json_build_object(
    'ok', true,
    'config', json_build_object(
      'titulo_imagem_url', v_config.titulo_imagem_url,
      'banner_imagem_url', v_config.banner_imagem_url,
      'roleta_imagem_url', v_config.roleta_imagem_url,
      'widget_imagem_url', v_config.widget_imagem_url,
      'centro_imagem_url', v_config.centro_imagem_url,
      'giros_por_periodo', v_config.giros_por_periodo,
      'cooldown_horas', v_config.cooldown_horas
    ),
    'segments', v_segments
  );
END;
$$;

-- ============================================================
-- STATUS DA ROLETA PARA O USUÁRIO
-- ============================================================

CREATE OR REPLACE FUNCTION public.obter_status_roleta()
RETURNS JSON
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_config public.prize_wheel_config;
  v_giros_no_periodo INT;
  v_giros_cupom INT;
  v_giros_wheel INT;
  v_pode_girar BOOLEAN := false;
  v_proximo_em TIMESTAMPTZ;
  v_period_start TIMESTAMPTZ;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_config
  FROM public.prize_wheel_config
  WHERE id = 1 AND ativo = true;

  IF v_config.id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'wheel_disabled', 'pode_girar', false);
  END IF;

  IF v_config.cooldown_horas <= 0 THEN
    v_period_start := date_trunc(
      'day',
      timezone('America/Sao_Paulo', NOW())
    ) AT TIME ZONE 'America/Sao_Paulo';
  ELSE
    v_period_start := NOW() - (v_config.cooldown_horas || ' hours')::INTERVAL;
  END IF;

  SELECT COUNT(*)::INT INTO v_giros_cupom
  FROM public.cupom_usos
  WHERE usuario_id = v_uid
    AND origem = 'roleta'
    AND created_at >= v_period_start;

  SELECT COUNT(*)::INT INTO v_giros_wheel
  FROM public.prize_wheel_spins
  WHERE usuario_id = v_uid
    AND created_at >= v_period_start;

  v_giros_no_periodo := GREATEST(COALESCE(v_giros_cupom, 0), COALESCE(v_giros_wheel, 0));
  v_pode_girar := v_giros_no_periodo < v_config.giros_por_periodo;

  IF NOT v_pode_girar THEN
    IF v_config.cooldown_horas <= 0 THEN
      v_proximo_em := (
        date_trunc('day', timezone('America/Sao_Paulo', NOW())) + INTERVAL '1 day'
      ) AT TIME ZONE 'America/Sao_Paulo';
    ELSE
      SELECT MIN(created_at) + (v_config.cooldown_horas || ' hours')::INTERVAL
      INTO v_proximo_em
      FROM (
        SELECT created_at
        FROM public.cupom_usos
        WHERE usuario_id = v_uid
          AND origem = 'roleta'
          AND created_at >= v_period_start
        UNION ALL
        SELECT created_at
        FROM public.prize_wheel_spins
        WHERE usuario_id = v_uid
          AND created_at >= v_period_start
      ) recent;
    END IF;
  END IF;

  RETURN json_build_object(
    'ok', true,
    'pode_girar', v_pode_girar,
    'giros_por_periodo', v_config.giros_por_periodo,
    'cooldown_horas', v_config.cooldown_horas,
    'proximo_giro_em', v_proximo_em
  );
END;
$$;

-- ============================================================
-- GIRAR ROLETA
-- ============================================================

CREATE OR REPLACE FUNCTION public.girar_roleta()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_config public.prize_wheel_config;
  v_status JSON;
  v_segments JSON;
  v_total_peso INT;
  v_random INT;
  v_acumulado INT := 0;
  v_segment JSON;
  v_segment_id UUID;
  v_cupom public.cupons;
  v_limites JSON;
  v_uso_id UUID;
  v_requer_deposito BOOLEAN;
  v_winner_index INT := 0;
  v_i INT;
  v_arr JSON[];
  v_period_start TIMESTAMPTZ;
  v_giros_no_periodo INT;
  v_giros_cupom INT;
  v_giros_wheel INT;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_config
  FROM public.prize_wheel_config
  WHERE id = 1 AND ativo = true
  FOR UPDATE;

  IF v_config.id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'wheel_disabled');
  END IF;

  IF v_config.cooldown_horas <= 0 THEN
    v_period_start := date_trunc(
      'day',
      timezone('America/Sao_Paulo', NOW())
    ) AT TIME ZONE 'America/Sao_Paulo';
  ELSE
    v_period_start := NOW() - (v_config.cooldown_horas || ' hours')::INTERVAL;
  END IF;

  SELECT COUNT(*)::INT INTO v_giros_cupom
  FROM public.cupom_usos
  WHERE usuario_id = v_uid
    AND origem = 'roleta'
    AND created_at >= v_period_start;

  SELECT COUNT(*)::INT INTO v_giros_wheel
  FROM public.prize_wheel_spins
  WHERE usuario_id = v_uid
    AND created_at >= v_period_start;

  v_giros_no_periodo := GREATEST(COALESCE(v_giros_cupom, 0), COALESCE(v_giros_wheel, 0));

  IF v_giros_no_periodo >= v_config.giros_por_periodo THEN
    v_status := public.obter_status_roleta();
    RETURN json_build_object(
      'ok', false,
      'error', 'cooldown_active',
      'proximo_giro_em', v_status->>'proximo_giro_em'
    );
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_uid::text || ':prize_wheel_spin'));

  SELECT COALESCE(SUM(s.peso), 0)::INT INTO v_total_peso
  FROM public.prize_wheel_segments s
  INNER JOIN public.cupons c ON c.id = s.cupom_id
  WHERE s.ativo = true AND c.ativo = true AND c.tipo_bonus = 'giros_gratis';

  IF v_total_peso <= 0 THEN
    RETURN json_build_object('ok', false, 'error', 'no_segments');
  END IF;

  v_random := 1 + floor(random() * v_total_peso)::INT;

  FOR v_segment IN
    SELECT json_build_object(
      'id', s.id,
      'label', s.label,
      'peso', s.peso,
      'ordem', s.ordem,
      'cupom_id', s.cupom_id
    )
    FROM public.prize_wheel_segments s
    INNER JOIN public.cupons c ON c.id = s.cupom_id
    WHERE s.ativo = true AND c.ativo = true AND c.tipo_bonus = 'giros_gratis'
    ORDER BY s.ordem, s.label
  LOOP
    v_acumulado := v_acumulado + (v_segment->>'peso')::INT;
    IF v_random <= v_acumulado THEN
      v_segment_id := (v_segment->>'id')::UUID;
      EXIT;
    END IF;
    v_winner_index := v_winner_index + 1;
  END LOOP;

  SELECT * INTO v_cupom
  FROM public.cupons
  WHERE id = (v_segment->>'cupom_id')::UUID
  FOR UPDATE;

  IF v_cupom.id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_segment');
  END IF;

  v_limites := public._validar_limites_cupom(v_cupom, v_uid);
  IF NOT (v_limites->>'ok')::BOOLEAN THEN
    RETURN v_limites;
  END IF;

  v_requer_deposito := COALESCE(v_cupom.deposito_minimo, 0) > 0;

  IF v_requer_deposito THEN
    v_uso_id := public._conceder_giros_gratis(
      v_cupom,
      v_uid,
      NULL,
      NULL,
      'roleta',
      'pendente_deposito'
    );
  ELSE
    v_uso_id := public._conceder_giros_gratis(
      v_cupom,
      v_uid,
      NULL,
      NULL,
      'roleta',
      'disponivel'
    );
  END IF;

  INSERT INTO public.prize_wheel_spins (usuario_id, segment_id, cupom_id, cupom_uso_id)
  VALUES (v_uid, v_segment_id, v_cupom.id, v_uso_id);

  -- Recalcular índice do segmento vencedor na lista ordenada
  v_winner_index := 0;
  v_i := 0;
  FOR v_segment IN
    SELECT json_build_object('id', s.id)
    FROM public.prize_wheel_segments s
    INNER JOIN public.cupons c ON c.id = s.cupom_id
    WHERE s.ativo = true AND c.ativo = true AND c.tipo_bonus = 'giros_gratis'
    ORDER BY s.ordem, s.label
  LOOP
    IF (v_segment->>'id')::UUID = v_segment_id THEN
      v_winner_index := v_i;
      EXIT;
    END IF;
    v_i := v_i + 1;
  END LOOP;

  RETURN json_build_object(
    'ok', true,
    'winner_index', v_winner_index,
    'segment_id', v_segment_id,
    'label', (SELECT label FROM public.prize_wheel_segments WHERE id = v_segment_id),
    'codigo', v_cupom.codigo,
    'tipo_bonus', v_cupom.tipo_bonus,
    'quantidade_giros', TRUNC(v_cupom.valor)::INT,
    'jogo_slug', v_cupom.jogo_slug,
    'jogo_nome', v_cupom.jogo_nome,
    'provider_slug', v_cupom.provider_slug,
    'requer_deposito', v_requer_deposito,
    'deposito_minimo', COALESCE(v_cupom.deposito_minimo, 0),
    'status_giro', CASE WHEN v_requer_deposito THEN 'pendente_deposito' ELSE 'disponivel' END,
    'cupom_uso_id', v_uso_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.obter_roleta_config() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.obter_status_roleta() TO authenticated;
GRANT EXECUTE ON FUNCTION public.girar_roleta() TO authenticated;

COMMENT ON FUNCTION public.obter_roleta_config() IS 'Retorna configuração e segmentos ativos da roleta de prêmios';
COMMENT ON FUNCTION public.obter_status_roleta() IS 'Verifica se o usuário pode girar a roleta no período atual';
COMMENT ON FUNCTION public.girar_roleta() IS 'Executa um giro na roleta e concede o prêmio via cupom de rodadas';
