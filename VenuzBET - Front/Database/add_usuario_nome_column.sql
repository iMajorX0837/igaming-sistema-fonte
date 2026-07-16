-- Coluna nome completo (consulta CPF) em public.usuarios
-- Execute no SQL Editor do Supabase após as migrações que já definem nome, usuario, link_indicação, etc.

ALTER TABLE public.usuarios
ADD COLUMN IF NOT EXISTS usuario_nome TEXT;

CREATE INDEX IF NOT EXISTS usuarios_usuario_nome_idx
  ON public.usuarios(usuario_nome)
  WHERE usuario_nome IS NOT NULL;

-- Inclui usuario_nome vindo de raw_user_meta_data->>'usuario_nome' no cadastro (Auth signUp options.data)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  referral_code TEXT;
  referred_by_code TEXT;
  user_name TEXT;
  full_name TEXT;
BEGIN
  referral_code := public.generate_referral_code();

  referred_by_code := COALESCE(NEW.raw_user_meta_data->>'referral_code', NULL);

  IF referred_by_code IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.usuarios WHERE link_indicação = referred_by_code) THEN
      referred_by_code := NULL;
    END IF;
  END IF;

  user_name := COALESCE(NEW.raw_user_meta_data->>'usuario', NULL);

  IF user_name IS NULL AND NEW.email IS NOT NULL AND NEW.email != '' THEN
    user_name := SPLIT_PART(NEW.email, '@', 1);
  END IF;

  full_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'usuario_nome', '')), '');

  INSERT INTO public.usuarios (
    id,
    nome,
    usuario,
    usuario_nome,
    cpf,
    email,
    telefone,
    link_indicação,
    indicado_por
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NULL),
    user_name,
    full_name,
    COALESCE(NEW.raw_user_meta_data->>'cpf', ''),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    referral_code,
    referred_by_code
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
