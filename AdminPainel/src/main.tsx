import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { ToastProvider } from './contexts/ToastContext.tsx';
import { hydrateAdminDocumentBrand, persistAdminSiteBrandFromRow } from './lib/adminSiteBrandCache';
import { supabase } from './lib/supabase';
import './index.css';

console.log('[main.tsx] Aplicação iniciando...');
console.log('[main.tsx] Timestamp:', new Date().toISOString());

hydrateAdminDocumentBrand();

void (async () => {
  try {
    const { data, error } = await supabase
      .from('site_config')
      .select('header_logo_url, nome_bet, site_favicon_url')
      .eq('id', 1)
      .maybeSingle();

    if (error || !data) return;

    const brand = persistAdminSiteBrandFromRow(data as Record<string, unknown>);
    hydrateAdminDocumentBrand(brand);
  } catch {
    // ignore — AdminSiteBrandProvider refaz o fetch completo
  }
})();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
