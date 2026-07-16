/** Jogos hospedados na VenuzBET (fora da PlayFivers). */
export const PROPRIETARY_PROVIDER_ID = 900001;

export const PROPRIETARY_PROVIDER = {
  id: PROPRIETARY_PROVIDER_ID,
  name: 'Propria',
  slug: 'propria',
  image_url: '',
  integracao: 'Carteira VenuzBET (Própria)',
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
    image_url: 'https://imagensfivers.com/Games/Spribe/Aviator.webp',
    api_status: true,
  },
];

export function isProprietaryProviderId(providerId: number): boolean {
  return providerId === PROPRIETARY_PROVIDER_ID;
}
