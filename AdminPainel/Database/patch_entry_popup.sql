-- Popup de entrada do site (imagem exibida ao acessar o site)
-- Execute no SQL Editor do Supabase

ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS entry_popup_ativo BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS entry_popup_imagem_url TEXT;

COMMENT ON COLUMN public.site_config.entry_popup_ativo IS
  'Exibe popup com imagem ao entrar no site (uma vez por sessão).';

COMMENT ON COLUMN public.site_config.entry_popup_imagem_url IS
  'URL da imagem exibida no popup de entrada.';
