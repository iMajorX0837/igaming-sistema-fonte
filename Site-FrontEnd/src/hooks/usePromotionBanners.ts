import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface PromotionBanner {
  id: string;
  nome_admin: string;
  titulo: string;
  texto: string;
  imagem_url: string | null;
  ordem: number;
  ativo: boolean;
}

export function usePromotionBanners() {
  const [banners, setBanners] = useState<PromotionBanner[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cms_items')
        .select('id, nome_admin, titulo, texto, imagem_url, ordem, ativo')
        .eq('secao', 'promotion')
        .eq('ativo', true)
        .order('ordem', { ascending: true });

      if (error) {
        console.error('Erro ao buscar promoções:', error);
        setBanners([]);
        return;
      }

      setBanners((data as PromotionBanner[]) || []);
    } catch (err) {
      console.error('Erro ao buscar promoções:', err);
      setBanners([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchBanners();
  }, [fetchBanners]);

  return { banners, loading, refresh: fetchBanners };
}

export function usePromotionDetail(promotionId: string | undefined) {
  const [promotion, setPromotion] = useState<PromotionBanner | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!promotionId) {
      setPromotion(null);
      setLoading(false);
      setError('Promoção não encontrada');
      return;
    }

    let cancelled = false;

    const fetchPromotion = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('cms_items')
          .select('id, nome_admin, titulo, texto, imagem_url, ordem, ativo')
          .eq('secao', 'promotion')
          .eq('ativo', true)
          .eq('id', promotionId)
          .maybeSingle();

        if (cancelled) return;

        if (fetchError) {
          console.error('Erro ao buscar promoção:', fetchError);
          setPromotion(null);
          setError('Erro ao carregar a promoção');
          return;
        }

        if (!data) {
          setPromotion(null);
          setError('Promoção não encontrada');
          return;
        }

        setPromotion(data as PromotionBanner);
      } catch (err) {
        if (cancelled) return;
        console.error('Erro ao buscar promoção:', err);
        setPromotion(null);
        setError('Erro ao carregar a promoção');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchPromotion();

    return () => {
      cancelled = true;
    };
  }, [promotionId]);

  return { promotion, loading, error };
}
