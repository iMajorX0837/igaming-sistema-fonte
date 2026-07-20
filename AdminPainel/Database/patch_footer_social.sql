-- Redes sociais exibidas no footer do site principal
-- Execute no SQL Editor do Supabase

ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS footer_instagram_ativo BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS footer_instagram_url TEXT NOT NULL DEFAULT 'https://instagram.com/royalbet_oficial';
ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS footer_telegram_ativo BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS footer_telegram_url TEXT NOT NULL DEFAULT 'https://t.me/royalbet_oficial';
ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS footer_whatsapp_ativo BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS footer_whatsapp_url TEXT NOT NULL DEFAULT '';

UPDATE public.site_config
SET
  footer_instagram_ativo = COALESCE(footer_instagram_ativo, true),
  footer_instagram_url = COALESCE(NULLIF(btrim(footer_instagram_url), ''), 'https://instagram.com/royalbet_oficial'),
  footer_telegram_ativo = COALESCE(footer_telegram_ativo, true),
  footer_telegram_url = COALESCE(NULLIF(btrim(footer_telegram_url), ''), 'https://t.me/royalbet_oficial'),
  footer_whatsapp_ativo = COALESCE(footer_whatsapp_ativo, false),
  footer_whatsapp_url = COALESCE(footer_whatsapp_url, '')
WHERE id = 1;

COMMENT ON COLUMN public.site_config.footer_instagram_ativo IS 'Exibe o link do Instagram no footer do site.';
COMMENT ON COLUMN public.site_config.footer_instagram_url IS 'URL do perfil Instagram exibido no footer.';
COMMENT ON COLUMN public.site_config.footer_telegram_ativo IS 'Exibe o link do Telegram no footer do site.';
COMMENT ON COLUMN public.site_config.footer_telegram_url IS 'URL do Telegram exibido no footer.';
COMMENT ON COLUMN public.site_config.footer_whatsapp_ativo IS 'Exibe o link do WhatsApp no footer do site.';
COMMENT ON COLUMN public.site_config.footer_whatsapp_url IS 'URL ou número do WhatsApp exibido no footer (ex.: https://wa.me/5511999999999).';
