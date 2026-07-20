-- Aviator RTP v2 — RTP geral de referência, porcentagens de cor, crash geral
-- Sem recovery GGR no motor de produção. Rode no Supabase SQL Editor.

ALTER TABLE public.aviator_config
  ADD COLUMN IF NOT EXISTS pct_vela_azul NUMERIC(5, 2) NOT NULL DEFAULT 52.00,
  ADD COLUMN IF NOT EXISTS pct_vela_roxa NUMERIC(5, 2) NOT NULL DEFAULT 38.00,
  ADD COLUMN IF NOT EXISTS pct_vela_rosa NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
  ADD COLUMN IF NOT EXISTS rtp_limit_min_pct NUMERIC(5, 2) NOT NULL DEFAULT 85.00,
  ADD COLUMN IF NOT EXISTS rtp_limit_max_pct NUMERIC(5, 2) NOT NULL DEFAULT 99.99,
  ADD COLUMN IF NOT EXISTS crash_technical_max NUMERIC(10, 2) NOT NULL DEFAULT 1000.00;

-- Remove assinaturas antigas da função admin
DROP FUNCTION IF EXISTS public.atualizar_aviator_config_admin(
  NUMERIC, NUMERIC, NUMERIC, BOOLEAN, INT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, INT
);
DROP FUNCTION IF EXISTS public.atualizar_aviator_config_admin(
  NUMERIC, NUMERIC, NUMERIC, BOOLEAN, INT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, INT
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
      'rtp_geral', v_config.rtp_base,
      'pct_vela_azul', v_config.pct_vela_azul,
      'pct_vela_roxa', v_config.pct_vela_roxa,
      'pct_vela_rosa', v_config.pct_vela_rosa,
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
  p_rtp_geral NUMERIC DEFAULT NULL,
  p_pct_vela_azul NUMERIC DEFAULT NULL,
  p_pct_vela_roxa NUMERIC DEFAULT NULL,
  p_pct_vela_rosa NUMERIC DEFAULT NULL,
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
  v_rtp_geral NUMERIC;
  v_pct_azul NUMERIC;
  v_pct_roxa NUMERIC;
  v_pct_rosa NUMERIC;
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

  v_rtp_geral := COALESCE(p_rtp_geral, v_config.rtp_base);
  v_pct_azul := COALESCE(p_pct_vela_azul, v_config.pct_vela_azul);
  v_pct_roxa := COALESCE(p_pct_vela_roxa, v_config.pct_vela_roxa);
  v_pct_rosa := COALESCE(p_pct_vela_rosa, v_config.pct_vela_rosa);
  v_min_crash := COALESCE(p_min_crash, v_config.min_crash);
  v_max_crash := COALESCE(p_max_crash, v_config.max_crash);
  v_queue_size := COALESCE(p_queue_size, v_config.queue_size);

  v_rtp_pct := v_rtp_geral * 100;
  IF v_rtp_geral IS NULL OR v_rtp_geral <= 0 OR v_rtp_geral >= 1
     OR v_rtp_geral <> v_rtp_geral THEN
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

  IF v_min_crash IS NULL OR v_max_crash IS NULL
     OR v_min_crash < 1.00 OR v_max_crash > v_config.crash_technical_max
     OR v_min_crash <> v_min_crash OR v_max_crash <> v_max_crash
     OR v_min_crash > v_max_crash THEN
    RETURN json_build_object('ok', false, 'error', 'Limites de crash inválidos.');
  END IF;

  IF v_queue_size < 10 OR v_queue_size > 200 THEN
    RETURN json_build_object('ok', false, 'error', 'Tamanho da fila deve estar entre 10 e 200.');
  END IF;

  UPDATE public.aviator_config
  SET
    rtp_base = v_rtp_geral,
    pct_vela_azul = v_pct_azul,
    pct_vela_roxa = v_pct_roxa,
    pct_vela_rosa = v_pct_rosa,
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
      'Parâmetros de RTP e velas do Aviator alterados.',
      'sucesso',
      'jogo',
      json_build_object(
        'rtp_geral', v_rtp_geral,
        'pct_vela_azul', v_pct_azul,
        'pct_vela_roxa', v_pct_roxa,
        'pct_vela_rosa', v_pct_rosa,
        'min_crash', v_min_crash,
        'max_crash', v_max_crash
      )::jsonb
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
BEGIN
  SELECT * INTO v_config FROM public.aviator_config WHERE id = 1;
  IF NOT FOUND THEN
    INSERT INTO public.aviator_config (id) VALUES (1);
    SELECT * INTO v_config FROM public.aviator_config WHERE id = 1;
  END IF;

  v_hours := GREATEST(COALESCE(v_config.recovery_window_hours, 24), 1);
  v_stats := public.calcular_aviator_ggr(v_hours);

  RETURN json_build_object(
    'ok', true,
    'rtp_geral', v_config.rtp_base,
    'pct_vela_azul', v_config.pct_vela_azul,
    'pct_vela_roxa', v_config.pct_vela_roxa,
    'pct_vela_rosa', v_config.pct_vela_rosa,
    'min_crash', v_config.min_crash,
    'max_crash', v_config.max_crash,
    'min_crash_mul', GREATEST(100, FLOOR(v_config.min_crash * 100)::INT),
    'max_crash_mul', LEAST(
      FLOOR(v_config.crash_technical_max * 100)::INT,
      FLOOR(v_config.max_crash * 100)::INT
    ),
    'queue_size', v_config.queue_size,
    'config_version', v_config.updated_at,
    'engine_version', v_config.updated_at::TEXT,
    'stats', v_stats
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.obter_aviator_config_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_aviator_config_admin(
  NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, INT
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.obter_aviator_engine_config() TO anon, authenticated, service_role;
