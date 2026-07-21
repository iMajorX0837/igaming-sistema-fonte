-- =============================================================================
-- PARTE 1/5 — Funções (pode rodar com API ligada)
-- Lock mínimo. Execute e aguarde "Success".
-- =============================================================================

CREATE OR REPLACE FUNCTION public.validate_deposito_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_min NUMERIC;
  v_max NUMERIC;
BEGIN
  SELECT deposito_minimo, deposito_maximo
  INTO v_min, v_max
  FROM public.site_config
  WHERE id = 1;

  v_min := COALESCE(v_min, 20);
  v_max := COALESCE(v_max, 1000000);

  IF NEW.valor < v_min THEN
    RAISE EXCEPTION 'Valor mínimo de depósito: R$ %', v_min;
  END IF;

  IF NEW.valor > v_max THEN
    RAISE EXCEPTION 'Valor máximo de depósito: R$ %', v_max;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_saque_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_min NUMERIC;
  v_max NUMERIC;
BEGIN
  SELECT saque_minimo, saque_maximo
  INTO v_min, v_max
  FROM public.site_config
  WHERE id = 1;

  v_min := COALESCE(v_min, 50);
  v_max := COALESCE(v_max, 1000000);

  IF NEW.valor < v_min THEN
    RAISE EXCEPTION 'Valor mínimo de saque: R$ %', v_min;
  END IF;

  IF NEW.valor > v_max THEN
    RAISE EXCEPTION 'Valor máximo de saque: R$ %', v_max;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirmar_deposito_pix_pago_server(
  p_deposito_id UUID,
  p_usuario_id UUID,
  p_gateway_check_id TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valor NUMERIC;
  v_status TEXT;
  v_usuario_id UUID;
  v_gateway_check_id TEXT;
  v_vip JSON;
  v_nivel INT;
  v_total NUMERIC;
  v_rollover NUMERIC;
BEGIN
  IF current_user NOT IN ('postgres', 'supabase_admin', 'service_role') THEN
    RETURN json_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF p_gateway_check_id IS NULL OR btrim(p_gateway_check_id) = '' THEN
    RETURN json_build_object('ok', false, 'error', 'gateway_check_required');
  END IF;

  SELECT usuario_id, valor, status, gateway_check_id
  INTO v_usuario_id, v_valor, v_status, v_gateway_check_id
  FROM public.depositos
  WHERE id = p_deposito_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'deposit_not_found');
  END IF;

  IF v_usuario_id IS DISTINCT FROM p_usuario_id THEN
    RETURN json_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF v_gateway_check_id IS NULL OR v_gateway_check_id <> btrim(p_gateway_check_id) THEN
    RETURN json_build_object('ok', false, 'error', 'gateway_mismatch');
  END IF;

  IF v_status = 'aprovado' THEN
    SELECT vip_nivel, total_depositado INTO v_nivel, v_total
    FROM public.usuarios WHERE id = v_usuario_id;

    RETURN json_build_object(
      'ok', true,
      'already', true,
      'vip_nivel', COALESCE(v_nivel, 1),
      'total_depositado', COALESCE(v_total, 0),
      'subiu_nivel', false,
      'bonus_upgrade', 0
    );
  END IF;

  IF v_status <> 'pendente' THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_status');
  END IF;

  UPDATE public.depositos
  SET status = 'aprovado', updated_at = NOW()
  WHERE id = p_deposito_id;

  PERFORM set_config('app.skip_usuario_guard', 'true', true);
  UPDATE public.usuarios
  SET saldo = saldo + v_valor
  WHERE id = v_usuario_id;

  v_vip := public.processar_vip_deposito(v_usuario_id, p_deposito_id, v_valor);
  v_rollover := public.aplicar_rollover_deposito(v_usuario_id, v_valor);

  RETURN (json_build_object(
    'ok', true,
    'already', false,
    'rollover_pendente', COALESCE(v_rollover, 0)
  )::jsonb || COALESCE(v_vip, '{}'::json)::jsonb)::json;
END;
$$;

COMMENT ON FUNCTION public.confirmar_deposito_pix_pago_server(UUID, UUID, TEXT) IS
  'Confirma depósito PIX somente via PlayFiverAPI (service_role), com vínculo gateway_check_id.';

REVOKE ALL ON FUNCTION public.confirmar_deposito_pix_pago_server(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirmar_deposito_pix_pago_server(UUID, UUID, TEXT) TO service_role;
