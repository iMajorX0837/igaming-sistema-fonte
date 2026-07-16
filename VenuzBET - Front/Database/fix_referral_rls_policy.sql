-- Criar política RLS para permitir que usuários vejam indicações feitas através do seu link
-- Esta política permite que um usuário veja dados de outros usuários quando está verificando suas próprias indicações

-- Primeiro, vamos criar uma função auxiliar que retorna o código de indicação do usuário atual
CREATE OR REPLACE FUNCTION public.get_current_user_referral_code()
RETURNS TEXT AS $$
DECLARE
  user_code TEXT;
BEGIN
  SELECT link_indicação INTO user_code
  FROM public.usuarios
  WHERE id = auth.uid();
  
  RETURN user_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Remover a política antiga se existir
DROP POLICY IF EXISTS "Usuários podem ver apenas seus próprios dados" ON public.usuarios;

-- Criar nova política que permite ver seus próprios dados E indicações feitas através do seu link
CREATE POLICY "Usuários podem ver seus dados e indicações"
  ON public.usuarios
  FOR SELECT
  USING (
    -- Permite ver seus próprios dados
    auth.uid() = id
    OR
    -- Permite ver dados de usuários indicados por você
    (
      indicado_por IS NOT NULL
      AND public.get_current_user_referral_code() IS NOT NULL
      AND indicado_por = public.get_current_user_referral_code()
    )
  );

