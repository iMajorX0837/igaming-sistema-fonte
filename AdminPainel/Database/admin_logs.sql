-- Logs de atividades do painel administrativo
-- Execute no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS public.admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_nome TEXT,
  admin_email TEXT,
  acao TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'sistema',
  status TEXT NOT NULL DEFAULT 'sucesso' CHECK (status IN ('sucesso', 'falha')),
  ip_address TEXT,
  dispositivo TEXT,
  detalhes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON public.admin_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_categoria ON public.admin_logs (categoria);
CREATE INDEX IF NOT EXISTS idx_admin_logs_status ON public.admin_logs (status);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_id ON public.admin_logs (admin_id);

ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin pode ver logs" ON public.admin_logs;
CREATE POLICY "Admin pode ver logs"
  ON public.admin_logs FOR SELECT
  USING (public.is_user_admin());

COMMENT ON TABLE public.admin_logs IS 'Registro de atividades realizadas por administradores no painel';

-- Lê cabeçalhos HTTP enviados pelo painel admin (IP e dispositivo)
CREATE OR REPLACE FUNCTION public._request_header(p_name TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.headers', true), '')::json->>lower(p_name),
    NULLIF(current_setting('request.headers', true), '')::json->>p_name
  );
$$;

-- Registra uma entrada de log (SECURITY DEFINER — apenas admins autenticados)
CREATE OR REPLACE FUNCTION public.registrar_admin_log(
  p_acao TEXT,
  p_detalhes TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'sucesso',
  p_categoria TEXT DEFAULT 'sistema',
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID := auth.uid();
  v_admin_nome TEXT;
  v_admin_email TEXT;
  v_log_id UUID;
BEGIN
  IF v_admin_id IS NULL OR NOT public.is_user_admin() THEN
    RETURN NULL;
  END IF;

  SELECT
    COALESCE(
      NULLIF(TRIM(u.usuario_nome), ''),
      NULLIF(TRIM(u.nome), ''),
      NULLIF(TRIM(u.usuario), ''),
      split_part(u.email, '@', 1)
    ),
    u.email
  INTO v_admin_nome, v_admin_email
  FROM public.usuarios u
  WHERE u.id = v_admin_id;

  INSERT INTO public.admin_logs (
    admin_id,
    admin_nome,
    admin_email,
    acao,
    categoria,
    status,
    ip_address,
    dispositivo,
    detalhes,
    metadata
  ) VALUES (
    v_admin_id,
    v_admin_nome,
    v_admin_email,
    p_acao,
    COALESCE(NULLIF(TRIM(p_categoria), ''), 'sistema'),
    CASE WHEN lower(COALESCE(p_status, 'sucesso')) = 'falha' THEN 'falha' ELSE 'sucesso' END,
    NULLIF(public._request_header('x-admin-ip'), ''),
    NULLIF(public._request_header('x-admin-device'), ''),
    p_detalhes,
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.registrar_admin_log(TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- Lista logs com filtros para o painel
CREATE OR REPLACE FUNCTION public.listar_logs_admin(
  p_data_inicial DATE DEFAULT NULL,
  p_data_final DATE DEFAULT NULL,
  p_categoria TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_busca TEXT DEFAULT NULL,
  p_pagina INT DEFAULT 1,
  p_por_pagina INT DEFAULT 20
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inicio TIMESTAMPTZ;
  v_fim TIMESTAMPTZ;
  v_busca TEXT;
  v_total INT;
  v_items JSON;
  v_offset INT;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  v_busca := NULLIF(TRIM(p_busca), '');
  v_offset := GREATEST(COALESCE(p_pagina, 1) - 1, 0) * COALESCE(p_por_pagina, 20);

  IF p_data_inicial IS NOT NULL THEN
    v_inicio := (p_data_inicial::TIMESTAMP AT TIME ZONE 'America/Sao_Paulo');
  END IF;

  IF p_data_final IS NOT NULL THEN
    v_fim := ((p_data_final + 1)::TIMESTAMP AT TIME ZONE 'America/Sao_Paulo');
  END IF;

  SELECT COUNT(*)::INT INTO v_total
  FROM public.admin_logs l
  WHERE
    (v_inicio IS NULL OR l.created_at >= v_inicio)
    AND (v_fim IS NULL OR l.created_at < v_fim)
    AND (
      p_categoria IS NULL OR TRIM(p_categoria) = '' OR p_categoria = 'todos'
      OR l.categoria = p_categoria
    )
    AND (
      p_status IS NULL OR TRIM(p_status) = '' OR p_status = 'todos'
      OR l.status = p_status
    )
    AND (
      v_busca IS NULL
      OR l.acao ILIKE '%' || v_busca || '%'
      OR l.detalhes ILIKE '%' || v_busca || '%'
      OR l.admin_nome ILIKE '%' || v_busca || '%'
      OR l.admin_email ILIKE '%' || v_busca || '%'
      OR l.ip_address ILIKE '%' || v_busca || '%'
      OR l.dispositivo ILIKE '%' || v_busca || '%'
    );

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_items
  FROM (
    SELECT
      l.id,
      l.created_at,
      l.acao,
      l.admin_nome,
      l.admin_email,
      l.status,
      l.ip_address,
      l.dispositivo,
      l.detalhes,
      l.categoria,
      l.metadata
    FROM public.admin_logs l
    WHERE
      (v_inicio IS NULL OR l.created_at >= v_inicio)
      AND (v_fim IS NULL OR l.created_at < v_fim)
      AND (
        p_categoria IS NULL OR TRIM(p_categoria) = '' OR p_categoria = 'todos'
        OR l.categoria = p_categoria
      )
      AND (
        p_status IS NULL OR TRIM(p_status) = '' OR p_status = 'todos'
        OR l.status = p_status
      )
      AND (
        v_busca IS NULL
        OR l.acao ILIKE '%' || v_busca || '%'
        OR l.detalhes ILIKE '%' || v_busca || '%'
        OR l.admin_nome ILIKE '%' || v_busca || '%'
        OR l.admin_email ILIKE '%' || v_busca || '%'
        OR l.ip_address ILIKE '%' || v_busca || '%'
        OR l.dispositivo ILIKE '%' || v_busca || '%'
      )
    ORDER BY l.created_at DESC
    LIMIT COALESCE(p_por_pagina, 20)
    OFFSET v_offset
  ) t;

  RETURN json_build_object(
    'ok', true,
    'total', v_total,
    'pagina', COALESCE(p_pagina, 1),
    'por_pagina', COALESCE(p_por_pagina, 20),
    'items', v_items
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.listar_logs_admin(DATE, DATE, TEXT, TEXT, TEXT, INT, INT) TO authenticated;

-- Rótulos amigáveis para tabelas auditadas
CREATE OR REPLACE FUNCTION public._admin_table_label(p_table TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_table
    WHEN 'cms_items' THEN 'Item CMS'
    WHEN 'home_sections' THEN 'Seção Home'
    WHEN 'site_config' THEN 'Config. Site'
    WHEN 'all_games_page_config' THEN 'Página Todos Jogos'
    WHEN 'all_games_providers' THEN 'Provedor (Todos Jogos)'
    WHEN 'all_games_categories' THEN 'Categoria (Todos Jogos)'
    WHEN 'cupons' THEN 'Cupom'
    WHEN 'prize_wheel_config' THEN 'Config. Roleta'
    WHEN 'prize_wheel_segments' THEN 'Segmento Roleta'
    WHEN 'aviator_config' THEN 'Config. Aviator RTP'
    WHEN 'platform_providers' THEN 'Provedor de Jogo'
    WHEN 'platform_games' THEN 'Jogo'
    WHEN 'vip_niveis' THEN 'Nível VIP'
    WHEN 'usuarios' THEN 'Usuário'
    ELSE p_table
  END;
$$;

CREATE OR REPLACE FUNCTION public._admin_table_categoria(p_table TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_table IN ('platform_providers', 'platform_games', 'aviator_config') THEN 'jogo'
    WHEN p_table LIKE 'prize_wheel%' THEN 'roleta'
    WHEN p_table = 'cupons' THEN 'cupom'
    WHEN p_table = 'vip_niveis' THEN 'vip'
    WHEN p_table = 'usuarios' THEN 'usuario'
    ELSE 'site'
  END;
$$;

-- Trigger genérico para alterações em tabelas do CMS/conteúdo
CREATE OR REPLACE FUNCTION public.trg_admin_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_acao TEXT;
  v_detalhes TEXT;
  v_record_id TEXT;
  v_label TEXT;
  v_categoria TEXT;
BEGIN
  IF current_setting('app.skip_audit', true) = 'true' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF auth.uid() IS NULL OR NOT public.is_user_admin() THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_label := public._admin_table_label(TG_TABLE_NAME);
  IF TG_TABLE_NAME = 'cms_items' THEN
    v_label := public._admin_cms_secao_label(
      COALESCE(to_jsonb(NEW)->>'secao', to_jsonb(OLD)->>'secao')
    );
  END IF;
  v_categoria := public._admin_table_categoria(TG_TABLE_NAME);

  IF TG_OP = 'INSERT' THEN
    v_record_id := COALESCE(
      to_jsonb(NEW)->>'id',
      to_jsonb(NEW)->>'nivel',
      to_jsonb(NEW)->>'game_code',
      'novo'
    );
    v_acao := 'Criar ' || v_label;
    v_detalhes := 'Registro criado (ID: ' || v_record_id || ')';
    PERFORM public.registrar_admin_log(v_acao, v_detalhes, 'sucesso', v_categoria, to_jsonb(NEW));
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    v_record_id := COALESCE(
      to_jsonb(NEW)->>'id',
      to_jsonb(NEW)->>'nivel',
      to_jsonb(NEW)->>'game_code',
      '—'
    );
    v_acao := 'Atualizar ' || v_label;
    v_detalhes := 'Registro atualizado (ID: ' || v_record_id || ')';
    PERFORM public.registrar_admin_log(
      v_acao,
      v_detalhes,
      'sucesso',
      v_categoria,
      jsonb_build_object('antes', to_jsonb(OLD), 'depois', to_jsonb(NEW))
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    v_record_id := COALESCE(
      to_jsonb(OLD)->>'id',
      to_jsonb(OLD)->>'nivel',
      to_jsonb(OLD)->>'game_code',
      '—'
    );
    v_acao := 'Excluir ' || v_label;
    v_detalhes := 'Registro excluído (ID: ' || v_record_id || ')';
    PERFORM public.registrar_admin_log(v_acao, v_detalhes, 'sucesso', v_categoria, to_jsonb(OLD));
    RETURN OLD;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Aplica trigger em tabelas gerenciadas pelo painel
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'cms_items',
    'home_sections',
    'site_config',
    'all_games_page_config',
    'all_games_providers',
    'all_games_categories',
    'cupons',
    'prize_wheel_config',
    'prize_wheel_segments',
    'aviator_config',
    'platform_providers',
    'platform_games',
    'vip_niveis',
    'usuarios'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_admin_audit_%I ON public.%I', t, t);
      EXECUTE format(
        'CREATE TRIGGER trg_admin_audit_%I
         AFTER INSERT OR UPDATE OR DELETE ON public.%I
         FOR EACH ROW EXECUTE FUNCTION public.trg_admin_audit_log()',
        t, t
      );
    END IF;
  END LOOP;
END;
$$;

-- ============================================================
-- Instrumentação de RPCs críticas com log detalhado
-- ============================================================

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
      format('Saque %s: %s → %s | Valor: R$ %s | Usuário: %s', p_saque_id, v_dep_status, v_status, v_valor, COALESCE(v_usuario_email, '—')),
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

CREATE OR REPLACE FUNCTION public.reprovar_pendentes_saques_admin()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  UPDATE public.saques
  SET status = 'rejeitado', updated_at = NOW()
  WHERE status = 'pendente';

  GET DIAGNOSTICS v_count = ROW_COUNT;

  PERFORM public.registrar_admin_log(
    'Reprovar saques pendentes em massa',
    format('%s saque(s) pendente(s) reprovado(s)', v_count),
    'sucesso',
    'saque',
    jsonb_build_object('reprovados', v_count)
  );

  RETURN json_build_object('ok', true, 'reprovados', v_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.atualizar_status_deposito_admin(
  p_deposito_id UUID,
  p_status TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
  v_valor NUMERIC;
  v_dep_status TEXT;
  v_usuario_id UUID;
  v_usuario_email TEXT;
  v_vip JSON;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  v_status := LOWER(TRIM(p_status));

  IF v_status NOT IN ('aprovado', 'pendente', 'falhou', 'expirado') THEN
    RETURN json_build_object('ok', false, 'error', 'Status inválido');
  END IF;

  SELECT d.usuario_id, d.valor, d.status, u.email
  INTO v_usuario_id, v_valor, v_dep_status, v_usuario_email
  FROM public.depositos d
  LEFT JOIN public.usuarios u ON u.id = d.usuario_id
  WHERE d.id = p_deposito_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'Depósito não encontrado');
  END IF;

  IF v_status = 'aprovado' THEN
    IF v_dep_status = 'aprovado' THEN
      RETURN json_build_object('ok', true, 'already', true);
    END IF;

    IF v_dep_status != 'pendente' THEN
      RETURN json_build_object('ok', false, 'error', 'Apenas depósitos pendentes podem ser aprovados');
    END IF;

    UPDATE public.depositos SET status = 'aprovado', updated_at = NOW() WHERE id = p_deposito_id;
    UPDATE public.usuarios SET saldo = saldo + v_valor WHERE id = v_usuario_id;
    v_vip := public.processar_vip_deposito(v_usuario_id, p_deposito_id, v_valor);
    PERFORM public.aplicar_rollover_deposito(v_usuario_id, v_valor);

    PERFORM public.registrar_admin_log(
      'Alterar status de depósito',
      format('Depósito %s: %s → aprovado | Valor: R$ %s | Usuário: %s', p_deposito_id, v_dep_status, v_valor, COALESCE(v_usuario_email, '—')),
      'sucesso',
      'deposito',
      jsonb_build_object('deposito_id', p_deposito_id, 'status_anterior', v_dep_status, 'status_novo', 'aprovado', 'valor', v_valor)
    );

    RETURN (json_build_object('ok', true, 'already', false)::jsonb || COALESCE(v_vip, '{}'::json)::jsonb)::json;
  END IF;

  UPDATE public.depositos
  SET status = v_status, updated_at = NOW()
  WHERE id = p_deposito_id;

  PERFORM public.registrar_admin_log(
    'Alterar status de depósito',
    format('Depósito %s: %s → %s | Valor: R$ %s | Usuário: %s', p_deposito_id, v_dep_status, v_status, v_valor, COALESCE(v_usuario_email, '—')),
    'sucesso',
    'deposito',
    jsonb_build_object('deposito_id', p_deposito_id, 'status_anterior', v_dep_status, 'status_novo', v_status, 'valor', v_valor)
  );

  RETURN json_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.atualizar_saldo_usuario(
  p_usuario_id UUID,
  p_novo_saldo NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_saldo_anterior NUMERIC;
  v_usuario_email TEXT;
BEGIN
  IF NOT public.is_user_admin() THEN
    RETURN json_build_object('success', false, 'error', 'Acesso negado');
  END IF;

  SELECT saldo, email INTO v_saldo_anterior, v_usuario_email
  FROM public.usuarios
  WHERE id = p_usuario_id;

  IF v_saldo_anterior IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  IF p_novo_saldo < 0 THEN
    RETURN json_build_object('success', false, 'error', 'O saldo não pode ser negativo');
  END IF;

  PERFORM set_config('app.skip_audit', 'true', true);

  UPDATE public.usuarios
  SET saldo = p_novo_saldo, updated_at = NOW()
  WHERE id = p_usuario_id;

  PERFORM public.registrar_admin_log(
    'Alterar saldo de usuário',
    format('Usuário %s (%s): R$ %s → R$ %s', p_usuario_id, COALESCE(v_usuario_email, '—'), v_saldo_anterior, p_novo_saldo),
    'sucesso',
    'usuario',
    jsonb_build_object('usuario_id', p_usuario_id, 'saldo_anterior', v_saldo_anterior, 'saldo_novo', p_novo_saldo)
  );

  RETURN json_build_object(
    'success', true,
    'saldo_anterior', v_saldo_anterior,
    'saldo_atual', p_novo_saldo
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.atualizar_status_usuario_admin(
  p_usuario_id UUID,
  p_ativo BOOLEAN DEFAULT NULL,
  p_verificado BOOLEAN DEFAULT NULL,
  p_kyc_status TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id = p_usuario_id) THEN
    RETURN json_build_object('ok', false, 'error', 'Usuário não encontrado');
  END IF;

  IF p_kyc_status IS NOT NULL AND p_kyc_status NOT IN ('nao_enviado', 'pendente', 'aprovado', 'rejeitado') THEN
    RETURN json_build_object('ok', false, 'error', 'Status KYC inválido');
  END IF;

  SELECT email INTO v_email FROM public.usuarios WHERE id = p_usuario_id;

  PERFORM set_config('app.skip_audit', 'true', true);

  UPDATE public.usuarios
  SET
    ativo = COALESCE(p_ativo, ativo),
    verificado = COALESCE(p_verificado, verificado),
    kyc_status = COALESCE(p_kyc_status, kyc_status),
    updated_at = NOW()
  WHERE id = p_usuario_id;

  PERFORM public.registrar_admin_log(
    'Atualizar status de usuário',
    format('Usuário %s (%s) | ativo=%s verificado=%s kyc=%s', p_usuario_id, COALESCE(v_email, '—'), p_ativo, p_verificado, p_kyc_status),
    'sucesso',
    'usuario',
    jsonb_build_object('usuario_id', p_usuario_id, 'ativo', p_ativo, 'verificado', p_verificado, 'kyc_status', p_kyc_status)
  );

  RETURN json_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.atualizar_perfil_usuario_admin(
  p_usuario_id UUID,
  p_nome TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_cpf TEXT DEFAULT NULL,
  p_telefone TEXT DEFAULT NULL,
  p_data_nascimento DATE DEFAULT NULL,
  p_pais TEXT DEFAULT NULL,
  p_cargo TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id = p_usuario_id) THEN
    RETURN json_build_object('ok', false, 'error', 'Usuário não encontrado');
  END IF;

  PERFORM set_config('app.skip_audit', 'true', true);

  UPDATE public.usuarios
  SET
    nome = COALESCE(NULLIF(TRIM(p_nome), ''), nome),
    usuario_nome = COALESCE(NULLIF(TRIM(p_nome), ''), usuario_nome),
    email = COALESCE(NULLIF(TRIM(p_email), ''), email),
    cpf = COALESCE(NULLIF(TRIM(p_cpf), ''), cpf),
    telefone = COALESCE(NULLIF(TRIM(p_telefone), ''), telefone),
    data_nascimento = COALESCE(p_data_nascimento, data_nascimento),
    pais = COALESCE(NULLIF(TRIM(p_pais), ''), pais),
    cargo = COALESCE(NULLIF(TRIM(p_cargo), ''), cargo),
    updated_at = NOW()
  WHERE id = p_usuario_id;

  PERFORM public.registrar_admin_log(
    'Atualizar perfil de usuário',
    format('Perfil do usuário %s atualizado via painel', p_usuario_id),
    'sucesso',
    'usuario',
    jsonb_build_object('usuario_id', p_usuario_id, 'nome', p_nome, 'email', p_email, 'cargo', p_cargo)
  );

  RETURN json_build_object('ok', true);
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

  PERFORM set_config('app.skip_audit', 'true', true);

  UPDATE public.usuarios
  SET
    cargo = v_cargo,
    ativo = true,
    usuario_nome = COALESCE(NULLIF(TRIM(p_nome), ''), usuario_nome, nome, usuario),
    nome = COALESCE(NULLIF(TRIM(p_nome), ''), nome, usuario_nome, usuario),
    updated_at = NOW()
  WHERE id = v_usuario.id;

  PERFORM public.registrar_admin_log(
    'Adicionar membro à equipe',
    format('Membro %s adicionado como %s', p_email, v_cargo),
    'sucesso',
    'equipe',
    jsonb_build_object('usuario_id', v_usuario.id, 'email', p_email, 'cargo', v_cargo)
  );

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

  PERFORM set_config('app.skip_audit', 'true', true);

  UPDATE public.usuarios
  SET
    cargo = v_cargo,
    ativo = COALESCE(p_ativo, true),
    usuario_nome = COALESCE(NULLIF(TRIM(p_nome), ''), usuario_nome),
    nome = COALESCE(NULLIF(TRIM(p_nome), ''), nome),
    updated_at = NOW()
  WHERE id = p_usuario_id;

  PERFORM public.registrar_admin_log(
    'Atualizar membro da equipe',
    format('Membro %s atualizado: cargo=%s ativo=%s', COALESCE(v_membro.email, p_usuario_id::TEXT), v_cargo, p_ativo),
    'sucesso',
    'equipe',
    jsonb_build_object('usuario_id', p_usuario_id, 'cargo', v_cargo, 'ativo', p_ativo)
  );

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

  PERFORM set_config('app.skip_audit', 'true', true);

  UPDATE public.usuarios
  SET cargo = 'usuario', ativo = true, updated_at = NOW()
  WHERE id = p_usuario_id;

  PERFORM public.registrar_admin_log(
    'Remover membro da equipe',
    format('Membro %s removido da equipe administrativa', COALESCE(v_membro.email, p_usuario_id::TEXT)),
    'sucesso',
    'equipe',
    jsonb_build_object('usuario_id', p_usuario_id, 'email', v_membro.email)
  );

  RETURN json_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.atualizar_config_plataforma_admin(
  p_deposito_minimo NUMERIC DEFAULT NULL,
  p_deposito_maximo NUMERIC DEFAULT NULL,
  p_saque_minimo NUMERIC DEFAULT NULL,
  p_saque_maximo NUMERIC DEFAULT NULL,
  p_saques_diarios_permitidos INT DEFAULT NULL,
  p_rollover_padrao NUMERIC DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config public.site_config%ROWTYPE;
  v_dep_min NUMERIC;
  v_dep_max NUMERIC;
  v_saq_min NUMERIC;
  v_saq_max NUMERIC;
  v_saques_dia INT;
  v_rollover NUMERIC;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT * INTO v_config FROM public.site_config WHERE id = 1;

  IF NOT FOUND THEN
    INSERT INTO public.site_config (id) VALUES (1);
    SELECT * INTO v_config FROM public.site_config WHERE id = 1;
  END IF;

  v_dep_min := COALESCE(p_deposito_minimo, v_config.deposito_minimo);
  v_dep_max := COALESCE(p_deposito_maximo, v_config.deposito_maximo);
  v_saq_min := COALESCE(p_saque_minimo, v_config.saque_minimo);
  v_saq_max := COALESCE(p_saque_maximo, v_config.saque_maximo);
  v_saques_dia := COALESCE(p_saques_diarios_permitidos, v_config.saques_diarios_permitidos, 1);
  v_rollover := COALESCE(p_rollover_padrao, v_config.rollover_padrao, 1);

  IF v_dep_min <= 0 OR v_dep_max <= 0 OR v_saq_min <= 0 OR v_saq_max <= 0 THEN
    RETURN json_build_object('ok', false, 'error', 'Os valores devem ser maiores que zero.');
  END IF;

  IF v_saques_dia < 1 THEN
    RETURN json_build_object('ok', false, 'error', 'Saques diários permitidos deve ser no mínimo 1.');
  END IF;

  IF v_rollover < 0 THEN
    RETURN json_build_object('ok', false, 'error', 'Rollover padrão não pode ser negativo.');
  END IF;

  IF v_dep_min > v_dep_max THEN
    RETURN json_build_object('ok', false, 'error', 'Depósito mínimo não pode ser maior que o máximo.');
  END IF;

  IF v_saq_min > v_saq_max THEN
    RETURN json_build_object('ok', false, 'error', 'Saque mínimo não pode ser maior que o máximo.');
  END IF;

  UPDATE public.site_config
  SET
    deposito_minimo = v_dep_min,
    deposito_maximo = v_dep_max,
    saque_minimo = v_saq_min,
    saque_maximo = v_saq_max,
    saques_diarios_permitidos = v_saques_dia,
    rollover_padrao = v_rollover,
    updated_at = NOW()
  WHERE id = 1;

  PERFORM public.registrar_admin_log(
    'Atualizar configurações da plataforma',
    format('Depósito: R$ %s–%s | Saque: R$ %s–%s | Saques/dia: %s | Rollover: %sx', v_dep_min, v_dep_max, v_saq_min, v_saq_max, v_saques_dia, v_rollover),
    'sucesso',
    'config',
    jsonb_build_object(
      'deposito_minimo', v_dep_min,
      'deposito_maximo', v_dep_max,
      'saque_minimo', v_saq_min,
      'saque_maximo', v_saq_max,
      'saques_diarios_permitidos', v_saques_dia,
      'rollover_padrao', v_rollover
    )
  );

  RETURN json_build_object(
    'ok', true,
    'deposito_minimo', v_dep_min,
    'deposito_maximo', v_dep_max,
    'saque_minimo', v_saq_min,
    'saque_maximo', v_saq_max,
    'saques_diarios_permitidos', v_saques_dia,
    'rollover_padrao', v_rollover
  );
END;
$$;
