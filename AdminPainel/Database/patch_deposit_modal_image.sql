-- Imagem do modal de depósito
-- Execute no SQL Editor do Supabase

ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS deposit_modal_imagem_url TEXT;

COMMENT ON COLUMN public.site_config.deposit_modal_imagem_url IS
  'URL da imagem exibida no topo do modal de depósito. Vazio usa a logo do site.';
