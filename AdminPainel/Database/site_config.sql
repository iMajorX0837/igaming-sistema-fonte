-- Configurações globais do site (tema, banner topo, limites de depósito/saque)
-- Substitui: header_config, footer_config, sidebar_config, home_config,
--            top_banner_config, plataforma_config
-- Execute no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS public.site_config (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),

  -- Header
  header_fundo TEXT NOT NULL DEFAULT '#121319',
  header_logo_url TEXT NOT NULL DEFAULT '/assets/logo.png',
  nome_bet TEXT NOT NULL DEFAULT 'RoyalBet',
  site_titulo TEXT NOT NULL DEFAULT 'RoyalBet | Apostas Online com Saques Rápidos',
  site_favicon_url TEXT NOT NULL DEFAULT '/headline.png',

  -- Modais de login / cadastro
  login_modal_imagem_url TEXT NOT NULL DEFAULT 'https://i.ibb.co/YgXq6QP/Gemini-Generated-Image-39fib539fib539fi.png',
  register_modal_imagem_url TEXT NOT NULL DEFAULT 'https://i.ibb.co/YgXq6QP/Gemini-Generated-Image-39fib539fib539fi.png',
  deposit_modal_imagem_url TEXT,

  -- Footer
  footer_fundo TEXT NOT NULL DEFAULT '#121319',

  -- Home
  home_fundo TEXT NOT NULL DEFAULT '#121319',

  -- Sidebar
  sidebar_fundo TEXT NOT NULL DEFAULT '#121319',
  sidebar_item_fundo TEXT NOT NULL DEFAULT '#181923',
  sidebar_idioma_ativo_fundo TEXT NOT NULL DEFAULT '#2a1f45',
  sidebar_copy JSONB,

  -- Top banner
  top_banner_ativo BOOLEAN NOT NULL DEFAULT true,
  top_banner_background_color TEXT NOT NULL DEFAULT '#7B3FF2',
  top_banner_emoji TEXT NOT NULL DEFAULT '📲',
  top_banner_mensagem TEXT NOT NULL DEFAULT 'Faça o download do nosso aplicativo para uma experiência ainda melhor!',
  top_banner_botao_texto TEXT NOT NULL DEFAULT 'Download',
  top_banner_botao_href TEXT NOT NULL DEFAULT '/help/mobile',
  top_banner_botao_cor_fundo TEXT NOT NULL DEFAULT '#FFFFFF',
  top_banner_botao_cor_texto TEXT NOT NULL DEFAULT '#0f172a',
  top_banner_permitir_fechar BOOLEAN NOT NULL DEFAULT true,

  -- Popup de entrada
  entry_popup_ativo BOOLEAN NOT NULL DEFAULT false,
  entry_popup_imagem_url TEXT,

  -- Plataforma (depósito/saque)
  deposito_minimo NUMERIC(12,2) NOT NULL DEFAULT 20,
  deposito_maximo NUMERIC(12,2) NOT NULL DEFAULT 1000000,
  saque_minimo NUMERIC(12,2) NOT NULL DEFAULT 50,
  saque_maximo NUMERIC(12,2) NOT NULL DEFAULT 1000000,
  saques_diarios_permitidos INT NOT NULL DEFAULT 1 CHECK (saques_diarios_permitidos >= 1),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Colunas extras para quem já tinha site_config antes desta versão
ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS deposito_minimo NUMERIC(12,2) NOT NULL DEFAULT 20;
ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS deposito_maximo NUMERIC(12,2) NOT NULL DEFAULT 1000000;
ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS saque_minimo NUMERIC(12,2) NOT NULL DEFAULT 50;
ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS saque_maximo NUMERIC(12,2) NOT NULL DEFAULT 1000000;
ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS saques_diarios_permitidos INT NOT NULL DEFAULT 1;
ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS sidebar_copy JSONB;
ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS login_modal_imagem_url TEXT NOT NULL DEFAULT 'https://i.ibb.co/YgXq6QP/Gemini-Generated-Image-39fib539fib539fi.png';
ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS register_modal_imagem_url TEXT NOT NULL DEFAULT 'https://i.ibb.co/YgXq6QP/Gemini-Generated-Image-39fib539fib539fi.png';
ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS deposit_modal_imagem_url TEXT;
ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS entry_popup_ativo BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS entry_popup_imagem_url TEXT;
ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS nome_bet TEXT NOT NULL DEFAULT 'RoyalBet';
ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS site_titulo TEXT NOT NULL DEFAULT 'RoyalBet | Apostas Online com Saques Rápidos';
ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS site_favicon_url TEXT NOT NULL DEFAULT '/headline.png';

INSERT INTO public.site_config (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Migra dados das tabelas antigas (se existirem)
DO $$
BEGIN
  IF to_regclass('public.header_config') IS NOT NULL THEN
    UPDATE public.site_config sc SET
      header_fundo = COALESCE(h.fundo, sc.header_fundo),
      header_logo_url = COALESCE(h.logo_url, sc.header_logo_url),
      updated_at = COALESCE(h.updated_at, sc.updated_at)
    FROM public.header_config h
    WHERE sc.id = 1 AND h.id = 1;
  END IF;

  IF to_regclass('public.footer_config') IS NOT NULL THEN
    UPDATE public.site_config sc SET
      footer_fundo = COALESCE(f.fundo, sc.footer_fundo),
      updated_at = COALESCE(f.updated_at, sc.updated_at)
    FROM public.footer_config f
    WHERE sc.id = 1 AND f.id = 1;
  END IF;

  IF to_regclass('public.home_config') IS NOT NULL THEN
    UPDATE public.site_config sc SET
      home_fundo = COALESCE(h.fundo, sc.home_fundo),
      updated_at = COALESCE(h.updated_at, sc.updated_at)
    FROM public.home_config h
    WHERE sc.id = 1 AND h.id = 1;
  END IF;

  IF to_regclass('public.sidebar_config') IS NOT NULL THEN
    UPDATE public.site_config sc SET
      sidebar_fundo = COALESCE(s.fundo, sc.sidebar_fundo),
      sidebar_item_fundo = COALESCE(s.item_fundo, sc.sidebar_item_fundo),
      sidebar_idioma_ativo_fundo = COALESCE(s.idioma_ativo_fundo, sc.sidebar_idioma_ativo_fundo),
      updated_at = COALESCE(s.updated_at, sc.updated_at)
    FROM public.sidebar_config s
    WHERE sc.id = 1 AND s.id = 1;
  END IF;

  IF to_regclass('public.top_banner_config') IS NOT NULL THEN
    UPDATE public.site_config sc SET
      top_banner_ativo = COALESCE(t.ativo, sc.top_banner_ativo),
      top_banner_background_color = COALESCE(t.background_color, sc.top_banner_background_color),
      top_banner_emoji = COALESCE(t.emoji, sc.top_banner_emoji),
      top_banner_mensagem = COALESCE(t.mensagem, sc.top_banner_mensagem),
      top_banner_botao_texto = COALESCE(t.botao_texto, sc.top_banner_botao_texto),
      top_banner_botao_href = COALESCE(t.botao_href, sc.top_banner_botao_href),
      top_banner_botao_cor_fundo = COALESCE(t.botao_cor_fundo, sc.top_banner_botao_cor_fundo),
      top_banner_botao_cor_texto = COALESCE(t.botao_cor_texto, sc.top_banner_botao_cor_texto),
      top_banner_permitir_fechar = COALESCE(t.permitir_fechar, sc.top_banner_permitir_fechar),
      updated_at = COALESCE(t.updated_at, sc.updated_at)
    FROM public.top_banner_config t
    WHERE sc.id = 1 AND t.id = 1;
  END IF;

  IF to_regclass('public.plataforma_config') IS NOT NULL THEN
    UPDATE public.site_config sc SET
      deposito_minimo = COALESCE(p.deposito_minimo, sc.deposito_minimo),
      deposito_maximo = COALESCE(p.deposito_maximo, sc.deposito_maximo),
      saque_minimo = COALESCE(p.saque_minimo, sc.saque_minimo),
      saque_maximo = COALESCE(p.saque_maximo, sc.saque_maximo),
      updated_at = COALESCE(p.updated_at, sc.updated_at)
    FROM public.plataforma_config p
    WHERE sc.id = 1 AND p.id = 1;
  END IF;
END;
$$;

-- Remove tabelas antigas
DROP TABLE IF EXISTS public.header_config CASCADE;
DROP TABLE IF EXISTS public.footer_config CASCADE;
DROP TABLE IF EXISTS public.sidebar_config CASCADE;
DROP TABLE IF EXISTS public.home_config CASCADE;
DROP TABLE IF EXISTS public.top_banner_config CASCADE;
DROP TABLE IF EXISTS public.plataforma_config CASCADE;

ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos podem ver config do site" ON public.site_config;
DROP POLICY IF EXISTS "Admin pode gerenciar config do site" ON public.site_config;
DROP POLICY IF EXISTS "Todos podem ver configurações" ON public.site_config;

CREATE POLICY "Todos podem ver config do site"
  ON public.site_config FOR SELECT
  USING (true);

CREATE POLICY "Admin pode gerenciar config do site"
  ON public.site_config FOR ALL
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

GRANT SELECT ON public.site_config TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.obter_config_plataforma()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
      'saques_diarios_permitidos', 1
    );
  END IF;

  RETURN json_build_object(
    'ok', true,
    'deposito_minimo', v_config.deposito_minimo,
    'deposito_maximo', v_config.deposito_maximo,
    'saque_minimo', v_config.saque_minimo,
    'saque_maximo', v_config.saque_maximo,
    'saques_diarios_permitidos', COALESCE(v_config.saques_diarios_permitidos, 1),
    'updated_at', v_config.updated_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.atualizar_config_plataforma_admin(
  p_deposito_minimo NUMERIC DEFAULT NULL,
  p_deposito_maximo NUMERIC DEFAULT NULL,
  p_saque_minimo NUMERIC DEFAULT NULL,
  p_saque_maximo NUMERIC DEFAULT NULL,
  p_saques_diarios_permitidos INT DEFAULT NULL
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

  IF v_dep_min <= 0 OR v_dep_max <= 0 OR v_saq_min <= 0 OR v_saq_max <= 0 THEN
    RETURN json_build_object('ok', false, 'error', 'Os valores devem ser maiores que zero.');
  END IF;

  IF v_saques_dia < 1 THEN
    RETURN json_build_object('ok', false, 'error', 'Saques diários permitidos deve ser no mínimo 1.');
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
    updated_at = NOW()
  WHERE id = 1;

  RETURN json_build_object(
    'ok', true,
    'deposito_minimo', v_dep_min,
    'deposito_maximo', v_dep_max,
    'saque_minimo', v_saq_min,
    'saque_maximo', v_saq_max,
    'saques_diarios_permitidos', v_saques_dia
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.obter_config_plataforma() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_config_plataforma_admin(NUMERIC, NUMERIC, NUMERIC, NUMERIC, INT) TO authenticated;

COMMENT ON TABLE public.site_config IS 'Configurações globais do site: tema, banner superior e limites de depósito/saque';
COMMENT ON COLUMN public.site_config.deposito_minimo IS 'Valor mínimo permitido para depósitos';
COMMENT ON COLUMN public.site_config.deposito_maximo IS 'Valor máximo permitido para depósitos';
COMMENT ON COLUMN public.site_config.saque_minimo IS 'Valor mínimo permitido para saques';
COMMENT ON COLUMN public.site_config.saque_maximo IS 'Valor máximo permitido para saques';
COMMENT ON COLUMN public.site_config.saques_diarios_permitidos IS 'Número máximo de saques permitidos por dia por usuário';
