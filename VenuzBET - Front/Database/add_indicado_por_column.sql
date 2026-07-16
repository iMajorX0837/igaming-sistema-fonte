-- Adicionar coluna indicado_por na tabela public.usuarios
-- Esta coluna armazena o link_indicação de quem indicou este usuário
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS indicado_por TEXT;

-- Criar índice para melhor performance nas consultas de indicações
CREATE INDEX IF NOT EXISTS usuarios_indicado_por_idx ON public.usuarios(indicado_por);

-- Atualizar função handle_new_user para incluir código de indicação se fornecido
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  referral_code TEXT;
  referred_by_code TEXT;
BEGIN
  -- Gera código único de indicação
  referral_code := public.generate_referral_code();
  
  -- Pega o código de indicação do metadata se fornecido
  referred_by_code := COALESCE(NEW.raw_user_meta_data->>'referral_code', NULL);
  
  -- Valida se o código de indicação existe na tabela
  IF referred_by_code IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.usuarios WHERE link_indicação = referred_by_code) THEN
      -- Se o código não existe, ignora (não salva)
      referred_by_code := NULL;
    END IF;
  END IF;
  
  INSERT INTO public.usuarios (id, cpf, email, telefone, link_indicação, indicado_por)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'cpf', ''),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    referral_code,
    referred_by_code
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

