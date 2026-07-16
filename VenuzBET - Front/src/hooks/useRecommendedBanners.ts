import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface RecommendedBanner {
  id: string;
  titulo: string | null;
  imagem_url: string;
  imagem_mobile_url: string | null;
  game_name: string;
  provider: string;
  ordem: number;
  ativo: boolean;
}

export const DEFAULT_RECOMMENDED_BANNERS: RecommendedBanner[] = [
  {
    id: 'default-1',
    titulo: 'Banner 1',
    imagem_url: 'https://royal-images.s3.us-east-1.amazonaws.com/royalbetsolutions-com-images/images/1757717288225.avif',
    imagem_mobile_url: 'https://royal-images.s3.us-east-1.amazonaws.com/royalbetsolutions-com-images/images/1757717288225.avif',
    game_name: 'Aviator',
    provider: 'Spribe',
    ordem: 1,
    ativo: true,
  },
  {
    id: 'default-2',
    titulo: 'Banner 2',
    imagem_url: 'https://royal-images.s3.us-east-1.amazonaws.com/royalbetsolutions-com-images/images/1757717475647.avif',
    imagem_mobile_url: 'https://royal-images.s3.us-east-1.amazonaws.com/royalbetsolutions-com-images/images/1757717475647.avif',
    game_name: 'Fortune Rabbit',
    provider: 'Pgsoft',
    ordem: 2,
    ativo: true,
  },
  {
    id: 'default-3',
    titulo: 'Banner 3',
    imagem_url: 'https://royal-images.s3.us-east-1.amazonaws.com/royalbetsolutions-com-images/images/1757717511316.avif',
    imagem_mobile_url: 'https://royal-images.s3.us-east-1.amazonaws.com/royalbetsolutions-com-images/images/1757717511316.avif',
    game_name: 'Fortune Tiger',
    provider: 'Pgsoft',
    ordem: 3,
    ativo: true,
  },
];

export function useRecommendedBanners() {
  const [banners, setBanners] = useState<RecommendedBanner[]>(DEFAULT_RECOMMENDED_BANNERS);
  const [loading, setLoading] = useState(true);

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cms_items')
        .select('id, titulo, imagem_url, imagem_mobile_url, game_name, provider, ordem, ativo')
        .eq('secao', 'recommended')
        .eq('ativo', true)
        .order('ordem', { ascending: true });

      if (error) {
        console.error('Erro ao buscar recomendados:', error);
        setBanners(DEFAULT_RECOMMENDED_BANNERS);
        return;
      }

      if (!data || data.length === 0) {
        setBanners(DEFAULT_RECOMMENDED_BANNERS);
        return;
      }

      setBanners(data as RecommendedBanner[]);
    } catch (err) {
      console.error('Erro ao buscar recomendados:', err);
      setBanners(DEFAULT_RECOMMENDED_BANNERS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchBanners();
  }, [fetchBanners]);

  return { banners, loading, refresh: fetchBanners };
}
