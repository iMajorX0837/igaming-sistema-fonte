import { useCallback, useEffect, useState } from 'react';
import {
  getInitialHomeBannersCache,
  persistHomeBannersCache,
  type HomeBanner,
} from '../lib/cmsBannersCache';
import { fetchAllCmsItemsCached } from '../lib/cmsItemsLoader';

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
      const data = await fetchAllCmsItemsCached();
      const next = data
        .filter((row) => row.secao === 'home_banner')
        .map((row) => ({
          id: String(row.id),
          titulo: row.titulo ? String(row.titulo) : null,
          imagem_url: String(row.imagem_url ?? ''),
          href: row.href ? String(row.href) : null,
          link_tipo: (row.link_tipo === 'external' ? 'external' : 'href') as HomeBanner['link_tipo'],
          ordem: Number(row.ordem) || 0,
          ativo: Boolean(row.ativo),
        })) as HomeBanner[];
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
