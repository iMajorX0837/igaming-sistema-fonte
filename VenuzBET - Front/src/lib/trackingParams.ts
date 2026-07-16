const STORAGE_KEY = 'venuz-tracking-params';

export type TrackingParams = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  fbc?: string;
  fbp?: string;
};

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function pickTrackingFromUrl(): TrackingParams {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const tracking: TrackingParams = {};

  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'] as const) {
    const value = params.get(key)?.trim();
    if (value) tracking[key] = value;
  }

  const fbc = readCookie('_fbc');
  const fbp = readCookie('_fbp');
  if (fbc) tracking.fbc = fbc;
  if (fbp) tracking.fbp = fbp;

  return tracking;
}

/** Captura UTM/fbclid da URL e persiste para o cadastro. */
export function captureTrackingParams(): TrackingParams {
  if (typeof window === 'undefined') return {};

  const fromUrl = pickTrackingFromUrl();
  if (Object.keys(fromUrl).length === 0) {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      return stored ? (JSON.parse(stored) as TrackingParams) : {};
    } catch {
      return {};
    }
  }

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fromUrl));
  } catch {
    /* ignore */
  }

  return fromUrl;
}

export function getTrackingParamsForSignup(): TrackingParams {
  captureTrackingParams();
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as TrackingParams) : {};
  } catch {
    return {};
  }
}
