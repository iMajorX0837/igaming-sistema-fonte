import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

const DEFAULT_LOGO_URL = '/assets/logo.png';
const DEFAULT_NOME_BET = 'RoyalBet';

interface AdminSiteBrandContextValue {
  logoUrl: string;
  nomeBet: string;
  setLogoUrl: (url: string) => void;
  setNomeBet: (name: string) => void;
  refresh: () => Promise<void>;
}

const AdminSiteBrandContext = createContext<AdminSiteBrandContextValue | null>(null);

export function AdminSiteBrandProvider({ children }: { children: React.ReactNode }) {
  const [logoUrl, setLogoUrlState] = useState(DEFAULT_LOGO_URL);
  const [nomeBet, setNomeBetState] = useState(DEFAULT_NOME_BET);

  const refresh = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('site_config')
        .select('header_logo_url, nome_bet')
        .eq('id', 1)
        .maybeSingle();

      if (error || !data) return;

      const nextLogo = String(data.header_logo_url || DEFAULT_LOGO_URL).trim() || DEFAULT_LOGO_URL;
      const nextNome = String(data.nome_bet || DEFAULT_NOME_BET).trim() || DEFAULT_NOME_BET;
      setLogoUrlState(nextLogo);
      setNomeBetState(nextNome);
    } catch {
      // ignore fetch errors; keep current values
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setLogoUrl = useCallback((url: string) => {
    const trimmed = url.trim();
    setLogoUrlState(trimmed || DEFAULT_LOGO_URL);
  }, []);

  const setNomeBet = useCallback((name: string) => {
    const trimmed = name.trim();
    setNomeBetState(trimmed || DEFAULT_NOME_BET);
  }, []);

  const value = useMemo(
    () => ({
      logoUrl,
      nomeBet,
      setLogoUrl,
      setNomeBet,
      refresh,
    }),
    [logoUrl, nomeBet, setLogoUrl, setNomeBet, refresh],
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
