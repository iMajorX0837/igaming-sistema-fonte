declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

const initializedPixelIds = new Set<string>();
let scriptLoadPromise: Promise<void> | null = null;

function loadFbqScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.fbq) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve) => {
    const inject = (
      f: Window & { _fbq?: unknown },
      b: Document,
      e: string,
      v: string,
      n?: typeof window.fbq & { callMethod?: (...args: unknown[]) => void; queue?: unknown[][]; loaded?: boolean; version?: string; push?: typeof window.fbq },
      t?: HTMLScriptElement,
      s?: HTMLScriptElement,
    ) => {
      if (f.fbq) {
        resolve();
        return;
      }

      n = f.fbq = function (...args: unknown[]) {
        if (n?.callMethod) {
          n.callMethod(...args);
        } else {
          n?.queue?.push(args);
        }
      } as typeof n;

      if (!f._fbq) f._fbq = n;
      if (n) {
        n.push = n;
        n.loaded = true;
        n.version = '2.0';
        n.queue = [];
      }

      t = b.createElement(e) as HTMLScriptElement;
      t.async = true;
      t.src = v;
      t.onload = () => resolve();
      t.onerror = () => resolve();
      s = b.getElementsByTagName(e)[0] as HTMLScriptElement;
      s?.parentNode?.insertBefore(t, s);
    };

    inject(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  });

  return scriptLoadPromise;
}

export async function initMetaPixels(pixelIds: string[]): Promise<void> {
  if (typeof window === 'undefined' || pixelIds.length === 0) return;

  await loadFbqScript();
  if (typeof window.fbq !== 'function') return;

  let hasNewPixel = false;
  for (const pixelId of pixelIds) {
    if (!pixelId || initializedPixelIds.has(pixelId)) continue;
    window.fbq('init', pixelId);
    initializedPixelIds.add(pixelId);
    hasNewPixel = true;
  }

  if (hasNewPixel || initializedPixelIds.size > 0) {
    trackMetaPageView();
  }
}

export function trackMetaPageView(): void {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;
  if (initializedPixelIds.size === 0) return;
  window.fbq('track', 'PageView');
}
