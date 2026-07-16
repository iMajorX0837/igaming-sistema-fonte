import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface HomeBanner {
  id: string;
  titulo: string | null;
  imagem_url: string;
  ordem: number;
  ativo: boolean;
}

export const DEFAULT_HOME_BANNERS: HomeBanner[] = [
  {
    id: 'default-1',
    titulo: 'Banner 1',
    imagem_url: 'https://royal-images.s3.us-east-1.amazonaws.com/royalbetsolutions-com-images/images/1757718140707.png',
    ordem: 1,
    ativo: true,
  },
  {
    id: 'default-2',
    titulo: 'Banner 2',
    imagem_url: 'https://royal-images.s3.us-east-1.amazonaws.com/royalbetsolutions-com-images/images/1757718148455.png',
    ordem: 2,
    ativo: true,
  },
];

export function useHomeBanners() {
  const [banners, setBanners] = useState<HomeBanner[]>(DEFAULT_HOME_BANNERS);
  const [loading, setLoading] = useState(true);

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cms_items')
        .select('id, titulo, imagem_url, ordem, ativo')
        .eq('secao', 'home_banner')
        .eq('ativo', true)
        .order('ordem', { ascending: true });

      if (error) {
        console.error('Erro ao buscar banners:', error);
        setBanners(DEFAULT_HOME_BANNERS);
        return;
      }

      if (!data || data.length === 0) {
        setBanners(DEFAULT_HOME_BANNERS);
        return;
      }

      setBanners(data as HomeBanner[]);
    } catch (err) {
      console.error('Erro ao buscar banners:', err);
      setBanners(DEFAULT_HOME_BANNERS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchBanners();
  }, [fetchBanners]);

  return { banners, loading, refresh: fetchBanners };
}
