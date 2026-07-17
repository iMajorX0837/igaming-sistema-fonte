import { DEFAULT_NOME_BET, DEFAULT_SITE_TITULO, DEFAULT_SITE_DOMINIO, normalizeNomeBet, normalizeSiteTitulo, normalizeSiteDominio } from './siteBrand';
import {
  applyBrandColorsToDocument,
  DEFAULT_BRAND_COLORS,
  resolveBrandColors,
  type BrandColorsConfig,
} from './brandColors';

export type { BrandColorsConfig };

export interface HeaderConfig {
  fundo: string;
  logo_url: string;
}

export interface FooterConfig {
  fundo: string;
}

export interface HomeConfig {
  fundo: string;
}

export interface SidebarConfig {
  fundo: string;
  item_fundo: string;
  idioma_ativo_fundo: string;
}

export interface AuthModalsConfig {
  login_imagem_url: string;
  register_imagem_url: string;
  deposit_imagem_url: string;
}

export interface BrandConfig {
  nome_bet: string;
  site_titulo: string;
  site_dominio: string;
}

export interface SiteTheme {
  header: HeaderConfig;
  footer: FooterConfig;
  home: HomeConfig;
  sidebar: SidebarConfig;
  authModals: AuthModalsConfig;
  brand: BrandConfig;
  brandColors: BrandColorsConfig;
}

export const DEFAULT_AUTH_MODAL_IMAGE =
  'https://i.ibb.co/YgXq6QP/Gemini-Generated-Image-39fib539fib539fi.png';

export const DEFAULT_HEADER_CONFIG: HeaderConfig = {
  fundo: '#121319',
  logo_url: '/assets/logo.png',
};

export const DEFAULT_FOOTER_CONFIG: FooterConfig = {
  fundo: '#121319',
};

export const DEFAULT_HOME_CONFIG: HomeConfig = {
  fundo: '#121319',
};

export const DEFAULT_SIDEBAR_CONFIG: SidebarConfig = {
  fundo: '#121319',
  item_fundo: '#181923',
  idioma_ativo_fundo: '#2a1f45',
};

export const DEFAULT_AUTH_MODALS_CONFIG: AuthModalsConfig = {
  login_imagem_url: DEFAULT_AUTH_MODAL_IMAGE,
  register_imagem_url: DEFAULT_AUTH_MODAL_IMAGE,
  deposit_imagem_url: '',
};

export const DEFAULT_BRAND_CONFIG: BrandConfig = {
  nome_bet: DEFAULT_NOME_BET,
  site_titulo: DEFAULT_SITE_TITULO,
  site_dominio: DEFAULT_SITE_DOMINIO,
};

export const DEFAULT_SITE_THEME: SiteTheme = {
  header: DEFAULT_HEADER_CONFIG,
  footer: DEFAULT_FOOTER_CONFIG,
  home: DEFAULT_HOME_CONFIG,
  sidebar: DEFAULT_SIDEBAR_CONFIG,
  authModals: DEFAULT_AUTH_MODALS_CONFIG,
  brand: DEFAULT_BRAND_CONFIG,
  brandColors: DEFAULT_BRAND_COLORS,
};

const STORAGE_KEY = 'venuz-site-theme-v8';

export { STORAGE_KEY as SITE_THEME_STORAGE_KEY };

function readCache(): Partial<SiteTheme> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<SiteTheme>;
  } catch {
    return null;
  }
}

function normalizeHeader(row: Record<string, unknown> | null | undefined): HeaderConfig {
  if (!row) return DEFAULT_HEADER_CONFIG;
  return {
    fundo: String(row.fundo || DEFAULT_HEADER_CONFIG.fundo),
    logo_url: String(row.logo_url || DEFAULT_HEADER_CONFIG.logo_url),
  };
}

function normalizeFooter(row: Record<string, unknown> | null | undefined): FooterConfig {
  if (!row) return DEFAULT_FOOTER_CONFIG;
  return { fundo: String(row.fundo || DEFAULT_FOOTER_CONFIG.fundo) };
}

function normalizeHome(row: Record<string, unknown> | null | undefined): HomeConfig {
  if (!row) return DEFAULT_HOME_CONFIG;
  return { fundo: String(row.fundo || DEFAULT_HOME_CONFIG.fundo) };
}

function normalizeSidebar(row: Record<string, unknown> | null | undefined): SidebarConfig {
  if (!row) return DEFAULT_SIDEBAR_CONFIG;
  return {
    fundo: String(row.fundo || DEFAULT_SIDEBAR_CONFIG.fundo),
    item_fundo: String(row.item_fundo || DEFAULT_SIDEBAR_CONFIG.item_fundo),
    idioma_ativo_fundo: String(row.idioma_ativo_fundo || DEFAULT_SIDEBAR_CONFIG.idioma_ativo_fundo),
  };
}

function normalizeAuthModals(row: Record<string, unknown> | null | undefined): AuthModalsConfig {
  if (!row) return DEFAULT_AUTH_MODALS_CONFIG;
  return {
    login_imagem_url: String(row.login_imagem_url || DEFAULT_AUTH_MODALS_CONFIG.login_imagem_url),
    register_imagem_url: String(row.register_imagem_url || DEFAULT_AUTH_MODALS_CONFIG.register_imagem_url),
    deposit_imagem_url: String(row.deposit_imagem_url ?? DEFAULT_AUTH_MODALS_CONFIG.deposit_imagem_url).trim(),
  };
}

function normalizeBrandFromCache(brand: Partial<BrandConfig> | undefined): BrandConfig | null {
  if (!brand) return null;
  const nomeBet = String(brand.nome_bet ?? '').trim();
  const siteTitulo = String(brand.site_titulo ?? '').trim();
  const siteDominio = String(brand.site_dominio ?? '').trim();
  if (!nomeBet && !siteTitulo && !siteDominio) return null;
  return {
    nome_bet: normalizeNomeBet(nomeBet),
    site_titulo: normalizeSiteTitulo(siteTitulo, nomeBet),
    site_dominio: normalizeSiteDominio(siteDominio),
  };
}

function normalizeBrand(row: Record<string, unknown> | null | undefined): BrandConfig {
  if (!row) return DEFAULT_BRAND_CONFIG;
  const nomeBet = normalizeNomeBet(row.nome_bet);
  return {
    nome_bet: nomeBet,
    site_titulo: normalizeSiteTitulo(row.site_titulo, nomeBet),
    site_dominio: normalizeSiteDominio(row.site_dominio),
  };
}

function normalizeBrandColors(cached: Partial<BrandColorsConfig> | undefined): BrandColorsConfig {
  if (!cached?.primary) return DEFAULT_BRAND_COLORS;
  return resolveBrandColors(cached.primary, cached.hover);
}

function normalizeBrandColorsFromSiteConfig(row: Record<string, unknown> | null | undefined): BrandColorsConfig {
  if (!row) return DEFAULT_BRAND_COLORS;
  return resolveBrandColors(
    row.brand_cor_primaria ? String(row.brand_cor_primaria) : null,
    row.brand_cor_hover ? String(row.brand_cor_hover) : null,
  );
}

export function getInitialSiteTheme(): SiteTheme {
  const cached = readCache();
  const cachedBrand = normalizeBrandFromCache(cached?.brand);
  return {
    header: { ...DEFAULT_HEADER_CONFIG, ...cached?.header },
    footer: { ...DEFAULT_FOOTER_CONFIG, ...cached?.footer },
    home: { ...DEFAULT_HOME_CONFIG, ...cached?.home },
    sidebar: { ...DEFAULT_SIDEBAR_CONFIG, ...cached?.sidebar },
    authModals: { ...DEFAULT_AUTH_MODALS_CONFIG, ...cached?.authModals },
    brand: cachedBrand ?? DEFAULT_BRAND_CONFIG,
    brandColors: normalizeBrandColors(cached?.brandColors),
  };
}

export function persistSiteTheme(theme: SiteTheme) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
  } catch {
    // ignore quota / private mode
  }
}

export function hydrateDocumentTheme(theme: SiteTheme) {
  if (typeof document === 'undefined') return;
  document.documentElement.style.backgroundColor = theme.home.fundo;
  document.body.style.backgroundColor = theme.home.fundo;
  applyBrandColorsToDocument(theme.brandColors);
}

export function buildSiteThemeFromSiteConfig(row: Record<string, unknown> | null): SiteTheme {
  if (!row) return DEFAULT_SITE_THEME;

  return {
    header: normalizeHeader({
      fundo: row.header_fundo,
      logo_url: row.header_logo_url,
    }),
    footer: normalizeFooter({ fundo: row.footer_fundo }),
    home: normalizeHome({ fundo: row.home_fundo }),
    sidebar: normalizeSidebar({
      fundo: row.sidebar_fundo,
      item_fundo: row.sidebar_item_fundo,
      idioma_ativo_fundo: row.sidebar_idioma_ativo_fundo,
    }),
    authModals: normalizeAuthModals({
      login_imagem_url: row.login_modal_imagem_url,
      register_imagem_url: row.register_modal_imagem_url,
      deposit_imagem_url: row.deposit_modal_imagem_url,
    }),
    brand: normalizeBrand({
      nome_bet: row.nome_bet,
      site_titulo: row.site_titulo,
      site_dominio: row.site_dominio,
    }),
    brandColors: normalizeBrandColorsFromSiteConfig(row),
  };
}

export {
  normalizeHeader,
  normalizeFooter,
  normalizeHome,
  normalizeSidebar,
  normalizeAuthModals,
  normalizeBrand,
};
