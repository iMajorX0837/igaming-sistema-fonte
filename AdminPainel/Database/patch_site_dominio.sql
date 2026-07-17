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
