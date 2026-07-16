-- Estatísticas do dashboard admin (cards de resumo)
-- Execute no SQL Editor do Supabase (requer depositos_admin.sql para _depositos_periodo_range)

CREATE OR REPLACE FUNCTION public.obter_stats_dashboard_admin(
  p_periodo TEXT DEFAULT 'hoje',
  p_data_inicio DATE DEFAULT NULL,
  p_data_fim DATE DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inicio TIMESTAMPTZ;
  v_fim TIMESTAMPTZ;
  v_novos_usuarios INT;
  v_depositos_count INT;
  v_depositos_valor NUMERIC;
  v_saques_count INT;
  v_saques_valor NUMERIC;
  v_volume_apostas NUMERIC;
  v_ganhos_jogadores NUMERIC;
  v_rtp_medio NUMERIC;
  v_ftd INT;
  v_taxa_conversao NUMERIC;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF p_data_inicio IS NOT NULL AND p_data_fim IS NOT NULL THEN
    IF p_data_fim < p_data_inicio THEN
      RAISE EXCEPTION 'Data final inválida';
    END IF;

    v_inicio := (p_data_inicio::TIMESTAMP AT TIME ZONE 'America/Sao_Paulo');
    v_fim := ((p_data_fim + 1)::TIMESTAMP AT TIME ZONE 'America/Sao_Paulo');
  ELSE
    SELECT r.inicio, r.fim INTO v_inicio, v_fim
    FROM public._depositos_periodo_range(p_periodo) r;

    IF v_inicio IS NULL THEN
      RAISE EXCEPTION 'Período inválido';
    END IF;
  END IF;

  SELECT COUNT(*)::INT
  INTO v_novos_usuarios
  FROM public.usuarios
  WHERE created_at >= v_inicio AND created_at < v_fim;

  SELECT COUNT(*)::INT, COALESCE(SUM(valor), 0)
  INTO v_depositos_count, v_depositos_valor
  FROM public.depositos
  WHERE status = 'aprovado'
    AND data_hora >= v_inicio AND data_hora < v_fim;

  SELECT COUNT(*)::INT, COALESCE(SUM(valor), 0)
  INTO v_saques_count, v_saques_valor
  FROM public.saques
  WHERE status = 'aprovado'
    AND origem = 'pix'
    AND data_hora >= v_inicio AND data_hora < v_fim;

  SELECT COALESCE(SUM(valor), 0)
  INTO v_volume_apostas
  FROM public.transacoes_jogos
  WHERE tipo = 'Perdeu'
    AND COALESCE(data, created_at) >= v_inicio
    AND COALESCE(data, created_at) < v_fim;

  SELECT COALESCE(SUM(retorno), 0)
  INTO v_ganhos_jogadores
  FROM public.transacoes_jogos
  WHERE tipo = 'Ganhou'
    AND COALESCE(data, created_at) >= v_inicio
    AND COALESCE(data, created_at) < v_fim;

  v_rtp_medio := CASE
    WHEN v_volume_apostas > 0 THEN ROUND((v_ganhos_jogadores / v_volume_apostas) * 100, 2)
    ELSE 0
  END;

  SELECT COUNT(DISTINCT u.id)::INT
  INTO v_ftd
  FROM public.usuarios u
  WHERE u.created_at >= v_inicio
    AND u.created_at < v_fim
    AND EXISTS (
      SELECT 1
      FROM public.depositos d
      WHERE d.usuario_id = u.id
        AND d.status = 'aprovado'
    );

  v_taxa_conversao := CASE
    WHEN v_novos_usuarios > 0 THEN ROUND((v_ftd::NUMERIC / v_novos_usuarios) * 100, 2)
    ELSE 0
  END;

  RETURN json_build_object(
    'ok', true,
    'novos_usuarios', v_novos_usuarios,
    'depositos_valor', v_depositos_valor,
    'depositos_count', v_depositos_count,
    'saques_valor', v_saques_valor,
    'saques_count', v_saques_count,
    'volume_apostas', v_volume_apostas,
    'ganhos_jogadores', v_ganhos_jogadores,
    'rtp_medio', v_rtp_medio,
    'ftd', v_ftd,
    'taxa_conversao', v_taxa_conversao,
    'deposito_medio', CASE WHEN v_depositos_count > 0 THEN ROUND(v_depositos_valor / v_depositos_count, 2) ELSE 0 END,
    'saque_medio', CASE WHEN v_saques_count > 0 THEN ROUND(v_saques_valor / v_saques_count, 2) ELSE 0 END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.obter_stats_dashboard_admin(TEXT, DATE, DATE) TO authenticated;

CREATE OR REPLACE FUNCTION public.listar_transacoes_recentes_admin(
  p_limite INT DEFAULT 10
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_items JSON;
  v_limite INT;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  v_limite := LEAST(GREATEST(COALESCE(p_limite, 10), 1), 50);

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  INTO v_items
  FROM (
    SELECT *
    FROM (
      SELECT
        d.id,
        d.usuario_id,
        'deposito'::TEXT AS tipo,
        d.valor,
        d.status,
        d.origem,
        COALESCE(d.data_hora, d.created_at) AS data_hora,
        COALESCE(
          NULLIF(TRIM(u.usuario_nome), ''),
          NULLIF(TRIM(u.nome), ''),
          NULLIF(TRIM(u.usuario), ''),
          split_part(u.email, '@', 1)
        ) AS usuario_nome,
        u.email AS usuario_email
      FROM public.depositos d
      LEFT JOIN public.usuarios u ON u.id = d.usuario_id

      UNION ALL

      SELECT
        s.id,
        s.usuario_id,
        'saque'::TEXT AS tipo,
        s.valor,
        s.status,
        s.origem,
        COALESCE(s.data_hora, s.created_at) AS data_hora,
        COALESCE(
          NULLIF(TRIM(u.usuario_nome), ''),
          NULLIF(TRIM(u.nome), ''),
          NULLIF(TRIM(u.usuario), ''),
          split_part(u.email, '@', 1)
        ) AS usuario_nome,
        u.email AS usuario_email
      FROM public.saques s
      LEFT JOIN public.usuarios u ON u.id = s.usuario_id
    ) transacoes
    ORDER BY data_hora DESC
    LIMIT v_limite
  ) t;

  RETURN json_build_object(
    'ok', true,
    'items', v_items
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.listar_transacoes_recentes_admin(INT) TO authenticated;
