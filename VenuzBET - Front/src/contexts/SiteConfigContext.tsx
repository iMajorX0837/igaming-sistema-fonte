import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import {
  buildSiteThemeFromSiteConfig,
  getInitialSiteTheme,
  hydrateDocumentTheme,
  persistSiteTheme,
  type AuthModalsConfig,
  type FooterConfig,
  type HeaderConfig,
  type HomeConfig,
  type SidebarConfig,
  type SiteTheme,
} from '../lib/siteConfigCache';

interface SiteConfigContextValue extends SiteTheme {
  loading: boolean;
  refresh: () => Promise<void>;
}

const SiteConfigContext = createContext<SiteConfigContextValue | null>(null);

export function SiteConfigProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<SiteTheme>(getInitialSiteTheme);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('site_config')
        .select(
          'header_fundo, header_logo_url, footer_fundo, home_fundo, sidebar_fundo, sidebar_item_fundo, sidebar_idioma_ativo_fundo, login_modal_imagem_url, register_modal_imagem_url',
        )
        .eq('id', 1)
        .maybeSingle();

      const nextTheme = buildSiteThemeFromSiteConfig(
        error ? null : (data as Record<string, unknown> | null),
      );

      setTheme(nextTheme);
      persistSiteTheme(nextTheme);
      hydrateDocumentTheme(nextTheme);
    } catch (error) {
      console.error('Erro ao buscar tema do site:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <SiteConfigContext.Provider
      value={{
        header: theme.header,
        footer: theme.footer,
        home: theme.home,
        sidebar: theme.sidebar,
        authModals: theme.authModals,
        loading,
        refresh,
      }}
    >
      {children}
    </SiteConfigContext.Provider>
  );
}

function useSiteConfigContext() {
  const context = useContext(SiteConfigContext);
  if (!context) {
    throw new Error('useSiteConfig deve ser usado dentro de SiteConfigProvider');
  }
  return context;
}

export function useSiteConfig() {
  return useSiteConfigContext();
}

export function useHeaderConfig() {
  const { header, loading, refresh } = useSiteConfigContext();
  return { config: header, loading, refresh };
}

export function useFooterConfig() {
  const { footer, loading, refresh } = useSiteConfigContext();
  return { config: footer, loading, refresh };
}

export function useHomeConfig() {
  const { home, loading, refresh } = useSiteConfigContext();
  return { config: home, loading, refresh };
}

export function useSidebarConfig() {
  const { sidebar, loading, refresh } = useSiteConfigContext();
  return { config: sidebar, loading, refresh };
}

export function useAuthModalsConfig() {
  const { authModals, loading, refresh } = useSiteConfigContext();
  return { config: authModals, loading, refresh };
}

export type { HeaderConfig, FooterConfig, HomeConfig, SidebarConfig, AuthModalsConfig };
