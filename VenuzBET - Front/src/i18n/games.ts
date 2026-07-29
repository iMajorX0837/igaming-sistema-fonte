import type { CopyByLanguage } from './types';

export type GamesCopy = {
  loadingGame: string;
  gameNotFound: string;
  gameLoadError: string;
  loginToPlay: string;
  depositRequired: string;
  deposit: string;
  fullscreen: string;
  exitFullscreen: string;
  closeGame: string;
  gameLoadFailed: string;
  sessionExpired: string;
  userDataFetchError: string;
  launchGameStatusError: (status: number) => string;
  launchGameError: string;
  searchPlaceholder: string;
  searchGames: string;
  loadingGames: string;
  noGamesFound: string;
  showingGames: (count: number, total?: number) => string;
  game: string;
  games: string;
  gamesFrom: string;
  loadGamesError: string;
  noActiveGames: string;
  providerNotFound: string;
  providersTitle: string;
  loadingProviders: string;
  loadProvidersError: string;
  noProvidersFound: string;
  categories: {
    all: string;
    slots: string;
    bonus: string;
    new: string;
    tournament: string;
    mostPlayed: string;
    liveCasino: string;
    tableGames: string;
    crash: string;
  };
};

export const GAMES_COPY: CopyByLanguage<GamesCopy> = {
  pt: {
    loadingGame: 'Carregando jogo...',
    gameNotFound: 'Jogo não encontrado',
    gameLoadError: 'Erro ao carregar o jogo',
    loginToPlay: 'Você precisa entrar para jogar',
    depositRequired: 'Depósito necessário',
    deposit: 'Depositar',
    fullscreen: 'Tela cheia',
    exitFullscreen: 'Sair da tela cheia',
    closeGame: 'Fechar jogo',
    gameLoadFailed: 'Erro ao carregar jogo',
    sessionExpired: 'Sessão expirada. Faça login novamente.',
    userDataFetchError: 'Erro ao buscar dados do usuário',
    launchGameStatusError: (status) => `Erro ao lançar jogo (${status})`,
    launchGameError: 'Erro ao lançar jogo',
    searchPlaceholder: 'Pesquise um jogo de cassino...',
    searchGames: 'Pesquisar jogos',
    loadingGames: 'Carregando jogos...',
    noGamesFound: 'Nenhum jogo encontrado',
    showingGames: (count, total) =>
      total && total > count ? `Mostrando ${count} de ${total}` : `Mostrando ${count}`,
    game: 'jogo',
    games: 'jogos',
    gamesFrom: 'Jogos de',
    loadGamesError: 'Erro ao carregar jogos',
    noActiveGames: 'Não possui jogos ativos',
    providerNotFound: 'Provedor não encontrado',
    providersTitle: 'Todos os provedores',
    loadingProviders: 'Carregando provedores...',
    loadProvidersError: 'Erro ao carregar provedores. Tente novamente.',
    noProvidersFound: 'Nenhum provedor encontrado',
    categories: {
      all: 'Todos',
      slots: 'Jogos de slots',
      bonus: 'Jogos com bônus',
      new: 'Novos jogos',
      tournament: 'Jogos de torneio',
      mostPlayed: 'Mais jogados da semana',
      liveCasino: 'Cassino Ao Vivo',
      tableGames: 'Jogos de Mesa',
      crash: 'Crash Games',
    },
  },
  en: {
    loadingGame: 'Loading game...',
    gameNotFound: 'Game not found',
    gameLoadError: 'Error loading game',
    loginToPlay: 'You need to sign in to play',
    depositRequired: 'Deposit required',
    deposit: 'Deposit',
    fullscreen: 'Fullscreen',
    exitFullscreen: 'Exit fullscreen',
    closeGame: 'Close game',
    gameLoadFailed: 'Failed to load game',
    sessionExpired: 'Session expired. Please sign in again.',
    userDataFetchError: 'Error fetching user data',
    launchGameStatusError: (status) => `Error launching game (${status})`,
    launchGameError: 'Error launching game',
    searchPlaceholder: 'Search for a casino game...',
    searchGames: 'Search games',
    loadingGames: 'Loading games...',
    noGamesFound: 'No games found',
    showingGames: (count, total) =>
      total && total > count ? `Showing ${count} of ${total}` : `Showing ${count}`,
    game: 'game',
    games: 'games',
    gamesFrom: 'Games from',
    loadGamesError: 'Error loading games',
    noActiveGames: 'No active games available',
    providerNotFound: 'Provider not found',
    providersTitle: 'All providers',
    loadingProviders: 'Loading providers...',
    loadProvidersError: 'Error loading providers. Please try again.',
    noProvidersFound: 'No providers found',
    categories: {
      all: 'All',
      slots: 'Slot games',
      bonus: 'Bonus games',
      new: 'New games',
      tournament: 'Tournament games',
      mostPlayed: 'Most played this week',
      liveCasino: 'Live Casino',
      tableGames: 'Table Games',
      crash: 'Crash Games',
    },
  },
  es: {
    loadingGame: 'Cargando juego...',
    gameNotFound: 'Juego no encontrado',
    gameLoadError: 'Error al cargar el juego',
    loginToPlay: 'Debes iniciar sesión para jugar',
    depositRequired: 'Depósito necesario',
    deposit: 'Depositar',
    fullscreen: 'Pantalla completa',
    exitFullscreen: 'Salir de pantalla completa',
    closeGame: 'Cerrar juego',
    gameLoadFailed: 'Error al cargar juego',
    sessionExpired: 'Sesión expirada. Inicia sesión de nuevo.',
    userDataFetchError: 'Error al buscar datos del usuario',
    launchGameStatusError: (status) => `Error al lanzar juego (${status})`,
    launchGameError: 'Error al lanzar juego',
    searchPlaceholder: 'Busca un juego de casino...',
    searchGames: 'Buscar juegos',
    loadingGames: 'Cargando juegos...',
    noGamesFound: 'Ningún juego encontrado',
    showingGames: (count, total) =>
      total && total > count ? `Mostrando ${count} de ${total}` : `Mostrando ${count}`,
    game: 'juego',
    games: 'juegos',
    gamesFrom: 'Juegos de',
    loadGamesError: 'Error al cargar juegos',
    noActiveGames: 'No hay juegos activos',
    providerNotFound: 'Proveedor no encontrado',
    providersTitle: 'Todos los proveedores',
    loadingProviders: 'Cargando proveedores...',
    loadProvidersError: 'Error al cargar proveedores. Inténtalo de nuevo.',
    noProvidersFound: 'Ningún proveedor encontrado',
    categories: {
      all: 'Todos',
      slots: 'Juegos de slots',
      bonus: 'Juegos con bono',
      new: 'Juegos nuevos',
      tournament: 'Juegos de torneo',
      mostPlayed: 'Más jugados de la semana',
      liveCasino: 'Casino en Vivo',
      tableGames: 'Juegos de Mesa',
      crash: 'Crash Games',
    },
  },
};
