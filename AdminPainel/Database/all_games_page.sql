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
