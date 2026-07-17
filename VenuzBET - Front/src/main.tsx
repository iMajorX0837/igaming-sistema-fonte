import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { SiteConfigProvider } from './contexts/SiteConfigContext.tsx';
import { getInitialSiteTheme, hydrateDocumentTheme, buildSiteThemeFromSiteConfig, persistSiteTheme } from './lib/siteConfigCache';
import { applyBrandToDocument } from './lib/siteBrand';
import { supabase } from './lib/supabase';
import './index.css';

const initialTheme = getInitialSiteTheme();
hydrateDocumentTheme(initialTheme);
applyBrandToDocument(initialTheme.brand);

void (async () => {
  try {
    const { data, error } = await supabase
      .from('site_config')
      .select(
        'header_fundo, header_logo_url, footer_fundo, home_fundo, sidebar_fundo, sidebar_item_fundo, sidebar_idioma_ativo_fundo, login_modal_imagem_url, register_modal_imagem_url, nome_bet, site_titulo, site_dominio',
      )
      .eq('id', 1)
      .maybeSingle();

    if (error || !data) return;

    const theme = buildSiteThemeFromSiteConfig(data as Record<string, unknown>);
    persistSiteTheme(theme);
    hydrateDocumentTheme(theme);
    applyBrandToDocument(theme.brand);
  } catch {
    // ignore — SiteConfigProvider refaz o fetch completo
  }
})();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <SiteConfigProvider>
          <App />
        </SiteConfigProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
