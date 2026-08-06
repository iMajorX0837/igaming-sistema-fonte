-- =============================================================================
-- Patch H4 — Saque: status processando antes do PIX (anti double-pay)
-- Execute no SQL Editor do Supabase.
-- =============================================================================

ALTER TABLE public.saques DROP CONSTRAINT IF EXISTS saques_status_check;
ALTER TABLE public.saques
  ADD CONSTRAINT saques_status_check
  CHECK (status IN ('aprovado', 'rejeitado', 'pendente', 'falhou', 'processando'));

COMMENT ON CONSTRAINT saques_status_check ON public.saques IS
  'pendente=aguardando; processando=PIX em andamento; aprovado/rejeitado/falhou=final';

-- Refund tambem quando falha apos claim processando (sem pagar de novo)
CREATE OR REPLACE FUNCTION public.handle_saque_rejeitado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('rejeitado', 'falhou')
     AND OLD.status IN ('pendente', 'processando')
     AND COALESCE(OLD.saldo_debitado, false) = true
     AND COALESCE(OLD.saldo_reembolsado, false) = false
  THEN
    PERFORM set_config('app.skip_usuario_guard', 'true', true);

    UPDATE public.usuarios
    SET saldo = COALESCE(saldo, 0) + NEW.valor
    WHERE id = NEW.usuario_id;

    NEW.saldo_reembolsado := true;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS devolver_valor_saque_rejeitado ON public.saques;
CREATE TRIGGER devolver_valor_saque_rejeitado
  BEFORE UPDATE OF status ON public.saques
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.handle_saque_rejeitado();

-- Admin pode rejeitar/falhar saque preso em processando; aprovado so via API de approve
CREATE OR REPLACE FUNCTION public.atualizar_status_saque_admin(
  p_saque_id UUID,
  p_status TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
  v_dep_status TEXT;
  v_valor NUMERIC;
  v_usuario_email TEXT;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  v_status := LOWER(TRIM(p_status));

  IF v_status NOT IN ('rejeitado', 'falhou') THEN
    RETURN json_build_object(
      'ok', false,
      'error', 'Use a API de aprovacao para aprovar. Aqui so rejeitado/falhou.'
    );
  END IF;

  SELECT s.status, s.valor, u.email
  INTO v_dep_status, v_valor, v_usuario_email
  FROM public.saques s
  LEFT JOIN public.usuarios u ON u.id = s.usuario_id
  WHERE s.id = p_saque_id
  FOR UPDATE OF s;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'Saque nao encontrado');
  END IF;

  IF v_dep_status NOT IN ('pendente', 'processando') THEN
    RETURN json_build_object('ok', false, 'error', 'Apenas saques pendentes/processando podem ser alterados');
  END IF;

  PERFORM set_config('app.skip_usuario_guard', 'true', true);

  UPDATE public.saques
  SET status = v_status, updated_at = NOW()
  WHERE id = p_saque_id;

  BEGIN
    PERFORM public.registrar_admin_log(
      'Alterar status de saque',
      format('Saque %s: %s → %s | Valor: R$ %s | Usuario: %s', p_saque_id, v_dep_status, v_status, v_valor, COALESCE(v_usuario_email, '—')),
      'sucesso',
      'saque',
      jsonb_build_object('saque_id', p_saque_id, 'status_anterior', v_dep_status, 'status_novo', v_status, 'valor', v_valor)
    );
  EXCEPTION
    WHEN undefined_function THEN NULL;
    WHEN undefined_table THEN NULL;
  END;

  RETURN json_build_object('ok', true);
END;
$$;
