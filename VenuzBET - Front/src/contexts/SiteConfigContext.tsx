import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import {
  buildSiteThemeFromSiteConfig,
  getInitialSiteTheme,
  hydrateDocumentTheme,
  persistSiteTheme,
  type AuthModalsConfig,
  type BrandConfig,
  type FooterConfig,
  type HeaderConfig,
  type HomeConfig,
  type SidebarConfig,
  type SiteTheme,
  type BrandColorsConfig,
} from '../lib/siteConfigCache';
import { applyBrandToDocument } from '../lib/siteBrand';

interface SiteConfigContextValue extends SiteTheme {
  loading: boolean;
  refresh: () => Promise<void>;
}

const SiteConfigContext = createContext<SiteConfigContextValue | null>(null);

export function SiteConfigProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<SiteTheme>(() => getInitialSiteTheme());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('site_config')
        .select(
          'header_fundo, header_logo_url, footer_fundo, home_fundo, sidebar_fundo, sidebar_item_fundo, sidebar_idioma_ativo_fundo, login_modal_imagem_url, register_modal_imagem_url, deposit_modal_imagem_url, brand_cor_primaria, brand_cor_hover, nome_bet, site_titulo, site_dominio, site_favicon_url',
        )
        .eq('id', 1)
        .maybeSingle();

      const nextTheme = buildSiteThemeFromSiteConfig(
        error ? null : (data as Record<string, unknown> | null),
      );

      setTheme(nextTheme);
      persistSiteTheme(nextTheme);
      hydrateDocumentTheme(nextTheme);
      applyBrandToDocument(nextTheme.brand);
    } catch (error) {
      console.error('Erro ao buscar tema do site:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem('venuz-site-theme-v2');
      localStorage.removeItem('venuz-site-theme-v3');
      localStorage.removeItem('venuz-site-theme-v4');
      localStorage.removeItem('venuz-site-theme-v5');
      localStorage.removeItem('venuz-site-theme-v6');
      localStorage.removeItem('venuz-site-theme-v7');
    } catch {
      // ignore
    }
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
        brand: theme.brand,
        brandColors: theme.brandColors,
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

export function useSiteBrand() {
  const { brand, loading, refresh } = useSiteConfigContext();
  return { nomeBet: brand.nome_bet, siteTitulo: brand.site_titulo, siteDominio: brand.site_dominio, siteFaviconUrl: brand.site_favicon_url, loading, refresh };
}

export function useBrandColors() {
  const { brandColors, loading, refresh } = useSiteConfigContext();
  return { colors: brandColors, loading, refresh };
}

export type { HeaderConfig, FooterConfig, HomeConfig, SidebarConfig, AuthModalsConfig, BrandConfig, BrandColorsConfig };
