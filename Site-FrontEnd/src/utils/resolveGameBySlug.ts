import { fetchProvidersCached, fetchGamesForProviderCached, isPlayFiverEnabledProvider } from '../api/playfiversCache';
import { getFreeBonusGameCode } from '../lib/girosJogosPermitidos';
import {
  findProprietaryGameBySlug,
  PROPRIETARY_PROVIDER,
  PROPRIETARY_PROVIDER_ID,
} from '../lib/proprietaryCatalog';
import {
  ensurePlatformGameSettingsLoaded,
  isPlatformGameEnabled,
  isPlatformProviderEnabled,
} from '../lib/platformGames';

const createSlug = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const PROVIDER_SLUG_ALIASES: Record<string, string> = {
  'pragmatic-play': 'pragmatic',
  'pg-soft': 'pgsoft',
  'pragmatic-live': 'pragmaticlive',
  propria: 'spribe',
  'própria': 'spribe',
};

export const normalizeProviderSlug = (slug: string): string =>
  PROVIDER_SLUG_ALIASES[slug] || slug;

const normalizeProviderName = (providerName: string): string => {
  const trimmed = providerName.trim();
  if (trimmed === 'Propria' || trimmed === 'Própria') return 'Spribe';
  return trimmed;
};

const getProviderSlug = (providerName: string): string => {
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
    Propria: 'spribe',
    Própria: 'spribe',
    'OFICIAL - SPRIBE': 'oficial-spribe',
    Evoplay: 'evoplay',
    BGaming: 'bgaming',
    Ezugi: 'ezugi',
    'C Games': 'cgames',
  };

  const normalizedName = normalizeProviderName(providerName);
  const trimmed = normalizedName.trim();
  if (providerMap[trimmed]) return providerMap[trimmed];
  if (providerMap[providerName.trim()]) return providerMap[providerName.trim()];

  const lower = trimmed.toLowerCase();
  if (lower.includes('pragmatic') && lower.includes('live')) return 'pragmaticlive';
  if (lower.includes('pragmatic')) return 'pragmatic';
  if (lower.includes('pg soft') || lower.includes('pgsoft')) return 'pgsoft';
  if (lower.includes('oficial') && lower.includes('spribe')) return 'oficial-spribe';
  if (lower.includes('propria') || lower.includes('própria')) return 'spribe';

  return createSlug(trimmed);
};

export interface ResolvedGame {
  name: string;
  provider: string;
  image: string;
  game_code: string;
  provider_slug: string;
  game_slug: string;
}

export async function resolveGameBySlug(
  gameSlug?: string | null,
  providerSlug?: string | null
): Promise<ResolvedGame | null> {
  if (!gameSlug) return null;

  const normalizedProvider = providerSlug ? normalizeProviderSlug(providerSlug) : null;

  if (!normalizedProvider || normalizedProvider === PROPRIETARY_PROVIDER.slug) {
    const proprietaryGame = findProprietaryGameBySlug(gameSlug);
    if (proprietaryGame) {
      const settings = await ensurePlatformGameSettingsLoaded();
      if (
        isPlatformProviderEnabled(PROPRIETARY_PROVIDER_ID, settings) &&
        isPlatformGameEnabled(PROPRIETARY_PROVIDER_ID, proprietaryGame.game_code, settings)
      ) {
        return {
          name: proprietaryGame.nome,
          provider: PROPRIETARY_PROVIDER.name,
          image: proprietaryGame.image_url,
          game_code: proprietaryGame.game_code,
          provider_slug: PROPRIETARY_PROVIDER.slug,
          game_slug: createSlug(proprietaryGame.nome),
        };
      }
      if (normalizedProvider === PROPRIETARY_PROVIDER.slug) return null;
    }
  }

  const providersData = await fetchProvidersCached();
  if (providersData.status !== 1 || !providersData.data) return null;

  const filteredProviders = providersData.data.filter(isPlayFiverEnabledProvider);

  let foundProvider = null as (typeof filteredProviders)[number] | null;

  if (providerSlug) {
    const normalizedSlug = normalizeProviderSlug(providerSlug);
    const providerId = parseInt(normalizedSlug, 10);
    if (!Number.isNaN(providerId)) {
      foundProvider = filteredProviders.find((prov) => prov.id === providerId) ?? null;
    }

    if (!foundProvider) {
      foundProvider =
        filteredProviders.find((prov) => getProviderSlug(prov.name) === normalizedSlug) ?? null;
    }
  }

  const providersToSearch = foundProvider ? [foundProvider] : filteredProviders;

  for (const prov of providersToSearch) {
    const gamesData = await fetchGamesForProviderCached(prov.id);
    if (gamesData.status !== 1 || !gamesData.data) continue;

    const foundGame = gamesData.data.find((game) => {
      if (!game.status) return false;
      return createSlug(game.name) === gameSlug;
    });

    if (foundGame) {
      return {
        name: foundGame.name,
        provider: normalizeProviderName(foundGame.provider.name),
        image: foundGame.image_url,
        game_code: foundGame.game_code,
        provider_slug: getProviderSlug(foundGame.provider.name),
        game_slug: createSlug(foundGame.name),
      };
    }
  }

  return null;
}

export async function resolveFreeBonusGameBySlug(
  gameSlug?: string | null,
  providerSlug?: string | null
): Promise<ResolvedGame | null> {
  if (!gameSlug) return null;

  const mappedCode = getFreeBonusGameCode(gameSlug);
  if (mappedCode) {
    const byCode = await resolveGameByGameCode(mappedCode);
    if (byCode) return byCode;

    return {
      name: gameSlug,
      provider: 'Pragmatic',
      image: '',
      game_code: mappedCode,
      provider_slug: providerSlug || 'pragmatic',
      game_slug: gameSlug,
    };
  }

  const providersData = await fetchProvidersCached();
  if (providersData.status !== 1 || !providersData.data) return null;

  const filteredProviders = providersData.data.filter(isPlayFiverEnabledProvider);

  let foundProvider = null as (typeof filteredProviders)[number] | null;

  if (providerSlug) {
    const normalizedSlug = normalizeProviderSlug(providerSlug);
    const providerId = parseInt(normalizedSlug, 10);
    if (!Number.isNaN(providerId)) {
      foundProvider = filteredProviders.find((prov) => prov.id === providerId) ?? null;
    }

    if (!foundProvider) {
      foundProvider =
        filteredProviders.find((prov) => getProviderSlug(prov.name) === normalizedSlug) ?? null;
    }
  }

  const providersToSearch = foundProvider ? [foundProvider] : filteredProviders;

  for (const prov of providersToSearch) {
    const gamesData = await fetchGamesForProviderCached(prov.id);
    if (gamesData.status !== 1 || !gamesData.data) continue;

    const matches = gamesData.data.filter((game) => {
      if (!game.status) return false;
      return createSlug(game.name) === gameSlug;
    });

    const withFreeBonus = matches.find((game) => game.rounds_free === true);
    const foundGame = withFreeBonus || matches[0];

    if (foundGame) {
      if (!foundGame.rounds_free && foundGame.game_code) {
        const xVariant = gamesData.data.find(
          (game) =>
            game.status &&
            game.rounds_free === true &&
            String(game.game_code).toLowerCase() === `${String(foundGame.game_code).toLowerCase()}x`
        );
        if (xVariant) {
          return {
            name: xVariant.name,
            provider: normalizeProviderName(xVariant.provider.name),
            image: xVariant.image_url,
            game_code: xVariant.game_code,
            provider_slug: getProviderSlug(xVariant.provider.name),
            game_slug: createSlug(xVariant.name),
          };
        }
      }

      return {
        name: foundGame.name,
        provider: normalizeProviderName(foundGame.provider.name),
        image: foundGame.image_url,
        game_code: foundGame.game_code,
        provider_slug: getProviderSlug(foundGame.provider.name),
        game_slug: createSlug(foundGame.name),
      };
    }
  }

  return null;
}

export async function resolveGameByGameCode(gameCode: string): Promise<ResolvedGame | null> {
  if (!gameCode) return null;

  const providersData = await fetchProvidersCached();
  if (providersData.status !== 1 || !providersData.data) return null;

  const filteredProviders = providersData.data.filter(isPlayFiverEnabledProvider);
  const normalizedCode = String(gameCode).toLowerCase();

  for (const prov of filteredProviders) {
    const gamesData = await fetchGamesForProviderCached(prov.id);
    if (gamesData.status !== 1 || !gamesData.data) continue;

    const foundGame = gamesData.data.find((game) => {
      if (!game.status) return false;
      return String(game.game_code).toLowerCase() === normalizedCode;
    });

    if (foundGame) {
      return {
        name: foundGame.name,
        provider: normalizeProviderName(foundGame.provider.name),
        image: foundGame.image_url,
        game_code: foundGame.game_code,
        provider_slug: getProviderSlug(foundGame.provider.name),
        game_slug: createSlug(foundGame.name),
      };
    }
  }

  return null;
}
