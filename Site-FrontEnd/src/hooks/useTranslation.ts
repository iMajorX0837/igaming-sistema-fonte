import { useMemo } from 'react';
import { useSidebarLanguage } from '../contexts/SidebarLanguageContext';
import { getAppCopy, getLocaleForLanguage, type AppCopy } from '../i18n';
import type { AppLanguage } from '../i18n/types';

export function useTranslation() {
  const { language, setLanguage } = useSidebarLanguage();

  const copy = useMemo(() => getAppCopy(language as AppLanguage), [language]);
  const locale = useMemo(() => getLocaleForLanguage(language), [language]);

  return {
    language: language as AppLanguage,
    setLanguage,
    locale,
    t: copy,
  };
}

export type { AppCopy };
