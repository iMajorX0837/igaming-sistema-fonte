import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  getInitialEntryPopupConfig,
  normalizeEntryPopupConfig,
  persistEntryPopupConfig,
  type EntryPopupConfig,
} from '../lib/entryPopupCache';

export type { EntryPopupConfig };
export { DEFAULT_ENTRY_POPUP_CONFIG } from '../lib/entryPopupCache';

export function useEntryPopupConfig() {
  const [config, setConfig] = useState<EntryPopupConfig>(getInitialEntryPopupConfig);
  const [loading, setLoading] = useState(false);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('site_config')
        .select('entry_popup_ativo, entry_popup_imagem_url')
        .eq('id', 1)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar popup de entrada:', error);
        return;
      }

      const next = normalizeEntryPopupConfig(data as Record<string, unknown> | null);
      setConfig(next);
      persistEntryPopupConfig(next);
    } catch (err) {
      console.error('Erro ao buscar popup de entrada:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchConfig();
  }, [fetchConfig]);

  return { config, loading, refresh: fetchConfig };
}
