import {
  applyAdminFavicon,
  applyAdminPageTitle,
  buildAdminSiteBrandFromRow,
  DEFAULT_FAVICON_URL,
  DEFAULT_LOGO_URL,
  DEFAULT_NOME_BET,
  normalizeFaviconUrl,
  type AdminSiteBrandSnapshot,
} from './adminSiteBrand';

const STORAGE_KEY = 'venuz-admin-site-brand-v1';

const DEFAULTS: AdminSiteBrandSnapshot = {
  logoUrl: DEFAULT_LOGO_URL,
  nomeBet: DEFAULT_NOME_BET,
  faviconUrl: DEFAULT_FAVICON_URL,
};

function normalizeSnapshot(raw: Partial<AdminSiteBrandSnapshot> | null | undefined): AdminSiteBrandSnapshot {
  if (!raw) return { ...DEFAULTS };
  return {
    logoUrl: String(raw.logoUrl || DEFAULTS.logoUrl).trim() || DEFAULTS.logoUrl,
    nomeBet: String(raw.nomeBet || DEFAULTS.nomeBet).trim() || DEFAULTS.nomeBet,
    faviconUrl: normalizeFaviconUrl(raw.faviconUrl),
  };
}

export function getInitialAdminSiteBrand(): AdminSiteBrandSnapshot {
  if (typeof window === 'undefined') return { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return normalizeSnapshot(JSON.parse(raw) as Partial<AdminSiteBrandSnapshot>);
  } catch {
    return { ...DEFAULTS };
  }
}

export function persistAdminSiteBrand(brand: AdminSiteBrandSnapshot) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeSnapshot(brand)));
  } catch {
    // ignore quota / private mode
  }
}

export function hydrateAdminDocumentBrand(brand: AdminSiteBrandSnapshot = getInitialAdminSiteBrand()) {
  const snapshot = normalizeSnapshot(brand);
  applyAdminPageTitle(snapshot.nomeBet);
  applyAdminFavicon(snapshot.faviconUrl);
  return snapshot;
}

export function persistAdminSiteBrandFromRow(row: Record<string, unknown>) {
  const brand = buildAdminSiteBrandFromRow(row);
  persistAdminSiteBrand(brand);
  return brand;
}
