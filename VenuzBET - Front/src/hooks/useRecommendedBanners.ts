import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  getInitialRecommendedBannersCache,
  persistRecommendedBannersCache,
  type RecommendedBanner,
} from '../lib/cmsBannersCache';

export type { RecommendedBanner };

function bannersEqual(a: RecommendedBanner[], b: RecommendedBanner[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((item, index) => {
    const other = b[index];
    return (
      item.id === other.id &&
      item.imagem_url === other.imagem_url &&
      item.imagem_mobile_url === other.imagem_mobile_url
    );
  });
}

export function useRecommendedBanners() {
  const [banners, setBanners] = useState<RecommendedBanner[]>(() => getInitialRecommendedBannersCache());
  const [loading, setLoading] = useState(() => getInitialRecommendedBannersCache().length === 0);

  const fetchBanners = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('cms_items')
        .select('id, titulo, imagem_url, imagem_mobile_url, href, link_tipo, ordem, ativo')
        .eq('secao', 'recommended')
        .eq('ativo', true)
        .order('ordem', { ascending: true });

      if (error) {
        console.error('Erro ao buscar recomendados:', error);
        return;
      }

      const next = (data ?? []) as RecommendedBanner[];
      setBanners((prev) => (bannersEqual(prev, next) ? prev : next));
      persistRecommendedBannersCache(next);
    } catch (err) {
      console.error('Erro ao buscar recomendados:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchBanners();
  }, [fetchBanners]);

  return { banners, loading, refresh: fetchBanners };
}
