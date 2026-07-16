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
