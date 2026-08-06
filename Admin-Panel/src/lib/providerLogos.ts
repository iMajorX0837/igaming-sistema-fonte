export const SPRIBE_PROVIDER_LOGO = '/assets/providers/spribe.webp';

function isSpribeProvider(providerName: string): boolean {
  const normalized = providerName.trim();
  const lower = normalized.toLowerCase();
  return (
    normalized === 'Spribe' ||
    normalized === 'Propria' ||
    normalized === 'Própria' ||
    lower === 'spribe' ||
    lower.includes('oficial - spribe') ||
    lower.includes('propria') ||
    lower.includes('própria')
  );
}

export function resolveProviderImageUrl(
  providerName: string,
  imageUrl?: string | null
): string {
  const trimmed = imageUrl?.trim();
  if (isSpribeProvider(providerName)) {
    return trimmed || SPRIBE_PROVIDER_LOGO;
  }
  return trimmed || '';
}
