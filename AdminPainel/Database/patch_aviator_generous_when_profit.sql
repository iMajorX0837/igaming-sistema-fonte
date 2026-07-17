-- Casa lucrando → velas mais generosas + modo generous mais sensível
-- Rode no Supabase SQL Editor

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

    -- Casa lucrando: sobe RTP (velas mais altas) — usa ajuste máximo, não só intensidade baixa
    IF v_ggr > 0 THEN
      v_profit_boost := LEAST(
        1.0,
        v_ggr / GREATEST(COALESCE(v_config.recovery_profit_trigger_brl, 10000), 1)
      ) * v_config.recovery_max_adjustment;

      IF v_ggr_pct > v_config.ggr_target_pct THEN
        v_profit_boost := v_profit_boost + LEAST(
          v_config.recovery_max_adjustment,
          ((v_ggr_pct - v_config.ggr_target_pct) / 100.0)
            * GREATEST(v_config.recovery_strength, 0.20)
        );
      END IF;

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
    IF v_ggr < 0 AND ABS(v_ggr) >= COALESCE(v_config.recovery_loss_trigger_brl, 10000) * 0.4 THEN
      v_recovery_mode := 'recovering';
    ELSIF v_ggr > 0 AND (
      v_ggr >= COALESCE(v_config.recovery_profit_trigger_brl, 10000) * 0.4
      OR v_ggr_pct >= v_config.ggr_target_pct
    ) THEN
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
