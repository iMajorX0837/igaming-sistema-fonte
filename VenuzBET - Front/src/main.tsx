import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { SiteConfigProvider } from './contexts/SiteConfigContext.tsx';
import { getInitialSiteTheme, hydrateDocumentTheme } from './lib/siteConfigCache';
import { applyBrandToDocument } from './lib/siteBrand';
import { supabase } from './lib/supabase';
import './index.css';

hydrateDocumentTheme(getInitialSiteTheme());

void (async () => {
  try {
    const { data, error } = await supabase
      .from('site_config')
      .select('nome_bet, site_titulo')
      .eq('id', 1)
      .maybeSingle();

    if (error || !data) return;

    applyBrandToDocument({
      nome_bet: String(data.nome_bet ?? ''),
      site_titulo: String(data.site_titulo ?? ''),
    });
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
