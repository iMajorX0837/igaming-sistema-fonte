-- Adicionar coluna usuario na tabela public.usuarios
-- Esta coluna armazena o nome de usuário extraído do email (parte antes do @)
-- Exemplo: pedro-ferreira@gmail.com -> pedro-ferreira
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS usuario TEXT;

-- Criar índice para melhor performance nas consultas por usuario
CREATE INDEX IF NOT EXISTS usuarios_usuario_idx ON public.usuarios(usuario) WHERE usuario IS NOT NULL;

-- Atualizar função handle_new_user para extrair usuario do email automaticamente
-- Extrai a parte antes do @ do email (ex: pedro-ferreira@gmail.com -> pedro-ferreira)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  referral_code TEXT;
  referred_by_code TEXT;
  user_name TEXT;
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
  
  -- Extrai o usuario do metadata se fornecido, caso contrário extrai do email (parte antes do @)
  -- Exemplo: pedro-ferreira@gmail.com -> pedro-ferreira
  user_name := COALESCE(NEW.raw_user_meta_data->>'usuario', NULL);
  
  -- Se não foi fornecido no metadata, extrai do email
  IF user_name IS NULL AND NEW.email IS NOT NULL AND NEW.email != '' THEN
    user_name := SPLIT_PART(NEW.email, '@', 1);
  END IF;
  
  INSERT INTO public.usuarios (id, nome, usuario, cpf, email, telefone, link_indicação, indicado_por)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NULL),
    user_name,
    COALESCE(NEW.raw_user_meta_data->>'cpf', ''),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    referral_code,
    referred_by_code
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

