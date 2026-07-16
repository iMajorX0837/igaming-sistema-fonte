import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type HomeQuickNavLinkTipo = 'href' | 'game';

export interface HomeQuickNavItem {
  id: string;
  titulo: string;
  imagem_url: string;
  link_tipo: HomeQuickNavLinkTipo;
  href: string | null;
  game_name: string | null;
  ordem: number;
  ativo: boolean;
}

export const DEFAULT_HOME_QUICK_NAV: HomeQuickNavItem[] = [
  {
    id: 'default-1',
    titulo: 'Esportes',
    imagem_url: 'https://royal-images.s3.us-east-1.amazonaws.com/royalbetsolutions-com-images/images/1757717288225.avif',
    link_tipo: 'href',
    href: '/esportes',
    game_name: null,
    ordem: 1,
    ativo: true,
  },
  {
    id: 'default-2',
    titulo: 'Apostas Ao Vivo',
    imagem_url: 'https://royal-images.s3.us-east-1.amazonaws.com/royalbetsolutions-com-images/images/1757717475647.avif',
    link_tipo: 'href',
    href: '/esportes',
    game_name: null,
    ordem: 2,
    ativo: true,
  },
  {
    id: 'default-3',
    titulo: 'Cassino',
    imagem_url: 'https://royal-images.s3.us-east-1.amazonaws.com/royalbetsolutions-com-images/images/1757717511316.avif',
    link_tipo: 'href',
    href: '/games',
    game_name: null,
    ordem: 3,
    ativo: true,
  },
  {
    id: 'default-4',
    titulo: 'Cassino Ao Vivo',
    imagem_url: 'https://royal-images.s3.us-east-1.amazonaws.com/royalbetsolutions-com-images/images/1757717475647.avif',
    link_tipo: 'href',
    href: '/provider/pragmatic',
    game_name: null,
    ordem: 4,
    ativo: true,
  },
  {
    id: 'default-5',
    titulo: 'Mines',
    imagem_url: 'https://royal-images.s3.us-east-1.amazonaws.com/default/menu/mines.svg',
    link_tipo: 'game',
    href: null,
    game_name: 'Mines',
    ordem: 5,
    ativo: true,
  },
  {
    id: 'default-6',
    titulo: 'Fortune Tiger',
    imagem_url: 'https://imagensfivers.com/Games/Pgsoft/126.webp',
    link_tipo: 'game',
    href: null,
    game_name: 'Fortune Tiger',
    ordem: 6,
    ativo: true,
  },
  {
    id: 'default-7',
    titulo: 'Aviator',
    imagem_url: 'https://imagensfivers.com/Games/Spribe/Aviator.webp',
    link_tipo: 'game',
    href: null,
    game_name: 'Aviator',
    ordem: 7,
    ativo: true,
  },
  {
    id: 'default-8',
    titulo: 'Spaceman',
    imagem_url: 'https://imagensfivers.com/Games/Pragmatic/2201.webp',
    link_tipo: 'href',
    href: '/pragmatic/spaceman',
    game_name: null,
    ordem: 8,
    ativo: true,
  },
  {
    id: 'default-9',
    titulo: 'Blackjack Ao Vivo',
    imagem_url: 'https://imagensfivers.com/Games/Pragmatic/901.webp',
    link_tipo: 'href',
    href: '/pragmatic/live-one-blackjack',
    game_name: null,
    ordem: 9,
    ativo: true,
  },
  {
    id: 'default-10',
    titulo: 'Roleta Ao Vivo',
    imagem_url: 'https://imagensfivers.com/Games/Pragmatic/203.webp',
    link_tipo: 'href',
    href: '/pragmatic/roleta-brasileira',
    game_name: null,
    ordem: 10,
    ativo: true,
  },
  {
    id: 'default-11',
    titulo: 'Football Studio',
    imagem_url: 'https://imagensfivers.com/Games/Evolution/football-studio.webp',
    link_tipo: 'href',
    href: '/evolution/football-studio',
    game_name: null,
    ordem: 11,
    ativo: true,
  },
  {
    id: 'default-12',
    titulo: 'Fortune Fruits',
    imagem_url: 'https://imagensfivers.com/Games/Pgsoft/1543462.webp',
    link_tipo: 'href',
    href: '/games',
    game_name: null,
    ordem: 12,
    ativo: true,
  },
];

const STORAGE_KEY = 'venuz-home-quick-nav-v1';

function readCachedItems(): HomeQuickNavItem[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HomeQuickNavItem[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function persistItems(items: HomeQuickNavItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore quota / private mode
  }
}

export function useHomeQuickNav() {
  const [items, setItems] = useState<HomeQuickNavItem[]>(() => readCachedItems() ?? []);
  const [loading, setLoading] = useState(() => !readCachedItems());

  const fetchItems = useCallback(async () => {
    const hasCachedItems = (readCachedItems()?.length ?? 0) > 0;
    if (!hasCachedItems) {
      setLoading(true);
    }

    try {
      const { data, error } = await supabase
        .from('cms_items')
        .select('id, titulo, imagem_url, link_tipo, href, game_name, ordem, ativo')
        .eq('secao', 'quick_nav')
        .eq('ativo', true)
        .order('ordem', { ascending: true });

      if (error) {
        console.error('Erro ao buscar atalhos da home:', error);
        if (!hasCachedItems) {
          setItems(DEFAULT_HOME_QUICK_NAV);
        }
        return;
      }

      if (!data || data.length === 0) {
        if (!hasCachedItems) {
          setItems(DEFAULT_HOME_QUICK_NAV);
        }
        return;
      }

      const nextItems = data as HomeQuickNavItem[];
      setItems(nextItems);
      persistItems(nextItems);
    } catch (err) {
      console.error('Erro ao buscar atalhos da home:', err);
      if (!hasCachedItems) {
        setItems(DEFAULT_HOME_QUICK_NAV);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  return { items, loading, refresh: fetchItems };
}
