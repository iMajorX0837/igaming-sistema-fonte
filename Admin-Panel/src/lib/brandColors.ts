export const DEFAULT_BRAND_PRIMARY = '#7B3FF2';
export const DEFAULT_BRAND_HOVER = '#6528D7';

export interface BrandColorsConfig {
  primary: string;
  hover: string;
  light: string;
}

function clampChannel(value: number): number {
  return Math.min(255, Math.max(0, Math.round(value)));
}

function parseHexColor(hex: string): { r: number; g: number; b: number } | null {
  let value = hex.trim();
  if (value.startsWith('#')) value = value.slice(1);
  if (value.length === 3) value = value.split('').map((char) => char + char).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return null;

  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

export function darkenHex(hex: string, amount: number): string {
  const parsed = parseHexColor(hex);
  if (!parsed) return DEFAULT_BRAND_HOVER;

  const factor = 1 - amount;
  const r = clampChannel(parsed.r * factor);
  const g = clampChannel(parsed.g * factor);
  const b = clampChannel(parsed.b * factor);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function lightenHex(hex: string, amount: number): string {
  const parsed = parseHexColor(hex);
  if (!parsed) return '#9B5FF2';

  const r = clampChannel(parsed.r + (255 - parsed.r) * amount);
  const g = clampChannel(parsed.g + (255 - parsed.g) * amount);
  const b = clampChannel(parsed.b + (255 - parsed.b) * amount);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export function resolveBrandColors(
  primary?: string | null,
  hover?: string | null,
): BrandColorsConfig {
  const resolvedPrimary = primary?.trim() || DEFAULT_BRAND_PRIMARY;
  const resolvedHover = hover?.trim() || darkenHex(resolvedPrimary, 0.12);

  return {
    primary: resolvedPrimary,
    hover: resolvedHover,
    light: lightenHex(resolvedPrimary, 0.14),
  };
}
