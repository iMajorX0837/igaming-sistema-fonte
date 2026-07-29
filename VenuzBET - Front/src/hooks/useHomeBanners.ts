import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  getInitialHomeBannersCache,
  persistHomeBannersCache,
  type HomeBanner,
} from '../lib/cmsBannersCache';

export type { HomeBanner };

function bannersEqual(a: HomeBanner[], b: HomeBanner[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((item, index) => {
    const other = b[index];
    return item.id === other.id && item.imagem_url === other.imagem_url;
  });
}

export function useHomeBanners() {
  const [banners, setBanners] = useState<HomeBanner[]>(() => getInitialHomeBannersCache());
  const [loading, setLoading] = useState(() => getInitialHomeBannersCache().length === 0);

  const fetchBanners = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('cms_items')
        .select('id, titulo, imagem_url, href, link_tipo, ordem, ativo')
        .eq('secao', 'home_banner')
        .eq('ativo', true)
        .order('ordem', { ascending: true });

      if (error) {
        console.error('Erro ao buscar banners:', error);
        return;
      }

      const next = (data ?? []) as HomeBanner[];
      setBanners((prev) => (bannersEqual(prev, next) ? prev : next));
      persistHomeBannersCache(next);
    } catch (err) {
      console.error('Erro ao buscar banners:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchBanners();
  }, [fetchBanners]);

  return { banners, loading, refresh: fetchBanners };
}
