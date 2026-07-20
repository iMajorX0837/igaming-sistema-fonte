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
