-- Nome da marca exibido no site (ex.: RoyalBet, StewGaming)
-- Execute no SQL Editor do Supabase

ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS nome_bet TEXT NOT NULL DEFAULT 'RoyalBet';

UPDATE public.site_config
SET nome_bet = COALESCE(NULLIF(btrim(nome_bet), ''), 'RoyalBet')
WHERE id = 1;

COMMENT ON COLUMN public.site_config.nome_bet IS
  'Nome da bet exibido no site, título da página, originais e alt da logo';
