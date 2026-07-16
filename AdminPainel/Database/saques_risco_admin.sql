-- Análise de risco para saques no painel admin
-- Execute no SQL Editor do Supabase

CREATE OR REPLACE FUNCTION public.obter_analise_risco_saque_admin(p_saque_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_saque public.saques%ROWTYPE;
  v_usuario public.usuarios%ROWTYPE;
  v_ultimo_login TIMESTAMPTZ;
  v_dias_registrado INT;
  v_total_depositado NUMERIC;
  v_total_sacado NUMERIC;
  v_depositos_pix NUMERIC;
  v_depositos_manual NUMERIC;
  v_reservado_saques NUMERIC;
  v_media_saques NUMERIC;
  v_multiplo_media NUMERIC;
  v_pct_saldo NUMERIC;
  v_total_apostas INT;
  v_total_vitorias INT;
  v_win_rate NUMERIC;
  v_aposta_media NUMERIC;
  v_maior_vitoria NUMERIC;
  v_total_apostado NUMERIC;
  v_total_ganho NUMERIC;
  v_resultado_liquido NUMERIC;
  v_sessao_horas NUMERIC;
  v_sessao_label TEXT;
  v_score INT := 0;
  v_nivel TEXT;
  v_recomendacao TEXT;
  v_descricao TEXT;
  v_fatores JSONB := '[]'::jsonb;
  v_positivos JSONB := '[]'::jsonb;
  v_jogos_recentes JSON;
  v_historico_saques JSON;
  v_documento BOOLEAN;
  v_telefone BOOLEAN;
  v_saques_aprovados INT;
  v_saques_rejeitados INT;
  v_margem_casa NUMERIC;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT * INTO v_saque FROM public.saques WHERE id = p_saque_id;
  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'Saque não encontrado');
  END IF;

  SELECT * INTO v_usuario FROM public.usuarios WHERE id = v_saque.usuario_id;
  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'Usuário não encontrado');
  END IF;

  SELECT au.last_sign_in_at INTO v_ultimo_login
  FROM auth.users au WHERE au.id = v_saque.usuario_id;

  v_dias_registrado := GREATEST(0, EXTRACT(DAY FROM (NOW() - v_usuario.created_at))::INT);

  SELECT COALESCE(SUM(valor), 0) INTO v_total_depositado
  FROM public.depositos
  WHERE usuario_id = v_saque.usuario_id AND status = 'aprovado';

  SELECT COALESCE(SUM(valor), 0) INTO v_depositos_pix
  FROM public.depositos
  WHERE usuario_id = v_saque.usuario_id AND status = 'aprovado' AND COALESCE(origem, 'pix') = 'pix';

  SELECT COALESCE(SUM(valor), 0) INTO v_depositos_manual
  FROM public.depositos
  WHERE usuario_id = v_saque.usuario_id AND status = 'aprovado' AND origem = 'manual';

  SELECT COALESCE(SUM(valor), 0) INTO v_total_sacado
  FROM public.saques
  WHERE usuario_id = v_saque.usuario_id AND status = 'aprovado';

  SELECT COALESCE(SUM(valor), 0) INTO v_reservado_saques
  FROM public.saques
  WHERE usuario_id = v_saque.usuario_id AND status = 'pendente';

  SELECT COALESCE(AVG(valor), 0) INTO v_media_saques
  FROM public.saques
  WHERE usuario_id = v_saque.usuario_id
    AND status = 'aprovado'
    AND id != p_saque_id;

  IF v_media_saques > 0 THEN
    v_multiplo_media := ROUND(v_saque.valor / v_media_saques, 1);
  ELSE
    v_multiplo_media := CASE WHEN v_saque.valor > 0 THEN 1 ELSE 0 END;
  END IF;

  IF (COALESCE(v_usuario.saldo, 0) + v_reservado_saques) > 0 THEN
    v_pct_saldo := ROUND((v_saque.valor / (COALESCE(v_usuario.saldo, 0) + v_reservado_saques)) * 100, 0);
  ELSE
    v_pct_saldo := 100;
  END IF;

  SELECT COUNT(*)::INT INTO v_total_apostas
  FROM public.transacoes_jogos
  WHERE usuario_id = v_saque.usuario_id AND tipo = 'Perdeu';

  SELECT COUNT(*)::INT INTO v_total_vitorias
  FROM public.transacoes_jogos
  WHERE usuario_id = v_saque.usuario_id AND tipo = 'Ganhou';

  v_win_rate := CASE
    WHEN v_total_apostas > 0 THEN ROUND((v_total_vitorias::NUMERIC / v_total_apostas) * 100, 1)
    ELSE 0
  END;

  SELECT COALESCE(AVG(valor), 0) INTO v_aposta_media
  FROM public.transacoes_jogos
  WHERE usuario_id = v_saque.usuario_id AND tipo = 'Perdeu';

  SELECT COALESCE(MAX(retorno), 0) INTO v_maior_vitoria
  FROM public.transacoes_jogos
  WHERE usuario_id = v_saque.usuario_id AND tipo = 'Ganhou';

  SELECT COALESCE(SUM(valor), 0) INTO v_total_apostado
  FROM public.transacoes_jogos
  WHERE usuario_id = v_saque.usuario_id AND tipo = 'Perdeu';

  SELECT COALESCE(SUM(retorno), 0) INTO v_total_ganho
  FROM public.transacoes_jogos
  WHERE usuario_id = v_saque.usuario_id AND tipo = 'Ganhou';

  v_resultado_liquido := v_total_ganho - v_total_apostado;

  SELECT COALESCE(MAX(EXTRACT(EPOCH FROM (s.updated_at - s.created_at)) / 3600), 0)
  INTO v_sessao_horas
  FROM auth.sessions s
  WHERE s.user_id = v_saque.usuario_id;

  IF v_sessao_horas >= 1 THEN
    v_sessao_label := ROUND(v_sessao_horas)::TEXT || 'h';
  ELSE
    v_sessao_label := ROUND(v_sessao_horas * 60)::TEXT || 'min';
  END IF;

  SELECT COUNT(*)::INT INTO v_saques_aprovados
  FROM public.saques
  WHERE usuario_id = v_saque.usuario_id AND status = 'aprovado' AND id != p_saque_id;

  SELECT COUNT(*)::INT INTO v_saques_rejeitados
  FROM public.saques
  WHERE usuario_id = v_saque.usuario_id AND status IN ('rejeitado', 'falhou');

  v_documento := COALESCE(NULLIF(TRIM(v_usuario.cpf), ''), '') <> '';
  v_telefone := COALESCE(NULLIF(TRIM(v_usuario.telefone), ''), '') <> '';

  -- Fatores de risco
  IF v_multiplo_media > 2 THEN
    v_score := v_score + 20;
    v_fatores := v_fatores || jsonb_build_array(jsonb_build_object(
      'titulo', 'Valor acima da média',
      'descricao', 'Saque ' || v_multiplo_media::TEXT || 'x acima da média anterior de ' ||
        to_char(v_media_saques, 'FM999G999D00') || '.'
    ));
  END IF;

  IF v_pct_saldo >= 80 THEN
    v_score := v_score + 15;
    v_fatores := v_fatores || jsonb_build_array(jsonb_build_object(
      'titulo', 'Alto percentual do saldo',
      'descricao', 'Representa ' || v_pct_saldo::TEXT || '% do saldo disponível + reservado.'
    ));
  END IF;

  IF v_resultado_liquido > 0 THEN
    v_score := v_score + 25;
    v_fatores := v_fatores || jsonb_build_array(jsonb_build_object(
      'titulo', 'Jogador lucrando',
      'descricao', 'Resultado líquido positivo de R$ ' || to_char(v_resultado_liquido, 'FM999G999D00') || ' nos jogos.'
    ));
  END IF;

  IF v_dias_registrado < 7 THEN
    v_score := v_score + 15;
    v_fatores := v_fatores || jsonb_build_array(jsonb_build_object(
      'titulo', 'Conta recente',
      'descricao', 'Usuário registrado há apenas ' || v_dias_registrado::TEXT || ' dias.'
    ));
  END IF;

  IF v_win_rate > 100 THEN
    v_score := v_score + 10;
    v_fatores := v_fatores || jsonb_build_array(jsonb_build_object(
      'titulo', 'Win rate elevado',
      'descricao', 'Taxa de vitórias de ' || v_win_rate::TEXT || '% — acima do esperado.'
    ));
  END IF;

  IF NOT v_documento OR NOT v_telefone THEN
    v_score := v_score + 15;
    v_fatores := v_fatores || jsonb_build_array(jsonb_build_object(
      'titulo', 'Dados incompletos',
      'descricao', 'Documento ou telefone não cadastrado.'
    ));
  END IF;

  IF v_saques_rejeitados > v_saques_aprovados AND v_saques_rejeitados > 0 THEN
    v_score := v_score + 10;
    v_fatores := v_fatores || jsonb_build_array(jsonb_build_object(
      'titulo', 'Histórico de rejeições',
      'descricao', v_saques_rejeitados::TEXT || ' saque(s) rejeitado(s) vs ' || v_saques_aprovados::TEXT || ' aprovado(s).'
    ));
  END IF;

  -- Indicadores positivos
  IF v_resultado_liquido < 0 AND v_total_apostado > 0 THEN
    v_margem_casa := ROUND((ABS(v_resultado_liquido) / v_total_apostado) * 100, 0);
    IF v_margem_casa >= 10 THEN
      v_score := v_score - 15;
      v_positivos := v_positivos || jsonb_build_array(jsonb_build_object(
        'titulo', 'Cliente lucrativo pra casa',
        'descricao', 'Casa lucrou R$ ' || to_char(ABS(v_resultado_liquido), 'FM999G999D00') ||
          ' (' || v_margem_casa::TEXT || '% do apostado) — perfil de baixo risco',
        'pontos', -15
      ));
    END IF;
  END IF;

  IF v_documento AND v_telefone THEN
    v_score := v_score - 5;
    v_positivos := v_positivos || jsonb_build_array(jsonb_build_object(
      'titulo', 'Dados completos',
      'descricao', 'Documento e telefone cadastrados',
      'pontos', -5
    ));
  END IF;

  IF v_depositos_pix > 0 AND v_total_depositado > 0 THEN
    v_score := v_score - 5;
    v_positivos := v_positivos || jsonb_build_array(jsonb_build_object(
      'titulo', 'Depósitos regulares',
      'descricao', 'Histórico de depósitos via PIX confirmados',
      'pontos', -5
    ));
  END IF;

  v_score := GREATEST(0, LEAST(100, v_score));

  IF v_score <= 25 THEN
    v_nivel := 'Risco Baixo';
    v_recomendacao := 'Recomenda-se aprovar';
    v_descricao := 'Score baixo. Perfil de baixo risco — pode aprovar com confiança.';
  ELSIF v_score <= 50 THEN
    v_nivel := 'Risco Moderado';
    v_recomendacao := 'Analisar com atenção';
    v_descricao := 'Score moderado. Revise os fatores antes de aprovar.';
  ELSIF v_score <= 75 THEN
    v_nivel := 'Risco Alto';
    v_recomendacao := 'Cautela recomendada';
    v_descricao := 'Score alto. Verifique indicadores de risco antes de aprovar.';
  ELSE
    v_nivel := 'Risco Crítico';
    v_recomendacao := 'Não recomendado aprovar';
    v_descricao := 'Score crítico. Múltiplos fatores de risco detectados.';
  END IF;

  SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.data DESC), '[]'::json)
  INTO v_jogos_recentes
  FROM (
    SELECT
      jogo,
      COALESCE(NULLIF(split_part(jogo, ' - ', 2), ''), '—') AS provedor,
      valor,
      retorno,
      tipo,
      data
    FROM public.transacoes_jogos
    WHERE usuario_id = v_saque.usuario_id
    ORDER BY data DESC
    LIMIT 10
  ) t;

  SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.data_hora DESC), '[]'::json)
  INTO v_historico_saques
  FROM (
    SELECT id, valor, status, data_hora
    FROM public.saques
    WHERE usuario_id = v_saque.usuario_id AND id != p_saque_id
    ORDER BY data_hora DESC
    LIMIT 10
  ) t;

  RETURN json_build_object(
    'ok', true,
    'saque', json_build_object(
      'id', v_saque.id,
      'valor', v_saque.valor,
      'status', v_saque.status,
      'data_hora', v_saque.data_hora,
      'usuario_id', v_saque.usuario_id
    ),
    'usuario', json_build_object(
      'email', v_usuario.email,
      'nome', COALESCE(NULLIF(TRIM(v_usuario.usuario_nome), ''), NULLIF(TRIM(v_usuario.nome), ''), split_part(v_usuario.email, '@', 1))
    ),
    'analise', json_build_object(
      'score', v_score,
      'nivel', v_nivel,
      'recomendacao', v_recomendacao,
      'descricao', v_descricao,
      'fatores_risco', v_fatores::json,
      'indicadores_positivos', v_positivos::json
    ),
    'saque_info', json_build_object(
      'valor_solicitado', v_saque.valor,
      'media_anterior', v_media_saques,
      'multiplo_media', v_multiplo_media,
      'pct_saldo', v_pct_saldo,
      'solicitado_em', v_saque.data_hora
    ),
    'perfil', json_build_object(
      'dias_registrado', v_dias_registrado,
      'total_depositado', v_total_depositado,
      'total_sacado', v_total_sacado,
      'ultimo_login', v_ultimo_login,
      'depositos_regulares', v_depositos_pix,
      'depositos_internos', v_depositos_manual,
      'documento_fornecido', v_documento,
      'telefone_fornecido', v_telefone
    ),
    'carteira', json_build_object(
      'saldo_atual', COALESCE(v_usuario.saldo, 0),
      'reservado_saques', v_reservado_saques,
      'total_depositado', v_total_depositado,
      'total_sacado', v_total_sacado
    ),
    'jogos', json_build_object(
      'total_apostas', v_total_apostas,
      'total_vitorias', v_total_vitorias,
      'win_rate', v_win_rate,
      'aposta_media', v_aposta_media,
      'maior_vitoria', v_maior_vitoria,
      'sessao_mais_longa', v_sessao_label,
      'total_apostado', v_total_apostado,
      'total_ganho', v_total_ganho,
      'resultado_liquido_jogador', v_resultado_liquido
    ),
    'jogos_recentes', v_jogos_recentes,
    'historico_saques', v_historico_saques
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.obter_analise_risco_saque_admin(UUID) TO authenticated;
