const preloaded = new Set<string>();

export function isImagePreloaded(url: string): boolean {
  const normalized = url.trim();
  return normalized.length > 0 && preloaded.has(normalized);
}

export function preloadImage(url: string): Promise<void> {
  const normalized = url.trim();
  if (!normalized || preloaded.has(normalized)) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      preloaded.add(normalized);
      resolve();
    };
    img.onerror = () => resolve();
    img.src = normalized;
  });
}

export function preloadImages(urls: string[]): Promise<void> {
  return Promise.all(urls.map(preloadImage)).then(() => undefined);
}
