/** Jogos hospedados na VenuzBET (fora da PlayFivers). */
import { SPRIBE_PROVIDER_LOGO } from './providerLogos';

export const PROPRIETARY_PROVIDER_ID = 900001;
export const AVIATOR_GAME_IMAGE = '/assets/games/aviator.gif';

export const PROPRIETARY_PROVIDER = {
  id: PROPRIETARY_PROVIDER_ID,
  name: 'Spribe',
  slug: 'spribe',
  image_url: SPRIBE_PROVIDER_LOGO,
  integracao: 'Carteira VenuzBET (Spribe)',
  category: 'crash' as const,
};

export interface ProprietaryGame {
  game_code: string;
  nome: string;
  image_url: string;
  api_status: boolean;
}

export const PROPRIETARY_GAMES: ProprietaryGame[] = [
  {
    game_code: 'aviator',
    nome: 'Aviator',
    image_url: AVIATOR_GAME_IMAGE,
    api_status: true,
  },
];

export function isProprietaryProviderId(providerId: number): boolean {
  return providerId === PROPRIETARY_PROVIDER_ID;
}
