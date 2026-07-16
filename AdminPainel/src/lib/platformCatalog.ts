import { supabase } from './supabase';

export interface GameCategory {
  slug: string;
  nome: string;
}

export const GAME_CATEGORIES: GameCategory[] = [
  { slug: 'slots', nome: 'Slots' },
  { slug: 'live', nome: 'Cassino Ao Vivo' },
  { slug: 'table', nome: 'Jogos de Mesa' },
  { slug: 'crash', nome: 'Crash Games' },
];

export interface DbProvider {
  api_provider_id: number;
  ativo: boolean;
}

export interface DbGame {
  api_provider_id: number;
  game_code: string;
  ativo: boolean;
}

export interface PlatformDbOverrides {
  providers: DbProvider[];
  games: DbGame[];
}

export function getCategoryFromProvider(providerName: string, gameName?: string): string {
  const providerLower = providerName.toLowerCase();
  const gameNameLower = gameName?.toLowerCase() || '';

  if (
    providerLower.includes('spribe') ||
    providerLower.includes('propria') ||
    providerLower.includes('própria') ||
    gameNameLower.includes('aviator') ||
    gameNameLower.includes('mines') ||
    gameNameLower.includes('space man') ||
    gameNameLower.includes('crash')
  ) {
    return 'crash';
  }

  if (
    providerLower.includes('evolution') ||
    providerLower.includes('pragmatic live') ||
    providerLower.includes('ezugi')
  ) {
    return 'live';
  }

  if (
    gameNameLower.includes('blackjack') ||
    gameNameLower.includes('roulette') ||
    gameNameLower.includes('baccarat') ||
    gameNameLower.includes('poker')
  ) {
    return 'table';
  }

  return 'slots';
}

export async function loadPlatformDbOverrides(): Promise<PlatformDbOverrides> {
  const [providersRes, gamesRes] = await Promise.all([
    supabase.from('platform_providers').select('api_provider_id, ativo'),
    supabase.from('platform_games').select('api_provider_id, game_code, ativo'),
  ]);

  if (providersRes.error || gamesRes.error) {
    throw new Error('Execute jogos.sql no Supabase antes de usar esta página.');
  }

  return {
    providers: (providersRes.data || []) as DbProvider[],
    games: (gamesRes.data || []) as DbGame[],
  };
}
