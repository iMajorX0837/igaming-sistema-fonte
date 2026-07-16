import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { SiteConfigProvider } from './contexts/SiteConfigContext.tsx';
import { getInitialSiteTheme, hydrateDocumentTheme } from './lib/siteConfigCache';
import './index.css';

hydrateDocumentTheme(getInitialSiteTheme());

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
