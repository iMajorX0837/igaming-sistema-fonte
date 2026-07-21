import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  DEFAULT_FAVICON_URL,
  DEFAULT_LOGO_URL,
  DEFAULT_NOME_BET,
  applyAdminFavicon,
  applyAdminPageTitle,
  buildAdminSiteBrandFromRow,
  formatAdminPageTitle,
  normalizeFaviconUrl,
} from '../lib/adminSiteBrand';
import { getInitialAdminSiteBrand, persistAdminSiteBrand } from '../lib/adminSiteBrandCache';

export {
  applyAdminFavicon,
  applyAdminPageTitle,
  formatAdminPageTitle,
  normalizeFaviconUrl,
};

interface AdminSiteBrandContextValue {
  logoUrl: string;
  nomeBet: string;
  faviconUrl: string;
  setLogoUrl: (url: string) => void;
  setNomeBet: (name: string) => void;
  setFaviconUrl: (url: string) => void;
  refresh: () => Promise<void>;
}

const AdminSiteBrandContext = createContext<AdminSiteBrandContextValue | null>(null);

export function AdminSiteBrandProvider({ children }: { children: React.ReactNode }) {
  const initialBrand = getInitialAdminSiteBrand();
  const [logoUrl, setLogoUrlState] = useState(initialBrand.logoUrl);
  const [nomeBet, setNomeBetState] = useState(initialBrand.nomeBet);
  const [faviconUrl, setFaviconUrlState] = useState(initialBrand.faviconUrl);

  const refresh = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('site_config')
        .select('header_logo_url, nome_bet, site_favicon_url')
        .eq('id', 1)
        .maybeSingle();

      if (error || !data) return;

      const nextBrand = buildAdminSiteBrandFromRow(data as Record<string, unknown>);
      setLogoUrlState(nextBrand.logoUrl);
      setNomeBetState(nextBrand.nomeBet);
      setFaviconUrlState(nextBrand.faviconUrl);
      persistAdminSiteBrand(nextBrand);
    } catch {
      // ignore fetch errors; keep current values
    }
  }, []);

  useLayoutEffect(() => {
    void refresh();
  }, [refresh]);

  useLayoutEffect(() => {
    applyAdminPageTitle(nomeBet);
  }, [nomeBet]);

  useLayoutEffect(() => {
    applyAdminFavicon(faviconUrl);
  }, [faviconUrl]);

  useLayoutEffect(() => {
    persistAdminSiteBrand({ logoUrl, nomeBet, faviconUrl });
  }, [logoUrl, nomeBet, faviconUrl]);

  const setLogoUrl = useCallback((url: string) => {
    const trimmed = url.trim();
    setLogoUrlState(trimmed || DEFAULT_LOGO_URL);
  }, []);

  const setNomeBet = useCallback((name: string) => {
    const trimmed = name.trim();
    setNomeBetState(trimmed || DEFAULT_NOME_BET);
  }, []);

  const setFaviconUrl = useCallback((url: string) => {
    setFaviconUrlState(normalizeFaviconUrl(url));
  }, []);

  const value = useMemo(
    () => ({
      logoUrl,
      nomeBet,
      faviconUrl,
      setLogoUrl,
      setNomeBet,
      setFaviconUrl,
      refresh,
    }),
    [logoUrl, nomeBet, faviconUrl, setLogoUrl, setNomeBet, setFaviconUrl, refresh],
  );

  return <AdminSiteBrandContext.Provider value={value}>{children}</AdminSiteBrandContext.Provider>;
}

export function useAdminSiteBrand() {
  const context = useContext(AdminSiteBrandContext);
  if (!context) {
    throw new Error('useAdminSiteBrand must be used within AdminSiteBrandProvider');
  }
  return context;
}
