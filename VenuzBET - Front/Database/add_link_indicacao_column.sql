-- Adicionar coluna link_indicação na tabela public.usuarios
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS link_indicação TEXT;

-- Criar índice único para link_indicação
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_link_indicacao_idx ON public.usuarios(link_indicação);

-- Função para gerar código único de 20 caracteres (letras e números)
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INTEGER;
  random_pos INTEGER;
  max_attempts INTEGER := 100;
  attempts INTEGER := 0;
BEGIN
  -- Gera um código de 20 caracteres
  LOOP
    result := '';
    FOR i IN 1..20 LOOP
      random_pos := FLOOR(RANDOM() * LENGTH(chars) + 1)::INTEGER;
      result := result || SUBSTR(chars, random_pos, 1);
    END LOOP;
    
    -- Verifica se o código já existe
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.usuarios WHERE link_indicação = result);
    
    -- Previne loop infinito
    attempts := attempts + 1;
    IF attempts >= max_attempts THEN
      -- Se chegou ao limite, adiciona timestamp para garantir unicidade
      result := result || SUBSTR(REPLACE(CAST(EXTRACT(EPOCH FROM NOW()) AS TEXT), '.', ''), -6);
      EXIT;
    END IF;
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Atualizar função handle_new_user para incluir geração do código de indicação
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  referral_code TEXT;
BEGIN
  -- Gera código único de indicação
  referral_code := public.generate_referral_code();
  
  INSERT INTO public.usuarios (id, cpf, email, telefone, link_indicação)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'cpf', ''),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    referral_code
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atualizar usuários existentes que não têm código de indicação
UPDATE public.usuarios 
SET link_indicação = public.generate_referral_code()
WHERE link_indicação IS NULL;

