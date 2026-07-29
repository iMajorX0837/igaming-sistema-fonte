-- Hotfix: obter_aviator_config_admin estava sendo sobrescrito sem geracao_min_crash.
-- Sintoma no admin: salvar 1.01 no "Limite mínimo do crash" voltava para 10.00 (fallback de min_crash).
-- Rode no SQL Editor do Supabase.

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
      'rtp_base', v_config.rtp_base,
      'rtp_min', v_config.rtp_min,
      'rtp_max', v_config.rtp_max,
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
      'recovery_enabled', v_config.recovery_enabled,
      'recovery_window_hours', v_config.recovery_window_hours,
      'ggr_target_pct', v_config.ggr_target_pct,
      'recovery_strength', v_config.recovery_strength,
      'recovery_max_adjustment', v_config.recovery_max_adjustment,
      'min_wagered_for_recovery', v_config.min_wagered_for_recovery,
      'recovery_loss_trigger_brl', COALESCE(v_config.recovery_loss_trigger_brl, 10000),
      'recovery_profit_trigger_brl', COALESCE(v_config.recovery_profit_trigger_brl, 10000),
      'updated_at', v_config.updated_at
    ),
    'stats', v_stats
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.obter_aviator_config_admin() TO authenticated;
