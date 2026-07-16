-- Itens de conteúdo do site (banners, atalhos, promoções, cards da sidebar)
-- Substitui: home_banners, recommended_banners, promotion_banners,
--            home_quick_nav_items, sidebar_promo_cards
-- Execute no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS public.cms_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  secao TEXT NOT NULL CHECK (secao IN (
    'home_banner', 'recommended', 'promotion', 'quick_nav', 'sidebar_card',
    'sidebar_category', 'sidebar_menu_item'
  )),
  nome_admin TEXT,
  titulo TEXT,
  texto TEXT,
  imagem_url TEXT,
  imagem_mobile_url TEXT,
  game_name TEXT,
  provider TEXT,
  link_tipo TEXT CHECK (link_tipo IS NULL OR link_tipo IN ('href', 'game', 'external', 'event')),
  href TEXT,
  background_color TEXT,
  bloom_color TEXT,
  outer_glow TEXT,
  text_theme TEXT CHECK (text_theme IS NULL OR text_theme IN ('light', 'dark')),
  layout TEXT CHECK (layout IS NULL OR layout IN ('single', 'double')),
  icon_type TEXT CHECK (icon_type IS NULL OR icon_type IN ('emoji', 'image', 'iconify', 'none')),
  icon_value TEXT,
  icon_alt TEXT,
  labels JSONB NOT NULL DEFAULT '{}'::jsonb,
  ordem INT NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
  CONSTRAINT cms_items_quick_nav_link CHECK (
    secao <> 'quick_nav'
    OR (
      link_tipo = 'href' AND href IS NOT NULL AND btrim(href) <> ''
    )
    OR (
      link_tipo = 'game' AND game_name IS NOT NULL AND btrim(game_name) <> ''
    )
  ),
  CONSTRAINT cms_items_sidebar_card_link CHECK (
    secao <> 'sidebar_card'
    OR (
      href IS NOT NULL AND btrim(href) <> ''
      AND nome_admin IS NOT NULL AND btrim(nome_admin) <> ''
    )
  ),
  categoria_slug TEXT,
  category_tipo TEXT,
  destaque BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT cms_items_sidebar_category_check CHECK (
    secao <> 'sidebar_category'
    OR (
      titulo IS NOT NULL AND btrim(titulo) <> ''
      AND nome_admin IS NOT NULL AND btrim(nome_admin) <> ''
      AND category_tipo IN ('menu', 'language')
    )
  ),
  CONSTRAINT cms_items_sidebar_menu_item_check CHECK (
    secao <> 'sidebar_menu_item'
    OR (
      categoria_slug IS NOT NULL AND btrim(categoria_slug) <> ''
      AND nome_admin IS NOT NULL AND btrim(nome_admin) <> ''
      AND link_tipo IN ('href', 'game', 'external', 'event')
    )
  )
);

-- Atualiza tabela existente (quem já rodou versão anterior)
ALTER TABLE public.cms_items ALTER COLUMN imagem_url DROP NOT NULL;

ALTER TABLE public.cms_items
  ADD COLUMN IF NOT EXISTS background_color TEXT;
ALTER TABLE public.cms_items
  ADD COLUMN IF NOT EXISTS bloom_color TEXT;
ALTER TABLE public.cms_items
  ADD COLUMN IF NOT EXISTS outer_glow TEXT;
ALTER TABLE public.cms_items
  ADD COLUMN IF NOT EXISTS text_theme TEXT;
ALTER TABLE public.cms_items
  ADD COLUMN IF NOT EXISTS layout TEXT;
ALTER TABLE public.cms_items
  ADD COLUMN IF NOT EXISTS icon_type TEXT;
ALTER TABLE public.cms_items
  ADD COLUMN IF NOT EXISTS icon_value TEXT;
ALTER TABLE public.cms_items
  ADD COLUMN IF NOT EXISTS icon_alt TEXT;
ALTER TABLE public.cms_items
  ADD COLUMN IF NOT EXISTS labels JSONB NOT NULL DEFAULT '{}'::jsonb;
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

ALTER TABLE public.cms_items DROP CONSTRAINT IF EXISTS cms_items_sidebar_card_link;
ALTER TABLE public.cms_items
  ADD CONSTRAINT cms_items_sidebar_card_link CHECK (
    secao <> 'sidebar_card'
    OR (
      href IS NOT NULL AND btrim(href) <> ''
      AND nome_admin IS NOT NULL AND btrim(nome_admin) <> ''
    )
  );

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

CREATE INDEX IF NOT EXISTS idx_cms_items_secao_ordem ON public.cms_items(secao, ordem ASC);
CREATE INDEX IF NOT EXISTS idx_cms_items_secao_ativo ON public.cms_items(secao, ativo) WHERE ativo = true;

-- Migra dados das tabelas antigas (se existirem)
DO $$
BEGIN
  IF to_regclass('public.home_banners') IS NOT NULL THEN
    INSERT INTO public.cms_items (
      id, secao, titulo, imagem_url, ordem, ativo, created_at, updated_at
    )
    SELECT
      id, 'home_banner', titulo, imagem_url, ordem, ativo, created_at, updated_at
    FROM public.home_banners
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF to_regclass('public.recommended_banners') IS NOT NULL THEN
    INSERT INTO public.cms_items (
      id, secao, titulo, imagem_url, imagem_mobile_url, game_name, provider, ordem, ativo, created_at, updated_at
    )
    SELECT
      id, 'recommended', titulo, imagem_url, imagem_mobile_url, game_name, provider, ordem, ativo, created_at, updated_at
    FROM public.recommended_banners
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF to_regclass('public.promotion_banners') IS NOT NULL THEN
    INSERT INTO public.cms_items (
      id, secao, nome_admin, titulo, texto, imagem_url, ordem, ativo, created_at, updated_at
    )
    SELECT
      id, 'promotion', nome_admin, titulo, texto, imagem_url, ordem, ativo, created_at, updated_at
    FROM public.promotion_banners
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF to_regclass('public.home_quick_nav_items') IS NOT NULL THEN
    INSERT INTO public.cms_items (
      id, secao, nome_admin, titulo, imagem_url, link_tipo, href, game_name, ordem, ativo, created_at, updated_at
    )
    SELECT
      id, 'quick_nav', nome_admin, titulo, imagem_url, link_tipo, href, game_name, ordem, ativo, created_at, updated_at
    FROM public.home_quick_nav_items
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF to_regclass('public.sidebar_promo_cards') IS NOT NULL THEN
    INSERT INTO public.cms_items (
      id, secao, nome_admin, href, ordem, ativo,
      background_color, bloom_color, outer_glow, text_theme, layout,
      icon_type, icon_value, icon_alt, labels,
      imagem_url, created_at, updated_at
    )
    SELECT
      id, 'sidebar_card', nome_admin, href, ordem, ativo,
      background_color, bloom_color, outer_glow, text_theme, layout,
      icon_type, icon_value, icon_alt, labels,
      CASE WHEN icon_type = 'image' THEN icon_value ELSE NULL END,
      created_at, updated_at
    FROM public.sidebar_promo_cards
    ON CONFLICT (id) DO NOTHING;
  END IF;
END;
$$;

DROP TABLE IF EXISTS public.home_banners CASCADE;
DROP TABLE IF EXISTS public.recommended_banners CASCADE;
DROP TABLE IF EXISTS public.promotion_banners CASCADE;
DROP TABLE IF EXISTS public.home_quick_nav_items CASCADE;
DROP TABLE IF EXISTS public.sidebar_promo_cards CASCADE;

ALTER TABLE public.cms_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Publico ve cms items ativos" ON public.cms_items;
DROP POLICY IF EXISTS "Admin gerencia cms items" ON public.cms_items;

CREATE POLICY "Publico ve cms items ativos"
  ON public.cms_items FOR SELECT
  USING (ativo = true);

CREATE POLICY "Admin gerencia cms items"
  ON public.cms_items FOR ALL
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

GRANT SELECT ON public.cms_items TO anon, authenticated;

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

COMMENT ON TABLE public.cms_items IS 'Itens de conteúdo do site: banners, atalhos, promoções e cards da sidebar';
