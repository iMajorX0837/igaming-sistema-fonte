export const HOME_SECTION_GAMES_MAX = 11;

export interface HomeSectionGameDisplay {
  name: string;
  provider: string;
  image: string;
  href: string;
  game_code: string;
}

export function createSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getProviderSlug(providerName: string): string {
  const providerMap: Record<string, string> = {
    'PG Soft': 'pgsoft',
    Pgsoft: 'pgsoft',
    'Pragmatic Play': 'pragmatic',
    Pragmatic: 'pragmatic',
    'Pragmatic Live': 'pragmaticlive',
    NetEnt: 'netent',
    'Evolution Gaming': 'evolution',
    'Red Tiger': 'redtiger',
    Playson: 'playson',
    Habanero: 'habanero',
    Spribe: 'spribe',
    'OFICIAL - SPRIBE': 'oficial-spribe',
    Evoplay: 'evoplay',
    BGaming: 'bgaming',
    Ezugi: 'ezugi',
    'C Games': 'cgames',
  };

  const trimmed = providerName.trim();
  if (providerMap[trimmed]) return providerMap[trimmed];

  const lower = trimmed.toLowerCase();
  if (lower.includes('pragmatic') && lower.includes('live')) return 'pragmaticlive';
  if (lower.includes('pragmatic')) return 'pragmatic';
  if (lower.includes('pg soft') || lower.includes('pgsoft')) return 'pgsoft';
  if (lower.includes('oficial') && lower.includes('spribe')) return 'oficial-spribe';
  if (lower.includes('propria') || lower.includes('própria')) return 'spribe';
  if (lower.includes('spribe')) return 'spribe';

  return createSlug(trimmed);
}

export function mapHomeSectionGameRow(row: {
  game_name: string;
  game_image_url: string | null;
  provider_name: string;
  game_code: string;
}): HomeSectionGameDisplay {
  const providerSlug = getProviderSlug(row.provider_name);
  const gameSlug = createSlug(row.game_name);

  return {
    name: row.game_name,
    provider: row.provider_name,
    image: row.game_image_url || '',
    href: `/${providerSlug}/${gameSlug}`,
    game_code: row.game_code,
  };
}
