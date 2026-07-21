import type { CmsLinkTipo } from './cmsLink';

export interface HomeBanner {
  id: string;
  titulo: string | null;
  imagem_url: string;
  href: string | null;
  link_tipo: 'href' | 'external' | null;
  ordem: number;
  ativo: boolean;
}

export interface RecommendedBanner {
  id: string;
  titulo: string | null;
  imagem_url: string;
  imagem_mobile_url: string | null;
  href: string | null;
  link_tipo: CmsLinkTipo;
  ordem: number;
  ativo: boolean;
}

const HOME_KEY = 'venuz-home-banners-v1';
const RECOMMENDED_KEY = 'venuz-recommended-banners-v1';

function readList<T>(key: string): T[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : null;
  } catch {
    return null;
  }
}

function persistList<T>(key: string, items: T[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // ignore quota / private mode
  }
}

export function getInitialHomeBannersCache(): HomeBanner[] {
  return readList<HomeBanner>(HOME_KEY) ?? [];
}

export function persistHomeBannersCache(banners: HomeBanner[]) {
  persistList(HOME_KEY, banners);
}

export function getInitialRecommendedBannersCache(): RecommendedBanner[] {
  return readList<RecommendedBanner>(RECOMMENDED_KEY) ?? [];
}

export function persistRecommendedBannersCache(banners: RecommendedBanner[]) {
  persistList(RECOMMENDED_KEY, banners);
}
