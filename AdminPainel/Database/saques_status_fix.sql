-- Fix: aceitar/recusar saques no painel admin
-- Execute no SQL Editor do Supabase

ALTER TABLE public.saques ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

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

  IF v_status NOT IN ('aprovado', 'rejeitado', 'pendente', 'falhou') THEN
    RETURN json_build_object('ok', false, 'error', 'Status inválido');
  END IF;

  SELECT s.status, s.valor, u.email
  INTO v_dep_status, v_valor, v_usuario_email
  FROM public.saques s
  LEFT JOIN public.usuarios u ON u.id = s.usuario_id
  WHERE s.id = p_saque_id
  FOR UPDATE OF s;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'Saque não encontrado');
  END IF;

  IF v_dep_status != 'pendente' AND v_status IN ('aprovado', 'rejeitado', 'falhou') THEN
    RETURN json_build_object('ok', false, 'error', 'Apenas saques pendentes podem ser alterados');
  END IF;

  UPDATE public.saques
  SET status = v_status, updated_at = NOW()
  WHERE id = p_saque_id;

  BEGIN
    PERFORM public.registrar_admin_log(
      'Alterar status de saque',
      format(
        'Saque %s: %s → %s | Valor: R$ %s | Usuário: %s',
        p_saque_id,
        v_dep_status,
        v_status,
        v_valor,
        COALESCE(v_usuario_email, '—')
      ),
      'sucesso',
      'saque',
      jsonb_build_object(
        'saque_id', p_saque_id,
        'status_anterior', v_dep_status,
        'status_novo', v_status,
        'valor', v_valor
      )
    );
  EXCEPTION
    WHEN undefined_function THEN NULL;
    WHEN undefined_table THEN NULL;
  END;

  RETURN json_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_saque_rejeitado()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('rejeitado', 'falhou') AND OLD.status = 'pendente' THEN
    UPDATE public.usuarios
    SET saldo = saldo + NEW.valor
    WHERE id = NEW.usuario_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS devolver_valor_saque_rejeitado ON public.saques;
CREATE TRIGGER devolver_valor_saque_rejeitado
  AFTER UPDATE OF status ON public.saques
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.handle_saque_rejeitado();

GRANT EXECUTE ON FUNCTION public.atualizar_status_saque_admin(UUID, TEXT) TO authenticated;
