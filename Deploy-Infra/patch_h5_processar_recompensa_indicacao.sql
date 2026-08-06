-- =============================================================================
-- Patch H5 — processar_recompensa_indicacao: anti double-pay + só service_role
-- Execute no SQL Editor do Supabase.
--
-- - FOR UPDATE + claim atômico em indicacao_recompensa_paga antes de creditar
-- - REVOKE authenticated/anon (RPC direto bloqueado)
-- - confirmar_deposito_pix_pago_server passa a pagar indicação (fluxo produção)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.processar_recompensa_indicacao(
  p_usuario_indicado_id UUID,
  p_deposito_id UUID,
  p_valor_deposito NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_indicado_por TEXT;
  v_ja_paga BOOLEAN;
  v_recompensa NUMERIC;
  v_deposito_min NUMERIC;
  v_global_recompensa NUMERIC;
  v_global_deposito_min NUMERIC;
  v_referrer_id UUID;
  v_aprovados INT;
  v_claimed UUID;
BEGIN
  IF p_usuario_indicado_id IS NULL THEN
    RETURN json_build_object('ok', true, 'aplicada', false, 'motivo', 'usuario_invalido');
  END IF;

  SELECT u.indicado_por, COALESCE(u.indicacao_recompensa_paga, false)
  INTO v_indicado_por, v_ja_paga
  FROM public.usuarios u
  WHERE u.id = p_usuario_indicado_id
  FOR UPDATE;

  IF NOT FOUND OR v_indicado_por IS NULL OR TRIM(v_indicado_por) = '' OR v_ja_paga THEN
    RETURN json_build_object('ok', true, 'aplicada', false);
  END IF;

  SELECT
    COALESCE(sc.indicacao_recompensa, 0),
    COALESCE(sc.indicacao_deposito_minimo, 50)
  INTO v_global_recompensa, v_global_deposito_min
  FROM public.site_config sc
  WHERE sc.id = 1;

  v_global_recompensa := COALESCE(v_global_recompensa, 0);
  v_global_deposito_min := COALESCE(v_global_deposito_min, 0);

  SELECT u.id
  INTO v_referrer_id
  FROM public.usuarios u
  WHERE u.link_indicação = v_indicado_por
  LIMIT 1;

  IF v_referrer_id IS NULL OR v_referrer_id = p_usuario_indicado_id THEN
    RETURN json_build_object('ok', true, 'aplicada', false, 'motivo', 'indicador_invalido');
  END IF;

  SELECT
    COALESCE(u.indicacao_recompensa_custom, v_global_recompensa),
    COALESCE(u.indicacao_deposito_minimo_custom, v_global_deposito_min)
  INTO v_recompensa, v_deposito_min
  FROM public.usuarios u
  WHERE u.id = v_referrer_id;

  v_recompensa := COALESCE(v_recompensa, 0);
  v_deposito_min := COALESCE(v_deposito_min, 0);

  IF v_recompensa <= 0 THEN
    RETURN json_build_object('ok', true, 'aplicada', false, 'motivo', 'desativada');
  END IF;

  SELECT COUNT(*)::INT
  INTO v_aprovados
  FROM public.depositos d
  WHERE d.usuario_id = p_usuario_indicado_id
    AND d.status = 'aprovado';

  IF COALESCE(v_aprovados, 0) != 1 THEN
    RETURN json_build_object('ok', true, 'aplicada', false, 'motivo', 'nao_primeiro_deposito');
  END IF;

  IF COALESCE(p_valor_deposito, 0) < v_deposito_min THEN
    RETURN json_build_object('ok', true, 'aplicada', false, 'motivo', 'deposito_insuficiente');
  END IF;

  UPDATE public.usuarios
  SET
    indicacao_recompensa_paga = true,
    indicacao_recompensa_valor_pago = v_recompensa
  WHERE id = p_usuario_indicado_id
    AND COALESCE(indicacao_recompensa_paga, false) = false
  RETURNING id INTO v_claimed;

  IF v_claimed IS NULL THEN
    RETURN json_build_object('ok', true, 'aplicada', false, 'motivo', 'ja_paga');
  END IF;

  PERFORM set_config('app.skip_usuario_guard', 'true', true);

  UPDATE public.usuarios
  SET saldo = COALESCE(saldo, 0) + v_recompensa
  WHERE id = v_referrer_id;

  RETURN json_build_object(
    'ok', true,
    'aplicada', true,
    'indicador_id', v_referrer_id,
    'valor', v_recompensa,
    'deposito_id', p_deposito_id
  );
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
  v_indicacao JSON;
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
  v_indicacao := public.processar_recompensa_indicacao(v_usuario_id, p_deposito_id, v_valor);

  RETURN (json_build_object(
    'ok', true,
    'already', false,
    'rollover_pendente', COALESCE(v_rollover, 0),
    'indicacao', v_indicacao
  )::jsonb || COALESCE(v_vip, '{}'::json)::jsonb)::json;
END;
$$;

REVOKE ALL ON FUNCTION public.processar_recompensa_indicacao(UUID, UUID, NUMERIC) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.processar_recompensa_indicacao(UUID, UUID, NUMERIC) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.processar_recompensa_indicacao(UUID, UUID, NUMERIC) TO service_role;

COMMENT ON FUNCTION public.processar_recompensa_indicacao(UUID, UUID, NUMERIC) IS
  'H5: recompensa de indicação atômica; invocável só via service_role ou funções internas SECURITY DEFINER.';
