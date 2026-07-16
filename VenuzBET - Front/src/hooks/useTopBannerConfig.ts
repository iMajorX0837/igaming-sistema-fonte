import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  getInitialTopBannerConfig,
  normalizeTopBannerConfig,
  persistTopBannerConfig,
  type TopBannerConfig,
} from '../lib/topBannerCache';

export type { TopBannerConfig };
export { DEFAULT_TOP_BANNER_CONFIG } from '../lib/topBannerCache';

export function useTopBannerConfig() {
  const [config, setConfig] = useState<TopBannerConfig>(getInitialTopBannerConfig);
  const [loading, setLoading] = useState(false);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('site_config')
        .select(
          'top_banner_ativo, top_banner_background_color, top_banner_emoji, top_banner_mensagem, top_banner_botao_texto, top_banner_botao_href, top_banner_botao_cor_fundo, top_banner_botao_cor_texto, top_banner_permitir_fechar',
        )
        .eq('id', 1)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar top banner:', error);
        return;
      }

      const next = normalizeTopBannerConfig(data as Record<string, unknown> | null);
      setConfig(next);
      persistTopBannerConfig(next);
    } catch (err) {
      console.error('Erro ao buscar top banner:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchConfig();
  }, [fetchConfig]);

  return { config, loading, refresh: fetchConfig };
}
