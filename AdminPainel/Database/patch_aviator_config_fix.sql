-- FIX Aviator config — rode ESTE arquivo no Supabase SQL Editor
-- Corrige erro de GRANT / assinatura da função atualizar_aviator_config_admin

-- 1) Colunas novas (recovery contínuo em R$)
ALTER TABLE public.aviator_config
  ADD COLUMN IF NOT EXISTS recovery_loss_trigger_brl NUMERIC(14, 2) NOT NULL DEFAULT 10000.00,
  ADD COLUMN IF NOT EXISTS recovery_profit_trigger_brl NUMERIC(14, 2) NOT NULL DEFAULT 10000.00;

-- 2) Remove versões antigas da função (12 ou 15 params)
DROP FUNCTION IF EXISTS public.atualizar_aviator_config_admin(
  NUMERIC, NUMERIC, NUMERIC, BOOLEAN, INT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, INT
);
DROP FUNCTION IF EXISTS public.atualizar_aviator_config_admin(
  NUMERIC, NUMERIC, NUMERIC, BOOLEAN, INT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, INT
);

-- 3) Função admin atualizada (14 params + GGR até 100%)
CREATE OR REPLACE FUNCTION public.atualizar_aviator_config_admin(
  p_rtp_base NUMERIC DEFAULT NULL,
  p_rtp_min NUMERIC DEFAULT NULL,
  p_rtp_max NUMERIC DEFAULT NULL,
  p_recovery_enabled BOOLEAN DEFAULT NULL,
  p_recovery_window_hours INT DEFAULT NULL,
  p_ggr_target_pct NUMERIC DEFAULT NULL,
  p_recovery_strength NUMERIC DEFAULT NULL,
  p_recovery_max_adjustment NUMERIC DEFAULT NULL,
  p_min_wagered_for_recovery NUMERIC DEFAULT NULL,
  p_recovery_loss_trigger_brl NUMERIC DEFAULT NULL,
  p_recovery_profit_trigger_brl NUMERIC DEFAULT NULL,
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
  v_rtp_base NUMERIC;
  v_rtp_min NUMERIC;
  v_rtp_max NUMERIC;
  v_recovery_enabled BOOLEAN;
  v_recovery_window_hours INT;
  v_ggr_target_pct NUMERIC;
  v_recovery_strength NUMERIC;
  v_recovery_max_adjustment NUMERIC;
  v_min_wagered NUMERIC;
  v_loss_trigger NUMERIC;
  v_profit_trigger NUMERIC;
  v_min_crash NUMERIC;
  v_max_crash NUMERIC;
  v_queue_size INT;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT * INTO v_config FROM public.aviator_config WHERE id = 1;
  IF NOT FOUND THEN
    INSERT INTO public.aviator_config (id) VALUES (1);
    SELECT * INTO v_config FROM public.aviator_config WHERE id = 1;
  END IF;

  v_rtp_base := COALESCE(p_rtp_base, v_config.rtp_base);
  v_rtp_min := COALESCE(p_rtp_min, v_config.rtp_min);
  v_rtp_max := COALESCE(p_rtp_max, v_config.rtp_max);
  v_recovery_enabled := COALESCE(p_recovery_enabled, v_config.recovery_enabled);
  v_recovery_window_hours := COALESCE(p_recovery_window_hours, v_config.recovery_window_hours);
  v_ggr_target_pct := COALESCE(p_ggr_target_pct, v_config.ggr_target_pct);
  v_recovery_strength := COALESCE(p_recovery_strength, v_config.recovery_strength);
  v_recovery_max_adjustment := COALESCE(p_recovery_max_adjustment, v_config.recovery_max_adjustment);
  v_min_wagered := COALESCE(p_min_wagered_for_recovery, v_config.min_wagered_for_recovery);
  v_loss_trigger := COALESCE(p_recovery_loss_trigger_brl, v_config.recovery_loss_trigger_brl, 10000);
  v_profit_trigger := COALESCE(p_recovery_profit_trigger_brl, v_config.recovery_profit_trigger_brl, 10000);
  v_min_crash := COALESCE(p_min_crash, v_config.min_crash);
  v_max_crash := COALESCE(p_max_crash, v_config.max_crash);
  v_queue_size := COALESCE(p_queue_size, v_config.queue_size);

  IF v_rtp_base <= 0 OR v_rtp_base >= 1 THEN
    RETURN json_build_object('ok', false, 'error', 'RTP base deve estar entre 0 e 1 (ex.: 0.97 = 97%).');
  END IF;
  IF v_rtp_min <= 0 OR v_rtp_max >= 1 OR v_rtp_min > v_rtp_max THEN
    RETURN json_build_object('ok', false, 'error', 'Limites de RTP inválidos.');
  END IF;
  IF v_rtp_base < v_rtp_min OR v_rtp_base > v_rtp_max THEN
    RETURN json_build_object('ok', false, 'error', 'RTP base deve estar entre rtp_min e rtp_max.');
  END IF;
  IF v_recovery_window_hours < 1 OR v_recovery_window_hours > 168 THEN
    RETURN json_build_object('ok', false, 'error', 'Janela de recovery deve ser entre 1 e 168 horas.');
  END IF;
  IF v_ggr_target_pct < 0 OR v_ggr_target_pct > 100 THEN
    RETURN json_build_object('ok', false, 'error', 'Margem alvo (GGR) deve estar entre 0% e 100%.');
  END IF;
  IF v_recovery_strength < 0 OR v_recovery_strength > 1 THEN
    RETURN json_build_object('ok', false, 'error', 'Intensidade de recovery deve estar entre 0 e 1.');
  END IF;
  IF v_recovery_max_adjustment < 0 OR v_recovery_max_adjustment > 0.10 THEN
    RETURN json_build_object('ok', false, 'error', 'Ajuste máximo de RTP deve estar entre 0 e 0.10 (10%).');
  END IF;
  IF v_min_wagered < 0 THEN
    RETURN json_build_object('ok', false, 'error', 'Volume mínimo para recovery não pode ser negativo.');
  END IF;
  IF v_loss_trigger < 0 OR v_profit_trigger < 0 THEN
    RETURN json_build_object('ok', false, 'error', 'Gatilhos em R$ não podem ser negativos.');
  END IF;
  IF v_min_crash < 1.00 OR v_max_crash > 10000 OR v_min_crash >= v_max_crash THEN
    RETURN json_build_object('ok', false, 'error', 'Limites de crash inválidos.');
  END IF;
  IF v_queue_size < 10 OR v_queue_size > 200 THEN
    RETURN json_build_object('ok', false, 'error', 'Tamanho da fila deve estar entre 10 e 200.');
  END IF;

  UPDATE public.aviator_config
  SET
    rtp_base = v_rtp_base,
    rtp_min = v_rtp_min,
    rtp_max = v_rtp_max,
    recovery_enabled = v_recovery_enabled,
    recovery_window_hours = v_recovery_window_hours,
    ggr_target_pct = v_ggr_target_pct,
    recovery_strength = v_recovery_strength,
    recovery_max_adjustment = v_recovery_max_adjustment,
    min_wagered_for_recovery = v_min_wagered,
    recovery_loss_trigger_brl = v_loss_trigger,
    recovery_profit_trigger_brl = v_profit_trigger,
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
      'Parâmetros de RTP/recovery do Aviator alterados.',
      'sucesso',
      'jogo',
      json_build_object(
        'rtp_base', v_rtp_base,
        'recovery_enabled', v_recovery_enabled,
        'ggr_target_pct', v_ggr_target_pct
      )::jsonb
    );
  END IF;

  RETURN public.obter_aviator_config_admin();
END;
$$;

-- 4) obter admin — expõe campos novos
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

  v_stats := public.calcular_aviator_ggr(v_config.recovery_window_hours);

  RETURN json_build_object(
    'ok', true,
    'config', json_build_object(
      'rtp_base', v_config.rtp_base,
      'rtp_min', v_config.rtp_min,
      'rtp_max', v_config.rtp_max,
      'recovery_enabled', v_config.recovery_enabled,
      'recovery_window_hours', v_config.recovery_window_hours,
      'ggr_target_pct', v_config.ggr_target_pct,
      'recovery_strength', v_config.recovery_strength,
      'recovery_max_adjustment', v_config.recovery_max_adjustment,
      'min_wagered_for_recovery', v_config.min_wagered_for_recovery,
      'recovery_loss_trigger_brl', COALESCE(v_config.recovery_loss_trigger_brl, 10000),
      'recovery_profit_trigger_brl', COALESCE(v_config.recovery_profit_trigger_brl, 10000),
      'min_crash', v_config.min_crash,
      'max_crash', v_config.max_crash,
      'queue_size', v_config.queue_size,
      'updated_at', v_config.updated_at
    ),
    'stats', v_stats
  );
END;
$$;

-- 5) Motor — recovery contínuo + engine_version
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
  v_wagered NUMERIC := 0;
  v_paid NUMERIC := 0;
  v_ggr NUMERIC := 0;
  v_ggr_pct NUMERIC := 0;
  v_rtp_real NUMERIC := 0;
  v_edge_delta NUMERIC := 0;
  v_adjustment NUMERIC := 0;
  v_loss_boost NUMERIC := 0;
  v_profit_boost NUMERIC := 0;
  v_effective_rtp NUMERIC;
  v_recovery_mode TEXT := 'balanced';
  v_ggr_bucket BIGINT;
  v_rtp_bucket INT;
  v_engine_version TEXT;
  v_hours INT;
BEGIN
  SELECT * INTO v_config FROM public.aviator_config WHERE id = 1;
  IF NOT FOUND THEN
    INSERT INTO public.aviator_config (id) VALUES (1);
    SELECT * INTO v_config FROM public.aviator_config WHERE id = 1;
  END IF;

  v_hours := GREATEST(v_config.recovery_window_hours, 1);
  v_stats := public.calcular_aviator_ggr(v_hours);

  v_wagered := COALESCE((v_stats->>'total_wagered')::NUMERIC, 0);
  v_paid := COALESCE((v_stats->>'total_paid')::NUMERIC, 0);
  v_ggr := COALESCE((v_stats->>'ggr')::NUMERIC, 0);
  v_ggr_pct := COALESCE((v_stats->>'ggr_pct')::NUMERIC, 0);
  v_rtp_real := COALESCE((v_stats->>'rtp_real_pct')::NUMERIC, 0);

  v_effective_rtp := v_config.rtp_base;

  IF v_config.recovery_enabled AND v_wagered >= v_config.min_wagered_for_recovery THEN
    v_edge_delta := v_config.ggr_target_pct - v_ggr_pct;
    v_adjustment := (v_edge_delta / 100.0) * v_config.recovery_strength;

    IF v_ggr < 0 AND COALESCE(v_config.recovery_loss_trigger_brl, 0) > 0 THEN
      v_loss_boost := LEAST(1.0, ABS(v_ggr) / v_config.recovery_loss_trigger_brl)
        * v_config.recovery_max_adjustment;
      v_adjustment := v_adjustment + v_loss_boost;
    END IF;

    IF v_ggr > 0 AND COALESCE(v_config.recovery_profit_trigger_brl, 0) > 0 THEN
      v_profit_boost := LEAST(1.0, v_ggr / v_config.recovery_profit_trigger_brl)
        * v_config.recovery_max_adjustment * 0.5;
      v_adjustment := v_adjustment - v_profit_boost;
    END IF;

    v_adjustment := GREATEST(
      -v_config.recovery_max_adjustment,
      LEAST(v_config.recovery_max_adjustment, v_adjustment)
    );
    v_effective_rtp := v_config.rtp_base - v_adjustment;
  END IF;

  v_effective_rtp := GREATEST(v_config.rtp_min, LEAST(v_config.rtp_max, v_effective_rtp));

  IF v_config.recovery_enabled THEN
    IF v_ggr <= -COALESCE(v_config.recovery_loss_trigger_brl, 10000) * 0.5 THEN
      v_recovery_mode := 'recovering';
    ELSIF v_ggr >= COALESCE(v_config.recovery_profit_trigger_brl, 10000) * 0.5 THEN
      v_recovery_mode := 'generous';
    END IF;
  END IF;

  v_ggr_bucket := FLOOR(v_ggr / 500);
  v_rtp_bucket := ROUND(v_effective_rtp * 1000);
  v_engine_version := v_rtp_bucket::TEXT || ':' || v_ggr_bucket::TEXT;

  RETURN json_build_object(
    'ok', true,
    'rtp_factor', v_effective_rtp,
    'rtp_base', v_config.rtp_base,
    'rtp_min', v_config.rtp_min,
    'rtp_max', v_config.rtp_max,
    'effective_rtp', v_effective_rtp,
    'recovery_enabled', v_config.recovery_enabled,
    'recovery_adjustment', v_config.rtp_base - v_effective_rtp,
    'recovery_mode', v_recovery_mode,
    'min_crash_mul', GREATEST(101, FLOOR(v_config.min_crash * 100)::INT),
    'max_crash_mul', LEAST(1000000, FLOOR(v_config.max_crash * 100)::INT),
    'queue_size', v_config.queue_size,
    'config_version', v_config.updated_at,
    'engine_version', v_engine_version,
    'stats', v_stats,
    'ggr', v_ggr,
    'ggr_target_pct', v_config.ggr_target_pct,
    'ggr_pct', v_ggr_pct,
    'rtp_real_pct', v_rtp_real,
    'recovery_loss_trigger_brl', COALESCE(v_config.recovery_loss_trigger_brl, 10000),
    'recovery_profit_trigger_brl', COALESCE(v_config.recovery_profit_trigger_brl, 10000)
  );
END;
$$;

-- 6) GRANT — assinatura correta (14 parâmetros)
GRANT EXECUTE ON FUNCTION public.obter_aviator_config_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_aviator_config_admin(
  NUMERIC, NUMERIC, NUMERIC, BOOLEAN, INT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, INT
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.obter_aviator_engine_config() TO anon, authenticated, service_role;
