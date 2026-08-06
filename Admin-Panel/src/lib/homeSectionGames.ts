export const HOME_SECTION_GAMES_MAX = 11;

export type HomeGameSectionType =
  | 'jogos_semana'
  | 'jogos_pg'
  | 'jogos_mesa'
  | 'jogos_turbo';

export function isHomeGameSectionType(tipo: string): tipo is HomeGameSectionType {
  return (
    tipo === 'jogos_semana' ||
    tipo === 'jogos_pg' ||
    tipo === 'jogos_mesa' ||
    tipo === 'jogos_turbo'
  );
}

export interface HomeSectionGameRow {
  id: string;
  section_id: string;
  api_provider_id: number;
  game_code: string;
  game_name: string;
  game_image_url: string | null;
  provider_name: string;
  ordem: number;
}

export interface CatalogGameOption {
  key: string;
  api_provider_id: number;
  provider_name: string;
  game_code: string;
  game_name: string;
  game_image_url: string;
}

export function catalogGameKey(apiProviderId: number, gameCode: string): string {
  return `${apiProviderId}:${gameCode}`;
}
