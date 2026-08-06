-- Hotfix: obter_aviator_engine_config no banco está numa versão antiga
-- que NÃO retorna modo_geracao / pct_vela_* / geracao_min|max_crash.
-- Sintoma: admin salva 100/0/0 (tabela ok) mas o motor gera com default 52/38/10.
-- Rode no SQL Editor do Supabase.

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

  IF COALESCE(v_config.modo_geracao, 'velas') = 'crash' THEN
    v_eff_min := v_config.min_crash;
    v_eff_max := v_config.max_crash;
  ELSE
    v_eff_min := COALESCE(v_config.geracao_min_crash, v_config.min_crash, 1.01);
    v_eff_max := COALESCE(v_config.geracao_max_crash, v_config.max_crash, 500);
  END IF;

  v_ggr_bucket := FLOOR(v_ggr / 500);
  v_rtp_bucket := ROUND(v_effective_rtp * 1000);
  -- Inclui updated_at para invalidar fila ao mudar só pct_vela_*
  v_engine_version :=
    COALESCE(v_config.modo_geracao, 'velas')
    || ':' || v_rtp_bucket::TEXT
    || ':' || v_ggr_bucket::TEXT
    || ':' || COALESCE(v_config.updated_at::TEXT, '')
    || ':' || COALESCE(v_config.pct_vela_azul, 0)::TEXT
    || ':' || COALESCE(v_config.pct_vela_roxa, 0)::TEXT
    || ':' || COALESCE(v_config.pct_vela_rosa, 0)::TEXT;

  RETURN json_build_object(
    'ok', true,
    'modo_geracao', COALESCE(v_config.modo_geracao, 'velas'),
    'rtp_geral', v_effective_rtp,
    'rtp_factor', v_effective_rtp,
    'rtp_base', v_config.rtp_base,
    'rtp_min', v_config.rtp_min,
    'rtp_max', v_config.rtp_max,
    'effective_rtp', v_effective_rtp,
    'pct_vela_azul', v_config.pct_vela_azul,
    'pct_vela_roxa', v_config.pct_vela_roxa,
    'pct_vela_rosa', v_config.pct_vela_rosa,
    'geracao_min_crash', v_config.geracao_min_crash,
    'geracao_max_crash', v_config.geracao_max_crash,
    'min_crash', v_eff_min,
    'max_crash', v_eff_max,
    'min_crash_mul', GREATEST(101, FLOOR(v_eff_min * 100)::INT),
    'max_crash_mul', LEAST(
      FLOOR(COALESCE(v_config.crash_technical_max, 1000) * 100)::INT,
      FLOOR(v_eff_max * 100)::INT
    ),
    'crash_technical_max', v_config.crash_technical_max,
    'recovery_enabled', v_config.recovery_enabled,
    'recovery_adjustment', v_config.rtp_base - v_effective_rtp,
    'recovery_mode', v_recovery_mode,
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

REVOKE EXECUTE ON FUNCTION public.obter_aviator_engine_config() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.obter_aviator_engine_config() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.obter_aviator_engine_config() TO service_role;
