-- Membros da equipe administrativa
-- Execute no SQL Editor do Supabase

ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.usuarios.ativo IS 'Indica se o membro da equipe está ativo no painel';
COMMENT ON COLUMN public.usuarios.two_factor_enabled IS 'Indica se o 2FA está configurado (futuro)';

DROP POLICY IF EXISTS "Admin pode gerenciar usuários" ON public.usuarios;

CREATE POLICY "Admin pode gerenciar usuários"
  ON public.usuarios FOR UPDATE
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

CREATE OR REPLACE FUNCTION public.listar_membros_equipe()
RETURNS TABLE (
  id UUID,
  nome TEXT,
  email TEXT,
  cargo TEXT,
  ativo BOOLEAN,
  two_factor_enabled BOOLEAN,
  sessoes INT,
  ultimo_acesso TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    COALESCE(NULLIF(TRIM(u.usuario_nome), ''), NULLIF(TRIM(u.nome), ''), NULLIF(TRIM(u.usuario), ''), split_part(u.email, '@', 1)) AS nome,
    u.email,
    u.cargo,
    COALESCE(u.ativo, true) AS ativo,
    COALESCE(u.two_factor_enabled, false) AS two_factor_enabled,
    COALESCE((
      SELECT COUNT(*)::INT
      FROM auth.sessions s
      WHERE s.user_id = u.id
    ), 0) AS sessoes,
    au.last_sign_in_at AS ultimo_acesso,
    u.created_at
  FROM public.usuarios u
  LEFT JOIN auth.users au ON au.id = u.id
  WHERE u.cargo IN ('admin', 'moderador', 'suporte')
  ORDER BY
    CASE u.cargo
      WHEN 'admin' THEN 1
      WHEN 'moderador' THEN 2
      WHEN 'suporte' THEN 3
      ELSE 4
    END,
    u.created_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.adicionar_membro_equipe(
  p_email TEXT,
  p_cargo TEXT DEFAULT 'moderador',
  p_nome TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario public.usuarios%ROWTYPE;
  v_cargo TEXT;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  v_cargo := LOWER(TRIM(COALESCE(p_cargo, 'moderador')));

  IF v_cargo NOT IN ('admin', 'moderador', 'suporte') THEN
    RAISE EXCEPTION 'Função inválida. Use: admin, moderador ou suporte';
  END IF;

  SELECT * INTO v_usuario
  FROM public.usuarios
  WHERE LOWER(TRIM(email)) = LOWER(TRIM(p_email))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'Usuário não encontrado. A conta precisa estar cadastrada no sistema.');
  END IF;

  IF v_usuario.cargo IN ('admin', 'moderador', 'suporte') THEN
    RETURN json_build_object('ok', false, 'error', 'Este usuário já faz parte da equipe administrativa.');
  END IF;

  UPDATE public.usuarios
  SET
    cargo = v_cargo,
    ativo = true,
    usuario_nome = COALESCE(NULLIF(TRIM(p_nome), ''), usuario_nome, nome, usuario),
    nome = COALESCE(NULLIF(TRIM(p_nome), ''), nome, usuario_nome, usuario),
    updated_at = NOW()
  WHERE id = v_usuario.id;

  RETURN json_build_object('ok', true, 'id', v_usuario.id);
END;
$$;

CREATE OR REPLACE FUNCTION public.atualizar_membro_equipe(
  p_usuario_id UUID,
  p_cargo TEXT,
  p_ativo BOOLEAN DEFAULT true,
  p_nome TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cargo TEXT;
  v_membro public.usuarios%ROWTYPE;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  v_cargo := LOWER(TRIM(COALESCE(p_cargo, 'moderador')));

  IF v_cargo NOT IN ('admin', 'moderador', 'suporte') THEN
    RAISE EXCEPTION 'Função inválida. Use: admin, moderador ou suporte';
  END IF;

  SELECT * INTO v_membro
  FROM public.usuarios
  WHERE id = p_usuario_id
    AND cargo IN ('admin', 'moderador', 'suporte');

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'Membro da equipe não encontrado.');
  END IF;

  UPDATE public.usuarios
  SET
    cargo = v_cargo,
    ativo = COALESCE(p_ativo, true),
    usuario_nome = COALESCE(NULLIF(TRIM(p_nome), ''), usuario_nome),
    nome = COALESCE(NULLIF(TRIM(p_nome), ''), nome),
    updated_at = NOW()
  WHERE id = p_usuario_id;

  RETURN json_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.remover_membro_equipe(p_usuario_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_membro public.usuarios%ROWTYPE;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF p_usuario_id = auth.uid() THEN
    RETURN json_build_object('ok', false, 'error', 'Você não pode remover a si mesmo da equipe.');
  END IF;

  SELECT * INTO v_membro
  FROM public.usuarios
  WHERE id = p_usuario_id
    AND cargo IN ('admin', 'moderador', 'suporte');

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'Membro da equipe não encontrado.');
  END IF;

  UPDATE public.usuarios
  SET
    cargo = 'usuario',
    ativo = true,
    updated_at = NOW()
  WHERE id = p_usuario_id;

  RETURN json_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.listar_membros_equipe() TO authenticated;
GRANT EXECUTE ON FUNCTION public.adicionar_membro_equipe(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_membro_equipe(UUID, TEXT, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remover_membro_equipe(UUID) TO authenticated;
