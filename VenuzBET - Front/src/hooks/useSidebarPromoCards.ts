import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { normalizeInternalHref } from '../lib/cmsLink';
import type { SidebarLanguage } from '../i18n/sidebar';

export type SidebarCardIconType = 'emoji' | 'image' | 'iconify' | 'none';
export type SidebarCardLayout = 'single' | 'double';
export type SidebarCardTextTheme = 'light' | 'dark';

export interface SidebarCardLabelSet {
  line1: string;
  line2?: string | null;
}

export interface SidebarCardLabels {
  pt: SidebarCardLabelSet;
  en: SidebarCardLabelSet;
  es: SidebarCardLabelSet;
}

export interface SidebarPromoCard {
  id: string;
  nome_admin: string;
  href: string;
  ordem: number;
  ativo: boolean;
  background_color: string;
  bloom_color: string;
  outer_glow: string;
  text_theme: SidebarCardTextTheme;
  layout: SidebarCardLayout;
  icon_type: SidebarCardIconType;
  icon_value: string | null;
  icon_alt: string | null;
  labels: SidebarCardLabels;
}

export const DEFAULT_SIDEBAR_PROMO_CARDS: SidebarPromoCard[] = [
  {
    id: 'default-refer-friend',
    nome_admin: 'Indique um Amigo',
    href: '/help/referral',
    ordem: 1,
    ativo: true,
    background_color: '#FFDC16',
    bloom_color: '#FFF566',
    outer_glow: 'rgba(255, 220, 22, 0.42)',
    text_theme: 'dark',
    layout: 'double',
    icon_type: 'emoji',
    icon_value: '🎁',
    icon_alt: null,
    labels: {
      pt: { line1: 'Indique um amigo e', line2: 'GANHE R$ 15 GRÁTIS' },
      en: { line1: 'Refer a friend and', line2: 'GET R$ 15 FREE' },
      es: { line1: 'Invita a un amigo y', line2: 'GANA R$ 15 GRÁTIS' },
    },
  },
  {
    id: 'default-install-app',
    nome_admin: 'Instale o App',
    href: '/help/mobile',
    ordem: 2,
    ativo: true,
    background_color: '#6212A5',
    bloom_color: '#C084FC',
    outer_glow: 'rgba(98, 18, 165, 0.48)',
    text_theme: 'light',
    layout: 'double',
    icon_type: 'image',
    icon_value: 'https://venuz.bet/_ipx/f_webp/assets/icons/smartphone.svg',
    icon_alt: 'Smartphone',
    labels: {
      pt: { line1: 'Instale nosso app e', line2: 'GANHE BENEFÍCIOS' },
      en: { line1: 'Install our app and', line2: 'GET BENEFITS' },
      es: { line1: 'Instala nuestra app y', line2: 'OBTÉN BENEFICIOS' },
    },
  },
  {
    id: 'default-live-support',
    nome_admin: 'Suporte Ao Vivo',
    href: '/help/support',
    ordem: 3,
    ativo: true,
    background_color: '#15803d',
    bloom_color: '#4ADE80',
    outer_glow: 'rgba(21, 128, 61, 0.48)',
    text_theme: 'light',
    layout: 'single',
    icon_type: 'iconify',
    icon_value: 'ph:headset-duotone',
    icon_alt: null,
    labels: {
      pt: { line1: 'Suporte Ao Vivo', line2: null },
      en: { line1: 'Live Support', line2: null },
      es: { line1: 'Soporte en Vivo', line2: null },
    },
  },
];

const PROMO_CARDS_STORAGE_KEY = 'venuz-sidebar-promo-cards-v1';

function readCachedPromoCards(): SidebarPromoCard[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PROMO_CARDS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed.map((row) => normalizeCard(row as Record<string, unknown>));
  } catch {
    return null;
  }
}

function persistPromoCards(cards: SidebarPromoCard[]) {
  if (typeof window === 'undefined' || cards.length === 0) return;
  try {
    localStorage.setItem(PROMO_CARDS_STORAGE_KEY, JSON.stringify(cards));
  } catch {
    // ignore quota / private mode
  }
}

function getInitialPromoCards(): SidebarPromoCard[] {
  return readCachedPromoCards() ?? DEFAULT_SIDEBAR_PROMO_CARDS;
}

function normalizeLabels(raw: unknown): SidebarCardLabels {
  const fallback = DEFAULT_SIDEBAR_PROMO_CARDS[0].labels;
  if (!raw || typeof raw !== 'object') return fallback;

  const data = raw as Partial<Record<SidebarLanguage, Partial<SidebarCardLabelSet>>>;
  const pick = (lang: SidebarLanguage): SidebarCardLabelSet => ({
    line1: data[lang]?.line1 || fallback[lang].line1,
    line2: data[lang]?.line2 ?? fallback[lang].line2 ?? null,
  });

  return {
    pt: pick('pt'),
    en: pick('en'),
    es: pick('es'),
  };
}

function normalizeCard(row: Record<string, unknown>): SidebarPromoCard {
  return {
    id: String(row.id),
    nome_admin: String(row.nome_admin || ''),
    href: row.href ? normalizeInternalHref(String(row.href)) : '#',
    ordem: Number(row.ordem) || 0,
    ativo: Boolean(row.ativo),
    background_color: String(row.background_color || '#6212A5'),
    bloom_color: String(row.bloom_color || '#C084FC'),
    outer_glow: String(row.outer_glow || 'rgba(98, 18, 165, 0.48)'),
    text_theme: row.text_theme === 'dark' ? 'dark' : 'light',
    layout: row.layout === 'double' ? 'double' : 'single',
    icon_type:
      row.icon_type === 'emoji' || row.icon_type === 'image' || row.icon_type === 'iconify'
        ? row.icon_type
        : 'none',
    icon_value: row.icon_value ? String(row.icon_value) : null,
    icon_alt: row.icon_alt ? String(row.icon_alt) : null,
    labels: normalizeLabels(row.labels),
  };
}

export function getSidebarCardLabels(card: SidebarPromoCard, language: SidebarLanguage): SidebarCardLabelSet {
  return card.labels[language] || card.labels.pt;
}

export function getSidebarCardTitle(card: SidebarPromoCard, language: SidebarLanguage): string {
  const labels = getSidebarCardLabels(card, language);
  return labels.line2 ? `${labels.line1} ${labels.line2}` : labels.line1;
}

export function useSidebarPromoCards() {
  const [cards, setCards] = useState<SidebarPromoCard[]>(getInitialPromoCards);
  const [loading, setLoading] = useState(true);

  const fetchCards = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cms_items')
        .select('*')
        .eq('secao', 'sidebar_card')
        .eq('ativo', true)
        .order('ordem', { ascending: true });

      if (error) {
        console.error('Erro ao buscar cards da sidebar:', error);
        return;
      }

      if (!data || data.length === 0) {
        setCards(DEFAULT_SIDEBAR_PROMO_CARDS);
        persistPromoCards(DEFAULT_SIDEBAR_PROMO_CARDS);
        return;
      }

      const normalized = data.map((row) => normalizeCard(row as Record<string, unknown>));
      setCards(normalized);
      persistPromoCards(normalized);
    } catch (err) {
      console.error('Erro ao buscar cards da sidebar:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCards();
  }, [fetchCards]);

  return { cards, loading, refresh: fetchCards };
}
