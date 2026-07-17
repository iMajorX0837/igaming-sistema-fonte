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
