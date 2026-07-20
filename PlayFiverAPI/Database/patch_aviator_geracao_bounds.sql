-- Limites de geração (RTP geral / velas) separados do intervalo do modo crash (criativos)
-- Rode no Supabase SQL Editor após patch_aviator_modo_geracao.sql

ALTER TABLE public.aviator_config
  ADD COLUMN IF NOT EXISTS geracao_min_crash NUMERIC(8, 2) NOT NULL DEFAULT 1.01,
  ADD COLUMN IF NOT EXISTS geracao_max_crash NUMERIC(8, 2) NOT NULL DEFAULT 500.00;

UPDATE public.aviator_config
SET
  geracao_min_crash = COALESCE(geracao_min_crash, min_crash, 1.01),
  geracao_max_crash = COALESCE(geracao_max_crash, max_crash, 500.00)
WHERE id = 1;

DROP FUNCTION IF EXISTS public.atualizar_aviator_config_admin(
  TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, INT
);

CREATE OR REPLACE FUNCTION public.obter_aviator_config_admin()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config public.aviator_config%ROWTYPE;
  v_stats JSON;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT * INTO v_config FROM public.aviator_config WHERE id = 1;
  IF NOT FOUND THEN
    INSERT INTO public.aviator_config (id) VALUES (1);
    SELECT * INTO v_config FROM public.aviator_config WHERE id = 1;
  END IF;

  v_stats := public.calcular_aviator_ggr(COALESCE(v_config.recovery_window_hours, 24));

  RETURN json_build_object(
    'ok', true,
    'config', json_build_object(
      'modo_geracao', v_config.modo_geracao,
      'rtp_geral', v_config.rtp_base,
      'pct_vela_azul', v_config.pct_vela_azul,
      'pct_vela_roxa', v_config.pct_vela_roxa,
      'pct_vela_rosa', v_config.pct_vela_rosa,
      'geracao_min_crash', v_config.geracao_min_crash,
      'geracao_max_crash', v_config.geracao_max_crash,
      'min_crash', v_config.min_crash,
      'max_crash', v_config.max_crash,
      'queue_size', v_config.queue_size,
      'rtp_limit_min_pct', v_config.rtp_limit_min_pct,
      'rtp_limit_max_pct', v_config.rtp_limit_max_pct,
      'crash_technical_max', v_config.crash_technical_max,
      'updated_at', v_config.updated_at
    ),
    'stats', v_stats
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.atualizar_aviator_config_admin(
  p_modo_geracao TEXT DEFAULT NULL,
  p_rtp_geral NUMERIC DEFAULT NULL,
  p_pct_vela_azul NUMERIC DEFAULT NULL,
  p_pct_vela_roxa NUMERIC DEFAULT NULL,
  p_pct_vela_rosa NUMERIC DEFAULT NULL,
  p_geracao_min_crash NUMERIC DEFAULT NULL,
  p_geracao_max_crash NUMERIC DEFAULT NULL,
  p_min_crash NUMERIC DEFAULT NULL,
  p_max_crash NUMERIC DEFAULT NULL,
  p_queue_size INT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config public.aviator_config%ROWTYPE;
  v_modo TEXT;
  v_rtp_geral NUMERIC;
  v_pct_azul NUMERIC;
  v_pct_roxa NUMERIC;
  v_pct_rosa NUMERIC;
  v_geracao_min NUMERIC;
  v_geracao_max NUMERIC;
  v_min_crash NUMERIC;
  v_max_crash NUMERIC;
  v_queue_size INT;
  v_rtp_pct NUMERIC;
  v_sum_pct NUMERIC;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT * INTO v_config FROM public.aviator_config WHERE id = 1;
  IF NOT FOUND THEN
    INSERT INTO public.aviator_config (id) VALUES (1);
    SELECT * INTO v_config FROM public.aviator_config WHERE id = 1;
  END IF;

  v_modo := COALESCE(NULLIF(TRIM(p_modo_geracao), ''), v_config.modo_geracao);
  v_rtp_geral := COALESCE(p_rtp_geral, v_config.rtp_base);
  v_pct_azul := COALESCE(p_pct_vela_azul, v_config.pct_vela_azul);
  v_pct_roxa := COALESCE(p_pct_vela_roxa, v_config.pct_vela_roxa);
  v_pct_rosa := COALESCE(p_pct_vela_rosa, v_config.pct_vela_rosa);
  v_geracao_min := COALESCE(p_geracao_min_crash, v_config.geracao_min_crash);
  v_geracao_max := COALESCE(p_geracao_max_crash, v_config.geracao_max_crash);
  v_min_crash := COALESCE(p_min_crash, v_config.min_crash);
  v_max_crash := COALESCE(p_max_crash, v_config.max_crash);
  v_queue_size := COALESCE(p_queue_size, v_config.queue_size);

  IF v_modo NOT IN ('rtp_geral', 'velas', 'crash') THEN
    RETURN json_build_object('ok', false, 'error', 'Modo de geração inválido.');
  END IF;

  IF v_modo = 'rtp_geral' THEN
    v_rtp_pct := v_rtp_geral * 100;
    IF v_rtp_geral IS NULL OR v_rtp_geral <= 0 OR v_rtp_geral >= 1 OR v_rtp_geral <> v_rtp_geral THEN
      RETURN json_build_object('ok', false, 'error', 'RTP geral inválido.');
    END IF;
    IF v_rtp_pct < v_config.rtp_limit_min_pct OR v_rtp_pct > v_config.rtp_limit_max_pct THEN
      RETURN json_build_object(
        'ok', false,
        'error', format(
          'RTP geral deve estar entre %s%% e %s%%.',
          TRIM(TO_CHAR(v_config.rtp_limit_min_pct, 'FM999990.00')),
          TRIM(TO_CHAR(v_config.rtp_limit_max_pct, 'FM999990.00'))
        )
      );
    END IF;
  END IF;

  IF v_modo = 'velas' THEN
    IF v_pct_azul < 0 OR v_pct_roxa < 0 OR v_pct_rosa < 0
       OR v_pct_azul <> v_pct_azul OR v_pct_roxa <> v_pct_roxa OR v_pct_rosa <> v_pct_rosa THEN
      RETURN json_build_object('ok', false, 'error', 'Porcentagens de cor inválidas.');
    END IF;
    v_sum_pct := ROUND(v_pct_azul + v_pct_roxa + v_pct_rosa, 2);
    IF v_sum_pct <> 100.00 THEN
      RETURN json_build_object(
        'ok', false,
        'error', 'A soma das porcentagens das velas deve ser exatamente 100%.'
      );
    END IF;
  END IF;

  IF v_modo IN ('rtp_geral', 'velas') THEN
    IF v_geracao_min IS NULL OR v_geracao_max IS NULL
       OR v_geracao_min < 1.00 OR v_geracao_max > v_config.crash_technical_max
       OR v_geracao_min <> v_geracao_min OR v_geracao_max <> v_geracao_max
       OR v_geracao_min > v_geracao_max THEN
      RETURN json_build_object('ok', false, 'error', 'Limites de geração inválidos.');
    END IF;
  END IF;

  IF v_modo = 'crash' THEN
    IF v_min_crash IS NULL OR v_max_crash IS NULL
       OR v_min_crash < 1.00 OR v_max_crash > v_config.crash_technical_max
       OR v_min_crash <> v_min_crash OR v_max_crash <> v_max_crash
       OR v_min_crash > v_max_crash THEN
      RETURN json_build_object('ok', false, 'error', 'Limites de crash inválidos.');
    END IF;
  END IF;

  IF v_queue_size < 10 OR v_queue_size > 200 THEN
    RETURN json_build_object('ok', false, 'error', 'Tamanho da fila deve estar entre 10 e 200.');
  END IF;

  UPDATE public.aviator_config
  SET
    modo_geracao = v_modo,
    rtp_base = v_rtp_geral,
    pct_vela_azul = v_pct_azul,
    pct_vela_roxa = v_pct_roxa,
    pct_vela_rosa = v_pct_rosa,
    geracao_min_crash = v_geracao_min,
    geracao_max_crash = v_geracao_max,
    min_crash = v_min_crash,
    max_crash = v_max_crash,
    queue_size = v_queue_size,
    updated_at = NOW()
  WHERE id = 1;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'registrar_admin_log'
  ) THEN
    PERFORM public.registrar_admin_log(
      'Atualizar Config. Aviator RTP',
      'Modo e parâmetros do Aviator alterados.',
      'sucesso',
      'jogo',
      json_build_object('modo_geracao', v_modo)::jsonb
    );
  END IF;

  RETURN public.obter_aviator_config_admin();
END;
$$;

CREATE OR REPLACE FUNCTION public.obter_aviator_engine_config()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config public.aviator_config%ROWTYPE;
  v_stats JSON;
  v_hours INT;
  v_eff_min NUMERIC;
  v_eff_max NUMERIC;
BEGIN
  SELECT * INTO v_config FROM public.aviator_config WHERE id = 1;
  IF NOT FOUND THEN
    INSERT INTO public.aviator_config (id) VALUES (1);
    SELECT * INTO v_config FROM public.aviator_config WHERE id = 1;
  END IF;

  v_hours := GREATEST(COALESCE(v_config.recovery_window_hours, 24), 1);
  v_stats := public.calcular_aviator_ggr(v_hours);

  IF v_config.modo_geracao = 'crash' THEN
    v_eff_min := v_config.min_crash;
    v_eff_max := v_config.max_crash;
  ELSE
    v_eff_min := v_config.geracao_min_crash;
    v_eff_max := v_config.geracao_max_crash;
  END IF;

  RETURN json_build_object(
    'ok', true,
    'modo_geracao', v_config.modo_geracao,
    'rtp_geral', v_config.rtp_base,
    'pct_vela_azul', v_config.pct_vela_azul,
    'pct_vela_roxa', v_config.pct_vela_roxa,
    'pct_vela_rosa', v_config.pct_vela_rosa,
    'geracao_min_crash', v_config.geracao_min_crash,
    'geracao_max_crash', v_config.geracao_max_crash,
    'min_crash', v_eff_min,
    'max_crash', v_eff_max,
    'min_crash_mul', GREATEST(100, FLOOR(v_eff_min * 100)::INT),
    'max_crash_mul', LEAST(
      FLOOR(v_config.crash_technical_max * 100)::INT,
      FLOOR(v_eff_max * 100)::INT
    ),
    'crash_technical_max', v_config.crash_technical_max,
    'queue_size', v_config.queue_size,
    'config_version', v_config.updated_at,
    'engine_version', v_config.modo_geracao || ':' || v_config.updated_at::TEXT,
    'stats', v_stats
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.obter_aviator_config_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_aviator_config_admin(
  TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, INT
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.obter_aviator_engine_config() TO anon, authenticated, service_role;
