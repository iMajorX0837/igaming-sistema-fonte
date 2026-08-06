-- =============================================================================
-- Fix: atualizar_status_deposito_admin — FOR UPDATE em LEFT JOIN
-- Erro PostgreSQL 0A000: "FOR UPDATE cannot be applied to the nullable side
-- of an outer join"
--
-- Causa: SELECT com LEFT JOIN usuarios + FOR UPDATE sem qualificar a tabela.
-- Correção: FOR UPDATE OF d (mesmo padrão de atualizar_status_saque_admin).
-- Execute no SQL Editor do Supabase.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.atualizar_status_deposito_admin(
  p_deposito_id UUID,
  p_status TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
  v_valor NUMERIC;
  v_dep_status TEXT;
  v_usuario_id UUID;
  v_usuario_email TEXT;
  v_vip JSON;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  v_status := LOWER(TRIM(p_status));

  IF v_status NOT IN ('aprovado', 'pendente', 'falhou', 'expirado') THEN
    RETURN json_build_object('ok', false, 'error', 'Status inválido');
  END IF;

  SELECT d.usuario_id, d.valor, d.status, u.email
  INTO v_usuario_id, v_valor, v_dep_status, v_usuario_email
  FROM public.depositos d
  LEFT JOIN public.usuarios u ON u.id = d.usuario_id
  WHERE d.id = p_deposito_id
  FOR UPDATE OF d;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'Depósito não encontrado');
  END IF;

  IF v_status = 'aprovado' THEN
    IF v_dep_status = 'aprovado' THEN
      RETURN json_build_object('ok', true, 'already', true);
    END IF;

    IF v_dep_status != 'pendente' THEN
      RETURN json_build_object('ok', false, 'error', 'Apenas depósitos pendentes podem ser aprovados');
    END IF;

    UPDATE public.depositos SET status = 'aprovado', updated_at = NOW() WHERE id = p_deposito_id;
    UPDATE public.usuarios SET saldo = saldo + v_valor WHERE id = v_usuario_id;
    v_vip := public.processar_vip_deposito(v_usuario_id, p_deposito_id, v_valor);
    PERFORM public.aplicar_rollover_deposito(v_usuario_id, v_valor);

    PERFORM public.registrar_admin_log(
      'Alterar status de depósito',
      format('Depósito %s: %s → aprovado | Valor: R$ %s | Usuário: %s', p_deposito_id, v_dep_status, v_valor, COALESCE(v_usuario_email, '—')),
      'sucesso',
      'deposito',
      jsonb_build_object('deposito_id', p_deposito_id, 'status_anterior', v_dep_status, 'status_novo', 'aprovado', 'valor', v_valor)
    );

    RETURN (json_build_object('ok', true, 'already', false)::jsonb || COALESCE(v_vip, '{}'::json)::jsonb)::json;
  END IF;

  UPDATE public.depositos
  SET status = v_status, updated_at = NOW()
  WHERE id = p_deposito_id;

  PERFORM public.registrar_admin_log(
    'Alterar status de depósito',
    format('Depósito %s: %s → %s | Valor: R$ %s | Usuário: %s', p_deposito_id, v_dep_status, v_status, v_valor, COALESCE(v_usuario_email, '—')),
    'sucesso',
    'deposito',
    jsonb_build_object('deposito_id', p_deposito_id, 'status_anterior', v_dep_status, 'status_novo', v_status, 'valor', v_valor)
  );

  RETURN json_build_object('ok', true);
END;
$$;
