/** Carteira PlayFivers dos jogos originais Spribe (Mines, Plinko, etc.). */
export const PLAYFIVERS_SPRIBE_WALLET = 'Carteira Oficial (Spribe)';

/** Aviator oficial da Spribe — oculto porque a casa usa o Aviator próprio. */
export const OFFICIAL_SPRIBE_AVIATOR_GAME_CODE = 'SPB_aviator';

interface SpribeWalletProvider {
  status: number;
  wallet: { name: string };
}

export function isPlayFiverSpribeProvider(prov: SpribeWalletProvider): boolean {
  return prov.status === 1 && prov.wallet.name === PLAYFIVERS_SPRIBE_WALLET;
}

export function isOfficialSpribeAviatorGameCode(gameCode: string): boolean {
  return String(gameCode || '').trim() === OFFICIAL_SPRIBE_AVIATOR_GAME_CODE;
}

/** Jogos OFICIAL - SPRIBE (SPB_*) exigem game_original=true na PlayFivers. */
export function isOfficialSpribeGameCode(gameCode: string): boolean {
  return String(gameCode || '').trim().toUpperCase().startsWith('SPB_');
}
