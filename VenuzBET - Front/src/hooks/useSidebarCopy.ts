import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  DEFAULT_SIDEBAR_COPY,
  normalizeSidebarCopy,
  type SidebarCopyByLanguage,
} from '../i18n/sidebar';

const SIDEBAR_COPY_STORAGE_KEY = 'venuz-sidebar-copy-v1';

function readCachedCopy(): SidebarCopyByLanguage | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SIDEBAR_COPY_STORAGE_KEY);
    if (!raw) return null;
    return normalizeSidebarCopy(JSON.parse(raw));
  } catch {
    return null;
  }
}

function persistCopy(copy: SidebarCopyByLanguage) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SIDEBAR_COPY_STORAGE_KEY, JSON.stringify(copy));
  } catch {
    // ignore quota / private mode
  }
}

function getInitialCopy(): SidebarCopyByLanguage {
  return readCachedCopy() ?? DEFAULT_SIDEBAR_COPY;
}

export function useSidebarCopy() {
  const [copy, setCopy] = useState<SidebarCopyByLanguage>(getInitialCopy);
  const [loading, setLoading] = useState(true);

  const fetchCopy = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('site_config')
        .select('sidebar_copy')
        .eq('id', 1)
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar textos da sidebar:', error);
        return;
      }

      const normalized = normalizeSidebarCopy(data?.sidebar_copy);
      setCopy(normalized);
      persistCopy(normalized);
    } catch (err) {
      console.error('Erro ao buscar textos da sidebar:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCopy();
  }, [fetchCopy]);

  return { copy, loading, refresh: fetchCopy };
}
