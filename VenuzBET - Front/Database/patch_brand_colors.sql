-- Cores de destaque da marca (botões, bordas, links)
-- Execute no SQL Editor do Supabase

ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS brand_cor_primaria TEXT NOT NULL DEFAULT '#7B3FF2';

ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS brand_cor_hover TEXT NOT NULL DEFAULT '#6528D7';

COMMENT ON COLUMN public.site_config.brand_cor_primaria IS 'Cor principal de botões, bordas e destaques do site';
COMMENT ON COLUMN public.site_config.brand_cor_hover IS 'Cor hover dos botões e elementos interativos';
