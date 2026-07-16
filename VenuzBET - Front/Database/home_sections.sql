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
