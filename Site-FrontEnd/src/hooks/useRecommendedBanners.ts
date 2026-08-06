import { useCallback, useEffect, useState } from 'react';
import {
  getInitialRecommendedBannersCache,
  persistRecommendedBannersCache,
  type RecommendedBanner,
} from '../lib/cmsBannersCache';
import { fetchAllCmsItemsCached } from '../lib/cmsItemsLoader';

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
      const data = await fetchAllCmsItemsCached();
      const next = data
        .filter((row) => row.secao === 'recommended')
        .map((row) => ({
          id: String(row.id),
          titulo: row.titulo ? String(row.titulo) : null,
          imagem_url: String(row.imagem_url ?? ''),
          imagem_mobile_url: row.imagem_mobile_url ? String(row.imagem_mobile_url) : null,
          href: row.href ? String(row.href) : null,
          link_tipo: (row.link_tipo ?? 'href') as RecommendedBanner['link_tipo'],
          ordem: Number(row.ordem) || 0,
          ativo: Boolean(row.ativo),
        })) as RecommendedBanner[];
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
