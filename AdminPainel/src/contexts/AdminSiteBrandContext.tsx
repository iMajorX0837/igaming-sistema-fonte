import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

const DEFAULT_LOGO_URL = '/assets/logo.png';
const DEFAULT_NOME_BET = 'RoyalBet';
const DEFAULT_FAVICON_URL = '/headline.png';
const ADMIN_PAGE_TITLE_PREFIX = 'Admin Painel';

export function formatAdminPageTitle(nomeBet: string = DEFAULT_NOME_BET): string {
  const brand = String(nomeBet || DEFAULT_NOME_BET).trim() || DEFAULT_NOME_BET;
  return `${ADMIN_PAGE_TITLE_PREFIX} - ${brand}`;
}

export function applyAdminPageTitle(nomeBet: string = DEFAULT_NOME_BET) {
  if (typeof document === 'undefined') return;
  document.title = formatAdminPageTitle(nomeBet);
}

function resolveFaviconType(url: string): string {
  const lower = url.toLowerCase();
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.ico')) return 'image/x-icon';
  return 'image/png';
}

export function normalizeFaviconUrl(value: unknown): string {
  const trimmed = String(value ?? '').trim();
  return trimmed || DEFAULT_FAVICON_URL;
}

export function applyAdminFavicon(faviconUrl: string = DEFAULT_FAVICON_URL) {
  if (typeof document === 'undefined') return;

  const href = normalizeFaviconUrl(faviconUrl);
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }

  link.type = resolveFaviconType(href);
  link.href = href;
}

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
  const [logoUrl, setLogoUrlState] = useState(DEFAULT_LOGO_URL);
  const [nomeBet, setNomeBetState] = useState(DEFAULT_NOME_BET);
  const [faviconUrl, setFaviconUrlState] = useState(DEFAULT_FAVICON_URL);

  const refresh = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('site_config')
        .select('header_logo_url, nome_bet, site_favicon_url')
        .eq('id', 1)
        .maybeSingle();

      if (error || !data) return;

      const nextLogo = String(data.header_logo_url || DEFAULT_LOGO_URL).trim() || DEFAULT_LOGO_URL;
      const nextNome = String(data.nome_bet || DEFAULT_NOME_BET).trim() || DEFAULT_NOME_BET;
      const nextFavicon = normalizeFaviconUrl(data.site_favicon_url);
      setLogoUrlState(nextLogo);
      setNomeBetState(nextNome);
      setFaviconUrlState(nextFavicon);
    } catch {
      // ignore fetch errors; keep current values
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    applyAdminPageTitle(nomeBet);
  }, [nomeBet]);

  useEffect(() => {
    applyAdminFavicon(faviconUrl);
  }, [faviconUrl]);

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
