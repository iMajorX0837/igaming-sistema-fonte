import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  mapHomeSectionProviderRow,
  type HomeSectionProviderDisplay,
} from '../lib/homeSectionProviders';

export function useHomeSectionProviders() {
  const [providersBySectionId, setProvidersBySectionId] = useState<
    Record<string, HomeSectionProviderDisplay[]>
  >({});
  const [loading, setLoading] = useState(true);

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('home_section_providers')
        .select('section_id, api_provider_id, provider_name, provider_image_url, ordem')
        .order('ordem', { ascending: true });

      if (error) {
        console.error('Erro ao buscar provedores das seções da home:', error);
        setProvidersBySectionId({});
        return;
      }

      const grouped: Record<string, HomeSectionProviderDisplay[]> = {};
      for (const row of data || []) {
        const sectionId = String(row.section_id);
        if (!grouped[sectionId]) grouped[sectionId] = [];
        grouped[sectionId].push(
          mapHomeSectionProviderRow({
            api_provider_id: Number(row.api_provider_id),
            provider_name: String(row.provider_name),
            provider_image_url: row.provider_image_url ? String(row.provider_image_url) : null,
          })
        );
      }

      setProvidersBySectionId(grouped);
    } catch (err) {
      console.error('Erro ao buscar provedores das seções da home:', err);
      setProvidersBySectionId({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProviders();
  }, [fetchProviders]);

  return { providersBySectionId, loading, refresh: fetchProviders };
}
