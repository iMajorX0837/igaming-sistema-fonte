import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { SiteConfigProvider } from './contexts/SiteConfigContext.tsx';
import { SidebarLanguageProvider } from './contexts/SidebarLanguageContext.tsx';
import { getInitialSiteTheme, hydrateDocumentTheme } from './lib/siteConfigCache';
import { applyBrandToDocument } from './lib/siteBrand';
import { preloadAuthModalImages } from './lib/authModalImages';
import './index.css';

// Hidrata tema do cache imediatamente; SiteConfigProvider consolida site_config (tema, top banner, popup).
const initialTheme = getInitialSiteTheme();
hydrateDocumentTheme(initialTheme);
applyBrandToDocument(initialTheme.brand);
void preloadAuthModalImages(initialTheme.authModals);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AuthProvider>
        <SiteConfigProvider>
          <SidebarLanguageProvider>
            <App />
          </SidebarLanguageProvider>
        </SiteConfigProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
