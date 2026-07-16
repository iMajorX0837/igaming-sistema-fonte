-- Função para devolver o valor ao saldo quando um saque for rejeitado
CREATE OR REPLACE FUNCTION public.handle_saque_rejeitado()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o status mudou para 'rejeitado' e antes não era 'rejeitado'
  IF NEW.status = 'rejeitado' AND OLD.status != 'rejeitado' THEN
    -- Adicionar o valor de volta ao saldo do usuário
    UPDATE public.usuarios
    SET saldo = saldo + NEW.valor
    WHERE id = NEW.usuario_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para devolver o valor quando um saque for rejeitado
DROP TRIGGER IF EXISTS devolver_valor_saque_rejeitado ON public.saques;

CREATE TRIGGER devolver_valor_saque_rejeitado
  AFTER UPDATE ON public.saques
  FOR EACH ROW
  WHEN (NEW.status = 'rejeitado' AND OLD.status != 'rejeitado')
  EXECUTE FUNCTION public.handle_saque_rejeitado();

