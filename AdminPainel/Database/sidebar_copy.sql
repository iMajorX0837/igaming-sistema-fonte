-- Textos da sidebar (menu e seções) por idioma — pt / en / es
-- Execute no SQL Editor do Supabase

ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS sidebar_copy JSONB;

COMMENT ON COLUMN public.site_config.sidebar_copy IS
  'Textos da sidebar por idioma: seções, itens do menu cassino/extras e labels auxiliares';
