import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  getInitialRecommendedBannersCache,
  persistRecommendedBannersCache,
  type RecommendedBanner,
} from '../lib/cmsBannersCache';

export type { RecommendedBanner };

export const DEFAULT_RECOMMENDED_BANNERS: RecommendedBanner[] = [
  {
    id: 'default-1',
    titulo: 'Banner 1',
    imagem_url: 'https://royal-images.s3.us-east-1.amazonaws.com/royalbetsolutions-com-images/images/1757717288225.avif',
    imagem_mobile_url: 'https://royal-images.s3.us-east-1.amazonaws.com/royalbetsolutions-com-images/images/1757717288225.avif',
    href: '/spribe/aviator',
    link_tipo: 'href',
    ordem: 1,
    ativo: true,
  },
  {
    id: 'default-2',
    titulo: 'Banner 2',
    imagem_url: 'https://royal-images.s3.us-east-1.amazonaws.com/royalbetsolutions-com-images/images/1757717475647.avif',
    imagem_mobile_url: 'https://royal-images.s3.us-east-1.amazonaws.com/royalbetsolutions-com-images/images/1757717475647.avif',
    href: '/pgsoft/fortune-rabbit',
    link_tipo: 'href',
    ordem: 2,
    ativo: true,
  },
  {
    id: 'default-3',
    titulo: 'Banner 3',
    imagem_url: 'https://royal-images.s3.us-east-1.amazonaws.com/royalbetsolutions-com-images/images/1757717511316.avif',
    imagem_mobile_url: 'https://royal-images.s3.us-east-1.amazonaws.com/royalbetsolutions-com-images/images/1757717511316.avif',
    href: '/pgsoft/fortune-tiger',
    link_tipo: 'href',
    ordem: 3,
    ativo: true,
  },
];

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
        setBanners((prev) => (prev.length > 0 ? prev : DEFAULT_RECOMMENDED_BANNERS));
        return;
      }

      if (!data || data.length === 0) {
        setBanners((prev) => (prev.length > 0 ? prev : DEFAULT_RECOMMENDED_BANNERS));
        return;
      }

      const next = data as RecommendedBanner[];
      setBanners((prev) => (bannersEqual(prev, next) ? prev : next));
      persistRecommendedBannersCache(next);
    } catch (err) {
      console.error('Erro ao buscar recomendados:', err);
      setBanners((prev) => (prev.length > 0 ? prev : DEFAULT_RECOMMENDED_BANNERS));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchBanners();
  }, [fetchBanners]);

  return { banners, loading, refresh: fetchBanners };
}
