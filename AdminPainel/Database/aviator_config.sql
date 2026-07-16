-- Configuração de RTP / recuperação da casa — Aviator
-- Execute no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS public.aviator_config (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),

  -- RTP base (ex.: 0.9700 = 97% retorno ao jogador, ~3% margem da casa)
  rtp_base NUMERIC(6, 4) NOT NULL DEFAULT 0.9700,
  rtp_min NUMERIC(6, 4) NOT NULL DEFAULT 0.9000,
  rtp_max NUMERIC(6, 4) NOT NULL DEFAULT 0.9900,

  -- Recovery automático (GGR)
  recovery_enabled BOOLEAN NOT NULL DEFAULT true,
  recovery_window_hours INT NOT NULL DEFAULT 24,
  ggr_target_pct NUMERIC(6, 2) NOT NULL DEFAULT 3.00,
  recovery_strength NUMERIC(6, 4) NOT NULL DEFAULT 0.2500,
  recovery_max_adjustment NUMERIC(6, 4) NOT NULL DEFAULT 0.0200,
  min_wagered_for_recovery NUMERIC(14, 2) NOT NULL DEFAULT 100.00,

  -- Limites de crash
  min_crash NUMERIC(8, 2) NOT NULL DEFAULT 1.01,
  max_crash NUMERIC(8, 2) NOT NULL DEFAULT 500.00,
  queue_size INT NOT NULL DEFAULT 50,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

INSERT INTO public.aviator_config (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.aviator_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin gerencia aviator_config" ON public.aviator_config;
CREATE POLICY "Admin gerencia aviator_config"
  ON public.aviator_config
  FOR ALL
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

-- Estatísticas de GGR (somente apostas finalizadas)
CREATE OR REPLACE FUNCTION public.calcular_aviator_ggr(p_window_hours INT DEFAULT 24)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wagered NUMERIC := 0;
  v_paid NUMERIC := 0;
  v_bets BIGINT := 0;
  v_rtp_real NUMERIC := 0;
  v_ggr NUMERIC := 0;
  v_ggr_pct NUMERIC := 0;
  v_hours INT := GREATEST(COALESCE(p_window_hours, 24), 1);
BEGIN
  SELECT
    COALESCE(SUM(b.bet_amount), 0),
    COALESCE(SUM(
      CASE
        WHEN b.status = 'cashed_out' THEN b.bet_amount * COALESCE(b.cashout_multiplier, 0)
        ELSE 0
      END
    ), 0),
    COUNT(*)
  INTO v_wagered, v_paid, v_bets
  FROM public.aviator_bets b
  WHERE b.placed_at >= NOW() - (v_hours || ' hours')::interval
    AND b.status IN ('cashed_out', 'crashed');

  v_ggr := v_wagered - v_paid;
  IF v_wagered > 0 THEN
    v_rtp_real := ROUND((v_paid / v_wagered) * 100, 4);
    v_ggr_pct := ROUND((v_ggr / v_wagered) * 100, 4);
  END IF;

  RETURN json_build_object(
    'ok', true,
    'window_hours', v_hours,
    'total_wagered', v_wagered,
    'total_paid', v_paid,
    'ggr', v_ggr,
    'ggr_pct', v_ggr_pct,
    'rtp_real_pct', v_rtp_real,
    'bet_count', v_bets
  );
END;
$$;

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
      'min_crash', v_config.min_crash,
      'max_crash', v_config.max_crash,
      'queue_size', v_config.queue_size,
      'updated_at', v_config.updated_at
    ),
    'stats', v_stats
  );
END;
$$;

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
  IF v_ggr_target_pct < 0 OR v_ggr_target_pct > 50 THEN
    RETURN json_build_object('ok', false, 'error', 'Margem alvo (GGR) deve estar entre 0% e 50%.');
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
    min_crash = v_min_crash,
    max_crash = v_max_crash,
    queue_size = v_queue_size,
    updated_at = NOW()
  WHERE id = 1;

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

  RETURN public.obter_aviator_config_admin();
END;
$$;

-- Motor do jogo (service role / Node) — sem auth de admin
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
  v_effective_rtp NUMERIC;
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
    -- delta positivo = casa abaixo da margem alvo → reduz RTP
    v_edge_delta := v_config.ggr_target_pct - v_ggr_pct;
    v_adjustment := (v_edge_delta / 100.0) * v_config.recovery_strength;
    v_adjustment := GREATEST(
      -v_config.recovery_max_adjustment,
      LEAST(v_config.recovery_max_adjustment, v_adjustment)
    );
    v_effective_rtp := v_config.rtp_base - v_adjustment;
  END IF;

  v_effective_rtp := GREATEST(v_config.rtp_min, LEAST(v_config.rtp_max, v_effective_rtp));

  RETURN json_build_object(
    'ok', true,
    'rtp_factor', v_effective_rtp,
    'rtp_base', v_config.rtp_base,
    'rtp_min', v_config.rtp_min,
    'rtp_max', v_config.rtp_max,
    'effective_rtp', v_effective_rtp,
    'recovery_enabled', v_config.recovery_enabled,
    'recovery_adjustment', v_config.rtp_base - v_effective_rtp,
    'min_crash_mul', GREATEST(101, FLOOR(v_config.min_crash * 100)::INT),
    'max_crash_mul', LEAST(1000000, FLOOR(v_config.max_crash * 100)::INT),
    'queue_size', v_config.queue_size,
    'config_version', v_config.updated_at,
    'stats', v_stats,
    'ggr_target_pct', v_config.ggr_target_pct,
    'ggr_pct', v_ggr_pct,
    'rtp_real_pct', v_rtp_real
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.calcular_aviator_ggr(INT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.obter_aviator_config_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_aviator_config_admin(
  NUMERIC, NUMERIC, NUMERIC, BOOLEAN, INT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, INT
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.obter_aviator_engine_config() TO anon, authenticated, service_role;

COMMENT ON TABLE public.aviator_config IS 'RTP base, limites e recovery automático do Aviator';

-- Auditoria (requer trg_admin_audit_log de admin_logs.sql)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'trg_admin_audit_log'
  )
     AND to_regclass('public.aviator_config') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_admin_audit_aviator_config ON public.aviator_config;
    CREATE TRIGGER trg_admin_audit_aviator_config
      AFTER INSERT OR UPDATE OR DELETE ON public.aviator_config
      FOR EACH ROW EXECUTE FUNCTION public.trg_admin_audit_log();
  END IF;
END;
$$;

-- Rótulo amigável nos logs (opcional se admin_logs.sql já foi executado)
CREATE OR REPLACE FUNCTION public._admin_table_label(p_table TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_table
    WHEN 'cms_items' THEN 'Item CMS'
    WHEN 'home_sections' THEN 'Seção Home'
    WHEN 'site_config' THEN 'Config. Site'
    WHEN 'aviator_config' THEN 'Config. Aviator RTP'
    WHEN 'all_games_page_config' THEN 'Página Todos Jogos'
    WHEN 'all_games_providers' THEN 'Provedor (Todos Jogos)'
    WHEN 'all_games_categories' THEN 'Categoria (Todos Jogos)'
    WHEN 'cupons' THEN 'Cupom'
    WHEN 'prize_wheel_config' THEN 'Config. Roleta'
    WHEN 'prize_wheel_segments' THEN 'Segmento Roleta'
    WHEN 'platform_providers' THEN 'Provedor de Jogo'
    WHEN 'platform_games' THEN 'Jogo'
    WHEN 'vip_niveis' THEN 'Nível VIP'
    WHEN 'usuarios' THEN 'Usuário'
    ELSE p_table
  END;
$$;

CREATE OR REPLACE FUNCTION public._admin_table_categoria(p_table TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_table IN ('platform_providers', 'platform_games', 'aviator_config') THEN 'jogo'
    WHEN p_table LIKE 'prize_wheel%' THEN 'roleta'
    WHEN p_table = 'cupons' THEN 'cupom'
    WHEN p_table = 'vip_niveis' THEN 'vip'
    WHEN p_table = 'usuarios' THEN 'usuario'
    ELSE 'site'
  END;
$$;
