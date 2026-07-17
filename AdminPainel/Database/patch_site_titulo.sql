-- Título exibido na aba do navegador (document.title)
-- Execute no SQL Editor do Supabase

ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS site_titulo TEXT NOT NULL DEFAULT 'RoyalBet | Apostas Online com Saques Rápidos';

UPDATE public.site_config
SET site_titulo = COALESCE(
  NULLIF(btrim(site_titulo), ''),
  CONCAT(COALESCE(NULLIF(btrim(nome_bet), ''), 'RoyalBet'), ' | Apostas Online com Saques Rápidos')
)
WHERE id = 1;

COMMENT ON COLUMN public.site_config.site_titulo IS
  'Título do site exibido na aba do navegador (document.title)';
