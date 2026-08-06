/** Fallback local (data URI) quando a capa do jogo não carrega — sem request externo. */
export function getGameImageFallback(width: number, height: number): string {
  const bg = '#1e293b';
  const fg = '#64748b';
  const fontSize = Math.max(10, Math.min(width, height) * 0.12);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<rect width="100%" height="100%" fill="${bg}"/>` +
    `<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="${fg}" ` +
    `font-family="system-ui,sans-serif" font-size="${fontSize}" font-weight="600">Game</text>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export const GAME_IMAGE_FALLBACK_SM = getGameImageFallback(64, 64);
export const GAME_IMAGE_FALLBACK_LG = getGameImageFallback(300, 400);
