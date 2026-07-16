export type SidebarLanguage = 'pt' | 'en' | 'es';

export const SIDEBAR_LANG_STORAGE_KEY = 'sidebar-language';

export const SIDEBAR_LANGUAGES: { code: SidebarLanguage; flag: string; name: string }[] = [
  { code: 'pt', flag: 'circle-flags:br', name: 'Português' },
  { code: 'en', flag: 'circle-flags:us', name: 'English' },
  { code: 'es', flag: 'circle-flags:es', name: 'Español' },
];

export type SidebarCopy = {
  sectionCasino: string;
  sectionExtras: string;
  sectionLanguage: string;
  dailyPrize: string;
  installAppLine1: string;
  installAppLine2: string;
  liveSupport: string;
  allGames: string;
  slots: string;
  providers: string;
  mines: string;
  fortuneDragon: string;
  fortuneTiger: string;
  aviator: string;
  telegram: string;
  appDownload: string;
  promotions: string;
  coupon: string;
};

export type SidebarCopyByLanguage = Record<SidebarLanguage, SidebarCopy>;

export const DEFAULT_SIDEBAR_COPY: SidebarCopyByLanguage = {
  pt: {
    sectionCasino: 'CASSINO',
    sectionExtras: 'EXTRAS',
    sectionLanguage: 'IDIOMA',
    dailyPrize: 'Prêmio Diário',
    installAppLine1: 'Instale nosso app e',
    installAppLine2: 'GANHE BENEFÍCIOS',
    liveSupport: 'Suporte Ao Vivo',
    allGames: 'Todos os Jogos',
    slots: 'Jogos de Slot',
    providers: 'Provedoras',
    mines: 'Mines',
    fortuneDragon: 'Fortune Dragon',
    fortuneTiger: 'Fortune Tiger',
    aviator: 'Aviator',
    telegram: 'Acesse Nosso Telegram',
    appDownload: 'App Download',
    promotions: 'Promoções',
    coupon: 'Ativar cupom',
  },
  en: {
    sectionCasino: 'CASINO',
    sectionExtras: 'EXTRAS',
    sectionLanguage: 'LANGUAGE',
    dailyPrize: 'Daily Prize',
    installAppLine1: 'Install our app and',
    installAppLine2: 'GET BENEFITS',
    liveSupport: 'Live Support',
    allGames: 'All Games',
    slots: 'Slot Games',
    providers: 'Providers',
    mines: 'Mines',
    fortuneDragon: 'Fortune Dragon',
    fortuneTiger: 'Fortune Tiger',
    aviator: 'Aviator',
    telegram: 'Join our Telegram',
    appDownload: 'App Download',
    promotions: 'Promotions',
    coupon: 'Activate coupon',
  },
  es: {
    sectionCasino: 'CASINO',
    sectionExtras: 'EXTRAS',
    sectionLanguage: 'IDIOMA',
    dailyPrize: 'Premio Diario',
    installAppLine1: 'Instala nuestra app y',
    installAppLine2: 'OBTÉN BENEFICIOS',
    liveSupport: 'Soporte en Vivo',
    allGames: 'Todos los Juegos',
    slots: 'Juegos de Slot',
    providers: 'Proveedoras',
    mines: 'Mines',
    fortuneDragon: 'Fortune Dragon',
    fortuneTiger: 'Fortune Tiger',
    aviator: 'Aviator',
    telegram: 'Únete a nuestro Telegram',
    appDownload: 'Descargar App',
    promotions: 'Promociones',
    coupon: 'Activar cupón',
  },
};

/** @deprecated Use DEFAULT_SIDEBAR_COPY */
export const SIDEBAR_COPY = DEFAULT_SIDEBAR_COPY;

export const SIDEBAR_COPY_FIELD_GROUPS: {
  title: string;
  fields: { key: keyof SidebarCopy; label: string; hint?: string }[];
}[] = [
  {
    title: 'Seções',
    fields: [
      { key: 'sectionCasino', label: 'Título — Cassino' },
      { key: 'sectionExtras', label: 'Título — Extras' },
      { key: 'sectionLanguage', label: 'Título — Idioma' },
    ],
  },
  {
    title: 'Menu Cassino',
    fields: [
      { key: 'allGames', label: 'Todos os Jogos' },
      { key: 'slots', label: 'Jogos de Slot' },
      { key: 'providers', label: 'Provedoras' },
      { key: 'mines', label: 'Mines' },
      { key: 'fortuneDragon', label: 'Fortune Dragon' },
      { key: 'fortuneTiger', label: 'Fortune Tiger' },
      { key: 'aviator', label: 'Aviator' },
    ],
  },
  {
    title: 'Menu Extras',
    fields: [
      { key: 'telegram', label: 'Telegram' },
      { key: 'appDownload', label: 'App Download' },
      { key: 'promotions', label: 'Promoções' },
      { key: 'coupon', label: 'Ativar cupom' },
    ],
  },
  {
    title: 'Textos auxiliares',
    fields: [
      { key: 'dailyPrize', label: 'Prêmio Diário' },
      { key: 'liveSupport', label: 'Suporte Ao Vivo' },
      {
        key: 'installAppLine1',
        label: 'Instalar app — linha 1',
        hint: 'Texto superior (menor). Use junto com a linha 2.',
      },
      {
        key: 'installAppLine2',
        label: 'Instalar app — linha 2',
        hint: 'Texto em destaque (negrito). Equivalente ao layout "Duas linhas" dos cards.',
      },
    ],
  },
];

function mergeCopyLang(
  lang: SidebarLanguage,
  partial?: Partial<SidebarCopy> | null,
): SidebarCopy {
  const fallback = DEFAULT_SIDEBAR_COPY[lang];
  if (!partial || typeof partial !== 'object') return fallback;

  const merged = { ...fallback };
  for (const key of Object.keys(fallback) as (keyof SidebarCopy)[]) {
    const value = partial[key];
    if (typeof value === 'string' && value.trim()) {
      merged[key] = value.trim();
    }
  }
  return merged;
}

export function normalizeSidebarCopy(raw: unknown): SidebarCopyByLanguage {
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_SIDEBAR_COPY;
  }

  const data = raw as Partial<Record<SidebarLanguage, Partial<SidebarCopy>>>;
  return {
    pt: mergeCopyLang('pt', data.pt),
    en: mergeCopyLang('en', data.en),
    es: mergeCopyLang('es', data.es),
  };
}

export function getStoredSidebarLanguage(): SidebarLanguage {
  if (typeof window === 'undefined') return 'pt';
  const stored = localStorage.getItem(SIDEBAR_LANG_STORAGE_KEY);
  if (stored === 'en' || stored === 'es' || stored === 'pt') return stored;
  return 'pt';
}

export function storeSidebarLanguage(lang: SidebarLanguage) {
  localStorage.setItem(SIDEBAR_LANG_STORAGE_KEY, lang);
}
