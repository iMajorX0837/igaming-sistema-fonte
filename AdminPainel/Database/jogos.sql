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
