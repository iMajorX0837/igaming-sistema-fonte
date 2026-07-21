-- =============================================================================
-- VenuzBET - Instalacao completa do banco (nova casa / Supabase)
-- =============================================================================
-- COMO USAR (projeto Supabase novo, Auth habilitado):
--   1. Abra SQL Editor no Supabase
--   2. Cole TODO este arquivo e execute (Run)
--   3. Crie um usuario no site ou Auth e promova a admin:
--        UPDATE public.usuarios SET cargo = 'admin' WHERE email = 'seu@email.com';
--
-- Cobre: usuarios, depositos/saques, VIP, CMS (carrossel, atalhos, recomendados,
-- secoes, popup), identidade, jogos, gateways, cupons, roleta, Aviator, indicacao,
-- admin panel, webhooks, tracking e hardening de seguranca.
-- =============================================================================

-- =============================================================================
-- [1/67] Fase 1 — Bootstrap core
-- Fonte: VenuzBET - Front/Database/master_setup.sql
-- =============================================================================
-- =============================================================================
-- VenuzBET — Setup completo do banco (Supabase)
-- =============================================================================
-- Execute este arquivo UMA VEZ no SQL Editor do Supabase.
-- Consolida todos os scripts da pasta Database/ em ordem correta.
--
-- Tabelas: usuarios, depositos, saques, transacoes_jogos,
--          aviator_rounds, aviator_bets, aviator_velas
--
-- Requisito: projeto Supabase com Auth habilitado (auth.users).
-- =============================================================================

-- =============================================================================
-- 1. TABELAS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  cpf TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT NOT NULL,
  saldo DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  cargo TEXT DEFAULT 'usuario',
  nome TEXT,
  usuario TEXT,
  usuario_nome TEXT,
  link_indicação TEXT,
  indicado_por TEXT,
  playfiver_user_code TEXT,
  vip_nivel INT NOT NULL DEFAULT 1,
  total_depositado DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  vip_atualizado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Colunas extras (seguro re-executar em DB parcialmente migrado)
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS saldo DECIMAL(10,2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS cargo TEXT DEFAULT 'usuario';
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS nome TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS usuario TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS usuario_nome TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS link_indicação TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS indicado_por TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS playfiver_user_code TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS vip_nivel INT NOT NULL DEFAULT 1;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS total_depositado DECIMAL(12,2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS vip_atualizado_em TIMESTAMPTZ;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.usuarios.vip_nivel IS 'Nível VIP atual (1-18), baseado em total_depositado';
COMMENT ON COLUMN public.usuarios.total_depositado IS 'Soma de depósitos aprovados (lifetime)';
COMMENT ON COLUMN public.usuarios.cargo IS 'Cargo/função do usuário (admin, moderador, usuario, etc.)';

CREATE TABLE IF NOT EXISTS public.depositos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  valor DECIMAL(10,2) NOT NULL,
  data_hora TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  status TEXT NOT NULL CHECK (status IN ('aprovado', 'pendente')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS public.saques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  valor DECIMAL(10,2) NOT NULL,
  data_hora TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  status TEXT NOT NULL CHECK (status IN ('aprovado', 'rejeitado', 'pendente')),
  key TEXT,
  chave TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE public.saques ADD COLUMN IF NOT EXISTS key TEXT;
ALTER TABLE public.saques ADD COLUMN IF NOT EXISTS chave TEXT;

ALTER TABLE public.saques DROP CONSTRAINT IF EXISTS saques_key_check;
ALTER TABLE public.saques
  ADD CONSTRAINT saques_key_check
  CHECK (key IS NULL OR key IN ('email', 'cpf', 'cnpj', 'telefone', 'chave aleatória'));

COMMENT ON COLUMN public.saques.key IS 'Tipo de chave PIX: email, cpf, cnpj, telefone ou chave aleatória';
COMMENT ON COLUMN public.saques.chave IS 'Valor da chave PIX do solicitante';

CREATE TABLE IF NOT EXISTS public.transacoes_jogos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('Ganhou', 'Perdeu')),
  jogo TEXT NOT NULL,
  valor DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  retorno DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'Finalizado',
  com_bonus TEXT NOT NULL DEFAULT 'Não',
  data TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  txn_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS public.vip_niveis (
  nivel INT PRIMARY KEY CHECK (nivel >= 1 AND nivel <= 99),
  nome TEXT NOT NULL,
  grupo TEXT NOT NULL,
  subnivel INT NOT NULL DEFAULT 1,
  deposito_minimo DECIMAL(12,2) NOT NULL DEFAULT 0,
  cashback_pct DECIMAL(5,2) NOT NULL DEFAULT 0,
  bonus_upgrade DECIMAL(10,2) NOT NULL DEFAULT 0,
  imagem_url TEXT,
  cor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS public.vip_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  nivel_anterior INT NOT NULL,
  nivel_novo INT NOT NULL,
  deposito_id UUID REFERENCES public.depositos(id) ON DELETE SET NULL,
  total_depositado DECIMAL(12,2) NOT NULL,
  bonus_creditado DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS public.cms_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  secao TEXT NOT NULL CHECK (secao IN ('home_banner', 'recommended', 'promotion', 'quick_nav', 'sidebar_card')),
  nome_admin TEXT,
  titulo TEXT,
  texto TEXT,
  imagem_url TEXT,
  imagem_mobile_url TEXT,
  game_name TEXT,
  provider TEXT,
  link_tipo TEXT CHECK (link_tipo IS NULL OR link_tipo IN ('href', 'game')),
  href TEXT,
  background_color TEXT,
  bloom_color TEXT,
  outer_glow TEXT,
  text_theme TEXT CHECK (text_theme IS NULL OR text_theme IN ('light', 'dark')),
  layout TEXT CHECK (layout IS NULL OR layout IN ('single', 'double')),
  icon_type TEXT CHECK (icon_type IS NULL OR icon_type IN ('emoji', 'image', 'iconify', 'none')),
  icon_value TEXT,
  icon_alt TEXT,
  labels JSONB NOT NULL DEFAULT '{}'::jsonb,
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  CONSTRAINT cms_items_quick_nav_link CHECK (
    secao <> 'quick_nav'
    OR (link_tipo = 'href' AND href IS NOT NULL AND btrim(href) <> '')
    OR (link_tipo = 'game' AND game_name IS NOT NULL AND btrim(game_name) <> '')
  ),
  CONSTRAINT cms_items_sidebar_card_link CHECK (
    secao <> 'sidebar_card'
    OR (href IS NOT NULL AND btrim(href) <> '' AND nome_admin IS NOT NULL AND btrim(nome_admin) <> '')
  )
);

CREATE TABLE IF NOT EXISTS public.site_config (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  header_fundo TEXT NOT NULL DEFAULT '#121319',
  header_logo_url TEXT NOT NULL DEFAULT '/assets/logo.png',
  footer_fundo TEXT NOT NULL DEFAULT '#121319',
  home_fundo TEXT NOT NULL DEFAULT '#121319',
  sidebar_fundo TEXT NOT NULL DEFAULT '#121319',
  sidebar_item_fundo TEXT NOT NULL DEFAULT '#181923',
  sidebar_idioma_ativo_fundo TEXT NOT NULL DEFAULT '#2a1f45',
  top_banner_ativo BOOLEAN NOT NULL DEFAULT true,
  top_banner_background_color TEXT NOT NULL DEFAULT '#7B3FF2',
  top_banner_emoji TEXT NOT NULL DEFAULT '📲',
  top_banner_mensagem TEXT NOT NULL DEFAULT 'Faça o download do nosso aplicativo para uma experiência ainda melhor!',
  top_banner_botao_texto TEXT NOT NULL DEFAULT 'Download',
  top_banner_botao_href TEXT NOT NULL DEFAULT '/help/mobile',
  top_banner_botao_cor_fundo TEXT NOT NULL DEFAULT '#FFFFFF',
  top_banner_botao_cor_texto TEXT NOT NULL DEFAULT '#0f172a',
  top_banner_permitir_fechar BOOLEAN NOT NULL DEFAULT true,
  deposito_minimo NUMERIC(12,2) NOT NULL DEFAULT 20,
  deposito_maximo NUMERIC(12,2) NOT NULL DEFAULT 1000000,
  saque_minimo NUMERIC(12,2) NOT NULL DEFAULT 50,
  saque_maximo NUMERIC(12,2) NOT NULL DEFAULT 1000000,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS public.all_games_page_config (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  titulo TEXT NOT NULL DEFAULT 'Todos os jogos',
  jogos_por_pagina INT NOT NULL DEFAULT 18 CHECK (jogos_por_pagina > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS public.all_games_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  api_provider_id INT,
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS public.all_games_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS public.home_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('estudios', 'recomendados', 'jogos_pg', 'jogos_mesa', 'jogos_turbo')),
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  view_all_link TEXT,
  use_green_button BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_vip_historico_usuario ON public.vip_historico(usuario_id);

CREATE INDEX IF NOT EXISTS idx_cms_items_secao_ordem ON public.cms_items(secao, ordem ASC);
CREATE INDEX IF NOT EXISTS idx_cms_items_secao_ativo ON public.cms_items(secao, ativo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_all_games_providers_ordem ON public.all_games_providers(ordem ASC);
CREATE INDEX IF NOT EXISTS idx_all_games_providers_ativo ON public.all_games_providers(ativo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_all_games_categories_ordem ON public.all_games_categories(ordem ASC);
CREATE INDEX IF NOT EXISTS idx_all_games_categories_ativo ON public.all_games_categories(ativo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_home_sections_ordem ON public.home_sections(ordem ASC);
CREATE INDEX IF NOT EXISTS idx_home_sections_ativo ON public.home_sections(ativo) WHERE ativo = true;

INSERT INTO public.vip_niveis (nivel, nome, grupo, subnivel, deposito_minimo, cashback_pct, bonus_upgrade, imagem_url, cor)
VALUES
  (1,  'Bronze 1',     'bronze',    1, 0,       0.00, 0,    'https://cdn.royalbetsolutions.com/default/vip/bronze.webp',    'rgb(255, 146, 17)'),
  (2,  'Bronze 2',     'bronze',    2, 100,     0.00, 0,    'https://cdn.royalbetsolutions.com/default/vip/bronze.webp',    'rgb(255, 146, 17)'),
  (3,  'Bronze 3',     'bronze',    3, 300,     0.00, 0,    'https://cdn.royalbetsolutions.com/default/vip/bronze.webp',    'rgb(255, 146, 17)'),
  (4,  'Prata 1',      'prata',     1, 600,     0.30, 5,    'https://cdn.royalbetsolutions.com/default/vip/prata.webp',     'rgb(192, 192, 192)'),
  (5,  'Prata 2',      'prata',     2, 1000,    0.40, 10,   'https://cdn.royalbetsolutions.com/default/vip/prata.webp',     'rgb(192, 192, 192)'),
  (6,  'Prata 3',      'prata',     3, 2000,    0.50, 15,   'https://cdn.royalbetsolutions.com/default/vip/prata.webp',     'rgb(192, 192, 192)'),
  (7,  'Ouro 1',       'ouro',      1, 5000,    0.80, 25,   'https://cdn.royalbetsolutions.com/default/vip/ouro.webp',      'rgb(255, 192, 0)'),
  (8,  'Ouro 2',       'ouro',      2, 10000,   1.00, 50,   'https://cdn.royalbetsolutions.com/default/vip/ouro.webp',      'rgb(255, 192, 0)'),
  (9,  'Ouro 3',       'ouro',      3, 20000,   1.20, 100,  'https://cdn.royalbetsolutions.com/default/vip/ouro.webp',      'rgb(255, 192, 0)'),
  (10, 'Rubi 1',       'rubi',      1, 35000,   1.50, 150,  'https://cdn.royalbetsolutions.com/default/vip/rubi.webp',      'rgb(255, 60, 55)'),
  (11, 'Rubi 2',       'rubi',      2, 50000,   1.80, 250,  'https://cdn.royalbetsolutions.com/default/vip/rubi.webp',      'rgb(255, 60, 55)'),
  (12, 'Rubi 3',       'rubi',      3, 75000,   2.00, 500,  'https://cdn.royalbetsolutions.com/default/vip/rubi.webp',      'rgb(255, 60, 55)'),
  (13, 'Esmeralda 1',  'esmeralda', 1, 100000,  2.50, 750,  'https://cdn.royalbetsolutions.com/default/vip/esmeralda.webp', 'rgb(2, 210, 106)'),
  (14, 'Esmeralda 2',  'esmeralda', 2, 150000,  3.00, 1000, 'https://cdn.royalbetsolutions.com/default/vip/esmeralda.webp', 'rgb(2, 210, 106)'),
  (15, 'Esmeralda 3',  'esmeralda', 3, 250000,  3.50, 2000, 'https://cdn.royalbetsolutions.com/default/vip/esmeralda.webp', 'rgb(2, 210, 106)'),
  (16, 'Diamante 1',   'diamante',  1, 400000,  5.00, 3000, 'https://cdn.royalbetsolutions.com/default/vip/diamante.webp',  'rgb(11, 167, 254)'),
  (17, 'Diamante 2',   'diamante',  2, 600000,  6.50, 5000, 'https://cdn.royalbetsolutions.com/default/vip/diamante.webp',  'rgb(11, 167, 254)'),
  (18, 'Diamante 3',   'diamante',  3, 1000000, 8.00, 10000,'https://cdn.royalbetsolutions.com/default/vip/diamante.webp',  'rgb(11, 167, 254)')
ON CONFLICT (nivel) DO NOTHING;

INSERT INTO public.cms_items (id, secao, titulo, imagem_url, ordem, ativo)
VALUES
  ('a1111111-1111-1111-1111-111111111101', 'home_banner', 'Banner 1', 'https://royal-images.s3.us-east-1.amazonaws.com/royalbetsolutions-com-images/images/1757718140707.png', 1, true),
  ('a1111111-1111-1111-1111-111111111102', 'home_banner', 'Banner 2', 'https://royal-images.s3.us-east-1.amazonaws.com/royalbetsolutions-com-images/images/1757718148455.png', 2, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.cms_items (id, secao, titulo, imagem_url, imagem_mobile_url, game_name, provider, ordem, ativo)
VALUES
  ('c1111111-1111-1111-1111-111111111101', 'recommended', 'Banner 1', 'https://royal-images.s3.us-east-1.amazonaws.com/royalbetsolutions-com-images/images/1757717288225.avif', 'https://royal-images.s3.us-east-1.amazonaws.com/royalbetsolutions-com-images/images/1757717288225.avif', 'Aviator', 'Spribe', 1, true),
  ('c1111111-1111-1111-1111-111111111102', 'recommended', 'Banner 2', 'https://royal-images.s3.us-east-1.amazonaws.com/royalbetsolutions-com-images/images/1757717475647.avif', 'https://royal-images.s3.us-east-1.amazonaws.com/royalbetsolutions-com-images/images/1757717475647.avif', 'Fortune Rabbit', 'Pgsoft', 2, true),
  ('c1111111-1111-1111-1111-111111111103', 'recommended', 'Banner 3', 'https://royal-images.s3.us-east-1.amazonaws.com/royalbetsolutions-com-images/images/1757717511316.avif', 'https://royal-images.s3.us-east-1.amazonaws.com/royalbetsolutions-com-images/images/1757717511316.avif', 'Fortune Tiger', 'Pgsoft', 3, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.cms_items (
  id, secao, nome_admin, href, ordem, ativo,
  background_color, bloom_color, outer_glow, text_theme, layout,
  icon_type, icon_value, icon_alt, labels
)
VALUES
  (
    'b1111111-1111-1111-1111-111111111101',
    'sidebar_card',
    'Indique um Amigo',
    '/help/referral',
    1,
    true,
    '#FFDC16',
    '#FFF566',
    'rgba(255, 220, 22, 0.42)',
    'dark',
    'double',
    'emoji',
    '🎁',
    NULL,
    '{"pt":{"line1":"Indique um amigo e","line2":"GANHE R$ 15 GRÁTIS"},"en":{"line1":"Refer a friend and","line2":"GET R$ 15 FREE"},"es":{"line1":"Invita a un amigo y","line2":"GANA R$ 15 GRÁTIS"}}'::jsonb
  ),
  (
    'b1111111-1111-1111-1111-111111111102',
    'sidebar_card',
    'Instale o App',
    '/help/mobile',
    2,
    true,
    '#6212A5',
    '#C084FC',
    'rgba(98, 18, 165, 0.48)',
    'light',
    'double',
    'image',
    'https://venuz.bet/_ipx/f_webp/assets/icons/smartphone.svg',
    'Smartphone',
    '{"pt":{"line1":"Instale nosso app e","line2":"GANHE BENEFÍCIOS"},"en":{"line1":"Install our app and","line2":"GET BENEFITS"},"es":{"line1":"Instala nuestra app y","line2":"OBTÉN BENEFICIOS"}}'::jsonb
  ),
  (
    'b1111111-1111-1111-1111-111111111103',
    'sidebar_card',
    'Suporte Ao Vivo',
    '/help/support',
    3,
    true,
    '#15803d',
    '#4ADE80',
    'rgba(21, 128, 61, 0.48)',
    'light',
    'single',
    'iconify',
    'ph:headset-duotone',
    NULL,
    '{"pt":{"line1":"Suporte Ao Vivo","line2":null},"en":{"line1":"Live Support","line2":null},"es":{"line1":"Soporte en Vivo","line2":null}}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.site_config (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.all_games_page_config (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.all_games_providers (id, slug, nome, api_provider_id, ordem, ativo)
VALUES
  ('c1111111-1111-1111-1111-111111111101', 'all', 'Todos', NULL, 1, true),
  ('c1111111-1111-1111-1111-111111111102', 'venuzbet', 'RoyalBet Originais', NULL, 2, true),
  ('c1111111-1111-1111-1111-111111111103', 'pgsoft', 'PG Soft', 1, 3, true),
  ('c1111111-1111-1111-1111-111111111104', 'pragmatic', 'Pragmatic Play', NULL, 4, true),
  ('c1111111-1111-1111-1111-111111111105', 'pragmaticlive', 'Pragmatic Live', NULL, 5, true),
  ('c1111111-1111-1111-1111-111111111106', 'netent', 'NetEnt', NULL, 6, true),
  ('c1111111-1111-1111-1111-111111111107', 'evolution', 'Evolution Gaming', NULL, 7, true),
  ('c1111111-1111-1111-1111-111111111108', 'redtiger', 'Red Tiger', NULL, 8, true),
  ('c1111111-1111-1111-1111-111111111109', 'playson', 'Playson', NULL, 9, true),
  ('c1111111-1111-1111-1111-111111111110', 'habanero', 'Habanero', NULL, 10, true),
  ('c1111111-1111-1111-1111-111111111111', 'spribe', 'Spribe', NULL, 11, true),
  ('c1111111-1111-1111-1111-111111111112', 'evoplay', 'Evoplay', NULL, 12, true),
  ('c1111111-1111-1111-1111-111111111113', 'bgaming', 'BGaming', NULL, 13, true),
  ('c1111111-1111-1111-1111-111111111114', 'ezugi', 'Ezugi', NULL, 14, true),
  ('c1111111-1111-1111-1111-111111111115', 'cgames', 'C Games', NULL, 15, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.all_games_categories (id, slug, nome, ordem, ativo)
VALUES
  ('d1111111-1111-1111-1111-111111111101', 'all', 'Todos', 1, true),
  ('d1111111-1111-1111-1111-111111111102', 'slots', 'Slots', 2, true),
  ('d1111111-1111-1111-1111-111111111103', 'live', 'Cassino Ao Vivo', 3, true),
  ('d1111111-1111-1111-1111-111111111104', 'table', 'Jogos de Mesa', 4, true),
  ('d1111111-1111-1111-1111-111111111105', 'crash', 'Crash Games', 5, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.home_sections (id, slug, titulo, tipo, ordem, ativo, view_all_link, use_green_button)
VALUES
  ('e1111111-1111-1111-1111-111111111101', 'recomendados', 'Recomendados', 'recomendados', 1, true, NULL, false),
  ('e1111111-1111-1111-1111-111111111102', 'jogos-pg', 'Jogos da PG', 'jogos_pg', 2, true, '/list/mais-jogados', false),
  ('e1111111-1111-1111-1111-111111111103', 'jogos-mesa', 'Jogos de Mesa', 'jogos_mesa', 3, true, '/list/pg-soft', false),
  ('e1111111-1111-1111-1111-111111111104', 'jogos-turbo', 'Jogos Turbo', 'jogos_turbo', 4, true, '/list/pragmatic-play', true),
  ('e1111111-1111-1111-1111-111111111105', 'estudios', 'Estúdios', 'estudios', 5, true, '/providers', false)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.aviator_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_number BIGSERIAL,
  external_round_id BIGINT,
  target_multiplier DECIMAL(10,2) NOT NULL,
  final_multiplier DECIMAL(10,2),
  server_seed TEXT,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'flying', 'crashed')),
  started_at TIMESTAMPTZ,
  crashed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS public.aviator_bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES public.aviator_rounds(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  bet_slot SMALLINT NOT NULL DEFAULT 1,
  bet_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  cashout_multiplier DECIMAL(10,2),
  profit DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cashed_out', 'crashed')),
  placed_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  cashed_out_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS public.aviator_velas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID REFERENCES public.aviator_rounds(id) ON DELETE SET NULL,
  external_round_id BIGINT,
  multiplier DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- =============================================================================
-- 2. ÍNDICES
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS usuarios_cpf_idx ON public.usuarios(cpf);
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_email_idx ON public.usuarios(email);
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_link_indicacao_idx ON public.usuarios(link_indicação);
CREATE INDEX IF NOT EXISTS usuarios_indicado_por_idx ON public.usuarios(indicado_por);
CREATE INDEX IF NOT EXISTS usuarios_cargo_idx ON public.usuarios(cargo) WHERE cargo IS NOT NULL;
CREATE INDEX IF NOT EXISTS usuarios_nome_idx ON public.usuarios(nome) WHERE nome IS NOT NULL;
CREATE INDEX IF NOT EXISTS usuarios_usuario_idx ON public.usuarios(usuario) WHERE usuario IS NOT NULL;
CREATE INDEX IF NOT EXISTS usuarios_usuario_nome_idx ON public.usuarios(usuario_nome) WHERE usuario_nome IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_playfiver_user_code_idx ON public.usuarios(playfiver_user_code);
CREATE INDEX IF NOT EXISTS usuarios_playfiver_user_code_idx2 ON public.usuarios(playfiver_user_code) WHERE playfiver_user_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS depositos_usuario_id_idx ON public.depositos(usuario_id);
CREATE INDEX IF NOT EXISTS depositos_data_hora_idx ON public.depositos(data_hora DESC);
CREATE INDEX IF NOT EXISTS depositos_status_idx ON public.depositos(status);

CREATE INDEX IF NOT EXISTS saques_usuario_id_idx ON public.saques(usuario_id);
CREATE INDEX IF NOT EXISTS saques_data_hora_idx ON public.saques(data_hora DESC);
CREATE INDEX IF NOT EXISTS saques_status_idx ON public.saques(status);

CREATE INDEX IF NOT EXISTS transacoes_jogos_usuario_id_idx ON public.transacoes_jogos(usuario_id);
CREATE INDEX IF NOT EXISTS transacoes_jogos_txn_id_idx ON public.transacoes_jogos(txn_id);
CREATE INDEX IF NOT EXISTS transacoes_jogos_data_idx ON public.transacoes_jogos(data DESC);
CREATE INDEX IF NOT EXISTS transacoes_jogos_tipo_idx ON public.transacoes_jogos(tipo);

CREATE INDEX IF NOT EXISTS aviator_rounds_status_idx ON public.aviator_rounds(status);
CREATE INDEX IF NOT EXISTS aviator_rounds_created_at_idx ON public.aviator_rounds(created_at DESC);
CREATE INDEX IF NOT EXISTS aviator_rounds_round_number_idx ON public.aviator_rounds(round_number DESC);

CREATE INDEX IF NOT EXISTS aviator_bets_round_id_idx ON public.aviator_bets(round_id);
CREATE INDEX IF NOT EXISTS aviator_bets_usuario_id_idx ON public.aviator_bets(usuario_id);
CREATE INDEX IF NOT EXISTS aviator_bets_status_idx ON public.aviator_bets(status);
CREATE INDEX IF NOT EXISTS aviator_bets_placed_at_idx ON public.aviator_bets(placed_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS aviator_rounds_external_round_id_idx ON public.aviator_rounds(external_round_id) WHERE external_round_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS aviator_bets_round_user_slot_idx ON public.aviator_bets(round_id, usuario_id, bet_slot);
CREATE INDEX IF NOT EXISTS aviator_velas_external_round_id_idx ON public.aviator_velas(external_round_id) WHERE external_round_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS aviator_velas_round_id_idx ON public.aviator_velas(round_id);
CREATE INDEX IF NOT EXISTS aviator_velas_created_at_idx ON public.aviator_velas(created_at DESC);
CREATE INDEX IF NOT EXISTS aviator_velas_multiplier_idx ON public.aviator_velas(multiplier);
CREATE UNIQUE INDEX IF NOT EXISTS aviator_velas_round_id_unique_idx ON public.aviator_velas(round_id) WHERE round_id IS NOT NULL;

-- =============================================================================
-- 3. FUNÇÕES
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_updated_at_depositos()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_updated_at_saques()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.handle_updated_at_aviator_rounds()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql;

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

CREATE OR REPLACE FUNCTION public.handle_saque_rejeitado()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'rejeitado' AND OLD.status != 'rejeitado' THEN
    UPDATE public.usuarios
    SET saldo = saldo + NEW.valor
    WHERE id = NEW.usuario_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.insert_aviator_vela()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'crashed' AND NEW.final_multiplier IS NOT NULL THEN
    INSERT INTO public.aviator_velas (round_id, multiplier)
    VALUES (NEW.id, NEW.final_multiplier)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

CREATE OR REPLACE FUNCTION public.subtrair_saldo_saque(
  p_usuario_id UUID,
  p_valor_saque NUMERIC
)
RETURNS JSON AS $$
DECLARE
  v_saldo_atual NUMERIC;
  v_novo_saldo NUMERIC;
BEGIN
  SELECT saldo INTO v_saldo_atual
  FROM public.usuarios
  WHERE id = p_usuario_id;

  IF v_saldo_atual IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  IF v_saldo_atual < p_valor_saque THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Saldo insuficiente',
      'saldo_atual', v_saldo_atual,
      'valor_saque', p_valor_saque
    );
  END IF;

  v_novo_saldo := v_saldo_atual - p_valor_saque;

  UPDATE public.usuarios
  SET saldo = v_novo_saldo
  WHERE id = p_usuario_id;

  RETURN json_build_object(
    'success', true,
    'saldo_anterior', v_saldo_atual,
    'saldo_atual', v_novo_saldo,
    'valor_saque', p_valor_saque
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.atualizar_saldo_usuario(
  p_usuario_id UUID,
  p_novo_saldo NUMERIC
)
RETURNS JSON AS $$
DECLARE
  v_saldo_anterior NUMERIC;
BEGIN
  SELECT saldo INTO v_saldo_anterior
  FROM public.usuarios
  WHERE id = p_usuario_id;

  IF v_saldo_anterior IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  IF p_novo_saldo < 0 THEN
    RETURN json_build_object('success', false, 'error', 'O saldo não pode ser negativo');
  END IF;

  UPDATE public.usuarios
  SET saldo = p_novo_saldo
  WHERE id = p_usuario_id;

  RETURN json_build_object(
    'success', true,
    'saldo_anterior', v_saldo_anterior,
    'saldo_atual', p_novo_saldo
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.calcular_vip_nivel(p_total_depositado numeric)
RETURNS int
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(MAX(nivel), 1)::int
  FROM public.vip_niveis
  WHERE deposito_minimo <= COALESCE(p_total_depositado, 0);
$$;

CREATE OR REPLACE FUNCTION public.processar_vip_deposito(
  p_usuario_id uuid,
  p_deposito_id uuid,
  p_valor numeric
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.obter_vip_usuario()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.confirmar_deposito_pix_pago(p_deposito_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_valor numeric;
  v_status text;
  v_usuario_id uuid;
  v_vip json;
  v_nivel int;
  v_total numeric;
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
    SELECT vip_nivel, total_depositado INTO v_nivel, v_total FROM public.usuarios WHERE id = v_usuario_id;
    RETURN json_build_object(
      'ok', true, 'already', true,
      'vip_nivel', COALESCE(v_nivel, 1),
      'total_depositado', COALESCE(v_total, 0),
      'subiu_nivel', false,
      'bonus_upgrade', 0
    );
  END IF;

  IF v_status != 'pendente' THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_status');
  END IF;

  UPDATE public.depositos SET status = 'aprovado' WHERE id = p_deposito_id;
  UPDATE public.usuarios SET saldo = saldo + v_valor WHERE id = v_usuario_id;

  v_vip := public.processar_vip_deposito(v_usuario_id, p_deposito_id, v_valor);

  RETURN (json_build_object('ok', true, 'already', false)::jsonb || COALESCE(v_vip, '{}'::json)::jsonb)::json;
END;
$$;

CREATE OR REPLACE FUNCTION public.count_qualified_referrals(referral_code_param TEXT)
RETURNS INTEGER AS $$
DECLARE
  qualified_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT u.id) INTO qualified_count
  FROM public.usuarios u
  INNER JOIN public.depositos d ON d.usuario_id = u.id
  WHERE u.indicado_por = referral_code_param
    AND d.status = 'aprovado'
    AND d.valor >= 50.00;

  RETURN COALESCE(qualified_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_by_email(user_email TEXT)
RETURNS TABLE (
  id UUID,
  saldo DECIMAL(10,2),
  email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.saldo, u.email
  FROM public.usuarios u
  WHERE LOWER(TRIM(u.email)) = LOWER(TRIM(user_email))
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_cargo TEXT;
BEGIN
  SELECT cargo INTO user_cargo
  FROM public.usuarios
  WHERE id = auth.uid();

  RETURN user_cargo = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_current_admin_user()
RETURNS TABLE (
  id UUID,
  email TEXT,
  cargo TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email, u.cargo
  FROM public.usuarios u
  WHERE u.id = auth.uid() AND u.cargo = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.get_user_cargo()
RETURNS TEXT AS $$
DECLARE
  user_cargo TEXT;
BEGIN
  SELECT cargo INTO user_cargo
  FROM public.usuarios
  WHERE id = auth.uid();

  RETURN COALESCE(user_cargo, 'usuario');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.check_user_is_admin(user_id UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  cargo TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email, u.cargo
  FROM public.usuarios u
  WHERE u.id = user_id AND u.cargo = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

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
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  v_cargo := LOWER(TRIM(COALESCE(p_cargo, 'moderador')));

  IF v_cargo NOT IN ('admin', 'moderador', 'suporte') THEN
    RAISE EXCEPTION 'Função inválida. Use: admin, moderador ou suporte';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = p_usuario_id AND cargo IN ('admin', 'moderador', 'suporte')
  ) THEN
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
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF p_usuario_id = auth.uid() THEN
    RETURN json_build_object('ok', false, 'error', 'Você não pode remover a si mesmo da equipe.');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = p_usuario_id AND cargo IN ('admin', 'moderador', 'suporte')
  ) THEN
    RETURN json_build_object('ok', false, 'error', 'Membro da equipe não encontrado.');
  END IF;

  UPDATE public.usuarios
  SET cargo = 'usuario', ativo = true, updated_at = NOW()
  WHERE id = p_usuario_id;

  RETURN json_build_object('ok', true);
END;
$$;

-- =============================================================================
-- 4. TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS set_updated_at ON public.usuarios;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS set_updated_at_depositos ON public.depositos;
CREATE TRIGGER set_updated_at_depositos
  BEFORE UPDATE ON public.depositos
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at_depositos();

DROP TRIGGER IF EXISTS set_updated_at_saques ON public.saques;
CREATE TRIGGER set_updated_at_saques
  BEFORE UPDATE ON public.saques
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at_saques();

DROP TRIGGER IF EXISTS devolver_valor_saque_rejeitado ON public.saques;
CREATE TRIGGER devolver_valor_saque_rejeitado
  AFTER UPDATE ON public.saques
  FOR EACH ROW
  WHEN (NEW.status = 'rejeitado' AND OLD.status != 'rejeitado')
  EXECUTE FUNCTION public.handle_saque_rejeitado();

DROP TRIGGER IF EXISTS set_updated_at_aviator_rounds ON public.aviator_rounds;
CREATE TRIGGER set_updated_at_aviator_rounds
  BEFORE UPDATE ON public.aviator_rounds
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at_aviator_rounds();

DROP TRIGGER IF EXISTS trigger_insert_aviator_vela ON public.aviator_rounds;
CREATE TRIGGER trigger_insert_aviator_vela
  AFTER UPDATE ON public.aviator_rounds
  FOR EACH ROW
  WHEN (NEW.status = 'crashed' AND OLD.status != 'crashed')
  EXECUTE FUNCTION public.insert_aviator_vela();

-- =============================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.depositos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saques ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacoes_jogos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aviator_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aviator_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aviator_velas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vip_niveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vip_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.all_games_page_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.all_games_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.all_games_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_sections ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 6. POLÍTICAS RLS
-- =============================================================================

-- usuarios
DROP POLICY IF EXISTS "Usuários podem ver apenas seus próprios dados" ON public.usuarios;
DROP POLICY IF EXISTS "Usuários podem atualizar apenas seus próprios dados" ON public.usuarios;
DROP POLICY IF EXISTS "Usuários podem ver seus dados e indicações" ON public.usuarios;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios dados" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_select_own" ON public.usuarios;

CREATE POLICY "Usuários podem ver seus dados e indicações"
  ON public.usuarios
  FOR SELECT
  USING (
    auth.uid() = id
    OR (
      indicado_por IS NOT NULL
      AND public.get_current_user_referral_code() IS NOT NULL
      AND indicado_por = public.get_current_user_referral_code()
    )
  );

CREATE POLICY "Usuários podem atualizar seus próprios dados"
  ON public.usuarios
  FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admin pode gerenciar usuários" ON public.usuarios;

CREATE POLICY "Admin pode gerenciar usuários"
  ON public.usuarios FOR UPDATE
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

-- depositos
DROP POLICY IF EXISTS "Usuários podem ver apenas seus próprios depósitos" ON public.depositos;
DROP POLICY IF EXISTS "Usuários podem inserir apenas seus próprios depósitos" ON public.depositos;

CREATE POLICY "Usuários podem ver apenas seus próprios depósitos"
  ON public.depositos
  FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem inserir apenas seus próprios depósitos"
  ON public.depositos
  FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

-- saques
DROP POLICY IF EXISTS "Usuários podem ver apenas seus próprios saques" ON public.saques;
DROP POLICY IF EXISTS "Usuários podem inserir apenas seus próprios saques" ON public.saques;

CREATE POLICY "Usuários podem ver apenas seus próprios saques"
  ON public.saques
  FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem inserir apenas seus próprios saques"
  ON public.saques
  FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

-- transacoes_jogos
DROP POLICY IF EXISTS "Usuários podem ver apenas suas próprias transações de jogos" ON public.transacoes_jogos;
DROP POLICY IF EXISTS "Permitir inserção de transações via service role" ON public.transacoes_jogos;

CREATE POLICY "Usuários podem ver apenas suas próprias transações de jogos"
  ON public.transacoes_jogos
  FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Permitir inserção de transações via service role"
  ON public.transacoes_jogos
  FOR INSERT
  WITH CHECK (true);

-- aviator_rounds
DROP POLICY IF EXISTS "Todos podem ver rodadas do Aviator" ON public.aviator_rounds;
DROP POLICY IF EXISTS "Apenas service role pode criar/atualizar rodadas" ON public.aviator_rounds;

CREATE POLICY "Todos podem ver rodadas do Aviator"
  ON public.aviator_rounds
  FOR SELECT
  USING (true);

CREATE POLICY "Apenas service role pode criar/atualizar rodadas"
  ON public.aviator_rounds
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- aviator_bets
DROP POLICY IF EXISTS "Usuários podem ver apenas suas próprias apostas" ON public.aviator_bets;
DROP POLICY IF EXISTS "Usuários podem criar suas próprias apostas" ON public.aviator_bets;
DROP POLICY IF EXISTS "Service role pode gerenciar todas as apostas" ON public.aviator_bets;

CREATE POLICY "Usuários podem ver apenas suas próprias apostas"
  ON public.aviator_bets
  FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Usuários podem criar suas próprias apostas"
  ON public.aviator_bets
  FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Service role pode gerenciar todas as apostas"
  ON public.aviator_bets
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- aviator_velas
DROP POLICY IF EXISTS "Todos podem ver velas do Aviator" ON public.aviator_velas;
DROP POLICY IF EXISTS "Service role pode inserir velas" ON public.aviator_velas;

CREATE POLICY "Todos podem ver velas do Aviator"
  ON public.aviator_velas
  FOR SELECT
  USING (true);

CREATE POLICY "Service role pode inserir velas"
  ON public.aviator_velas
  FOR INSERT
  WITH CHECK (true);

-- vip_niveis
DROP POLICY IF EXISTS "Todos podem ver níveis VIP" ON public.vip_niveis;
DROP POLICY IF EXISTS "Admin pode gerenciar níveis VIP" ON public.vip_niveis;

CREATE POLICY "Todos podem ver níveis VIP"
  ON public.vip_niveis FOR SELECT USING (true);

CREATE POLICY "Admin pode gerenciar níveis VIP"
  ON public.vip_niveis FOR ALL
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

-- vip_historico
DROP POLICY IF EXISTS "Usuários veem próprio histórico VIP" ON public.vip_historico;
DROP POLICY IF EXISTS "Admin vê todo histórico VIP" ON public.vip_historico;

CREATE POLICY "Usuários veem próprio histórico VIP"
  ON public.vip_historico FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "Admin vê todo histórico VIP"
  ON public.vip_historico FOR SELECT USING (public.is_user_admin());

-- cms_items
DROP POLICY IF EXISTS "Publico ve cms items ativos" ON public.cms_items;
DROP POLICY IF EXISTS "Admin gerencia cms items" ON public.cms_items;

CREATE POLICY "Publico ve cms items ativos"
  ON public.cms_items FOR SELECT USING (ativo = true);

CREATE POLICY "Admin gerencia cms items"
  ON public.cms_items FOR ALL
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

-- site_config
DROP POLICY IF EXISTS "Todos podem ver config do site" ON public.site_config;
DROP POLICY IF EXISTS "Admin pode gerenciar config do site" ON public.site_config;

CREATE POLICY "Todos podem ver config do site"
  ON public.site_config FOR SELECT USING (true);

CREATE POLICY "Admin pode gerenciar config do site"
  ON public.site_config FOR ALL
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

-- all_games_page
DROP POLICY IF EXISTS "Todos podem ver config todos jogos" ON public.all_games_page_config;
DROP POLICY IF EXISTS "Admin pode gerenciar config todos jogos" ON public.all_games_page_config;
DROP POLICY IF EXISTS "Todos podem ver providers todos jogos ativos" ON public.all_games_providers;
DROP POLICY IF EXISTS "Admin pode gerenciar providers todos jogos" ON public.all_games_providers;
DROP POLICY IF EXISTS "Todos podem ver categorias todos jogos ativas" ON public.all_games_categories;
DROP POLICY IF EXISTS "Admin pode gerenciar categorias todos jogos" ON public.all_games_categories;

CREATE POLICY "Todos podem ver config todos jogos"
  ON public.all_games_page_config FOR SELECT USING (true);

CREATE POLICY "Admin pode gerenciar config todos jogos"
  ON public.all_games_page_config FOR ALL
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

CREATE POLICY "Todos podem ver providers todos jogos ativos"
  ON public.all_games_providers FOR SELECT USING (ativo = true);

CREATE POLICY "Admin pode gerenciar providers todos jogos"
  ON public.all_games_providers FOR ALL
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

CREATE POLICY "Todos podem ver categorias todos jogos ativas"
  ON public.all_games_categories FOR SELECT USING (ativo = true);

CREATE POLICY "Admin pode gerenciar categorias todos jogos"
  ON public.all_games_categories FOR ALL
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

-- home_sections
DROP POLICY IF EXISTS "Todos podem ver seções ativas da home" ON public.home_sections;
DROP POLICY IF EXISTS "Admin pode gerenciar seções da home" ON public.home_sections;

CREATE POLICY "Todos podem ver seções ativas da home"
  ON public.home_sections FOR SELECT USING (ativo = true);

CREATE POLICY "Admin pode gerenciar seções da home"
  ON public.home_sections FOR ALL
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

-- =============================================================================
-- 7. PERMISSÕES (GRANTS)
-- =============================================================================

GRANT EXECUTE ON FUNCTION public.subtrair_saldo_saque(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_saldo_usuario(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirmar_deposito_pix_pago(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.obter_vip_usuario() TO authenticated;
GRANT SELECT ON public.vip_niveis TO anon, authenticated;
GRANT SELECT ON public.vip_historico TO authenticated;
GRANT SELECT ON public.cms_items TO anon, authenticated;
GRANT SELECT ON public.site_config TO anon, authenticated;
GRANT SELECT ON public.all_games_page_config TO anon, authenticated;
GRANT SELECT ON public.all_games_providers TO anon, authenticated;
GRANT SELECT ON public.all_games_categories TO anon, authenticated;
GRANT SELECT ON public.home_sections TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_by_email(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_user_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_admin_user() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_cargo() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_is_admin(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.listar_membros_equipe() TO authenticated;
GRANT EXECUTE ON FUNCTION public.adicionar_membro_equipe(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_membro_equipe(UUID, TEXT, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remover_membro_equipe(UUID) TO authenticated;

COMMENT ON FUNCTION public.subtrair_saldo_saque(UUID, NUMERIC) IS
  'Subtrai um valor do saldo do usuário ao realizar um saque. Usa SECURITY DEFINER para bypassar RLS.';

COMMENT ON FUNCTION public.atualizar_saldo_usuario(UUID, NUMERIC) IS
  'Atualiza o saldo de um usuário. Usado pelo painel administrativo.';

COMMENT ON FUNCTION public.confirmar_deposito_pix_pago(uuid) IS
  'Marca depósito como aprovado e credita saldo. Idempotente se já aprovado.';

-- =============================================================================
-- 8. DADOS INICIAIS / BACKFILL
-- =============================================================================

-- Gera link de indicação para usuários existentes sem código
UPDATE public.usuarios
SET link_indicação = public.generate_referral_code()
WHERE link_indicação IS NULL;

-- =============================================================================
-- FIM — Setup completo
-- =============================================================================
-- Para promover um usuário a admin:
--   UPDATE public.usuarios SET cargo = 'admin' WHERE email = 'seu@email.com';
-- =============================================================================

-- =============================================================================
-- [2/67] Fase 2 — Site config, CMS e home (todas as abas do admin)
-- Fonte: AdminPainel/Database/site_config.sql
-- =============================================================================
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
  footer_instagram_ativo BOOLEAN NOT NULL DEFAULT true,
  footer_instagram_url TEXT NOT NULL DEFAULT 'https://instagram.com/royalbet_oficial',
  footer_telegram_ativo BOOLEAN NOT NULL DEFAULT true,
  footer_telegram_url TEXT NOT NULL DEFAULT 'https://t.me/royalbet_oficial',
  footer_whatsapp_ativo BOOLEAN NOT NULL DEFAULT false,
  footer_whatsapp_url TEXT NOT NULL DEFAULT '',

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

-- =============================================================================
-- [3/67] Fase 2 — Site config, CMS e home (todas as abas do admin)
-- Fonte: AdminPainel/Database/cms_items.sql
-- =============================================================================
-- Itens de conteúdo do site (banners, atalhos, promoções, cards da sidebar)
-- Substitui: home_banners, recommended_banners, promotion_banners,
--            home_quick_nav_items, sidebar_promo_cards
-- Execute no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS public.cms_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  secao TEXT NOT NULL CHECK (secao IN (
    'home_banner', 'recommended', 'promotion', 'quick_nav', 'sidebar_card',
    'sidebar_category', 'sidebar_menu_item'
  )),
  nome_admin TEXT,
  titulo TEXT,
  texto TEXT,
  imagem_url TEXT,
  imagem_mobile_url TEXT,
  game_name TEXT,
  provider TEXT,
  link_tipo TEXT CHECK (link_tipo IS NULL OR link_tipo IN ('href', 'game', 'external', 'event')),
  href TEXT,
  background_color TEXT,
  bloom_color TEXT,
  outer_glow TEXT,
  text_theme TEXT CHECK (text_theme IS NULL OR text_theme IN ('light', 'dark')),
  layout TEXT CHECK (layout IS NULL OR layout IN ('single', 'double')),
  icon_type TEXT CHECK (icon_type IS NULL OR icon_type IN ('emoji', 'image', 'iconify', 'none')),
  icon_value TEXT,
  icon_alt TEXT,
  labels JSONB NOT NULL DEFAULT '{}'::jsonb,
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  CONSTRAINT cms_items_quick_nav_link CHECK (
    secao <> 'quick_nav'
    OR (
      link_tipo = 'href' AND href IS NOT NULL AND btrim(href) <> ''
    )
    OR (
      link_tipo = 'game' AND game_name IS NOT NULL AND btrim(game_name) <> ''
    )
  ),
  CONSTRAINT cms_items_sidebar_card_link CHECK (
    secao <> 'sidebar_card'
    OR (
      href IS NOT NULL AND btrim(href) <> ''
      AND nome_admin IS NOT NULL AND btrim(nome_admin) <> ''
    )
  ),
  categoria_slug TEXT,
  category_tipo TEXT,
  destaque BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT cms_items_sidebar_category_check CHECK (
    secao <> 'sidebar_category'
    OR (
      titulo IS NOT NULL AND btrim(titulo) <> ''
      AND nome_admin IS NOT NULL AND btrim(nome_admin) <> ''
      AND category_tipo IN ('menu', 'language')
    )
  ),
  CONSTRAINT cms_items_sidebar_menu_item_check CHECK (
    secao <> 'sidebar_menu_item'
    OR (
      categoria_slug IS NOT NULL AND btrim(categoria_slug) <> ''
      AND nome_admin IS NOT NULL AND btrim(nome_admin) <> ''
      AND link_tipo IN ('href', 'game', 'external', 'event')
    )
  )
);

-- Atualiza tabela existente (quem já rodou versão anterior)
ALTER TABLE public.cms_items ALTER COLUMN imagem_url DROP NOT NULL;

ALTER TABLE public.cms_items
  ADD COLUMN IF NOT EXISTS background_color TEXT;
ALTER TABLE public.cms_items
  ADD COLUMN IF NOT EXISTS bloom_color TEXT;
ALTER TABLE public.cms_items
  ADD COLUMN IF NOT EXISTS outer_glow TEXT;
ALTER TABLE public.cms_items
  ADD COLUMN IF NOT EXISTS text_theme TEXT;
ALTER TABLE public.cms_items
  ADD COLUMN IF NOT EXISTS layout TEXT;
ALTER TABLE public.cms_items
  ADD COLUMN IF NOT EXISTS icon_type TEXT;
ALTER TABLE public.cms_items
  ADD COLUMN IF NOT EXISTS icon_value TEXT;
ALTER TABLE public.cms_items
  ADD COLUMN IF NOT EXISTS icon_alt TEXT;
ALTER TABLE public.cms_items
  ADD COLUMN IF NOT EXISTS labels JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.cms_items
  ADD COLUMN IF NOT EXISTS categoria_slug TEXT;
ALTER TABLE public.cms_items
  ADD COLUMN IF NOT EXISTS category_tipo TEXT;
ALTER TABLE public.cms_items
  ADD COLUMN IF NOT EXISTS destaque BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.cms_items DROP CONSTRAINT IF EXISTS cms_items_link_tipo_check;
ALTER TABLE public.cms_items
  ADD CONSTRAINT cms_items_link_tipo_check
  CHECK (link_tipo IS NULL OR link_tipo IN ('href', 'game', 'external', 'event'));

ALTER TABLE public.cms_items DROP CONSTRAINT IF EXISTS cms_items_secao_check;
ALTER TABLE public.cms_items
  ADD CONSTRAINT cms_items_secao_check
  CHECK (secao IN (
    'home_banner', 'recommended', 'promotion', 'quick_nav', 'sidebar_card',
    'sidebar_category', 'sidebar_menu_item'
  ));

ALTER TABLE public.cms_items DROP CONSTRAINT IF EXISTS cms_items_sidebar_card_link;
ALTER TABLE public.cms_items
  ADD CONSTRAINT cms_items_sidebar_card_link CHECK (
    secao <> 'sidebar_card'
    OR (
      href IS NOT NULL AND btrim(href) <> ''
      AND nome_admin IS NOT NULL AND btrim(nome_admin) <> ''
    )
  );

ALTER TABLE public.cms_items DROP CONSTRAINT IF EXISTS cms_items_sidebar_category_check;
ALTER TABLE public.cms_items
  ADD CONSTRAINT cms_items_sidebar_category_check CHECK (
    secao <> 'sidebar_category'
    OR (
      titulo IS NOT NULL AND btrim(titulo) <> ''
      AND nome_admin IS NOT NULL AND btrim(nome_admin) <> ''
      AND category_tipo IN ('menu', 'language')
    )
  );

ALTER TABLE public.cms_items DROP CONSTRAINT IF EXISTS cms_items_sidebar_menu_item_check;
ALTER TABLE public.cms_items
  ADD CONSTRAINT cms_items_sidebar_menu_item_check CHECK (
    secao <> 'sidebar_menu_item'
    OR (
      categoria_slug IS NOT NULL AND btrim(categoria_slug) <> ''
      AND nome_admin IS NOT NULL AND btrim(nome_admin) <> ''
      AND link_tipo IN ('href', 'game', 'external', 'event')
    )
  );

CREATE INDEX IF NOT EXISTS idx_cms_items_secao_ordem ON public.cms_items(secao, ordem ASC);
CREATE INDEX IF NOT EXISTS idx_cms_items_secao_ativo ON public.cms_items(secao, ativo) WHERE ativo = true;

-- Migra dados das tabelas antigas (se existirem)
DO $$
BEGIN
  IF to_regclass('public.home_banners') IS NOT NULL THEN
    INSERT INTO public.cms_items (
      id, secao, titulo, imagem_url, ordem, ativo, created_at, updated_at
    )
    SELECT
      id, 'home_banner', titulo, imagem_url, ordem, ativo, created_at, updated_at
    FROM public.home_banners
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF to_regclass('public.recommended_banners') IS NOT NULL THEN
    INSERT INTO public.cms_items (
      id, secao, titulo, imagem_url, imagem_mobile_url, game_name, provider, ordem, ativo, created_at, updated_at
    )
    SELECT
      id, 'recommended', titulo, imagem_url, imagem_mobile_url, game_name, provider, ordem, ativo, created_at, updated_at
    FROM public.recommended_banners
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF to_regclass('public.promotion_banners') IS NOT NULL THEN
    INSERT INTO public.cms_items (
      id, secao, nome_admin, titulo, texto, imagem_url, ordem, ativo, created_at, updated_at
    )
    SELECT
      id, 'promotion', nome_admin, titulo, texto, imagem_url, ordem, ativo, created_at, updated_at
    FROM public.promotion_banners
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF to_regclass('public.home_quick_nav_items') IS NOT NULL THEN
    INSERT INTO public.cms_items (
      id, secao, nome_admin, titulo, imagem_url, link_tipo, href, game_name, ordem, ativo, created_at, updated_at
    )
    SELECT
      id, 'quick_nav', nome_admin, titulo, imagem_url, link_tipo, href, game_name, ordem, ativo, created_at, updated_at
    FROM public.home_quick_nav_items
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF to_regclass('public.sidebar_promo_cards') IS NOT NULL THEN
    INSERT INTO public.cms_items (
      id, secao, nome_admin, href, ordem, ativo,
      background_color, bloom_color, outer_glow, text_theme, layout,
      icon_type, icon_value, icon_alt, labels,
      imagem_url, created_at, updated_at
    )
    SELECT
      id, 'sidebar_card', nome_admin, href, ordem, ativo,
      background_color, bloom_color, outer_glow, text_theme, layout,
      icon_type, icon_value, icon_alt, labels,
      CASE WHEN icon_type = 'image' THEN icon_value ELSE NULL END,
      created_at, updated_at
    FROM public.sidebar_promo_cards
    ON CONFLICT (id) DO NOTHING;
  END IF;
END;
$$;

DROP TABLE IF EXISTS public.home_banners CASCADE;
DROP TABLE IF EXISTS public.recommended_banners CASCADE;
DROP TABLE IF EXISTS public.promotion_banners CASCADE;
DROP TABLE IF EXISTS public.home_quick_nav_items CASCADE;
DROP TABLE IF EXISTS public.sidebar_promo_cards CASCADE;

ALTER TABLE public.cms_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Publico ve cms items ativos" ON public.cms_items;
DROP POLICY IF EXISTS "Admin gerencia cms items" ON public.cms_items;

CREATE POLICY "Publico ve cms items ativos"
  ON public.cms_items FOR SELECT
  USING (ativo = true);

CREATE POLICY "Admin gerencia cms items"
  ON public.cms_items FOR ALL
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

GRANT SELECT ON public.cms_items TO anon, authenticated;

CREATE OR REPLACE FUNCTION public._admin_cms_secao_label(p_secao TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
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

COMMENT ON TABLE public.cms_items IS 'Itens de conteúdo do site: banners, atalhos, promoções e cards da sidebar';

-- =============================================================================
-- [4/67] Fase 2 — Site config, CMS e home (todas as abas do admin)
-- Fonte: VenuzBET - Front/Database/home_sections.sql
-- =============================================================================
-- Seções da home (Estúdios, Jogos Turbo, Recomendados, etc.)
-- Execute no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS public.home_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  titulo TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('estudios', 'recomendados', 'jogos_semana', 'jogos_pg', 'jogos_mesa', 'jogos_turbo')),
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  view_all_link TEXT,
  use_green_button BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_home_sections_ordem ON public.home_sections(ordem ASC);
CREATE INDEX IF NOT EXISTS idx_home_sections_ativo ON public.home_sections(ativo) WHERE ativo = true;

-- Atualiza o CHECK de tipo (necessário em bancos criados antes de jogos_semana)
ALTER TABLE public.home_sections DROP CONSTRAINT IF EXISTS home_sections_tipo_check;

ALTER TABLE public.home_sections
  ADD CONSTRAINT home_sections_tipo_check
  CHECK (tipo IN ('estudios', 'recomendados', 'jogos_semana', 'jogos_pg', 'jogos_mesa', 'jogos_turbo'));

INSERT INTO public.home_sections (id, slug, titulo, tipo, ordem, ativo, view_all_link, use_green_button)
VALUES
  ('e1111111-1111-1111-1111-111111111101', 'recomendados', 'Recomendados', 'recomendados', 1, true, NULL, false),
  ('e1111111-1111-1111-1111-111111111106', 'jogos-semana', '+ Jogados da Semana', 'jogos_semana', 2, true, '/games', false),
  ('e1111111-1111-1111-1111-111111111102', 'jogos-pg', 'Jogos da PG', 'jogos_pg', 3, true, '/list/mais-jogados', false),
  ('e1111111-1111-1111-1111-111111111103', 'jogos-mesa', 'Jogos de Mesa', 'jogos_mesa', 4, true, '/list/pg-soft', false),
  ('e1111111-1111-1111-1111-111111111104', 'jogos-turbo', 'Jogos Turbo', 'jogos_turbo', 5, true, '/provider/pragmatic', true),
  ('e1111111-1111-1111-1111-111111111105', 'estudios', 'Estúdios', 'estudios', 6, true, '/providers', false)
ON CONFLICT (slug) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  tipo = EXCLUDED.tipo,
  ordem = EXCLUDED.ordem,
  ativo = EXCLUDED.ativo,
  view_all_link = EXCLUDED.view_all_link,
  use_green_button = EXCLUDED.use_green_button,
  updated_at = TIMEZONE('utc'::text, NOW());

ALTER TABLE public.home_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos podem ver seções ativas da home" ON public.home_sections;
DROP POLICY IF EXISTS "Admin pode gerenciar seções da home" ON public.home_sections;

CREATE POLICY "Todos podem ver seções ativas da home"
  ON public.home_sections FOR SELECT USING (ativo = true);

CREATE POLICY "Admin pode gerenciar seções da home"
  ON public.home_sections FOR ALL
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

GRANT SELECT ON public.home_sections TO anon, authenticated;

COMMENT ON TABLE public.home_sections IS 'Ordem e configuração das seções de jogos na home';

-- =============================================================================
-- [5/67] Fase 2 — Site config, CMS e home (todas as abas do admin)
-- Fonte: VenuzBET - Front/Database/home_sections_jogos_semana.sql
-- =============================================================================
-- Adiciona a seção "+ Jogados da Semana" na home
-- Execute no SQL Editor do Supabase (bancos já existentes)
--
-- IMPORTANTE: se der deadlock (40P01), NÃO rode este script completo.
-- Use Database/home_sections_fix_links.sql (só UPDATEs) ou aguarde ~30s e tente de novo
-- com uma única aba aberta no SQL Editor (sem o site aberto em outra aba).

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  FOR constraint_name IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.relname = 'home_sections'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) LIKE '%tipo%'
  LOOP
    EXECUTE format('ALTER TABLE public.home_sections DROP CONSTRAINT %I', constraint_name);
  END LOOP;
END $$;

ALTER TABLE public.home_sections
  ADD CONSTRAINT home_sections_tipo_check
  CHECK (tipo IN ('estudios', 'recomendados', 'jogos_semana', 'jogos_pg', 'jogos_mesa', 'jogos_turbo'));

INSERT INTO public.home_sections (id, slug, titulo, tipo, ordem, ativo, view_all_link, use_green_button)
VALUES
  ('e1111111-1111-1111-1111-111111111106', 'jogos-semana', '+ Jogados da Semana', 'jogos_semana', 2, true, '/games', false)
ON CONFLICT (slug) DO UPDATE SET
  titulo = EXCLUDED.titulo,
  tipo = EXCLUDED.tipo,
  ordem = EXCLUDED.ordem,
  ativo = EXCLUDED.ativo,
  view_all_link = EXCLUDED.view_all_link,
  use_green_button = EXCLUDED.use_green_button,
  updated_at = TIMEZONE('utc'::text, NOW());

UPDATE public.home_sections SET ordem = 3, updated_at = TIMEZONE('utc'::text, NOW()) WHERE slug = 'jogos-pg';
UPDATE public.home_sections SET ordem = 4, updated_at = TIMEZONE('utc'::text, NOW()) WHERE slug = 'jogos-mesa';
UPDATE public.home_sections SET view_all_link = '/provider/pragmatic', updated_at = TIMEZONE('utc'::text, NOW()) WHERE slug = 'jogos-turbo';
UPDATE public.home_sections SET ordem = 6, updated_at = TIMEZONE('utc'::text, NOW()) WHERE slug = 'estudios';

-- =============================================================================
-- [6/67] Fase 2 — Site config, CMS e home (todas as abas do admin)
-- Fonte: AdminPainel/Database/home_section_games.sql
-- =============================================================================
-- Jogos curados por seção da home (até 11 por seção)
-- Execute no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS public.home_section_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.home_sections(id) ON DELETE CASCADE,
  api_provider_id INTEGER NOT NULL,
  game_code TEXT NOT NULL,
  game_name TEXT NOT NULL,
  game_image_url TEXT,
  provider_name TEXT NOT NULL,
  ordem INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE (section_id, api_provider_id, game_code)
);

CREATE INDEX IF NOT EXISTS idx_home_section_games_section_ordem
  ON public.home_section_games(section_id, ordem ASC);

ALTER TABLE public.home_section_games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos podem ver jogos das seções da home" ON public.home_section_games;
DROP POLICY IF EXISTS "Admin pode gerenciar jogos das seções da home" ON public.home_section_games;

CREATE POLICY "Todos podem ver jogos das seções da home"
  ON public.home_section_games FOR SELECT
  USING (true);

CREATE POLICY "Admin pode gerenciar jogos das seções da home"
  ON public.home_section_games FOR ALL
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

GRANT SELECT ON public.home_section_games TO anon, authenticated;

COMMENT ON TABLE public.home_section_games IS 'Jogos selecionados manualmente para cada seção de jogos na home (máx. 11)';

-- =============================================================================
-- [7/67] Fase 2 — Site config, CMS e home (todas as abas do admin)
-- Fonte: AdminPainel/Database/home_section_providers.sql
-- =============================================================================
-- Provedores curados para a seção Estúdios da home
-- Execute no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS public.home_section_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.home_sections(id) ON DELETE CASCADE,
  api_provider_id INTEGER NOT NULL,
  provider_name TEXT NOT NULL,
  provider_image_url TEXT,
  ordem INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE (section_id, api_provider_id)
);

CREATE INDEX IF NOT EXISTS idx_home_section_providers_section_ordem
  ON public.home_section_providers(section_id, ordem ASC);

ALTER TABLE public.home_section_providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos podem ver provedores das seções da home" ON public.home_section_providers;
DROP POLICY IF EXISTS "Admin pode gerenciar provedores das seções da home" ON public.home_section_providers;

CREATE POLICY "Todos podem ver provedores das seções da home"
  ON public.home_section_providers FOR SELECT
  USING (true);

CREATE POLICY "Admin pode gerenciar provedores das seções da home"
  ON public.home_section_providers FOR ALL
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

GRANT SELECT ON public.home_section_providers TO anon, authenticated;

COMMENT ON TABLE public.home_section_providers IS 'Provedores selecionados manualmente para a seção Estúdios na home';

-- =============================================================================
-- [8/67] Fase 2 — Site config, CMS e home (todas as abas do admin)
-- Fonte: AdminPainel/Database/all_games_page.sql
-- =============================================================================
-- Configuração da página "Todos os Jogos" (/games)
-- Execute no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS public.all_games_page_config (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  titulo TEXT NOT NULL DEFAULT 'Todos os jogos',
  jogos_por_pagina INT NOT NULL DEFAULT 18 CHECK (jogos_por_pagina > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS public.all_games_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  api_provider_id INT,
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS public.all_games_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_all_games_providers_ordem ON public.all_games_providers(ordem ASC);
CREATE INDEX IF NOT EXISTS idx_all_games_providers_ativo ON public.all_games_providers(ativo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_all_games_categories_ordem ON public.all_games_categories(ordem ASC);
CREATE INDEX IF NOT EXISTS idx_all_games_categories_ativo ON public.all_games_categories(ativo) WHERE ativo = true;

INSERT INTO public.all_games_page_config (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.all_games_providers (id, slug, nome, api_provider_id, ordem, ativo)
VALUES
  ('c1111111-1111-1111-1111-111111111101', 'all', 'Todos', NULL, 1, true),
  ('c1111111-1111-1111-1111-111111111102', 'venuzbet', 'RoyalBet Originais', NULL, 2, true),
  ('c1111111-1111-1111-1111-111111111103', 'pgsoft', 'PG Soft', 1, 3, true),
  ('c1111111-1111-1111-1111-111111111104', 'pragmatic', 'Pragmatic Play', NULL, 4, true),
  ('c1111111-1111-1111-1111-111111111105', 'pragmaticlive', 'Pragmatic Live', NULL, 5, true),
  ('c1111111-1111-1111-1111-111111111106', 'netent', 'NetEnt', NULL, 6, true),
  ('c1111111-1111-1111-1111-111111111107', 'evolution', 'Evolution Gaming', NULL, 7, true),
  ('c1111111-1111-1111-1111-111111111108', 'redtiger', 'Red Tiger', NULL, 8, true),
  ('c1111111-1111-1111-1111-111111111109', 'playson', 'Playson', NULL, 9, true),
  ('c1111111-1111-1111-1111-111111111110', 'habanero', 'Habanero', NULL, 10, true),
  ('c1111111-1111-1111-1111-111111111111', 'spribe', 'Spribe', NULL, 11, true),
  ('c1111111-1111-1111-1111-111111111112', 'evoplay', 'Evoplay', NULL, 12, true),
  ('c1111111-1111-1111-1111-111111111113', 'bgaming', 'BGaming', NULL, 13, true),
  ('c1111111-1111-1111-1111-111111111114', 'ezugi', 'Ezugi', NULL, 14, true),
  ('c1111111-1111-1111-1111-111111111115', 'cgames', 'C Games', NULL, 15, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.all_games_categories (id, slug, nome, ordem, ativo)
VALUES
  ('d1111111-1111-1111-1111-111111111101', 'all', 'Todos', 1, true),
  ('d1111111-1111-1111-1111-111111111102', 'slots', 'Slots', 2, true),
  ('d1111111-1111-1111-1111-111111111103', 'live', 'Cassino Ao Vivo', 3, true),
  ('d1111111-1111-1111-1111-111111111104', 'table', 'Jogos de Mesa', 4, true),
  ('d1111111-1111-1111-1111-111111111105', 'crash', 'Crash Games', 5, true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.all_games_page_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.all_games_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.all_games_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos podem ver config todos jogos" ON public.all_games_page_config;
DROP POLICY IF EXISTS "Admin pode gerenciar config todos jogos" ON public.all_games_page_config;
DROP POLICY IF EXISTS "Todos podem ver providers todos jogos ativos" ON public.all_games_providers;
DROP POLICY IF EXISTS "Admin pode gerenciar providers todos jogos" ON public.all_games_providers;
DROP POLICY IF EXISTS "Todos podem ver categorias todos jogos ativas" ON public.all_games_categories;
DROP POLICY IF EXISTS "Admin pode gerenciar categorias todos jogos" ON public.all_games_categories;

CREATE POLICY "Todos podem ver config todos jogos"
  ON public.all_games_page_config FOR SELECT USING (true);

CREATE POLICY "Admin pode gerenciar config todos jogos"
  ON public.all_games_page_config FOR ALL
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

CREATE POLICY "Todos podem ver providers todos jogos ativos"
  ON public.all_games_providers FOR SELECT USING (ativo = true);

CREATE POLICY "Admin pode gerenciar providers todos jogos"
  ON public.all_games_providers FOR ALL
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

CREATE POLICY "Todos podem ver categorias todos jogos ativas"
  ON public.all_games_categories FOR SELECT USING (ativo = true);

CREATE POLICY "Admin pode gerenciar categorias todos jogos"
  ON public.all_games_categories FOR ALL
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

GRANT SELECT ON public.all_games_page_config TO anon, authenticated;
GRANT SELECT ON public.all_games_providers TO anon, authenticated;
GRANT SELECT ON public.all_games_categories TO anon, authenticated;

COMMENT ON TABLE public.all_games_page_config IS 'Configurações gerais da página Todos os Jogos';
COMMENT ON TABLE public.all_games_providers IS 'Filtros de provedores da página Todos os Jogos';
COMMENT ON TABLE public.all_games_categories IS 'Filtros de categorias da página Todos os Jogos';

-- =============================================================================
-- [9/67] Fase 2 — Site config, CMS e home (todas as abas do admin)
-- Fonte: AdminPainel/Database/sidebar_menu.sql
-- =============================================================================
-- Menu da sidebar: categorias e itens configuráveis
-- Execute no SQL Editor do Supabase (após cms_items.sql)

ALTER TABLE public.cms_items
  ADD COLUMN IF NOT EXISTS categoria_slug TEXT;
ALTER TABLE public.cms_items
  ADD COLUMN IF NOT EXISTS category_tipo TEXT;
ALTER TABLE public.cms_items
  ADD COLUMN IF NOT EXISTS destaque BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.cms_items DROP CONSTRAINT IF EXISTS cms_items_link_tipo_check;
ALTER TABLE public.cms_items
  ADD CONSTRAINT cms_items_link_tipo_check
  CHECK (link_tipo IS NULL OR link_tipo IN ('href', 'game', 'external', 'event'));

ALTER TABLE public.cms_items DROP CONSTRAINT IF EXISTS cms_items_secao_check;
ALTER TABLE public.cms_items
  ADD CONSTRAINT cms_items_secao_check
  CHECK (secao IN (
    'home_banner', 'recommended', 'promotion', 'quick_nav', 'sidebar_card',
    'sidebar_category', 'sidebar_menu_item'
  ));

ALTER TABLE public.cms_items DROP CONSTRAINT IF EXISTS cms_items_sidebar_category_check;
ALTER TABLE public.cms_items
  ADD CONSTRAINT cms_items_sidebar_category_check CHECK (
    secao <> 'sidebar_category'
    OR (
      titulo IS NOT NULL AND btrim(titulo) <> ''
      AND nome_admin IS NOT NULL AND btrim(nome_admin) <> ''
      AND category_tipo IN ('menu', 'language')
    )
  );

ALTER TABLE public.cms_items DROP CONSTRAINT IF EXISTS cms_items_sidebar_menu_item_check;
ALTER TABLE public.cms_items
  ADD CONSTRAINT cms_items_sidebar_menu_item_check CHECK (
    secao <> 'sidebar_menu_item'
    OR (
      categoria_slug IS NOT NULL AND btrim(categoria_slug) <> ''
      AND nome_admin IS NOT NULL AND btrim(nome_admin) <> ''
      AND link_tipo IN ('href', 'game', 'external', 'event')
    )
  );

CREATE OR REPLACE FUNCTION public._admin_cms_secao_label(p_secao TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
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

-- Seed padrão (somente se ainda não houver categorias)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.cms_items WHERE secao = 'sidebar_category' LIMIT 1) THEN
    RETURN;
  END IF;

  INSERT INTO public.cms_items (secao, nome_admin, titulo, category_tipo, labels, ordem, ativo)
  VALUES
    (
      'sidebar_category', 'Cassino', 'casino', 'menu',
      '{"pt":{"line1":"CASSINO"},"en":{"line1":"CASINO"},"es":{"line1":"CASINO"}}'::jsonb,
      1, true
    ),
    (
      'sidebar_category', 'Extras', 'extras', 'menu',
      '{"pt":{"line1":"EXTRAS"},"en":{"line1":"EXTRAS"},"es":{"line1":"EXTRAS"}}'::jsonb,
      2, true
    ),
    (
      'sidebar_category', 'Idioma', 'language', 'language',
      '{"pt":{"line1":"IDIOMA"},"en":{"line1":"LANGUAGE"},"es":{"line1":"IDIOMA"}}'::jsonb,
      3, true
    );

  INSERT INTO public.cms_items (
    secao, nome_admin, categoria_slug, labels, link_tipo, href, game_name, texto,
    icon_type, icon_value, destaque, ordem, ativo
  )
  VALUES
    ('sidebar_menu_item', 'Todos os Jogos', 'casino',
      '{"pt":{"line1":"Todos os Jogos"},"en":{"line1":"All Games"},"es":{"line1":"Todos los Juegos"}}'::jsonb,
      'href', '/games', NULL, NULL, 'iconify', 'material-symbols:stadia-controller', true, 1, true),
    ('sidebar_menu_item', 'Jogos de Slot', 'casino',
      '{"pt":{"line1":"Jogos de Slot"},"en":{"line1":"Slot Games"},"es":{"line1":"Juegos de Slot"}}'::jsonb,
      'href', '/slots', NULL, NULL, 'iconify', 'mdi:slot-machine', true, 2, true),
    ('sidebar_menu_item', 'Provedoras', 'casino',
      '{"pt":{"line1":"Provedoras"},"en":{"line1":"Providers"},"es":{"line1":"Proveedoras"}}'::jsonb,
      'href', '/providers', NULL, NULL, 'iconify', 'mdi:magic-staff', true, 3, true),
    ('sidebar_menu_item', 'Mines', 'casino',
      '{"pt":{"line1":"Mines"},"en":{"line1":"Mines"},"es":{"line1":"Mines"}}'::jsonb,
      'game', NULL, 'Mines', NULL, 'iconify', 'mdi:bomb', true, 4, true),
    ('sidebar_menu_item', 'Fortune Dragon', 'casino',
      '{"pt":{"line1":"Fortune Dragon"},"en":{"line1":"Fortune Dragon"},"es":{"line1":"Fortune Dragon"}}'::jsonb,
      'game', NULL, 'Fortune Dragon', NULL, 'image',
      'https://royal-images.s3.us-east-1.amazonaws.com/default/menu/fortune-dragon.svg', true, 5, true),
    ('sidebar_menu_item', 'Fortune Tiger', 'casino',
      '{"pt":{"line1":"Fortune Tiger"},"en":{"line1":"Fortune Tiger"},"es":{"line1":"Fortune Tiger"}}'::jsonb,
      'game', NULL, 'Fortune Tiger', NULL, 'image',
      'https://royal-images.s3.us-east-1.amazonaws.com/default/menu/fortune-tiger.svg', true, 6, true),
    ('sidebar_menu_item', 'Aviator', 'casino',
      '{"pt":{"line1":"Aviator"},"en":{"line1":"Aviator"},"es":{"line1":"Aviator"}}'::jsonb,
      'game', NULL, 'Aviator', NULL, 'image',
      'https://royal-images.s3.us-east-1.amazonaws.com/default/menu/aviator.svg', true, 7, true),
    ('sidebar_menu_item', 'Telegram', 'extras',
      '{"pt":{"line1":"Acesse Nosso Telegram"},"en":{"line1":"Join our Telegram"},"es":{"line1":"Únete a nuestro Telegram"}}'::jsonb,
      'external', NULL, NULL, 'https://t.me/royalbet_oficial', 'iconify', 'ic:baseline-telegram', true, 1, true),
    ('sidebar_menu_item', 'App Download', 'extras',
      '{"pt":{"line1":"App Download"},"en":{"line1":"App Download"},"es":{"line1":"Descargar App"}}'::jsonb,
      'href', '/help/mobile', NULL, NULL, 'iconify', 'ph:download-duotone', true, 2, true),
    ('sidebar_menu_item', 'Promoções', 'extras',
      '{"pt":{"line1":"Promoções"},"en":{"line1":"Promotions"},"es":{"line1":"Promociones"}}'::jsonb,
      'href', '/help/promotions', NULL, NULL, 'iconify', 'ph:gift-duotone', true, 3, true),
    ('sidebar_menu_item', 'Ativar cupom', 'extras',
      '{"pt":{"line1":"Ativar cupom"},"en":{"line1":"Activate coupon"},"es":{"line1":"Activar cupón"}}'::jsonb,
      'event', NULL, NULL, 'openCouponModal', 'iconify', 'streamline:discount-percent-coupon-solid', true, 4, true);
END;
$$;

COMMENT ON COLUMN public.cms_items.categoria_slug IS 'Slug da categoria pai (sidebar_menu_item)';
COMMENT ON COLUMN public.cms_items.category_tipo IS 'Tipo da categoria: menu ou language (sidebar_category)';
COMMENT ON COLUMN public.cms_items.destaque IS 'Texto em negrito no item do menu da sidebar';

-- =============================================================================
-- [10/67] Fase 2 — Site config, CMS e home (todas as abas do admin)
-- Fonte: AdminPainel/Database/sidebar_copy.sql
-- =============================================================================
-- Textos da sidebar (menu e seções) por idioma — pt / en / es
-- Execute no SQL Editor do Supabase

ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS sidebar_copy JSONB;

COMMENT ON COLUMN public.site_config.sidebar_copy IS
  'Textos da sidebar por idioma: seções, itens do menu cassino/extras e labels auxiliares';

-- =============================================================================
-- [11/67] Fase 2 — Site config, CMS e home (todas as abas do admin)
-- Fonte: VenuzBET - Front/Database/site_config_auth_modals.sql
-- =============================================================================
-- Adiciona URLs das imagens dos modais de login e cadastro em site_config
-- Execute no SQL Editor do Supabase

ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS login_modal_imagem_url TEXT NOT NULL DEFAULT 'https://i.ibb.co/YgXq6QP/Gemini-Generated-Image-39fib539fib539fi.png';

ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS register_modal_imagem_url TEXT NOT NULL DEFAULT 'https://i.ibb.co/YgXq6QP/Gemini-Generated-Image-39fib539fib539fi.png';

-- =============================================================================
-- [12/67] Fase 3 — Identidade / branding
-- Fonte: AdminPainel/Database/patch_brand_colors.sql
-- =============================================================================
-- Cores de destaque da marca (botões, bordas, links)
-- Execute no SQL Editor do Supabase

ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS brand_cor_primaria TEXT NOT NULL DEFAULT '#7B3FF2';

ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS brand_cor_hover TEXT NOT NULL DEFAULT '#6528D7';

COMMENT ON COLUMN public.site_config.brand_cor_primaria IS 'Cor principal de botões, bordas e destaques do site';
COMMENT ON COLUMN public.site_config.brand_cor_hover IS 'Cor hover dos botões e elementos interativos';

-- =============================================================================
-- [13/67] Fase 3 — Identidade / branding
-- Fonte: AdminPainel/Database/patch_site_favicon.sql
-- =============================================================================
-- Favicon exibido na aba do navegador do site principal
-- Execute no SQL Editor do Supabase

ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS site_favicon_url TEXT NOT NULL DEFAULT '/headline.png';

UPDATE public.site_config
SET site_favicon_url = COALESCE(
  NULLIF(btrim(site_favicon_url), ''),
  '/headline.png'
)
WHERE id = 1;

COMMENT ON COLUMN public.site_config.site_favicon_url IS
  'URL do favicon do site principal (aba do navegador). PNG, ICO ou SVG.';

-- =============================================================================
-- [14/67] Fase 3 — Identidade / branding
-- Fonte: AdminPainel/Database/patch_site_dominio.sql
-- =============================================================================
-- Domínio principal do site (links de indicação, etc.)
-- Execute no SQL Editor do Supabase

ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS site_dominio TEXT NOT NULL DEFAULT 'royall.bet';

UPDATE public.site_config
SET site_dominio = COALESCE(
  NULLIF(
    btrim(
      regexp_replace(
        regexp_replace(lower(site_dominio), '^https?://', ''),
        '/+$',
        ''
      )
    ),
    ''
  ),
  'royall.bet'
)
WHERE id = 1;

COMMENT ON COLUMN public.site_config.site_dominio IS
  'Domínio público do site, sem protocolo. Usado nos links de indicação (ex.: royall.bet).';

-- =============================================================================
-- [15/67] Fase 3 — Identidade / branding
-- Fonte: AdminPainel/Database/patch_site_titulo.sql
-- =============================================================================
-- Título exibido na aba do navegador (document.title)
-- Execute no SQL Editor do Supabase

ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS site_titulo TEXT NOT NULL DEFAULT 'RoyalBet | Apostas Online com Saques Rápidos';

UPDATE public.site_config
SET site_titulo = COALESCE(
  NULLIF(btrim(site_titulo), ''),
  CONCAT(COALESCE(NULLIF(btrim(nome_bet), ''), 'RoyalBet'), ' | Apostas Online com Saques Rápidos')
)
WHERE id = 1;

COMMENT ON COLUMN public.site_config.site_titulo IS
  'Título do site exibido na aba do navegador (document.title)';

-- =============================================================================
-- [16/67] Fase 3 — Identidade / branding
-- Fonte: AdminPainel/Database/patch_nome_bet.sql
-- =============================================================================
-- Nome da marca exibido no site (ex.: RoyalBet, StewGaming)
-- Execute no SQL Editor do Supabase

ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS nome_bet TEXT NOT NULL DEFAULT 'RoyalBet';

UPDATE public.site_config
SET nome_bet = COALESCE(NULLIF(btrim(nome_bet), ''), 'RoyalBet')
WHERE id = 1;

COMMENT ON COLUMN public.site_config.nome_bet IS
  'Nome da bet exibido no site, título da página, originais e alt da logo';

-- =============================================================================
-- [17/67] Fase 3 — Identidade / branding
-- Fonte: AdminPainel/Database/patch_deposit_modal_image.sql
-- =============================================================================
-- Imagem do modal de depósito
-- Execute no SQL Editor do Supabase

ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS deposit_modal_imagem_url TEXT;

COMMENT ON COLUMN public.site_config.deposit_modal_imagem_url IS
  'URL da imagem exibida no topo do modal de depósito. Vazio usa a logo do site.';

-- =============================================================================
-- [18/67] Fase 3 — Identidade / branding
-- Fonte: AdminPainel/Database/patch_entry_popup.sql
-- =============================================================================
-- Popup de entrada do site (imagem exibida ao acessar o site)
-- Execute no SQL Editor do Supabase

ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS entry_popup_ativo BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS entry_popup_imagem_url TEXT;

COMMENT ON COLUMN public.site_config.entry_popup_ativo IS
  'Exibe popup com imagem ao entrar no site (uma vez por sessão).';

COMMENT ON COLUMN public.site_config.entry_popup_imagem_url IS
  'URL da imagem exibida no popup de entrada.';

-- =============================================================================
-- [19/67] Fase 3 — Identidade / branding
-- Fonte: AdminPainel/Database/patch_footer_social.sql
-- =============================================================================
-- Redes sociais exibidas no footer do site principal
-- Execute no SQL Editor do Supabase

ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS footer_instagram_ativo BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS footer_instagram_url TEXT NOT NULL DEFAULT 'https://instagram.com/royalbet_oficial';
ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS footer_telegram_ativo BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS footer_telegram_url TEXT NOT NULL DEFAULT 'https://t.me/royalbet_oficial';
ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS footer_whatsapp_ativo BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS footer_whatsapp_url TEXT NOT NULL DEFAULT '';

UPDATE public.site_config
SET
  footer_instagram_ativo = COALESCE(footer_instagram_ativo, true),
  footer_instagram_url = COALESCE(NULLIF(btrim(footer_instagram_url), ''), 'https://instagram.com/royalbet_oficial'),
  footer_telegram_ativo = COALESCE(footer_telegram_ativo, true),
  footer_telegram_url = COALESCE(NULLIF(btrim(footer_telegram_url), ''), 'https://t.me/royalbet_oficial'),
  footer_whatsapp_ativo = COALESCE(footer_whatsapp_ativo, false),
  footer_whatsapp_url = COALESCE(footer_whatsapp_url, '')
WHERE id = 1;

COMMENT ON COLUMN public.site_config.footer_instagram_ativo IS 'Exibe o link do Instagram no footer do site.';
COMMENT ON COLUMN public.site_config.footer_instagram_url IS 'URL do perfil Instagram exibido no footer.';
COMMENT ON COLUMN public.site_config.footer_telegram_ativo IS 'Exibe o link do Telegram no footer do site.';
COMMENT ON COLUMN public.site_config.footer_telegram_url IS 'URL do Telegram exibido no footer.';
COMMENT ON COLUMN public.site_config.footer_whatsapp_ativo IS 'Exibe o link do WhatsApp no footer do site.';
COMMENT ON COLUMN public.site_config.footer_whatsapp_url IS 'URL ou número do WhatsApp exibido no footer (ex.: https://wa.me/5511999999999).';

-- =============================================================================
-- [20/67] Fase 4 — Catálogo de jogos
-- Fonte: AdminPainel/Database/jogos.sql
-- =============================================================================
-- Catálogo de jogos e provedores da plataforma (ativar/desativar no admin)
-- Execute no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS public.platform_providers (
  api_provider_id INT PRIMARY KEY,
  slug TEXT NOT NULL,
  nome TEXT NOT NULL,
  image_url TEXT,
  api_status INT NOT NULL DEFAULT 1,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS public.platform_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_provider_id INT NOT NULL REFERENCES public.platform_providers(api_provider_id) ON DELETE CASCADE,
  game_code TEXT NOT NULL,
  nome TEXT NOT NULL,
  image_url TEXT,
  api_status BOOLEAN NOT NULL DEFAULT true,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  UNIQUE (api_provider_id, game_code)
);

CREATE INDEX IF NOT EXISTS idx_platform_providers_ativo ON public.platform_providers(ativo);
CREATE INDEX IF NOT EXISTS idx_platform_providers_slug ON public.platform_providers(slug);
CREATE INDEX IF NOT EXISTS idx_platform_games_provider ON public.platform_games(api_provider_id);
CREATE INDEX IF NOT EXISTS idx_platform_games_ativo ON public.platform_games(ativo);
CREATE INDEX IF NOT EXISTS idx_platform_games_game_code ON public.platform_games(game_code);

ALTER TABLE public.platform_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_games ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Todos podem ver provedores ativos da plataforma" ON public.platform_providers;
DROP POLICY IF EXISTS "Admin pode gerenciar provedores da plataforma" ON public.platform_providers;
DROP POLICY IF EXISTS "Todos podem ver jogos ativos da plataforma" ON public.platform_games;
DROP POLICY IF EXISTS "Admin pode gerenciar jogos da plataforma" ON public.platform_games;
DROP POLICY IF EXISTS "Todos podem ler catálogo de provedores" ON public.platform_providers;
DROP POLICY IF EXISTS "Admin pode atualizar provedores da plataforma" ON public.platform_providers;
DROP POLICY IF EXISTS "Admin pode excluir provedores da plataforma" ON public.platform_providers;
DROP POLICY IF EXISTS "Todos podem ler catálogo de jogos" ON public.platform_games;
DROP POLICY IF EXISTS "Admin pode atualizar jogos da plataforma" ON public.platform_games;
DROP POLICY IF EXISTS "Admin pode excluir jogos da plataforma" ON public.platform_games;

CREATE POLICY "Todos podem ler catálogo de provedores"
  ON public.platform_providers FOR SELECT USING (true);

CREATE POLICY "Admin pode gerenciar provedores da plataforma"
  ON public.platform_providers FOR INSERT
  WITH CHECK (public.is_user_admin());

CREATE POLICY "Admin pode atualizar provedores da plataforma"
  ON public.platform_providers FOR UPDATE
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

CREATE POLICY "Admin pode excluir provedores da plataforma"
  ON public.platform_providers FOR DELETE
  USING (public.is_user_admin());

CREATE POLICY "Todos podem ler catálogo de jogos"
  ON public.platform_games FOR SELECT USING (true);

CREATE POLICY "Admin pode gerenciar jogos da plataforma"
  ON public.platform_games FOR INSERT
  WITH CHECK (public.is_user_admin());

CREATE POLICY "Admin pode atualizar jogos da plataforma"
  ON public.platform_games FOR UPDATE
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

CREATE POLICY "Admin pode excluir jogos da plataforma"
  ON public.platform_games FOR DELETE
  USING (public.is_user_admin());

GRANT SELECT ON public.platform_providers TO anon, authenticated;
GRANT SELECT ON public.platform_games TO anon, authenticated;

COMMENT ON TABLE public.platform_providers IS 'Provedores de jogos com controle de ativação na plataforma';
COMMENT ON TABLE public.platform_games IS 'Jogos individuais com controle de ativação na plataforma';

-- =============================================================================
-- [21/67] Fase 5 — Depósitos, saques, gateways e rollover
-- Fonte: AdminPainel/Database/EXECUTAR_NO_SUPABASE.sql
-- =============================================================================
-- =============================================================================
-- EXECUTE ESTE ARQUIVO INTEIRO no SQL Editor do Supabase (uma vez)
-- Consolida: saques diários + rollover + fix confirmar_deposito_pix_pago
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Saques diários permitidos
-- -----------------------------------------------------------------------------
ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS saques_diarios_permitidos INT NOT NULL DEFAULT 1;

ALTER TABLE public.site_config
  DROP CONSTRAINT IF EXISTS site_config_saques_diarios_permitidos_check;

ALTER TABLE public.site_config
  ADD CONSTRAINT site_config_saques_diarios_permitidos_check
  CHECK (saques_diarios_permitidos >= 1);

COMMENT ON COLUMN public.site_config.saques_diarios_permitidos IS
  'Número máximo de saques permitidos por dia por usuário';

-- -----------------------------------------------------------------------------
-- 2) Rollover configurável
-- -----------------------------------------------------------------------------
ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS rollover_padrao NUMERIC(8,2) NOT NULL DEFAULT 1;

ALTER TABLE public.site_config
  DROP CONSTRAINT IF EXISTS site_config_rollover_padrao_check;

ALTER TABLE public.site_config
  ADD CONSTRAINT site_config_rollover_padrao_check
  CHECK (rollover_padrao >= 0);

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS rollover_pendente NUMERIC(12,2) NOT NULL DEFAULT 0;

ALTER TABLE public.usuarios
  DROP CONSTRAINT IF EXISTS usuarios_rollover_pendente_check;

ALTER TABLE public.usuarios
  ADD CONSTRAINT usuarios_rollover_pendente_check
  CHECK (rollover_pendente >= 0);

COMMENT ON COLUMN public.site_config.rollover_padrao IS
  'Múltiplo padrão de rollover em depósitos (ex.: 2 = apostar 2x o valor depositado antes de sacar). 0 desativa.';
COMMENT ON COLUMN public.usuarios.rollover_pendente IS
  'Valor em apostas que o usuário ainda precisa cumprir antes de sacar.';

-- -----------------------------------------------------------------------------
-- 3) Funções de rollover
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.aplicar_rollover_deposito(
  p_usuario_id UUID,
  p_valor NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_multiplicador NUMERIC;
  v_incremento NUMERIC;
  v_novo_pendente NUMERIC;
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

  UPDATE public.usuarios
  SET rollover_pendente = COALESCE(rollover_pendente, 0) + v_incremento
  WHERE id = p_usuario_id
  RETURNING rollover_pendente INTO v_novo_pendente;

  RETURN COALESCE(v_novo_pendente, 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.abater_rollover_aposta()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valor_aposta NUMERIC;
BEGIN
  v_valor_aposta := COALESCE(NEW.valor, 0);
  IF v_valor_aposta <= 0 OR NEW.usuario_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.usuarios
  SET rollover_pendente = GREATEST(0, COALESCE(rollover_pendente, 0) - v_valor_aposta)
  WHERE id = NEW.usuario_id
    AND COALESCE(rollover_pendente, 0) > 0;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_abater_rollover_aposta ON public.transacoes_jogos;

CREATE TRIGGER trg_abater_rollover_aposta
  AFTER INSERT ON public.transacoes_jogos
  FOR EACH ROW
  EXECUTE FUNCTION public.abater_rollover_aposta();

CREATE OR REPLACE FUNCTION public.validar_rollover_saque()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

DROP TRIGGER IF EXISTS trg_validar_rollover_saque ON public.saques;

CREATE TRIGGER trg_validar_rollover_saque
  BEFORE INSERT ON public.saques
  FOR EACH ROW
  EXECUTE FUNCTION public.validar_rollover_saque();

CREATE OR REPLACE FUNCTION public.validar_limite_saques_diarios()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

DROP TRIGGER IF EXISTS trg_validar_limite_saques_diarios ON public.saques;

CREATE TRIGGER trg_validar_limite_saques_diarios
  BEFORE INSERT ON public.saques
  FOR EACH ROW
  EXECUTE FUNCTION public.validar_limite_saques_diarios();

CREATE OR REPLACE FUNCTION public.obter_rollover_usuario()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- -----------------------------------------------------------------------------
-- 4) Config da plataforma (admin + front)
-- -----------------------------------------------------------------------------
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
      'saques_diarios_permitidos', 1,
      'rollover_padrao', 1
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
    'updated_at', v_config.updated_at
  );
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

-- -----------------------------------------------------------------------------
-- 5) Depósito PIX (fix json || json + rollover)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.confirmar_deposito_pix_pago(p_deposito_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  RETURN (json_build_object(
    'ok', true,
    'already', false,
    'rollover_pendente', COALESCE(v_rollover, 0)
  )::jsonb || COALESCE(v_vip, '{}'::json)::jsonb)::json;
END;
$$;

-- -----------------------------------------------------------------------------
-- 6) Aprovação manual de depósito (admin)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 7) Permissões
-- -----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.obter_config_plataforma() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_config_plataforma_admin(NUMERIC, NUMERIC, NUMERIC, NUMERIC, INT, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.obter_rollover_usuario() TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirmar_deposito_pix_pago(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_status_deposito_admin(UUID, TEXT) TO authenticated;

-- =============================================================================
-- [22/67] Fase 5 — Depósitos, saques, gateways e rollover
-- Fonte: AdminPainel/Database/patch_misticpay_config.sql
-- =============================================================================
-- Credenciais MisticPay gerenciadas pelo admin (não expostas ao site público)
-- Execute no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS public.integration_secrets (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  misticpay_ci TEXT NOT NULL DEFAULT '',
  misticpay_cs TEXT NOT NULL DEFAULT '',
  misticpay_api_url TEXT NOT NULL DEFAULT 'https://api.misticpay.com/api',
  misticpay_webhook_secret TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

INSERT INTO public.integration_secrets (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.integration_secrets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin gerencia integration secrets" ON public.integration_secrets;

CREATE POLICY "Admin gerencia integration secrets"
  ON public.integration_secrets FOR ALL
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

REVOKE ALL ON public.integration_secrets FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.integration_secrets TO service_role;

CREATE OR REPLACE FUNCTION public.obter_misticpay_config_admin()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.salvar_misticpay_config_admin(
  p_misticpay_ci TEXT DEFAULT NULL,
  p_misticpay_cs TEXT DEFAULT NULL,
  p_misticpay_api_url TEXT DEFAULT NULL,
  p_misticpay_webhook_secret TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

GRANT EXECUTE ON FUNCTION public.obter_misticpay_config_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.salvar_misticpay_config_admin(TEXT, TEXT, TEXT, TEXT) TO authenticated;

COMMENT ON TABLE public.integration_secrets IS 'Segredos de integrações (MisticPay etc.). Acesso direto bloqueado para anon; API usa service_role.';

-- =============================================================================
-- [23/67] Fase 5 — Depósitos, saques, gateways e rollover
-- Fonte: AdminPainel/Database/patch_bspay_config.sql
-- =============================================================================
-- BSPay + seleção de gateway de pagamento ativo
-- Execute no SQL Editor do Supabase (após patch_misticpay_config.sql)

ALTER TABLE public.integration_secrets
  ADD COLUMN IF NOT EXISTS payment_gateway TEXT NOT NULL DEFAULT 'misticpay'
    CHECK (payment_gateway IN ('misticpay', 'bspay'));

ALTER TABLE public.integration_secrets
  ADD COLUMN IF NOT EXISTS bspay_client_id TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS bspay_client_secret TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS bspay_signing_key TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS bspay_webhook_secret TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS bspay_api_url TEXT NOT NULL DEFAULT 'https://api.bspay.co';

CREATE OR REPLACE FUNCTION public.obter_payment_gateway_admin()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    'payment_gateway', COALESCE(NULLIF(TRIM(v_row.payment_gateway), ''), 'misticpay'),
    'misticpay_configured',
      COALESCE(NULLIF(TRIM(v_row.misticpay_ci), ''), '') <> ''
      AND COALESCE(NULLIF(TRIM(v_row.misticpay_cs), ''), '') <> '',
    'bspay_configured',
      COALESCE(NULLIF(TRIM(v_row.bspay_client_id), ''), '') <> ''
      AND COALESCE(NULLIF(TRIM(v_row.bspay_client_secret), ''), '') <> ''
      AND COALESCE(NULLIF(TRIM(v_row.bspay_signing_key), ''), '') <> '',
    'updated_at', v_row.updated_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.salvar_payment_gateway_admin(
  p_payment_gateway TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gateway TEXT;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  v_gateway := LOWER(TRIM(COALESCE(p_payment_gateway, '')));

  IF v_gateway NOT IN ('misticpay', 'bspay') THEN
    RETURN json_build_object('ok', false, 'error', 'Gateway inválido. Use misticpay ou bspay.');
  END IF;

  INSERT INTO public.integration_secrets (id, payment_gateway)
  VALUES (1, v_gateway)
  ON CONFLICT (id) DO UPDATE
  SET payment_gateway = EXCLUDED.payment_gateway,
      updated_at = NOW();

  RETURN json_build_object('ok', true, 'payment_gateway', v_gateway);
END;
$$;

CREATE OR REPLACE FUNCTION public.obter_bspay_config_admin()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.salvar_bspay_config_admin(
  p_bspay_client_id TEXT DEFAULT NULL,
  p_bspay_client_secret TEXT DEFAULT NULL,
  p_bspay_signing_key TEXT DEFAULT NULL,
  p_bspay_webhook_secret TEXT DEFAULT NULL,
  p_bspay_api_url TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

GRANT EXECUTE ON FUNCTION public.obter_payment_gateway_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.salvar_payment_gateway_admin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.obter_bspay_config_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.salvar_bspay_config_admin(TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

COMMENT ON COLUMN public.integration_secrets.payment_gateway IS 'Gateway PIX ativo: misticpay ou bspay';
COMMENT ON COLUMN public.integration_secrets.bspay_signing_key IS 'Chave HMAC para cash-out BSPay (diferente do client_secret)';

-- =============================================================================
-- [24/67] Fase 5 — Depósitos, saques, gateways e rollover
-- Fonte: AdminPainel/Database/patch_veopag_config.sql
-- =============================================================================
-- VeoPag + gateway veopag na seleção ativa
-- Execute no SQL Editor do Supabase (após patch_bspay_config.sql)

ALTER TABLE public.integration_secrets
  ADD COLUMN IF NOT EXISTS veopag_client_id TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS veopag_client_secret TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS veopag_webhook_secret TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS veopag_api_url TEXT NOT NULL DEFAULT 'https://api.veopag.com';

ALTER TABLE public.integration_secrets
  DROP CONSTRAINT IF EXISTS integration_secrets_payment_gateway_check;

ALTER TABLE public.integration_secrets
  ADD CONSTRAINT integration_secrets_payment_gateway_check
  CHECK (payment_gateway IN ('misticpay', 'bspay', 'veopag'));

CREATE OR REPLACE FUNCTION public.obter_payment_gateway_admin()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    'payment_gateway', COALESCE(NULLIF(TRIM(v_row.payment_gateway), ''), 'misticpay'),
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

CREATE OR REPLACE FUNCTION public.salvar_payment_gateway_admin(
  p_payment_gateway TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gateway TEXT;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  v_gateway := LOWER(TRIM(COALESCE(p_payment_gateway, '')));

  IF v_gateway NOT IN ('misticpay', 'bspay', 'veopag') THEN
    RETURN json_build_object('ok', false, 'error', 'Gateway inválido. Use misticpay, bspay ou veopag.');
  END IF;

  INSERT INTO public.integration_secrets (id, payment_gateway)
  VALUES (1, v_gateway)
  ON CONFLICT (id) DO UPDATE
  SET payment_gateway = EXCLUDED.payment_gateway,
      updated_at = NOW();

  RETURN json_build_object('ok', true, 'payment_gateway', v_gateway);
END;
$$;

CREATE OR REPLACE FUNCTION public.obter_veopag_config_admin()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.salvar_veopag_config_admin(
  p_veopag_client_id TEXT DEFAULT NULL,
  p_veopag_client_secret TEXT DEFAULT NULL,
  p_veopag_webhook_secret TEXT DEFAULT NULL,
  p_veopag_api_url TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

GRANT EXECUTE ON FUNCTION public.obter_veopag_config_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.salvar_veopag_config_admin(TEXT, TEXT, TEXT, TEXT) TO authenticated;

COMMENT ON COLUMN public.integration_secrets.veopag_client_id IS 'Client ID VeoPag (dashboard.veopag.com/credentials)';

-- =============================================================================
-- [25/67] Fase 5 — Depósitos, saques, gateways e rollover
-- Fonte: AdminPainel/Database/depositos_admin.sql
-- =============================================================================
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

-- =============================================================================
-- [26/67] Fase 5 — Depósitos, saques, gateways e rollover
-- Fonte: AdminPainel/Database/saques_admin.sql
-- =============================================================================
-- Gestão avançada de saques no painel admin
-- Execute no SQL Editor do Supabase

ALTER TABLE public.saques ADD COLUMN IF NOT EXISTS origem TEXT NOT NULL DEFAULT 'pix';

ALTER TABLE public.saques DROP CONSTRAINT IF EXISTS saques_status_check;
ALTER TABLE public.saques
  ADD CONSTRAINT saques_status_check
  CHECK (status IN ('aprovado', 'rejeitado', 'pendente', 'falhou'));

ALTER TABLE public.saques DROP CONSTRAINT IF EXISTS saques_origem_check;
ALTER TABLE public.saques
  ADD CONSTRAINT saques_origem_check
  CHECK (origem IN ('pix', 'revenue_share'));

COMMENT ON COLUMN public.saques.origem IS 'Origem do saque: pix (normal) ou revenue_share';

-- Reutiliza função de período (criada em depositos_admin.sql)
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

-- Devolve saldo ao rejeitar ou falhar saque pendente
CREATE OR REPLACE FUNCTION public.handle_saque_rejeitado()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('rejeitado', 'falhou') AND OLD.status = 'pendente' THEN
    UPDATE public.usuarios
    SET saldo = saldo + NEW.valor
    WHERE id = NEW.usuario_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS devolver_valor_saque_rejeitado ON public.saques;
CREATE TRIGGER devolver_valor_saque_rejeitado
  AFTER UPDATE OF status ON public.saques
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.handle_saque_rejeitado();

CREATE OR REPLACE FUNCTION public.obter_stats_saques_admin(p_periodo TEXT DEFAULT 'todos')
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.listar_saques_admin(
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
      format(
        'Saque %s: %s → %s | Valor: R$ %s | Usuário: %s',
        p_saque_id,
        v_dep_status,
        v_status,
        v_valor,
        COALESCE(v_usuario_email, '—')
      ),
      'sucesso',
      'saque',
      jsonb_build_object(
        'saque_id', p_saque_id,
        'status_anterior', v_dep_status,
        'status_novo', v_status,
        'valor', v_valor
      )
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

  RETURN json_build_object('ok', true, 'reprovados', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.obter_stats_saques_admin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.listar_saques_admin(TEXT, TEXT, TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_status_saque_admin(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reprovar_pendentes_saques_admin() TO authenticated;

-- =============================================================================
-- [27/67] Fase 5 — Depósitos, saques, gateways e rollover
-- Fonte: AdminPainel/Database/saques_status_fix.sql
-- =============================================================================
-- Fix: aceitar/recusar saques no painel admin
-- Execute no SQL Editor do Supabase

ALTER TABLE public.saques ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

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
      format(
        'Saque %s: %s → %s | Valor: R$ %s | Usuário: %s',
        p_saque_id,
        v_dep_status,
        v_status,
        v_valor,
        COALESCE(v_usuario_email, '—')
      ),
      'sucesso',
      'saque',
      jsonb_build_object(
        'saque_id', p_saque_id,
        'status_anterior', v_dep_status,
        'status_novo', v_status,
        'valor', v_valor
      )
    );
  EXCEPTION
    WHEN undefined_function THEN NULL;
    WHEN undefined_table THEN NULL;
  END;

  RETURN json_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_saque_rejeitado()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('rejeitado', 'falhou') AND OLD.status = 'pendente' THEN
    UPDATE public.usuarios
    SET saldo = saldo + NEW.valor
    WHERE id = NEW.usuario_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS devolver_valor_saque_rejeitado ON public.saques;
CREATE TRIGGER devolver_valor_saque_rejeitado
  AFTER UPDATE OF status ON public.saques
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.handle_saque_rejeitado();

GRANT EXECUTE ON FUNCTION public.atualizar_status_saque_admin(UUID, TEXT) TO authenticated;

-- =============================================================================
-- [28/67] Fase 5 — Depósitos, saques, gateways e rollover
-- Fonte: AdminPainel/Database/saques_misticpay.sql
-- =============================================================================
-- Colunas MisticPay em saques + índices
-- Execute no SQL Editor do Supabase

ALTER TABLE public.saques ADD COLUMN IF NOT EXISTS misticpay_job_id TEXT;
ALTER TABLE public.saques ADD COLUMN IF NOT EXISTS misticpay_transaction_id TEXT;
ALTER TABLE public.saques ADD COLUMN IF NOT EXISTS misticpay_status TEXT;

CREATE INDEX IF NOT EXISTS idx_saques_misticpay_transaction_id
  ON public.saques (misticpay_transaction_id)
  WHERE misticpay_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_saques_misticpay_job_id
  ON public.saques (misticpay_job_id)
  WHERE misticpay_job_id IS NOT NULL;

COMMENT ON COLUMN public.saques.misticpay_job_id IS 'ID do job de saque na MisticPay';
COMMENT ON COLUMN public.saques.misticpay_transaction_id IS 'ID da transação de saque na MisticPay';
COMMENT ON COLUMN public.saques.misticpay_status IS 'Status retornado pela MisticPay (ex.: QUEUED, COMPLETO)';

-- =============================================================================
-- [29/67] Fase 5 — Depósitos, saques, gateways e rollover
-- Fonte: AdminPainel/Database/saques_risco_admin.sql
-- =============================================================================
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

-- =============================================================================
-- [30/67] Fase 5 — Depósitos, saques, gateways e rollover
-- Fonte: AdminPainel/Database/rollover_admin.sql
-- =============================================================================
-- Gestão de rollover por usuário (painel admin)
-- Execute no SQL Editor do Supabase após rollover_system.sql

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS rollover_meta NUMERIC(12,2) NOT NULL DEFAULT 0;

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS rollover_inicio TIMESTAMPTZ;

ALTER TABLE public.usuarios
  DROP CONSTRAINT IF EXISTS usuarios_rollover_meta_check;

ALTER TABLE public.usuarios
  ADD CONSTRAINT usuarios_rollover_meta_check
  CHECK (rollover_meta >= 0);

COMMENT ON COLUMN public.usuarios.rollover_meta IS
  'Meta total de apostas exigida pelo rollover ativo.';
COMMENT ON COLUMN public.usuarios.rollover_inicio IS
  'Data/hora em que a trava de rollover foi ativada.';

CREATE OR REPLACE FUNCTION public.aplicar_rollover_deposito(
  p_usuario_id UUID,
  p_valor NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.obter_rollover_usuario_admin(p_usuario_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.aplicar_rollover_usuario_admin(
  p_usuario_id UUID,
  p_valor NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    RETURN json_build_object('ok', false, 'error', 'Usuário não encontrado');
  END IF;

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
    'Rollover aplicado ao usuário',
    format('Usuário: %s | Valor adicionado: R$ %s | Novo pendente: R$ %s', COALESCE(v_nome, p_usuario_id::text), v_valor, v_novo_pendente),
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
$$;

CREATE OR REPLACE FUNCTION public.desativar_rollover_usuario_admin(p_usuario_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    RETURN json_build_object('ok', false, 'error', 'Usuário não encontrado');
  END IF;

  UPDATE public.usuarios
  SET
    rollover_pendente = 0,
    rollover_meta = 0,
    rollover_inicio = NULL,
    updated_at = NOW()
  WHERE id = p_usuario_id;

  PERFORM public.registrar_admin_log(
    'Rollover desativado',
    format('Usuário: %s | Pendente removido: R$ %s', COALESCE(v_nome, p_usuario_id::text), v_pendente),
    'sucesso',
    'usuarios',
    jsonb_build_object(
      'usuario_id', p_usuario_id,
      'rollover_removido', v_pendente
    )
  );

  RETURN json_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.obter_rollover_usuario_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.aplicar_rollover_usuario_admin(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.desativar_rollover_usuario_admin(UUID) TO authenticated;

-- =============================================================================
-- [31/67] Fase 6 — Cupons e roleta de prêmios
-- Fonte: AdminPainel/Database/cupons.sql
-- =============================================================================
-- Sistema de cupons configurável pelo administrador
-- Execute no SQL Editor do Supabase

-- ============================================================
-- TABELAS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.cupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_admin TEXT NOT NULL,
  codigo TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  tipo_valor TEXT NOT NULL CHECK (tipo_valor IN ('porcentagem', 'fixo')),
  valor DECIMAL(10,2) NOT NULL CHECK (valor > 0),
  tipo_bonus TEXT NOT NULL DEFAULT 'saldo_real' CHECK (tipo_bonus IN ('saldo_real', 'giros_gratis')),
  deposito_minimo DECIMAL(10,2),
  bonus_maximo DECIMAL(10,2),
  limite_uso_total INT,
  limite_uso_por_usuario INT NOT NULL DEFAULT 1,
  usos_total INT NOT NULL DEFAULT 0,
  jogo_slug TEXT,
  jogo_nome TEXT,
  provider_slug TEXT DEFAULT 'pragmatic',
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  CONSTRAINT cupons_codigo_unique UNIQUE (codigo),
  CONSTRAINT cupons_deposito_minimo_nonneg CHECK (deposito_minimo IS NULL OR deposito_minimo >= 0),
  CONSTRAINT cupons_bonus_maximo_nonneg CHECK (bonus_maximo IS NULL OR bonus_maximo > 0),
  CONSTRAINT cupons_limite_uso_total_pos CHECK (limite_uso_total IS NULL OR limite_uso_total > 0),
  CONSTRAINT cupons_limite_uso_por_usuario_pos CHECK (limite_uso_por_usuario > 0)
);

CREATE INDEX IF NOT EXISTS idx_cupons_codigo ON public.cupons(UPPER(codigo));
CREATE INDEX IF NOT EXISTS idx_cupons_ativo ON public.cupons(ativo) WHERE ativo = true;

CREATE TABLE IF NOT EXISTS public.cupom_usos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cupom_id UUID NOT NULL REFERENCES public.cupons(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  deposito_id UUID REFERENCES public.depositos(id) ON DELETE SET NULL,
  valor_bonus DECIMAL(10,2) NOT NULL,
  valor_deposito DECIMAL(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_cupom_usos_cupom ON public.cupom_usos(cupom_id);
CREATE INDEX IF NOT EXISTS idx_cupom_usos_usuario ON public.cupom_usos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_cupom_usos_deposito ON public.cupom_usos(deposito_id);

-- Coluna opcional no depósito para vincular cupom aplicado no checkout
ALTER TABLE public.depositos ADD COLUMN IF NOT EXISTS cupom_codigo TEXT;

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.cupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cupom_usos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin pode gerenciar cupons" ON public.cupons;
DROP POLICY IF EXISTS "Usuario ve proprios usos de cupom" ON public.cupom_usos;
DROP POLICY IF EXISTS "Admin pode ver todos usos de cupom" ON public.cupom_usos;

CREATE POLICY "Admin pode gerenciar cupons"
  ON public.cupons FOR ALL
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

CREATE POLICY "Usuario ve proprios usos de cupom"
  ON public.cupom_usos FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Admin pode ver todos usos de cupom"
  ON public.cupom_usos FOR SELECT
  USING (public.is_user_admin());

GRANT SELECT ON public.cupom_usos TO authenticated;

COMMENT ON TABLE public.cupons IS 'Cupons promocionais configuráveis pelo administrador';
COMMENT ON TABLE public.cupom_usos IS 'Histórico de ativações de cupons por usuário';

-- =============================================================================
-- [32/67] Fase 6 — Cupons e roleta de prêmios
-- Fonte: AdminPainel/Database/cupons_giros.sql
-- =============================================================================
-- Extensão do sistema de cupons para rodadas grátis em jogos específicos
-- Execute após cupons.sql no SQL Editor do Supabase

-- ============================================================
-- EXTENSÃO DA TABELA CUPONS
-- ============================================================

ALTER TABLE public.cupons DROP CONSTRAINT IF EXISTS cupons_tipo_bonus_check;

ALTER TABLE public.cupons
  ADD CONSTRAINT cupons_tipo_bonus_check
  CHECK (tipo_bonus IN ('saldo_real', 'giros_gratis'));

ALTER TABLE public.cupons ADD COLUMN IF NOT EXISTS jogo_slug TEXT;
ALTER TABLE public.cupons ADD COLUMN IF NOT EXISTS jogo_nome TEXT;
ALTER TABLE public.cupons ADD COLUMN IF NOT EXISTS provider_slug TEXT DEFAULT 'pragmatic';

ALTER TABLE public.cupom_usos ADD COLUMN IF NOT EXISTS quantidade_giros INT;
ALTER TABLE public.cupom_usos ADD COLUMN IF NOT EXISTS jogo_slug TEXT;
ALTER TABLE public.cupom_usos ADD COLUMN IF NOT EXISTS jogo_nome TEXT;
ALTER TABLE public.cupom_usos ADD COLUMN IF NOT EXISTS origem TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE public.cupom_usos ADD COLUMN IF NOT EXISTS status_giro TEXT;

ALTER TABLE public.cupom_usos DROP CONSTRAINT IF EXISTS cupom_usos_origem_check;
ALTER TABLE public.cupom_usos
  ADD CONSTRAINT cupom_usos_origem_check
  CHECK (origem IN ('manual', 'deposito', 'roleta'));

ALTER TABLE public.cupom_usos DROP CONSTRAINT IF EXISTS cupom_usos_status_giro_check;
ALTER TABLE public.cupom_usos
  ADD CONSTRAINT cupom_usos_status_giro_check
  CHECK (status_giro IS NULL OR status_giro IN ('pendente_deposito', 'disponivel', 'usado'));

COMMENT ON COLUMN public.cupons.jogo_slug IS 'Slug do jogo (apenas cupons giros_gratis)';
COMMENT ON COLUMN public.cupons.jogo_nome IS 'Nome exibido do jogo (apenas cupons giros_gratis)';
COMMENT ON COLUMN public.cupons.provider_slug IS 'Slug do provedor, ex: pragmatic';
COMMENT ON COLUMN public.cupom_usos.quantidade_giros IS 'Quantidade de rodadas grátis concedidas';
COMMENT ON COLUMN public.cupom_usos.status_giro IS 'Status das rodadas: pendente_deposito, disponivel, usado';

-- =============================================================================
-- [33/67] Fase 6 — Cupons e roleta de prêmios
-- Fonte: AdminPainel/Database/cupons_rpc.sql
-- =============================================================================
-- Funções RPC do sistema de cupons
-- Execute após cupons.sql no SQL Editor do Supabase

-- ============================================================
-- HELPERS INTERNOS
-- ============================================================

CREATE OR REPLACE FUNCTION public._calcular_bonus_cupom(
  p_tipo_valor TEXT,
  p_valor DECIMAL,
  p_bonus_maximo DECIMAL,
  p_valor_deposito DECIMAL DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
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

CREATE OR REPLACE FUNCTION public._buscar_cupom_ativo(p_codigo TEXT)
RETURNS public.cupons
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public._validar_limites_cupom(
  p_cupom public.cupons,
  p_usuario_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
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

-- ============================================================
-- VALIDAR CUPOM (preview sem ativar)
-- ============================================================

CREATE OR REPLACE FUNCTION public.validar_cupom(
  p_codigo TEXT,
  p_valor_deposito NUMERIC DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_cupom public.cupons;
  v_limites JSON;
  v_bonus NUMERIC;
  v_requer_deposito BOOLEAN;
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

  v_limites := public._validar_limites_cupom(v_cupom, v_uid);
  IF NOT (v_limites->>'ok')::BOOLEAN THEN
    RETURN v_limites;
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

-- ============================================================
-- ATIVAR CUPOM (sem depósito — apenas valor fixo)
-- ============================================================

CREATE OR REPLACE FUNCTION public.ativar_cupom(p_codigo TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_cupom public.cupons;
  v_limites JSON;
  v_bonus NUMERIC;
  v_requer_deposito BOOLEAN;
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

  v_limites := public._validar_limites_cupom(v_cupom, v_uid);
  IF NOT (v_limites->>'ok')::BOOLEAN THEN
    RETURN v_limites;
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

  INSERT INTO public.cupom_usos (cupom_id, usuario_id, valor_bonus, valor_deposito)
  VALUES (v_cupom.id, v_uid, v_bonus, NULL);

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

-- ============================================================
-- APLICAR CUPOM NO DEPÓSITO (chamado ao confirmar PIX)
-- ============================================================

CREATE OR REPLACE FUNCTION public.aplicar_cupom_deposito(
  p_deposito_id UUID,
  p_codigo TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  INSERT INTO public.cupom_usos (cupom_id, usuario_id, deposito_id, valor_bonus, valor_deposito)
  VALUES (v_cupom.id, v_uid, p_deposito_id, v_bonus, v_valor_deposito);

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

-- ============================================================
-- LISTAR HISTÓRICO DE CUPONS DO USUÁRIO
-- ============================================================

CREATE OR REPLACE FUNCTION public.listar_cupons_usuario()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
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
      'Ativado' AS status,
      TO_CHAR(cu.created_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') AS data,
      cu.created_at
    FROM public.cupom_usos cu
    INNER JOIN public.cupons c ON c.id = cu.cupom_id
    WHERE cu.usuario_id = v_uid
  ) t;

  RETURN json_build_object('ok', true, 'cupons', v_result);
END;
$$;

-- ============================================================
-- GRANTS
-- ============================================================

GRANT EXECUTE ON FUNCTION public.validar_cupom(TEXT, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ativar_cupom(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.aplicar_cupom_deposito(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.listar_cupons_usuario() TO authenticated;

COMMENT ON FUNCTION public.validar_cupom(TEXT, NUMERIC) IS
  'Valida um cupom e retorna preview do bônus. p_valor_deposito opcional para cupons de depósito.';
COMMENT ON FUNCTION public.ativar_cupom(TEXT) IS
  'Ativa cupom de valor fixo sem depósito. Credita saldo real.';
COMMENT ON FUNCTION public.aplicar_cupom_deposito(UUID, TEXT) IS
  'Aplica cupom após depósito aprovado. Credita bônus no saldo real.';
COMMENT ON FUNCTION public.listar_cupons_usuario() IS
  'Lista histórico de cupons ativados pelo usuário autenticado.';

-- =============================================================================
-- [34/67] Fase 6 — Cupons e roleta de prêmios
-- Fonte: VenuzBET - Front/Database/cupons_rpc_giros.sql
-- =============================================================================
-- Atualização das RPCs de cupons para suportar rodadas grátis
-- Execute após cupons_giros.sql no SQL Editor do Supabase

-- ============================================================
-- JOGOS PERMITIDOS PARA CUPONS DE RODADAS
-- ============================================================

CREATE OR REPLACE FUNCTION public._jogo_giros_permitido(p_slug TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
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

CREATE OR REPLACE FUNCTION public._validar_cupom_giros(p_cupom public.cupons)
RETURNS JSON
LANGUAGE plpgsql
IMMUTABLE
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

-- ============================================================
-- CONCEDER GIROS GRÁTIS (interno)
-- ============================================================

CREATE OR REPLACE FUNCTION public._conceder_giros_gratis(
  p_cupom public.cupons,
  p_usuario_id UUID,
  p_deposito_id UUID DEFAULT NULL,
  p_valor_deposito NUMERIC DEFAULT NULL,
  p_origem TEXT DEFAULT 'manual',
  p_status_giro TEXT DEFAULT 'disponivel'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- ============================================================
-- VALIDAR CUPOM (atualizado)
-- ============================================================

CREATE OR REPLACE FUNCTION public.validar_cupom(
  p_codigo TEXT,
  p_valor_deposito NUMERIC DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
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

-- ============================================================
-- ATIVAR CUPOM (atualizado)
-- ============================================================

CREATE OR REPLACE FUNCTION public.ativar_cupom(p_codigo TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- ============================================================
-- APLICAR CUPOM NO DEPÓSITO (atualizado)
-- ============================================================

CREATE OR REPLACE FUNCTION public.aplicar_cupom_deposito(
  p_deposito_id UUID,
  p_codigo TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- ============================================================
-- LISTAR HISTÓRICO (atualizado)
-- ============================================================

CREATE OR REPLACE FUNCTION public.listar_cupons_usuario()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
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

-- ============================================================
-- MARCAR RODADAS GRÁTIS COMO USADAS (após free_bonus na PlayFivers)
-- ============================================================

CREATE OR REPLACE FUNCTION public.marcar_rodadas_gratis_usadas(p_cupom_uso_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

GRANT EXECUTE ON FUNCTION public._jogo_giros_permitido(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validar_cupom(TEXT, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ativar_cupom(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.aplicar_cupom_deposito(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.listar_cupons_usuario() TO authenticated;
GRANT EXECUTE ON FUNCTION public.marcar_rodadas_gratis_usadas(UUID) TO authenticated;

-- =============================================================================
-- [35/67] Fase 6 — Cupons e roleta de prêmios
-- Fonte: AdminPainel/Database/prize_wheel.sql
-- =============================================================================
-- Sistema de Roleta de Prêmios configurável pelo administrador
-- Execute após cupons.sql e cupons_giros.sql no SQL Editor do Supabase

-- ============================================================
-- TABELAS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.prize_wheel_config (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  ativo BOOLEAN NOT NULL DEFAULT true,
  titulo_imagem_url TEXT,
  banner_imagem_url TEXT,
  roleta_imagem_url TEXT,
  widget_imagem_url TEXT,
  centro_imagem_url TEXT,
  giros_por_periodo INT NOT NULL DEFAULT 1 CHECK (giros_por_periodo > 0),
  cooldown_horas INT NOT NULL DEFAULT 24 CHECK (cooldown_horas >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS public.prize_wheel_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_admin TEXT NOT NULL,
  label TEXT NOT NULL,
  cupom_id UUID NOT NULL REFERENCES public.cupons(id) ON DELETE RESTRICT,
  peso INT NOT NULL DEFAULT 1 CHECK (peso > 0),
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_prize_wheel_segments_ordem ON public.prize_wheel_segments(ordem);
CREATE INDEX IF NOT EXISTS idx_prize_wheel_segments_ativo ON public.prize_wheel_segments(ativo) WHERE ativo = true;

CREATE TABLE IF NOT EXISTS public.prize_wheel_spins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  segment_id UUID NOT NULL REFERENCES public.prize_wheel_segments(id) ON DELETE RESTRICT,
  cupom_id UUID NOT NULL REFERENCES public.cupons(id) ON DELETE RESTRICT,
  cupom_uso_id UUID REFERENCES public.cupom_usos(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE INDEX IF NOT EXISTS idx_prize_wheel_spins_usuario ON public.prize_wheel_spins(usuario_id);
CREATE INDEX IF NOT EXISTS idx_prize_wheel_spins_created ON public.prize_wheel_spins(usuario_id, created_at DESC);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.prize_wheel_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prize_wheel_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prize_wheel_spins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Publico ve config roleta ativa" ON public.prize_wheel_config;
DROP POLICY IF EXISTS "Admin gerencia config roleta" ON public.prize_wheel_config;
DROP POLICY IF EXISTS "Publico ve segmentos roleta ativos" ON public.prize_wheel_segments;
DROP POLICY IF EXISTS "Admin gerencia segmentos roleta" ON public.prize_wheel_segments;
DROP POLICY IF EXISTS "Usuario ve proprios giros roleta" ON public.prize_wheel_spins;
DROP POLICY IF EXISTS "Admin ve todos giros roleta" ON public.prize_wheel_spins;

CREATE POLICY "Publico ve config roleta ativa"
  ON public.prize_wheel_config FOR SELECT
  USING (ativo = true);

CREATE POLICY "Admin gerencia config roleta"
  ON public.prize_wheel_config FOR ALL
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

CREATE POLICY "Publico ve segmentos roleta ativos"
  ON public.prize_wheel_segments FOR SELECT
  USING (ativo = true);

CREATE POLICY "Admin gerencia segmentos roleta"
  ON public.prize_wheel_segments FOR ALL
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

CREATE POLICY "Usuario ve proprios giros roleta"
  ON public.prize_wheel_spins FOR SELECT
  USING (auth.uid() = usuario_id);

CREATE POLICY "Admin ve todos giros roleta"
  ON public.prize_wheel_spins FOR SELECT
  USING (public.is_user_admin());

GRANT SELECT ON public.prize_wheel_config TO anon, authenticated;
GRANT SELECT ON public.prize_wheel_segments TO anon, authenticated;
GRANT SELECT ON public.prize_wheel_spins TO authenticated;

-- ============================================================
-- SEED INICIAL
-- ============================================================

INSERT INTO public.prize_wheel_config (
  id,
  ativo,
  titulo_imagem_url,
  banner_imagem_url,
  roleta_imagem_url,
  widget_imagem_url,
  centro_imagem_url,
  giros_por_periodo,
  cooldown_horas
)
VALUES (
  1,
  true,
  'https://betsolution.net/roleta/api/image_proxy.php?p=uploads%2Froulettes%2F69b332751671a_Camada%200.png',
  'https://betsolution.net/roleta/api/image_proxy.php?p=uploads%2Froulettes%2F69ae5a84b9cff_SEU%20PR%C3%8AMIO%20URANO.png',
  'https://betsolution.net/roleta/api/image_proxy.php?p=uploads%2Froulettes%2F69ae5add7dcc9_URANO%20ROLETA.png',
  'https://betsolution.net/roleta/api/image_proxy.php?p=uploads%2Froulettes%2F69ae5a84b95b9_ChatGPTImage8_03_202617_52_42.png',
  'https://betsolution.net/roleta/api/image_proxy.php?p=uploads%2Froulettes%2F69ae5a84b95b9_ChatGPTImage8_03_202617_52_42.png',
  1,
  24
)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE public.prize_wheel_config IS 'Configuração global da roleta de prêmios';
COMMENT ON TABLE public.prize_wheel_segments IS 'Segmentos da roleta vinculados a cupons de rodadas';
COMMENT ON TABLE public.prize_wheel_spins IS 'Histórico de giros na roleta por usuário';

-- =============================================================================
-- [36/67] Fase 6 — Cupons e roleta de prêmios
-- Fonte: AdminPainel/Database/prize_wheel_rpc.sql
-- =============================================================================
-- Funções RPC da Roleta de Prêmios
-- Execute após prize_wheel.sql e cupons_rpc_giros.sql no SQL Editor do Supabase

-- ============================================================
-- OBTER CONFIGURAÇÃO DA ROLETA
-- ============================================================

CREATE OR REPLACE FUNCTION public.obter_roleta_config()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
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

-- ============================================================
-- STATUS DA ROLETA PARA O USUÁRIO
-- ============================================================

CREATE OR REPLACE FUNCTION public.obter_status_roleta()
RETURNS JSON
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
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

-- ============================================================
-- GIRAR ROLETA
-- ============================================================

CREATE OR REPLACE FUNCTION public.girar_roleta()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

GRANT EXECUTE ON FUNCTION public.obter_roleta_config() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.obter_status_roleta() TO authenticated;
GRANT EXECUTE ON FUNCTION public.girar_roleta() TO authenticated;

COMMENT ON FUNCTION public.obter_roleta_config() IS 'Retorna configuração e segmentos ativos da roleta de prêmios';
COMMENT ON FUNCTION public.obter_status_roleta() IS 'Verifica se o usuário pode girar a roleta no período atual';
COMMENT ON FUNCTION public.girar_roleta() IS 'Executa um giro na roleta e concede o prêmio via cupom de rodadas';

-- =============================================================================
-- [37/67] Fase 6 — Cupons e roleta de prêmios
-- Fonte: AdminPainel/Database/prize_wheel_widget_image.sql
-- =============================================================================
-- Separa a imagem do widget flutuante da imagem do botão central (girar)
-- Execute no SQL Editor do Supabase

ALTER TABLE public.prize_wheel_config
  ADD COLUMN IF NOT EXISTS widget_imagem_url TEXT;

-- Mantém o widget com a mesma imagem atual até o admin configurar outra
UPDATE public.prize_wheel_config
SET widget_imagem_url = centro_imagem_url
WHERE id = 1
  AND widget_imagem_url IS NULL
  AND centro_imagem_url IS NOT NULL;

-- =============================================================================
-- [38/67] Fase 7 — Aviator (admin + motor PlayFiver)
-- Fonte: AdminPainel/Database/aviator_config.sql
-- =============================================================================
-- Configuração de RTP / recuperação da casa — Aviator
-- Execute no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS public.aviator_config (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),

  -- RTP base (ex.: 0.9700 = 97% retorno ao jogador, ~3% margem da casa)
  rtp_base NUMERIC(6, 4) NOT NULL DEFAULT 0.9700,
  rtp_min NUMERIC(6, 4) NOT NULL DEFAULT 0.9000,
  rtp_max NUMERIC(6, 4) NOT NULL DEFAULT 0.9900,

  -- Recovery automático (GGR)
  recovery_enabled BOOLEAN NOT NULL DEFAULT true,
  recovery_window_hours INT NOT NULL DEFAULT 24,
  ggr_target_pct NUMERIC(6, 2) NOT NULL DEFAULT 3.00,
  recovery_strength NUMERIC(6, 4) NOT NULL DEFAULT 0.2500,
  recovery_max_adjustment NUMERIC(6, 4) NOT NULL DEFAULT 0.0200,
  min_wagered_for_recovery NUMERIC(14, 2) NOT NULL DEFAULT 100.00,

  -- Limites de crash
  min_crash NUMERIC(8, 2) NOT NULL DEFAULT 1.01,
  max_crash NUMERIC(8, 2) NOT NULL DEFAULT 500.00,
  queue_size INT NOT NULL DEFAULT 50,

  -- Recovery contínuo: gatilhos em R$ (casa perdendo / lucrando)
  recovery_loss_trigger_brl NUMERIC(14, 2) NOT NULL DEFAULT 10000.00,
  recovery_profit_trigger_brl NUMERIC(14, 2) NOT NULL DEFAULT 10000.00,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

INSERT INTO public.aviator_config (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.aviator_config
  ADD COLUMN IF NOT EXISTS recovery_loss_trigger_brl NUMERIC(14, 2) NOT NULL DEFAULT 10000.00,
  ADD COLUMN IF NOT EXISTS recovery_profit_trigger_brl NUMERIC(14, 2) NOT NULL DEFAULT 10000.00;

ALTER TABLE public.aviator_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin gerencia aviator_config" ON public.aviator_config;
CREATE POLICY "Admin gerencia aviator_config"
  ON public.aviator_config
  FOR ALL
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

-- Estatísticas de GGR (somente apostas finalizadas)
CREATE OR REPLACE FUNCTION public.calcular_aviator_ggr(p_window_hours INT DEFAULT 24)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.obter_aviator_config_admin()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  v_stats := public.calcular_aviator_ggr(v_config.recovery_window_hours);

  RETURN json_build_object(
    'ok', true,
    'config', json_build_object(
      'rtp_base', v_config.rtp_base,
      'rtp_min', v_config.rtp_min,
      'rtp_max', v_config.rtp_max,
      'recovery_enabled', v_config.recovery_enabled,
      'recovery_window_hours', v_config.recovery_window_hours,
      'ggr_target_pct', v_config.ggr_target_pct,
      'recovery_strength', v_config.recovery_strength,
      'recovery_max_adjustment', v_config.recovery_max_adjustment,
      'min_wagered_for_recovery', v_config.min_wagered_for_recovery,
      'recovery_loss_trigger_brl', COALESCE(v_config.recovery_loss_trigger_brl, 10000),
      'recovery_profit_trigger_brl', COALESCE(v_config.recovery_profit_trigger_brl, 10000),
      'min_crash', v_config.min_crash,
      'max_crash', v_config.max_crash,
      'queue_size', v_config.queue_size,
      'updated_at', v_config.updated_at
    ),
    'stats', v_stats
  );
END;
$$;

DROP FUNCTION IF EXISTS public.atualizar_aviator_config_admin(
  NUMERIC, NUMERIC, NUMERIC, BOOLEAN, INT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, INT
);
DROP FUNCTION IF EXISTS public.atualizar_aviator_config_admin(
  NUMERIC, NUMERIC, NUMERIC, BOOLEAN, INT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, INT
);

CREATE OR REPLACE FUNCTION public.atualizar_aviator_config_admin(
  p_rtp_base NUMERIC DEFAULT NULL,
  p_rtp_min NUMERIC DEFAULT NULL,
  p_rtp_max NUMERIC DEFAULT NULL,
  p_recovery_enabled BOOLEAN DEFAULT NULL,
  p_recovery_window_hours INT DEFAULT NULL,
  p_ggr_target_pct NUMERIC DEFAULT NULL,
  p_recovery_strength NUMERIC DEFAULT NULL,
  p_recovery_max_adjustment NUMERIC DEFAULT NULL,
  p_min_wagered_for_recovery NUMERIC DEFAULT NULL,
  p_recovery_loss_trigger_brl NUMERIC DEFAULT NULL,
  p_recovery_profit_trigger_brl NUMERIC DEFAULT NULL,
  p_min_crash NUMERIC DEFAULT NULL,
  p_max_crash NUMERIC DEFAULT NULL,
  p_queue_size INT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  RETURN public.obter_aviator_config_admin();
END;
$$;

-- Motor do jogo (service role / Node) — sem auth de admin
CREATE OR REPLACE FUNCTION public.obter_aviator_engine_config()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
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
BEGIN
  SELECT * INTO v_config FROM public.aviator_config WHERE id = 1;
  IF NOT FOUND THEN
    INSERT INTO public.aviator_config (id) VALUES (1);
    SELECT * INTO v_config FROM public.aviator_config WHERE id = 1;
  END IF;

  v_hours := GREATEST(v_config.recovery_window_hours, 1);
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

  v_ggr_bucket := FLOOR(v_ggr / 500);
  v_rtp_bucket := ROUND(v_effective_rtp * 1000);
  v_engine_version := v_rtp_bucket::TEXT || ':' || v_ggr_bucket::TEXT;

  RETURN json_build_object(
    'ok', true,
    'rtp_factor', v_effective_rtp,
    'rtp_base', v_config.rtp_base,
    'rtp_min', v_config.rtp_min,
    'rtp_max', v_config.rtp_max,
    'effective_rtp', v_effective_rtp,
    'recovery_enabled', v_config.recovery_enabled,
    'recovery_adjustment', v_config.rtp_base - v_effective_rtp,
    'recovery_mode', v_recovery_mode,
    'min_crash_mul', GREATEST(101, FLOOR(v_config.min_crash * 100)::INT),
    'max_crash_mul', LEAST(1000000, FLOOR(v_config.max_crash * 100)::INT),
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

GRANT EXECUTE ON FUNCTION public.calcular_aviator_ggr(INT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.obter_aviator_config_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_aviator_config_admin(
  NUMERIC, NUMERIC, NUMERIC, BOOLEAN, INT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, INT
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.obter_aviator_engine_config() TO anon, authenticated, service_role;

COMMENT ON TABLE public.aviator_config IS 'RTP base, limites e recovery automático do Aviator';

-- Auditoria (requer trg_admin_audit_log de admin_logs.sql)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'trg_admin_audit_log'
  )
     AND to_regclass('public.aviator_config') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_admin_audit_aviator_config ON public.aviator_config;
    CREATE TRIGGER trg_admin_audit_aviator_config
      AFTER INSERT OR UPDATE OR DELETE ON public.aviator_config
      FOR EACH ROW EXECUTE FUNCTION public.trg_admin_audit_log();
  END IF;
END;
$$;

-- Rótulo amigável nos logs (opcional se admin_logs.sql já foi executado)
CREATE OR REPLACE FUNCTION public._admin_table_label(p_table TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_table
    WHEN 'cms_items' THEN 'Item CMS'
    WHEN 'home_sections' THEN 'Seção Home'
    WHEN 'site_config' THEN 'Config. Site'
    WHEN 'aviator_config' THEN 'Config. Aviator RTP'
    WHEN 'all_games_page_config' THEN 'Página Todos Jogos'
    WHEN 'all_games_providers' THEN 'Provedor (Todos Jogos)'
    WHEN 'all_games_categories' THEN 'Categoria (Todos Jogos)'
    WHEN 'cupons' THEN 'Cupom'
    WHEN 'prize_wheel_config' THEN 'Config. Roleta'
    WHEN 'prize_wheel_segments' THEN 'Segmento Roleta'
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

-- =============================================================================
-- [39/67] Fase 7 — Aviator (admin + motor PlayFiver)
-- Fonte: PlayFiverAPI/Database/aviator_supabase.sql
-- =============================================================================
-- Migração: Aviator próprio — campos extras para sincronizar com o motor Python
-- Execute no SQL Editor do Supabase

ALTER TABLE public.aviator_rounds
  ADD COLUMN IF NOT EXISTS external_round_id BIGINT,
  ADD COLUMN IF NOT EXISTS server_seed TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS aviator_rounds_external_round_id_idx
  ON public.aviator_rounds(external_round_id)
  WHERE external_round_id IS NOT NULL;

ALTER TABLE public.aviator_bets
  ADD COLUMN IF NOT EXISTS bet_slot SMALLINT NOT NULL DEFAULT 1;

CREATE UNIQUE INDEX IF NOT EXISTS aviator_bets_round_user_slot_idx
  ON public.aviator_bets(round_id, usuario_id, bet_slot);

ALTER TABLE public.aviator_velas
  ADD COLUMN IF NOT EXISTS external_round_id BIGINT;

CREATE INDEX IF NOT EXISTS aviator_velas_external_round_id_idx
  ON public.aviator_velas(external_round_id)
  WHERE external_round_id IS NOT NULL;

COMMENT ON COLUMN public.aviator_rounds.external_round_id IS 'ID da rodada no motor Python (ex.: 8273700)';
COMMENT ON COLUMN public.aviator_rounds.server_seed IS 'Seed do servidor para fairness';
COMMENT ON COLUMN public.aviator_bets.bet_slot IS 'Slot da aposta no cliente (1 ou 2)';
COMMENT ON COLUMN public.aviator_velas.external_round_id IS 'ID da rodada no motor Python';

-- Histórico: no máximo 27 velas no Supabase (remove as mais antigas após cada insert).
-- O motor Python não usa mais SQLite local (historico.db).

CREATE OR REPLACE FUNCTION public.trim_aviator_velas()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

DROP TRIGGER IF EXISTS trim_aviator_velas_after_insert ON public.aviator_velas;
CREATE TRIGGER trim_aviator_velas_after_insert
  AFTER INSERT ON public.aviator_velas
  FOR EACH ROW
  EXECUTE FUNCTION public.trim_aviator_velas();

-- =============================================================================
-- [40/67] Fase 7 — Aviator (admin + motor PlayFiver)
-- Fonte: AdminPainel/Database/patch_aviator_rtp_velas.sql
-- =============================================================================
-- Aviator RTP v2 — RTP geral de referência, porcentagens de cor, crash geral
-- Sem recovery GGR no motor de produção. Rode no Supabase SQL Editor.

ALTER TABLE public.aviator_config
  ADD COLUMN IF NOT EXISTS pct_vela_azul NUMERIC(5, 2) NOT NULL DEFAULT 52.00,
  ADD COLUMN IF NOT EXISTS pct_vela_roxa NUMERIC(5, 2) NOT NULL DEFAULT 38.00,
  ADD COLUMN IF NOT EXISTS pct_vela_rosa NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
  ADD COLUMN IF NOT EXISTS rtp_limit_min_pct NUMERIC(5, 2) NOT NULL DEFAULT 85.00,
  ADD COLUMN IF NOT EXISTS rtp_limit_max_pct NUMERIC(5, 2) NOT NULL DEFAULT 99.99,
  ADD COLUMN IF NOT EXISTS crash_technical_max NUMERIC(10, 2) NOT NULL DEFAULT 1000.00;

-- Remove assinaturas antigas da função admin
DROP FUNCTION IF EXISTS public.atualizar_aviator_config_admin(
  NUMERIC, NUMERIC, NUMERIC, BOOLEAN, INT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, INT
);
DROP FUNCTION IF EXISTS public.atualizar_aviator_config_admin(
  NUMERIC, NUMERIC, NUMERIC, BOOLEAN, INT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, INT
);

CREATE OR REPLACE FUNCTION public.obter_aviator_config_admin()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
      'rtp_geral', v_config.rtp_base,
      'pct_vela_azul', v_config.pct_vela_azul,
      'pct_vela_roxa', v_config.pct_vela_roxa,
      'pct_vela_rosa', v_config.pct_vela_rosa,
      'min_crash', v_config.min_crash,
      'max_crash', v_config.max_crash,
      'queue_size', v_config.queue_size,
      'rtp_limit_min_pct', v_config.rtp_limit_min_pct,
      'rtp_limit_max_pct', v_config.rtp_limit_max_pct,
      'crash_technical_max', v_config.crash_technical_max,
      'updated_at', v_config.updated_at
    ),
    'stats', v_stats
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.atualizar_aviator_config_admin(
  p_rtp_geral NUMERIC DEFAULT NULL,
  p_pct_vela_azul NUMERIC DEFAULT NULL,
  p_pct_vela_roxa NUMERIC DEFAULT NULL,
  p_pct_vela_rosa NUMERIC DEFAULT NULL,
  p_min_crash NUMERIC DEFAULT NULL,
  p_max_crash NUMERIC DEFAULT NULL,
  p_queue_size INT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config public.aviator_config%ROWTYPE;
  v_rtp_geral NUMERIC;
  v_pct_azul NUMERIC;
  v_pct_roxa NUMERIC;
  v_pct_rosa NUMERIC;
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

  v_rtp_geral := COALESCE(p_rtp_geral, v_config.rtp_base);
  v_pct_azul := COALESCE(p_pct_vela_azul, v_config.pct_vela_azul);
  v_pct_roxa := COALESCE(p_pct_vela_roxa, v_config.pct_vela_roxa);
  v_pct_rosa := COALESCE(p_pct_vela_rosa, v_config.pct_vela_rosa);
  v_min_crash := COALESCE(p_min_crash, v_config.min_crash);
  v_max_crash := COALESCE(p_max_crash, v_config.max_crash);
  v_queue_size := COALESCE(p_queue_size, v_config.queue_size);

  v_rtp_pct := v_rtp_geral * 100;
  IF v_rtp_geral IS NULL OR v_rtp_geral <= 0 OR v_rtp_geral >= 1
     OR v_rtp_geral <> v_rtp_geral THEN
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

  IF v_min_crash IS NULL OR v_max_crash IS NULL
     OR v_min_crash < 1.00 OR v_max_crash > v_config.crash_technical_max
     OR v_min_crash <> v_min_crash OR v_max_crash <> v_max_crash
     OR v_min_crash > v_max_crash THEN
    RETURN json_build_object('ok', false, 'error', 'Limites de crash inválidos.');
  END IF;

  IF v_queue_size < 10 OR v_queue_size > 200 THEN
    RETURN json_build_object('ok', false, 'error', 'Tamanho da fila deve estar entre 10 e 200.');
  END IF;

  UPDATE public.aviator_config
  SET
    rtp_base = v_rtp_geral,
    pct_vela_azul = v_pct_azul,
    pct_vela_roxa = v_pct_roxa,
    pct_vela_rosa = v_pct_rosa,
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
      'Parâmetros de RTP e velas do Aviator alterados.',
      'sucesso',
      'jogo',
      json_build_object(
        'rtp_geral', v_rtp_geral,
        'pct_vela_azul', v_pct_azul,
        'pct_vela_roxa', v_pct_roxa,
        'pct_vela_rosa', v_pct_rosa,
        'min_crash', v_min_crash,
        'max_crash', v_max_crash
      )::jsonb
    );
  END IF;

  RETURN public.obter_aviator_config_admin();
END;
$$;

CREATE OR REPLACE FUNCTION public.obter_aviator_engine_config()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config public.aviator_config%ROWTYPE;
  v_stats JSON;
  v_hours INT;
BEGIN
  SELECT * INTO v_config FROM public.aviator_config WHERE id = 1;
  IF NOT FOUND THEN
    INSERT INTO public.aviator_config (id) VALUES (1);
    SELECT * INTO v_config FROM public.aviator_config WHERE id = 1;
  END IF;

  v_hours := GREATEST(COALESCE(v_config.recovery_window_hours, 24), 1);
  v_stats := public.calcular_aviator_ggr(v_hours);

  RETURN json_build_object(
    'ok', true,
    'rtp_geral', v_config.rtp_base,
    'pct_vela_azul', v_config.pct_vela_azul,
    'pct_vela_roxa', v_config.pct_vela_roxa,
    'pct_vela_rosa', v_config.pct_vela_rosa,
    'min_crash', v_config.min_crash,
    'max_crash', v_config.max_crash,
    'min_crash_mul', GREATEST(100, FLOOR(v_config.min_crash * 100)::INT),
    'max_crash_mul', LEAST(
      FLOOR(v_config.crash_technical_max * 100)::INT,
      FLOOR(v_config.max_crash * 100)::INT
    ),
    'queue_size', v_config.queue_size,
    'config_version', v_config.updated_at,
    'engine_version', v_config.updated_at::TEXT,
    'stats', v_stats
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.obter_aviator_config_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_aviator_config_admin(
  NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, INT
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.obter_aviator_engine_config() TO anon, authenticated, service_role;

-- =============================================================================
-- [41/67] Fase 7 — Aviator (admin + motor PlayFiver)
-- Fonte: AdminPainel/Database/patch_aviator_modo_geracao.sql
-- =============================================================================
-- Modo de geração exclusivo: rtp_geral | velas | crash (só um ativo por vez)
-- Rode no Supabase SQL Editor após patch_aviator_rtp_velas.sql

ALTER TABLE public.aviator_config
  ADD COLUMN IF NOT EXISTS modo_geracao TEXT NOT NULL DEFAULT 'velas';

UPDATE public.aviator_config
SET modo_geracao = 'velas'
WHERE modo_geracao IS NULL OR modo_geracao NOT IN ('rtp_geral', 'velas', 'crash');

ALTER TABLE public.aviator_config
  DROP CONSTRAINT IF EXISTS aviator_config_modo_geracao_check;

ALTER TABLE public.aviator_config
  ADD CONSTRAINT aviator_config_modo_geracao_check
  CHECK (modo_geracao IN ('rtp_geral', 'velas', 'crash'));

DROP FUNCTION IF EXISTS public.atualizar_aviator_config_admin(
  NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, INT
);

CREATE OR REPLACE FUNCTION public.obter_aviator_config_admin()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
      'pct_vela_azul', v_config.pct_vela_azul,
      'pct_vela_roxa', v_config.pct_vela_roxa,
      'pct_vela_rosa', v_config.pct_vela_rosa,
      'min_crash', v_config.min_crash,
      'max_crash', v_config.max_crash,
      'queue_size', v_config.queue_size,
      'rtp_limit_min_pct', v_config.rtp_limit_min_pct,
      'rtp_limit_max_pct', v_config.rtp_limit_max_pct,
      'crash_technical_max', v_config.crash_technical_max,
      'updated_at', v_config.updated_at
    ),
    'stats', v_stats
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.atualizar_aviator_config_admin(
  p_modo_geracao TEXT DEFAULT NULL,
  p_rtp_geral NUMERIC DEFAULT NULL,
  p_pct_vela_azul NUMERIC DEFAULT NULL,
  p_pct_vela_roxa NUMERIC DEFAULT NULL,
  p_pct_vela_rosa NUMERIC DEFAULT NULL,
  p_min_crash NUMERIC DEFAULT NULL,
  p_max_crash NUMERIC DEFAULT NULL,
  p_queue_size INT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config public.aviator_config%ROWTYPE;
  v_modo TEXT;
  v_rtp_geral NUMERIC;
  v_pct_azul NUMERIC;
  v_pct_roxa NUMERIC;
  v_pct_rosa NUMERIC;
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

  IF v_modo IN ('rtp_geral', 'velas', 'crash') THEN
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

CREATE OR REPLACE FUNCTION public.obter_aviator_engine_config()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config public.aviator_config%ROWTYPE;
  v_stats JSON;
  v_hours INT;
BEGIN
  SELECT * INTO v_config FROM public.aviator_config WHERE id = 1;
  IF NOT FOUND THEN
    INSERT INTO public.aviator_config (id) VALUES (1);
    SELECT * INTO v_config FROM public.aviator_config WHERE id = 1;
  END IF;

  v_hours := GREATEST(COALESCE(v_config.recovery_window_hours, 24), 1);
  v_stats := public.calcular_aviator_ggr(v_hours);

  RETURN json_build_object(
    'ok', true,
    'modo_geracao', v_config.modo_geracao,
    'rtp_geral', v_config.rtp_base,
    'pct_vela_azul', v_config.pct_vela_azul,
    'pct_vela_roxa', v_config.pct_vela_roxa,
    'pct_vela_rosa', v_config.pct_vela_rosa,
    'min_crash', v_config.min_crash,
    'max_crash', v_config.max_crash,
    'min_crash_mul', GREATEST(100, FLOOR(v_config.min_crash * 100)::INT),
    'max_crash_mul', LEAST(
      FLOOR(v_config.crash_technical_max * 100)::INT,
      FLOOR(v_config.max_crash * 100)::INT
    ),
    'crash_technical_max', v_config.crash_technical_max,
    'queue_size', v_config.queue_size,
    'config_version', v_config.updated_at,
    'engine_version', v_config.modo_geracao || ':' || v_config.updated_at::TEXT,
    'stats', v_stats
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.obter_aviator_config_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_aviator_config_admin(
  TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, INT
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.obter_aviator_engine_config() TO anon, authenticated, service_role;

-- =============================================================================
-- [42/67] Fase 7 — Aviator (admin + motor PlayFiver)
-- Fonte: AdminPainel/Database/patch_aviator_geracao_bounds.sql
-- =============================================================================
-- Limites de geração (RTP geral / velas) separados do intervalo do modo crash (criativos)
-- Rode no Supabase SQL Editor após patch_aviator_modo_geracao.sql

ALTER TABLE public.aviator_config
  ADD COLUMN IF NOT EXISTS geracao_min_crash NUMERIC(8, 2) NOT NULL DEFAULT 1.01,
  ADD COLUMN IF NOT EXISTS geracao_max_crash NUMERIC(8, 2) NOT NULL DEFAULT 500.00;

UPDATE public.aviator_config
SET
  geracao_min_crash = COALESCE(geracao_min_crash, min_crash, 1.01),
  geracao_max_crash = COALESCE(geracao_max_crash, max_crash, 500.00)
WHERE id = 1;

DROP FUNCTION IF EXISTS public.atualizar_aviator_config_admin(
  TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, INT
);

CREATE OR REPLACE FUNCTION public.obter_aviator_config_admin()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
      'updated_at', v_config.updated_at
    ),
    'stats', v_stats
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.atualizar_aviator_config_admin(
  p_modo_geracao TEXT DEFAULT NULL,
  p_rtp_geral NUMERIC DEFAULT NULL,
  p_pct_vela_azul NUMERIC DEFAULT NULL,
  p_pct_vela_roxa NUMERIC DEFAULT NULL,
  p_pct_vela_rosa NUMERIC DEFAULT NULL,
  p_geracao_min_crash NUMERIC DEFAULT NULL,
  p_geracao_max_crash NUMERIC DEFAULT NULL,
  p_min_crash NUMERIC DEFAULT NULL,
  p_max_crash NUMERIC DEFAULT NULL,
  p_queue_size INT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.obter_aviator_engine_config()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config public.aviator_config%ROWTYPE;
  v_stats JSON;
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

  IF v_config.modo_geracao = 'crash' THEN
    v_eff_min := v_config.min_crash;
    v_eff_max := v_config.max_crash;
  ELSE
    v_eff_min := v_config.geracao_min_crash;
    v_eff_max := v_config.geracao_max_crash;
  END IF;

  RETURN json_build_object(
    'ok', true,
    'modo_geracao', v_config.modo_geracao,
    'rtp_geral', v_config.rtp_base,
    'pct_vela_azul', v_config.pct_vela_azul,
    'pct_vela_roxa', v_config.pct_vela_roxa,
    'pct_vela_rosa', v_config.pct_vela_rosa,
    'geracao_min_crash', v_config.geracao_min_crash,
    'geracao_max_crash', v_config.geracao_max_crash,
    'min_crash', v_eff_min,
    'max_crash', v_eff_max,
    'min_crash_mul', GREATEST(100, FLOOR(v_eff_min * 100)::INT),
    'max_crash_mul', LEAST(
      FLOOR(v_config.crash_technical_max * 100)::INT,
      FLOOR(v_eff_max * 100)::INT
    ),
    'crash_technical_max', v_config.crash_technical_max,
    'queue_size', v_config.queue_size,
    'config_version', v_config.updated_at,
    'engine_version', v_config.modo_geracao || ':' || v_config.updated_at::TEXT,
    'stats', v_stats
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.obter_aviator_config_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_aviator_config_admin(
  TEXT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, INT
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.obter_aviator_engine_config() TO anon, authenticated, service_role;

-- =============================================================================
-- [43/67] Fase 7 — Aviator (admin + motor PlayFiver)
-- Fonte: AdminPainel/Database/patch_aviator_generous_when_profit.sql
-- =============================================================================
-- Casa lucrando → velas mais generosas + modo generous mais sensível
-- Rode no Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.obter_aviator_engine_config()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
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
BEGIN
  SELECT * INTO v_config FROM public.aviator_config WHERE id = 1;
  IF NOT FOUND THEN
    INSERT INTO public.aviator_config (id) VALUES (1);
    SELECT * INTO v_config FROM public.aviator_config WHERE id = 1;
  END IF;

  v_hours := GREATEST(v_config.recovery_window_hours, 1);
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

    -- Casa lucrando: sobe RTP (velas mais altas) — usa ajuste máximo, não só intensidade baixa
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

  v_ggr_bucket := FLOOR(v_ggr / 500);
  v_rtp_bucket := ROUND(v_effective_rtp * 1000);
  v_engine_version := v_rtp_bucket::TEXT || ':' || v_ggr_bucket::TEXT;

  RETURN json_build_object(
    'ok', true,
    'rtp_factor', v_effective_rtp,
    'rtp_base', v_config.rtp_base,
    'rtp_min', v_config.rtp_min,
    'rtp_max', v_config.rtp_max,
    'effective_rtp', v_effective_rtp,
    'recovery_enabled', v_config.recovery_enabled,
    'recovery_adjustment', v_config.rtp_base - v_effective_rtp,
    'recovery_mode', v_recovery_mode,
    'min_crash_mul', GREATEST(101, FLOOR(v_config.min_crash * 100)::INT),
    'max_crash_mul', LEAST(1000000, FLOOR(v_config.max_crash * 100)::INT),
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

-- =============================================================================
-- [44/67] Fase 7 — Aviator (admin + motor PlayFiver)
-- Fonte: AdminPainel/Database/patch_aviator_config_fix.sql
-- =============================================================================
-- FIX Aviator config — rode ESTE arquivo no Supabase SQL Editor
-- Corrige erro de GRANT / assinatura da função atualizar_aviator_config_admin

-- 1) Colunas novas (recovery contínuo em R$)
ALTER TABLE public.aviator_config
  ADD COLUMN IF NOT EXISTS recovery_loss_trigger_brl NUMERIC(14, 2) NOT NULL DEFAULT 10000.00,
  ADD COLUMN IF NOT EXISTS recovery_profit_trigger_brl NUMERIC(14, 2) NOT NULL DEFAULT 10000.00;

-- 2) Remove versões antigas da função (12 ou 15 params)
DROP FUNCTION IF EXISTS public.atualizar_aviator_config_admin(
  NUMERIC, NUMERIC, NUMERIC, BOOLEAN, INT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, INT
);
DROP FUNCTION IF EXISTS public.atualizar_aviator_config_admin(
  NUMERIC, NUMERIC, NUMERIC, BOOLEAN, INT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, INT
);

-- 3) Função admin atualizada (14 params + GGR até 100%)
CREATE OR REPLACE FUNCTION public.atualizar_aviator_config_admin(
  p_rtp_base NUMERIC DEFAULT NULL,
  p_rtp_min NUMERIC DEFAULT NULL,
  p_rtp_max NUMERIC DEFAULT NULL,
  p_recovery_enabled BOOLEAN DEFAULT NULL,
  p_recovery_window_hours INT DEFAULT NULL,
  p_ggr_target_pct NUMERIC DEFAULT NULL,
  p_recovery_strength NUMERIC DEFAULT NULL,
  p_recovery_max_adjustment NUMERIC DEFAULT NULL,
  p_min_wagered_for_recovery NUMERIC DEFAULT NULL,
  p_recovery_loss_trigger_brl NUMERIC DEFAULT NULL,
  p_recovery_profit_trigger_brl NUMERIC DEFAULT NULL,
  p_min_crash NUMERIC DEFAULT NULL,
  p_max_crash NUMERIC DEFAULT NULL,
  p_queue_size INT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- 4) obter admin — expõe campos novos
CREATE OR REPLACE FUNCTION public.obter_aviator_config_admin()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  v_stats := public.calcular_aviator_ggr(v_config.recovery_window_hours);

  RETURN json_build_object(
    'ok', true,
    'config', json_build_object(
      'rtp_base', v_config.rtp_base,
      'rtp_min', v_config.rtp_min,
      'rtp_max', v_config.rtp_max,
      'recovery_enabled', v_config.recovery_enabled,
      'recovery_window_hours', v_config.recovery_window_hours,
      'ggr_target_pct', v_config.ggr_target_pct,
      'recovery_strength', v_config.recovery_strength,
      'recovery_max_adjustment', v_config.recovery_max_adjustment,
      'min_wagered_for_recovery', v_config.min_wagered_for_recovery,
      'recovery_loss_trigger_brl', COALESCE(v_config.recovery_loss_trigger_brl, 10000),
      'recovery_profit_trigger_brl', COALESCE(v_config.recovery_profit_trigger_brl, 10000),
      'min_crash', v_config.min_crash,
      'max_crash', v_config.max_crash,
      'queue_size', v_config.queue_size,
      'updated_at', v_config.updated_at
    ),
    'stats', v_stats
  );
END;
$$;

-- 5) Motor — recovery contínuo + engine_version
CREATE OR REPLACE FUNCTION public.obter_aviator_engine_config()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
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
BEGIN
  SELECT * INTO v_config FROM public.aviator_config WHERE id = 1;
  IF NOT FOUND THEN
    INSERT INTO public.aviator_config (id) VALUES (1);
    SELECT * INTO v_config FROM public.aviator_config WHERE id = 1;
  END IF;

  v_hours := GREATEST(v_config.recovery_window_hours, 1);
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

  v_ggr_bucket := FLOOR(v_ggr / 500);
  v_rtp_bucket := ROUND(v_effective_rtp * 1000);
  v_engine_version := v_rtp_bucket::TEXT || ':' || v_ggr_bucket::TEXT;

  RETURN json_build_object(
    'ok', true,
    'rtp_factor', v_effective_rtp,
    'rtp_base', v_config.rtp_base,
    'rtp_min', v_config.rtp_min,
    'rtp_max', v_config.rtp_max,
    'effective_rtp', v_effective_rtp,
    'recovery_enabled', v_config.recovery_enabled,
    'recovery_adjustment', v_config.rtp_base - v_effective_rtp,
    'recovery_mode', v_recovery_mode,
    'min_crash_mul', GREATEST(101, FLOOR(v_config.min_crash * 100)::INT),
    'max_crash_mul', LEAST(1000000, FLOOR(v_config.max_crash * 100)::INT),
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

-- 6) GRANT — assinatura correta (14 parâmetros)
GRANT EXECUTE ON FUNCTION public.obter_aviator_config_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_aviator_config_admin(
  NUMERIC, NUMERIC, NUMERIC, BOOLEAN, INT, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, INT
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.obter_aviator_engine_config() TO anon, authenticated, service_role;

-- =============================================================================
-- [45/67] Fase 8 — Indique e ganhe
-- Fonte: AdminPainel/Database/indicacao_config.sql
-- =============================================================================
-- Sistema Indique e Ganhe (configurável no admin)
-- Execute no SQL Editor do Supabase

ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS indicacao_recompensa NUMERIC(12,2) NOT NULL DEFAULT 100;

ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS indicacao_deposito_minimo NUMERIC(12,2) NOT NULL DEFAULT 50;

ALTER TABLE public.site_config
  DROP CONSTRAINT IF EXISTS site_config_indicacao_recompensa_check;

ALTER TABLE public.site_config
  ADD CONSTRAINT site_config_indicacao_recompensa_check
  CHECK (indicacao_recompensa >= 0);

ALTER TABLE public.site_config
  DROP CONSTRAINT IF EXISTS site_config_indicacao_deposito_minimo_check;

ALTER TABLE public.site_config
  ADD CONSTRAINT site_config_indicacao_deposito_minimo_check
  CHECK (indicacao_deposito_minimo >= 0);

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS indicacao_recompensa_paga BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS indicacao_recompensa_valor_pago NUMERIC(12,2);

COMMENT ON COLUMN public.site_config.indicacao_recompensa IS
  'Valor em R$ creditado ao indicador quando o indicado faz o primeiro depósito qualificado.';
COMMENT ON COLUMN public.site_config.indicacao_deposito_minimo IS
  'Valor mínimo do primeiro depósito do indicado para validar a indicação.';
COMMENT ON COLUMN public.usuarios.indicacao_recompensa_paga IS
  'True quando o indicador já recebeu recompensa por este usuário indicado.';

CREATE OR REPLACE FUNCTION public.processar_recompensa_indicacao(
  p_usuario_indicado_id UUID,
  p_deposito_id UUID,
  p_valor_deposito NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_indicado_por TEXT;
  v_ja_paga BOOLEAN;
  v_recompensa NUMERIC;
  v_deposito_min NUMERIC;
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
  INTO v_recompensa, v_deposito_min
  FROM public.site_config sc
  WHERE sc.id = 1;

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

  SELECT u.id
  INTO v_referrer_id
  FROM public.usuarios u
  WHERE u.link_indicação = v_indicado_por
  LIMIT 1;

  IF v_referrer_id IS NULL OR v_referrer_id = p_usuario_indicado_id THEN
    RETURN json_build_object('ok', true, 'aplicada', false, 'motivo', 'indicador_invalido');
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

CREATE OR REPLACE FUNCTION public.count_qualified_referrals(referral_code_param TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF referral_code_param IS NULL OR TRIM(referral_code_param) = '' THEN
    RETURN 0;
  END IF;

  RETURN (
    SELECT COUNT(*)::INT
    FROM public.usuarios u
    WHERE u.indicado_por = referral_code_param
      AND COALESCE(u.indicacao_recompensa_paga, false) = true
  );
END;
$$;

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
      'saques_diarios_permitidos', 1,
      'rollover_padrao', 1,
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
    'indicacao_recompensa', COALESCE(v_config.indicacao_recompensa, 100),
    'indicacao_deposito_minimo', COALESCE(v_config.indicacao_deposito_minimo, 50),
    'updated_at', v_config.updated_at
  );
END;
$$;

DROP FUNCTION IF EXISTS public.atualizar_config_plataforma_admin(NUMERIC, NUMERIC, NUMERIC, NUMERIC, INT);
DROP FUNCTION IF EXISTS public.atualizar_config_plataforma_admin(NUMERIC, NUMERIC, NUMERIC, NUMERIC, INT, NUMERIC);

CREATE OR REPLACE FUNCTION public.atualizar_config_plataforma_admin(
  p_deposito_minimo NUMERIC DEFAULT NULL,
  p_deposito_maximo NUMERIC DEFAULT NULL,
  p_saque_minimo NUMERIC DEFAULT NULL,
  p_saque_maximo NUMERIC DEFAULT NULL,
  p_saques_diarios_permitidos INT DEFAULT NULL,
  p_rollover_padrao NUMERIC DEFAULT NULL,
  p_indicacao_recompensa NUMERIC DEFAULT NULL,
  p_indicacao_deposito_minimo NUMERIC DEFAULT NULL
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
  v_ind_recompensa := COALESCE(p_indicacao_recompensa, v_config.indicacao_recompensa, 100);
  v_ind_dep_min := COALESCE(p_indicacao_deposito_minimo, v_config.indicacao_deposito_minimo, 50);

  IF v_dep_min <= 0 OR v_dep_max <= 0 OR v_saq_min <= 0 OR v_saq_max <= 0 THEN
    RETURN json_build_object('ok', false, 'error', 'Os valores devem ser maiores que zero.');
  END IF;

  IF v_saques_dia < 1 THEN
    RETURN json_build_object('ok', false, 'error', 'Saques diários permitidos deve ser no mínimo 1.');
  END IF;

  IF v_rollover < 0 THEN
    RETURN json_build_object('ok', false, 'error', 'Rollover padrão não pode ser negativo.');
  END IF;

  IF v_ind_recompensa < 0 THEN
    RETURN json_build_object('ok', false, 'error', 'Recompensa de indicação não pode ser negativa.');
  END IF;

  IF v_ind_dep_min < 0 THEN
    RETURN json_build_object('ok', false, 'error', 'Depósito mínimo de indicação não pode ser negativo.');
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
    indicacao_recompensa = v_ind_recompensa,
    indicacao_deposito_minimo = v_ind_dep_min,
    updated_at = NOW()
  WHERE id = 1;

  BEGIN
    PERFORM public.registrar_admin_log(
      'Atualizar configurações da plataforma',
      format(
        'Indicação: R$ %s (dep. mín. R$ %s) | Rollover: %sx',
        v_ind_recompensa,
        v_ind_dep_min,
        v_rollover
      ),
      'sucesso',
      'config',
      jsonb_build_object(
        'indicacao_recompensa', v_ind_recompensa,
        'indicacao_deposito_minimo', v_ind_dep_min,
        'rollover_padrao', v_rollover
      )
    );
  EXCEPTION
    WHEN undefined_function THEN NULL;
  END;

  RETURN json_build_object(
    'ok', true,
    'deposito_minimo', v_dep_min,
    'deposito_maximo', v_dep_max,
    'saque_minimo', v_saq_min,
    'saque_maximo', v_saq_max,
    'saques_diarios_permitidos', v_saques_dia,
    'rollover_padrao', v_rollover,
    'indicacao_recompensa', v_ind_recompensa,
    'indicacao_deposito_minimo', v_ind_dep_min
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.confirmar_deposito_pix_pago(p_deposito_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  v_indicacao JSON;
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
    v_indicacao := public.processar_recompensa_indicacao(v_usuario_id, p_deposito_id, v_valor);

    RETURN (json_build_object('ok', true, 'already', false, 'indicacao', v_indicacao)::jsonb
      || COALESCE(v_vip, '{}'::json)::jsonb)::json;
  END IF;

  UPDATE public.depositos
  SET status = v_status, updated_at = NOW()
  WHERE id = p_deposito_id;

  RETURN json_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.obter_config_plataforma() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_config_plataforma_admin(
  NUMERIC, NUMERIC, NUMERIC, NUMERIC, INT, NUMERIC, NUMERIC, NUMERIC
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.processar_recompensa_indicacao(UUID, UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_qualified_referrals(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirmar_deposito_pix_pago(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_status_deposito_admin(UUID, TEXT) TO authenticated;

-- =============================================================================
-- [46/67] Fase 8 — Indique e ganhe
-- Fonte: AdminPainel/Database/patch_indicacao_usuario.sql
-- =============================================================================
-- Indique e Ganhe por usuário (override individual no admin)
-- Execute no SQL Editor do Supabase

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS indicacao_recompensa_custom NUMERIC(12,2);

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS indicacao_deposito_minimo_custom NUMERIC(12,2);

ALTER TABLE public.usuarios
  DROP CONSTRAINT IF EXISTS usuarios_indicacao_recompensa_custom_check;

ALTER TABLE public.usuarios
  ADD CONSTRAINT usuarios_indicacao_recompensa_custom_check
  CHECK (indicacao_recompensa_custom IS NULL OR indicacao_recompensa_custom >= 0);

ALTER TABLE public.usuarios
  DROP CONSTRAINT IF EXISTS usuarios_indicacao_deposito_minimo_custom_check;

ALTER TABLE public.usuarios
  ADD CONSTRAINT usuarios_indicacao_deposito_minimo_custom_check
  CHECK (indicacao_deposito_minimo_custom IS NULL OR indicacao_deposito_minimo_custom >= 0);

COMMENT ON COLUMN public.usuarios.indicacao_recompensa_custom IS
  'Recompensa personalizada em R$ para este indicador. NULL = usar site_config.indicacao_recompensa.';
COMMENT ON COLUMN public.usuarios.indicacao_deposito_minimo_custom IS
  'Depósito mínimo personalizado do indicado para este indicador. NULL = usar site_config.indicacao_deposito_minimo.';

CREATE OR REPLACE FUNCTION public.obter_indicacao_config_usuario(p_usuario_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario public.usuarios%ROWTYPE;
  v_global_recompensa NUMERIC;
  v_global_deposito_min NUMERIC;
BEGIN
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

  RETURN json_build_object(
    'ok', true,
    'recompensa', COALESCE(v_usuario.indicacao_recompensa_custom, v_global_recompensa),
    'deposito_minimo', COALESCE(v_usuario.indicacao_deposito_minimo_custom, v_global_deposito_min),
    'recompensa_custom', v_usuario.indicacao_recompensa_custom,
    'deposito_minimo_custom', v_usuario.indicacao_deposito_minimo_custom,
    'usa_padrao_plataforma',
      v_usuario.indicacao_recompensa_custom IS NULL
      AND v_usuario.indicacao_deposito_minimo_custom IS NULL,
    'global_recompensa', v_global_recompensa,
    'global_deposito_minimo', v_global_deposito_min
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.obter_indicacao_usuario_admin(p_usuario_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usuario public.usuarios%ROWTYPE;
  v_config JSON;
  v_total_indicados INT := 0;
  v_qualificados INT := 0;
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
    'indicados_qualificados', COALESCE(v_qualificados, 0)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.atualizar_indicacao_usuario_admin(
  p_usuario_id UUID,
  p_usar_padrao_plataforma BOOLEAN DEFAULT false,
  p_recompensa NUMERIC DEFAULT NULL,
  p_deposito_minimo NUMERIC DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recompensa NUMERIC;
  v_deposito_min NUMERIC;
BEGIN
  IF NOT public.is_user_admin() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.usuarios WHERE id = p_usuario_id) THEN
    RETURN json_build_object('ok', false, 'error', 'Usuário não encontrado');
  END IF;

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
    RETURN json_build_object('ok', false, 'error', 'Informe recompensa e depósito mínimo.');
  END IF;

  v_recompensa := COALESCE(p_recompensa, 0);
  v_deposito_min := COALESCE(p_deposito_minimo, 0);

  IF v_recompensa < 0 THEN
    RETURN json_build_object('ok', false, 'error', 'Recompensa não pode ser negativa.');
  END IF;

  IF v_deposito_min < 0 THEN
    RETURN json_build_object('ok', false, 'error', 'Depósito mínimo não pode ser negativo.');
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

CREATE OR REPLACE FUNCTION public.processar_recompensa_indicacao(
  p_usuario_indicado_id UUID,
  p_deposito_id UUID,
  p_valor_deposito NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

GRANT EXECUTE ON FUNCTION public.obter_indicacao_config_usuario(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.obter_indicacao_usuario_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_indicacao_usuario_admin(UUID, BOOLEAN, NUMERIC, NUMERIC) TO authenticated;

-- =============================================================================
-- [47/67] Fase 8 — Indique e ganhe
-- Fonte: AdminPainel/Database/patch_indicacao_ganhos_fix.sql
-- =============================================================================
-- Fix: ganhos totais de indicação devem somar valores já pagos, não recompensa atual × qualificados
-- Execute no SQL Editor do Supabase (após patch_indicacao_usuario.sql)

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS indicacao_recompensa_valor_pago NUMERIC(12,2);

ALTER TABLE public.usuarios
  DROP CONSTRAINT IF EXISTS usuarios_indicacao_recompensa_valor_pago_check;

ALTER TABLE public.usuarios
  ADD CONSTRAINT usuarios_indicacao_recompensa_valor_pago_check
  CHECK (indicacao_recompensa_valor_pago IS NULL OR indicacao_recompensa_valor_pago >= 0);

COMMENT ON COLUMN public.usuarios.indicacao_recompensa_valor_pago IS
  'Valor em R$ creditado ao indicador quando esta indicação foi qualificada.';

-- Backfill best-effort para indicações pagas antes deste patch (usa padrão global da plataforma)
UPDATE public.usuarios u
SET indicacao_recompensa_valor_pago = (
  SELECT COALESCE(sc.indicacao_recompensa, 100)
  FROM public.site_config sc
  WHERE sc.id = 1
)
WHERE u.indicacao_recompensa_paga = true
  AND u.indicacao_recompensa_valor_pago IS NULL;

CREATE OR REPLACE FUNCTION public.calcular_ganhos_indicacao(p_referral_code TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_referral_code IS NULL OR TRIM(p_referral_code) = '' THEN
    RETURN 0;
  END IF;

  RETURN COALESCE((
    SELECT SUM(COALESCE(u.indicacao_recompensa_valor_pago, 0))
    FROM public.usuarios u
    WHERE u.indicado_por = p_referral_code
      AND COALESCE(u.indicacao_recompensa_paga, false) = true
  ), 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.obter_indicacao_config_usuario(p_usuario_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.obter_indicacao_usuario_admin(p_usuario_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

CREATE OR REPLACE FUNCTION public.processar_recompensa_indicacao(
  p_usuario_indicado_id UUID,
  p_deposito_id UUID,
  p_valor_deposito NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

GRANT EXECUTE ON FUNCTION public.calcular_ganhos_indicacao(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.obter_indicacao_config_usuario(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.obter_indicacao_usuario_admin(UUID) TO authenticated;

-- =============================================================================
-- [48/67] Fase 9 — Admin panel, logs, webhooks, tracking
-- Fonte: AdminPainel/Database/admin_logs.sql
-- =============================================================================
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

-- =============================================================================
-- [49/67] Fase 9 — Admin panel, logs, webhooks, tracking
-- Fonte: AdminPainel/Database/create_admin_rls_policy.sql
-- =============================================================================
-- Política RLS para permitir que admins vejam todos os usuários
-- Execute este script no Supabase SQL Editor

-- Primeiro, criar função que verifica se usuário é admin (bypass RLS)
CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_cargo TEXT;
BEGIN
  -- Esta função usa SECURITY DEFINER para bypassar RLS
  SELECT cargo INTO user_cargo
  FROM public.usuarios
  WHERE id = auth.uid();
  
  RETURN user_cargo = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Dar permissão para todos executarem
GRANT EXECUTE ON FUNCTION public.is_user_admin() TO anon, authenticated;

-- Remover política existente se houver
DROP POLICY IF EXISTS "Admins podem ver todos os usuários" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_select_own" ON public.usuarios;

-- Criar política que permite admins verem todos os usuários (sem recursão)
CREATE POLICY "Admins podem ver todos os usuários"
  ON public.usuarios
  FOR SELECT
  USING (
    -- Permite ver seus próprios dados OU se for admin (usando função que bypassa RLS), ver todos
    auth.uid() = id 
    OR 
    public.is_user_admin()
  );

-- Verificar políticas criadas
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'usuarios'
ORDER BY policyname;

-- =============================================================================
-- [50/67] Fase 9 — Admin panel, logs, webhooks, tracking
-- Fonte: AdminPainel/Database/create_depositos_rls_policy.sql
-- =============================================================================
-- Política RLS para permitir que admins vejam e atualizem depósitos
-- Execute este script no Supabase SQL Editor

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Admins podem ver todos os depósitos" ON public.depositos;
DROP POLICY IF EXISTS "Admins podem atualizar depósitos" ON public.depositos;
DROP POLICY IF EXISTS "depositos_select_own" ON public.depositos;
DROP POLICY IF EXISTS "depositos_update_own" ON public.depositos;

-- Criar política que permite admins verem todos os depósitos
CREATE POLICY "Admins podem ver todos os depósitos"
  ON public.depositos
  FOR SELECT
  USING (
    -- Permite ver seus próprios depósitos OU se for admin, ver todos
    auth.uid() = usuario_id 
    OR 
    public.is_user_admin()
  );

-- Criar política que permite admins atualizarem depósitos
CREATE POLICY "Admins podem atualizar depósitos"
  ON public.depositos
  FOR UPDATE
  USING (
    -- Permite atualizar se for admin
    public.is_user_admin()
  )
  WITH CHECK (
    -- Permite atualizar se for admin
    public.is_user_admin()
  );

-- Verificar políticas criadas
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'depositos'
ORDER BY policyname;


-- =============================================================================
-- [51/67] Fase 9 — Admin panel, logs, webhooks, tracking
-- Fonte: AdminPainel/Database/create_saques_rls_policy.sql
-- =============================================================================
-- Política RLS para permitir que admins vejam e atualizem saques
-- Execute este script no Supabase SQL Editor

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Admins podem ver todos os saques" ON public.saques;
DROP POLICY IF EXISTS "Admins podem atualizar saques" ON public.saques;
DROP POLICY IF EXISTS "saques_select_own" ON public.saques;
DROP POLICY IF EXISTS "saques_update_own" ON public.saques;

-- Criar política que permite admins verem todos os saques
CREATE POLICY "Admins podem ver todos os saques"
  ON public.saques
  FOR SELECT
  USING (
    -- Permite ver seus próprios saques OU se for admin, ver todos
    auth.uid() = usuario_id 
    OR 
    public.is_user_admin()
  );

-- Criar política que permite admins atualizarem saques
CREATE POLICY "Admins podem atualizar saques"
  ON public.saques
  FOR UPDATE
  USING (
    -- Permite atualizar se for admin
    public.is_user_admin()
  )
  WITH CHECK (
    -- Permite atualizar se for admin
    public.is_user_admin()
  );

-- Verificar políticas criadas
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'saques'
ORDER BY policyname;


-- =============================================================================
-- [52/67] Fase 9 — Admin panel, logs, webhooks, tracking
-- Fonte: AdminPainel/Database/create_transacoes_jogos_rls_policy.sql
-- =============================================================================
-- Política RLS para permitir que admins vejam todas as transações de jogos
-- Execute este script no Supabase SQL Editor (requer is_user_admin() de create_admin_rls_policy.sql)

DROP POLICY IF EXISTS "Admins podem ver todas as transações de jogos" ON public.transacoes_jogos;

CREATE POLICY "Admins podem ver todas as transações de jogos"
  ON public.transacoes_jogos
  FOR SELECT
  USING (
    auth.uid() = usuario_id
    OR
    public.is_user_admin()
  );

SELECT
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'transacoes_jogos'
ORDER BY policyname;

-- =============================================================================
-- [53/67] Fase 9 — Admin panel, logs, webhooks, tracking
-- Fonte: AdminPainel/Database/create_get_total_usuarios_function.sql
-- =============================================================================
-- Função RPC para contar todos os usuários (bypass RLS para admins)
-- Execute este script no Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.get_total_usuarios()
RETURNS INTEGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Dar permissão para todos executarem
GRANT EXECUTE ON FUNCTION public.get_total_usuarios() TO anon, authenticated;

-- =============================================================================
-- [54/67] Fase 9 — Admin panel, logs, webhooks, tracking
-- Fonte: AdminPainel/Database/create_get_user_cargo_function.sql
-- =============================================================================
-- Função RPC para buscar cargo do usuário atual (bypass RLS)
-- Execute este script no Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.get_user_cargo()
RETURNS TEXT AS $$
DECLARE
  user_cargo TEXT;
BEGIN
  -- Buscar cargo do usuário atual usando SECURITY DEFINER para bypassar RLS
  SELECT cargo INTO user_cargo
  FROM public.usuarios
  WHERE id = auth.uid();
  
  RETURN user_cargo;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Dar permissão para todos executarem
GRANT EXECUTE ON FUNCTION public.get_user_cargo() TO anon, authenticated;


-- =============================================================================
-- [55/67] Fase 9 — Admin panel, logs, webhooks, tracking
-- Fonte: AdminPainel/Database/admin_equipe.sql
-- =============================================================================
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

-- =============================================================================
-- [56/67] Fase 9 — Admin panel, logs, webhooks, tracking
-- Fonte: AdminPainel/Database/usuarios_admin.sql
-- =============================================================================
-- 2FA (Google Authenticator) para administradores
-- Execute no SQL Editor do Supabase

ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS totp_secret TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS totp_pending_secret TEXT;

COMMENT ON COLUMN public.usuarios.totp_secret IS 'Segredo TOTP base32 — somente servidor (2FA admin)';
COMMENT ON COLUMN public.usuarios.totp_pending_secret IS 'Segredo TOTP temporário durante configuração do 2FA';
COMMENT ON COLUMN public.usuarios.two_factor_enabled IS 'Indica se o 2FA (Google Authenticator) está ativo';

-- Segredos TOTP nunca devem ser expostos via RLS/RPC ao cliente.
-- Toda leitura/escrita passa pelo PlayFiverAPI com service role.

-- =============================================================================
-- [57/67] Fase 9 — Admin panel, logs, webhooks, tracking
-- Fonte: AdminPainel/Database/usuario_detalhes_admin.sql
-- =============================================================================
-- Detalhes e gestão de usuários no painel admin
-- Execute no SQL Editor do Supabase

ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS data_nascimento DATE;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS pais TEXT NOT NULL DEFAULT 'BR';
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS kyc_status TEXT NOT NULL DEFAULT 'nao_enviado';
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS verificado BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_kyc_status_check;
ALTER TABLE public.usuarios
  ADD CONSTRAINT usuarios_kyc_status_check
  CHECK (kyc_status IN ('nao_enviado', 'pendente', 'aprovado', 'rejeitado'));

COMMENT ON COLUMN public.usuarios.data_nascimento IS 'Data de nascimento do usuário';
COMMENT ON COLUMN public.usuarios.pais IS 'País do usuário (código ISO)';
COMMENT ON COLUMN public.usuarios.kyc_status IS 'Status da verificação KYC';
COMMENT ON COLUMN public.usuarios.verificado IS 'Conta verificada pelo administrador';

CREATE OR REPLACE FUNCTION public.obter_detalhes_usuario_admin(p_usuario_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  -- Total apostado: soma de todas as transações (Perdeu + Ganhou)
  SELECT COUNT(*)::INT, COALESCE(SUM(valor), 0)
  INTO v_count_apostas, v_total_apostado
  FROM public.transacoes_jogos
  WHERE usuario_id = p_usuario_id;

  -- Total ganho: soma de retornos creditados
  SELECT COALESCE(SUM(retorno), 0) INTO v_total_ganho
  FROM public.transacoes_jogos
  WHERE usuario_id = p_usuario_id;

  -- Fallback: se depositos aprovados estiver vazio, usa total_depositado do perfil
  IF COALESCE(v_valor_depositos_aprovados, 0) <= 0 AND COALESCE(v_usuario.total_depositado, 0) > 0 THEN
    v_valor_depositos_aprovados := v_usuario.total_depositado;
    IF v_count_depositos_aprovados <= 0 AND v_total_depositos > 0 THEN
      v_count_depositos_aprovados := v_total_depositos;
    END IF;
  END IF;

  -- Fallback: se saques aprovados estiver vazio, usa total de saques registrados
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
      'total_depositado', v_valor_depositos_aprovados,
      'total_retirado', v_valor_saques_aprovados,
      'total_apostado', v_total_apostado,
      'total_ganho', v_total_ganho,
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

CREATE OR REPLACE FUNCTION public.listar_sessoes_usuario_admin(p_usuario_id UUID)
RETURNS TABLE (
  id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  user_agent TEXT,
  ip INET
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

DROP FUNCTION IF EXISTS public.listar_transacoes_usuario_admin(UUID, TEXT, INT);

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

GRANT EXECUTE ON FUNCTION public.obter_detalhes_usuario_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.listar_sessoes_usuario_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.listar_transacoes_usuario_admin(UUID, TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_status_usuario_admin(UUID, BOOLEAN, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.atualizar_perfil_usuario_admin(UUID, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT) TO authenticated;

-- =============================================================================
-- [58/67] Fase 9 — Admin panel, logs, webhooks, tracking
-- Fonte: AdminPainel/Database/patch_usuario_detalhes_estatisticas.sql
-- =============================================================================
-- Fix: estatísticas detalhadas do usuário no admin (valores zerados)
-- Execute no SQL Editor do Supabase

CREATE OR REPLACE FUNCTION public.obter_detalhes_usuario_admin(p_usuario_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

GRANT EXECUTE ON FUNCTION public.obter_detalhes_usuario_admin(UUID) TO authenticated;

-- =============================================================================
-- [59/67] Fase 9 — Admin panel, logs, webhooks, tracking
-- Fonte: AdminPainel/Database/dashboard_admin.sql
-- =============================================================================
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

-- =============================================================================
-- [60/67] Fase 9 — Admin panel, logs, webhooks, tracking
-- Fonte: AdminPainel/Database/webhooks.sql
-- =============================================================================
-- Sistema de Webhooks (callbacks para eventos externos — Meta Ads, n8n, etc.)
-- Execute no SQL Editor do Supabase

-- =============================================================================
-- 1. Tracking em usuarios (UTM / Meta)
-- =============================================================================

ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS utm_source TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS utm_medium TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS utm_campaign TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS utm_content TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS utm_term TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS fbclid TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS fbc TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS fbp TEXT;

-- =============================================================================
-- 2. Tabelas de webhooks
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  url TEXT NOT NULL,
  evento TEXT NOT NULL,
  secret_key TEXT NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT webhooks_evento_check CHECK (
    evento IN ('user.register', 'deposit.paid', 'deposit.created', 'withdraw.approved')
  )
);

CREATE INDEX IF NOT EXISTS idx_webhooks_evento_ativo ON public.webhooks (evento, ativo);

CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  evento TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  http_status INT,
  response_body TEXT,
  tentativas INT NOT NULL DEFAULT 0,
  erro TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  CONSTRAINT webhook_deliveries_status_check CHECK (
    status IN ('pending', 'success', 'failed')
  )
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON public.webhook_deliveries (webhook_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON public.webhook_deliveries (status, created_at DESC);

-- =============================================================================
-- 3. RLS
-- =============================================================================

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS webhooks_admin_all ON public.webhooks;
CREATE POLICY webhooks_admin_all ON public.webhooks
  FOR ALL TO authenticated
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

DROP POLICY IF EXISTS webhook_deliveries_admin_select ON public.webhook_deliveries;
CREATE POLICY webhook_deliveries_admin_select ON public.webhook_deliveries
  FOR SELECT TO authenticated
  USING (public.is_user_admin());

-- =============================================================================
-- 4. Trigger updated_at
-- =============================================================================

DROP TRIGGER IF EXISTS set_updated_at_webhooks ON public.webhooks;
CREATE TRIGGER set_updated_at_webhooks
  BEFORE UPDATE ON public.webhooks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- 5. handle_new_user — salvar tracking do metadata
-- =============================================================================

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public.webhooks IS 'Webhooks configuráveis pelo admin para eventos do sistema';
COMMENT ON TABLE public.webhook_deliveries IS 'Log de entregas de webhooks (debug e auditoria)';

-- =============================================================================
-- [61/67] Fase 9 — Admin panel, logs, webhooks, tracking
-- Fonte: AdminPainel/Database/tracking_pixels.sql
-- =============================================================================
-- Pixels de tracking (Facebook Meta Pixel — PageView no frontend do cassino)
-- Execute no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS public.tracking_pixels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  pixel_id TEXT NOT NULL,
  plataforma TEXT NOT NULL DEFAULT 'facebook',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tracking_pixels_plataforma_check CHECK (plataforma IN ('facebook')),
  CONSTRAINT tracking_pixels_pixel_id_format CHECK (pixel_id ~ '^[0-9]{10,20}$')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tracking_pixels_pixel_id
  ON public.tracking_pixels (pixel_id);

CREATE INDEX IF NOT EXISTS idx_tracking_pixels_ativo
  ON public.tracking_pixels (ativo, plataforma);

ALTER TABLE public.tracking_pixels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Publico ve tracking pixels ativos" ON public.tracking_pixels;
DROP POLICY IF EXISTS "Admin gerencia tracking pixels" ON public.tracking_pixels;

CREATE POLICY "Publico ve tracking pixels ativos"
  ON public.tracking_pixels FOR SELECT
  USING (ativo = true);

CREATE POLICY "Admin gerencia tracking pixels"
  ON public.tracking_pixels FOR ALL
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

GRANT SELECT ON public.tracking_pixels TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_tracking_pixels ON public.tracking_pixels;
CREATE TRIGGER set_updated_at_tracking_pixels
  BEFORE UPDATE ON public.tracking_pixels
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================================
-- [62/67] Fase 10 — Hardening de produção (por último)
-- Fonte: AdminPainel/Database/patch_security_hardening.sql
-- =============================================================================
-- =============================================================================
-- VenuzBET — Hardening de segurança (saldo, cargo, RLS, RPC)
-- Execute no SQL Editor do Supabase (produção/staging).
-- =============================================================================

-- 1) Impede que usuários autenticados alterem colunas sensíveis via UPDATE direto
CREATE OR REPLACE FUNCTION public.protect_usuario_sensitive_columns()
RETURNS TRIGGER
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
    RAISE EXCEPTION 'Alteração de saldo não permitida';
  END IF;

  IF NEW.cargo IS DISTINCT FROM OLD.cargo THEN
    RAISE EXCEPTION 'Alteração de cargo não permitida';
  END IF;

  IF NEW.vip_nivel IS DISTINCT FROM OLD.vip_nivel THEN
    RAISE EXCEPTION 'Alteração de VIP não permitida';
  END IF;

  IF NEW.total_depositado IS DISTINCT FROM OLD.total_depositado THEN
    RAISE EXCEPTION 'Alteração de total depositado não permitida';
  END IF;

  IF NEW.two_factor_enabled IS DISTINCT FROM OLD.two_factor_enabled THEN
    RAISE EXCEPTION 'Alteração de 2FA não permitida';
  END IF;

  IF NEW.totp_secret IS DISTINCT FROM OLD.totp_secret THEN
    RAISE EXCEPTION 'Alteração de 2FA não permitida';
  END IF;

  IF NEW.totp_pending_secret IS DISTINCT FROM OLD.totp_pending_secret THEN
    RAISE EXCEPTION 'Alteração de 2FA não permitida';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_usuario_sensitive_columns ON public.usuarios;
CREATE TRIGGER protect_usuario_sensitive_columns
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_usuario_sensitive_columns();

-- 2) RPC subtrair_saldo_saque — só o próprio usuário
CREATE OR REPLACE FUNCTION public.subtrair_saldo_saque(
  p_usuario_id UUID,
  p_valor_saque NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_saldo_atual NUMERIC;
  v_novo_saldo NUMERIC;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  IF p_usuario_id IS DISTINCT FROM v_uid THEN
    RETURN json_build_object('success', false, 'error', 'forbidden');
  END IF;

  SELECT saldo INTO v_saldo_atual
  FROM public.usuarios
  WHERE id = p_usuario_id;

  IF v_saldo_atual IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  IF v_saldo_atual < p_valor_saque THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Saldo insuficiente',
      'saldo_atual', v_saldo_atual,
      'valor_saque', p_valor_saque
    );
  END IF;

  v_novo_saldo := v_saldo_atual - p_valor_saque;

  PERFORM set_config('app.skip_usuario_guard', 'true', true);
  UPDATE public.usuarios
  SET saldo = v_novo_saldo
  WHERE id = p_usuario_id;

  RETURN json_build_object(
    'success', true,
    'saldo_anterior', v_saldo_atual,
    'saldo_atual', v_novo_saldo,
    'valor_saque', p_valor_saque
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.subtrair_saldo_saque(UUID, NUMERIC) TO authenticated;

-- 3) Garante RLS restritiva em usuarios (própria linha + indicações + admin)
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem ver seus dados e indicações" ON public.usuarios;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios dados" ON public.usuarios;
DROP POLICY IF EXISTS "Admins podem ver todos os usuários" ON public.usuarios;
DROP POLICY IF EXISTS "Admin pode gerenciar usuários" ON public.usuarios;

CREATE POLICY "Usuários podem ver seus dados e indicações"
  ON public.usuarios
  FOR SELECT
  USING (
    auth.uid() = id
    OR (
      indicado_por IS NOT NULL
      AND public.get_current_user_referral_code() IS NOT NULL
      AND indicado_por = public.get_current_user_referral_code()
    )
    OR public.is_user_admin()
  );

CREATE POLICY "Usuários podem atualizar seus próprios dados"
  ON public.usuarios
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admin pode gerenciar usuários"
  ON public.usuarios
  FOR UPDATE
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

COMMENT ON FUNCTION public.protect_usuario_sensitive_columns() IS
  'Bloqueia UPDATE de saldo/cargo/VIP/2FA por usuários autenticados (bypass via app.skip_usuario_guard).';

-- 4) Revoga lookup de usuário por email para clientes (só service_role na API)
REVOKE EXECUTE ON FUNCTION public.get_user_by_email(TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_by_email(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_by_email(TEXT) TO service_role;

-- 5) Config RTP do Aviator — só motor interno (Python via API), não anon no browser
REVOKE EXECUTE ON FUNCTION public.obter_aviator_engine_config() FROM anon;
GRANT EXECUTE ON FUNCTION public.obter_aviator_engine_config() TO service_role;

-- 6) Garante que alteração de saldo exige admin
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

GRANT EXECUTE ON FUNCTION public.atualizar_saldo_usuario(UUID, NUMERIC) TO authenticated;

-- =============================================================================
-- [63/67] Fase 10 — Hardening de produção (por último)
-- Fonte: AdminPainel/Database/patch_deposit_security_parte_1_funcoes.sql
-- =============================================================================
-- =============================================================================
-- PARTE 1/5 — Funções (pode rodar com API ligada)
-- Lock mínimo. Execute e aguarde "Success".
-- =============================================================================

CREATE OR REPLACE FUNCTION public.validate_deposito_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.validate_saque_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.confirmar_deposito_pix_pago_server(
  p_deposito_id UUID,
  p_usuario_id UUID,
  p_gateway_check_id TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

COMMENT ON FUNCTION public.confirmar_deposito_pix_pago_server(UUID, UUID, TEXT) IS
  'Confirma depósito PIX somente via PlayFiverAPI (service_role), com vínculo gateway_check_id.';

REVOKE ALL ON FUNCTION public.confirmar_deposito_pix_pago_server(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirmar_deposito_pix_pago_server(UUID, UUID, TEXT) TO service_role;

-- =============================================================================
-- [64/67] Fase 10 — Hardening de produção (por último)
-- Fonte: AdminPainel/Database/patch_deposit_security_parte_2_coluna.sql
-- =============================================================================
-- =============================================================================
-- PARTE 2/5 — Coluna gateway_check_id (pode rodar com API ligada)
-- Lock rápido (~milissegundos). Se der erro, rode de novo em 10s.
-- =============================================================================

ALTER TABLE public.depositos
  ADD COLUMN IF NOT EXISTS gateway_check_id TEXT;

COMMENT ON COLUMN public.depositos.gateway_check_id IS
  'ID usado na consulta PIX (externalTransactionId ou UUID interno). Só a API confirma depósito.';

CREATE INDEX IF NOT EXISTS depositos_gateway_check_id_idx
  ON public.depositos (gateway_check_id)
  WHERE gateway_check_id IS NOT NULL;

-- =============================================================================
-- [65/67] Fase 10 — Hardening de produção (por último)
-- Fonte: AdminPainel/Database/patch_deposit_security_parte_3_trigger_depositos.sql
-- =============================================================================
-- =============================================================================
-- PARTE 3/5 — Trigger depósitos (pode rodar com API ligada)
-- Valida min/max de depósito no INSERT/UPDATE.
-- =============================================================================

DROP TRIGGER IF EXISTS validate_deposito_limits ON public.depositos;
CREATE TRIGGER validate_deposito_limits
  BEFORE INSERT OR UPDATE OF valor ON public.depositos
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_deposito_limits();

-- =============================================================================
-- [66/67] Fase 10 — Hardening de produção (por último)
-- Fonte: AdminPainel/Database/patch_deposit_security_parte_4_trigger_saques_rls.sql
-- =============================================================================
-- =============================================================================
-- PARTE 4/5 — Trigger saques + RLS depósitos (pode rodar com API ligada)
-- =============================================================================

DROP TRIGGER IF EXISTS validate_saque_limits ON public.saques;
CREATE TRIGGER validate_saque_limits
  BEFORE INSERT OR UPDATE OF valor ON public.saques
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_saque_limits();

-- Só a API (service_role) pode inserir depósitos
DROP POLICY IF EXISTS "Usuários podem inserir apenas seus próprios depósitos" ON public.depositos;
DROP POLICY IF EXISTS "depositos_insert_own" ON public.depositos;

-- =============================================================================
-- [67/67] Fase 10 — Hardening de produção (por último)
-- Fonte: AdminPainel/Database/patch_deposit_security_parte_5_permissoes.sql
-- =============================================================================
-- =============================================================================
-- PARTE 5/5 — Bloqueia RPC antigo (rode POR ÚLTIMO)
--
-- ✅ Seguro com API ligada SE o deposit.js já usa confirmar_deposito_pix_pago_server
--    (PlayFiverAPI atualizada — reinicie a API uma vez antes desta parte se ainda
--     não reiniciou desde o update de segurança).
--
-- ❌ Não rode se a API ainda chama confirmar_deposito_pix_pago via JWT do usuário.
-- =============================================================================

REVOKE EXECUTE ON FUNCTION public.confirmar_deposito_pix_pago(UUID) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.confirmar_deposito_pix_pago(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.confirmar_deposito_pix_pago(UUID) TO service_role;

-- =============================================================================
-- FIM - Instalacao completa
-- =============================================================================
-- Promover admin apos criar conta:
--   UPDATE public.usuarios SET cargo = 'admin' WHERE email = 'seu@email.com';
-- =============================================================================