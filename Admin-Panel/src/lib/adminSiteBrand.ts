export const DEFAULT_LOGO_URL = '/assets/logo.png';
export const DEFAULT_NOME_BET = 'RoyalBet';
export const DEFAULT_FAVICON_URL = '/headline.png';
export const ADMIN_PAGE_TITLE_PREFIX = 'Admin Painel';

export function formatAdminPageTitle(nomeBet: string = DEFAULT_NOME_BET): string {
  const brand = String(nomeBet || DEFAULT_NOME_BET).trim() || DEFAULT_NOME_BET;
  return `${ADMIN_PAGE_TITLE_PREFIX} - ${brand}`;
}

export function applyAdminPageTitle(nomeBet: string = DEFAULT_NOME_BET) {
  if (typeof document === 'undefined') return;
  document.title = formatAdminPageTitle(nomeBet);
}

function resolveFaviconType(url: string): string {
  const lower = url.toLowerCase();
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.ico')) return 'image/x-icon';
  return 'image/png';
}

export function normalizeFaviconUrl(value: unknown): string {
  const trimmed = String(value ?? '').trim();
  return trimmed || DEFAULT_FAVICON_URL;
}

export function applyAdminFavicon(faviconUrl: string = DEFAULT_FAVICON_URL) {
  if (typeof document === 'undefined') return;

  const href = normalizeFaviconUrl(faviconUrl);
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }

  link.type = resolveFaviconType(href);
  link.href = href;
}

export interface AdminSiteBrandSnapshot {
  logoUrl: string;
  nomeBet: string;
  faviconUrl: string;
}

export function buildAdminSiteBrandFromRow(row: Record<string, unknown>): AdminSiteBrandSnapshot {
  return {
    logoUrl: String(row.header_logo_url || DEFAULT_LOGO_URL).trim() || DEFAULT_LOGO_URL,
    nomeBet: String(row.nome_bet || DEFAULT_NOME_BET).trim() || DEFAULT_NOME_BET,
    faviconUrl: normalizeFaviconUrl(row.site_favicon_url),
  };
}
