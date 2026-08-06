--
-- PostgreSQL database dump
--

\restrict 5dXLqczpklGdWCOCHlUxsn8xjKOpNkGhNUw4yXLyNp1vbtUhhA7J6vPcPexrdZe

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: _admin_cms_secao_label(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._admin_cms_secao_label(p_secao text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT CASE p_secao
    WHEN 'home_banner' THEN 'Banner Home'
    WHEN 'recommended' THEN 'Banner Recomendado'
    WHEN 'promotion' THEN 'Banner Promoção'
    WHEN 'quick_nav' THEN 'Atalho Home'
    WHEN 'sidebar_card' THEN 'Card Sidebar'
    WHEN 'sidebar_category' THEN 'Categoria Sidebar'
    WHEN 'sidebar_menu_item' THEN 'Item Menu Sidebar'
    ELSE 'Item CMS'
  END;
$$;


--
-- Name: _admin_table_categoria(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._admin_table_categoria(p_table text) RETURNS text
    LANGUAGE sql IMMUTABLE
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


--
-- Name: _admin_table_label(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._admin_table_label(p_table text) RETURNS text
    LANGUAGE sql IMMUTABLE
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


--
-- Name: _assert_referral_code_caller(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._assert_referral_code_caller(p_referral_code text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF p_referral_code IS NULL OR TRIM(p_referral_code) = '' THEN
    RETURN;
  END IF;

  IF public.is_user_admin() THEN
    RETURN;
  END IF;

  IF TRIM(COALESCE(public.get_current_user_referral_code(), '')) IS DISTINCT FROM TRIM(p_referral_code) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
END;
$$;


--
-- Name: _aviator_bet_txn_id(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._aviator_bet_txn_id(p_txn_id text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $_$
  SELECT CASE
    WHEN COALESCE(p_txn_id, '') ~ '_(win|refund|crash)$'
      THEN regexp_replace(p_txn_id, '_(win|refund|crash)$', '_bet')
    ELSE NULL
  END;
$_$;


--
-- Name: FUNCTION _aviator_bet_txn_id(p_txn_id text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public._aviator_bet_txn_id(p_txn_id text) IS 'Deriva txn_id da aposta (_bet) a partir de _win, _refund ou _crash.';


--
-- Name: _aviator_com_bonus_eh_sim(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._aviator_com_bonus_eh_sim(p_com_bonus text) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT lower(trim(COALESCE(p_com_bonus, ''))) IN ('sim', 's', 'true', '1', 'yes');
$$;


--
-- Name: _aviator_resolve_usuario(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._aviator_resolve_usuario(p_email text) RETURNS TABLE(usuario_id uuid, saldo numeric, saldo_bonus numeric, carteira_ativa text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_email TEXT;
BEGIN
  v_email := lower(trim(COALESCE(p_email, '')));
  IF v_email = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT u.id, COALESCE(u.saldo, 0), COALESCE(u.saldo_bonus, 0), COALESCE(u.carteira_ativa, 'real')
  FROM public.usuarios u
  WHERE lower(trim(u.email)) = v_email
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT u.id, COALESCE(u.saldo, 0), COALESCE(u.saldo_bonus, 0), COALESCE(u.carteira_ativa, 'real')
  FROM public.usuarios u
  WHERE u.email ILIKE v_email
  LIMIT 1
  FOR UPDATE;
END;
$$;


--
-- Name: _aviator_usa_bonus_aposta(uuid, text, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._aviator_usa_bonus_aposta(p_usuario_id uuid, p_txn_id text, p_usa_bonus_forcado boolean DEFAULT NULL::boolean) RETURNS boolean
    LANGUAGE plpgsql STABLE
    SET search_path TO 'public'
    AS $_$
DECLARE
  v_bet_txn TEXT;
  v_com_bonus TEXT;
BEGIN
  IF p_usa_bonus_forcado IS NOT NULL THEN
    RETURN p_usa_bonus_forcado;
  END IF;

  v_bet_txn := public._aviator_bet_txn_id(p_txn_id);

  IF v_bet_txn IS NOT NULL THEN
    SELECT t.com_bonus
    INTO v_com_bonus
    FROM public.transacoes_jogos t
    WHERE t.txn_id = v_bet_txn
    LIMIT 1;

    IF v_com_bonus IS NOT NULL THEN
      RETURN public._aviator_com_bonus_eh_sim(v_com_bonus);
    END IF;
  END IF;

  -- Seguro: sem txn _bet, assume R$ (evita jogar ganho real em B$)
  RETURN FALSE;
END;
$_$;


--
-- Name: _aviator_usa_bonus_aposta(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._aviator_usa_bonus_aposta(p_usuario_id uuid, p_txn_id text, p_carteira text) RETURNS boolean
    LANGUAGE plpgsql STABLE
    SET search_path TO 'public'
    AS $$
DECLARE
  v_bet_txn TEXT;
  v_com_bonus TEXT;
BEGIN
  v_bet_txn := public._aviator_bet_txn_id(p_txn_id);

  IF v_bet_txn IS NOT NULL THEN
    SELECT t.com_bonus
    INTO v_com_bonus
    FROM public.transacoes_jogos t
    WHERE t.txn_id = v_bet_txn
      AND t.usuario_id = p_usuario_id
    LIMIT 1;

    IF v_com_bonus IS NOT NULL THEN
      RETURN v_com_bonus = 'Sim';
    END IF;
  END IF;

  RETURN public._carteira_usa_bonus(p_carteira);
END;
$$;


--
-- Name: FUNCTION _aviator_usa_bonus_aposta(p_usuario_id uuid, p_txn_id text, p_carteira text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public._aviator_usa_bonus_aposta(p_usuario_id uuid, p_txn_id text, p_carteira text) IS 'Aviator: carteira da aposta via com_bonus do _bet; fallback carteira_ativa.';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: cupons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cupons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome_admin text NOT NULL,
    codigo text NOT NULL,
    ativo boolean DEFAULT true NOT NULL,
    tipo_valor text NOT NULL,
    valor numeric(10,2) NOT NULL,
    tipo_bonus text DEFAULT 'saldo_real'::text NOT NULL,
    deposito_minimo numeric(10,2),
    bonus_maximo numeric(10,2),
    limite_uso_total integer,
    limite_uso_por_usuario integer DEFAULT 1 NOT NULL,
    usos_total integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    jogo_slug text,
    jogo_nome text,
    provider_slug text DEFAULT 'pragmatic'::text,
    CONSTRAINT cupons_bonus_maximo_nonneg CHECK (((bonus_maximo IS NULL) OR (bonus_maximo > (0)::numeric))),
    CONSTRAINT cupons_deposito_minimo_nonneg CHECK (((deposito_minimo IS NULL) OR (deposito_minimo >= (0)::numeric))),
    CONSTRAINT cupons_limite_uso_por_usuario_pos CHECK ((limite_uso_por_usuario > 0)),
    CONSTRAINT cupons_limite_uso_total_pos CHECK (((limite_uso_total IS NULL) OR (limite_uso_total > 0))),
    CONSTRAINT cupons_tipo_bonus_check CHECK ((tipo_bonus = ANY (ARRAY['saldo_real'::text, 'giros_gratis'::text]))),
    CONSTRAINT cupons_tipo_valor_check CHECK ((tipo_valor = ANY (ARRAY['porcentagem'::text, 'fixo'::text]))),
    CONSTRAINT cupons_valor_check CHECK ((valor > (0)::numeric))
);


--
-- Name: TABLE cupons; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cupons IS 'Cupons promocionais configuráveis pelo administrador';


--
-- Name: COLUMN cupons.jogo_slug; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cupons.jogo_slug IS 'Slug do jogo (apenas cupons giros_gratis)';


--
-- Name: COLUMN cupons.jogo_nome; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cupons.jogo_nome IS 'Nome exibido do jogo (apenas cupons giros_gratis)';


--
-- Name: COLUMN cupons.provider_slug; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cupons.provider_slug IS 'Slug do provedor, ex: pragmatic';


--
-- Name: _buscar_cupom_ativo(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._buscar_cupom_ativo(p_codigo text) RETURNS public.cupons
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_cupom public.cupons;
BEGIN
  SELECT * INTO v_cupom
  FROM public.cupons
  WHERE UPPER(TRIM(codigo)) = UPPER(TRIM(p_codigo))
    AND ativo = true;

  RETURN v_cupom;
END;
$$;


--
-- Name: _calcular_bonus_cupom(text, numeric, numeric, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._calcular_bonus_cupom(p_tipo_valor text, p_valor numeric, p_bonus_maximo numeric, p_valor_deposito numeric DEFAULT NULL::numeric) RETURNS numeric
    LANGUAGE plpgsql IMMUTABLE
    AS $$
DECLARE
  v_bonus NUMERIC;
BEGIN
  IF p_tipo_valor = 'fixo' THEN
    RETURN ROUND(p_valor, 2);
  END IF;

  IF p_valor_deposito IS NULL OR p_valor_deposito <= 0 THEN
    RETURN 0;
  END IF;

  v_bonus := ROUND(p_valor_deposito * (p_valor / 100.0), 2);

  IF p_bonus_maximo IS NOT NULL AND v_bonus > p_bonus_maximo THEN
    v_bonus := p_bonus_maximo;
  END IF;

  RETURN v_bonus;
END;
$$;


--
-- Name: _carteira_usa_bonus(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._carteira_usa_bonus(p_carteira text) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT COALESCE(p_carteira, 'real') = 'bonus';
$$;


--
-- Name: _conceder_giros_gratis(public.cupons, uuid, uuid, numeric, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._conceder_giros_gratis(p_cupom public.cupons, p_usuario_id uuid, p_deposito_id uuid DEFAULT NULL::uuid, p_valor_deposito numeric DEFAULT NULL::numeric, p_origem text DEFAULT 'manual'::text, p_status_giro text DEFAULT 'disponivel'::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_uso_id UUID;
  v_validacao JSON;
BEGIN
  v_validacao := public._validar_cupom_giros(p_cupom);
  IF NOT (v_validacao->>'ok')::BOOLEAN THEN
    RAISE EXCEPTION 'invalid_spin_coupon: %', v_validacao->>'error';
  END IF;

  INSERT INTO public.cupom_usos (
    cupom_id,
    usuario_id,
    deposito_id,
    valor_bonus,
    valor_deposito,
    quantidade_giros,
    jogo_slug,
    jogo_nome,
    origem,
    status_giro
  )
  VALUES (
    p_cupom.id,
    p_usuario_id,
    p_deposito_id,
    0,
    p_valor_deposito,
    TRUNC(p_cupom.valor)::INT,
    p_cupom.jogo_slug,
    p_cupom.jogo_nome,
    p_origem,
    p_status_giro
  )
  RETURNING id INTO v_uso_id;

  UPDATE public.cupons
  SET usos_total = usos_total + 1, updated_at = NOW()
  WHERE id = p_cupom.id;

  RETURN v_uso_id;
END;
$$;


--
-- Name: _depositos_periodo_range(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._depositos_periodo_range(p_periodo text) RETURNS TABLE(inicio timestamp with time zone, fim timestamp with time zone)
    LANGUAGE plpgsql IMMUTABLE
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


--
-- Name: _ganho_eh_de_giros_gratis(uuid, numeric, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._ganho_eh_de_giros_gratis(p_usuario_id uuid, p_bet numeric, p_win numeric) RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF p_usuario_id IS NULL OR COALESCE(p_bet, 0) > 0 OR COALESCE(p_win, 0) <= 0 THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.cupom_usos cu
    INNER JOIN public.cupons c ON c.id = cu.cupom_id
    WHERE cu.usuario_id = p_usuario_id
      AND c.tipo_bonus = 'giros_gratis'
      AND cu.status_giro IN ('disponivel', 'usado')
      AND cu.giros_ativado_em IS NOT NULL
      AND cu.giros_ativado_em > (TIMEZONE('utc'::text, NOW()) - INTERVAL '30 minutes')
  );
END;
$$;


--
-- Name: _jogo_giros_permitido(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._jogo_giros_permitido(p_slug text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
  RETURN LOWER(TRIM(p_slug)) IN (
    'gates-of-olympus',
    'starlight-princess',
    'sweet-bonanza',
    'sugar-rush',
    'starlight-princess-1000',
    'gates-of-olympus-1000',
    'sweet-bonanza-1000',
    'sugar-rush-1000',
    'o-vira-lata-caramelo'
  );
END;
$$;


--
-- Name: _request_header(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._request_header(p_name text) RETURNS text
    LANGUAGE sql STABLE
    AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.headers', true), '')::json->>lower(p_name),
    NULLIF(current_setting('request.headers', true), '')::json->>p_name
  );
$$;


--
-- Name: _saldo_jogavel_carteira(numeric, numeric, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._saldo_jogavel_carteira(p_saldo numeric, p_saldo_bonus numeric, p_carteira text) RETURNS numeric
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT ROUND(
    CASE
      WHEN COALESCE(p_carteira, 'real') = 'bonus' THEN COALESCE(p_saldo_bonus, 0)
      ELSE COALESCE(p_saldo, 0)
    END,
    2
  );
$$;


--
-- Name: _validar_cupom_giros(public.cupons); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._validar_cupom_giros(p_cupom public.cupons) RETURNS json
    LANGUAGE plpgsql IMMUTABLE
    AS $$
BEGIN
  IF p_cupom.tipo_bonus <> 'giros_gratis' THEN
    RETURN json_build_object('ok', true);
  END IF;

  IF p_cupom.tipo_valor <> 'fixo' THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_spin_coupon_type');
  END IF;

  IF p_cupom.jogo_slug IS NULL OR TRIM(p_cupom.jogo_slug) = '' THEN
    RETURN json_build_object('ok', false, 'error', 'missing_game');
  END IF;

  IF NOT public._jogo_giros_permitido(p_cupom.jogo_slug) THEN
    RETURN json_build_object('ok', false, 'error', 'game_not_allowed');
  END IF;

  IF p_cupom.valor IS NULL OR p_cupom.valor <= 0 OR p_cupom.valor != TRUNC(p_cupom.valor) THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_spin_count');
  END IF;

  RETURN json_build_object('ok', true);
END;
$$;


--
-- Name: _validar_limites_cupom(public.cupons, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public._validar_limites_cupom(p_cupom public.cupons, p_usuario_id uuid) RETURNS json
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_usos_usuario INT;
BEGIN
  IF p_cupom.id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_coupon');
  END IF;

  IF p_cupom.limite_uso_total IS NOT NULL AND p_cupom.usos_total >= p_cupom.limite_uso_total THEN
    RETURN json_build_object('ok', false, 'error', 'usage_limit_reached');
  END IF;

  SELECT COUNT(*)::INT INTO v_usos_usuario
  FROM public.cupom_usos
  WHERE cupom_id = p_cupom.id AND usuario_id = p_usuario_id;

  IF v_usos_usuario >= p_cupom.limite_uso_por_usuario THEN
    RETURN json_build_object('ok', false, 'error', 'user_limit_reached');
  END IF;

  RETURN json_build_object('ok', true);
END;
$$;


--
-- Name: abater_rollover_aposta(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.abater_rollover_aposta() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_valor_aposta NUMERIC;
BEGIN
  v_valor_aposta := COALESCE(NEW.valor, 0);
  IF v_valor_aposta <= 0 OR NEW.usuario_id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM set_config('app.skip_usuario_guard', 'true', true);

  UPDATE public.usuarios
  SET
    rollover_pendente = GREATEST(0, COALESCE(rollover_pendente, 0) - v_valor_aposta),
    rollover_bonus_pendente = GREATEST(0, COALESCE(rollover_bonus_pendente, 0) - v_valor_aposta)
  WHERE id = NEW.usuario_id
    AND (
      COALESCE(rollover_pendente, 0) > 0
      OR COALESCE(rollover_bonus_pendente, 0) > 0
    );

  RETURN NEW;
END;
$$;


--
-- Name: adicionar_membro_equipe(text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.adicionar_membro_equipe(p_email text, p_cargo text DEFAULT 'moderador'::text, p_nome text DEFAULT NULL::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: aplicar_cupom_deposito(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.aplicar_cupom_deposito(p_deposito_id uuid, p_codigo text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_uid UUID;
  v_cupom public.cupons;
  v_limites JSON;
  v_bonus NUMERIC;
  v_usuario_id UUID;
  v_valor_deposito NUMERIC;
  v_status TEXT;
  v_ja_aplicado BOOLEAN;
  v_giros_validacao JSON;
  v_uso_id UUID;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF p_codigo IS NULL OR TRIM(p_codigo) = '' THEN
    RETURN json_build_object('ok', false, 'error', 'empty_code');
  END IF;

  SELECT usuario_id, valor, status INTO v_usuario_id, v_valor_deposito, v_status
  FROM public.depositos
  WHERE id = p_deposito_id;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'deposit_not_found');
  END IF;

  IF v_usuario_id != v_uid THEN
    RETURN json_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF v_status != 'aprovado' THEN
    RETURN json_build_object('ok', false, 'error', 'deposit_not_approved');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.cupom_usos WHERE deposito_id = p_deposito_id
  ) INTO v_ja_aplicado;

  IF v_ja_aplicado THEN
    RETURN json_build_object('ok', true, 'already', true);
  END IF;

  SELECT * INTO v_cupom
  FROM public.cupons
  WHERE UPPER(TRIM(codigo)) = UPPER(TRIM(p_codigo))
    AND ativo = true
  FOR UPDATE;

  IF v_cupom.id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_coupon');
  END IF;

  v_giros_validacao := public._validar_cupom_giros(v_cupom);
  IF NOT (v_giros_validacao->>'ok')::BOOLEAN THEN
    RETURN json_build_object('ok', false, 'error', v_giros_validacao->>'error');
  END IF;

  v_limites := public._validar_limites_cupom(v_cupom, v_uid);
  IF NOT (v_limites->>'ok')::BOOLEAN THEN
    RETURN v_limites;
  END IF;

  IF COALESCE(v_cupom.deposito_minimo, 0) > 0 AND v_valor_deposito < v_cupom.deposito_minimo THEN
    RETURN json_build_object(
      'ok', false,
      'error', 'min_deposit_not_met',
      'deposito_minimo', v_cupom.deposito_minimo
    );
  END IF;

  IF v_cupom.tipo_bonus = 'giros_gratis' THEN
    v_uso_id := public._conceder_giros_gratis(
      v_cupom,
      v_uid,
      p_deposito_id,
      v_valor_deposito,
      'deposito',
      'disponivel'
    );

    UPDATE public.depositos
    SET cupom_codigo = v_cupom.codigo
    WHERE id = p_deposito_id;

    RETURN json_build_object(
      'ok', true,
      'codigo', v_cupom.codigo,
      'tipo_bonus', v_cupom.tipo_bonus,
      'quantidade_giros', TRUNC(v_cupom.valor)::INT,
      'jogo_slug', v_cupom.jogo_slug,
      'jogo_nome', v_cupom.jogo_nome,
      'provider_slug', v_cupom.provider_slug,
      'status_giro', 'disponivel',
      'cupom_uso_id', v_uso_id
    );
  END IF;

  v_bonus := public._calcular_bonus_cupom(
    v_cupom.tipo_valor,
    v_cupom.valor,
    v_cupom.bonus_maximo,
    v_valor_deposito
  );

  IF v_bonus <= 0 THEN
    RETURN json_build_object('ok', false, 'error', 'zero_bonus');
  END IF;

  UPDATE public.usuarios
  SET saldo = saldo + v_bonus
  WHERE id = v_uid;

  INSERT INTO public.cupom_usos (cupom_id, usuario_id, deposito_id, valor_bonus, valor_deposito, origem)
  VALUES (v_cupom.id, v_uid, p_deposito_id, v_bonus, v_valor_deposito, 'deposito');

  UPDATE public.cupons
  SET usos_total = usos_total + 1, updated_at = NOW()
  WHERE id = v_cupom.id;

  UPDATE public.depositos
  SET cupom_codigo = v_cupom.codigo
  WHERE id = p_deposito_id;

  RETURN json_build_object(
    'ok', true,
    'codigo', v_cupom.codigo,
    'valor_bonus', v_bonus,
    'tipo_bonus', v_cupom.tipo_bonus
  );
END;
$$;


--
-- Name: FUNCTION aplicar_cupom_deposito(p_deposito_id uuid, p_codigo text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.aplicar_cupom_deposito(p_deposito_id uuid, p_codigo text) IS 'Aplica cupom após depósito aprovado. Credita bônus no saldo real.';


--
-- Name: aplicar_rollover_bonus_giro(uuid, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.aplicar_rollover_bonus_giro(p_usuario_id uuid, p_valor numeric) RETURNS numeric
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_multiplicador NUMERIC;
  v_incremento NUMERIC;
  v_novo_pendente NUMERIC;
BEGIN
  IF p_usuario_id IS NULL OR COALESCE(p_valor, 0) <= 0 THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(rollover_giros_gratis, 5)
  INTO v_multiplicador
  FROM public.site_config
  WHERE id = 1;

  v_multiplicador := COALESCE(v_multiplicador, 0);
  IF v_multiplicador <= 0 THEN
    RETURN 0;
  END IF;

  v_incremento := ROUND(p_valor * v_multiplicador, 2);

  PERFORM set_config('app.skip_usuario_guard', 'true', true);

  UPDATE public.usuarios
  SET rollover_bonus_pendente = COALESCE(rollover_bonus_pendente, 0) + v_incremento
  WHERE id = p_usuario_id
  RETURNING rollover_bonus_pendente INTO v_novo_pendente;

  RETURN COALESCE(v_novo_pendente, 0);
END;
$$;


--
-- Name: aplicar_rollover_deposito(uuid, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.aplicar_rollover_deposito(p_usuario_id uuid, p_valor numeric) RETURNS numeric
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_multiplicador NUMERIC;
  v_incremento NUMERIC;
  v_novo_pendente NUMERIC;
  v_meta_atual NUMERIC;
  v_pendente_atual NUMERIC;
BEGIN
  IF p_usuario_id IS NULL OR COALESCE(p_valor, 0) <= 0 THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(rollover_padrao, 0)
  INTO v_multiplicador
  FROM public.site_config
  WHERE id = 1;

  v_multiplicador := COALESCE(v_multiplicador, 0);
  IF v_multiplicador <= 0 THEN
    RETURN 0;
  END IF;

  v_incremento := ROUND(p_valor * v_multiplicador, 2);

  SELECT COALESCE(rollover_meta, 0), COALESCE(rollover_pendente, 0)
  INTO v_meta_atual, v_pendente_atual
  FROM public.usuarios
  WHERE id = p_usuario_id;

  PERFORM set_config('app.skip_usuario_guard', 'true', true);

  UPDATE public.usuarios
  SET
    rollover_pendente = COALESCE(rollover_pendente, 0) + v_incremento,
    rollover_meta = COALESCE(rollover_meta, 0) + v_incremento,
    rollover_inicio = CASE
      WHEN COALESCE(v_meta_atual, 0) <= 0.009 AND COALESCE(v_pendente_atual, 0) <= 0.009 THEN NOW()
      ELSE rollover_inicio
    END
  WHERE id = p_usuario_id
  RETURNING rollover_pendente INTO v_novo_pendente;

  RETURN COALESCE(v_novo_pendente, 0);
END;
$$;


--
-- Name: aplicar_rollover_usuario_admin(uuid, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.aplicar_rollover_usuario_admin(p_usuario_id uuid, p_valor numeric) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  v_valor NUMERIC;
  v_meta_atual NUMERIC;
  v_pendente_atual NUMERIC;
  v_novo_pendente NUMERIC;
  v_nova_meta NUMERIC;
  v_nome TEXT;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  v_valor := ROUND(COALESCE(p_valor, 0), 2);
  IF v_valor <= 0 THEN
    RETURN json_build_object('ok', false, 'error', 'Informe um valor maior que zero.');
  END IF;

  SELECT
    COALESCE(rollover_meta, 0),
    COALESCE(rollover_pendente, 0),
    COALESCE(
      NULLIF(TRIM(usuario_nome), ''),
      NULLIF(TRIM(nome), ''),
      NULLIF(TRIM(usuario), ''),
      split_part(email, '@', 1)
    )
  INTO v_meta_atual, v_pendente_atual, v_nome
  FROM public.usuarios
  WHERE id = p_usuario_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'Usuario nao encontrado');
  END IF;

  PERFORM set_config('app.skip_usuario_guard', 'true', true);

  UPDATE public.usuarios
  SET
    rollover_pendente = COALESCE(rollover_pendente, 0) + v_valor,
    rollover_meta = COALESCE(rollover_meta, 0) + v_valor,
    rollover_inicio = CASE
      WHEN COALESCE(v_meta_atual, 0) <= 0.009 AND COALESCE(v_pendente_atual, 0) <= 0.009 THEN NOW()
      ELSE rollover_inicio
    END,
    updated_at = NOW()
  WHERE id = p_usuario_id
  RETURNING rollover_pendente, rollover_meta
  INTO v_novo_pendente, v_nova_meta;

  PERFORM public.registrar_admin_log(
    'Rollover aplicado ao usuario',
    format('Usuario: %s | Valor adicionado: R$ %s | Novo pendente: R$ %s', COALESCE(v_nome, p_usuario_id::text), v_valor, v_novo_pendente),
    'sucesso',
    'usuarios',
    jsonb_build_object(
      'usuario_id', p_usuario_id,
      'valor_adicionado', v_valor,
      'rollover_pendente', v_novo_pendente,
      'rollover_meta', v_nova_meta
    )
  );

  RETURN json_build_object(
    'ok', true,
    'rollover_pendente', v_novo_pendente,
    'rollover_meta', v_nova_meta
  );
END;
$_$;


--
-- Name: ativar_cupom(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ativar_cupom(p_codigo text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_uid UUID;
  v_cupom public.cupons;
  v_limites JSON;
  v_bonus NUMERIC;
  v_requer_deposito BOOLEAN;
  v_giros_validacao JSON;
  v_uso_id UUID;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF p_codigo IS NULL OR TRIM(p_codigo) = '' THEN
    RETURN json_build_object('ok', false, 'error', 'empty_code');
  END IF;

  SELECT * INTO v_cupom
  FROM public.cupons
  WHERE UPPER(TRIM(codigo)) = UPPER(TRIM(p_codigo))
    AND ativo = true
  FOR UPDATE;

  IF v_cupom.id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_coupon');
  END IF;

  v_giros_validacao := public._validar_cupom_giros(v_cupom);
  IF NOT (v_giros_validacao->>'ok')::BOOLEAN THEN
    RETURN json_build_object('ok', false, 'error', v_giros_validacao->>'error');
  END IF;

  v_limites := public._validar_limites_cupom(v_cupom, v_uid);
  IF NOT (v_limites->>'ok')::BOOLEAN THEN
    RETURN v_limites;
  END IF;

  IF v_cupom.tipo_bonus = 'giros_gratis' THEN
    v_requer_deposito := COALESCE(v_cupom.deposito_minimo, 0) > 0;

    IF v_requer_deposito THEN
      RETURN json_build_object(
        'ok', false,
        'error', 'requires_deposit',
        'deposito_minimo', COALESCE(v_cupom.deposito_minimo, 0),
        'quantidade_giros', TRUNC(v_cupom.valor)::INT,
        'jogo_nome', v_cupom.jogo_nome
      );
    END IF;

    v_uso_id := public._conceder_giros_gratis(v_cupom, v_uid, NULL, NULL, 'manual', 'disponivel');

    RETURN json_build_object(
      'ok', true,
      'codigo', v_cupom.codigo,
      'tipo_bonus', v_cupom.tipo_bonus,
      'quantidade_giros', TRUNC(v_cupom.valor)::INT,
      'jogo_slug', v_cupom.jogo_slug,
      'jogo_nome', v_cupom.jogo_nome,
      'provider_slug', v_cupom.provider_slug,
      'status_giro', 'disponivel',
      'cupom_uso_id', v_uso_id
    );
  END IF;

  v_requer_deposito := COALESCE(v_cupom.deposito_minimo, 0) > 0 OR v_cupom.tipo_valor = 'porcentagem';

  IF v_requer_deposito THEN
    RETURN json_build_object(
      'ok', false,
      'error', 'requires_deposit',
      'deposito_minimo', COALESCE(v_cupom.deposito_minimo, 0)
    );
  END IF;

  v_bonus := public._calcular_bonus_cupom(v_cupom.tipo_valor, v_cupom.valor, v_cupom.bonus_maximo, NULL);

  IF v_bonus <= 0 THEN
    RETURN json_build_object('ok', false, 'error', 'zero_bonus');
  END IF;

  UPDATE public.usuarios
  SET saldo = saldo + v_bonus
  WHERE id = v_uid;

  INSERT INTO public.cupom_usos (cupom_id, usuario_id, valor_bonus, valor_deposito, origem)
  VALUES (v_cupom.id, v_uid, v_bonus, NULL, 'manual');

  UPDATE public.cupons
  SET usos_total = usos_total + 1, updated_at = NOW()
  WHERE id = v_cupom.id;

  RETURN json_build_object(
    'ok', true,
    'codigo', v_cupom.codigo,
    'valor_bonus', v_bonus,
    'tipo_bonus', v_cupom.tipo_bonus
  );
END;
$$;


--
-- Name: FUNCTION ativar_cupom(p_codigo text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.ativar_cupom(p_codigo text) IS 'Ativa cupom de valor fixo sem depósito. Credita saldo real.';


--
-- Name: atualizar_aviator_config_admin(text, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.atualizar_aviator_config_admin(p_modo_geracao text DEFAULT NULL::text, p_rtp_geral numeric DEFAULT NULL::numeric, p_pct_vela_azul numeric DEFAULT NULL::numeric, p_pct_vela_roxa numeric DEFAULT NULL::numeric, p_pct_vela_rosa numeric DEFAULT NULL::numeric, p_geracao_min_crash numeric DEFAULT NULL::numeric, p_geracao_max_crash numeric DEFAULT NULL::numeric, p_min_crash numeric DEFAULT NULL::numeric, p_max_crash numeric DEFAULT NULL::numeric, p_queue_size integer DEFAULT NULL::integer) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_config public.aviator_config%ROWTYPE;
  v_modo TEXT;
  v_rtp_geral NUMERIC;
  v_pct_azul NUMERIC;
  v_pct_roxa NUMERIC;
  v_pct_rosa NUMERIC;
  v_geracao_min NUMERIC;
  v_geracao_max NUMERIC;
  v_min_crash NUMERIC;
  v_max_crash NUMERIC;
  v_queue_size INT;
  v_rtp_pct NUMERIC;
  v_sum_pct NUMERIC;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT * INTO v_config FROM public.aviator_config WHERE id = 1;
  IF NOT FOUND THEN
    INSERT INTO public.aviator_config (id) VALUES (1);
    SELECT * INTO v_config FROM public.aviator_config WHERE id = 1;
  END IF;

  v_modo := COALESCE(NULLIF(TRIM(p_modo_geracao), ''), v_config.modo_geracao);
  v_rtp_geral := COALESCE(p_rtp_geral, v_config.rtp_base);
  v_pct_azul := COALESCE(p_pct_vela_azul, v_config.pct_vela_azul);
  v_pct_roxa := COALESCE(p_pct_vela_roxa, v_config.pct_vela_roxa);
  v_pct_rosa := COALESCE(p_pct_vela_rosa, v_config.pct_vela_rosa);
  v_geracao_min := COALESCE(p_geracao_min_crash, v_config.geracao_min_crash);
  v_geracao_max := COALESCE(p_geracao_max_crash, v_config.geracao_max_crash);
  v_min_crash := COALESCE(p_min_crash, v_config.min_crash);
  v_max_crash := COALESCE(p_max_crash, v_config.max_crash);
  v_queue_size := COALESCE(p_queue_size, v_config.queue_size);

  IF v_modo NOT IN ('rtp_geral', 'velas', 'crash') THEN
    RETURN json_build_object('ok', false, 'error', 'Modo de geração inválido.');
  END IF;

  IF v_modo = 'rtp_geral' THEN
    v_rtp_pct := v_rtp_geral * 100;
    IF v_rtp_geral IS NULL OR v_rtp_geral <= 0 OR v_rtp_geral >= 1 OR v_rtp_geral <> v_rtp_geral THEN
      RETURN json_build_object('ok', false, 'error', 'RTP geral inválido.');
    END IF;
    IF v_rtp_pct < v_config.rtp_limit_min_pct OR v_rtp_pct > v_config.rtp_limit_max_pct THEN
      RETURN json_build_object(
        'ok', false,
        'error', format(
          'RTP geral deve estar entre %s%% e %s%%.',
          TRIM(TO_CHAR(v_config.rtp_limit_min_pct, 'FM999990.00')),
          TRIM(TO_CHAR(v_config.rtp_limit_max_pct, 'FM999990.00'))
        )
      );
    END IF;
  END IF;

  IF v_modo = 'velas' THEN
    IF v_pct_azul < 0 OR v_pct_roxa < 0 OR v_pct_rosa < 0
       OR v_pct_azul <> v_pct_azul OR v_pct_roxa <> v_pct_roxa OR v_pct_rosa <> v_pct_rosa THEN
      RETURN json_build_object('ok', false, 'error', 'Porcentagens de cor inválidas.');
    END IF;
    v_sum_pct := ROUND(v_pct_azul + v_pct_roxa + v_pct_rosa, 2);
    IF v_sum_pct <> 100.00 THEN
      RETURN json_build_object(
        'ok', false,
        'error', 'A soma das porcentagens das velas deve ser exatamente 100%.'
      );
    END IF;
  END IF;

  IF v_modo IN ('rtp_geral', 'velas') THEN
    IF v_geracao_min IS NULL OR v_geracao_max IS NULL
       OR v_geracao_min < 1.00 OR v_geracao_max > v_config.crash_technical_max
       OR v_geracao_min <> v_geracao_min OR v_geracao_max <> v_geracao_max
       OR v_geracao_min > v_geracao_max THEN
      RETURN json_build_object('ok', false, 'error', 'Limites de geração inválidos.');
    END IF;
  END IF;

  IF v_modo = 'crash' THEN
    IF v_min_crash IS NULL OR v_max_crash IS NULL
       OR v_min_crash < 1.00 OR v_max_crash > v_config.crash_technical_max
       OR v_min_crash <> v_min_crash OR v_max_crash <> v_max_crash
       OR v_min_crash > v_max_crash THEN
      RETURN json_build_object('ok', false, 'error', 'Limites de crash inválidos.');
    END IF;
  END IF;

  IF v_queue_size < 10 OR v_queue_size > 200 THEN
    RETURN json_build_object('ok', false, 'error', 'Tamanho da fila deve estar entre 10 e 200.');
  END IF;

  UPDATE public.aviator_config
  SET
    modo_geracao = v_modo,
    rtp_base = v_rtp_geral,
    pct_vela_azul = v_pct_azul,
    pct_vela_roxa = v_pct_roxa,
    pct_vela_rosa = v_pct_rosa,
    geracao_min_crash = v_geracao_min,
    geracao_max_crash = v_geracao_max,
    min_crash = v_min_crash,
    max_crash = v_max_crash,
    queue_size = v_queue_size,
    updated_at = NOW()
  WHERE id = 1;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'registrar_admin_log'
  ) THEN
    PERFORM public.registrar_admin_log(
      'Atualizar Config. Aviator RTP',
      'Modo e parâmetros do Aviator alterados.',
      'sucesso',
      'jogo',
      json_build_object('modo_geracao', v_modo)::jsonb
    );
  END IF;

  RETURN public.obter_aviator_config_admin();
END;
$$;


--
-- Name: atualizar_aviator_config_admin(numeric, numeric, numeric, boolean, integer, numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.atualizar_aviator_config_admin(p_rtp_base numeric DEFAULT NULL::numeric, p_rtp_min numeric DEFAULT NULL::numeric, p_rtp_max numeric DEFAULT NULL::numeric, p_recovery_enabled boolean DEFAULT NULL::boolean, p_recovery_window_hours integer DEFAULT NULL::integer, p_ggr_target_pct numeric DEFAULT NULL::numeric, p_recovery_strength numeric DEFAULT NULL::numeric, p_recovery_max_adjustment numeric DEFAULT NULL::numeric, p_min_wagered_for_recovery numeric DEFAULT NULL::numeric, p_recovery_loss_trigger_brl numeric DEFAULT NULL::numeric, p_recovery_profit_trigger_brl numeric DEFAULT NULL::numeric, p_min_crash numeric DEFAULT NULL::numeric, p_max_crash numeric DEFAULT NULL::numeric, p_queue_size integer DEFAULT NULL::integer) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  v_config public.aviator_config%ROWTYPE;
  v_rtp_base NUMERIC;
  v_rtp_min NUMERIC;
  v_rtp_max NUMERIC;
  v_recovery_enabled BOOLEAN;
  v_recovery_window_hours INT;
  v_ggr_target_pct NUMERIC;
  v_recovery_strength NUMERIC;
  v_recovery_max_adjustment NUMERIC;
  v_min_wagered NUMERIC;
  v_loss_trigger NUMERIC;
  v_profit_trigger NUMERIC;
  v_min_crash NUMERIC;
  v_max_crash NUMERIC;
  v_queue_size INT;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT * INTO v_config FROM public.aviator_config WHERE id = 1;
  IF NOT FOUND THEN
    INSERT INTO public.aviator_config (id) VALUES (1);
    SELECT * INTO v_config FROM public.aviator_config WHERE id = 1;
  END IF;

  v_rtp_base := COALESCE(p_rtp_base, v_config.rtp_base);
  v_rtp_min := COALESCE(p_rtp_min, v_config.rtp_min);
  v_rtp_max := COALESCE(p_rtp_max, v_config.rtp_max);
  v_recovery_enabled := COALESCE(p_recovery_enabled, v_config.recovery_enabled);
  v_recovery_window_hours := COALESCE(p_recovery_window_hours, v_config.recovery_window_hours);
  v_ggr_target_pct := COALESCE(p_ggr_target_pct, v_config.ggr_target_pct);
  v_recovery_strength := COALESCE(p_recovery_strength, v_config.recovery_strength);
  v_recovery_max_adjustment := COALESCE(p_recovery_max_adjustment, v_config.recovery_max_adjustment);
  v_min_wagered := COALESCE(p_min_wagered_for_recovery, v_config.min_wagered_for_recovery);
  v_loss_trigger := COALESCE(p_recovery_loss_trigger_brl, v_config.recovery_loss_trigger_brl, 10000);
  v_profit_trigger := COALESCE(p_recovery_profit_trigger_brl, v_config.recovery_profit_trigger_brl, 10000);
  v_min_crash := COALESCE(p_min_crash, v_config.min_crash);
  v_max_crash := COALESCE(p_max_crash, v_config.max_crash);
  v_queue_size := COALESCE(p_queue_size, v_config.queue_size);

  IF v_rtp_base <= 0 OR v_rtp_base >= 1 THEN
    RETURN json_build_object('ok', false, 'error', 'RTP base deve estar entre 0 e 1 (ex.: 0.97 = 97%).');
  END IF;
  IF v_rtp_min <= 0 OR v_rtp_max >= 1 OR v_rtp_min > v_rtp_max THEN
    RETURN json_build_object('ok', false, 'error', 'Limites de RTP inválidos.');
  END IF;
  IF v_rtp_base < v_rtp_min OR v_rtp_base > v_rtp_max THEN
    RETURN json_build_object('ok', false, 'error', 'RTP base deve estar entre rtp_min e rtp_max.');
  END IF;
  IF v_recovery_window_hours < 1 OR v_recovery_window_hours > 168 THEN
    RETURN json_build_object('ok', false, 'error', 'Janela de recovery deve ser entre 1 e 168 horas.');
  END IF;
  IF v_ggr_target_pct < 0 OR v_ggr_target_pct > 100 THEN
    RETURN json_build_object('ok', false, 'error', 'Margem alvo (GGR) deve estar entre 0% e 100%.');
  END IF;
  IF v_recovery_strength < 0 OR v_recovery_strength > 1 THEN
    RETURN json_build_object('ok', false, 'error', 'Intensidade de recovery deve estar entre 0 e 1.');
  END IF;
  IF v_recovery_max_adjustment < 0 OR v_recovery_max_adjustment > 0.10 THEN
    RETURN json_build_object('ok', false, 'error', 'Ajuste máximo de RTP deve estar entre 0 e 0.10 (10%).');
  END IF;
  IF v_min_wagered < 0 THEN
    RETURN json_build_object('ok', false, 'error', 'Volume mínimo para recovery não pode ser negativo.');
  END IF;
  IF v_loss_trigger < 0 OR v_profit_trigger < 0 THEN
    RETURN json_build_object('ok', false, 'error', 'Gatilhos em R$ não podem ser negativos.');
  END IF;
  IF v_min_crash < 1.00 OR v_max_crash > 10000 OR v_min_crash >= v_max_crash THEN
    RETURN json_build_object('ok', false, 'error', 'Limites de crash inválidos.');
  END IF;
  IF v_queue_size < 10 OR v_queue_size > 200 THEN
    RETURN json_build_object('ok', false, 'error', 'Tamanho da fila deve estar entre 10 e 200.');
  END IF;

  UPDATE public.aviator_config
  SET
    rtp_base = v_rtp_base,
    rtp_min = v_rtp_min,
    rtp_max = v_rtp_max,
    recovery_enabled = v_recovery_enabled,
    recovery_window_hours = v_recovery_window_hours,
    ggr_target_pct = v_ggr_target_pct,
    recovery_strength = v_recovery_strength,
    recovery_max_adjustment = v_recovery_max_adjustment,
    min_wagered_for_recovery = v_min_wagered,
    recovery_loss_trigger_brl = v_loss_trigger,
    recovery_profit_trigger_brl = v_profit_trigger,
    min_crash = v_min_crash,
    max_crash = v_max_crash,
    queue_size = v_queue_size,
    updated_at = NOW()
  WHERE id = 1;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'registrar_admin_log'
  ) THEN
    PERFORM public.registrar_admin_log(
      'Atualizar Config. Aviator RTP',
      'Parâmetros de RTP/recovery do Aviator alterados.',
      'sucesso',
      'jogo',
      json_build_object(
        'rtp_base', v_rtp_base,
        'recovery_enabled', v_recovery_enabled,
        'ggr_target_pct', v_ggr_target_pct
      )::jsonb
    );
  END IF;

  RETURN public.obter_aviator_config_admin();
END;
$_$;


--
-- Name: atualizar_config_plataforma_admin(numeric, numeric, numeric, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.atualizar_config_plataforma_admin(p_deposito_minimo numeric DEFAULT NULL::numeric, p_deposito_maximo numeric DEFAULT NULL::numeric, p_saque_minimo numeric DEFAULT NULL::numeric, p_saque_maximo numeric DEFAULT NULL::numeric) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  v_config public.site_config%ROWTYPE;
  v_dep_min NUMERIC;
  v_dep_max NUMERIC;
  v_saq_min NUMERIC;
  v_saq_max NUMERIC;
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

  IF v_dep_min <= 0 OR v_dep_max <= 0 OR v_saq_min <= 0 OR v_saq_max <= 0 THEN
    RETURN json_build_object('ok', false, 'error', 'Os valores devem ser maiores que zero.');
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
    updated_at = NOW()
  WHERE id = 1;

  PERFORM public.registrar_admin_log(
    'Atualizar configurações da plataforma',
    format('Depósito: R$ %s–%s | Saque: R$ %s–%s', v_dep_min, v_dep_max, v_saq_min, v_saq_max),
    'sucesso',
    'config',
    jsonb_build_object(
      'deposito_minimo', v_dep_min,
      'deposito_maximo', v_dep_max,
      'saque_minimo', v_saq_min,
      'saque_maximo', v_saq_max
    )
  );

  RETURN json_build_object(
    'ok', true,
    'deposito_minimo', v_dep_min,
    'deposito_maximo', v_dep_max,
    'saque_minimo', v_saq_min,
    'saque_maximo', v_saq_max
  );
END;
$_$;


--
-- Name: atualizar_config_plataforma_admin(numeric, numeric, numeric, numeric, integer, numeric, numeric, numeric, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.atualizar_config_plataforma_admin(p_deposito_minimo numeric DEFAULT NULL::numeric, p_deposito_maximo numeric DEFAULT NULL::numeric, p_saque_minimo numeric DEFAULT NULL::numeric, p_saque_maximo numeric DEFAULT NULL::numeric, p_saques_diarios_permitidos integer DEFAULT NULL::integer, p_rollover_padrao numeric DEFAULT NULL::numeric, p_rollover_giros_gratis numeric DEFAULT NULL::numeric, p_indicacao_recompensa numeric DEFAULT NULL::numeric, p_indicacao_deposito_minimo numeric DEFAULT NULL::numeric) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_config public.site_config%ROWTYPE;
  v_dep_min NUMERIC;
  v_dep_max NUMERIC;
  v_saq_min NUMERIC;
  v_saq_max NUMERIC;
  v_saques_dia INT;
  v_rollover NUMERIC;
  v_rollover_giros NUMERIC;
  v_ind_recompensa NUMERIC;
  v_ind_dep_min NUMERIC;
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
  v_rollover_giros := COALESCE(p_rollover_giros_gratis, v_config.rollover_giros_gratis, 5);
  v_ind_recompensa := COALESCE(p_indicacao_recompensa, v_config.indicacao_recompensa, 100);
  v_ind_dep_min := COALESCE(p_indicacao_deposito_minimo, v_config.indicacao_deposito_minimo, 50);

  IF v_dep_min <= 0 OR v_dep_max <= 0 OR v_saq_min <= 0 OR v_saq_max <= 0 THEN
    RETURN json_build_object('ok', false, 'error', 'Os valores devem ser maiores que zero.');
  END IF;

  IF v_saques_dia < 1 THEN
    RETURN json_build_object('ok', false, 'error', 'Saques diários permitidos deve ser no mínimo 1.');
  END IF;

  IF v_rollover < 0 OR v_rollover_giros < 0 THEN
    RETURN json_build_object('ok', false, 'error', 'Rollover não pode ser negativo.');
  END IF;

  IF v_ind_recompensa < 0 OR v_ind_dep_min < 0 THEN
    RETURN json_build_object('ok', false, 'error', 'Valores de indicação não podem ser negativos.');
  END IF;

  IF v_dep_min > v_dep_max OR v_saq_min > v_saq_max THEN
    RETURN json_build_object('ok', false, 'error', 'Mínimo não pode ser maior que o máximo.');
  END IF;

  UPDATE public.site_config
  SET
    deposito_minimo = v_dep_min,
    deposito_maximo = v_dep_max,
    saque_minimo = v_saq_min,
    saque_maximo = v_saq_max,
    saques_diarios_permitidos = v_saques_dia,
    rollover_padrao = v_rollover,
    rollover_giros_gratis = v_rollover_giros,
    indicacao_recompensa = v_ind_recompensa,
    indicacao_deposito_minimo = v_ind_dep_min,
    updated_at = NOW()
  WHERE id = 1;

  RETURN json_build_object(
    'ok', true,
    'deposito_minimo', v_dep_min,
    'deposito_maximo', v_dep_max,
    'saque_minimo', v_saq_min,
    'saque_maximo', v_saq_max,
    'saques_diarios_permitidos', v_saques_dia,
    'rollover_padrao', v_rollover,
    'rollover_giros_gratis', v_rollover_giros,
    'indicacao_recompensa', v_ind_recompensa,
    'indicacao_deposito_minimo', v_ind_dep_min
  );
END;
$$;


--
-- Name: atualizar_indicacao_usuario_admin(uuid, boolean, numeric, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.atualizar_indicacao_usuario_admin(p_usuario_id uuid, p_usar_padrao_plataforma boolean DEFAULT false, p_recompensa numeric DEFAULT NULL::numeric, p_deposito_minimo numeric DEFAULT NULL::numeric) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_recompensa NUMERIC;
  v_deposito_min NUMERIC;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id = p_usuario_id) THEN
    RETURN json_build_object('ok', false, 'error', 'Usuario nao encontrado');
  END IF;

  PERFORM set_config('app.skip_usuario_guard', 'true', true);

  IF COALESCE(p_usar_padrao_plataforma, false) THEN
    UPDATE public.usuarios
    SET
      indicacao_recompensa_custom = NULL,
      indicacao_deposito_minimo_custom = NULL,
      updated_at = NOW()
    WHERE id = p_usuario_id;

    RETURN json_build_object('ok', true, 'usa_padrao_plataforma', true);
  END IF;

  IF p_recompensa IS NULL OR p_deposito_minimo IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'Informe recompensa e deposito minimo.');
  END IF;

  v_recompensa := COALESCE(p_recompensa, 0);
  v_deposito_min := COALESCE(p_deposito_minimo, 0);

  IF v_recompensa < 0 THEN
    RETURN json_build_object('ok', false, 'error', 'Recompensa nao pode ser negativa.');
  END IF;

  IF v_deposito_min < 0 THEN
    RETURN json_build_object('ok', false, 'error', 'Deposito minimo nao pode ser negativo.');
  END IF;

  UPDATE public.usuarios
  SET
    indicacao_recompensa_custom = v_recompensa,
    indicacao_deposito_minimo_custom = v_deposito_min,
    updated_at = NOW()
  WHERE id = p_usuario_id;

  RETURN json_build_object(
    'ok', true,
    'recompensa_custom', v_recompensa,
    'deposito_minimo_custom', v_deposito_min,
    'usa_padrao_plataforma', false
  );
END;
$$;


--
-- Name: atualizar_membro_equipe(uuid, text, boolean, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.atualizar_membro_equipe(p_usuario_id uuid, p_cargo text, p_ativo boolean DEFAULT true, p_nome text DEFAULT NULL::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: atualizar_perfil_usuario_admin(uuid, text, text, text, text, date, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.atualizar_perfil_usuario_admin(p_usuario_id uuid, p_nome text DEFAULT NULL::text, p_email text DEFAULT NULL::text, p_cpf text DEFAULT NULL::text, p_telefone text DEFAULT NULL::text, p_data_nascimento date DEFAULT NULL::date, p_pais text DEFAULT NULL::text, p_cargo text DEFAULT NULL::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id = p_usuario_id) THEN
    RETURN json_build_object('ok', false, 'error', 'Usuario nao encontrado');
  END IF;

  PERFORM set_config('app.skip_usuario_guard', 'true', true);

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

  RETURN json_build_object('ok', true);
END;
$$;


--
-- Name: atualizar_saldo_usuario(uuid, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.atualizar_saldo_usuario(p_usuario_id uuid, p_novo_saldo numeric) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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

  PERFORM set_config('app.skip_usuario_guard', 'true', true);
  PERFORM set_config('app.skip_audit', 'true', true);

  UPDATE public.usuarios
  SET saldo = p_novo_saldo, updated_at = NOW()
  WHERE id = p_usuario_id;

  RETURN json_build_object(
    'success', true,
    'saldo_anterior', v_saldo_anterior,
    'saldo_novo', p_novo_saldo,
    'usuario_email', v_usuario_email
  );
END;
$$;


--
-- Name: FUNCTION atualizar_saldo_usuario(p_usuario_id uuid, p_novo_saldo numeric); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.atualizar_saldo_usuario(p_usuario_id uuid, p_novo_saldo numeric) IS 'Atualiza o saldo de um usuário. Usado pelo painel administrativo.';


--
-- Name: atualizar_status_deposito_admin(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.atualizar_status_deposito_admin(p_deposito_id uuid, p_status text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
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
  FOR UPDATE OF d;

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
$_$;


--
-- Name: atualizar_status_saque_admin(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.atualizar_status_saque_admin(p_saque_id uuid, p_status text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
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

  IF v_status NOT IN ('rejeitado', 'falhou') THEN
    RETURN json_build_object(
      'ok', false,
      'error', 'Use a API de aprovacao para aprovar. Aqui so rejeitado/falhou.'
    );
  END IF;

  SELECT s.status, s.valor, u.email
  INTO v_dep_status, v_valor, v_usuario_email
  FROM public.saques s
  LEFT JOIN public.usuarios u ON u.id = s.usuario_id
  WHERE s.id = p_saque_id
  FOR UPDATE OF s;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'Saque nao encontrado');
  END IF;

  IF v_dep_status NOT IN ('pendente', 'processando') THEN
    RETURN json_build_object('ok', false, 'error', 'Apenas saques pendentes/processando podem ser alterados');
  END IF;

  PERFORM set_config('app.skip_usuario_guard', 'true', true);

  UPDATE public.saques
  SET status = v_status, updated_at = NOW()
  WHERE id = p_saque_id;

  BEGIN
    PERFORM public.registrar_admin_log(
      'Alterar status de saque',
      format('Saque %s: %s → %s | Valor: R$ %s | Usuario: %s', p_saque_id, v_dep_status, v_status, v_valor, COALESCE(v_usuario_email, '—')),
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
$_$;


--
-- Name: atualizar_status_usuario_admin(uuid, boolean, boolean, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.atualizar_status_usuario_admin(p_usuario_id uuid, p_ativo boolean DEFAULT NULL::boolean, p_verificado boolean DEFAULT NULL::boolean, p_kyc_status text DEFAULT NULL::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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

  UPDATE public.usuarios
  SET
    ativo = COALESCE(p_ativo, ativo),
    verificado = COALESCE(p_verificado, verificado),
    kyc_status = COALESCE(p_kyc_status, kyc_status),
    updated_at = NOW()
  WHERE id = p_usuario_id;

  RETURN json_build_object('ok', true);
END;
$$;


--
-- Name: aviator_creditar_saldo(text, numeric, text, numeric, text, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.aviator_creditar_saldo(p_email text, p_valor numeric, p_txn_id text, p_bet_valor numeric DEFAULT 0, p_tipo text DEFAULT 'Ganhou'::text, p_usa_bonus boolean DEFAULT NULL::boolean) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_usuario_id UUID;
  v_saldo NUMERIC;
  v_saldo_bonus NUMERIC;
  v_carteira TEXT;
  v_usa_bonus BOOLEAN;
  v_valor NUMERIC;
  v_bet NUMERIC;
  v_txn TEXT;
  v_tipo TEXT;
  v_jogavel NUMERIC;
  v_inserted UUID;
  v_owner UUID;
  v_com_bonus TEXT;
BEGIN
  v_valor := ROUND(COALESCE(p_valor, 0)::numeric, 2);
  v_bet := ROUND(COALESCE(p_bet_valor, 0)::numeric, 2);
  v_txn := trim(COALESCE(p_txn_id, ''));
  v_tipo := CASE WHEN lower(trim(COALESCE(p_tipo, ''))) = 'perdeu' THEN 'Perdeu' ELSE 'Ganhou' END;

  IF v_valor <= 0 OR v_txn = '' THEN
    RETURN json_build_object('ok', false, 'error', 'INVALID_AMOUNT', 'balance', 0);
  END IF;

  SELECT r.usuario_id, r.saldo, r.saldo_bonus, r.carteira_ativa
  INTO v_usuario_id, v_saldo, v_saldo_bonus, v_carteira
  FROM public._aviator_resolve_usuario(p_email) r;

  IF v_usuario_id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'INVALID_USER', 'balance', 0);
  END IF;

  v_usa_bonus := public._aviator_usa_bonus_aposta(v_usuario_id, v_txn, p_usa_bonus);
  v_com_bonus := CASE WHEN v_usa_bonus THEN 'Sim' ELSE 'Não' END;

  INSERT INTO public.transacoes_jogos (
    usuario_id, txn_id, tipo, jogo, valor, retorno, status, com_bonus, data
  )
  VALUES (
    v_usuario_id, v_txn, v_tipo, 'Aviator', v_bet,
    CASE WHEN v_tipo = 'Ganhou' THEN v_valor ELSE 0 END,
    'Finalizado', v_com_bonus, TIMEZONE('utc'::text, NOW())
  )
  ON CONFLICT (txn_id) DO NOTHING
  RETURNING id INTO v_inserted;

  IF v_inserted IS NULL THEN
    SELECT usuario_id INTO v_owner
    FROM public.transacoes_jogos
    WHERE txn_id = v_txn
    LIMIT 1;

    IF v_owner IS DISTINCT FROM v_usuario_id THEN
      RETURN json_build_object(
        'ok', false, 'error', 'TXN_OWNER_MISMATCH',
        'balance', public._saldo_jogavel_carteira(v_saldo, v_saldo_bonus, v_carteira)
      );
    END IF;

    SELECT COALESCE(saldo, 0), COALESCE(saldo_bonus, 0), COALESCE(carteira_ativa, 'real')
    INTO v_saldo, v_saldo_bonus, v_carteira
    FROM public.usuarios
    WHERE id = v_usuario_id;

    RETURN json_build_object(
      'ok', true, 'duplicate', true,
      'balance', public._saldo_jogavel_carteira(v_saldo, v_saldo_bonus, v_carteira),
      'usuario_id', v_usuario_id
    );
  END IF;

  PERFORM set_config('app.skip_usuario_guard', 'true', true);

  IF v_usa_bonus THEN
    UPDATE public.usuarios
    SET saldo_bonus = ROUND(v_saldo_bonus + v_valor, 2), updated_at = NOW()
    WHERE id = v_usuario_id
    RETURNING saldo, saldo_bonus, carteira_ativa
    INTO v_saldo, v_saldo_bonus, v_carteira;
  ELSE
    UPDATE public.usuarios
    SET saldo = ROUND(v_saldo + v_valor, 2), updated_at = NOW()
    WHERE id = v_usuario_id
    RETURNING saldo, saldo_bonus, carteira_ativa
    INTO v_saldo, v_saldo_bonus, v_carteira;
  END IF;

  v_jogavel := public._saldo_jogavel_carteira(v_saldo, v_saldo_bonus, v_carteira);

  RETURN json_build_object(
    'ok', true, 'duplicate', false,
    'balance', v_jogavel,
    'saldo_anterior', ROUND(v_jogavel - v_valor, 2),
    'carteira_aposta', CASE WHEN v_usa_bonus THEN 'bonus' ELSE 'real' END,
    'usa_bonus', v_usa_bonus,
    'carteira_ativa', v_carteira,
    'usuario_id', v_usuario_id,
    'transacao_id', v_inserted
  );
END;
$$;


--
-- Name: FUNCTION aviator_creditar_saldo(p_email text, p_valor numeric, p_txn_id text, p_bet_valor numeric, p_tipo text, p_usa_bonus boolean); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.aviator_creditar_saldo(p_email text, p_valor numeric, p_txn_id text, p_bet_valor numeric, p_tipo text, p_usa_bonus boolean) IS 'Aviator: credita ganho na carteira da aposta (_bet / p_usa_bonus). Fallback: R$.';


--
-- Name: aviator_debit_saldo(text, numeric, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.aviator_debit_saldo(p_email text, p_valor numeric, p_txn_id text DEFAULT NULL::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_usuario_id UUID;
  v_saldo NUMERIC;
  v_saldo_bonus NUMERIC;
  v_carteira TEXT;
  v_usa_bonus BOOLEAN;
  v_valor NUMERIC;
  v_txn TEXT;
  v_jogavel NUMERIC;
  v_novo_jogavel NUMERIC;
  v_inserted UUID;
  v_owner UUID;
  v_com_bonus TEXT;
BEGIN
  v_valor := ROUND(COALESCE(p_valor, 0)::numeric, 2);
  v_txn := NULLIF(trim(COALESCE(p_txn_id, '')), '');

  IF v_valor <= 0 THEN
    RETURN json_build_object('ok', false, 'error', 'INVALID_AMOUNT', 'balance', 0);
  END IF;

  SELECT r.usuario_id, r.saldo, r.saldo_bonus, r.carteira_ativa
  INTO v_usuario_id, v_saldo, v_saldo_bonus, v_carteira
  FROM public._aviator_resolve_usuario(p_email) r;

  IF v_usuario_id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'INVALID_USER', 'balance', 0);
  END IF;

  v_usa_bonus := public._carteira_usa_bonus(v_carteira);
  v_jogavel := public._saldo_jogavel_carteira(v_saldo, v_saldo_bonus, v_carteira);
  v_com_bonus := CASE WHEN v_usa_bonus THEN 'Sim' ELSE 'Não' END;

  IF v_txn IS NOT NULL THEN
    INSERT INTO public.transacoes_jogos (
      usuario_id, txn_id, tipo, jogo, valor, retorno, status, com_bonus, data
    )
    VALUES (
      v_usuario_id, v_txn, 'Perdeu', 'Aviator', 0, 0, 'Finalizado', v_com_bonus,
      TIMEZONE('utc'::text, NOW())
    )
    ON CONFLICT (txn_id) DO NOTHING
    RETURNING id INTO v_inserted;

    IF v_inserted IS NULL THEN
      SELECT usuario_id INTO v_owner
      FROM public.transacoes_jogos
      WHERE txn_id = v_txn
      LIMIT 1;

      IF v_owner IS DISTINCT FROM v_usuario_id THEN
        RETURN json_build_object('ok', false, 'error', 'TXN_OWNER_MISMATCH', 'balance', ROUND(v_jogavel, 2));
      END IF;

      SELECT COALESCE(saldo, 0), COALESCE(saldo_bonus, 0), COALESCE(carteira_ativa, 'real')
      INTO v_saldo, v_saldo_bonus, v_carteira
      FROM public.usuarios
      WHERE id = v_usuario_id;

      RETURN json_build_object(
        'ok', true, 'duplicate', true,
        'balance', public._saldo_jogavel_carteira(v_saldo, v_saldo_bonus, v_carteira),
        'carteira_aposta', CASE WHEN public._carteira_usa_bonus(v_carteira) THEN 'bonus' ELSE 'real' END,
        'usuario_id', v_usuario_id
      );
    END IF;
  END IF;

  IF v_jogavel + 0.000001 < v_valor THEN
    IF v_txn IS NOT NULL THEN
      DELETE FROM public.transacoes_jogos WHERE txn_id = v_txn AND valor = 0;
    END IF;
    RETURN json_build_object(
      'ok', false, 'error', 'INSUFFICIENT_FUNDS',
      'balance', ROUND(v_jogavel, 2)
    );
  END IF;

  PERFORM set_config('app.skip_usuario_guard', 'true', true);

  IF v_usa_bonus THEN
    UPDATE public.usuarios
    SET saldo_bonus = ROUND(v_saldo_bonus - v_valor, 2), updated_at = NOW()
    WHERE id = v_usuario_id
    RETURNING saldo, saldo_bonus, carteira_ativa
    INTO v_saldo, v_saldo_bonus, v_carteira;
  ELSE
    UPDATE public.usuarios
    SET saldo = ROUND(v_saldo - v_valor, 2), updated_at = NOW()
    WHERE id = v_usuario_id
    RETURNING saldo, saldo_bonus, carteira_ativa
    INTO v_saldo, v_saldo_bonus, v_carteira;
  END IF;

  -- Garante com_bonus alinhado à carteira realmente debitada
  IF v_txn IS NOT NULL THEN
    UPDATE public.transacoes_jogos
    SET com_bonus = v_com_bonus
    WHERE txn_id = v_txn AND usuario_id = v_usuario_id;
  END IF;

  v_novo_jogavel := public._saldo_jogavel_carteira(v_saldo, v_saldo_bonus, v_carteira);

  RETURN json_build_object(
    'ok', true, 'duplicate', false,
    'balance', v_novo_jogavel,
    'saldo_anterior', ROUND(v_jogavel, 2),
    'carteira_aposta', CASE WHEN v_usa_bonus THEN 'bonus' ELSE 'real' END,
    'usa_bonus', v_usa_bonus,
    'carteira_ativa', v_carteira,
    'usuario_id', v_usuario_id
  );
END;
$$;


--
-- Name: aviator_reembolsar_saldo(text, numeric, text, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.aviator_reembolsar_saldo(p_email text, p_valor numeric, p_txn_id text, p_usa_bonus boolean DEFAULT NULL::boolean) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN public.aviator_creditar_saldo(p_email, p_valor, p_txn_id, 0, 'Ganhou', p_usa_bonus);
END;
$$;


--
-- Name: aviator_registrar_perda(text, text, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.aviator_registrar_perda(p_email text, p_txn_id text, p_bet_valor numeric) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_usuario_id UUID;
  v_saldo NUMERIC;
  v_saldo_bonus NUMERIC;
  v_carteira TEXT;
  v_bet NUMERIC;
  v_txn TEXT;
  v_inserted UUID;
  v_owner UUID;
  v_com_bonus TEXT;
  v_usa_bonus BOOLEAN;
BEGIN
  v_bet := ROUND(COALESCE(p_bet_valor, 0)::numeric, 2);
  v_txn := trim(COALESCE(p_txn_id, ''));

  IF v_bet <= 0 OR v_txn = '' THEN
    RETURN json_build_object('ok', false, 'error', 'INVALID_AMOUNT');
  END IF;

  SELECT r.usuario_id, r.saldo, r.saldo_bonus, r.carteira_ativa
  INTO v_usuario_id, v_saldo, v_saldo_bonus, v_carteira
  FROM public._aviator_resolve_usuario(p_email) r;

  IF v_usuario_id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'INVALID_USER');
  END IF;

  v_usa_bonus := public._aviator_usa_bonus_aposta(v_usuario_id, v_txn, NULL);
  v_com_bonus := CASE WHEN v_usa_bonus THEN 'Sim' ELSE 'Não' END;

  INSERT INTO public.transacoes_jogos (
    usuario_id, txn_id, tipo, jogo, valor, retorno, status, com_bonus, data
  )
  VALUES (
    v_usuario_id, v_txn, 'Perdeu', 'Aviator', v_bet, 0,
    'Finalizado', v_com_bonus, TIMEZONE('utc'::text, NOW())
  )
  ON CONFLICT (txn_id) DO NOTHING
  RETURNING id INTO v_inserted;

  IF v_inserted IS NULL THEN
    SELECT usuario_id INTO v_owner
    FROM public.transacoes_jogos
    WHERE txn_id = v_txn
    LIMIT 1;

    IF v_owner IS DISTINCT FROM v_usuario_id THEN
      RETURN json_build_object('ok', false, 'error', 'TXN_OWNER_MISMATCH');
    END IF;

    RETURN json_build_object('ok', true, 'duplicate', true, 'usuario_id', v_usuario_id);
  END IF;

  RETURN json_build_object(
    'ok', true, 'duplicate', false,
    'usuario_id', v_usuario_id,
    'transacao_id', v_inserted,
    'carteira_aposta', CASE WHEN v_usa_bonus THEN 'bonus' ELSE 'real' END,
    'carteira_ativa', v_carteira
  );
END;
$$;


--
-- Name: calcular_aviator_ggr(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calcular_aviator_ggr(p_window_hours integer DEFAULT 24) RETURNS json
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_wagered NUMERIC := 0;
  v_paid NUMERIC := 0;
  v_bets BIGINT := 0;
  v_rtp_real NUMERIC := 0;
  v_ggr NUMERIC := 0;
  v_ggr_pct NUMERIC := 0;
  v_hours INT := GREATEST(COALESCE(p_window_hours, 24), 1);
BEGIN
  SELECT
    COALESCE(SUM(b.bet_amount), 0),
    COALESCE(SUM(
      CASE
        WHEN b.status = 'cashed_out' THEN b.bet_amount * COALESCE(b.cashout_multiplier, 0)
        ELSE 0
      END
    ), 0),
    COUNT(*)
  INTO v_wagered, v_paid, v_bets
  FROM public.aviator_bets b
  WHERE b.placed_at >= NOW() - (v_hours || ' hours')::interval
    AND b.status IN ('cashed_out', 'crashed');

  v_ggr := v_wagered - v_paid;
  IF v_wagered > 0 THEN
    v_rtp_real := ROUND((v_paid / v_wagered) * 100, 4);
    v_ggr_pct := ROUND((v_ggr / v_wagered) * 100, 4);
  END IF;

  RETURN json_build_object(
    'ok', true,
    'window_hours', v_hours,
    'total_wagered', v_wagered,
    'total_paid', v_paid,
    'ggr', v_ggr,
    'ggr_pct', v_ggr_pct,
    'rtp_real_pct', v_rtp_real,
    'bet_count', v_bets
  );
END;
$$;


--
-- Name: calcular_ganhos_indicacao(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calcular_ganhos_indicacao(p_referral_code text) RETURNS numeric
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_code TEXT;
  v_deposito_min NUMERIC;
  v_recompensa NUMERIC;
  v_global_min NUMERIC;
  v_global_recompensa NUMERIC;
BEGIN
  PERFORM public._assert_referral_code_caller(p_referral_code);

  v_code := TRIM(p_referral_code);
  IF v_code IS NULL OR v_code = '' THEN
    RETURN 0;
  END IF;

  SELECT
    COALESCE(sc.indicacao_recompensa, 0),
    COALESCE(sc.indicacao_deposito_minimo, 50)
  INTO v_global_recompensa, v_global_min
  FROM public.site_config sc
  WHERE sc.id = 1;

  v_global_recompensa := COALESCE(v_global_recompensa, 0);
  v_global_min := COALESCE(v_global_min, 50);

  SELECT
    COALESCE(u.indicacao_recompensa_custom, v_global_recompensa),
    COALESCE(u.indicacao_deposito_minimo_custom, v_global_min)
  INTO v_recompensa, v_deposito_min
  FROM public.usuarios u
  WHERE u.link_indicação = v_code
  LIMIT 1;

  v_recompensa := COALESCE(v_recompensa, v_global_recompensa, 0);
  v_deposito_min := COALESCE(v_deposito_min, v_global_min, 50);

  RETURN COALESCE((
    SELECT SUM(
      CASE
        WHEN COALESCE(u.indicacao_recompensa_paga, false) THEN
          COALESCE(u.indicacao_recompensa_valor_pago, v_recompensa, 0)
        WHEN COALESCE((
          SELECT d.valor
          FROM public.depositos d
          WHERE d.usuario_id = u.id
            AND d.status = 'aprovado'
          ORDER BY COALESCE(d.data_hora, d.created_at) ASC
          LIMIT 1
        ), 0) >= v_deposito_min THEN
          v_recompensa
        ELSE 0
      END
    )
    FROM public.usuarios u
    WHERE u.indicado_por = v_code
  ), 0);
END;
$$;


--
-- Name: FUNCTION calcular_ganhos_indicacao(p_referral_code text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.calcular_ganhos_indicacao(p_referral_code text) IS 'Soma ganhos de indicação (pagos + qualificados com 1º depósito >= mínimo). H8: só dono do código ou admin.';


--
-- Name: calcular_vip_nivel(numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calcular_vip_nivel(p_total_depositado numeric) RETURNS integer
    LANGUAGE sql STABLE
    AS $$
  SELECT COALESCE(MAX(nivel), 1)::int
  FROM public.vip_niveis
  WHERE deposito_minimo <= COALESCE(p_total_depositado, 0);
$$;


--
-- Name: check_user_is_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_user_is_admin(user_id uuid) RETURNS TABLE(id uuid, email text, cargo text)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email, u.cargo
  FROM public.usuarios u
  WHERE u.id = user_id AND u.cargo = 'admin';
END;
$$;


--
-- Name: confirmar_deposito_pix_pago(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.confirmar_deposito_pix_pago(p_deposito_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_uid uuid;
  v_valor numeric;
  v_status text;
  v_usuario_id uuid;
  v_vip json;
  v_nivel int;
  v_total numeric;
  v_rollover numeric;
  v_indicacao json;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT usuario_id, valor, status INTO v_usuario_id, v_valor, v_status
  FROM public.depositos
  WHERE id = p_deposito_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'deposit_not_found');
  END IF;

  IF v_usuario_id != v_uid THEN
    RETURN json_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF v_status = 'aprovado' THEN
    SELECT vip_nivel, total_depositado INTO v_nivel, v_total
    FROM public.usuarios WHERE id = v_usuario_id;

    RETURN json_build_object(
      'ok', true,
      'already', true,
      'vip_nivel', COALESCE(v_nivel, 1),
      'total_depositado', COALESCE(v_total, 0),
      'subiu_nivel', false,
      'bonus_upgrade', 0
    );
  END IF;

  IF v_status != 'pendente' THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_status');
  END IF;

  UPDATE public.depositos
  SET status = 'aprovado'
  WHERE id = p_deposito_id;

  UPDATE public.usuarios
  SET saldo = saldo + v_valor
  WHERE id = v_usuario_id;

  v_vip := public.processar_vip_deposito(v_usuario_id, p_deposito_id, v_valor);
  v_rollover := public.aplicar_rollover_deposito(v_usuario_id, v_valor);
  v_indicacao := public.processar_recompensa_indicacao(v_usuario_id, p_deposito_id, v_valor);

  RETURN (json_build_object(
    'ok', true,
    'already', false,
    'rollover_pendente', COALESCE(v_rollover, 0),
    'indicacao', v_indicacao
  )::jsonb || COALESCE(v_vip, '{}'::json)::jsonb)::json;
END;
$$;


--
-- Name: FUNCTION confirmar_deposito_pix_pago(p_deposito_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.confirmar_deposito_pix_pago(p_deposito_id uuid) IS 'Marca depósito como aprovado e credita saldo. Idempotente se já aprovado.';


--
-- Name: confirmar_deposito_pix_pago_server(uuid, uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.confirmar_deposito_pix_pago_server(p_deposito_id uuid, p_usuario_id uuid, p_gateway_check_id text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_valor NUMERIC;
  v_status TEXT;
  v_usuario_id UUID;
  v_gateway_check_id TEXT;
  v_vip JSON;
  v_nivel INT;
  v_total NUMERIC;
  v_rollover NUMERIC;
BEGIN
  IF current_user NOT IN ('postgres', 'supabase_admin', 'service_role') THEN
    RETURN json_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF p_gateway_check_id IS NULL OR btrim(p_gateway_check_id) = '' THEN
    RETURN json_build_object('ok', false, 'error', 'gateway_check_required');
  END IF;

  SELECT usuario_id, valor, status, gateway_check_id
  INTO v_usuario_id, v_valor, v_status, v_gateway_check_id
  FROM public.depositos
  WHERE id = p_deposito_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'deposit_not_found');
  END IF;

  IF v_usuario_id IS DISTINCT FROM p_usuario_id THEN
    RETURN json_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF v_gateway_check_id IS NULL OR v_gateway_check_id <> btrim(p_gateway_check_id) THEN
    RETURN json_build_object('ok', false, 'error', 'gateway_mismatch');
  END IF;

  IF v_status = 'aprovado' THEN
    SELECT vip_nivel, total_depositado INTO v_nivel, v_total
    FROM public.usuarios WHERE id = v_usuario_id;

    RETURN json_build_object(
      'ok', true,
      'already', true,
      'vip_nivel', COALESCE(v_nivel, 1),
      'total_depositado', COALESCE(v_total, 0),
      'subiu_nivel', false,
      'bonus_upgrade', 0
    );
  END IF;

  IF v_status <> 'pendente' THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_status');
  END IF;

  UPDATE public.depositos
  SET status = 'aprovado', updated_at = NOW()
  WHERE id = p_deposito_id;

  PERFORM set_config('app.skip_usuario_guard', 'true', true);
  UPDATE public.usuarios
  SET saldo = saldo + v_valor
  WHERE id = v_usuario_id;

  v_vip := public.processar_vip_deposito(v_usuario_id, p_deposito_id, v_valor);
  v_rollover := public.aplicar_rollover_deposito(v_usuario_id, v_valor);

  RETURN (json_build_object(
    'ok', true,
    'already', false,
    'rollover_pendente', COALESCE(v_rollover, 0)
  )::jsonb || COALESCE(v_vip, '{}'::json)::jsonb)::json;
END;
$$;


--
-- Name: FUNCTION confirmar_deposito_pix_pago_server(p_deposito_id uuid, p_usuario_id uuid, p_gateway_check_id text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.confirmar_deposito_pix_pago_server(p_deposito_id uuid, p_usuario_id uuid, p_gateway_check_id text) IS 'Confirma depósito PIX somente via PlayFiverAPI (service_role), com vínculo gateway_check_id.';


--
-- Name: converter_bonus_saldo(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.converter_bonus_saldo() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_uid UUID;
  v_saldo NUMERIC;
  v_saldo_bonus NUMERIC;
  v_rollover_bonus NUMERIC;
  v_valor NUMERIC;
  v_novo_saldo NUMERIC;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT
    COALESCE(saldo, 0),
    COALESCE(saldo_bonus, 0),
    COALESCE(rollover_bonus_pendente, 0)
  INTO v_saldo, v_saldo_bonus, v_rollover_bonus
  FROM public.usuarios
  WHERE id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'user_not_found');
  END IF;

  IF COALESCE(v_saldo_bonus, 0) <= 0.009 THEN
    RETURN json_build_object('ok', false, 'error', 'sem_bonus', 'msg', 'Nenhum bônus disponível para converter.');
  END IF;

  IF COALESCE(v_rollover_bonus, 0) > 0.009 THEN
    RETURN json_build_object(
      'ok', false,
      'error', 'rollover_pendente',
      'msg', 'Complete o rollover do bônus antes de converter.',
      'rollover_bonus_pendente', ROUND(v_rollover_bonus, 2)
    );
  END IF;

  v_valor := ROUND(v_saldo_bonus, 2);
  v_novo_saldo := ROUND(v_saldo + v_valor, 2);

  PERFORM set_config('app.skip_usuario_guard', 'true', true);

  UPDATE public.usuarios
  SET
    saldo = v_novo_saldo,
    saldo_bonus = 0,
    updated_at = NOW()
  WHERE id = v_uid;

  INSERT INTO public.bonus_conversoes (usuario_id, valor)
  VALUES (v_uid, v_valor);

  RETURN json_build_object(
    'ok', true,
    'valor_convertido', v_valor,
    'saldo', v_novo_saldo,
    'saldo_bonus', 0
  );
END;
$$;


--
-- Name: FUNCTION converter_bonus_saldo(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.converter_bonus_saldo() IS 'Converte saldo_bonus para saldo real quando rollover de bônus estiver zerado.';


--
-- Name: count_qualified_referrals(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.count_qualified_referrals(referral_code_param text) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_code TEXT;
  v_deposito_min NUMERIC;
  v_global_min NUMERIC;
BEGIN
  PERFORM public._assert_referral_code_caller(referral_code_param);

  v_code := TRIM(referral_code_param);
  IF v_code IS NULL OR v_code = '' THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(sc.indicacao_deposito_minimo, 50)
  INTO v_global_min
  FROM public.site_config sc
  WHERE sc.id = 1;

  v_global_min := COALESCE(v_global_min, 50);

  SELECT COALESCE(u.indicacao_deposito_minimo_custom, v_global_min)
  INTO v_deposito_min
  FROM public.usuarios u
  WHERE u.link_indicação = v_code
  LIMIT 1;

  v_deposito_min := COALESCE(v_deposito_min, v_global_min, 50);

  RETURN (
    SELECT COUNT(*)::INT
    FROM public.usuarios u
    WHERE u.indicado_por = v_code
      AND (
        COALESCE(u.indicacao_recompensa_paga, false) = true
        OR COALESCE((
          SELECT d.valor
          FROM public.depositos d
          WHERE d.usuario_id = u.id
            AND d.status = 'aprovado'
          ORDER BY COALESCE(d.data_hora, d.created_at) ASC
          LIMIT 1
        ), 0) >= v_deposito_min
      )
  );
END;
$$;


--
-- Name: FUNCTION count_qualified_referrals(referral_code_param text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.count_qualified_referrals(referral_code_param text) IS 'Indicados com 1º depósito aprovado >= mínimo (ou recompensa já paga). H8: só dono do código ou admin.';


--
-- Name: definir_carteira_ativa(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.definir_carteira_ativa(p_carteira text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_uid UUID;
  v_carteira TEXT;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  v_carteira := lower(trim(COALESCE(p_carteira, '')));
  IF v_carteira NOT IN ('real', 'bonus') THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_wallet');
  END IF;

  PERFORM set_config('app.skip_usuario_guard', 'true', true);

  UPDATE public.usuarios
  SET carteira_ativa = v_carteira,
      updated_at = NOW()
  WHERE id = v_uid;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'user_not_found');
  END IF;

  RETURN json_build_object('ok', true, 'carteira_ativa', v_carteira);
END;
$$;


--
-- Name: FUNCTION definir_carteira_ativa(p_carteira text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.definir_carteira_ativa(p_carteira text) IS 'Define carteira ativa do jogador (real ou bonus), sincronizada com o header.';


--
-- Name: desativar_rollover_usuario_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.desativar_rollover_usuario_admin(p_usuario_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  v_nome TEXT;
  v_pendente NUMERIC;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT
    COALESCE(rollover_pendente, 0),
    COALESCE(
      NULLIF(TRIM(usuario_nome), ''),
      NULLIF(TRIM(nome), ''),
      NULLIF(TRIM(usuario), ''),
      split_part(email, '@', 1)
    )
  INTO v_pendente, v_nome
  FROM public.usuarios
  WHERE id = p_usuario_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'Usuario nao encontrado');
  END IF;

  PERFORM set_config('app.skip_usuario_guard', 'true', true);

  UPDATE public.usuarios
  SET
    rollover_pendente = 0,
    rollover_meta = 0,
    rollover_inicio = NULL,
    updated_at = NOW()
  WHERE id = p_usuario_id;

  PERFORM public.registrar_admin_log(
    'Rollover desativado',
    format('Usuario: %s | Pendente removido: R$ %s', COALESCE(v_nome, p_usuario_id::text), v_pendente),
    'sucesso',
    'usuarios',
    jsonb_build_object(
      'usuario_id', p_usuario_id,
      'rollover_removido', v_pendente
    )
  );

  RETURN json_build_object('ok', true);
END;
$_$;


--
-- Name: generate_referral_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_referral_code() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INTEGER;
  random_pos INTEGER;
  max_attempts INTEGER := 100;
  attempts INTEGER := 0;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..20 LOOP
      random_pos := FLOOR(RANDOM() * LENGTH(chars) + 1)::INTEGER;
      result := result || SUBSTR(chars, random_pos, 1);
    END LOOP;

    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.usuarios WHERE link_indicação = result);

    attempts := attempts + 1;
    IF attempts >= max_attempts THEN
      result := result || SUBSTR(REPLACE(CAST(EXTRACT(EPOCH FROM NOW()) AS TEXT), '.', ''), -6);
      EXIT;
    END IF;
  END LOOP;

  RETURN result;
END;
$$;


--
-- Name: get_current_admin_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_current_admin_user() RETURNS TABLE(id uuid, email text, cargo text)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email, u.cargo
  FROM public.usuarios u
  WHERE u.id = auth.uid() AND u.cargo = 'admin';
END;
$$;


--
-- Name: get_current_user_referral_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_current_user_referral_code() RETURNS text
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
DECLARE
  user_code TEXT;
BEGIN
  SELECT link_indicação INTO user_code
  FROM public.usuarios
  WHERE id = auth.uid();

  RETURN user_code;
END;
$$;


--
-- Name: get_total_usuarios(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_total_usuarios() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  user_cargo TEXT;
  total_count INTEGER;
BEGIN
  -- Verificar se o usuário atual é admin
  SELECT cargo INTO user_cargo
  FROM public.usuarios
  WHERE id = auth.uid();

  -- Se for admin, retornar total de usuários
  IF user_cargo = 'admin' THEN
    SELECT COUNT(*) INTO total_count
    FROM public.usuarios;
    RETURN total_count;
  ELSE
    -- Se não for admin, retornar apenas seu próprio registro (1)
    RETURN 1;
  END IF;
END;
$$;


--
-- Name: get_user_by_email(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_by_email(user_email text) RETURNS TABLE(id uuid, saldo numeric, saldo_bonus numeric, carteira_ativa text, email text)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.saldo,
    COALESCE(u.saldo_bonus, 0)::DECIMAL(10, 2),
    COALESCE(u.carteira_ativa, 'real'),
    u.email
  FROM public.usuarios u
  WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(user_email))
  LIMIT 1;
END;
$$;


--
-- Name: get_user_cargo(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_cargo() RETURNS text
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
DECLARE
  user_cargo TEXT;
BEGIN
  -- Buscar cargo do usuário atual usando SECURITY DEFINER para bypassar RLS
  SELECT cargo INTO user_cargo
  FROM public.usuarios
  WHERE id = auth.uid();
  
  RETURN user_cargo;
END;
$$;


--
-- Name: girar_roleta(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.girar_roleta() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_uid UUID;
  v_config public.prize_wheel_config;
  v_status JSON;
  v_segments JSON;
  v_total_peso INT;
  v_random INT;
  v_acumulado INT := 0;
  v_segment JSON;
  v_segment_id UUID;
  v_cupom public.cupons;
  v_limites JSON;
  v_uso_id UUID;
  v_requer_deposito BOOLEAN;
  v_winner_index INT := 0;
  v_i INT;
  v_arr JSON[];
  v_period_start TIMESTAMPTZ;
  v_giros_no_periodo INT;
  v_giros_cupom INT;
  v_giros_wheel INT;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_config
  FROM public.prize_wheel_config
  WHERE id = 1 AND ativo = true
  FOR UPDATE;

  IF v_config.id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'wheel_disabled');
  END IF;

  IF v_config.cooldown_horas <= 0 THEN
    v_period_start := date_trunc(
      'day',
      timezone('America/Sao_Paulo', NOW())
    ) AT TIME ZONE 'America/Sao_Paulo';
  ELSE
    v_period_start := NOW() - (v_config.cooldown_horas || ' hours')::INTERVAL;
  END IF;

  SELECT COUNT(*)::INT INTO v_giros_cupom
  FROM public.cupom_usos
  WHERE usuario_id = v_uid
    AND origem = 'roleta'
    AND created_at >= v_period_start;

  SELECT COUNT(*)::INT INTO v_giros_wheel
  FROM public.prize_wheel_spins
  WHERE usuario_id = v_uid
    AND created_at >= v_period_start;

  v_giros_no_periodo := GREATEST(COALESCE(v_giros_cupom, 0), COALESCE(v_giros_wheel, 0));

  IF v_giros_no_periodo >= v_config.giros_por_periodo THEN
    v_status := public.obter_status_roleta();
    RETURN json_build_object(
      'ok', false,
      'error', 'cooldown_active',
      'proximo_giro_em', v_status->>'proximo_giro_em'
    );
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_uid::text || ':prize_wheel_spin'));

  SELECT COALESCE(SUM(s.peso), 0)::INT INTO v_total_peso
  FROM public.prize_wheel_segments s
  INNER JOIN public.cupons c ON c.id = s.cupom_id
  WHERE s.ativo = true AND c.ativo = true AND c.tipo_bonus = 'giros_gratis';

  IF v_total_peso <= 0 THEN
    RETURN json_build_object('ok', false, 'error', 'no_segments');
  END IF;

  v_random := 1 + floor(random() * v_total_peso)::INT;

  FOR v_segment IN
    SELECT json_build_object(
      'id', s.id,
      'label', s.label,
      'peso', s.peso,
      'ordem', s.ordem,
      'cupom_id', s.cupom_id
    )
    FROM public.prize_wheel_segments s
    INNER JOIN public.cupons c ON c.id = s.cupom_id
    WHERE s.ativo = true AND c.ativo = true AND c.tipo_bonus = 'giros_gratis'
    ORDER BY s.ordem, s.label
  LOOP
    v_acumulado := v_acumulado + (v_segment->>'peso')::INT;
    IF v_random <= v_acumulado THEN
      v_segment_id := (v_segment->>'id')::UUID;
      EXIT;
    END IF;
    v_winner_index := v_winner_index + 1;
  END LOOP;

  SELECT * INTO v_cupom
  FROM public.cupons
  WHERE id = (v_segment->>'cupom_id')::UUID
  FOR UPDATE;

  IF v_cupom.id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_segment');
  END IF;

  v_limites := public._validar_limites_cupom(v_cupom, v_uid);
  IF NOT (v_limites->>'ok')::BOOLEAN THEN
    RETURN v_limites;
  END IF;

  v_requer_deposito := COALESCE(v_cupom.deposito_minimo, 0) > 0;

  IF v_requer_deposito THEN
    v_uso_id := public._conceder_giros_gratis(
      v_cupom,
      v_uid,
      NULL,
      NULL,
      'roleta',
      'pendente_deposito'
    );
  ELSE
    v_uso_id := public._conceder_giros_gratis(
      v_cupom,
      v_uid,
      NULL,
      NULL,
      'roleta',
      'disponivel'
    );
  END IF;

  INSERT INTO public.prize_wheel_spins (usuario_id, segment_id, cupom_id, cupom_uso_id)
  VALUES (v_uid, v_segment_id, v_cupom.id, v_uso_id);

  -- Recalcular índice do segmento vencedor na lista ordenada
  v_winner_index := 0;
  v_i := 0;
  FOR v_segment IN
    SELECT json_build_object('id', s.id)
    FROM public.prize_wheel_segments s
    INNER JOIN public.cupons c ON c.id = s.cupom_id
    WHERE s.ativo = true AND c.ativo = true AND c.tipo_bonus = 'giros_gratis'
    ORDER BY s.ordem, s.label
  LOOP
    IF (v_segment->>'id')::UUID = v_segment_id THEN
      v_winner_index := v_i;
      EXIT;
    END IF;
    v_i := v_i + 1;
  END LOOP;

  RETURN json_build_object(
    'ok', true,
    'winner_index', v_winner_index,
    'segment_id', v_segment_id,
    'label', (SELECT label FROM public.prize_wheel_segments WHERE id = v_segment_id),
    'codigo', v_cupom.codigo,
    'tipo_bonus', v_cupom.tipo_bonus,
    'quantidade_giros', TRUNC(v_cupom.valor)::INT,
    'jogo_slug', v_cupom.jogo_slug,
    'jogo_nome', v_cupom.jogo_nome,
    'provider_slug', v_cupom.provider_slug,
    'requer_deposito', v_requer_deposito,
    'deposito_minimo', COALESCE(v_cupom.deposito_minimo, 0),
    'status_giro', CASE WHEN v_requer_deposito THEN 'pendente_deposito' ELSE 'disponivel' END,
    'cupom_uso_id', v_uso_id
  );
END;
$$;


--
-- Name: FUNCTION girar_roleta(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.girar_roleta() IS 'Executa um giro na roleta e concede o prêmio via cupom de rodadas';


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
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
    indicado_por,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
    fbclid,
    fbc,
    fbp
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
    referred_by_code,
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'utm_source', '')), ''),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'utm_medium', '')), ''),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'utm_campaign', '')), ''),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'utm_content', '')), ''),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'utm_term', '')), ''),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'fbclid', '')), ''),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'fbc', '')), ''),
    NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'fbp', '')), '')
  );

  RETURN NEW;
END;
$$;


--
-- Name: handle_saque_rejeitado(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_saque_rejeitado() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.status IN ('rejeitado', 'falhou')
     AND OLD.status IN ('pendente', 'processando')
     AND COALESCE(OLD.saldo_debitado, false) = true
     AND COALESCE(OLD.saldo_reembolsado, false) = false
  THEN
    PERFORM set_config('app.skip_usuario_guard', 'true', true);

    UPDATE public.usuarios
    SET saldo = COALESCE(saldo, 0) + NEW.valor
    WHERE id = NEW.usuario_id;

    NEW.saldo_reembolsado := true;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: handle_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$;


--
-- Name: handle_updated_at_aviator_rounds(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_updated_at_aviator_rounds() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$;


--
-- Name: handle_updated_at_depositos(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_updated_at_depositos() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$;


--
-- Name: handle_updated_at_saques(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_updated_at_saques() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$;


--
-- Name: insert_aviator_vela(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.insert_aviator_vela() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.status = 'crashed' AND NEW.final_multiplier IS NOT NULL THEN
    INSERT INTO public.aviator_velas (round_id, multiplier)
    VALUES (NEW.id, NEW.final_multiplier)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: is_user_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_user_admin() RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    AS $$
DECLARE
  user_cargo TEXT;
BEGIN
  -- Esta função usa SECURITY DEFINER para bypassar RLS
  SELECT cargo INTO user_cargo
  FROM public.usuarios
  WHERE id = auth.uid();
  
  RETURN user_cargo = 'admin';
END;
$$;


--
-- Name: listar_cupons_usuario(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.listar_cupons_usuario() RETURNS json
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_uid UUID;
  v_result JSON;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.created_at DESC), '[]'::json)
  INTO v_result
  FROM (
    SELECT
      cu.id,
      c.codigo AS cupom,
      cu.valor_bonus AS valor,
      cu.valor_deposito,
      c.tipo_bonus,
      cu.quantidade_giros,
      cu.jogo_slug,
      cu.jogo_nome,
      c.provider_slug,
      cu.status_giro,
      cu.origem,
      CASE
        WHEN c.tipo_bonus = 'giros_gratis' AND cu.status_giro = 'pendente_deposito' THEN 'Aguardando depósito'
        WHEN c.tipo_bonus = 'giros_gratis' AND cu.status_giro = 'disponivel' THEN 'Rodadas disponíveis'
        WHEN c.tipo_bonus = 'giros_gratis' AND cu.status_giro = 'usado' THEN 'Rodadas usadas'
        ELSE 'Ativado'
      END AS status,
      TO_CHAR(cu.created_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') AS data,
      cu.created_at
    FROM public.cupom_usos cu
    INNER JOIN public.cupons c ON c.id = cu.cupom_id
    WHERE cu.usuario_id = v_uid
  ) t;

  RETURN json_build_object('ok', true, 'cupons', v_result);
END;
$$;


--
-- Name: FUNCTION listar_cupons_usuario(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.listar_cupons_usuario() IS 'Lista histórico de cupons ativados pelo usuário autenticado.';


--
-- Name: listar_depositos_admin(text, text, text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.listar_depositos_admin(p_status text DEFAULT NULL::text, p_periodo text DEFAULT 'todos'::text, p_busca text DEFAULT NULL::text, p_pagina integer DEFAULT 1, p_por_pagina integer DEFAULT 11) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: listar_logs_admin(date, date, text, text, text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.listar_logs_admin(p_data_inicial date DEFAULT NULL::date, p_data_final date DEFAULT NULL::date, p_categoria text DEFAULT NULL::text, p_status text DEFAULT NULL::text, p_busca text DEFAULT NULL::text, p_pagina integer DEFAULT 1, p_por_pagina integer DEFAULT 20) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: listar_membros_equipe(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.listar_membros_equipe() RETURNS TABLE(id uuid, nome text, email text, cargo text, ativo boolean, two_factor_enabled boolean, sessoes integer, ultimo_acesso timestamp with time zone, created_at timestamp with time zone)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: listar_saques_admin(text, text, text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.listar_saques_admin(p_status text DEFAULT NULL::text, p_periodo text DEFAULT 'todos'::text, p_busca text DEFAULT NULL::text, p_pagina integer DEFAULT 1, p_por_pagina integer DEFAULT 11) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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
  FROM public.saques s
  LEFT JOIN public.usuarios u ON u.id = s.usuario_id
  WHERE
    (v_inicio IS NULL OR (s.data_hora >= v_inicio AND s.data_hora < v_fim))
    AND (
      p_status IS NULL OR p_status = 'todos'
      OR (p_status = 'pendente' AND s.status = 'pendente')
      OR (p_status = 'aprovado' AND s.status = 'aprovado')
      OR (p_status = 'rejeitado' AND s.status = 'rejeitado')
      OR (p_status = 'falhou' AND s.status = 'falhou')
      OR (p_status = 'revenue_share' AND s.origem = 'revenue_share')
    )
    AND (
      v_busca IS NULL
      OR s.id::TEXT ILIKE '%' || v_busca || '%'
      OR s.valor::TEXT ILIKE '%' || v_busca || '%'
      OR s.chave ILIKE '%' || v_busca || '%'
      OR u.email ILIKE '%' || v_busca || '%'
      OR u.nome ILIKE '%' || v_busca || '%'
      OR u.usuario ILIKE '%' || v_busca || '%'
      OR u.usuario_nome ILIKE '%' || v_busca || '%'
      OR u.cpf ILIKE '%' || v_busca || '%'
    );

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO v_items
  FROM (
    SELECT
      s.id,
      s.usuario_id,
      s.valor,
      s.status,
      s.origem,
      s.key AS metodo_key,
      s.chave AS metodo_chave,
      s.data_hora,
      s.created_at,
      COALESCE(NULLIF(TRIM(u.usuario_nome), ''), NULLIF(TRIM(u.nome), ''), NULLIF(TRIM(u.usuario), ''), split_part(u.email, '@', 1)) AS usuario_nome,
      u.email AS usuario_email,
      u.cargo AS usuario_cargo
    FROM public.saques s
    LEFT JOIN public.usuarios u ON u.id = s.usuario_id
    WHERE
      (v_inicio IS NULL OR (s.data_hora >= v_inicio AND s.data_hora < v_fim))
      AND (
        p_status IS NULL OR p_status = 'todos'
        OR (p_status = 'pendente' AND s.status = 'pendente')
        OR (p_status = 'aprovado' AND s.status = 'aprovado')
        OR (p_status = 'rejeitado' AND s.status = 'rejeitado')
        OR (p_status = 'falhou' AND s.status = 'falhou')
        OR (p_status = 'revenue_share' AND s.origem = 'revenue_share')
      )
      AND (
        v_busca IS NULL
        OR s.id::TEXT ILIKE '%' || v_busca || '%'
        OR s.valor::TEXT ILIKE '%' || v_busca || '%'
        OR s.chave ILIKE '%' || v_busca || '%'
        OR u.email ILIKE '%' || v_busca || '%'
        OR u.nome ILIKE '%' || v_busca || '%'
        OR u.usuario ILIKE '%' || v_busca || '%'
        OR u.usuario_nome ILIKE '%' || v_busca || '%'
        OR u.cpf ILIKE '%' || v_busca || '%'
      )
    ORDER BY s.data_hora DESC
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


--
-- Name: listar_sessoes_usuario_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.listar_sessoes_usuario_admin(p_usuario_id uuid) RETURNS TABLE(id uuid, created_at timestamp with time zone, updated_at timestamp with time zone, user_agent text, ip inet)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.created_at,
    s.updated_at,
    s.user_agent,
    s.ip
  FROM auth.sessions s
  WHERE s.user_id = p_usuario_id
  ORDER BY s.updated_at DESC;
END;
$$;


--
-- Name: listar_transacoes_recentes_admin(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.listar_transacoes_recentes_admin(p_limite integer DEFAULT 10) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: listar_transacoes_usuario_admin(uuid, text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.listar_transacoes_usuario_admin(p_usuario_id uuid, p_tipo text DEFAULT 'todos'::text, p_limite integer DEFAULT 10, p_offset integer DEFAULT 0) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: listar_usuarios_admin(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.listar_usuarios_admin(p_offset integer DEFAULT 0, p_limit integer DEFAULT 11) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_total INT;
  v_items JSON;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT COUNT(*)::INT INTO v_total FROM public.usuarios;

  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  INTO v_items
  FROM (
    SELECT
      u.id,
      u.nome,
      u.usuario_nome,
      u.usuario,
      u.cpf,
      u.email,
      u.telefone,
      u.created_at,
      u.saldo,
      u.cargo,
      u.vip_nivel,
      u.total_depositado,
      u.indicado_por,
      ref.id AS indicador_id,
      COALESCE(
        NULLIF(TRIM(ref.usuario_nome), ''),
        NULLIF(TRIM(ref.nome), ''),
        NULLIF(TRIM(ref.usuario), ''),
        split_part(ref.email, '@', 1)
      ) AS indicador_nome
    FROM public.usuarios u
    LEFT JOIN public.usuarios ref ON ref.link_indicação = u.indicado_por
    ORDER BY u.created_at DESC
    OFFSET GREATEST(p_offset, 0)
    LIMIT GREATEST(p_limit, 1)
  ) t;

  RETURN json_build_object(
    'total', v_total,
    'items', v_items
  );
END;
$$;


--
-- Name: marcar_rodadas_gratis_usadas(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.marcar_rodadas_gratis_usadas(p_cupom_uso_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_uid UUID;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  UPDATE public.cupom_usos cu
  SET status_giro = 'usado'
  FROM public.cupons c
  WHERE cu.id = p_cupom_uso_id
    AND cu.usuario_id = v_uid
    AND cu.cupom_id = c.id
    AND c.tipo_bonus = 'giros_gratis'
    AND cu.status_giro = 'disponivel';

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'not_found_or_not_available');
  END IF;

  RETURN json_build_object('ok', true);
END;
$$;


--
-- Name: obter_analise_risco_saque_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.obter_analise_risco_saque_admin(p_saque_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
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
$_$;


--
-- Name: obter_aviator_config_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.obter_aviator_config_admin() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_config public.aviator_config%ROWTYPE;
  v_stats JSON;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT * INTO v_config FROM public.aviator_config WHERE id = 1;
  IF NOT FOUND THEN
    INSERT INTO public.aviator_config (id) VALUES (1);
    SELECT * INTO v_config FROM public.aviator_config WHERE id = 1;
  END IF;

  v_stats := public.calcular_aviator_ggr(COALESCE(v_config.recovery_window_hours, 24));

  RETURN json_build_object(
    'ok', true,
    'config', json_build_object(
      'modo_geracao', v_config.modo_geracao,
      'rtp_geral', v_config.rtp_base,
      'rtp_base', v_config.rtp_base,
      'rtp_min', v_config.rtp_min,
      'rtp_max', v_config.rtp_max,
      'pct_vela_azul', v_config.pct_vela_azul,
      'pct_vela_roxa', v_config.pct_vela_roxa,
      'pct_vela_rosa', v_config.pct_vela_rosa,
      'geracao_min_crash', v_config.geracao_min_crash,
      'geracao_max_crash', v_config.geracao_max_crash,
      'min_crash', v_config.min_crash,
      'max_crash', v_config.max_crash,
      'queue_size', v_config.queue_size,
      'rtp_limit_min_pct', v_config.rtp_limit_min_pct,
      'rtp_limit_max_pct', v_config.rtp_limit_max_pct,
      'crash_technical_max', v_config.crash_technical_max,
      'recovery_enabled', v_config.recovery_enabled,
      'recovery_window_hours', v_config.recovery_window_hours,
      'ggr_target_pct', v_config.ggr_target_pct,
      'recovery_strength', v_config.recovery_strength,
      'recovery_max_adjustment', v_config.recovery_max_adjustment,
      'min_wagered_for_recovery', v_config.min_wagered_for_recovery,
      'recovery_loss_trigger_brl', COALESCE(v_config.recovery_loss_trigger_brl, 10000),
      'recovery_profit_trigger_brl', COALESCE(v_config.recovery_profit_trigger_brl, 10000),
      'updated_at', v_config.updated_at
    ),
    'stats', v_stats
  );
END;
$$;


--
-- Name: obter_aviator_engine_config(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.obter_aviator_engine_config() RETURNS json
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_config public.aviator_config%ROWTYPE;
  v_stats JSON;
  v_wagered NUMERIC := 0;
  v_paid NUMERIC := 0;
  v_ggr NUMERIC := 0;
  v_ggr_pct NUMERIC := 0;
  v_rtp_real NUMERIC := 0;
  v_edge_delta NUMERIC := 0;
  v_adjustment NUMERIC := 0;
  v_loss_boost NUMERIC := 0;
  v_profit_boost NUMERIC := 0;
  v_effective_rtp NUMERIC;
  v_recovery_mode TEXT := 'balanced';
  v_ggr_bucket BIGINT;
  v_rtp_bucket INT;
  v_engine_version TEXT;
  v_hours INT;
  v_eff_min NUMERIC;
  v_eff_max NUMERIC;
BEGIN
  SELECT * INTO v_config FROM public.aviator_config WHERE id = 1;
  IF NOT FOUND THEN
    INSERT INTO public.aviator_config (id) VALUES (1);
    SELECT * INTO v_config FROM public.aviator_config WHERE id = 1;
  END IF;

  v_hours := GREATEST(COALESCE(v_config.recovery_window_hours, 24), 1);
  v_stats := public.calcular_aviator_ggr(v_hours);

  v_wagered := COALESCE((v_stats->>'total_wagered')::NUMERIC, 0);
  v_paid := COALESCE((v_stats->>'total_paid')::NUMERIC, 0);
  v_ggr := COALESCE((v_stats->>'ggr')::NUMERIC, 0);
  v_ggr_pct := COALESCE((v_stats->>'ggr_pct')::NUMERIC, 0);
  v_rtp_real := COALESCE((v_stats->>'rtp_real_pct')::NUMERIC, 0);

  v_effective_rtp := v_config.rtp_base;

  IF v_config.recovery_enabled AND v_wagered >= v_config.min_wagered_for_recovery THEN
    v_edge_delta := v_config.ggr_target_pct - v_ggr_pct;
    v_adjustment := (v_edge_delta / 100.0) * v_config.recovery_strength;

    IF v_ggr < 0 AND COALESCE(v_config.recovery_loss_trigger_brl, 0) > 0 THEN
      v_loss_boost := LEAST(1.0, ABS(v_ggr) / v_config.recovery_loss_trigger_brl)
        * v_config.recovery_max_adjustment;
      v_adjustment := v_adjustment + v_loss_boost;
    END IF;

    IF v_ggr > 0 THEN
      v_profit_boost := LEAST(
        1.0,
        v_ggr / GREATEST(COALESCE(v_config.recovery_profit_trigger_brl, 10000), 1)
      ) * v_config.recovery_max_adjustment;

      IF v_ggr_pct > v_config.ggr_target_pct THEN
        v_profit_boost := v_profit_boost + LEAST(
          v_config.recovery_max_adjustment,
          ((v_ggr_pct - v_config.ggr_target_pct) / 100.0)
            * GREATEST(v_config.recovery_strength, 0.20)
        );
      END IF;

      v_adjustment := v_adjustment - v_profit_boost;
    END IF;

    v_adjustment := GREATEST(
      -v_config.recovery_max_adjustment,
      LEAST(v_config.recovery_max_adjustment, v_adjustment)
    );
    v_effective_rtp := v_config.rtp_base - v_adjustment;
  END IF;

  v_effective_rtp := GREATEST(v_config.rtp_min, LEAST(v_config.rtp_max, v_effective_rtp));

  IF v_config.recovery_enabled THEN
    IF v_ggr < 0 AND ABS(v_ggr) >= COALESCE(v_config.recovery_loss_trigger_brl, 10000) * 0.4 THEN
      v_recovery_mode := 'recovering';
    ELSIF v_ggr > 0 AND (
      v_ggr >= COALESCE(v_config.recovery_profit_trigger_brl, 10000) * 0.4
      OR v_ggr_pct >= v_config.ggr_target_pct
    ) THEN
      v_recovery_mode := 'generous';
    END IF;
  END IF;

  IF COALESCE(v_config.modo_geracao, 'velas') = 'crash' THEN
    v_eff_min := v_config.min_crash;
    v_eff_max := v_config.max_crash;
  ELSE
    v_eff_min := COALESCE(v_config.geracao_min_crash, v_config.min_crash, 1.01);
    v_eff_max := COALESCE(v_config.geracao_max_crash, v_config.max_crash, 500);
  END IF;

  v_ggr_bucket := FLOOR(v_ggr / 500);
  v_rtp_bucket := ROUND(v_effective_rtp * 1000);
  -- Inclui updated_at para invalidar fila ao mudar só pct_vela_*
  v_engine_version :=
    COALESCE(v_config.modo_geracao, 'velas')
    || ':' || v_rtp_bucket::TEXT
    || ':' || v_ggr_bucket::TEXT
    || ':' || COALESCE(v_config.updated_at::TEXT, '')
    || ':' || COALESCE(v_config.pct_vela_azul, 0)::TEXT
    || ':' || COALESCE(v_config.pct_vela_roxa, 0)::TEXT
    || ':' || COALESCE(v_config.pct_vela_rosa, 0)::TEXT;

  RETURN json_build_object(
    'ok', true,
    'modo_geracao', COALESCE(v_config.modo_geracao, 'velas'),
    'rtp_geral', v_effective_rtp,
    'rtp_factor', v_effective_rtp,
    'rtp_base', v_config.rtp_base,
    'rtp_min', v_config.rtp_min,
    'rtp_max', v_config.rtp_max,
    'effective_rtp', v_effective_rtp,
    'pct_vela_azul', v_config.pct_vela_azul,
    'pct_vela_roxa', v_config.pct_vela_roxa,
    'pct_vela_rosa', v_config.pct_vela_rosa,
    'geracao_min_crash', v_config.geracao_min_crash,
    'geracao_max_crash', v_config.geracao_max_crash,
    'min_crash', v_eff_min,
    'max_crash', v_eff_max,
    'min_crash_mul', GREATEST(101, FLOOR(v_eff_min * 100)::INT),
    'max_crash_mul', LEAST(
      FLOOR(COALESCE(v_config.crash_technical_max, 1000) * 100)::INT,
      FLOOR(v_eff_max * 100)::INT
    ),
    'crash_technical_max', v_config.crash_technical_max,
    'recovery_enabled', v_config.recovery_enabled,
    'recovery_adjustment', v_config.rtp_base - v_effective_rtp,
    'recovery_mode', v_recovery_mode,
    'queue_size', v_config.queue_size,
    'config_version', v_config.updated_at,
    'engine_version', v_engine_version,
    'stats', v_stats,
    'ggr', v_ggr,
    'ggr_target_pct', v_config.ggr_target_pct,
    'ggr_pct', v_ggr_pct,
    'rtp_real_pct', v_rtp_real,
    'recovery_loss_trigger_brl', COALESCE(v_config.recovery_loss_trigger_brl, 10000),
    'recovery_profit_trigger_brl', COALESCE(v_config.recovery_profit_trigger_brl, 10000)
  );
END;
$$;


--
-- Name: obter_bonus_usuario(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.obter_bonus_usuario() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_uid UUID;
  v_saldo_bonus NUMERIC;
  v_rollover_bonus NUMERIC;
  v_multiplicador NUMERIC;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT
    COALESCE(u.saldo_bonus, 0),
    COALESCE(u.rollover_bonus_pendente, 0)
  INTO v_saldo_bonus, v_rollover_bonus
  FROM public.usuarios u
  WHERE u.id = v_uid;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'user_not_found');
  END IF;

  SELECT COALESCE(sc.rollover_giros_gratis, 5)
  INTO v_multiplicador
  FROM public.site_config sc
  WHERE sc.id = 1;

  RETURN json_build_object(
    'ok', true,
    'saldo_bonus', ROUND(COALESCE(v_saldo_bonus, 0), 2),
    'rollover_bonus_pendente', ROUND(COALESCE(v_rollover_bonus, 0), 2),
    'rollover_giros_gratis', COALESCE(v_multiplicador, 5),
    'pode_converter',
      COALESCE(v_saldo_bonus, 0) > 0.009
      AND COALESCE(v_rollover_bonus, 0) <= 0.009
  );
END;
$$;


--
-- Name: FUNCTION obter_bonus_usuario(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.obter_bonus_usuario() IS 'Retorna saldo_bonus, rollover_bonus_pendente e se pode converter.';


--
-- Name: obter_bspay_config_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.obter_bspay_config_admin() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_row public.integration_secrets%ROWTYPE;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT * INTO v_row FROM public.integration_secrets WHERE id = 1;

  IF NOT FOUND THEN
    INSERT INTO public.integration_secrets (id) VALUES (1)
    ON CONFLICT (id) DO NOTHING;
    SELECT * INTO v_row FROM public.integration_secrets WHERE id = 1;
  END IF;

  RETURN json_build_object(
    'ok', true,
    'bspay_client_id', COALESCE(v_row.bspay_client_id, ''),
    'bspay_api_url', COALESCE(NULLIF(TRIM(v_row.bspay_api_url), ''), 'https://api.bspay.co'),
    'bspay_client_secret_configured', COALESCE(NULLIF(TRIM(v_row.bspay_client_secret), ''), '') <> '',
    'bspay_signing_key_configured', COALESCE(NULLIF(TRIM(v_row.bspay_signing_key), ''), '') <> '',
    'bspay_webhook_secret_configured', COALESCE(NULLIF(TRIM(v_row.bspay_webhook_secret), ''), '') <> '',
    'updated_at', v_row.updated_at
  );
END;
$$;


--
-- Name: obter_carteira_ativa(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.obter_carteira_ativa() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_uid UUID;
  v_carteira TEXT;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT COALESCE(u.carteira_ativa, 'real')
  INTO v_carteira
  FROM public.usuarios u
  WHERE u.id = v_uid;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'user_not_found');
  END IF;

  RETURN json_build_object('ok', true, 'carteira_ativa', v_carteira);
END;
$$;


--
-- Name: obter_config_plataforma(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.obter_config_plataforma() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_config public.site_config%ROWTYPE;
BEGIN
  SELECT * INTO v_config FROM public.site_config WHERE id = 1;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'ok', true,
      'deposito_minimo', 20,
      'deposito_maximo', 1000000,
      'saque_minimo', 50,
      'saque_maximo', 1000000,
      'saques_diarios_permitidos', 1,
      'rollover_padrao', 1,
      'rollover_giros_gratis', 5,
      'indicacao_recompensa', 100,
      'indicacao_deposito_minimo', 50
    );
  END IF;

  RETURN json_build_object(
    'ok', true,
    'deposito_minimo', v_config.deposito_minimo,
    'deposito_maximo', v_config.deposito_maximo,
    'saque_minimo', v_config.saque_minimo,
    'saque_maximo', v_config.saque_maximo,
    'saques_diarios_permitidos', COALESCE(v_config.saques_diarios_permitidos, 1),
    'rollover_padrao', COALESCE(v_config.rollover_padrao, 1),
    'rollover_giros_gratis', COALESCE(v_config.rollover_giros_gratis, 5),
    'indicacao_recompensa', COALESCE(v_config.indicacao_recompensa, 100),
    'indicacao_deposito_minimo', COALESCE(v_config.indicacao_deposito_minimo, 50),
    'updated_at', v_config.updated_at
  );
END;
$$;


--
-- Name: obter_detalhes_deposito_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.obter_detalhes_deposito_admin(p_deposito_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: obter_detalhes_usuario_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.obter_detalhes_usuario_admin(p_usuario_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_usuario public.usuarios%ROWTYPE;
  v_ultimo_login TIMESTAMPTZ;
  v_sessoes INT;
  v_total_depositos INT;
  v_total_saques INT;
  v_total_apostas INT;
  v_valor_depositos NUMERIC;
  v_valor_saques NUMERIC;
  v_count_depositos_aprovados INT;
  v_count_saques_aprovados INT;
  v_count_apostas INT;
  v_total_apostado NUMERIC;
  v_total_ganho NUMERIC;
  v_valor_depositos_aprovados NUMERIC;
  v_valor_saques_aprovados NUMERIC;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT * INTO v_usuario
  FROM public.usuarios
  WHERE id = p_usuario_id;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'Usuário não encontrado');
  END IF;

  SELECT au.last_sign_in_at INTO v_ultimo_login
  FROM auth.users au
  WHERE au.id = p_usuario_id;

  SELECT COUNT(*)::INT INTO v_sessoes
  FROM auth.sessions s
  WHERE s.user_id = p_usuario_id;

  SELECT COUNT(*)::INT, COALESCE(SUM(valor), 0)
  INTO v_total_depositos, v_valor_depositos
  FROM public.depositos
  WHERE usuario_id = p_usuario_id;

  SELECT COUNT(*)::INT, COALESCE(SUM(valor), 0)
  INTO v_total_saques, v_valor_saques
  FROM public.saques
  WHERE usuario_id = p_usuario_id;

  SELECT COUNT(*)::INT INTO v_total_apostas
  FROM public.transacoes_jogos
  WHERE usuario_id = p_usuario_id;

  SELECT COUNT(*)::INT, COALESCE(SUM(valor), 0)
  INTO v_count_depositos_aprovados, v_valor_depositos_aprovados
  FROM public.depositos
  WHERE usuario_id = p_usuario_id AND LOWER(TRIM(status)) = 'aprovado';

  SELECT COUNT(*)::INT, COALESCE(SUM(valor), 0)
  INTO v_count_saques_aprovados, v_valor_saques_aprovados
  FROM public.saques
  WHERE usuario_id = p_usuario_id AND LOWER(TRIM(status)) = 'aprovado';

  SELECT COUNT(*)::INT, COALESCE(SUM(valor), 0)
  INTO v_count_apostas, v_total_apostado
  FROM public.transacoes_jogos
  WHERE usuario_id = p_usuario_id;

  SELECT COALESCE(SUM(retorno), 0) INTO v_total_ganho
  FROM public.transacoes_jogos
  WHERE usuario_id = p_usuario_id;

  IF COALESCE(v_valor_depositos_aprovados, 0) <= 0 AND COALESCE(v_usuario.total_depositado, 0) > 0 THEN
    v_valor_depositos_aprovados := v_usuario.total_depositado;
    IF v_count_depositos_aprovados <= 0 AND v_total_depositos > 0 THEN
      v_count_depositos_aprovados := v_total_depositos;
    END IF;
  END IF;

  IF COALESCE(v_valor_saques_aprovados, 0) <= 0 AND COALESCE(v_valor_saques, 0) > 0 THEN
    v_valor_saques_aprovados := v_valor_saques;
    IF v_count_saques_aprovados <= 0 AND v_total_saques > 0 THEN
      v_count_saques_aprovados := v_total_saques;
    END IF;
  END IF;

  RETURN json_build_object(
    'ok', true,
    'usuario', json_build_object(
      'id', v_usuario.id,
      'nome', COALESCE(NULLIF(TRIM(v_usuario.usuario_nome), ''), NULLIF(TRIM(v_usuario.nome), ''), NULLIF(TRIM(v_usuario.usuario), ''), split_part(v_usuario.email, '@', 1)),
      'email', v_usuario.email,
      'cpf', v_usuario.cpf,
      'telefone', v_usuario.telefone,
      'data_nascimento', v_usuario.data_nascimento,
      'pais', COALESCE(v_usuario.pais, 'BR'),
      'kyc_status', COALESCE(v_usuario.kyc_status, 'nao_enviado'),
      'verificado', COALESCE(v_usuario.verificado, false),
      'ativo', COALESCE(v_usuario.ativo, true),
      'cargo', COALESCE(v_usuario.cargo, 'usuario'),
      'saldo', COALESCE(v_usuario.saldo, 0),
      'vip_nivel', COALESCE(v_usuario.vip_nivel, 1),
      'total_depositado', COALESCE(v_usuario.total_depositado, 0),
      'created_at', v_usuario.created_at,
      'ultimo_login', v_ultimo_login,
      'sessoes', COALESCE(v_sessoes, 0)
    ),
    'resumo', json_build_object(
      'total_depositos', v_total_depositos,
      'valor_depositos', v_valor_depositos,
      'total_saques', v_total_saques,
      'valor_saques', v_valor_saques,
      'total_apostas', v_total_apostas
    ),
    'estatisticas', json_build_object(
      'total_depositado', COALESCE(v_valor_depositos_aprovados, 0),
      'total_retirado', COALESCE(v_valor_saques_aprovados, 0),
      'total_apostado', COALESCE(v_total_apostado, 0),
      'total_ganho', COALESCE(v_total_ganho, 0),
      'media_deposito', CASE
        WHEN v_count_depositos_aprovados > 0
        THEN ROUND(v_valor_depositos_aprovados / v_count_depositos_aprovados, 2)
        ELSE 0
      END,
      'media_saque', CASE
        WHEN v_count_saques_aprovados > 0
        THEN ROUND(v_valor_saques_aprovados / v_count_saques_aprovados, 2)
        ELSE 0
      END,
      'media_aposta', CASE
        WHEN v_count_apostas > 0
        THEN ROUND(v_total_apostado / v_count_apostas, 2)
        ELSE 0
      END
    )
  );
END;
$$;


--
-- Name: obter_indicacao_config_usuario(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.obter_indicacao_config_usuario(p_usuario_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_usuario public.usuarios%ROWTYPE;
  v_global_recompensa NUMERIC;
  v_global_deposito_min NUMERIC;
  v_total_indicados INT := 0;
  v_qualificados INT := 0;
  v_ganhos_totais NUMERIC := 0;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_usuario_id AND NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT * INTO v_usuario
  FROM public.usuarios
  WHERE id = p_usuario_id;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'usuario_nao_encontrado');
  END IF;

  SELECT
    COALESCE(sc.indicacao_recompensa, 100),
    COALESCE(sc.indicacao_deposito_minimo, 50)
  INTO v_global_recompensa, v_global_deposito_min
  FROM public.site_config sc
  WHERE sc.id = 1;

  v_global_recompensa := COALESCE(v_global_recompensa, 100);
  v_global_deposito_min := COALESCE(v_global_deposito_min, 50);

  IF v_usuario.link_indicação IS NOT NULL AND TRIM(v_usuario.link_indicação) <> '' THEN
    SELECT COUNT(*)::INT
    INTO v_total_indicados
    FROM public.usuarios u
    WHERE u.indicado_por = v_usuario.link_indicação;

    v_qualificados := public.count_qualified_referrals(v_usuario.link_indicação);
    v_ganhos_totais := public.calcular_ganhos_indicacao(v_usuario.link_indicação);
  END IF;

  RETURN json_build_object(
    'ok', true,
    'link_indicacao', v_usuario.link_indicação,
    'recompensa', COALESCE(v_usuario.indicacao_recompensa_custom, v_global_recompensa),
    'deposito_minimo', COALESCE(v_usuario.indicacao_deposito_minimo_custom, v_global_deposito_min),
    'recompensa_custom', v_usuario.indicacao_recompensa_custom,
    'deposito_minimo_custom', v_usuario.indicacao_deposito_minimo_custom,
    'usa_padrao_plataforma',
      v_usuario.indicacao_recompensa_custom IS NULL
      AND v_usuario.indicacao_deposito_minimo_custom IS NULL,
    'global_recompensa', v_global_recompensa,
    'global_deposito_minimo', v_global_deposito_min,
    'total_indicados', COALESCE(v_total_indicados, 0),
    'indicados_qualificados', COALESCE(v_qualificados, 0),
    'ganhos_totais', COALESCE(v_ganhos_totais, 0)
  );
END;
$$;


--
-- Name: obter_indicacao_usuario_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.obter_indicacao_usuario_admin(p_usuario_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_usuario public.usuarios%ROWTYPE;
  v_config JSON;
  v_total_indicados INT := 0;
  v_qualificados INT := 0;
  v_ganhos_totais NUMERIC := 0;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT * INTO v_usuario
  FROM public.usuarios
  WHERE id = p_usuario_id;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'Usuário não encontrado');
  END IF;

  v_config := public.obter_indicacao_config_usuario(p_usuario_id);

  IF v_usuario.link_indicação IS NOT NULL AND TRIM(v_usuario.link_indicação) <> '' THEN
    SELECT COUNT(*)::INT
    INTO v_total_indicados
    FROM public.usuarios u
    WHERE u.indicado_por = v_usuario.link_indicação;

    v_qualificados := public.count_qualified_referrals(v_usuario.link_indicação);
    v_ganhos_totais := public.calcular_ganhos_indicacao(v_usuario.link_indicação);
  END IF;

  RETURN json_build_object(
    'ok', true,
    'link_indicacao', v_usuario.link_indicação,
    'recompensa_custom', v_usuario.indicacao_recompensa_custom,
    'deposito_minimo_custom', v_usuario.indicacao_deposito_minimo_custom,
    'usa_padrao_plataforma',
      v_usuario.indicacao_recompensa_custom IS NULL
      AND v_usuario.indicacao_deposito_minimo_custom IS NULL,
    'global_recompensa', (v_config->>'global_recompensa')::NUMERIC,
    'global_deposito_minimo', (v_config->>'global_deposito_minimo')::NUMERIC,
    'recompensa_efetiva', (v_config->>'recompensa')::NUMERIC,
    'deposito_minimo_efetivo', (v_config->>'deposito_minimo')::NUMERIC,
    'total_indicados', COALESCE(v_total_indicados, 0),
    'indicados_qualificados', COALESCE(v_qualificados, 0),
    'ganhos_totais', COALESCE(v_ganhos_totais, 0)
  );
END;
$$;


--
-- Name: obter_misticpay_config_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.obter_misticpay_config_admin() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_row public.integration_secrets%ROWTYPE;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT * INTO v_row FROM public.integration_secrets WHERE id = 1;

  IF NOT FOUND THEN
    INSERT INTO public.integration_secrets (id) VALUES (1)
    ON CONFLICT (id) DO NOTHING;
    SELECT * INTO v_row FROM public.integration_secrets WHERE id = 1;
  END IF;

  RETURN json_build_object(
    'ok', true,
    'misticpay_ci', COALESCE(v_row.misticpay_ci, ''),
    'misticpay_api_url', COALESCE(NULLIF(TRIM(v_row.misticpay_api_url), ''), 'https://api.misticpay.com/api'),
    'misticpay_cs_configured', COALESCE(NULLIF(TRIM(v_row.misticpay_cs), ''), '') <> '',
    'misticpay_webhook_secret_configured', COALESCE(NULLIF(TRIM(v_row.misticpay_webhook_secret), ''), '') <> '',
    'updated_at', v_row.updated_at
  );
END;
$$;


--
-- Name: obter_payment_gateway_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.obter_payment_gateway_admin() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_row public.integration_secrets%ROWTYPE;
  v_deposit TEXT;
  v_withdraw TEXT;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT * INTO v_row FROM public.integration_secrets WHERE id = 1;

  IF NOT FOUND THEN
    INSERT INTO public.integration_secrets (id) VALUES (1)
    ON CONFLICT (id) DO NOTHING;
    SELECT * INTO v_row FROM public.integration_secrets WHERE id = 1;
  END IF;

  v_deposit := COALESCE(
    NULLIF(TRIM(v_row.payment_gateway_deposit), ''),
    NULLIF(TRIM(v_row.payment_gateway), ''),
    'misticpay'
  );
  v_withdraw := COALESCE(
    NULLIF(TRIM(v_row.payment_gateway_withdraw), ''),
    NULLIF(TRIM(v_row.payment_gateway), ''),
    'misticpay'
  );

  RETURN json_build_object(
    'ok', true,
    'payment_gateway', v_deposit,
    'payment_gateway_deposit', v_deposit,
    'payment_gateway_withdraw', v_withdraw,
    'misticpay_configured',
      COALESCE(NULLIF(TRIM(v_row.misticpay_ci), ''), '') <> ''
      AND COALESCE(NULLIF(TRIM(v_row.misticpay_cs), ''), '') <> '',
    'bspay_configured',
      COALESCE(NULLIF(TRIM(v_row.bspay_client_id), ''), '') <> ''
      AND COALESCE(NULLIF(TRIM(v_row.bspay_client_secret), ''), '') <> ''
      AND COALESCE(NULLIF(TRIM(v_row.bspay_signing_key), ''), '') <> '',
    'veopag_configured',
      COALESCE(NULLIF(TRIM(v_row.veopag_client_id), ''), '') <> ''
      AND COALESCE(NULLIF(TRIM(v_row.veopag_client_secret), ''), '') <> '',
    'updated_at', v_row.updated_at
  );
END;
$$;


--
-- Name: obter_roleta_config(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.obter_roleta_config() RETURNS json
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_config public.prize_wheel_config;
  v_segments JSON;
BEGIN
  SELECT * INTO v_config
  FROM public.prize_wheel_config
  WHERE id = 1 AND ativo = true;

  IF v_config.id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'wheel_disabled');
  END IF;

  SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.ordem, t.label), '[]'::json)
  INTO v_segments
  FROM (
    SELECT
      s.id,
      s.label,
      s.peso,
      s.ordem,
      c.codigo AS cupom_codigo,
      c.tipo_bonus,
      TRUNC(c.valor)::INT AS quantidade_giros,
      c.jogo_slug,
      c.jogo_nome,
      c.provider_slug,
      COALESCE(c.deposito_minimo, 0) AS deposito_minimo
    FROM public.prize_wheel_segments s
    INNER JOIN public.cupons c ON c.id = s.cupom_id
    WHERE s.ativo = true
      AND c.ativo = true
      AND c.tipo_bonus = 'giros_gratis'
  ) t;

  IF json_array_length(v_segments) = 0 THEN
    RETURN json_build_object('ok', false, 'error', 'no_segments');
  END IF;

  RETURN json_build_object(
    'ok', true,
    'config', json_build_object(
      'titulo_imagem_url', v_config.titulo_imagem_url,
      'banner_imagem_url', v_config.banner_imagem_url,
      'roleta_imagem_url', v_config.roleta_imagem_url,
      'widget_imagem_url', v_config.widget_imagem_url,
      'centro_imagem_url', v_config.centro_imagem_url,
      'giros_por_periodo', v_config.giros_por_periodo,
      'cooldown_horas', v_config.cooldown_horas
    ),
    'segments', v_segments
  );
END;
$$;


--
-- Name: FUNCTION obter_roleta_config(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.obter_roleta_config() IS 'Retorna configuração e segmentos ativos da roleta de prêmios';


--
-- Name: obter_rollover_usuario(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.obter_rollover_usuario() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_uid UUID;
  v_pendente NUMERIC;
  v_padrao NUMERIC;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT COALESCE(u.rollover_pendente, 0)
  INTO v_pendente
  FROM public.usuarios u
  WHERE u.id = v_uid;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'user_not_found');
  END IF;

  SELECT COALESCE(sc.rollover_padrao, 1)
  INTO v_padrao
  FROM public.site_config sc
  WHERE sc.id = 1;

  RETURN json_build_object(
    'ok', true,
    'rollover_pendente', COALESCE(v_pendente, 0),
    'rollover_padrao', COALESCE(v_padrao, 1),
    'pode_sacar', COALESCE(v_pendente, 0) <= 0.009
  );
END;
$$;


--
-- Name: obter_rollover_usuario_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.obter_rollover_usuario_admin(p_usuario_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_pendente NUMERIC;
  v_meta NUMERIC;
  v_inicio TIMESTAMPTZ;
  v_apostado NUMERIC;
  v_progresso NUMERIC;
  v_ativo BOOLEAN;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id = p_usuario_id) THEN
    RETURN json_build_object('ok', false, 'error', 'Usuário não encontrado');
  END IF;

  SELECT
    COALESCE(u.rollover_pendente, 0),
    COALESCE(u.rollover_meta, 0),
    u.rollover_inicio
  INTO v_pendente, v_meta, v_inicio
  FROM public.usuarios u
  WHERE u.id = p_usuario_id;

  IF v_meta <= 0.009 AND v_pendente > 0.009 THEN
    v_meta := v_pendente;
  END IF;

  v_ativo := COALESCE(v_pendente, 0) > 0.009;
  v_apostado := GREATEST(0, COALESCE(v_meta, 0) - COALESCE(v_pendente, 0));
  v_progresso := CASE
    WHEN COALESCE(v_meta, 0) > 0.009
    THEN ROUND((v_apostado / v_meta) * 100, 1)
    ELSE 0
  END;

  RETURN json_build_object(
    'ok', true,
    'ativo', v_ativo,
    'rollover_pendente', COALESCE(v_pendente, 0),
    'rollover_meta', COALESCE(v_meta, 0),
    'rollover_apostado', v_apostado,
    'progresso', v_progresso,
    'data_inicio', v_inicio,
    'saques_bloqueados', v_ativo
  );
END;
$$;


--
-- Name: obter_stats_dashboard_admin(text, date, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.obter_stats_dashboard_admin(p_periodo text DEFAULT 'hoje'::text, p_data_inicio date DEFAULT NULL::date, p_data_fim date DEFAULT NULL::date) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: obter_stats_depositos_admin(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.obter_stats_depositos_admin(p_periodo text DEFAULT 'hoje'::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: obter_stats_saques_admin(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.obter_stats_saques_admin(p_periodo text DEFAULT 'todos'::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_inicio TIMESTAMPTZ;
  v_fim TIMESTAMPTZ;
  v_pendente_count INT;
  v_pendente_valor NUMERIC;
  v_aprovado_count INT;
  v_aprovado_valor NUMERIC;
  v_rejeitado_count INT;
  v_rejeitado_valor NUMERIC;
  v_falhou_count INT;
  v_falhou_valor NUMERIC;
  v_revenue_count INT;
  v_revenue_valor NUMERIC;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT r.inicio, r.fim INTO v_inicio, v_fim
  FROM public._depositos_periodo_range(p_periodo) r;

  IF v_inicio IS NULL THEN
    SELECT COUNT(*)::INT, COALESCE(SUM(valor), 0) INTO v_pendente_count, v_pendente_valor
    FROM public.saques WHERE status = 'pendente';

    SELECT COUNT(*)::INT, COALESCE(SUM(valor), 0) INTO v_aprovado_count, v_aprovado_valor
    FROM public.saques WHERE status = 'aprovado';

    SELECT COUNT(*)::INT, COALESCE(SUM(valor), 0) INTO v_rejeitado_count, v_rejeitado_valor
    FROM public.saques WHERE status = 'rejeitado';

    SELECT COUNT(*)::INT, COALESCE(SUM(valor), 0) INTO v_falhou_count, v_falhou_valor
    FROM public.saques WHERE status = 'falhou';

    SELECT COUNT(*)::INT, COALESCE(SUM(valor), 0) INTO v_revenue_count, v_revenue_valor
    FROM public.saques WHERE origem = 'revenue_share' AND status = 'aprovado';
  ELSE
    SELECT COUNT(*)::INT, COALESCE(SUM(valor), 0) INTO v_pendente_count, v_pendente_valor
    FROM public.saques WHERE status = 'pendente' AND data_hora >= v_inicio AND data_hora < v_fim;

    SELECT COUNT(*)::INT, COALESCE(SUM(valor), 0) INTO v_aprovado_count, v_aprovado_valor
    FROM public.saques WHERE status = 'aprovado' AND data_hora >= v_inicio AND data_hora < v_fim;

    SELECT COUNT(*)::INT, COALESCE(SUM(valor), 0) INTO v_rejeitado_count, v_rejeitado_valor
    FROM public.saques WHERE status = 'rejeitado' AND data_hora >= v_inicio AND data_hora < v_fim;

    SELECT COUNT(*)::INT, COALESCE(SUM(valor), 0) INTO v_falhou_count, v_falhou_valor
    FROM public.saques WHERE status = 'falhou' AND data_hora >= v_inicio AND data_hora < v_fim;

    SELECT COUNT(*)::INT, COALESCE(SUM(valor), 0) INTO v_revenue_count, v_revenue_valor
    FROM public.saques
    WHERE origem = 'revenue_share' AND status = 'aprovado'
      AND data_hora >= v_inicio AND data_hora < v_fim;
  END IF;

  RETURN json_build_object(
    'ok', true,
    'pendente_count', v_pendente_count,
    'pendente_valor', v_pendente_valor,
    'aprovado_count', v_aprovado_count,
    'aprovado_valor', v_aprovado_valor,
    'rejeitado_count', v_rejeitado_count,
    'rejeitado_valor', v_rejeitado_valor,
    'falhou_count', v_falhou_count,
    'falhou_valor', v_falhou_valor,
    'revenue_count', v_revenue_count,
    'revenue_valor', v_revenue_valor
  );
END;
$$;


--
-- Name: obter_stats_usuarios_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.obter_stats_usuarios_admin() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_total INT;
  v_depositantes INT;
  v_banca NUMERIC;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT COUNT(*)::INT INTO v_total FROM public.usuarios;

  SELECT COUNT(DISTINCT usuario_id)::INT
  INTO v_depositantes
  FROM public.depositos
  WHERE usuario_id IS NOT NULL;

  SELECT COALESCE(SUM(saldo), 0) INTO v_banca FROM public.usuarios;

  RETURN json_build_object(
    'total_usuarios', v_total,
    'total_depositantes', v_depositantes,
    'banca_total', v_banca
  );
END;
$$;


--
-- Name: obter_status_roleta(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.obter_status_roleta() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_uid UUID;
  v_config public.prize_wheel_config;
  v_giros_no_periodo INT;
  v_giros_cupom INT;
  v_giros_wheel INT;
  v_pode_girar BOOLEAN := false;
  v_proximo_em TIMESTAMPTZ;
  v_period_start TIMESTAMPTZ;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT * INTO v_config
  FROM public.prize_wheel_config
  WHERE id = 1 AND ativo = true;

  IF v_config.id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'wheel_disabled', 'pode_girar', false);
  END IF;

  IF v_config.cooldown_horas <= 0 THEN
    v_period_start := date_trunc(
      'day',
      timezone('America/Sao_Paulo', NOW())
    ) AT TIME ZONE 'America/Sao_Paulo';
  ELSE
    v_period_start := NOW() - (v_config.cooldown_horas || ' hours')::INTERVAL;
  END IF;

  SELECT COUNT(*)::INT INTO v_giros_cupom
  FROM public.cupom_usos
  WHERE usuario_id = v_uid
    AND origem = 'roleta'
    AND created_at >= v_period_start;

  SELECT COUNT(*)::INT INTO v_giros_wheel
  FROM public.prize_wheel_spins
  WHERE usuario_id = v_uid
    AND created_at >= v_period_start;

  v_giros_no_periodo := GREATEST(COALESCE(v_giros_cupom, 0), COALESCE(v_giros_wheel, 0));
  v_pode_girar := v_giros_no_periodo < v_config.giros_por_periodo;

  IF NOT v_pode_girar THEN
    IF v_config.cooldown_horas <= 0 THEN
      v_proximo_em := (
        date_trunc('day', timezone('America/Sao_Paulo', NOW())) + INTERVAL '1 day'
      ) AT TIME ZONE 'America/Sao_Paulo';
    ELSE
      SELECT MIN(created_at) + (v_config.cooldown_horas || ' hours')::INTERVAL
      INTO v_proximo_em
      FROM (
        SELECT created_at
        FROM public.cupom_usos
        WHERE usuario_id = v_uid
          AND origem = 'roleta'
          AND created_at >= v_period_start
        UNION ALL
        SELECT created_at
        FROM public.prize_wheel_spins
        WHERE usuario_id = v_uid
          AND created_at >= v_period_start
      ) recent;
    END IF;
  END IF;

  RETURN json_build_object(
    'ok', true,
    'pode_girar', v_pode_girar,
    'giros_por_periodo', v_config.giros_por_periodo,
    'cooldown_horas', v_config.cooldown_horas,
    'proximo_giro_em', v_proximo_em
  );
END;
$$;


--
-- Name: FUNCTION obter_status_roleta(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.obter_status_roleta() IS 'Verifica se o usuário pode girar a roleta no período atual';


--
-- Name: obter_veopag_config_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.obter_veopag_config_admin() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_row public.integration_secrets%ROWTYPE;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT * INTO v_row FROM public.integration_secrets WHERE id = 1;

  IF NOT FOUND THEN
    INSERT INTO public.integration_secrets (id) VALUES (1)
    ON CONFLICT (id) DO NOTHING;
    SELECT * INTO v_row FROM public.integration_secrets WHERE id = 1;
  END IF;

  RETURN json_build_object(
    'ok', true,
    'veopag_client_id', COALESCE(v_row.veopag_client_id, ''),
    'veopag_api_url', COALESCE(NULLIF(TRIM(v_row.veopag_api_url), ''), 'https://api.veopag.com'),
    'veopag_client_secret_configured', COALESCE(NULLIF(TRIM(v_row.veopag_client_secret), ''), '') <> '',
    'veopag_webhook_secret_configured', COALESCE(NULLIF(TRIM(v_row.veopag_webhook_secret), ''), '') <> '',
    'updated_at', v_row.updated_at
  );
END;
$$;


--
-- Name: obter_vip_usuario(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.obter_vip_usuario() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_uid uuid;
  v_nivel int;
  v_total numeric;
  v_nivel_info record;
  v_proximo record;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT vip_nivel, total_depositado INTO v_nivel, v_total FROM public.usuarios WHERE id = v_uid;
  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'user_not_found');
  END IF;

  v_nivel := COALESCE(v_nivel, 1);
  v_total := COALESCE(v_total, 0);

  SELECT nivel, nome, grupo, deposito_minimo, cashback_pct, bonus_upgrade, imagem_url, cor
  INTO v_nivel_info FROM public.vip_niveis WHERE nivel = v_nivel;

  SELECT nivel, nome, deposito_minimo INTO v_proximo FROM public.vip_niveis WHERE nivel = v_nivel + 1;

  RETURN json_build_object(
    'ok', true,
    'vip_nivel', v_nivel,
    'vip_nome', v_nivel_info.nome,
    'vip_grupo', v_nivel_info.grupo,
    'vip_imagem', v_nivel_info.imagem_url,
    'vip_cor', v_nivel_info.cor,
    'cashback_pct', COALESCE(v_nivel_info.cashback_pct, 0),
    'total_depositado', v_total,
    'deposito_minimo_atual', COALESCE(v_nivel_info.deposito_minimo, 0),
    'proximo_nivel', v_proximo.nivel,
    'proximo_nome', v_proximo.nome,
    'proximo_deposito_minimo', v_proximo.deposito_minimo,
    'falta_para_proximo', CASE WHEN v_proximo.nivel IS NULL THEN 0 ELSE GREATEST(v_proximo.deposito_minimo - v_total, 0) END,
    'progresso_pct', CASE
      WHEN v_proximo.nivel IS NULL THEN 100
      WHEN v_proximo.deposito_minimo <= COALESCE(v_nivel_info.deposito_minimo, 0) THEN 100
      ELSE LEAST(100, GREATEST(0,
        ((v_total - COALESCE(v_nivel_info.deposito_minimo, 0)) /
         NULLIF(v_proximo.deposito_minimo - COALESCE(v_nivel_info.deposito_minimo, 0), 0)) * 100
      ))
    END
  );
END;
$$;


--
-- Name: FUNCTION obter_vip_usuario(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.obter_vip_usuario() IS 'Retorna nível VIP, progresso e benefícios do usuário autenticado';


--
-- Name: processar_callback_playfiver(text, text, numeric, numeric, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.processar_callback_playfiver(p_email text, p_txn_id text, p_bet numeric, p_win numeric, p_jogo text DEFAULT NULL::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  v_email TEXT;
  v_txn TEXT;
  v_bet NUMERIC;
  v_win NUMERIC;
  v_usuario_id UUID;
  v_saldo NUMERIC;
  v_saldo_bonus NUMERIC;
  v_carteira TEXT;
  v_usa_bonus BOOLEAN;
  v_novo_saldo NUMERIC;
  v_novo_saldo_bonus NUMERIC;
  v_saldo_jogavel NUMERIC;
  v_inserted_id UUID;
  v_jogo TEXT;
  v_tipo TEXT;
  v_owner UUID;
  v_eh_giros_gratis BOOLEAN;
  v_com_bonus TEXT;
  v_com_bonus_aposta TEXT;
  v_saldo_antes NUMERIC;
  v_saldo_bonus_antes NUMERIC;
BEGIN
  v_email := lower(trim(COALESCE(p_email, '')));
  v_txn := trim(COALESCE(p_txn_id, ''));
  v_bet := ROUND(COALESCE(p_bet, 0)::numeric, 2);
  v_win := ROUND(COALESCE(p_win, 0)::numeric, 2);

  IF v_email = '' THEN
    RETURN json_build_object('ok', false, 'error', 'INVALID_USER', 'balance', 0);
  END IF;

  IF v_txn = '' THEN
    RETURN json_build_object('ok', false, 'error', 'INVALID_TXN', 'balance', 0);
  END IF;

  IF v_bet < 0 OR v_win < 0 THEN
    RETURN json_build_object('ok', false, 'error', 'INVALID_AMOUNT', 'balance', 0);
  END IF;

  SELECT id, COALESCE(saldo, 0), COALESCE(saldo_bonus, 0), COALESCE(carteira_ativa, 'real')
  INTO v_usuario_id, v_saldo, v_saldo_bonus, v_carteira
  FROM public.usuarios
  WHERE lower(trim(email)) = v_email
  LIMIT 1
  FOR UPDATE;

  IF v_usuario_id IS NULL THEN
    SELECT id, COALESCE(saldo, 0), COALESCE(saldo_bonus, 0), COALESCE(carteira_ativa, 'real')
    INTO v_usuario_id, v_saldo, v_saldo_bonus, v_carteira
    FROM public.usuarios
    WHERE email ILIKE v_email
    LIMIT 1
    FOR UPDATE;
  END IF;

  IF v_usuario_id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'INVALID_USER', 'balance', 0);
  END IF;

  v_saldo_antes := v_saldo;
  v_saldo_bonus_antes := v_saldo_bonus;
  v_usa_bonus := public._carteira_usa_bonus(v_carteira);
  v_com_bonus_aposta := NULL;

  -- PlayFivers costuma enviar ganho isolado (bet=0, win>0): herda carteira da aposta recente
  IF v_bet = 0 AND v_win > 0 THEN
    SELECT tj.com_bonus
    INTO v_com_bonus_aposta
    FROM public.transacoes_jogos tj
    WHERE tj.usuario_id = v_usuario_id
      AND COALESCE(tj.valor, 0) > 0
      AND tj.data >= (TIMEZONE('utc'::text, NOW()) - INTERVAL '20 minutes')
    ORDER BY tj.data DESC
    LIMIT 1;

    IF v_com_bonus_aposta = 'Sim' THEN
      v_usa_bonus := true;
      v_carteira := 'bonus';
    ELSIF v_com_bonus_aposta = 'Não' THEN
      v_usa_bonus := false;
      v_carteira := 'real';
    END IF;
  END IF;

  v_saldo_jogavel := public._saldo_jogavel_carteira(v_saldo, v_saldo_bonus, v_carteira);
  v_eh_giros_gratis := public._ganho_eh_de_giros_gratis(v_usuario_id, v_bet, v_win);

  IF v_bet = 0 AND v_win > 0 AND v_com_bonus_aposta IS NOT NULL THEN
    v_eh_giros_gratis := false;
  END IF;

  v_jogo := NULLIF(trim(COALESCE(p_jogo, '')), '');
  IF v_jogo IS NULL THEN
    v_jogo := 'Jogo';
  END IF;
  v_tipo := CASE WHEN v_win > 0 THEN 'Ganhou' ELSE 'Perdeu' END;

  v_com_bonus := CASE
    WHEN v_eh_giros_gratis OR v_usa_bonus THEN 'Sim'
    ELSE 'Não'
  END;

  INSERT INTO public.transacoes_jogos (
    usuario_id, txn_id, tipo, jogo, valor, retorno, status, com_bonus, data
  )
  VALUES (
    v_usuario_id,
    v_txn,
    v_tipo,
    v_jogo,
    v_bet,
    CASE WHEN v_win > 0 THEN v_win ELSE 0 END,
    'Finalizado',
    v_com_bonus,
    TIMEZONE('utc'::text, NOW())
  )
  ON CONFLICT (txn_id) DO NOTHING
  RETURNING id INTO v_inserted_id;

  IF v_inserted_id IS NULL THEN
    SELECT usuario_id INTO v_owner
    FROM public.transacoes_jogos
    WHERE txn_id = v_txn
    LIMIT 1;

    IF v_owner IS DISTINCT FROM v_usuario_id THEN
      RETURN json_build_object(
        'ok', false,
        'error', 'TXN_OWNER_MISMATCH',
        'balance', v_saldo_jogavel
      );
    END IF;

    SELECT COALESCE(saldo, 0), COALESCE(saldo_bonus, 0), COALESCE(carteira_ativa, 'real')
    INTO v_saldo, v_saldo_bonus, v_carteira
    FROM public.usuarios
    WHERE id = v_usuario_id;

    RETURN json_build_object(
      'ok', true,
      'duplicate', true,
      'balance', public._saldo_jogavel_carteira(v_saldo, v_saldo_bonus, v_carteira),
      'usuario_id', v_usuario_id
    );
  END IF;

  -- Ganhos de rodadas grátis (bet=0) sempre vão para B$
  IF v_eh_giros_gratis AND v_win > 0 THEN
    v_novo_saldo := ROUND(v_saldo, 2);
    v_novo_saldo_bonus := ROUND(v_saldo_bonus + v_win, 2);

    PERFORM set_config('app.skip_usuario_guard', 'true', true);

    UPDATE public.usuarios
    SET saldo_bonus = v_novo_saldo_bonus,
        updated_at = NOW()
    WHERE id = v_usuario_id;

    PERFORM public.aplicar_rollover_bonus_giro(v_usuario_id, v_win);

    RETURN json_build_object(
      'ok', true,
      'duplicate', false,
      'balance', public._saldo_jogavel_carteira(v_novo_saldo, v_novo_saldo_bonus, v_carteira),
      'saldo_bonus', v_novo_saldo_bonus,
      'bonus_credit', true,
      'eh_giros_gratis', true,
      'carteira_ativa', v_carteira,
      'carteira_aposta', 'bonus',
      'saldo_anterior', v_saldo_jogavel,
      'saldo_antes', v_saldo_antes,
      'saldo_bonus_antes', v_saldo_bonus_antes,
      'saldo', v_novo_saldo,
      'usuario_id', v_usuario_id,
      'transacao_id', v_inserted_id
    );
  END IF;

  IF v_bet = 0 AND v_win = 0 THEN
    RETURN json_build_object(
      'ok', true,
      'duplicate', false,
      'balance', v_saldo_jogavel,
      'carteira_ativa', v_carteira,
      'usuario_id', v_usuario_id,
      'transacao_id', v_inserted_id
    );
  END IF;

  v_novo_saldo := v_saldo;
  v_novo_saldo_bonus := v_saldo_bonus;

  IF v_usa_bonus THEN
    IF v_saldo_bonus + 0.000001 < v_bet THEN
      RAISE EXCEPTION 'INSUFFICIENT_USER_FUNDS' USING ERRCODE = 'P0001';
    END IF;
    v_novo_saldo_bonus := ROUND(v_saldo_bonus + v_win - v_bet, 2);
  ELSE
    IF v_saldo + 0.000001 < GREATEST(0, ROUND(v_bet - v_win, 2)) AND ROUND(v_saldo + v_win - v_bet, 2) < 0 THEN
      RAISE EXCEPTION 'INSUFFICIENT_USER_FUNDS' USING ERRCODE = 'P0001';
    END IF;
    v_novo_saldo := ROUND(v_saldo + v_win - v_bet, 2);
    IF v_novo_saldo < -0.000001 THEN
      RAISE EXCEPTION 'INSUFFICIENT_USER_FUNDS' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF v_novo_saldo_bonus < -0.000001 THEN
    RAISE EXCEPTION 'INSUFFICIENT_USER_FUNDS' USING ERRCODE = 'P0001';
  END IF;

  PERFORM set_config('app.skip_usuario_guard', 'true', true);

  UPDATE public.usuarios
  SET saldo = v_novo_saldo,
      saldo_bonus = v_novo_saldo_bonus,
      updated_at = NOW()
  WHERE id = v_usuario_id;

  RETURN json_build_object(
    'ok', true,
    'duplicate', false,
    'balance', public._saldo_jogavel_carteira(v_novo_saldo, v_novo_saldo_bonus, v_carteira),
    'saldo', v_novo_saldo,
    'saldo_bonus', v_novo_saldo_bonus,
    'carteira_ativa', v_carteira,
    'carteira_aposta', CASE WHEN v_usa_bonus THEN 'bonus' ELSE 'real' END,
    'eh_giros_gratis', false,
    'bonus_credit', false,
    'herdou_carteira_aposta', v_com_bonus_aposta,
    'saldo_anterior', v_saldo_jogavel,
    'saldo_antes', v_saldo_antes,
    'saldo_bonus_antes', v_saldo_bonus_antes,
    'usuario_id', v_usuario_id,
    'transacao_id', v_inserted_id
  );
EXCEPTION
  WHEN raise_exception THEN
    IF SQLERRM = 'INSUFFICIENT_USER_FUNDS' THEN
      RETURN json_build_object(
        'ok', false,
        'error', 'INSUFFICIENT_USER_FUNDS',
        'balance', public._saldo_jogavel_carteira(
          COALESCE(v_saldo, 0),
          COALESCE(v_saldo_bonus, 0),
          COALESCE(v_carteira, 'real')
        )
      );
    END IF;
    RAISE;
END;
$_$;


--
-- Name: FUNCTION processar_callback_playfiver(p_email text, p_txn_id text, p_bet numeric, p_win numeric, p_jogo text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.processar_callback_playfiver(p_email text, p_txn_id text, p_bet numeric, p_win numeric, p_jogo text) IS 'PlayFivers: usa carteira_ativa (real=saldo, bonus=saldo_bonus). Rodadas grátis creditam B$.';


--
-- Name: processar_recompensa_indicacao(uuid, uuid, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.processar_recompensa_indicacao(p_usuario_indicado_id uuid, p_deposito_id uuid, p_valor_deposito numeric) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_indicado_por TEXT;
  v_ja_paga BOOLEAN;
  v_recompensa NUMERIC;
  v_deposito_min NUMERIC;
  v_global_recompensa NUMERIC;
  v_global_deposito_min NUMERIC;
  v_referrer_id UUID;
  v_aprovados INT;
BEGIN
  IF p_usuario_indicado_id IS NULL THEN
    RETURN json_build_object('ok', true, 'aplicada', false, 'motivo', 'usuario_invalido');
  END IF;

  SELECT u.indicado_por, COALESCE(u.indicacao_recompensa_paga, false)
  INTO v_indicado_por, v_ja_paga
  FROM public.usuarios u
  WHERE u.id = p_usuario_indicado_id;

  IF NOT FOUND OR v_indicado_por IS NULL OR TRIM(v_indicado_por) = '' OR v_ja_paga THEN
    RETURN json_build_object('ok', true, 'aplicada', false);
  END IF;

  SELECT
    COALESCE(sc.indicacao_recompensa, 0),
    COALESCE(sc.indicacao_deposito_minimo, 50)
  INTO v_global_recompensa, v_global_deposito_min
  FROM public.site_config sc
  WHERE sc.id = 1;

  v_global_recompensa := COALESCE(v_global_recompensa, 0);
  v_global_deposito_min := COALESCE(v_global_deposito_min, 0);

  SELECT u.id
  INTO v_referrer_id
  FROM public.usuarios u
  WHERE u.link_indicação = v_indicado_por
  LIMIT 1;

  IF v_referrer_id IS NULL OR v_referrer_id = p_usuario_indicado_id THEN
    RETURN json_build_object('ok', true, 'aplicada', false, 'motivo', 'indicador_invalido');
  END IF;

  SELECT
    COALESCE(u.indicacao_recompensa_custom, v_global_recompensa),
    COALESCE(u.indicacao_deposito_minimo_custom, v_global_deposito_min)
  INTO v_recompensa, v_deposito_min
  FROM public.usuarios u
  WHERE u.id = v_referrer_id;

  v_recompensa := COALESCE(v_recompensa, 0);
  v_deposito_min := COALESCE(v_deposito_min, 0);

  IF v_recompensa <= 0 THEN
    RETURN json_build_object('ok', true, 'aplicada', false, 'motivo', 'desativada');
  END IF;

  SELECT COUNT(*)::INT
  INTO v_aprovados
  FROM public.depositos d
  WHERE d.usuario_id = p_usuario_indicado_id
    AND d.status = 'aprovado';

  IF COALESCE(v_aprovados, 0) != 1 THEN
    RETURN json_build_object('ok', true, 'aplicada', false, 'motivo', 'nao_primeiro_deposito');
  END IF;

  IF COALESCE(p_valor_deposito, 0) < v_deposito_min THEN
    RETURN json_build_object('ok', true, 'aplicada', false, 'motivo', 'deposito_insuficiente');
  END IF;

  UPDATE public.usuarios
  SET saldo = COALESCE(saldo, 0) + v_recompensa
  WHERE id = v_referrer_id;

  UPDATE public.usuarios
  SET
    indicacao_recompensa_paga = true,
    indicacao_recompensa_valor_pago = v_recompensa
  WHERE id = p_usuario_indicado_id;

  RETURN json_build_object(
    'ok', true,
    'aplicada', true,
    'indicador_id', v_referrer_id,
    'valor', v_recompensa,
    'deposito_id', p_deposito_id
  );
END;
$$;


--
-- Name: processar_vip_deposito(uuid, uuid, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.processar_vip_deposito(p_usuario_id uuid, p_deposito_id uuid, p_valor numeric) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_nivel_anterior int;
  v_nivel_novo int;
  v_total numeric;
  v_bonus numeric := 0;
  v_subiu boolean := false;
  v_nivel_info record;
  v_proximo record;
BEGIN
  SELECT vip_nivel, total_depositado
  INTO v_nivel_anterior, v_total
  FROM public.usuarios
  WHERE id = p_usuario_id
  FOR UPDATE;

  v_total := COALESCE(v_total, 0) + p_valor;
  v_nivel_novo := public.calcular_vip_nivel(v_total);

  IF v_nivel_novo > COALESCE(v_nivel_anterior, 1) THEN
    v_subiu := true;
    SELECT bonus_upgrade INTO v_bonus FROM public.vip_niveis WHERE nivel = v_nivel_novo;
    v_bonus := COALESCE(v_bonus, 0);

    INSERT INTO public.vip_historico (
      usuario_id, nivel_anterior, nivel_novo, deposito_id, total_depositado, bonus_creditado
    ) VALUES (
      p_usuario_id, COALESCE(v_nivel_anterior, 1), v_nivel_novo, p_deposito_id, v_total, v_bonus
    );

    UPDATE public.usuarios
    SET total_depositado = v_total, vip_nivel = v_nivel_novo, vip_atualizado_em = NOW(), saldo = saldo + v_bonus
    WHERE id = p_usuario_id;
  ELSE
    UPDATE public.usuarios
    SET total_depositado = v_total, vip_nivel = v_nivel_novo, vip_atualizado_em = NOW()
    WHERE id = p_usuario_id;
  END IF;

  SELECT nivel, nome, grupo, deposito_minimo, cashback_pct, bonus_upgrade, imagem_url, cor
  INTO v_nivel_info FROM public.vip_niveis WHERE nivel = v_nivel_novo;

  SELECT nivel, nome, deposito_minimo INTO v_proximo FROM public.vip_niveis WHERE nivel = v_nivel_novo + 1;

  RETURN json_build_object(
    'vip_nivel', v_nivel_novo,
    'vip_nome', v_nivel_info.nome,
    'vip_grupo', v_nivel_info.grupo,
    'vip_imagem', v_nivel_info.imagem_url,
    'vip_cor', v_nivel_info.cor,
    'cashback_pct', v_nivel_info.cashback_pct,
    'total_depositado', v_total,
    'subiu_nivel', v_subiu,
    'nivel_anterior', COALESCE(v_nivel_anterior, 1),
    'bonus_upgrade', CASE WHEN v_subiu THEN v_bonus ELSE 0 END,
    'proximo_nivel', v_proximo.nivel,
    'proximo_nome', v_proximo.nome,
    'proximo_deposito_minimo', v_proximo.deposito_minimo,
    'falta_para_proximo', CASE WHEN v_proximo.nivel IS NULL THEN 0 ELSE GREATEST(v_proximo.deposito_minimo - v_total, 0) END
  );
END;
$$;


--
-- Name: protect_usuario_sensitive_columns(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.protect_usuario_sensitive_columns() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF current_setting('app.skip_usuario_guard', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
    RETURN NEW;
  END IF;

  IF NEW.saldo IS DISTINCT FROM OLD.saldo THEN
    RAISE EXCEPTION 'Alteracao de saldo nao permitida';
  END IF;

  IF NEW.saldo_bonus IS DISTINCT FROM OLD.saldo_bonus THEN
    RAISE EXCEPTION 'Alteracao de saldo bonus nao permitida';
  END IF;

  IF NEW.carteira_ativa IS DISTINCT FROM OLD.carteira_ativa THEN
    RAISE EXCEPTION 'Alteracao de carteira ativa nao permitida';
  END IF;

  IF NEW.cargo IS DISTINCT FROM OLD.cargo THEN
    RAISE EXCEPTION 'Alteracao de cargo nao permitida';
  END IF;

  IF NEW.vip_nivel IS DISTINCT FROM OLD.vip_nivel THEN
    RAISE EXCEPTION 'Alteracao de VIP nao permitida';
  END IF;

  IF NEW.total_depositado IS DISTINCT FROM OLD.total_depositado THEN
    RAISE EXCEPTION 'Alteracao de total depositado nao permitida';
  END IF;

  IF NEW.two_factor_enabled IS DISTINCT FROM OLD.two_factor_enabled THEN
    RAISE EXCEPTION 'Alteracao de 2FA nao permitida';
  END IF;

  IF NEW.totp_secret IS DISTINCT FROM OLD.totp_secret THEN
    RAISE EXCEPTION 'Alteracao de 2FA nao permitida';
  END IF;

  IF NEW.totp_pending_secret IS DISTINCT FROM OLD.totp_pending_secret THEN
    RAISE EXCEPTION 'Alteracao de 2FA nao permitida';
  END IF;

  IF NEW.rollover_pendente IS DISTINCT FROM OLD.rollover_pendente THEN
    RAISE EXCEPTION 'Alteracao de rollover nao permitida';
  END IF;

  IF NEW.rollover_meta IS DISTINCT FROM OLD.rollover_meta THEN
    RAISE EXCEPTION 'Alteracao de rollover nao permitida';
  END IF;

  IF NEW.rollover_inicio IS DISTINCT FROM OLD.rollover_inicio THEN
    RAISE EXCEPTION 'Alteracao de rollover nao permitida';
  END IF;

  IF NEW.rollover_bonus_pendente IS DISTINCT FROM OLD.rollover_bonus_pendente THEN
    RAISE EXCEPTION 'Alteracao de rollover bonus nao permitida';
  END IF;

  IF NEW.indicacao_recompensa_custom IS DISTINCT FROM OLD.indicacao_recompensa_custom THEN
    RAISE EXCEPTION 'Alteracao de indicacao nao permitida';
  END IF;

  IF NEW.indicacao_deposito_minimo_custom IS DISTINCT FROM OLD.indicacao_deposito_minimo_custom THEN
    RAISE EXCEPTION 'Alteracao de indicacao nao permitida';
  END IF;

  IF NEW.indicacao_recompensa_paga IS DISTINCT FROM OLD.indicacao_recompensa_paga THEN
    RAISE EXCEPTION 'Alteracao de indicacao nao permitida';
  END IF;

  IF NEW.indicacao_recompensa_valor_pago IS DISTINCT FROM OLD.indicacao_recompensa_valor_pago THEN
    RAISE EXCEPTION 'Alteracao de indicacao nao permitida';
  END IF;

  IF NEW.indicado_por IS DISTINCT FROM OLD.indicado_por THEN
    RAISE EXCEPTION 'Alteracao de indicacao nao permitida';
  END IF;

  IF NEW.link_indicação IS DISTINCT FROM OLD.link_indicação THEN
    RAISE EXCEPTION 'Alteracao de link de indicacao nao permitida';
  END IF;

  IF NEW.ativo IS DISTINCT FROM OLD.ativo THEN
    RAISE EXCEPTION 'Alteracao de status nao permitida';
  END IF;

  IF NEW.verificado IS DISTINCT FROM OLD.verificado THEN
    RAISE EXCEPTION 'Alteracao de verificacao nao permitida';
  END IF;

  IF NEW.kyc_status IS DISTINCT FROM OLD.kyc_status THEN
    RAISE EXCEPTION 'Alteracao de KYC nao permitida';
  END IF;

  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Alteracao de email nao permitida';
  END IF;

  IF NEW.cpf IS DISTINCT FROM OLD.cpf THEN
    RAISE EXCEPTION 'Alteracao de CPF nao permitida';
  END IF;

  IF NEW.playfiver_user_code IS DISTINCT FROM OLD.playfiver_user_code THEN
    RAISE EXCEPTION 'Alteracao de codigo de jogo nao permitida';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION protect_usuario_sensitive_columns(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.protect_usuario_sensitive_columns() IS 'Bloqueia UPDATE sensivel para clientes. Bypass: app.skip_usuario_guard ou roles postgres/supabase_admin/service_role.';


--
-- Name: registrar_admin_log(text, text, text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.registrar_admin_log(p_acao text, p_detalhes text DEFAULT NULL::text, p_status text DEFAULT 'sucesso'::text, p_categoria text DEFAULT 'sistema'::text, p_metadata jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: remover_membro_equipe(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.remover_membro_equipe(p_usuario_id uuid) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: reprovar_pendentes_saques_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.reprovar_pendentes_saques_admin() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: rls_auto_enable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


--
-- Name: salvar_bspay_config_admin(text, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.salvar_bspay_config_admin(p_bspay_client_id text DEFAULT NULL::text, p_bspay_client_secret text DEFAULT NULL::text, p_bspay_signing_key text DEFAULT NULL::text, p_bspay_webhook_secret text DEFAULT NULL::text, p_bspay_api_url text DEFAULT NULL::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_row public.integration_secrets%ROWTYPE;
  v_client_id TEXT;
  v_client_secret TEXT;
  v_signing_key TEXT;
  v_webhook TEXT;
  v_api_url TEXT;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT * INTO v_row FROM public.integration_secrets WHERE id = 1;

  IF NOT FOUND THEN
    INSERT INTO public.integration_secrets (id) VALUES (1)
    ON CONFLICT (id) DO NOTHING;
    SELECT * INTO v_row FROM public.integration_secrets WHERE id = 1;
  END IF;

  v_client_id := COALESCE(NULLIF(TRIM(p_bspay_client_id), ''), NULLIF(TRIM(v_row.bspay_client_id), ''), '');
  v_client_secret := CASE
    WHEN p_bspay_client_secret IS NULL OR TRIM(p_bspay_client_secret) = '' THEN COALESCE(v_row.bspay_client_secret, '')
    ELSE TRIM(p_bspay_client_secret)
  END;
  v_signing_key := CASE
    WHEN p_bspay_signing_key IS NULL OR TRIM(p_bspay_signing_key) = '' THEN COALESCE(v_row.bspay_signing_key, '')
    ELSE TRIM(p_bspay_signing_key)
  END;
  v_webhook := CASE
    WHEN p_bspay_webhook_secret IS NULL OR TRIM(p_bspay_webhook_secret) = '' THEN COALESCE(v_row.bspay_webhook_secret, '')
    ELSE TRIM(p_bspay_webhook_secret)
  END;
  v_api_url := COALESCE(
    NULLIF(TRIM(p_bspay_api_url), ''),
    NULLIF(TRIM(v_row.bspay_api_url), ''),
    'https://api.bspay.co'
  );

  IF v_client_id = '' OR v_client_secret = '' OR v_signing_key = '' THEN
    RETURN json_build_object(
      'ok', false,
      'error', 'Client ID, Client Secret e Signing Key (HMAC) são obrigatórios.'
    );
  END IF;

  UPDATE public.integration_secrets
  SET
    bspay_client_id = v_client_id,
    bspay_client_secret = v_client_secret,
    bspay_signing_key = v_signing_key,
    bspay_webhook_secret = v_webhook,
    bspay_api_url = v_api_url,
    updated_at = NOW()
  WHERE id = 1;

  RETURN json_build_object(
    'ok', true,
    'bspay_client_id', v_client_id,
    'bspay_api_url', v_api_url,
    'bspay_client_secret_configured', true,
    'bspay_signing_key_configured', true,
    'bspay_webhook_secret_configured', v_webhook <> ''
  );
END;
$$;


--
-- Name: salvar_misticpay_config_admin(text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.salvar_misticpay_config_admin(p_misticpay_ci text DEFAULT NULL::text, p_misticpay_cs text DEFAULT NULL::text, p_misticpay_api_url text DEFAULT NULL::text, p_misticpay_webhook_secret text DEFAULT NULL::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_row public.integration_secrets%ROWTYPE;
  v_ci TEXT;
  v_cs TEXT;
  v_api_url TEXT;
  v_webhook TEXT;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT * INTO v_row FROM public.integration_secrets WHERE id = 1;

  IF NOT FOUND THEN
    INSERT INTO public.integration_secrets (id) VALUES (1)
    ON CONFLICT (id) DO NOTHING;
    SELECT * INTO v_row FROM public.integration_secrets WHERE id = 1;
  END IF;

  v_ci := COALESCE(NULLIF(TRIM(p_misticpay_ci), ''), NULLIF(TRIM(v_row.misticpay_ci), ''), '');
  v_cs := CASE
    WHEN p_misticpay_cs IS NULL OR TRIM(p_misticpay_cs) = '' THEN COALESCE(v_row.misticpay_cs, '')
    ELSE TRIM(p_misticpay_cs)
  END;
  v_api_url := COALESCE(
    NULLIF(TRIM(p_misticpay_api_url), ''),
    NULLIF(TRIM(v_row.misticpay_api_url), ''),
    'https://api.misticpay.com/api'
  );
  v_webhook := CASE
    WHEN p_misticpay_webhook_secret IS NULL OR TRIM(p_misticpay_webhook_secret) = '' THEN COALESCE(v_row.misticpay_webhook_secret, '')
    ELSE TRIM(p_misticpay_webhook_secret)
  END;

  IF v_ci = '' OR v_cs = '' THEN
    RETURN json_build_object('ok', false, 'error', 'Client ID (CI) e Client Secret (CS) são obrigatórios.');
  END IF;

  UPDATE public.integration_secrets
  SET
    misticpay_ci = v_ci,
    misticpay_cs = v_cs,
    misticpay_api_url = v_api_url,
    misticpay_webhook_secret = v_webhook,
    updated_at = NOW()
  WHERE id = 1;

  RETURN json_build_object(
    'ok', true,
    'misticpay_ci', v_ci,
    'misticpay_api_url', v_api_url,
    'misticpay_cs_configured', true,
    'misticpay_webhook_secret_configured', v_webhook <> ''
  );
END;
$$;


--
-- Name: salvar_payment_gateway_admin(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.salvar_payment_gateway_admin(p_payment_gateway_deposit text, p_payment_gateway_withdraw text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_deposit TEXT;
  v_withdraw TEXT;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  v_deposit := LOWER(TRIM(COALESCE(p_payment_gateway_deposit, '')));
  v_withdraw := LOWER(TRIM(COALESCE(p_payment_gateway_withdraw, '')));

  IF v_deposit NOT IN ('misticpay', 'bspay', 'veopag') THEN
    RETURN json_build_object('ok', false, 'error', 'Gateway de depósito inválido.');
  END IF;

  IF v_withdraw NOT IN ('misticpay', 'bspay', 'veopag') THEN
    RETURN json_build_object('ok', false, 'error', 'Gateway de saque inválido.');
  END IF;

  INSERT INTO public.integration_secrets (id, payment_gateway, payment_gateway_deposit, payment_gateway_withdraw)
  VALUES (1, v_deposit, v_deposit, v_withdraw)
  ON CONFLICT (id) DO UPDATE
  SET
    payment_gateway = EXCLUDED.payment_gateway_deposit,
    payment_gateway_deposit = EXCLUDED.payment_gateway_deposit,
    payment_gateway_withdraw = EXCLUDED.payment_gateway_withdraw,
    updated_at = NOW();

  RETURN json_build_object(
    'ok', true,
    'payment_gateway', v_deposit,
    'payment_gateway_deposit', v_deposit,
    'payment_gateway_withdraw', v_withdraw
  );
END;
$$;


--
-- Name: salvar_veopag_config_admin(text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.salvar_veopag_config_admin(p_veopag_client_id text DEFAULT NULL::text, p_veopag_client_secret text DEFAULT NULL::text, p_veopag_webhook_secret text DEFAULT NULL::text, p_veopag_api_url text DEFAULT NULL::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_row public.integration_secrets%ROWTYPE;
  v_client_id TEXT;
  v_client_secret TEXT;
  v_webhook TEXT;
  v_api_url TEXT;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT * INTO v_row FROM public.integration_secrets WHERE id = 1;

  IF NOT FOUND THEN
    INSERT INTO public.integration_secrets (id) VALUES (1)
    ON CONFLICT (id) DO NOTHING;
    SELECT * INTO v_row FROM public.integration_secrets WHERE id = 1;
  END IF;

  v_client_id := COALESCE(NULLIF(TRIM(p_veopag_client_id), ''), NULLIF(TRIM(v_row.veopag_client_id), ''), '');
  v_client_secret := CASE
    WHEN p_veopag_client_secret IS NULL OR TRIM(p_veopag_client_secret) = '' THEN COALESCE(v_row.veopag_client_secret, '')
    ELSE TRIM(p_veopag_client_secret)
  END;
  v_webhook := CASE
    WHEN p_veopag_webhook_secret IS NULL OR TRIM(p_veopag_webhook_secret) = '' THEN COALESCE(v_row.veopag_webhook_secret, '')
    ELSE TRIM(p_veopag_webhook_secret)
  END;
  v_api_url := COALESCE(
    NULLIF(TRIM(p_veopag_api_url), ''),
    NULLIF(TRIM(v_row.veopag_api_url), ''),
    'https://api.veopag.com'
  );

  IF v_client_id = '' OR v_client_secret = '' THEN
    RETURN json_build_object('ok', false, 'error', 'Client ID e Client Secret são obrigatórios.');
  END IF;

  UPDATE public.integration_secrets
  SET
    veopag_client_id = v_client_id,
    veopag_client_secret = v_client_secret,
    veopag_webhook_secret = v_webhook,
    veopag_api_url = v_api_url,
    updated_at = NOW()
  WHERE id = 1;

  RETURN json_build_object(
    'ok', true,
    'veopag_client_id', v_client_id,
    'veopag_api_url', v_api_url,
    'veopag_client_secret_configured', true,
    'veopag_webhook_secret_configured', v_webhook <> ''
  );
END;
$$;


--
-- Name: solicitar_saque(numeric, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.solicitar_saque(p_valor numeric, p_key text, p_chave text, p_origem text DEFAULT 'pix'::text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  v_uid UUID;
  v_saldo NUMERIC;
  v_rollover NUMERIC;
  v_min NUMERIC;
  v_max NUMERIC;
  v_limite_dia INT;
  v_count_dia INT;
  v_key TEXT;
  v_chave TEXT;
  v_origem TEXT;
  v_saque_id UUID;
  v_novo_saldo NUMERIC;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  v_key := lower(trim(COALESCE(p_key, '')));
  v_chave := trim(COALESCE(p_chave, ''));
  v_origem := lower(trim(COALESCE(p_origem, 'pix')));

  IF v_origem IS DISTINCT FROM 'pix' THEN
    RETURN json_build_object('success', false, 'error', 'origem_invalida');
  END IF;

  IF v_key NOT IN ('email', 'cpf', 'cnpj', 'telefone', 'chave aleatória') THEN
    RETURN json_build_object('success', false, 'error', 'tipo_chave_invalido');
  END IF;

  IF v_chave = '' THEN
    RETURN json_build_object('success', false, 'error', 'chave_obrigatoria');
  END IF;

  IF p_valor IS NULL OR p_valor <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'valor_invalido');
  END IF;

  SELECT COALESCE(saque_minimo, 50), COALESCE(saque_maximo, 1000000), COALESCE(saques_diarios_permitidos, 1)
  INTO v_min, v_max, v_limite_dia
  FROM public.site_config
  WHERE id = 1;

  v_min := COALESCE(v_min, 50);
  v_max := COALESCE(v_max, 1000000);
  v_limite_dia := COALESCE(v_limite_dia, 1);

  IF p_valor < v_min THEN
    RETURN json_build_object('success', false, 'error', format('Valor mínimo de saque: R$ %s', v_min));
  END IF;

  IF p_valor > v_max THEN
    RETURN json_build_object('success', false, 'error', format('Valor máximo de saque: R$ %s', v_max));
  END IF;

  SELECT COUNT(*)::INT
  INTO v_count_dia
  FROM public.saques
  WHERE usuario_id = v_uid
    AND (data_hora AT TIME ZONE 'America/Sao_Paulo')::date =
        (NOW() AT TIME ZONE 'America/Sao_Paulo')::date;

  IF v_count_dia >= v_limite_dia THEN
    RETURN json_build_object(
      'success', false,
      'error', format('Limite diário de saques atingido. Máximo de %s saque(s) por dia.', v_limite_dia)
    );
  END IF;

  SELECT COALESCE(saldo, 0), COALESCE(rollover_pendente, 0)
  INTO v_saldo, v_rollover
  FROM public.usuarios
  WHERE id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  IF v_rollover > 0.009 THEN
    RETURN json_build_object(
      'success', false,
      'error', format(
        'Rollover pendente: aposte mais R$ %s antes de sacar.',
        trim(to_char(v_rollover, 'FM999G999G990D00'))
      )
    );
  END IF;

  IF v_saldo < p_valor THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Saldo insuficiente',
      'saldo_atual', v_saldo
    );
  END IF;

  v_novo_saldo := round((v_saldo - p_valor)::numeric, 2);

  PERFORM set_config('app.skip_usuario_guard', 'true', true);

  UPDATE public.usuarios
  SET saldo = v_novo_saldo
  WHERE id = v_uid;

  INSERT INTO public.saques (
    usuario_id,
    valor,
    status,
    key,
    chave,
    origem,
    saldo_debitado,
    saldo_reembolsado
  )
  VALUES (
    v_uid,
    p_valor,
    'pendente',
    v_key,
    v_chave,
    'pix',
    true,
    false
  )
  RETURNING id INTO v_saque_id;

  RETURN json_build_object(
    'success', true,
    'saque_id', v_saque_id,
    'saldo_anterior', v_saldo,
    'saldo_atual', v_novo_saldo,
    'valor_saque', p_valor
  );
END;
$_$;


--
-- Name: FUNCTION solicitar_saque(p_valor numeric, p_key text, p_chave text, p_origem text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.solicitar_saque(p_valor numeric, p_key text, p_chave text, p_origem text) IS 'Cria saque pendente e debita saldo na mesma transação. Único caminho permitido para usuários.';


--
-- Name: subtrair_saldo_saque(uuid, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.subtrair_saldo_saque(p_usuario_id uuid, p_valor_saque numeric) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF current_user NOT IN ('postgres', 'supabase_admin', 'service_role') THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;

  RETURN json_build_object(
    'success', false,
    'error', 'deprecated_use_solicitar_saque'
  );
END;
$$;


--
-- Name: FUNCTION subtrair_saldo_saque(p_usuario_id uuid, p_valor_saque numeric); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.subtrair_saldo_saque(p_usuario_id uuid, p_valor_saque numeric) IS 'Deprecated. Use solicitar_saque. Bloqueado para clientes.';


--
-- Name: sync_carteira_ativa_launch(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_carteira_ativa_launch(p_user_id uuid, p_carteira text) RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_carteira TEXT;
  v_saldo DECIMAL(10, 2);
  v_saldo_bonus DECIMAL(10, 2);
BEGIN
  v_carteira := lower(trim(COALESCE(p_carteira, '')));
  IF v_carteira NOT IN ('real', 'bonus') THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_wallet');
  END IF;

  PERFORM set_config('app.skip_usuario_guard', 'true', true);

  UPDATE public.usuarios
  SET carteira_ativa = v_carteira,
      updated_at = NOW()
  WHERE id = p_user_id
  RETURNING saldo, saldo_bonus, carteira_ativa
  INTO v_saldo, v_saldo_bonus, v_carteira;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'user_not_found');
  END IF;

  RETURN json_build_object(
    'ok', true,
    'carteira_ativa', v_carteira,
    'saldo', COALESCE(v_saldo, 0),
    'saldo_bonus', COALESCE(v_saldo_bonus, 0)
  );
END;
$$;


--
-- Name: trg_admin_audit_log(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_admin_audit_log() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: trg_cupom_uso_giros_ativado(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_cupom_uso_giros_ativado() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.status_giro = 'usado'
     AND (OLD.status_giro IS NULL OR OLD.status_giro IS DISTINCT FROM 'usado') THEN
    NEW.giros_ativado_em := COALESCE(NEW.giros_ativado_em, TIMEZONE('utc'::text, NOW()));
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: trim_aviator_velas(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trim_aviator_velas() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  removed_round_ids UUID[];
  excess INTEGER;
BEGIN
  SELECT GREATEST(0, COUNT(*) - 27) INTO excess FROM public.aviator_velas;
  IF excess <= 0 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT ARRAY_AGG(DISTINCT round_id) FILTER (WHERE round_id IS NOT NULL)
  INTO removed_round_ids
  FROM (
    SELECT round_id
    FROM public.aviator_velas
    ORDER BY created_at ASC, id ASC
    LIMIT excess
  ) old_velas;

  DELETE FROM public.aviator_velas
  WHERE id IN (
    SELECT id
    FROM public.aviator_velas
    ORDER BY created_at ASC, id ASC
    LIMIT excess
  );

  IF removed_round_ids IS NOT NULL AND array_length(removed_round_ids, 1) > 0 THEN
    DELETE FROM public.aviator_bets WHERE round_id = ANY(removed_round_ids);
    DELETE FROM public.aviator_rounds WHERE id = ANY(removed_round_ids);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: validar_cupom(text, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validar_cupom(p_codigo text, p_valor_deposito numeric DEFAULT NULL::numeric) RETURNS json
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_uid UUID;
  v_cupom public.cupons;
  v_limites JSON;
  v_bonus NUMERIC;
  v_requer_deposito BOOLEAN;
  v_giros_validacao JSON;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  IF p_codigo IS NULL OR TRIM(p_codigo) = '' THEN
    RETURN json_build_object('ok', false, 'error', 'empty_code');
  END IF;

  v_cupom := public._buscar_cupom_ativo(p_codigo);

  IF v_cupom.id IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_coupon');
  END IF;

  v_giros_validacao := public._validar_cupom_giros(v_cupom);
  IF NOT (v_giros_validacao->>'ok')::BOOLEAN THEN
    RETURN json_build_object('ok', false, 'error', v_giros_validacao->>'error');
  END IF;

  v_limites := public._validar_limites_cupom(v_cupom, v_uid);
  IF NOT (v_limites->>'ok')::BOOLEAN THEN
    RETURN v_limites;
  END IF;

  IF v_cupom.tipo_bonus = 'giros_gratis' THEN
    v_requer_deposito := COALESCE(v_cupom.deposito_minimo, 0) > 0;

    IF v_requer_deposito THEN
      IF p_valor_deposito IS NULL OR p_valor_deposito <= 0 THEN
        RETURN json_build_object(
          'ok', true,
          'codigo', v_cupom.codigo,
          'tipo_valor', v_cupom.tipo_valor,
          'valor', v_cupom.valor,
          'tipo_bonus', v_cupom.tipo_bonus,
          'deposito_minimo', COALESCE(v_cupom.deposito_minimo, 0),
          'bonus_maximo', v_cupom.bonus_maximo,
          'requer_deposito', true,
          'quantidade_giros', TRUNC(v_cupom.valor)::INT,
          'jogo_slug', v_cupom.jogo_slug,
          'jogo_nome', v_cupom.jogo_nome,
          'provider_slug', v_cupom.provider_slug,
          'bonus_calculado', NULL,
          'mensagem', 'Este cupom de rodadas deve ser usado durante um depósito.'
        );
      END IF;

      IF COALESCE(v_cupom.deposito_minimo, 0) > 0 AND p_valor_deposito < v_cupom.deposito_minimo THEN
        RETURN json_build_object(
          'ok', false,
          'error', 'min_deposit_not_met',
          'deposito_minimo', v_cupom.deposito_minimo
        );
      END IF;
    END IF;

    RETURN json_build_object(
      'ok', true,
      'codigo', v_cupom.codigo,
      'tipo_valor', v_cupom.tipo_valor,
      'valor', v_cupom.valor,
      'tipo_bonus', v_cupom.tipo_bonus,
      'deposito_minimo', COALESCE(v_cupom.deposito_minimo, 0),
      'bonus_maximo', v_cupom.bonus_maximo,
      'requer_deposito', v_requer_deposito,
      'quantidade_giros', TRUNC(v_cupom.valor)::INT,
      'jogo_slug', v_cupom.jogo_slug,
      'jogo_nome', v_cupom.jogo_nome,
      'provider_slug', v_cupom.provider_slug,
      'bonus_calculado', NULL
    );
  END IF;

  v_requer_deposito := COALESCE(v_cupom.deposito_minimo, 0) > 0 OR v_cupom.tipo_valor = 'porcentagem';

  IF v_requer_deposito THEN
    IF p_valor_deposito IS NULL OR p_valor_deposito <= 0 THEN
      RETURN json_build_object(
        'ok', true,
        'codigo', v_cupom.codigo,
        'tipo_valor', v_cupom.tipo_valor,
        'valor', v_cupom.valor,
        'tipo_bonus', v_cupom.tipo_bonus,
        'deposito_minimo', COALESCE(v_cupom.deposito_minimo, 0),
        'bonus_maximo', v_cupom.bonus_maximo,
        'requer_deposito', true,
        'bonus_calculado', NULL,
        'mensagem', 'Este cupom deve ser usado durante um depósito.'
      );
    END IF;

    IF COALESCE(v_cupom.deposito_minimo, 0) > 0 AND p_valor_deposito < v_cupom.deposito_minimo THEN
      RETURN json_build_object(
        'ok', false,
        'error', 'min_deposit_not_met',
        'deposito_minimo', v_cupom.deposito_minimo
      );
    END IF;
  END IF;

  v_bonus := public._calcular_bonus_cupom(
    v_cupom.tipo_valor,
    v_cupom.valor,
    v_cupom.bonus_maximo,
    CASE WHEN v_requer_deposito THEN p_valor_deposito ELSE NULL END
  );

  RETURN json_build_object(
    'ok', true,
    'codigo', v_cupom.codigo,
    'tipo_valor', v_cupom.tipo_valor,
    'valor', v_cupom.valor,
    'tipo_bonus', v_cupom.tipo_bonus,
    'deposito_minimo', COALESCE(v_cupom.deposito_minimo, 0),
    'bonus_maximo', v_cupom.bonus_maximo,
    'requer_deposito', v_requer_deposito,
    'bonus_calculado', v_bonus
  );
END;
$$;


--
-- Name: FUNCTION validar_cupom(p_codigo text, p_valor_deposito numeric); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.validar_cupom(p_codigo text, p_valor_deposito numeric) IS 'Valida um cupom e retorna preview do bônus. p_valor_deposito opcional para cupons de depósito.';


--
-- Name: validar_limite_saques_diarios(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validar_limite_saques_diarios() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_limite INT;
  v_count INT;
BEGIN
  SELECT COALESCE(saques_diarios_permitidos, 1)
  INTO v_limite
  FROM public.site_config
  WHERE id = 1;

  SELECT COUNT(*)
  INTO v_count
  FROM public.saques
  WHERE usuario_id = NEW.usuario_id
    AND (data_hora AT TIME ZONE 'America/Sao_Paulo')::date =
        (NOW() AT TIME ZONE 'America/Sao_Paulo')::date;

  IF v_count >= v_limite THEN
    RAISE EXCEPTION 'Limite diário de saques atingido. Máximo de % saque(s) por dia.', v_limite
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: validar_rollover_saque(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validar_rollover_saque() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  v_pendente NUMERIC;
BEGIN
  SELECT COALESCE(rollover_pendente, 0)
  INTO v_pendente
  FROM public.usuarios
  WHERE id = NEW.usuario_id;

  IF COALESCE(v_pendente, 0) > 0.009 THEN
    RAISE EXCEPTION 'Rollover pendente: aposte mais R$ % antes de sacar.', TRIM(TO_CHAR(v_pendente, 'FM999G999G990D00'))
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$_$;


--
-- Name: validate_deposito_limits(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_deposito_limits() RETURNS trigger
    LANGUAGE plpgsql
    AS $_$
DECLARE
  v_min NUMERIC;
  v_max NUMERIC;
BEGIN
  SELECT deposito_minimo, deposito_maximo
  INTO v_min, v_max
  FROM public.site_config
  WHERE id = 1;

  v_min := COALESCE(v_min, 20);
  v_max := COALESCE(v_max, 1000000);

  IF NEW.valor < v_min THEN
    RAISE EXCEPTION 'Valor mínimo de depósito: R$ %', v_min;
  END IF;

  IF NEW.valor > v_max THEN
    RAISE EXCEPTION 'Valor máximo de depósito: R$ %', v_max;
  END IF;

  RETURN NEW;
END;
$_$;


--
-- Name: validate_saque_limits(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_saque_limits() RETURNS trigger
    LANGUAGE plpgsql
    AS $_$
DECLARE
  v_min NUMERIC;
  v_max NUMERIC;
BEGIN
  SELECT saque_minimo, saque_maximo
  INTO v_min, v_max
  FROM public.site_config
  WHERE id = 1;

  v_min := COALESCE(v_min, 50);
  v_max := COALESCE(v_max, 1000000);

  IF NEW.valor < v_min THEN
    RAISE EXCEPTION 'Valor mínimo de saque: R$ %', v_min;
  END IF;

  IF NEW.valor > v_max THEN
    RAISE EXCEPTION 'Valor máximo de saque: R$ %', v_max;
  END IF;

  RETURN NEW;
END;
$_$;


--
-- Name: admin_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    admin_id uuid,
    admin_nome text,
    admin_email text,
    acao text NOT NULL,
    categoria text DEFAULT 'sistema'::text NOT NULL,
    status text DEFAULT 'sucesso'::text NOT NULL,
    ip_address text,
    dispositivo text,
    detalhes text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT admin_logs_status_check CHECK ((status = ANY (ARRAY['sucesso'::text, 'falha'::text])))
);


--
-- Name: TABLE admin_logs; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.admin_logs IS 'Registro de atividades realizadas por administradores no painel';


--
-- Name: all_games_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.all_games_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    nome text NOT NULL,
    ordem integer DEFAULT 0 NOT NULL,
    ativo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: TABLE all_games_categories; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.all_games_categories IS 'Filtros de categorias da página Todos os Jogos';


--
-- Name: all_games_page_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.all_games_page_config (
    id integer DEFAULT 1 NOT NULL,
    titulo text DEFAULT 'Todos os jogos'::text NOT NULL,
    jogos_por_pagina integer DEFAULT 18 NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT all_games_page_config_id_check CHECK ((id = 1)),
    CONSTRAINT all_games_page_config_jogos_por_pagina_check CHECK ((jogos_por_pagina > 0))
);


--
-- Name: TABLE all_games_page_config; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.all_games_page_config IS 'Configurações gerais da página Todos os Jogos';


--
-- Name: all_games_providers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.all_games_providers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    nome text NOT NULL,
    api_provider_id integer,
    ordem integer DEFAULT 0 NOT NULL,
    ativo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: TABLE all_games_providers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.all_games_providers IS 'Filtros de provedores da página Todos os Jogos';


--
-- Name: aviator_bets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.aviator_bets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    round_id uuid NOT NULL,
    usuario_id uuid NOT NULL,
    bet_amount numeric(10,2) DEFAULT 0.00 NOT NULL,
    cashout_multiplier numeric(10,2),
    profit numeric(10,2) DEFAULT 0.00 NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    placed_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    cashed_out_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    bet_slot smallint DEFAULT 1 NOT NULL,
    CONSTRAINT aviator_bets_status_check CHECK ((status = ANY (ARRAY['active'::text, 'cashed_out'::text, 'crashed'::text])))
);


--
-- Name: COLUMN aviator_bets.bet_slot; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.aviator_bets.bet_slot IS 'Slot da aposta no cliente (1 ou 2)';


--
-- Name: aviator_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.aviator_config (
    id integer DEFAULT 1 NOT NULL,
    rtp_base numeric(6,4) DEFAULT 0.9700 NOT NULL,
    rtp_min numeric(6,4) DEFAULT 0.9000 NOT NULL,
    rtp_max numeric(6,4) DEFAULT 0.9900 NOT NULL,
    recovery_enabled boolean DEFAULT true NOT NULL,
    recovery_window_hours integer DEFAULT 24 NOT NULL,
    ggr_target_pct numeric(6,2) DEFAULT 3.00 NOT NULL,
    recovery_strength numeric(6,4) DEFAULT 0.2500 NOT NULL,
    recovery_max_adjustment numeric(6,4) DEFAULT 0.0200 NOT NULL,
    min_wagered_for_recovery numeric(14,2) DEFAULT 100.00 NOT NULL,
    min_crash numeric(8,2) DEFAULT 1.01 NOT NULL,
    max_crash numeric(8,2) DEFAULT 500.00 NOT NULL,
    queue_size integer DEFAULT 50 NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    recovery_loss_trigger_brl numeric(14,2) DEFAULT 10000.00 NOT NULL,
    recovery_profit_trigger_brl numeric(14,2) DEFAULT 10000.00 NOT NULL,
    pct_vela_azul numeric(5,2) DEFAULT 52.00 NOT NULL,
    pct_vela_roxa numeric(5,2) DEFAULT 38.00 NOT NULL,
    pct_vela_rosa numeric(5,2) DEFAULT 10.00 NOT NULL,
    rtp_limit_min_pct numeric(5,2) DEFAULT 85.00 NOT NULL,
    rtp_limit_max_pct numeric(5,2) DEFAULT 99.99 NOT NULL,
    crash_technical_max numeric(10,2) DEFAULT 1000.00 NOT NULL,
    modo_geracao text DEFAULT 'velas'::text NOT NULL,
    geracao_min_crash numeric(8,2) DEFAULT 1.01 NOT NULL,
    geracao_max_crash numeric(8,2) DEFAULT 500.00 NOT NULL,
    CONSTRAINT aviator_config_id_check CHECK ((id = 1)),
    CONSTRAINT aviator_config_modo_geracao_check CHECK ((modo_geracao = ANY (ARRAY['rtp_geral'::text, 'velas'::text, 'crash'::text])))
);


--
-- Name: TABLE aviator_config; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.aviator_config IS 'RTP base, limites e recovery automático do Aviator';


--
-- Name: aviator_rounds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.aviator_rounds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    round_number bigint NOT NULL,
    target_multiplier numeric(10,2) NOT NULL,
    final_multiplier numeric(10,2),
    status text DEFAULT 'waiting'::text NOT NULL,
    started_at timestamp with time zone,
    crashed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    external_round_id bigint,
    server_seed text,
    CONSTRAINT aviator_rounds_status_check CHECK ((status = ANY (ARRAY['waiting'::text, 'flying'::text, 'crashed'::text])))
);


--
-- Name: COLUMN aviator_rounds.external_round_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.aviator_rounds.external_round_id IS 'ID da rodada no motor Python (ex.: 8273700)';


--
-- Name: COLUMN aviator_rounds.server_seed; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.aviator_rounds.server_seed IS 'Seed do servidor para fairness';


--
-- Name: aviator_rounds_round_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.aviator_rounds_round_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: aviator_rounds_round_number_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.aviator_rounds_round_number_seq OWNED BY public.aviator_rounds.round_number;


--
-- Name: aviator_velas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.aviator_velas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    round_id uuid,
    multiplier numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    external_round_id bigint
);


--
-- Name: COLUMN aviator_velas.external_round_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.aviator_velas.external_round_id IS 'ID da rodada no motor Python';


--
-- Name: bonus_conversoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bonus_conversoes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    valor numeric(12,2) NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT bonus_conversoes_valor_check CHECK ((valor > (0)::numeric))
);


--
-- Name: TABLE bonus_conversoes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.bonus_conversoes IS 'Histórico de conversões de saldo_bonus para saldo real.';


--
-- Name: cms_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cms_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    secao text NOT NULL,
    nome_admin text,
    titulo text,
    texto text,
    imagem_url text,
    imagem_mobile_url text,
    game_name text,
    provider text,
    link_tipo text,
    href text,
    ordem integer DEFAULT 0 NOT NULL,
    ativo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    background_color text,
    bloom_color text,
    outer_glow text,
    text_theme text,
    layout text,
    icon_type text,
    icon_value text,
    icon_alt text,
    labels jsonb DEFAULT '{}'::jsonb NOT NULL,
    categoria_slug text,
    category_tipo text,
    destaque boolean DEFAULT false NOT NULL,
    CONSTRAINT cms_items_link_tipo_check CHECK (((link_tipo IS NULL) OR (link_tipo = ANY (ARRAY['href'::text, 'game'::text, 'external'::text, 'event'::text])))),
    CONSTRAINT cms_items_quick_nav_link CHECK (((secao <> 'quick_nav'::text) OR ((link_tipo = 'href'::text) AND (href IS NOT NULL) AND (btrim(href) <> ''::text)) OR ((link_tipo = 'game'::text) AND (game_name IS NOT NULL) AND (btrim(game_name) <> ''::text)))),
    CONSTRAINT cms_items_secao_check CHECK ((secao = ANY (ARRAY['home_banner'::text, 'recommended'::text, 'promotion'::text, 'quick_nav'::text, 'sidebar_card'::text, 'sidebar_category'::text, 'sidebar_menu_item'::text]))),
    CONSTRAINT cms_items_sidebar_card_link CHECK (((secao <> 'sidebar_card'::text) OR ((href IS NOT NULL) AND (btrim(href) <> ''::text) AND (nome_admin IS NOT NULL) AND (btrim(nome_admin) <> ''::text)))),
    CONSTRAINT cms_items_sidebar_category_check CHECK (((secao <> 'sidebar_category'::text) OR ((titulo IS NOT NULL) AND (btrim(titulo) <> ''::text) AND (nome_admin IS NOT NULL) AND (btrim(nome_admin) <> ''::text) AND (category_tipo = ANY (ARRAY['menu'::text, 'language'::text]))))),
    CONSTRAINT cms_items_sidebar_menu_item_check CHECK (((secao <> 'sidebar_menu_item'::text) OR ((categoria_slug IS NOT NULL) AND (btrim(categoria_slug) <> ''::text) AND (nome_admin IS NOT NULL) AND (btrim(nome_admin) <> ''::text) AND (link_tipo = ANY (ARRAY['href'::text, 'game'::text, 'external'::text, 'event'::text])))))
);


--
-- Name: TABLE cms_items; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cms_items IS 'Itens de conteúdo do site: banners, atalhos, promoções e cards da sidebar';


--
-- Name: COLUMN cms_items.categoria_slug; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cms_items.categoria_slug IS 'Slug da categoria pai (sidebar_menu_item)';


--
-- Name: COLUMN cms_items.category_tipo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cms_items.category_tipo IS 'Tipo da categoria: menu ou language (sidebar_category)';


--
-- Name: COLUMN cms_items.destaque; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cms_items.destaque IS 'Texto em negrito no item do menu da sidebar';


--
-- Name: cupom_usos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cupom_usos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cupom_id uuid NOT NULL,
    usuario_id uuid NOT NULL,
    deposito_id uuid,
    valor_bonus numeric(10,2) NOT NULL,
    valor_deposito numeric(10,2),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    quantidade_giros integer,
    jogo_slug text,
    jogo_nome text,
    origem text DEFAULT 'manual'::text NOT NULL,
    status_giro text,
    giros_ativado_em timestamp with time zone,
    CONSTRAINT cupom_usos_origem_check CHECK ((origem = ANY (ARRAY['manual'::text, 'deposito'::text, 'roleta'::text]))),
    CONSTRAINT cupom_usos_status_giro_check CHECK (((status_giro IS NULL) OR (status_giro = ANY (ARRAY['pendente_deposito'::text, 'disponivel'::text, 'usado'::text]))))
);


--
-- Name: TABLE cupom_usos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cupom_usos IS 'Histórico de ativações de cupons por usuário';


--
-- Name: COLUMN cupom_usos.quantidade_giros; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cupom_usos.quantidade_giros IS 'Quantidade de rodadas grátis concedidas';


--
-- Name: COLUMN cupom_usos.status_giro; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cupom_usos.status_giro IS 'Status das rodadas: pendente_deposito, disponivel, usado';


--
-- Name: COLUMN cupom_usos.giros_ativado_em; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cupom_usos.giros_ativado_em IS 'Momento em que as rodadas grátis foram ativadas na PlayFivers (status_giro = usado).';


--
-- Name: depositos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.depositos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    valor numeric(10,2) NOT NULL,
    data_hora timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    status text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    origem text DEFAULT 'pix'::text NOT NULL,
    cupom_codigo text,
    gateway_check_id text,
    CONSTRAINT depositos_origem_check CHECK ((origem = ANY (ARRAY['pix'::text, 'manual'::text]))),
    CONSTRAINT depositos_status_check CHECK ((status = ANY (ARRAY['aprovado'::text, 'pendente'::text, 'falhou'::text, 'expirado'::text])))
);


--
-- Name: COLUMN depositos.origem; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.depositos.origem IS 'Origem do depósito: pix (automático) ou manual (admin)';


--
-- Name: COLUMN depositos.gateway_check_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.depositos.gateway_check_id IS 'ID usado na consulta PIX (externalTransactionId ou UUID interno). Só a API confirma depósito.';


--
-- Name: home_section_games; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.home_section_games (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    section_id uuid NOT NULL,
    api_provider_id integer NOT NULL,
    game_code text NOT NULL,
    game_name text NOT NULL,
    game_image_url text,
    provider_name text NOT NULL,
    ordem integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: TABLE home_section_games; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.home_section_games IS 'Jogos selecionados manualmente para cada seção de jogos na home (máx. 11)';


--
-- Name: home_section_providers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.home_section_providers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    section_id uuid NOT NULL,
    api_provider_id integer NOT NULL,
    provider_name text NOT NULL,
    provider_image_url text,
    ordem integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: TABLE home_section_providers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.home_section_providers IS 'Provedores selecionados manualmente para a seção Estúdios na home';


--
-- Name: home_sections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.home_sections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    titulo text NOT NULL,
    tipo text NOT NULL,
    ordem integer DEFAULT 0 NOT NULL,
    ativo boolean DEFAULT true NOT NULL,
    view_all_link text,
    use_green_button boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT home_sections_tipo_check CHECK ((tipo = ANY (ARRAY['estudios'::text, 'recomendados'::text, 'jogos_semana'::text, 'jogos_pg'::text, 'jogos_mesa'::text, 'jogos_turbo'::text])))
);


--
-- Name: TABLE home_sections; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.home_sections IS 'Ordem e configuração das seções de jogos na home';


--
-- Name: integration_secrets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.integration_secrets (
    id integer DEFAULT 1 NOT NULL,
    misticpay_ci text DEFAULT ''::text NOT NULL,
    misticpay_cs text DEFAULT ''::text NOT NULL,
    misticpay_api_url text DEFAULT 'https://api.misticpay.com/api'::text NOT NULL,
    misticpay_webhook_secret text DEFAULT ''::text NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    payment_gateway text DEFAULT 'misticpay'::text NOT NULL,
    bspay_client_id text DEFAULT ''::text NOT NULL,
    bspay_client_secret text DEFAULT ''::text NOT NULL,
    bspay_signing_key text DEFAULT ''::text NOT NULL,
    bspay_webhook_secret text DEFAULT ''::text NOT NULL,
    bspay_api_url text DEFAULT 'https://api.bspay.co'::text NOT NULL,
    veopag_client_id text DEFAULT ''::text NOT NULL,
    veopag_client_secret text DEFAULT ''::text NOT NULL,
    veopag_webhook_secret text DEFAULT ''::text NOT NULL,
    veopag_api_url text DEFAULT 'https://api.veopag.com'::text NOT NULL,
    payment_gateway_deposit text DEFAULT 'misticpay'::text NOT NULL,
    payment_gateway_withdraw text DEFAULT 'misticpay'::text NOT NULL,
    CONSTRAINT integration_secrets_id_check CHECK ((id = 1)),
    CONSTRAINT integration_secrets_payment_gateway_check CHECK ((payment_gateway = ANY (ARRAY['misticpay'::text, 'bspay'::text, 'veopag'::text]))),
    CONSTRAINT integration_secrets_payment_gateway_deposit_check CHECK ((payment_gateway_deposit = ANY (ARRAY['misticpay'::text, 'bspay'::text, 'veopag'::text]))),
    CONSTRAINT integration_secrets_payment_gateway_withdraw_check CHECK ((payment_gateway_withdraw = ANY (ARRAY['misticpay'::text, 'bspay'::text, 'veopag'::text])))
);


--
-- Name: TABLE integration_secrets; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.integration_secrets IS 'Segredos de integrações (MisticPay etc.). Acesso direto bloqueado para anon; API usa service_role.';


--
-- Name: COLUMN integration_secrets.payment_gateway; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.integration_secrets.payment_gateway IS 'Gateway PIX ativo: misticpay ou bspay';


--
-- Name: COLUMN integration_secrets.bspay_signing_key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.integration_secrets.bspay_signing_key IS 'Chave HMAC para cash-out BSPay (diferente do client_secret)';


--
-- Name: COLUMN integration_secrets.veopag_client_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.integration_secrets.veopag_client_id IS 'Client ID VeoPag (dashboard.veopag.com/credentials)';


--
-- Name: COLUMN integration_secrets.payment_gateway_deposit; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.integration_secrets.payment_gateway_deposit IS 'Gateway PIX para depósitos: misticpay, bspay ou veopag';


--
-- Name: COLUMN integration_secrets.payment_gateway_withdraw; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.integration_secrets.payment_gateway_withdraw IS 'Gateway PIX para saques: misticpay, bspay ou veopag';


--
-- Name: platform_games; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_games (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    api_provider_id integer NOT NULL,
    game_code text NOT NULL,
    nome text NOT NULL,
    image_url text,
    api_status boolean DEFAULT true NOT NULL,
    ativo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: TABLE platform_games; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.platform_games IS 'Jogos individuais com controle de ativação na plataforma';


--
-- Name: platform_providers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_providers (
    api_provider_id integer NOT NULL,
    slug text NOT NULL,
    nome text NOT NULL,
    image_url text,
    api_status integer DEFAULT 1 NOT NULL,
    ativo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: TABLE platform_providers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.platform_providers IS 'Provedores de jogos com controle de ativação na plataforma';


--
-- Name: prize_wheel_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prize_wheel_config (
    id integer DEFAULT 1 NOT NULL,
    ativo boolean DEFAULT true NOT NULL,
    titulo_imagem_url text,
    banner_imagem_url text,
    roleta_imagem_url text,
    centro_imagem_url text,
    giros_por_periodo integer DEFAULT 1 NOT NULL,
    cooldown_horas integer DEFAULT 24 NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    widget_imagem_url text,
    CONSTRAINT prize_wheel_config_cooldown_horas_check CHECK ((cooldown_horas >= 0)),
    CONSTRAINT prize_wheel_config_giros_por_periodo_check CHECK ((giros_por_periodo > 0)),
    CONSTRAINT prize_wheel_config_id_check CHECK ((id = 1))
);


--
-- Name: TABLE prize_wheel_config; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.prize_wheel_config IS 'Configuração global da roleta de prêmios';


--
-- Name: prize_wheel_segments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prize_wheel_segments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome_admin text NOT NULL,
    label text NOT NULL,
    cupom_id uuid NOT NULL,
    peso integer DEFAULT 1 NOT NULL,
    ordem integer DEFAULT 0 NOT NULL,
    ativo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT prize_wheel_segments_peso_check CHECK ((peso > 0))
);


--
-- Name: TABLE prize_wheel_segments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.prize_wheel_segments IS 'Segmentos da roleta vinculados a cupons de rodadas';


--
-- Name: prize_wheel_spins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prize_wheel_spins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    segment_id uuid NOT NULL,
    cupom_id uuid NOT NULL,
    cupom_uso_id uuid,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: TABLE prize_wheel_spins; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.prize_wheel_spins IS 'Histórico de giros na roleta por usuário';


--
-- Name: saques; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.saques (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    valor numeric(10,2) NOT NULL,
    data_hora timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    status text NOT NULL,
    key text,
    chave text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    origem text DEFAULT 'pix'::text NOT NULL,
    misticpay_job_id text,
    misticpay_transaction_id text,
    misticpay_status text,
    saldo_debitado boolean DEFAULT false NOT NULL,
    saldo_reembolsado boolean DEFAULT false NOT NULL,
    CONSTRAINT saques_key_check CHECK (((key IS NULL) OR (key = ANY (ARRAY['email'::text, 'cpf'::text, 'cnpj'::text, 'telefone'::text, 'chave aleatória'::text])))),
    CONSTRAINT saques_origem_check CHECK ((origem = ANY (ARRAY['pix'::text, 'revenue_share'::text]))),
    CONSTRAINT saques_status_check CHECK ((status = ANY (ARRAY['aprovado'::text, 'rejeitado'::text, 'pendente'::text, 'falhou'::text, 'processando'::text])))
);


--
-- Name: COLUMN saques.key; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.saques.key IS 'Tipo de chave PIX: email, cpf, cnpj, telefone ou chave aleatória';


--
-- Name: COLUMN saques.chave; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.saques.chave IS 'Valor da chave PIX do solicitante';


--
-- Name: COLUMN saques.origem; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.saques.origem IS 'Origem do saque: pix (normal) ou revenue_share';


--
-- Name: COLUMN saques.misticpay_job_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.saques.misticpay_job_id IS 'ID do job de saque na MisticPay';


--
-- Name: COLUMN saques.misticpay_transaction_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.saques.misticpay_transaction_id IS 'ID da transação de saque na MisticPay';


--
-- Name: COLUMN saques.misticpay_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.saques.misticpay_status IS 'Status retornado pela MisticPay (ex.: QUEUED, COMPLETO)';


--
-- Name: COLUMN saques.saldo_debitado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.saques.saldo_debitado IS 'true se o saldo foi debitado ao criar o saque; rejeição só reembolsa se true';


--
-- Name: COLUMN saques.saldo_reembolsado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.saques.saldo_reembolsado IS 'true após devolver o saldo (rejeitado/falhou); evita double refund';


--
-- Name: CONSTRAINT saques_status_check ON saques; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT saques_status_check ON public.saques IS 'pendente=aguardando; processando=PIX em andamento; aprovado/rejeitado/falhou=final';


--
-- Name: site_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_config (
    id integer DEFAULT 1 NOT NULL,
    header_fundo text DEFAULT '#121319'::text NOT NULL,
    header_logo_url text DEFAULT '/assets/logo.png'::text NOT NULL,
    footer_fundo text DEFAULT '#121319'::text NOT NULL,
    home_fundo text DEFAULT '#121319'::text NOT NULL,
    sidebar_fundo text DEFAULT '#121319'::text NOT NULL,
    sidebar_item_fundo text DEFAULT '#181923'::text NOT NULL,
    sidebar_idioma_ativo_fundo text DEFAULT '#2a1f45'::text NOT NULL,
    top_banner_ativo boolean DEFAULT true NOT NULL,
    top_banner_background_color text DEFAULT '#7B3FF2'::text NOT NULL,
    top_banner_emoji text DEFAULT '📲'::text NOT NULL,
    top_banner_mensagem text DEFAULT 'Faça o download do nosso aplicativo para uma experiência ainda melhor!'::text NOT NULL,
    top_banner_botao_texto text DEFAULT 'Download'::text NOT NULL,
    top_banner_botao_href text DEFAULT '/help/mobile'::text NOT NULL,
    top_banner_botao_cor_fundo text DEFAULT '#FFFFFF'::text NOT NULL,
    top_banner_botao_cor_texto text DEFAULT '#0f172a'::text NOT NULL,
    top_banner_permitir_fechar boolean DEFAULT true NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    deposito_minimo numeric(12,2) DEFAULT 20 NOT NULL,
    deposito_maximo numeric(12,2) DEFAULT 1000000 NOT NULL,
    saque_minimo numeric(12,2) DEFAULT 50 NOT NULL,
    saque_maximo numeric(12,2) DEFAULT 1000000 NOT NULL,
    saques_diarios_permitidos integer DEFAULT 1 NOT NULL,
    rollover_padrao numeric(8,2) DEFAULT 1 NOT NULL,
    sidebar_copy jsonb,
    login_modal_imagem_url text DEFAULT 'https://i.ibb.co/YgXq6QP/Gemini-Generated-Image-39fib539fib539fi.png'::text NOT NULL,
    register_modal_imagem_url text DEFAULT 'https://i.ibb.co/YgXq6QP/Gemini-Generated-Image-39fib539fib539fi.png'::text NOT NULL,
    indicacao_recompensa numeric(12,2) DEFAULT 100 NOT NULL,
    indicacao_deposito_minimo numeric(12,2) DEFAULT 50 NOT NULL,
    nome_bet text DEFAULT 'RoyalBet'::text NOT NULL,
    site_titulo text DEFAULT 'RoyalBet | Apostas Online com Saques Rápidos'::text NOT NULL,
    site_dominio text DEFAULT 'royall.bet'::text NOT NULL,
    entry_popup_ativo boolean DEFAULT false NOT NULL,
    entry_popup_imagem_url text,
    deposit_modal_imagem_url text,
    brand_cor_primaria text DEFAULT '#7B3FF2'::text NOT NULL,
    brand_cor_hover text DEFAULT '#6528D7'::text NOT NULL,
    site_favicon_url text DEFAULT '/headline.png'::text NOT NULL,
    footer_instagram_ativo boolean DEFAULT true NOT NULL,
    footer_instagram_url text DEFAULT 'https://instagram.com/royalbet_oficial'::text NOT NULL,
    footer_telegram_ativo boolean DEFAULT true NOT NULL,
    footer_telegram_url text DEFAULT 'https://t.me/royalbet_oficial'::text NOT NULL,
    footer_whatsapp_ativo boolean DEFAULT false NOT NULL,
    footer_whatsapp_url text DEFAULT ''::text NOT NULL,
    rollover_giros_gratis numeric(8,2) DEFAULT 5 NOT NULL,
    CONSTRAINT site_config_id_check CHECK ((id = 1)),
    CONSTRAINT site_config_indicacao_deposito_minimo_check CHECK ((indicacao_deposito_minimo >= (0)::numeric)),
    CONSTRAINT site_config_indicacao_recompensa_check CHECK ((indicacao_recompensa >= (0)::numeric)),
    CONSTRAINT site_config_rollover_giros_gratis_check CHECK ((rollover_giros_gratis >= (0)::numeric)),
    CONSTRAINT site_config_rollover_padrao_check CHECK ((rollover_padrao >= (0)::numeric)),
    CONSTRAINT site_config_saques_diarios_permitidos_check CHECK ((saques_diarios_permitidos >= 1))
);


--
-- Name: TABLE site_config; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.site_config IS 'Configurações globais do site: tema, banner superior e limites de depósito/saque';


--
-- Name: COLUMN site_config.deposito_minimo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_config.deposito_minimo IS 'Valor mínimo permitido para depósitos';


--
-- Name: COLUMN site_config.deposito_maximo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_config.deposito_maximo IS 'Valor máximo permitido para depósitos';


--
-- Name: COLUMN site_config.saque_minimo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_config.saque_minimo IS 'Valor mínimo permitido para saques';


--
-- Name: COLUMN site_config.saque_maximo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_config.saque_maximo IS 'Valor máximo permitido para saques';


--
-- Name: COLUMN site_config.saques_diarios_permitidos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_config.saques_diarios_permitidos IS 'Número máximo de saques permitidos por dia por usuário';


--
-- Name: COLUMN site_config.rollover_padrao; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_config.rollover_padrao IS 'Múltiplo padrão de rollover em depósitos (ex.: 2 = apostar 2x o valor depositado antes de sacar). 0 desativa.';


--
-- Name: COLUMN site_config.sidebar_copy; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_config.sidebar_copy IS 'Textos da sidebar por idioma: seções, itens do menu cassino/extras e labels auxiliares';


--
-- Name: COLUMN site_config.indicacao_recompensa; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_config.indicacao_recompensa IS 'Valor em R$ creditado ao indicador quando o indicado faz o primeiro depósito qualificado.';


--
-- Name: COLUMN site_config.indicacao_deposito_minimo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_config.indicacao_deposito_minimo IS 'Valor mínimo do primeiro depósito do indicado para validar a indicação.';


--
-- Name: COLUMN site_config.nome_bet; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_config.nome_bet IS 'Nome da bet exibido no site, título da página, originais e alt da logo';


--
-- Name: COLUMN site_config.site_titulo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_config.site_titulo IS 'Título do site exibido na aba do navegador (document.title)';


--
-- Name: COLUMN site_config.site_dominio; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_config.site_dominio IS 'Domínio público do site, sem protocolo. Usado nos links de indicação (ex.: royall.bet).';


--
-- Name: COLUMN site_config.entry_popup_ativo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_config.entry_popup_ativo IS 'Exibe popup com imagem ao entrar no site (uma vez por sessão).';


--
-- Name: COLUMN site_config.entry_popup_imagem_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_config.entry_popup_imagem_url IS 'URL da imagem exibida no popup de entrada.';


--
-- Name: COLUMN site_config.deposit_modal_imagem_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_config.deposit_modal_imagem_url IS 'URL da imagem exibida no topo do modal de depósito. Vazio usa a logo do site.';


--
-- Name: COLUMN site_config.brand_cor_primaria; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_config.brand_cor_primaria IS 'Cor principal de botões, bordas e destaques do site';


--
-- Name: COLUMN site_config.brand_cor_hover; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_config.brand_cor_hover IS 'Cor hover dos botões e elementos interativos';


--
-- Name: COLUMN site_config.site_favicon_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_config.site_favicon_url IS 'URL do favicon do site principal (aba do navegador). PNG, ICO ou SVG.';


--
-- Name: COLUMN site_config.footer_instagram_ativo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_config.footer_instagram_ativo IS 'Exibe o link do Instagram no footer do site.';


--
-- Name: COLUMN site_config.footer_instagram_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_config.footer_instagram_url IS 'URL do perfil Instagram exibido no footer.';


--
-- Name: COLUMN site_config.footer_telegram_ativo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_config.footer_telegram_ativo IS 'Exibe o link do Telegram no footer do site.';


--
-- Name: COLUMN site_config.footer_telegram_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_config.footer_telegram_url IS 'URL do Telegram exibido no footer.';


--
-- Name: COLUMN site_config.footer_whatsapp_ativo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_config.footer_whatsapp_ativo IS 'Exibe o link do WhatsApp no footer do site.';


--
-- Name: COLUMN site_config.footer_whatsapp_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_config.footer_whatsapp_url IS 'URL ou número do WhatsApp exibido no footer (ex.: https://wa.me/5511999999999).';


--
-- Name: COLUMN site_config.rollover_giros_gratis; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_config.rollover_giros_gratis IS 'Multiplicador de rollover aplicado sobre ganhos de giros grátis (ex.: 5 = 5x).';


--
-- Name: tracking_pixels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tracking_pixels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    pixel_id text NOT NULL,
    plataforma text DEFAULT 'facebook'::text NOT NULL,
    ativo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT tracking_pixels_pixel_id_format CHECK ((pixel_id ~ '^[0-9]{10,20}$'::text)),
    CONSTRAINT tracking_pixels_plataforma_check CHECK ((plataforma = 'facebook'::text))
);


--
-- Name: transacoes_jogos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transacoes_jogos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    tipo text NOT NULL,
    jogo text NOT NULL,
    valor numeric(10,2) DEFAULT 0.00 NOT NULL,
    retorno numeric(10,2) DEFAULT 0.00 NOT NULL,
    status text DEFAULT 'Finalizado'::text NOT NULL,
    com_bonus text DEFAULT 'Não'::text NOT NULL,
    data timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    txn_id text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT transacoes_jogos_tipo_check CHECK ((tipo = ANY (ARRAY['Ganhou'::text, 'Perdeu'::text])))
);


--
-- Name: TABLE transacoes_jogos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.transacoes_jogos IS 'Historico de apostas. INSERT/UPDATE so via service_role ou RPC SECURITY DEFINER (C4/C5).';


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios (
    id uuid NOT NULL,
    cpf text NOT NULL,
    email text NOT NULL,
    telefone text NOT NULL,
    saldo numeric(10,2) DEFAULT 0.00 NOT NULL,
    cargo text DEFAULT 'usuario'::text,
    nome text,
    usuario text,
    usuario_nome text,
    "link_indicação" text,
    indicado_por text,
    playfiver_user_code text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    vip_nivel integer DEFAULT 1 NOT NULL,
    total_depositado numeric(12,2) DEFAULT 0.00 NOT NULL,
    vip_atualizado_em timestamp with time zone,
    ativo boolean DEFAULT true NOT NULL,
    two_factor_enabled boolean DEFAULT false NOT NULL,
    data_nascimento date,
    pais text DEFAULT 'BR'::text NOT NULL,
    kyc_status text DEFAULT 'nao_enviado'::text NOT NULL,
    verificado boolean DEFAULT false NOT NULL,
    rollover_pendente numeric(12,2) DEFAULT 0 NOT NULL,
    utm_source text,
    utm_medium text,
    utm_campaign text,
    utm_content text,
    utm_term text,
    fbclid text,
    fbc text,
    fbp text,
    rollover_meta numeric(12,2) DEFAULT 0 NOT NULL,
    rollover_inicio timestamp with time zone,
    indicacao_recompensa_paga boolean DEFAULT false NOT NULL,
    totp_secret text,
    totp_pending_secret text,
    indicacao_recompensa_custom numeric(12,2),
    indicacao_deposito_minimo_custom numeric(12,2),
    indicacao_recompensa_valor_pago numeric(12,2),
    saldo_bonus numeric(12,2) DEFAULT 0 NOT NULL,
    rollover_bonus_pendente numeric(12,2) DEFAULT 0 NOT NULL,
    carteira_ativa text DEFAULT 'real'::text NOT NULL,
    CONSTRAINT usuarios_carteira_ativa_check CHECK ((carteira_ativa = ANY (ARRAY['real'::text, 'bonus'::text]))),
    CONSTRAINT usuarios_indicacao_deposito_minimo_custom_check CHECK (((indicacao_deposito_minimo_custom IS NULL) OR (indicacao_deposito_minimo_custom >= (0)::numeric))),
    CONSTRAINT usuarios_indicacao_recompensa_custom_check CHECK (((indicacao_recompensa_custom IS NULL) OR (indicacao_recompensa_custom >= (0)::numeric))),
    CONSTRAINT usuarios_indicacao_recompensa_valor_pago_check CHECK (((indicacao_recompensa_valor_pago IS NULL) OR (indicacao_recompensa_valor_pago >= (0)::numeric))),
    CONSTRAINT usuarios_kyc_status_check CHECK ((kyc_status = ANY (ARRAY['nao_enviado'::text, 'pendente'::text, 'aprovado'::text, 'rejeitado'::text]))),
    CONSTRAINT usuarios_rollover_meta_check CHECK ((rollover_meta >= (0)::numeric)),
    CONSTRAINT usuarios_rollover_pendente_check CHECK ((rollover_pendente >= (0)::numeric))
);


--
-- Name: COLUMN usuarios.cargo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.cargo IS 'Cargo/função do usuário (admin, moderador, usuario, etc.)';


--
-- Name: COLUMN usuarios.vip_nivel; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.vip_nivel IS 'Nível VIP atual (1-18), baseado em total_depositado';


--
-- Name: COLUMN usuarios.total_depositado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.total_depositado IS 'Soma de depósitos aprovados (lifetime)';


--
-- Name: COLUMN usuarios.ativo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.ativo IS 'Indica se o membro da equipe está ativo no painel';


--
-- Name: COLUMN usuarios.two_factor_enabled; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.two_factor_enabled IS 'Indica se o 2FA (Google Authenticator) está ativo';


--
-- Name: COLUMN usuarios.data_nascimento; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.data_nascimento IS 'Data de nascimento do usuário';


--
-- Name: COLUMN usuarios.pais; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.pais IS 'País do usuário (código ISO)';


--
-- Name: COLUMN usuarios.kyc_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.kyc_status IS 'Status da verificação KYC';


--
-- Name: COLUMN usuarios.verificado; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.verificado IS 'Conta verificada pelo administrador';


--
-- Name: COLUMN usuarios.rollover_pendente; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.rollover_pendente IS 'Valor em apostas que o usuário ainda precisa cumprir antes de sacar.';


--
-- Name: COLUMN usuarios.rollover_meta; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.rollover_meta IS 'Meta total de apostas exigida pelo rollover ativo.';


--
-- Name: COLUMN usuarios.rollover_inicio; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.rollover_inicio IS 'Data/hora em que a trava de rollover foi ativada.';


--
-- Name: COLUMN usuarios.indicacao_recompensa_paga; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.indicacao_recompensa_paga IS 'True quando o indicador já recebeu recompensa por este usuário indicado.';


--
-- Name: COLUMN usuarios.totp_secret; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.totp_secret IS 'Segredo TOTP base32 — somente servidor (2FA admin)';


--
-- Name: COLUMN usuarios.totp_pending_secret; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.totp_pending_secret IS 'Segredo TOTP temporário durante configuração do 2FA';


--
-- Name: COLUMN usuarios.indicacao_recompensa_custom; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.indicacao_recompensa_custom IS 'Recompensa personalizada em R$ para este indicador. NULL = usar site_config.indicacao_recompensa.';


--
-- Name: COLUMN usuarios.indicacao_deposito_minimo_custom; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.indicacao_deposito_minimo_custom IS 'Depósito mínimo personalizado do indicado para este indicador. NULL = usar site_config.indicacao_deposito_minimo.';


--
-- Name: COLUMN usuarios.indicacao_recompensa_valor_pago; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.indicacao_recompensa_valor_pago IS 'Valor em R$ creditado ao indicador quando esta indicação foi qualificada.';


--
-- Name: COLUMN usuarios.saldo_bonus; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.saldo_bonus IS 'Saldo de bônus (ganhos de rodadas grátis) aguardando rollover para conversão.';


--
-- Name: COLUMN usuarios.rollover_bonus_pendente; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.rollover_bonus_pendente IS 'Valor em apostas restante para liberar conversão do saldo_bonus (separado do rollover de depósito).';


--
-- Name: COLUMN usuarios.carteira_ativa; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.usuarios.carteira_ativa IS 'Carteira usada em jogos: real (R$ / saldo) ou bonus (B$ / saldo_bonus).';


--
-- Name: vip_historico; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vip_historico (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid NOT NULL,
    nivel_anterior integer NOT NULL,
    nivel_novo integer NOT NULL,
    deposito_id uuid,
    total_depositado numeric(12,2) NOT NULL,
    bonus_creditado numeric(10,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: TABLE vip_historico; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.vip_historico IS 'Histórico de upgrades VIP dos usuários';


--
-- Name: vip_niveis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vip_niveis (
    nivel integer NOT NULL,
    nome text NOT NULL,
    grupo text NOT NULL,
    subnivel integer DEFAULT 1 NOT NULL,
    deposito_minimo numeric(12,2) DEFAULT 0 NOT NULL,
    cashback_pct numeric(5,2) DEFAULT 0 NOT NULL,
    bonus_upgrade numeric(10,2) DEFAULT 0 NOT NULL,
    imagem_url text,
    cor text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT vip_niveis_nivel_check CHECK (((nivel >= 1) AND (nivel <= 99)))
);


--
-- Name: TABLE vip_niveis; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.vip_niveis IS 'Configuração dos níveis VIP por depósito acumulado';


--
-- Name: webhook_deliveries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhook_deliveries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    webhook_id uuid NOT NULL,
    evento text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    http_status integer,
    response_body text,
    tentativas integer DEFAULT 0 NOT NULL,
    erro text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    delivered_at timestamp with time zone,
    CONSTRAINT webhook_deliveries_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'success'::text, 'failed'::text])))
);


--
-- Name: TABLE webhook_deliveries; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.webhook_deliveries IS 'Log de entregas de webhooks (debug e auditoria)';


--
-- Name: webhooks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhooks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    url text NOT NULL,
    evento text NOT NULL,
    secret_key text NOT NULL,
    ativo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT webhooks_evento_check CHECK ((evento = ANY (ARRAY['user.register'::text, 'deposit.paid'::text, 'deposit.created'::text, 'withdraw.approved'::text])))
);


--
-- Name: TABLE webhooks; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.webhooks IS 'M8: CRUD admin via PlayFiverAPI /api/webhooks (service_role). secret_key nunca no browser.';


--
-- Name: aviator_rounds round_number; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aviator_rounds ALTER COLUMN round_number SET DEFAULT nextval('public.aviator_rounds_round_number_seq'::regclass);


--
-- Name: admin_logs admin_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_logs
    ADD CONSTRAINT admin_logs_pkey PRIMARY KEY (id);


--
-- Name: all_games_categories all_games_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.all_games_categories
    ADD CONSTRAINT all_games_categories_pkey PRIMARY KEY (id);


--
-- Name: all_games_categories all_games_categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.all_games_categories
    ADD CONSTRAINT all_games_categories_slug_key UNIQUE (slug);


--
-- Name: all_games_page_config all_games_page_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.all_games_page_config
    ADD CONSTRAINT all_games_page_config_pkey PRIMARY KEY (id);


--
-- Name: all_games_providers all_games_providers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.all_games_providers
    ADD CONSTRAINT all_games_providers_pkey PRIMARY KEY (id);


--
-- Name: all_games_providers all_games_providers_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.all_games_providers
    ADD CONSTRAINT all_games_providers_slug_key UNIQUE (slug);


--
-- Name: aviator_bets aviator_bets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aviator_bets
    ADD CONSTRAINT aviator_bets_pkey PRIMARY KEY (id);


--
-- Name: aviator_config aviator_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aviator_config
    ADD CONSTRAINT aviator_config_pkey PRIMARY KEY (id);


--
-- Name: aviator_rounds aviator_rounds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aviator_rounds
    ADD CONSTRAINT aviator_rounds_pkey PRIMARY KEY (id);


--
-- Name: aviator_velas aviator_velas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aviator_velas
    ADD CONSTRAINT aviator_velas_pkey PRIMARY KEY (id);


--
-- Name: bonus_conversoes bonus_conversoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bonus_conversoes
    ADD CONSTRAINT bonus_conversoes_pkey PRIMARY KEY (id);


--
-- Name: cms_items cms_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cms_items
    ADD CONSTRAINT cms_items_pkey PRIMARY KEY (id);


--
-- Name: cupom_usos cupom_usos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cupom_usos
    ADD CONSTRAINT cupom_usos_pkey PRIMARY KEY (id);


--
-- Name: cupons cupons_codigo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cupons
    ADD CONSTRAINT cupons_codigo_unique UNIQUE (codigo);


--
-- Name: cupons cupons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cupons
    ADD CONSTRAINT cupons_pkey PRIMARY KEY (id);


--
-- Name: depositos depositos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.depositos
    ADD CONSTRAINT depositos_pkey PRIMARY KEY (id);


--
-- Name: home_section_games home_section_games_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.home_section_games
    ADD CONSTRAINT home_section_games_pkey PRIMARY KEY (id);


--
-- Name: home_section_games home_section_games_section_id_api_provider_id_game_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.home_section_games
    ADD CONSTRAINT home_section_games_section_id_api_provider_id_game_code_key UNIQUE (section_id, api_provider_id, game_code);


--
-- Name: home_section_providers home_section_providers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.home_section_providers
    ADD CONSTRAINT home_section_providers_pkey PRIMARY KEY (id);


--
-- Name: home_section_providers home_section_providers_section_id_api_provider_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.home_section_providers
    ADD CONSTRAINT home_section_providers_section_id_api_provider_id_key UNIQUE (section_id, api_provider_id);


--
-- Name: home_sections home_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.home_sections
    ADD CONSTRAINT home_sections_pkey PRIMARY KEY (id);


--
-- Name: home_sections home_sections_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.home_sections
    ADD CONSTRAINT home_sections_slug_key UNIQUE (slug);


--
-- Name: integration_secrets integration_secrets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_secrets
    ADD CONSTRAINT integration_secrets_pkey PRIMARY KEY (id);


--
-- Name: platform_games platform_games_api_provider_id_game_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_games
    ADD CONSTRAINT platform_games_api_provider_id_game_code_key UNIQUE (api_provider_id, game_code);


--
-- Name: platform_games platform_games_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_games
    ADD CONSTRAINT platform_games_pkey PRIMARY KEY (id);


--
-- Name: platform_providers platform_providers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_providers
    ADD CONSTRAINT platform_providers_pkey PRIMARY KEY (api_provider_id);


--
-- Name: prize_wheel_config prize_wheel_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prize_wheel_config
    ADD CONSTRAINT prize_wheel_config_pkey PRIMARY KEY (id);


--
-- Name: prize_wheel_segments prize_wheel_segments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prize_wheel_segments
    ADD CONSTRAINT prize_wheel_segments_pkey PRIMARY KEY (id);


--
-- Name: prize_wheel_spins prize_wheel_spins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prize_wheel_spins
    ADD CONSTRAINT prize_wheel_spins_pkey PRIMARY KEY (id);


--
-- Name: saques saques_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saques
    ADD CONSTRAINT saques_pkey PRIMARY KEY (id);


--
-- Name: site_config site_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_config
    ADD CONSTRAINT site_config_pkey PRIMARY KEY (id);


--
-- Name: tracking_pixels tracking_pixels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tracking_pixels
    ADD CONSTRAINT tracking_pixels_pkey PRIMARY KEY (id);


--
-- Name: transacoes_jogos transacoes_jogos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transacoes_jogos
    ADD CONSTRAINT transacoes_jogos_pkey PRIMARY KEY (id);


--
-- Name: transacoes_jogos transacoes_jogos_txn_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transacoes_jogos
    ADD CONSTRAINT transacoes_jogos_txn_id_key UNIQUE (txn_id);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: vip_historico vip_historico_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vip_historico
    ADD CONSTRAINT vip_historico_pkey PRIMARY KEY (id);


--
-- Name: vip_niveis vip_niveis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vip_niveis
    ADD CONSTRAINT vip_niveis_pkey PRIMARY KEY (nivel);


--
-- Name: webhook_deliveries webhook_deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_deliveries
    ADD CONSTRAINT webhook_deliveries_pkey PRIMARY KEY (id);


--
-- Name: webhooks webhooks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhooks
    ADD CONSTRAINT webhooks_pkey PRIMARY KEY (id);


--
-- Name: aviator_bets_placed_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX aviator_bets_placed_at_idx ON public.aviator_bets USING btree (placed_at DESC);


--
-- Name: aviator_bets_round_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX aviator_bets_round_id_idx ON public.aviator_bets USING btree (round_id);


--
-- Name: aviator_bets_round_user_slot_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX aviator_bets_round_user_slot_idx ON public.aviator_bets USING btree (round_id, usuario_id, bet_slot);


--
-- Name: aviator_bets_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX aviator_bets_status_idx ON public.aviator_bets USING btree (status);


--
-- Name: aviator_bets_usuario_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX aviator_bets_usuario_id_idx ON public.aviator_bets USING btree (usuario_id);


--
-- Name: aviator_rounds_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX aviator_rounds_created_at_idx ON public.aviator_rounds USING btree (created_at DESC);


--
-- Name: aviator_rounds_external_round_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX aviator_rounds_external_round_id_idx ON public.aviator_rounds USING btree (external_round_id) WHERE (external_round_id IS NOT NULL);


--
-- Name: aviator_rounds_round_number_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX aviator_rounds_round_number_idx ON public.aviator_rounds USING btree (round_number DESC);


--
-- Name: aviator_rounds_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX aviator_rounds_status_idx ON public.aviator_rounds USING btree (status);


--
-- Name: aviator_velas_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX aviator_velas_created_at_idx ON public.aviator_velas USING btree (created_at DESC);


--
-- Name: aviator_velas_external_round_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX aviator_velas_external_round_id_idx ON public.aviator_velas USING btree (external_round_id) WHERE (external_round_id IS NOT NULL);


--
-- Name: aviator_velas_multiplier_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX aviator_velas_multiplier_idx ON public.aviator_velas USING btree (multiplier);


--
-- Name: aviator_velas_round_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX aviator_velas_round_id_idx ON public.aviator_velas USING btree (round_id);


--
-- Name: aviator_velas_round_id_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX aviator_velas_round_id_unique_idx ON public.aviator_velas USING btree (round_id) WHERE (round_id IS NOT NULL);


--
-- Name: depositos_data_hora_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX depositos_data_hora_idx ON public.depositos USING btree (data_hora DESC);


--
-- Name: depositos_gateway_check_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX depositos_gateway_check_id_idx ON public.depositos USING btree (gateway_check_id) WHERE (gateway_check_id IS NOT NULL);


--
-- Name: depositos_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX depositos_status_idx ON public.depositos USING btree (status);


--
-- Name: depositos_usuario_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX depositos_usuario_id_idx ON public.depositos USING btree (usuario_id);


--
-- Name: idx_admin_logs_admin_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_logs_admin_id ON public.admin_logs USING btree (admin_id);


--
-- Name: idx_admin_logs_categoria; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_logs_categoria ON public.admin_logs USING btree (categoria);


--
-- Name: idx_admin_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_logs_created_at ON public.admin_logs USING btree (created_at DESC);


--
-- Name: idx_admin_logs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_logs_status ON public.admin_logs USING btree (status);


--
-- Name: idx_all_games_categories_ativo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_all_games_categories_ativo ON public.all_games_categories USING btree (ativo) WHERE (ativo = true);


--
-- Name: idx_all_games_categories_ordem; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_all_games_categories_ordem ON public.all_games_categories USING btree (ordem);


--
-- Name: idx_all_games_providers_ativo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_all_games_providers_ativo ON public.all_games_providers USING btree (ativo) WHERE (ativo = true);


--
-- Name: idx_all_games_providers_ordem; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_all_games_providers_ordem ON public.all_games_providers USING btree (ordem);


--
-- Name: idx_bonus_conversoes_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bonus_conversoes_usuario ON public.bonus_conversoes USING btree (usuario_id, created_at DESC);


--
-- Name: idx_cms_items_secao_ativo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cms_items_secao_ativo ON public.cms_items USING btree (secao, ativo) WHERE (ativo = true);


--
-- Name: idx_cms_items_secao_ordem; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cms_items_secao_ordem ON public.cms_items USING btree (secao, ordem);


--
-- Name: idx_cupom_usos_cupom; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cupom_usos_cupom ON public.cupom_usos USING btree (cupom_id);


--
-- Name: idx_cupom_usos_deposito; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cupom_usos_deposito ON public.cupom_usos USING btree (deposito_id);


--
-- Name: idx_cupom_usos_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cupom_usos_usuario ON public.cupom_usos USING btree (usuario_id);


--
-- Name: idx_cupons_ativo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cupons_ativo ON public.cupons USING btree (ativo) WHERE (ativo = true);


--
-- Name: idx_cupons_codigo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cupons_codigo ON public.cupons USING btree (upper(codigo));


--
-- Name: idx_home_section_games_section_ordem; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_home_section_games_section_ordem ON public.home_section_games USING btree (section_id, ordem);


--
-- Name: idx_home_section_providers_section_ordem; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_home_section_providers_section_ordem ON public.home_section_providers USING btree (section_id, ordem);


--
-- Name: idx_home_sections_ativo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_home_sections_ativo ON public.home_sections USING btree (ativo) WHERE (ativo = true);


--
-- Name: idx_home_sections_ordem; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_home_sections_ordem ON public.home_sections USING btree (ordem);


--
-- Name: idx_platform_games_ativo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_games_ativo ON public.platform_games USING btree (ativo);


--
-- Name: idx_platform_games_game_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_games_game_code ON public.platform_games USING btree (game_code);


--
-- Name: idx_platform_games_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_games_provider ON public.platform_games USING btree (api_provider_id);


--
-- Name: idx_platform_providers_ativo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_providers_ativo ON public.platform_providers USING btree (ativo);


--
-- Name: idx_platform_providers_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_platform_providers_slug ON public.platform_providers USING btree (slug);


--
-- Name: idx_prize_wheel_segments_ativo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prize_wheel_segments_ativo ON public.prize_wheel_segments USING btree (ativo) WHERE (ativo = true);


--
-- Name: idx_prize_wheel_segments_ordem; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prize_wheel_segments_ordem ON public.prize_wheel_segments USING btree (ordem);


--
-- Name: idx_prize_wheel_spins_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prize_wheel_spins_created ON public.prize_wheel_spins USING btree (usuario_id, created_at DESC);


--
-- Name: idx_prize_wheel_spins_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prize_wheel_spins_usuario ON public.prize_wheel_spins USING btree (usuario_id);


--
-- Name: idx_saques_misticpay_job_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_saques_misticpay_job_id ON public.saques USING btree (misticpay_job_id) WHERE (misticpay_job_id IS NOT NULL);


--
-- Name: idx_saques_misticpay_transaction_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_saques_misticpay_transaction_id ON public.saques USING btree (misticpay_transaction_id) WHERE (misticpay_transaction_id IS NOT NULL);


--
-- Name: idx_tracking_pixels_ativo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tracking_pixels_ativo ON public.tracking_pixels USING btree (ativo, plataforma);


--
-- Name: idx_tracking_pixels_pixel_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_tracking_pixels_pixel_id ON public.tracking_pixels USING btree (pixel_id);


--
-- Name: idx_vip_historico_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vip_historico_created ON public.vip_historico USING btree (created_at DESC);


--
-- Name: idx_vip_historico_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vip_historico_usuario ON public.vip_historico USING btree (usuario_id);


--
-- Name: idx_webhook_deliveries_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_deliveries_status ON public.webhook_deliveries USING btree (status, created_at DESC);


--
-- Name: idx_webhook_deliveries_webhook; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_deliveries_webhook ON public.webhook_deliveries USING btree (webhook_id, created_at DESC);


--
-- Name: idx_webhooks_evento_ativo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhooks_evento_ativo ON public.webhooks USING btree (evento, ativo);


--
-- Name: saques_data_hora_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX saques_data_hora_idx ON public.saques USING btree (data_hora DESC);


--
-- Name: saques_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX saques_status_idx ON public.saques USING btree (status);


--
-- Name: saques_usuario_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX saques_usuario_id_idx ON public.saques USING btree (usuario_id);


--
-- Name: transacoes_jogos_data_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX transacoes_jogos_data_idx ON public.transacoes_jogos USING btree (data DESC);


--
-- Name: transacoes_jogos_tipo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX transacoes_jogos_tipo_idx ON public.transacoes_jogos USING btree (tipo);


--
-- Name: transacoes_jogos_txn_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX transacoes_jogos_txn_id_idx ON public.transacoes_jogos USING btree (txn_id);


--
-- Name: transacoes_jogos_usuario_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX transacoes_jogos_usuario_id_idx ON public.transacoes_jogos USING btree (usuario_id);


--
-- Name: usuarios_cargo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX usuarios_cargo_idx ON public.usuarios USING btree (cargo) WHERE (cargo IS NOT NULL);


--
-- Name: usuarios_cpf_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX usuarios_cpf_idx ON public.usuarios USING btree (cpf);


--
-- Name: usuarios_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX usuarios_email_idx ON public.usuarios USING btree (email);


--
-- Name: usuarios_indicado_por_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX usuarios_indicado_por_idx ON public.usuarios USING btree (indicado_por);


--
-- Name: usuarios_link_indicacao_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX usuarios_link_indicacao_idx ON public.usuarios USING btree ("link_indicação");


--
-- Name: usuarios_nome_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX usuarios_nome_idx ON public.usuarios USING btree (nome) WHERE (nome IS NOT NULL);


--
-- Name: usuarios_playfiver_user_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX usuarios_playfiver_user_code_idx ON public.usuarios USING btree (playfiver_user_code);


--
-- Name: usuarios_playfiver_user_code_idx2; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX usuarios_playfiver_user_code_idx2 ON public.usuarios USING btree (playfiver_user_code) WHERE (playfiver_user_code IS NOT NULL);


--
-- Name: usuarios_usuario_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX usuarios_usuario_idx ON public.usuarios USING btree (usuario) WHERE (usuario IS NOT NULL);


--
-- Name: usuarios_usuario_nome_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX usuarios_usuario_nome_idx ON public.usuarios USING btree (usuario_nome) WHERE (usuario_nome IS NOT NULL);


--
-- Name: saques devolver_valor_saque_rejeitado; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER devolver_valor_saque_rejeitado BEFORE UPDATE OF status ON public.saques FOR EACH ROW WHEN ((old.status IS DISTINCT FROM new.status)) EXECUTE FUNCTION public.handle_saque_rejeitado();


--
-- Name: usuarios protect_usuario_sensitive_columns; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER protect_usuario_sensitive_columns BEFORE UPDATE ON public.usuarios FOR EACH ROW EXECUTE FUNCTION public.protect_usuario_sensitive_columns();


--
-- Name: usuarios set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.usuarios FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: aviator_rounds set_updated_at_aviator_rounds; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at_aviator_rounds BEFORE UPDATE ON public.aviator_rounds FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at_aviator_rounds();


--
-- Name: depositos set_updated_at_depositos; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at_depositos BEFORE UPDATE ON public.depositos FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at_depositos();


--
-- Name: saques set_updated_at_saques; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at_saques BEFORE UPDATE ON public.saques FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at_saques();


--
-- Name: tracking_pixels set_updated_at_tracking_pixels; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at_tracking_pixels BEFORE UPDATE ON public.tracking_pixels FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: webhooks set_updated_at_webhooks; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at_webhooks BEFORE UPDATE ON public.webhooks FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


--
-- Name: transacoes_jogos trg_abater_rollover_aposta; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_abater_rollover_aposta AFTER INSERT ON public.transacoes_jogos FOR EACH ROW EXECUTE FUNCTION public.abater_rollover_aposta();


--
-- Name: all_games_categories trg_admin_audit_all_games_categories; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_admin_audit_all_games_categories AFTER INSERT OR DELETE OR UPDATE ON public.all_games_categories FOR EACH ROW EXECUTE FUNCTION public.trg_admin_audit_log();


--
-- Name: all_games_page_config trg_admin_audit_all_games_page_config; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_admin_audit_all_games_page_config AFTER INSERT OR DELETE OR UPDATE ON public.all_games_page_config FOR EACH ROW EXECUTE FUNCTION public.trg_admin_audit_log();


--
-- Name: all_games_providers trg_admin_audit_all_games_providers; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_admin_audit_all_games_providers AFTER INSERT OR DELETE OR UPDATE ON public.all_games_providers FOR EACH ROW EXECUTE FUNCTION public.trg_admin_audit_log();


--
-- Name: aviator_config trg_admin_audit_aviator_config; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_admin_audit_aviator_config AFTER INSERT OR DELETE OR UPDATE ON public.aviator_config FOR EACH ROW EXECUTE FUNCTION public.trg_admin_audit_log();


--
-- Name: cms_items trg_admin_audit_cms_items; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_admin_audit_cms_items AFTER INSERT OR DELETE OR UPDATE ON public.cms_items FOR EACH ROW EXECUTE FUNCTION public.trg_admin_audit_log();


--
-- Name: cupons trg_admin_audit_cupons; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_admin_audit_cupons AFTER INSERT OR DELETE OR UPDATE ON public.cupons FOR EACH ROW EXECUTE FUNCTION public.trg_admin_audit_log();


--
-- Name: home_sections trg_admin_audit_home_sections; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_admin_audit_home_sections AFTER INSERT OR DELETE OR UPDATE ON public.home_sections FOR EACH ROW EXECUTE FUNCTION public.trg_admin_audit_log();


--
-- Name: platform_games trg_admin_audit_platform_games; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_admin_audit_platform_games AFTER INSERT OR DELETE OR UPDATE ON public.platform_games FOR EACH ROW EXECUTE FUNCTION public.trg_admin_audit_log();


--
-- Name: platform_providers trg_admin_audit_platform_providers; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_admin_audit_platform_providers AFTER INSERT OR DELETE OR UPDATE ON public.platform_providers FOR EACH ROW EXECUTE FUNCTION public.trg_admin_audit_log();


--
-- Name: prize_wheel_config trg_admin_audit_prize_wheel_config; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_admin_audit_prize_wheel_config AFTER INSERT OR DELETE OR UPDATE ON public.prize_wheel_config FOR EACH ROW EXECUTE FUNCTION public.trg_admin_audit_log();


--
-- Name: prize_wheel_segments trg_admin_audit_prize_wheel_segments; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_admin_audit_prize_wheel_segments AFTER INSERT OR DELETE OR UPDATE ON public.prize_wheel_segments FOR EACH ROW EXECUTE FUNCTION public.trg_admin_audit_log();


--
-- Name: site_config trg_admin_audit_site_config; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_admin_audit_site_config AFTER INSERT OR DELETE OR UPDATE ON public.site_config FOR EACH ROW EXECUTE FUNCTION public.trg_admin_audit_log();


--
-- Name: usuarios trg_admin_audit_usuarios; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_admin_audit_usuarios AFTER INSERT OR DELETE OR UPDATE ON public.usuarios FOR EACH ROW EXECUTE FUNCTION public.trg_admin_audit_log();


--
-- Name: vip_niveis trg_admin_audit_vip_niveis; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_admin_audit_vip_niveis AFTER INSERT OR DELETE OR UPDATE ON public.vip_niveis FOR EACH ROW EXECUTE FUNCTION public.trg_admin_audit_log();


--
-- Name: cupom_usos trg_cupom_uso_giros_ativado; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cupom_uso_giros_ativado BEFORE UPDATE ON public.cupom_usos FOR EACH ROW EXECUTE FUNCTION public.trg_cupom_uso_giros_ativado();


--
-- Name: saques trg_validar_limite_saques_diarios; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validar_limite_saques_diarios BEFORE INSERT ON public.saques FOR EACH ROW EXECUTE FUNCTION public.validar_limite_saques_diarios();


--
-- Name: saques trg_validar_rollover_saque; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validar_rollover_saque BEFORE INSERT ON public.saques FOR EACH ROW EXECUTE FUNCTION public.validar_rollover_saque();


--
-- Name: aviator_rounds trigger_insert_aviator_vela; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_insert_aviator_vela AFTER UPDATE ON public.aviator_rounds FOR EACH ROW WHEN (((new.status = 'crashed'::text) AND (old.status <> 'crashed'::text))) EXECUTE FUNCTION public.insert_aviator_vela();


--
-- Name: aviator_velas trim_aviator_velas_after_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trim_aviator_velas_after_insert AFTER INSERT ON public.aviator_velas FOR EACH ROW EXECUTE FUNCTION public.trim_aviator_velas();


--
-- Name: depositos validate_deposito_limits; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER validate_deposito_limits BEFORE INSERT OR UPDATE OF valor ON public.depositos FOR EACH ROW EXECUTE FUNCTION public.validate_deposito_limits();


--
-- Name: saques validate_saque_limits; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER validate_saque_limits BEFORE INSERT OR UPDATE OF valor ON public.saques FOR EACH ROW EXECUTE FUNCTION public.validate_saque_limits();


--
-- Name: admin_logs admin_logs_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_logs
    ADD CONSTRAINT admin_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: aviator_bets aviator_bets_round_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aviator_bets
    ADD CONSTRAINT aviator_bets_round_id_fkey FOREIGN KEY (round_id) REFERENCES public.aviator_rounds(id) ON DELETE CASCADE;


--
-- Name: aviator_bets aviator_bets_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aviator_bets
    ADD CONSTRAINT aviator_bets_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: aviator_velas aviator_velas_round_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.aviator_velas
    ADD CONSTRAINT aviator_velas_round_id_fkey FOREIGN KEY (round_id) REFERENCES public.aviator_rounds(id) ON DELETE SET NULL;


--
-- Name: bonus_conversoes bonus_conversoes_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bonus_conversoes
    ADD CONSTRAINT bonus_conversoes_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: cupom_usos cupom_usos_cupom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cupom_usos
    ADD CONSTRAINT cupom_usos_cupom_id_fkey FOREIGN KEY (cupom_id) REFERENCES public.cupons(id) ON DELETE CASCADE;


--
-- Name: cupom_usos cupom_usos_deposito_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cupom_usos
    ADD CONSTRAINT cupom_usos_deposito_id_fkey FOREIGN KEY (deposito_id) REFERENCES public.depositos(id) ON DELETE SET NULL;


--
-- Name: cupom_usos cupom_usos_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cupom_usos
    ADD CONSTRAINT cupom_usos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: depositos depositos_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.depositos
    ADD CONSTRAINT depositos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: home_section_games home_section_games_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.home_section_games
    ADD CONSTRAINT home_section_games_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.home_sections(id) ON DELETE CASCADE;


--
-- Name: home_section_providers home_section_providers_section_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.home_section_providers
    ADD CONSTRAINT home_section_providers_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.home_sections(id) ON DELETE CASCADE;


--
-- Name: platform_games platform_games_api_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_games
    ADD CONSTRAINT platform_games_api_provider_id_fkey FOREIGN KEY (api_provider_id) REFERENCES public.platform_providers(api_provider_id) ON DELETE CASCADE;


--
-- Name: prize_wheel_segments prize_wheel_segments_cupom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prize_wheel_segments
    ADD CONSTRAINT prize_wheel_segments_cupom_id_fkey FOREIGN KEY (cupom_id) REFERENCES public.cupons(id) ON DELETE RESTRICT;


--
-- Name: prize_wheel_spins prize_wheel_spins_cupom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prize_wheel_spins
    ADD CONSTRAINT prize_wheel_spins_cupom_id_fkey FOREIGN KEY (cupom_id) REFERENCES public.cupons(id) ON DELETE RESTRICT;


--
-- Name: prize_wheel_spins prize_wheel_spins_cupom_uso_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prize_wheel_spins
    ADD CONSTRAINT prize_wheel_spins_cupom_uso_id_fkey FOREIGN KEY (cupom_uso_id) REFERENCES public.cupom_usos(id) ON DELETE SET NULL;


--
-- Name: prize_wheel_spins prize_wheel_spins_segment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prize_wheel_spins
    ADD CONSTRAINT prize_wheel_spins_segment_id_fkey FOREIGN KEY (segment_id) REFERENCES public.prize_wheel_segments(id) ON DELETE RESTRICT;


--
-- Name: prize_wheel_spins prize_wheel_spins_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prize_wheel_spins
    ADD CONSTRAINT prize_wheel_spins_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: saques saques_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saques
    ADD CONSTRAINT saques_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: transacoes_jogos transacoes_jogos_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transacoes_jogos
    ADD CONSTRAINT transacoes_jogos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: usuarios usuarios_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: vip_historico vip_historico_deposito_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vip_historico
    ADD CONSTRAINT vip_historico_deposito_id_fkey FOREIGN KEY (deposito_id) REFERENCES public.depositos(id) ON DELETE SET NULL;


--
-- Name: vip_historico vip_historico_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vip_historico
    ADD CONSTRAINT vip_historico_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: webhook_deliveries webhook_deliveries_webhook_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_deliveries
    ADD CONSTRAINT webhook_deliveries_webhook_id_fkey FOREIGN KEY (webhook_id) REFERENCES public.webhooks(id) ON DELETE CASCADE;


--
-- Name: aviator_config Admin gerencia aviator_config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin gerencia aviator_config" ON public.aviator_config USING (public.is_user_admin()) WITH CHECK (public.is_user_admin());


--
-- Name: cms_items Admin gerencia cms items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin gerencia cms items" ON public.cms_items USING (public.is_user_admin()) WITH CHECK (public.is_user_admin());


--
-- Name: prize_wheel_config Admin gerencia config roleta; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin gerencia config roleta" ON public.prize_wheel_config USING (public.is_user_admin()) WITH CHECK (public.is_user_admin());


--
-- Name: integration_secrets Admin gerencia integration secrets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin gerencia integration secrets" ON public.integration_secrets USING (public.is_user_admin()) WITH CHECK (public.is_user_admin());


--
-- Name: prize_wheel_segments Admin gerencia segmentos roleta; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin gerencia segmentos roleta" ON public.prize_wheel_segments USING (public.is_user_admin()) WITH CHECK (public.is_user_admin());


--
-- Name: tracking_pixels Admin gerencia tracking pixels; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin gerencia tracking pixels" ON public.tracking_pixels USING (public.is_user_admin()) WITH CHECK (public.is_user_admin());


--
-- Name: platform_games Admin pode atualizar jogos da plataforma; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin pode atualizar jogos da plataforma" ON public.platform_games FOR UPDATE USING (public.is_user_admin()) WITH CHECK (public.is_user_admin());


--
-- Name: platform_providers Admin pode atualizar provedores da plataforma; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin pode atualizar provedores da plataforma" ON public.platform_providers FOR UPDATE USING (public.is_user_admin()) WITH CHECK (public.is_user_admin());


--
-- Name: platform_games Admin pode excluir jogos da plataforma; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin pode excluir jogos da plataforma" ON public.platform_games FOR DELETE USING (public.is_user_admin());


--
-- Name: platform_providers Admin pode excluir provedores da plataforma; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin pode excluir provedores da plataforma" ON public.platform_providers FOR DELETE USING (public.is_user_admin());


--
-- Name: all_games_categories Admin pode gerenciar categorias todos jogos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin pode gerenciar categorias todos jogos" ON public.all_games_categories USING (public.is_user_admin()) WITH CHECK (public.is_user_admin());


--
-- Name: site_config Admin pode gerenciar config do site; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin pode gerenciar config do site" ON public.site_config USING (public.is_user_admin()) WITH CHECK (public.is_user_admin());


--
-- Name: all_games_page_config Admin pode gerenciar config todos jogos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin pode gerenciar config todos jogos" ON public.all_games_page_config USING (public.is_user_admin()) WITH CHECK (public.is_user_admin());


--
-- Name: cupons Admin pode gerenciar cupons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin pode gerenciar cupons" ON public.cupons USING (public.is_user_admin()) WITH CHECK (public.is_user_admin());


--
-- Name: platform_games Admin pode gerenciar jogos da plataforma; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin pode gerenciar jogos da plataforma" ON public.platform_games FOR INSERT WITH CHECK (public.is_user_admin());


--
-- Name: home_section_games Admin pode gerenciar jogos das seções da home; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin pode gerenciar jogos das seções da home" ON public.home_section_games USING (public.is_user_admin()) WITH CHECK (public.is_user_admin());


--
-- Name: vip_niveis Admin pode gerenciar níveis VIP; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin pode gerenciar níveis VIP" ON public.vip_niveis USING (public.is_user_admin()) WITH CHECK (public.is_user_admin());


--
-- Name: platform_providers Admin pode gerenciar provedores da plataforma; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin pode gerenciar provedores da plataforma" ON public.platform_providers FOR INSERT WITH CHECK (public.is_user_admin());


--
-- Name: home_section_providers Admin pode gerenciar provedores das seções da home; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin pode gerenciar provedores das seções da home" ON public.home_section_providers USING (public.is_user_admin()) WITH CHECK (public.is_user_admin());


--
-- Name: all_games_providers Admin pode gerenciar providers todos jogos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin pode gerenciar providers todos jogos" ON public.all_games_providers USING (public.is_user_admin()) WITH CHECK (public.is_user_admin());


--
-- Name: home_sections Admin pode gerenciar seções da home; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin pode gerenciar seções da home" ON public.home_sections USING (public.is_user_admin()) WITH CHECK (public.is_user_admin());


--
-- Name: usuarios Admin pode gerenciar usuários; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin pode gerenciar usuários" ON public.usuarios FOR UPDATE USING (public.is_user_admin()) WITH CHECK (public.is_user_admin());


--
-- Name: admin_logs Admin pode ver logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin pode ver logs" ON public.admin_logs FOR SELECT USING (public.is_user_admin());


--
-- Name: cupom_usos Admin pode ver todos usos de cupom; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin pode ver todos usos de cupom" ON public.cupom_usos FOR SELECT USING (public.is_user_admin());


--
-- Name: bonus_conversoes Admin ve todas conversoes bonus; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin ve todas conversoes bonus" ON public.bonus_conversoes FOR SELECT USING (public.is_user_admin());


--
-- Name: prize_wheel_spins Admin ve todos giros roleta; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin ve todos giros roleta" ON public.prize_wheel_spins FOR SELECT USING (public.is_user_admin());


--
-- Name: vip_historico Admin vê todo histórico VIP; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin vê todo histórico VIP" ON public.vip_historico FOR SELECT USING (public.is_user_admin());


--
-- Name: depositos Admins podem atualizar depósitos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem atualizar depósitos" ON public.depositos FOR UPDATE USING (public.is_user_admin()) WITH CHECK (public.is_user_admin());


--
-- Name: saques Admins podem atualizar saques; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem atualizar saques" ON public.saques FOR UPDATE USING (public.is_user_admin()) WITH CHECK (public.is_user_admin());


--
-- Name: depositos Admins podem ver todos os depósitos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem ver todos os depósitos" ON public.depositos FOR SELECT USING (((auth.uid() = usuario_id) OR public.is_user_admin()));


--
-- Name: saques Admins podem ver todos os saques; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem ver todos os saques" ON public.saques FOR SELECT USING (((auth.uid() = usuario_id) OR public.is_user_admin()));


--
-- Name: cms_items Publico ve cms items ativos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Publico ve cms items ativos" ON public.cms_items FOR SELECT USING ((ativo = true));


--
-- Name: prize_wheel_config Publico ve config roleta ativa; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Publico ve config roleta ativa" ON public.prize_wheel_config FOR SELECT USING ((ativo = true));


--
-- Name: prize_wheel_segments Publico ve segmentos roleta ativos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Publico ve segmentos roleta ativos" ON public.prize_wheel_segments FOR SELECT USING ((ativo = true));


--
-- Name: tracking_pixels Publico ve tracking pixels ativos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Publico ve tracking pixels ativos" ON public.tracking_pixels FOR SELECT USING ((ativo = true));


--
-- Name: platform_games Todos podem ler catálogo de jogos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Todos podem ler catálogo de jogos" ON public.platform_games FOR SELECT USING (true);


--
-- Name: platform_providers Todos podem ler catálogo de provedores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Todos podem ler catálogo de provedores" ON public.platform_providers FOR SELECT USING (true);


--
-- Name: all_games_categories Todos podem ver categorias todos jogos ativas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Todos podem ver categorias todos jogos ativas" ON public.all_games_categories FOR SELECT USING ((ativo = true));


--
-- Name: site_config Todos podem ver config do site; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Todos podem ver config do site" ON public.site_config FOR SELECT USING (true);


--
-- Name: all_games_page_config Todos podem ver config todos jogos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Todos podem ver config todos jogos" ON public.all_games_page_config FOR SELECT USING (true);


--
-- Name: home_section_games Todos podem ver jogos das seções da home; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Todos podem ver jogos das seções da home" ON public.home_section_games FOR SELECT USING (true);


--
-- Name: vip_niveis Todos podem ver níveis VIP; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Todos podem ver níveis VIP" ON public.vip_niveis FOR SELECT USING (true);


--
-- Name: home_section_providers Todos podem ver provedores das seções da home; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Todos podem ver provedores das seções da home" ON public.home_section_providers FOR SELECT USING (true);


--
-- Name: all_games_providers Todos podem ver providers todos jogos ativos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Todos podem ver providers todos jogos ativos" ON public.all_games_providers FOR SELECT USING ((ativo = true));


--
-- Name: aviator_rounds Todos podem ver rodadas do Aviator; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Todos podem ver rodadas do Aviator" ON public.aviator_rounds FOR SELECT USING (true);


--
-- Name: home_sections Todos podem ver seções ativas da home; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Todos podem ver seções ativas da home" ON public.home_sections FOR SELECT USING ((ativo = true));


--
-- Name: aviator_velas Todos podem ver velas do Aviator; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Todos podem ver velas do Aviator" ON public.aviator_velas FOR SELECT USING (true);


--
-- Name: bonus_conversoes Usuario ve proprias conversoes bonus; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuario ve proprias conversoes bonus" ON public.bonus_conversoes FOR SELECT USING ((auth.uid() = usuario_id));


--
-- Name: prize_wheel_spins Usuario ve proprios giros roleta; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuario ve proprios giros roleta" ON public.prize_wheel_spins FOR SELECT USING ((auth.uid() = usuario_id));


--
-- Name: cupom_usos Usuario ve proprios usos de cupom; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuario ve proprios usos de cupom" ON public.cupom_usos FOR SELECT USING ((auth.uid() = usuario_id));


--
-- Name: aviator_bets Usuarios podem ver apenas suas proprias apostas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuarios podem ver apenas suas proprias apostas" ON public.aviator_bets FOR SELECT USING (((auth.uid() = usuario_id) OR public.is_user_admin()));


--
-- Name: transacoes_jogos Usuarios podem ver apenas suas proprias transacoes de jogos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuarios podem ver apenas suas proprias transacoes de jogos" ON public.transacoes_jogos FOR SELECT USING (((auth.uid() = usuario_id) OR public.is_user_admin()));


--
-- Name: usuarios Usuários podem atualizar seus próprios dados; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários podem atualizar seus próprios dados" ON public.usuarios FOR UPDATE USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));


--
-- Name: usuarios Usuários podem ver apenas seus próprios dados; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários podem ver apenas seus próprios dados" ON public.usuarios FOR SELECT USING (((auth.uid() = id) OR public.is_user_admin()));


--
-- Name: POLICY "Usuários podem ver apenas seus próprios dados" ON usuarios; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY "Usuários podem ver apenas seus próprios dados" ON public.usuarios IS 'H8: usuário comum não lê linha de indicados; agregados via obter_indicacao_config_usuario.';


--
-- Name: depositos Usuários podem ver apenas seus próprios depósitos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários podem ver apenas seus próprios depósitos" ON public.depositos FOR SELECT USING ((auth.uid() = usuario_id));


--
-- Name: saques Usuários podem ver apenas seus próprios saques; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários podem ver apenas seus próprios saques" ON public.saques FOR SELECT USING ((auth.uid() = usuario_id));


--
-- Name: vip_historico Usuários veem próprio histórico VIP; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários veem próprio histórico VIP" ON public.vip_historico FOR SELECT USING ((auth.uid() = usuario_id));


--
-- Name: admin_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: all_games_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.all_games_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: all_games_page_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.all_games_page_config ENABLE ROW LEVEL SECURITY;

--
-- Name: all_games_providers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.all_games_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: aviator_bets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.aviator_bets ENABLE ROW LEVEL SECURITY;

--
-- Name: aviator_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.aviator_config ENABLE ROW LEVEL SECURITY;

--
-- Name: aviator_rounds; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.aviator_rounds ENABLE ROW LEVEL SECURITY;

--
-- Name: aviator_velas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.aviator_velas ENABLE ROW LEVEL SECURITY;

--
-- Name: bonus_conversoes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bonus_conversoes ENABLE ROW LEVEL SECURITY;

--
-- Name: cms_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cms_items ENABLE ROW LEVEL SECURITY;

--
-- Name: cupom_usos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cupom_usos ENABLE ROW LEVEL SECURITY;

--
-- Name: cupons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cupons ENABLE ROW LEVEL SECURITY;

--
-- Name: depositos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.depositos ENABLE ROW LEVEL SECURITY;

--
-- Name: home_section_games; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.home_section_games ENABLE ROW LEVEL SECURITY;

--
-- Name: home_section_providers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.home_section_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: home_sections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.home_sections ENABLE ROW LEVEL SECURITY;

--
-- Name: integration_secrets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.integration_secrets ENABLE ROW LEVEL SECURITY;

--
-- Name: platform_games; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.platform_games ENABLE ROW LEVEL SECURITY;

--
-- Name: platform_providers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.platform_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: prize_wheel_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prize_wheel_config ENABLE ROW LEVEL SECURITY;

--
-- Name: prize_wheel_segments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prize_wheel_segments ENABLE ROW LEVEL SECURITY;

--
-- Name: prize_wheel_spins; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prize_wheel_spins ENABLE ROW LEVEL SECURITY;

--
-- Name: saques; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.saques ENABLE ROW LEVEL SECURITY;

--
-- Name: site_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;

--
-- Name: tracking_pixels; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tracking_pixels ENABLE ROW LEVEL SECURITY;

--
-- Name: transacoes_jogos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.transacoes_jogos ENABLE ROW LEVEL SECURITY;

--
-- Name: usuarios; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

--
-- Name: vip_historico; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vip_historico ENABLE ROW LEVEL SECURITY;

--
-- Name: vip_niveis; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.vip_niveis ENABLE ROW LEVEL SECURITY;

--
-- Name: webhook_deliveries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

--
-- Name: webhook_deliveries webhook_deliveries_admin_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY webhook_deliveries_admin_select ON public.webhook_deliveries FOR SELECT TO authenticated USING (public.is_user_admin());


--
-- Name: webhooks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

--
-- Name: webhooks webhooks_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY webhooks_admin_all ON public.webhooks TO authenticated USING (public.is_user_admin()) WITH CHECK (public.is_user_admin());


--
-- PostgreSQL database dump complete
--

\unrestrict 5dXLqczpklGdWCOCHlUxsn8xjKOpNkGhNUw4yXLyNp1vbtUhhA7J6vPcPexrdZe

