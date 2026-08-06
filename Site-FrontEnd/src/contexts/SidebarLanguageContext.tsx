import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  getStoredSidebarLanguage,
  SIDEBAR_LANG_STORAGE_KEY,
  storeSidebarLanguage,
  type SidebarLanguage,
} from '../i18n/sidebar';

const SIDEBAR_LANGUAGE_EVENT = 'sidebar-language-change';

interface SidebarLanguageContextValue {
  language: SidebarLanguage;
  setLanguage: (lang: SidebarLanguage) => void;
}

const SidebarLanguageContext = createContext<SidebarLanguageContextValue | null>(null);

export function SidebarLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SidebarLanguage>(getStoredSidebarLanguage);

  const setLanguage = useCallback((lang: SidebarLanguage) => {
    setLanguageState(lang);
    storeSidebarLanguage(lang);
    window.dispatchEvent(new CustomEvent(SIDEBAR_LANGUAGE_EVENT, { detail: lang }));
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== SIDEBAR_LANG_STORAGE_KEY || !event.newValue) return;
      if (event.newValue === 'pt' || event.newValue === 'en' || event.newValue === 'es') {
        setLanguageState(event.newValue);
      }
    };

    const onLanguageChange = (event: Event) => {
      const next = (event as CustomEvent<SidebarLanguage>).detail;
      if (next === 'pt' || next === 'en' || next === 'es') {
        setLanguageState(next);
      }
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener(SIDEBAR_LANGUAGE_EVENT, onLanguageChange);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(SIDEBAR_LANGUAGE_EVENT, onLanguageChange);
    };
  }, []);

  return (
    <SidebarLanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </SidebarLanguageContext.Provider>
  );
}

export function useSidebarLanguage() {
  const context = useContext(SidebarLanguageContext);
  if (!context) {
    throw new Error('useSidebarLanguage must be used within SidebarLanguageProvider');
  }
  return context;
}
