-- Gestão avançada de depósitos no painel admin
-- Execute no SQL Editor do Supabase

ALTER TABLE public.depositos ADD COLUMN IF NOT EXISTS origem TEXT NOT NULL DEFAULT 'pix';

ALTER TABLE public.depositos DROP CONSTRAINT IF EXISTS depositos_status_check;
ALTER TABLE public.depositos
  ADD CONSTRAINT depositos_status_check
  CHECK (status IN ('aprovado', 'pendente', 'falhou', 'expirado'));

ALTER TABLE public.depositos DROP CONSTRAINT IF EXISTS depositos_origem_check;
ALTER TABLE public.depositos
  ADD CONSTRAINT depositos_origem_check
  CHECK (origem IN ('pix', 'manual'));

COMMENT ON COLUMN public.depositos.origem IS 'Origem do depósito: pix (automático) ou manual (admin)';

CREATE OR REPLACE FUNCTION public._depositos_periodo_range(p_periodo TEXT)
RETURNS TABLE (inicio TIMESTAMPTZ, fim TIMESTAMPTZ)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_hoje DATE := (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;
BEGIN
  CASE COALESCE(p_periodo, 'todos')
    WHEN 'hoje' THEN
      inicio := (v_hoje::TIMESTAMP AT TIME ZONE 'America/Sao_Paulo');
      fim := ((v_hoje + 1)::TIMESTAMP AT TIME ZONE 'America/Sao_Paulo');
    WHEN 'ontem' THEN
      inicio := ((v_hoje - 1)::TIMESTAMP AT TIME ZONE 'America/Sao_Paulo');
      fim := (v_hoje::TIMESTAMP AT TIME ZONE 'America/Sao_Paulo');
    WHEN '7dias' THEN
      inicio := ((v_hoje - 6)::TIMESTAMP AT TIME ZONE 'America/Sao_Paulo');
      fim := ((v_hoje + 1)::TIMESTAMP AT TIME ZONE 'America/Sao_Paulo');
    WHEN '30dias' THEN
      inicio := ((v_hoje - 29)::TIMESTAMP AT TIME ZONE 'America/Sao_Paulo');
      fim := ((v_hoje + 1)::TIMESTAMP AT TIME ZONE 'America/Sao_Paulo');
    WHEN 'mes' THEN
      inicio := (date_trunc('month', v_hoje::TIMESTAMP) AT TIME ZONE 'America/Sao_Paulo');
      fim := ((date_trunc('month', v_hoje::TIMESTAMP) + INTERVAL '1 month') AT TIME ZONE 'America/Sao_Paulo');
    ELSE
      inicio := NULL;
      fim := NULL;
  END CASE;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.obter_stats_depositos_admin(p_periodo TEXT DEFAULT 'hoje')
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inicio TIMESTAMPTZ;
  v_fim TIMESTAMPTZ;
  v_completos_count INT;
  v_completos_valor NUMERIC;
  v_pendente_count INT;
  v_pendente_valor NUMERIC;
  v_manual_count INT;
  v_manual_valor NUMERIC;
  v_data_label TEXT;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT r.inicio, r.fim INTO v_inicio, v_fim
  FROM public._depositos_periodo_range(p_periodo) r;

  v_data_label := to_char((NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE, 'DD/MM/YYYY');

  IF v_inicio IS NULL THEN
    SELECT COUNT(*)::INT, COALESCE(SUM(valor), 0)
    INTO v_completos_count, v_completos_valor
    FROM public.depositos
    WHERE status = 'aprovado' AND origem = 'pix';

    SELECT COUNT(*)::INT, COALESCE(SUM(valor), 0)
    INTO v_pendente_count, v_pendente_valor
    FROM public.depositos
    WHERE status = 'pendente';

    SELECT COUNT(*)::INT, COALESCE(SUM(valor), 0)
    INTO v_manual_count, v_manual_valor
    FROM public.depositos
    WHERE origem = 'manual' AND status = 'aprovado';
  ELSE
    SELECT COUNT(*)::INT, COALESCE(SUM(valor), 0)
    INTO v_completos_count, v_completos_valor
    FROM public.depositos
    WHERE status = 'aprovado' AND origem = 'pix'
      AND data_hora >= v_inicio AND data_hora < v_fim;

    SELECT COUNT(*)::INT, COALESCE(SUM(valor), 0)
    INTO v_pendente_count, v_pendente_valor
    FROM public.depositos
    WHERE status = 'pendente'
      AND data_hora >= v_inicio AND data_hora < v_fim;

    SELECT COUNT(*)::INT, COALESCE(SUM(valor), 0)
    INTO v_manual_count, v_manual_valor
    FROM public.depositos
    WHERE origem = 'manual' AND status = 'aprovado'
      AND data_hora >= v_inicio AND data_hora < v_fim;
  END IF;

  RETURN json_build_object(
    'ok', true,
    'data_label', v_data_label,
    'completos_count', v_completos_count,
    'completos_valor', v_completos_valor,
    'pendente_count', v_pendente_count,
    'pendente_valor', v_pendente_valor,
    'manual_count', v_manual_count,
    'manual_valor', v_manual_valor
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.listar_depositos_admin(
  p_status TEXT DEFAULT NULL,
  p_periodo TEXT DEFAULT 'todos',
  p_busca TEXT DEFAULT NULL,
  p_pagina INT DEFAULT 1,
  p_por_pagina INT DEFAULT 11
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inicio TIMESTAMPTZ;
  v_fim TIMESTAMPTZ;
  v_offset INT;
  v_total INT;
  v_items JSON;
  v_busca TEXT;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  v_offset := GREATEST((COALESCE(p_pagina, 1) - 1) * COALESCE(p_por_pagina, 11), 0);
  v_busca := NULLIF(TRIM(p_busca), '');

  SELECT r.inicio, r.fim INTO v_inicio, v_fim
  FROM public._depositos_periodo_range(p_periodo) r;

  SELECT COUNT(*)::INT INTO v_total
  FROM public.depositos d
  LEFT JOIN public.usuarios u ON u.id = d.usuario_id
  WHERE
    (v_inicio IS NULL OR (d.data_hora >= v_inicio AND d.data_hora < v_fim))
    AND (
      p_status IS NULL OR p_status = 'todos'
      OR (p_status = 'completo' AND d.status = 'aprovado' AND d.origem = 'pix')
      OR (p_status = 'pendente' AND d.status = 'pendente')
      OR (p_status = 'falhou' AND d.status = 'falhou')
      OR (p_status = 'expirado' AND d.status = 'expirado')
      OR (p_status = 'manual' AND d.origem = 'manual')
    )
    AND (
      v_busca IS NULL
      OR d.id::TEXT ILIKE '%' || v_busca || '%'
      OR REPLACE(d.id::TEXT, '-', '') ILIKE '%' || REPLACE(v_busca, '-', '') || '%'
      OR u.email ILIKE '%' || v_busca || '%'
      OR u.nome ILIKE '%' || v_busca || '%'
      OR u.usuario ILIKE '%' || v_busca || '%'
      OR u.usuario_nome ILIKE '%' || v_busca || '%'
      OR u.cpf ILIKE '%' || v_busca || '%'
    );

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_items
  FROM (
    SELECT
      d.id,
      d.usuario_id,
      d.valor,
      d.status,
      d.origem,
      d.data_hora,
      d.created_at,
      COALESCE(NULLIF(TRIM(u.usuario_nome), ''), NULLIF(TRIM(u.nome), ''), NULLIF(TRIM(u.usuario), ''), split_part(u.email, '@', 1)) AS usuario_nome,
      u.email AS usuario_email,
      u.cargo AS usuario_cargo
    FROM public.depositos d
    LEFT JOIN public.usuarios u ON u.id = d.usuario_id
    WHERE
      (v_inicio IS NULL OR (d.data_hora >= v_inicio AND d.data_hora < v_fim))
      AND (
        p_status IS NULL OR p_status = 'todos'
        OR (p_status = 'completo' AND d.status = 'aprovado' AND d.origem = 'pix')
        OR (p_status = 'pendente' AND d.status = 'pendente')
        OR (p_status = 'falhou' AND d.status = 'falhou')
        OR (p_status = 'expirado' AND d.status = 'expirado')
        OR (p_status = 'manual' AND d.origem = 'manual')
      )
      AND (
        v_busca IS NULL
        OR d.id::TEXT ILIKE '%' || v_busca || '%'
        OR REPLACE(d.id::TEXT, '-', '') ILIKE '%' || REPLACE(v_busca, '-', '') || '%'
        OR u.email ILIKE '%' || v_busca || '%'
        OR u.nome ILIKE '%' || v_busca || '%'
        OR u.usuario ILIKE '%' || v_busca || '%'
        OR u.usuario_nome ILIKE '%' || v_busca || '%'
        OR u.cpf ILIKE '%' || v_busca || '%'
      )
    ORDER BY d.data_hora DESC
    LIMIT COALESCE(p_por_pagina, 11)
    OFFSET v_offset
  ) t;

  RETURN json_build_object(
    'ok', true,
    'total', v_total,
    'pagina', COALESCE(p_pagina, 1),
    'por_pagina', COALESCE(p_por_pagina, 11),
    'items', v_items
  );
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
  v_vip JSON;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  v_status := LOWER(TRIM(p_status));

  IF v_status NOT IN ('aprovado', 'pendente', 'falhou', 'expirado') THEN
    RETURN json_build_object('ok', false, 'error', 'Status inválido');
  END IF;

  SELECT usuario_id, valor, status
  INTO v_usuario_id, v_valor, v_dep_status
  FROM public.depositos
  WHERE id = p_deposito_id
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

    RETURN (json_build_object('ok', true, 'already', false)::jsonb || COALESCE(v_vip, '{}'::json)::jsonb)::json;
  END IF;

  UPDATE public.depositos
  SET status = v_status, updated_at = NOW()
  WHERE id = p_deposito_id;

  RETURN json_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.obter_stats_depositos_admin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.listar_depositos_admin(TEXT, TEXT, TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_status_deposito_admin(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.obter_detalhes_deposito_admin(p_deposito_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deposito RECORD;
  v_usuario RECORD;
  v_multiplicador NUMERIC;
  v_rollover_aplicado NUMERIC;
  v_rollover_data TIMESTAMPTZ;
  v_status_display TEXT;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT
    d.id,
    d.usuario_id,
    d.valor,
    d.status,
    d.origem,
    d.data_hora,
    d.created_at,
    d.updated_at
  INTO v_deposito
  FROM public.depositos d
  WHERE d.id = p_deposito_id;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'Depósito não encontrado');
  END IF;

  SELECT
    u.id,
    COALESCE(NULLIF(TRIM(u.nome), ''), NULLIF(TRIM(u.usuario_nome), ''), NULLIF(TRIM(u.usuario), ''), split_part(u.email, '@', 1)) AS nome,
    NULLIF(TRIM(u.usuario), '') AS usuario,
    u.email
  INTO v_usuario
  FROM public.usuarios u
  WHERE u.id = v_deposito.usuario_id;

  IF v_deposito.origem = 'manual' AND v_deposito.status = 'aprovado' THEN
    v_status_display := 'Saldo Manual';
  ELSE
    v_status_display := CASE v_deposito.status
      WHEN 'aprovado' THEN 'Completo'
      WHEN 'pendente' THEN 'Pendente'
      WHEN 'falhou' THEN 'Falhou'
      WHEN 'expirado' THEN 'Expirado'
      ELSE v_deposito.status
    END;
  END IF;

  SELECT COALESCE(sc.rollover_padrao, 0)
  INTO v_multiplicador
  FROM public.site_config sc
  WHERE sc.id = 1;

  v_multiplicador := COALESCE(v_multiplicador, 0);

  IF v_deposito.status = 'aprovado' AND v_multiplicador > 0 THEN
    v_rollover_aplicado := ROUND(v_deposito.valor * v_multiplicador, 2);
    v_rollover_data := COALESCE(v_deposito.updated_at, v_deposito.data_hora, v_deposito.created_at);
  ELSE
    v_rollover_aplicado := 0;
    v_rollover_data := NULL;
  END IF;

  RETURN json_build_object(
    'ok', true,
    'deposito', json_build_object(
      'id', v_deposito.id,
      'valor', v_deposito.valor,
      'status', v_deposito.status,
      'origem', v_deposito.origem,
      'status_display', v_status_display,
      'data_hora', v_deposito.data_hora,
      'created_at', v_deposito.created_at,
      'updated_at', v_deposito.updated_at
    ),
    'rollover', CASE
      WHEN v_rollover_aplicado > 0 THEN json_build_object(
        'aplicado', v_rollover_aplicado,
        'multiplicador', v_multiplicador,
        'data_aplicacao', v_rollover_data,
        'acao', 'Novo rollover',
        'data_inicio', v_rollover_data
      )
      ELSE NULL
    END,
    'usuario', json_build_object(
      'id', v_usuario.id,
      'nome', COALESCE(v_usuario.nome, '—'),
      'usuario', COALESCE(v_usuario.usuario, NULL),
      'email', COALESCE(v_usuario.email, '—')
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.obter_detalhes_deposito_admin(UUID) TO authenticated;
