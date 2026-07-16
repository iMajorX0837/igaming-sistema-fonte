-- Adicionar coluna nome na tabela public.usuarios
-- Esta coluna armazena o nome completo do usuário
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS nome TEXT;

-- Criar índice para melhor performance nas consultas por nome
CREATE INDEX IF NOT EXISTS usuarios_nome_idx ON public.usuarios(nome) WHERE nome IS NOT NULL;

-- Atualizar função handle_new_user para incluir nome se fornecido
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
  
  INSERT INTO public.usuarios (id, nome, cpf, email, telefone, link_indicação, indicado_por)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NULL),
    COALESCE(NEW.raw_user_meta_data->>'cpf', ''),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    referral_code,
    referred_by_code
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

