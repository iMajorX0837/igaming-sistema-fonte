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

export function parseHexColor(hex: string): { r: number; g: number; b: number } | null {
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

export function rgbParts(hex: string): string {
  const parsed = parseHexColor(hex);
  if (!parsed) return '123 63 242';
  return `${parsed.r} ${parsed.g} ${parsed.b}`;
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

export function applyBrandColorsToDocument(colors: BrandColorsConfig) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.style.setProperty('--brand-primary', colors.primary);
  root.style.setProperty('--brand-primary-hover', colors.hover);
  root.style.setProperty('--brand-primary-light', colors.light);
  root.style.setProperty('--brand-primary-rgb', rgbParts(colors.primary));
  root.style.setProperty('--brand-primary-hover-rgb', rgbParts(colors.hover));
  root.style.setProperty('--brand-primary-light-rgb', rgbParts(colors.light));
}

export function getBrandButtonShadow(primary: string): string {
  return [
    `0px 4px 18.4px 0px color-mix(in srgb, ${primary} 45%, transparent)`,
    `0px 0px 10px 0px color-mix(in srgb, ${primary} 40%, transparent)`,
    '0px 1px 0px 0px rgba(255, 255, 255, 0.20) inset',
    '0px -3px 0px 0px rgba(0, 0, 0, 0.15) inset',
    `0px 0px 12px 0px color-mix(in srgb, ${primary} 55%, black) inset`,
  ].join(', ');
}

export const DEFAULT_BRAND_COLORS: BrandColorsConfig = resolveBrandColors(
  DEFAULT_BRAND_PRIMARY,
  DEFAULT_BRAND_HOVER,
);
