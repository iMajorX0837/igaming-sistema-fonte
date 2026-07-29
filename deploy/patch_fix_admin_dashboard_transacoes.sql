-- =============================================================================
-- Fix admin — dashboard stats (overload duplicado) + transações por usuário
-- Execute no SQL Editor do Supabase.
--
-- Problemas corrigidos:
-- 1) PGRST203: obter_stats_dashboard_admin — duas assinaturas (1 arg vs 3 args)
-- 2) listar_transacoes_usuario_admin — garantir assinatura p_limite/p_offset
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Dashboard — remover overload antigo (só p_periodo)
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.obter_stats_dashboard_admin(TEXT);

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

-- -----------------------------------------------------------------------------
-- 2) Transações do usuário (aba em /usuarios/:id)
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.listar_transacoes_usuario_admin(UUID, TEXT, INT);
DROP FUNCTION IF EXISTS public.listar_transacoes_usuario_admin(UUID, TEXT, INT, INT);

CREATE OR REPLACE FUNCTION public.listar_transacoes_usuario_admin(
  p_usuario_id UUID,
  p_tipo TEXT DEFAULT 'todos',
  p_limite INT DEFAULT 10,
  p_offset INT DEFAULT 0
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_depositos JSON;
  v_saques JSON;
  v_apostas JSON;
  v_total_depositos INT := 0;
  v_total_saques INT := 0;
  v_total_apostas INT := 0;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT COUNT(*)::INT INTO v_total_depositos
  FROM public.depositos
  WHERE usuario_id = p_usuario_id;

  SELECT COUNT(*)::INT INTO v_total_saques
  FROM public.saques
  WHERE usuario_id = p_usuario_id;

  SELECT COUNT(*)::INT INTO v_total_apostas
  FROM public.transacoes_jogos
  WHERE usuario_id = p_usuario_id;

  IF p_tipo IN ('todos', 'depositos') THEN
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.data_hora DESC), '[]'::json)
    INTO v_depositos
    FROM (
      SELECT id, valor, status, data_hora, created_at
      FROM public.depositos
      WHERE usuario_id = p_usuario_id
      ORDER BY data_hora DESC
      LIMIT p_limite
      OFFSET p_offset
    ) t;
  ELSE
    v_depositos := '[]'::json;
  END IF;

  IF p_tipo IN ('todos', 'saques') THEN
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.data_hora DESC), '[]'::json)
    INTO v_saques
    FROM (
      SELECT id, valor, status, data_hora, created_at
      FROM public.saques
      WHERE usuario_id = p_usuario_id
      ORDER BY data_hora DESC
      LIMIT p_limite
      OFFSET p_offset
    ) t;
  ELSE
    v_saques := '[]'::json;
  END IF;

  IF p_tipo IN ('todos', 'apostas') THEN
    SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.data DESC), '[]'::json)
    INTO v_apostas
    FROM (
      SELECT id, jogo, valor, retorno, tipo, status, com_bonus, data, created_at
      FROM public.transacoes_jogos
      WHERE usuario_id = p_usuario_id
      ORDER BY data DESC
      LIMIT p_limite
      OFFSET p_offset
    ) t;
  ELSE
    v_apostas := '[]'::json;
  END IF;

  RETURN json_build_object(
    'ok', true,
    'depositos', v_depositos,
    'saques', v_saques,
    'apostas', v_apostas,
    'total_depositos', v_total_depositos,
    'total_saques', v_total_saques,
    'total_apostas', v_total_apostas
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.listar_transacoes_usuario_admin(UUID, TEXT, INT, INT) TO authenticated;
