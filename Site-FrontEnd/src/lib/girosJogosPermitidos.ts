export interface JogoGirosPermitido {
  nome: string;
  slug: string;
  girosPadrao: number;
  provider: string;
  /** game_code aceito pelo endpoint PlayFivers free_bonus (pode diferir do catálogo de launch) */
  freeBonusGameCode: string;
}

export const GIROS_JOGOS_PERMITIDOS: readonly JogoGirosPermitido[] = [
  { nome: 'Gates of Olympus', slug: 'gates-of-olympus', girosPadrao: 85, provider: 'pragmatic', freeBonusGameCode: 'vs20olympx' },
  { nome: 'Starlight Princess', slug: 'starlight-princess', girosPadrao: 70, provider: 'pragmatic', freeBonusGameCode: 'vs20starlight' },
  { nome: 'Sweet Bonanza', slug: 'sweet-bonanza', girosPadrao: 95, provider: 'pragmatic', freeBonusGameCode: 'vs20fruitswx' },
  { nome: 'Sugar Rush', slug: 'sugar-rush', girosPadrao: 65, provider: 'pragmatic', freeBonusGameCode: 'vs20sugarrushx' },
  { nome: 'Starlight Princess 1000', slug: 'starlight-princess-1000', girosPadrao: 55, provider: 'pragmatic', freeBonusGameCode: 'vs20starlightx' },
  { nome: 'Gates of Olympus 1000', slug: 'gates-of-olympus-1000', girosPadrao: 95, provider: 'pragmatic', freeBonusGameCode: 'vs20olympx' },
  { nome: 'Sweet Bonanza 1000', slug: 'sweet-bonanza-1000', girosPadrao: 100, provider: 'pragmatic', freeBonusGameCode: 'vs20fruitswx' },
  { nome: 'Sugar Rush 1000', slug: 'sugar-rush-1000', girosPadrao: 85, provider: 'pragmatic', freeBonusGameCode: 'vs20sugarrushx' },
  { nome: 'O Vira Lata Caramelo', slug: 'o-vira-lata-caramelo', girosPadrao: 65, provider: 'pragmatic', freeBonusGameCode: '' },
] as const;

export function isJogoGirosPermitido(slug: string): boolean {
  return GIROS_JOGOS_PERMITIDOS.some((jogo) => jogo.slug === slug);
}

export function getJogoGirosBySlug(slug: string): JogoGirosPermitido | undefined {
  return GIROS_JOGOS_PERMITIDOS.find((jogo) => jogo.slug === slug);
}

export function getFreeBonusGameCode(slug: string): string | undefined {
  const jogo = getJogoGirosBySlug(slug);
  const code = jogo?.freeBonusGameCode?.trim();
  return code || undefined;
}
