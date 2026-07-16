-- Menu da sidebar: categorias e itens configuráveis
-- Execute no SQL Editor do Supabase (após cms_items.sql)

ALTER TABLE public.cms_items
  ADD COLUMN IF NOT EXISTS categoria_slug TEXT;
ALTER TABLE public.cms_items
  ADD COLUMN IF NOT EXISTS category_tipo TEXT;
ALTER TABLE public.cms_items
  ADD COLUMN IF NOT EXISTS destaque BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.cms_items DROP CONSTRAINT IF EXISTS cms_items_link_tipo_check;
ALTER TABLE public.cms_items
  ADD CONSTRAINT cms_items_link_tipo_check
  CHECK (link_tipo IS NULL OR link_tipo IN ('href', 'game', 'external', 'event'));

ALTER TABLE public.cms_items DROP CONSTRAINT IF EXISTS cms_items_secao_check;
ALTER TABLE public.cms_items
  ADD CONSTRAINT cms_items_secao_check
  CHECK (secao IN (
    'home_banner', 'recommended', 'promotion', 'quick_nav', 'sidebar_card',
    'sidebar_category', 'sidebar_menu_item'
  ));

ALTER TABLE public.cms_items DROP CONSTRAINT IF EXISTS cms_items_sidebar_category_check;
ALTER TABLE public.cms_items
  ADD CONSTRAINT cms_items_sidebar_category_check CHECK (
    secao <> 'sidebar_category'
    OR (
      titulo IS NOT NULL AND btrim(titulo) <> ''
      AND nome_admin IS NOT NULL AND btrim(nome_admin) <> ''
      AND category_tipo IN ('menu', 'language')
    )
  );

ALTER TABLE public.cms_items DROP CONSTRAINT IF EXISTS cms_items_sidebar_menu_item_check;
ALTER TABLE public.cms_items
  ADD CONSTRAINT cms_items_sidebar_menu_item_check CHECK (
    secao <> 'sidebar_menu_item'
    OR (
      categoria_slug IS NOT NULL AND btrim(categoria_slug) <> ''
      AND nome_admin IS NOT NULL AND btrim(nome_admin) <> ''
      AND link_tipo IN ('href', 'game', 'external', 'event')
    )
  );

CREATE OR REPLACE FUNCTION public._admin_cms_secao_label(p_secao TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_secao
    WHEN 'home_banner' THEN 'Banner Home'
    WHEN 'recommended' THEN 'Banner Recomendado'
    WHEN 'promotion' THEN 'Banner Promoção'
    WHEN 'quick_nav' THEN 'Atalho Home'
    WHEN 'sidebar_card' THEN 'Card Sidebar'
    WHEN 'sidebar_category' THEN 'Categoria Sidebar'
    WHEN 'sidebar_menu_item' THEN 'Item Menu Sidebar'
    ELSE 'Item CMS'
  END;
$$;

-- Seed padrão (somente se ainda não houver categorias)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.cms_items WHERE secao = 'sidebar_category' LIMIT 1) THEN
    RETURN;
  END IF;

  INSERT INTO public.cms_items (secao, nome_admin, titulo, category_tipo, labels, ordem, ativo)
  VALUES
    (
      'sidebar_category', 'Cassino', 'casino', 'menu',
      '{"pt":{"line1":"CASSINO"},"en":{"line1":"CASINO"},"es":{"line1":"CASINO"}}'::jsonb,
      1, true
    ),
    (
      'sidebar_category', 'Extras', 'extras', 'menu',
      '{"pt":{"line1":"EXTRAS"},"en":{"line1":"EXTRAS"},"es":{"line1":"EXTRAS"}}'::jsonb,
      2, true
    ),
    (
      'sidebar_category', 'Idioma', 'language', 'language',
      '{"pt":{"line1":"IDIOMA"},"en":{"line1":"LANGUAGE"},"es":{"line1":"IDIOMA"}}'::jsonb,
      3, true
    );

  INSERT INTO public.cms_items (
    secao, nome_admin, categoria_slug, labels, link_tipo, href, game_name, texto,
    icon_type, icon_value, destaque, ordem, ativo
  )
  VALUES
    ('sidebar_menu_item', 'Todos os Jogos', 'casino',
      '{"pt":{"line1":"Todos os Jogos"},"en":{"line1":"All Games"},"es":{"line1":"Todos los Juegos"}}'::jsonb,
      'href', '/games', NULL, NULL, 'iconify', 'material-symbols:stadia-controller', true, 1, true),
    ('sidebar_menu_item', 'Jogos de Slot', 'casino',
      '{"pt":{"line1":"Jogos de Slot"},"en":{"line1":"Slot Games"},"es":{"line1":"Juegos de Slot"}}'::jsonb,
      'href', '/slots', NULL, NULL, 'iconify', 'mdi:slot-machine', true, 2, true),
    ('sidebar_menu_item', 'Provedoras', 'casino',
      '{"pt":{"line1":"Provedoras"},"en":{"line1":"Providers"},"es":{"line1":"Proveedoras"}}'::jsonb,
      'href', '/providers', NULL, NULL, 'iconify', 'mdi:magic-staff', true, 3, true),
    ('sidebar_menu_item', 'Mines', 'casino',
      '{"pt":{"line1":"Mines"},"en":{"line1":"Mines"},"es":{"line1":"Mines"}}'::jsonb,
      'game', NULL, 'Mines', NULL, 'iconify', 'mdi:bomb', true, 4, true),
    ('sidebar_menu_item', 'Fortune Dragon', 'casino',
      '{"pt":{"line1":"Fortune Dragon"},"en":{"line1":"Fortune Dragon"},"es":{"line1":"Fortune Dragon"}}'::jsonb,
      'game', NULL, 'Fortune Dragon', NULL, 'image',
      'https://royal-images.s3.us-east-1.amazonaws.com/default/menu/fortune-dragon.svg', true, 5, true),
    ('sidebar_menu_item', 'Fortune Tiger', 'casino',
      '{"pt":{"line1":"Fortune Tiger"},"en":{"line1":"Fortune Tiger"},"es":{"line1":"Fortune Tiger"}}'::jsonb,
      'game', NULL, 'Fortune Tiger', NULL, 'image',
      'https://royal-images.s3.us-east-1.amazonaws.com/default/menu/fortune-tiger.svg', true, 6, true),
    ('sidebar_menu_item', 'Aviator', 'casino',
      '{"pt":{"line1":"Aviator"},"en":{"line1":"Aviator"},"es":{"line1":"Aviator"}}'::jsonb,
      'game', NULL, 'Aviator', NULL, 'image',
      'https://royal-images.s3.us-east-1.amazonaws.com/default/menu/aviator.svg', true, 7, true),
    ('sidebar_menu_item', 'Telegram', 'extras',
      '{"pt":{"line1":"Acesse Nosso Telegram"},"en":{"line1":"Join our Telegram"},"es":{"line1":"Únete a nuestro Telegram"}}'::jsonb,
      'external', NULL, NULL, 'https://t.me/royalbet_oficial', 'iconify', 'ic:baseline-telegram', true, 1, true),
    ('sidebar_menu_item', 'App Download', 'extras',
      '{"pt":{"line1":"App Download"},"en":{"line1":"App Download"},"es":{"line1":"Descargar App"}}'::jsonb,
      'href', '/help/mobile', NULL, NULL, 'iconify', 'ph:download-duotone', true, 2, true),
    ('sidebar_menu_item', 'Promoções', 'extras',
      '{"pt":{"line1":"Promoções"},"en":{"line1":"Promotions"},"es":{"line1":"Promociones"}}'::jsonb,
      'href', '/help/promotions', NULL, NULL, 'iconify', 'ph:gift-duotone', true, 3, true),
    ('sidebar_menu_item', 'Ativar cupom', 'extras',
      '{"pt":{"line1":"Ativar cupom"},"en":{"line1":"Activate coupon"},"es":{"line1":"Activar cupón"}}'::jsonb,
      'event', NULL, NULL, 'openCouponModal', 'iconify', 'streamline:discount-percent-coupon-solid', true, 4, true);
END;
$$;

COMMENT ON COLUMN public.cms_items.categoria_slug IS 'Slug da categoria pai (sidebar_menu_item)';
COMMENT ON COLUMN public.cms_items.category_tipo IS 'Tipo da categoria: menu ou language (sidebar_category)';
COMMENT ON COLUMN public.cms_items.destaque IS 'Texto em negrito no item do menu da sidebar';
