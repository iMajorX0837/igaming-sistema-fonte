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
