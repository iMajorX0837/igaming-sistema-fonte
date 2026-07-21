import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  getInitialHomeBannersCache,
  persistHomeBannersCache,
  type HomeBanner,
} from '../lib/cmsBannersCache';

export type { HomeBanner };

export const DEFAULT_HOME_BANNERS: HomeBanner[] = [
  {
    id: 'default-1',
    titulo: 'Banner 1',
    imagem_url: 'https://royal-images.s3.us-east-1.amazonaws.com/royalbetsolutions-com-images/images/1757718140707.png',
    href: null,
    link_tipo: null,
    ordem: 1,
    ativo: true,
  },
  {
    id: 'default-2',
    titulo: 'Banner 2',
    imagem_url: 'https://royal-images.s3.us-east-1.amazonaws.com/royalbetsolutions-com-images/images/1757718148455.png',
    href: null,
    link_tipo: null,
    ordem: 2,
    ativo: true,
  },
];

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
        setBanners((prev) => (prev.length > 0 ? prev : DEFAULT_HOME_BANNERS));
        return;
      }

      if (!data || data.length === 0) {
        setBanners((prev) => (prev.length > 0 ? prev : DEFAULT_HOME_BANNERS));
        return;
      }

      const next = data as HomeBanner[];
      setBanners((prev) => (bannersEqual(prev, next) ? prev : next));
      persistHomeBannersCache(next);
    } catch (err) {
      console.error('Erro ao buscar banners:', err);
      setBanners((prev) => (prev.length > 0 ? prev : DEFAULT_HOME_BANNERS));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchBanners();
  }, [fetchBanners]);

  return { banners, loading, refresh: fetchBanners };
}
