-- Aprova depósito PIX, credita saldo e processa upgrade VIP.
-- Execute no SQL Editor do Supabase (ou use vip_system.sql que já inclui esta versão).

CREATE OR REPLACE FUNCTION public.confirmar_deposito_pix_pago(p_deposito_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_valor numeric;
  v_status text;
  v_usuario_id uuid;
  v_vip json;
  v_nivel int;
  v_total numeric;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT usuario_id, valor, status INTO v_usuario_id, v_valor, v_status
  FROM public.depositos
  WHERE id = p_deposito_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'deposit_not_found');
  END IF;

  IF v_usuario_id != v_uid THEN
    RETURN json_build_object('ok', false, 'error', 'forbidden');
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

  IF v_status != 'pendente' THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_status');
  END IF;

  UPDATE public.depositos
  SET status = 'aprovado'
  WHERE id = p_deposito_id;

  UPDATE public.usuarios
  SET saldo = saldo + v_valor
  WHERE id = v_usuario_id;

  v_vip := public.processar_vip_deposito(v_usuario_id, p_deposito_id, v_valor);
  PERFORM public.aplicar_rollover_deposito(v_usuario_id, v_valor);

  RETURN (json_build_object('ok', true, 'already', false)::jsonb || COALESCE(v_vip, '{}'::json)::jsonb)::json;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirmar_deposito_pix_pago(uuid) TO authenticated;

COMMENT ON FUNCTION public.confirmar_deposito_pix_pago(uuid) IS
  'Marca depósito como aprovado, credita saldo e atualiza nível VIP. Idempotente se já aprovado.';
