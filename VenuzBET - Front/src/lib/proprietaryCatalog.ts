/** Jogos hospedados na VenuzBET (fora da PlayFivers). */
export const PROPRIETARY_PROVIDER_ID = 900001;

export const PROPRIETARY_PROVIDER = {
  id: PROPRIETARY_PROVIDER_ID,
  name: 'Propria',
  slug: 'propria',
};

export interface ProprietaryGame {
  game_code: string;
  nome: string;
  image_url: string;
}

export const PROPRIETARY_GAMES: ProprietaryGame[] = [
  {
    game_code: 'aviator',
    nome: 'Aviator',
    image_url: 'https://imagensfivers.com/Games/Spribe/Aviator.webp',
  },
];

export function isProprietaryProviderId(providerId: number): boolean {
  return providerId === PROPRIETARY_PROVIDER_ID;
}

export function findProprietaryGameByName(gameName: string): ProprietaryGame | undefined {
  const normalized = gameName.toLowerCase().trim();
  return PROPRIETARY_GAMES.find(
    (g) =>
      g.nome.toLowerCase() === normalized ||
      g.game_code.toLowerCase() === normalized
  );
}

export function findProprietaryGameBySlug(gameSlug: string): ProprietaryGame | undefined {
  const normalized = gameSlug.toLowerCase().trim();
  return PROPRIETARY_GAMES.find(
    (g) =>
      g.game_code.toLowerCase() === normalized ||
      g.nome
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') === normalized
  );
}
