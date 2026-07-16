import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { SidebarLanguage } from '../i18n/sidebar';

export type SidebarCategoryTipo = 'menu' | 'language';
export type SidebarMenuLinkTipo = 'href' | 'game' | 'external' | 'event';
export type SidebarMenuIconType = 'emoji' | 'image' | 'iconify' | 'none';

export interface SidebarMenuLabelSet {
  line1: string;
  line2?: string | null;
}

export interface SidebarMenuLabels {
  pt: SidebarMenuLabelSet;
  en: SidebarMenuLabelSet;
  es: SidebarMenuLabelSet;
}

export interface SidebarMenuCategory {
  id: string;
  slug: string;
  nome_admin: string;
  tipo: SidebarCategoryTipo;
  labels: SidebarMenuLabels;
  ordem: number;
  ativo: boolean;
}

export interface SidebarMenuItem {
  id: string;
  slug: string;
  nome_admin: string;
  categoria_slug: string;
  labels: SidebarMenuLabels;
  link_tipo: SidebarMenuLinkTipo;
  href: string | null;
  game_name: string | null;
  action_value: string | null;
  icon_type: SidebarMenuIconType;
  icon_value: string | null;
  destaque: boolean;
  ordem: number;
  ativo: boolean;
}

const STORAGE_KEY = 'venuz-sidebar-menu-v1';

export const DEFAULT_SIDEBAR_CATEGORIES: SidebarMenuCategory[] = [
  {
    id: 'default-casino',
    slug: 'casino',
    nome_admin: 'Cassino',
    tipo: 'menu',
    labels: {
      pt: { line1: 'CASSINO' },
      en: { line1: 'CASINO' },
      es: { line1: 'CASINO' },
    },
    ordem: 1,
    ativo: true,
  },
  {
    id: 'default-extras',
    slug: 'extras',
    nome_admin: 'Extras',
    tipo: 'menu',
    labels: {
      pt: { line1: 'EXTRAS' },
      en: { line1: 'EXTRAS' },
      es: { line1: 'EXTRAS' },
    },
    ordem: 2,
    ativo: true,
  },
  {
    id: 'default-language',
    slug: 'language',
    nome_admin: 'Idioma',
    tipo: 'language',
    labels: {
      pt: { line1: 'IDIOMA' },
      en: { line1: 'LANGUAGE' },
      es: { line1: 'IDIOMA' },
    },
    ordem: 3,
    ativo: true,
  },
];

export const DEFAULT_SIDEBAR_MENU_ITEMS: SidebarMenuItem[] = [
  {
    id: 'default-all-games',
    slug: 'all-games',
    nome_admin: 'Todos os Jogos',
    categoria_slug: 'casino',
    labels: {
      pt: { line1: 'Todos os Jogos' },
      en: { line1: 'All Games' },
      es: { line1: 'Todos los Juegos' },
    },
    link_tipo: 'href',
    href: '/games',
    game_name: null,
    action_value: null,
    icon_type: 'iconify',
    icon_value: 'material-symbols:stadia-controller',
    destaque: true,
    ordem: 1,
    ativo: true,
  },
  {
    id: 'default-slots',
    slug: 'slots',
    nome_admin: 'Jogos de Slot',
    categoria_slug: 'casino',
    labels: {
      pt: { line1: 'Jogos de Slot' },
      en: { line1: 'Slot Games' },
      es: { line1: 'Juegos de Slot' },
    },
    link_tipo: 'href',
    href: '/slots',
    game_name: null,
    action_value: null,
    icon_type: 'iconify',
    icon_value: 'mdi:slot-machine',
    destaque: true,
    ordem: 2,
    ativo: true,
  },
  {
    id: 'default-providers',
    slug: 'providers',
    nome_admin: 'Provedoras',
    categoria_slug: 'casino',
    labels: {
      pt: { line1: 'Provedoras' },
      en: { line1: 'Providers' },
      es: { line1: 'Proveedoras' },
    },
    link_tipo: 'href',
    href: '/providers',
    game_name: null,
    action_value: null,
    icon_type: 'iconify',
    icon_value: 'mdi:magic-staff',
    destaque: true,
    ordem: 3,
    ativo: true,
  },
  {
    id: 'default-mines',
    slug: 'mines',
    nome_admin: 'Mines',
    categoria_slug: 'casino',
    labels: {
      pt: { line1: 'Mines' },
      en: { line1: 'Mines' },
      es: { line1: 'Mines' },
    },
    link_tipo: 'game',
    href: null,
    game_name: 'Mines',
    action_value: null,
    icon_type: 'iconify',
    icon_value: 'mdi:bomb',
    destaque: true,
    ordem: 4,
    ativo: true,
  },
  {
    id: 'default-fortune-dragon',
    slug: 'fortune-dragon',
    nome_admin: 'Fortune Dragon',
    categoria_slug: 'casino',
    labels: {
      pt: { line1: 'Fortune Dragon' },
      en: { line1: 'Fortune Dragon' },
      es: { line1: 'Fortune Dragon' },
    },
    link_tipo: 'game',
    href: null,
    game_name: 'Fortune Dragon',
    action_value: null,
    icon_type: 'image',
    icon_value: 'https://royal-images.s3.us-east-1.amazonaws.com/default/menu/fortune-dragon.svg',
    destaque: true,
    ordem: 5,
    ativo: true,
  },
  {
    id: 'default-fortune-tiger',
    slug: 'fortune-tiger',
    nome_admin: 'Fortune Tiger',
    categoria_slug: 'casino',
    labels: {
      pt: { line1: 'Fortune Tiger' },
      en: { line1: 'Fortune Tiger' },
      es: { line1: 'Fortune Tiger' },
    },
    link_tipo: 'game',
    href: null,
    game_name: 'Fortune Tiger',
    action_value: null,
    icon_type: 'image',
    icon_value: 'https://royal-images.s3.us-east-1.amazonaws.com/default/menu/fortune-tiger.svg',
    destaque: true,
    ordem: 6,
    ativo: true,
  },
  {
    id: 'default-aviator',
    slug: 'aviator',
    nome_admin: 'Aviator',
    categoria_slug: 'casino',
    labels: {
      pt: { line1: 'Aviator' },
      en: { line1: 'Aviator' },
      es: { line1: 'Aviator' },
    },
    link_tipo: 'game',
    href: null,
    game_name: 'Aviator',
    action_value: null,
    icon_type: 'image',
    icon_value: 'https://royal-images.s3.us-east-1.amazonaws.com/default/menu/aviator.svg',
    destaque: true,
    ordem: 7,
    ativo: true,
  },
  {
    id: 'default-telegram',
    slug: 'telegram',
    nome_admin: 'Telegram',
    categoria_slug: 'extras',
    labels: {
      pt: { line1: 'Acesse Nosso Telegram' },
      en: { line1: 'Join our Telegram' },
      es: { line1: 'Únete a nuestro Telegram' },
    },
    link_tipo: 'external',
    href: null,
    game_name: null,
    action_value: 'https://t.me/royalbet_oficial',
    icon_type: 'iconify',
    icon_value: 'ic:baseline-telegram',
    destaque: true,
    ordem: 1,
    ativo: true,
  },
  {
    id: 'default-app-download',
    slug: 'app-download',
    nome_admin: 'App Download',
    categoria_slug: 'extras',
    labels: {
      pt: { line1: 'App Download' },
      en: { line1: 'App Download' },
      es: { line1: 'Descargar App' },
    },
    link_tipo: 'href',
    href: '/help/mobile',
    game_name: null,
    action_value: null,
    icon_type: 'iconify',
    icon_value: 'ph:download-duotone',
    destaque: true,
    ordem: 2,
    ativo: true,
  },
  {
    id: 'default-promotions',
    slug: 'promotions',
    nome_admin: 'Promoções',
    categoria_slug: 'extras',
    labels: {
      pt: { line1: 'Promoções' },
      en: { line1: 'Promotions' },
      es: { line1: 'Promociones' },
    },
    link_tipo: 'href',
    href: '/help/promotions',
    game_name: null,
    action_value: null,
    icon_type: 'iconify',
    icon_value: 'ph:gift-duotone',
    destaque: true,
    ordem: 3,
    ativo: true,
  },
  {
    id: 'default-coupon',
    slug: 'coupon',
    nome_admin: 'Ativar cupom',
    categoria_slug: 'extras',
    labels: {
      pt: { line1: 'Ativar cupom' },
      en: { line1: 'Activate coupon' },
      es: { line1: 'Activar cupón' },
    },
    link_tipo: 'event',
    href: null,
    game_name: null,
    action_value: 'openCouponModal',
    icon_type: 'iconify',
    icon_value: 'streamline:discount-percent-coupon-solid',
    destaque: true,
    ordem: 4,
    ativo: true,
  },
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeLabels(raw: unknown, fallback: SidebarMenuLabels): SidebarMenuLabels {
  if (!raw || typeof raw !== 'object') return fallback;
  const data = raw as Partial<Record<SidebarLanguage, Partial<SidebarMenuLabelSet>>>;
  const pick = (lang: SidebarLanguage): SidebarMenuLabelSet => ({
    line1: data[lang]?.line1?.trim() || fallback[lang].line1,
    line2: data[lang]?.line2?.trim() || fallback[lang].line2 || null,
  });
  return { pt: pick('pt'), en: pick('en'), es: pick('es') };
}

function normalizeCategory(row: Record<string, unknown>): SidebarMenuCategory {
  const fallback =
    DEFAULT_SIDEBAR_CATEGORIES.find((item) => item.slug === String(row.titulo || '')) ||
    DEFAULT_SIDEBAR_CATEGORIES[0];

  return {
    id: String(row.id),
    slug: String(row.titulo || fallback.slug),
    nome_admin: String(row.nome_admin || fallback.nome_admin),
    tipo: row.category_tipo === 'language' ? 'language' : 'menu',
    labels: normalizeLabels(row.labels, fallback.labels),
    ordem: Number(row.ordem) || 0,
    ativo: Boolean(row.ativo),
  };
}

function normalizeMenuItem(row: Record<string, unknown>): SidebarMenuItem {
  const nomeAdmin = String(row.nome_admin || '');
  const fallback =
    DEFAULT_SIDEBAR_MENU_ITEMS.find((item) => item.nome_admin === nomeAdmin) ||
    DEFAULT_SIDEBAR_MENU_ITEMS[0];

  const linkTipo =
    row.link_tipo === 'game' ||
    row.link_tipo === 'external' ||
    row.link_tipo === 'event'
      ? row.link_tipo
      : 'href';

  return {
    id: String(row.id),
    slug: slugify(nomeAdmin) || fallback.slug,
    nome_admin: nomeAdmin || fallback.nome_admin,
    categoria_slug: String(row.categoria_slug || fallback.categoria_slug),
    labels: normalizeLabels(row.labels, fallback.labels),
    link_tipo: linkTipo,
    href: row.href ? String(row.href) : null,
    game_name: row.game_name ? String(row.game_name) : null,
    action_value: row.texto ? String(row.texto) : null,
    icon_type:
      row.icon_type === 'emoji' || row.icon_type === 'image' || row.icon_type === 'iconify'
        ? row.icon_type
        : 'none',
    icon_value: row.icon_value ? String(row.icon_value) : null,
    destaque: Boolean(row.destaque),
    ordem: Number(row.ordem) || 0,
    ativo: Boolean(row.ativo),
  };
}

function readCache(): { categories: SidebarMenuCategory[]; items: SidebarMenuItem[] } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      categories?: unknown;
      items?: unknown;
    };
    if (!Array.isArray(parsed.categories) || !Array.isArray(parsed.items)) return null;
    return {
      categories: parsed.categories.map((row) => normalizeCategory(row as Record<string, unknown>)),
      items: parsed.items.map((row) => normalizeMenuItem(row as Record<string, unknown>)),
    };
  } catch {
    return null;
  }
}

function persistMenu(categories: SidebarMenuCategory[], items: SidebarMenuItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ categories, items }));
  } catch {
    // ignore
  }
}

function getInitialMenu() {
  const cached = readCache();
  return {
    categories: cached?.categories ?? DEFAULT_SIDEBAR_CATEGORIES,
    items: cached?.items ?? DEFAULT_SIDEBAR_MENU_ITEMS,
  };
}

export function getSidebarMenuLabel(
  labels: SidebarMenuLabels,
  language: SidebarLanguage,
): string {
  return labels[language]?.line1 || labels.pt.line1;
}

export function useSidebarMenu() {
  const initial = getInitialMenu();
  const [categories, setCategories] = useState<SidebarMenuCategory[]>(initial.categories);
  const [items, setItems] = useState<SidebarMenuItem[]>(initial.items);
  const [loading, setLoading] = useState(true);

  const fetchMenu = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cms_items')
        .select('*')
        .in('secao', ['sidebar_category', 'sidebar_menu_item'])
        .eq('ativo', true)
        .order('ordem', { ascending: true });

      if (error) {
        console.error('Erro ao buscar menu da sidebar:', error);
        return;
      }

      if (!data || data.length === 0) {
        setCategories(DEFAULT_SIDEBAR_CATEGORIES);
        setItems(DEFAULT_SIDEBAR_MENU_ITEMS);
        persistMenu(DEFAULT_SIDEBAR_CATEGORIES, DEFAULT_SIDEBAR_MENU_ITEMS);
        return;
      }

      const normalizedCategories = data
        .filter((row) => row.secao === 'sidebar_category')
        .map((row) => normalizeCategory(row as Record<string, unknown>));

      const normalizedItems = data
        .filter((row) => row.secao === 'sidebar_menu_item')
        .map((row) => normalizeMenuItem(row as Record<string, unknown>));

      const nextCategories =
        normalizedCategories.length > 0 ? normalizedCategories : DEFAULT_SIDEBAR_CATEGORIES;
      const nextItems = normalizedItems.length > 0 ? normalizedItems : DEFAULT_SIDEBAR_MENU_ITEMS;

      setCategories(nextCategories);
      setItems(nextItems);
      persistMenu(nextCategories, nextItems);
    } catch (err) {
      console.error('Erro ao buscar menu da sidebar:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchMenu();
  }, [fetchMenu]);

  const menuCategories = useMemo(
    () => categories.filter((category) => category.tipo === 'menu' && category.ativo),
    [categories],
  );

  const languageCategory = useMemo(
    () => categories.find((category) => category.tipo === 'language' && category.ativo) ?? null,
    [categories],
  );

  const itemsByCategory = useMemo(() => {
    const grouped: Record<string, SidebarMenuItem[]> = {};
    for (const item of items) {
      if (!item.ativo) continue;
      if (!grouped[item.categoria_slug]) grouped[item.categoria_slug] = [];
      grouped[item.categoria_slug].push(item);
    }
    for (const slug of Object.keys(grouped)) {
      grouped[slug].sort((a, b) => a.ordem - b.ordem);
    }
    return grouped;
  }, [items]);

  const collapsedMenuItems = useMemo(
    () => menuCategories.flatMap((category) => itemsByCategory[category.slug] || []),
    [menuCategories, itemsByCategory],
  );

  return {
    categories,
    menuCategories,
    languageCategory,
    items,
    itemsByCategory,
    collapsedMenuItems,
    loading,
    refresh: fetchMenu,
  };
}
