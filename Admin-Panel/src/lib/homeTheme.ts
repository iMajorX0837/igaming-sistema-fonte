function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
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

function getRelativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const transform = (channel: number) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };

  return (
    0.2126 * transform(rgb.r) + 0.7152 * transform(rgb.g) + 0.0722 * transform(rgb.b)
  );
}

/** Fundo dos cards da seção Estúdios — quase igual ao fundo da home, só um toque de contraste. */
export function getEstudiosCardBackground(homeFundo: string): string {
  const normalized = homeFundo.trim() || '#121319';
  const rgb = hexToRgb(normalized);

  if (!rgb) {
    return `color-mix(in srgb, ${normalized} 97%, white)`;
  }

  const luminance = getRelativeLuminance(rgb);
  const homeWeight = clamp(96 - Math.abs(luminance - 0.5) * 4, 94, 97);

  if (luminance < 0.5) {
    return `color-mix(in srgb, ${normalized} ${homeWeight}%, white)`;
  }

  if (luminance > 0.5) {
    return `color-mix(in srgb, ${normalized} ${homeWeight}%, black)`;
  }

  return normalized;
}

/** Botões dos sliders — mesma lógica já usada na home. */
export function getHomeSliderSurfaceBackground(homeFundo: string): string {
  return `color-mix(in srgb, ${homeFundo.trim() || '#121319'} 88%, black)`;
}
