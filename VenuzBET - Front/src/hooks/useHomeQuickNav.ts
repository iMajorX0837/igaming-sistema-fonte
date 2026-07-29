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
      const { data, error } = await supabase
        .from('cms_items')
        .select('id, titulo, imagem_url, link_tipo, href, game_name, ordem, ativo')
        .eq('secao', 'quick_nav')
        .eq('ativo', true)
        .order('ordem', { ascending: true });

      if (error) {
        console.error('Erro ao buscar atalhos da home:', error);
        return;
      }

      const nextItems = (data ?? []) as HomeQuickNavItem[];
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
