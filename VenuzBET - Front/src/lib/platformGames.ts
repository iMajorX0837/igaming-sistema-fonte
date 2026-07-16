import { supabase } from './supabase';

const CACHE_TTL_MS = 5 * 60 * 1000;

interface PlatformSettings {
  disabledProviders: Set<number>;
  disabledGames: Set<string>;
  loadedAt: number;
}

let settingsCache: PlatformSettings | null = null;
let loadInflight: Promise<PlatformSettings> | null = null;

function gameKey(providerId: number, gameCode: string): string {
  return `${providerId}:${gameCode}`;
}

async function loadFromNetwork(): Promise<PlatformSettings> {
  const [providersRes, gamesRes] = await Promise.all([
    supabase.from('platform_providers').select('api_provider_id, ativo'),
    supabase.from('platform_games').select('api_provider_id, game_code, ativo'),
  ]);

  const disabledProviders = new Set<number>();
  const disabledGames = new Set<string>();

  if (!providersRes.error && providersRes.data) {
    for (const row of providersRes.data) {
      if (row.ativo === false) {
        disabledProviders.add(Number(row.api_provider_id));
      }
    }
  }

  if (!gamesRes.error && gamesRes.data) {
    for (const row of gamesRes.data) {
      if (row.ativo === false) {
        disabledGames.add(gameKey(Number(row.api_provider_id), String(row.game_code)));
      }
    }
  }

  return {
    disabledProviders,
    disabledGames,
    loadedAt: Date.now(),
  };
}

export async function ensurePlatformGameSettingsLoaded(): Promise<PlatformSettings> {
  if (settingsCache && Date.now() - settingsCache.loadedAt < CACHE_TTL_MS) {
    return settingsCache;
  }

  if (loadInflight) return loadInflight;

  loadInflight = loadFromNetwork()
    .then((settings) => {
      settingsCache = settings;
      return settings;
    })
    .finally(() => {
      loadInflight = null;
    });

  return loadInflight;
}

export function invalidatePlatformGameSettingsCache(): void {
  settingsCache = null;
}

export function isPlatformProviderEnabled(
  providerId: number,
  settings: PlatformSettings | null = settingsCache
): boolean {
  if (!settings) return true;
  return !settings.disabledProviders.has(providerId);
}

export function isPlatformGameEnabled(
  providerId: number,
  gameCode: string,
  settings: PlatformSettings | null = settingsCache
): boolean {
  if (!settings) return true;
  if (settings.disabledProviders.has(providerId)) return false;
  return !settings.disabledGames.has(gameKey(providerId, gameCode));
}

export async function filterProvidersByPlatform<T extends { id: number }>(
  providers: T[]
): Promise<T[]> {
  const settings = await ensurePlatformGameSettingsLoaded();
  return providers.filter((provider) => isPlatformProviderEnabled(provider.id, settings));
}

export async function filterGamesByPlatform<T extends { game_code: string }>(
  providerId: number,
  games: T[]
): Promise<T[]> {
  const settings = await ensurePlatformGameSettingsLoaded();
  return games.filter((game) => isPlatformGameEnabled(providerId, game.game_code, settings));
}
