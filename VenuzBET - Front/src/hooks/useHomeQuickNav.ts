import { useCallback, useEffect, useState } from 'react';
import { fetchAllCmsItemsCached } from '../lib/cmsItemsLoader';

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

const STORAGE_KEY = 'venuz-home-quick-nav-v2';

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
      const data = await fetchAllCmsItemsCached();
      const nextItems = data
        .filter((row) => row.secao === 'quick_nav')
        .map((row) => ({
          id: String(row.id),
          titulo: String(row.titulo ?? ''),
          imagem_url: String(row.imagem_url ?? ''),
          link_tipo: row.link_tipo === 'game' ? 'game' : 'href',
          href: row.href ? String(row.href) : null,
          game_name: row.game_name ? String(row.game_name) : null,
          ordem: Number(row.ordem) || 0,
          ativo: Boolean(row.ativo),
        })) as HomeQuickNavItem[];
      setItems(nextItems);
      persistItems(nextItems);
    } catch (err) {
      console.error('Erro ao buscar atalhos da home:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  return { items, loading, refresh: fetchItems };
}
