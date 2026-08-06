import type { CopyByLanguage } from './types';

export type CommonCopy = {
  loading: string;
  redirecting: string;
  back: string;
  yes: string;
  no: string;
  play: string;
  playUpper: string;
  opening: string;
  converting: string;
  closeSearch: string;
  previousBanner: string;
  nextBanner: string;
  goToBanner: (index: number) => string;
  banner: string;
  closePopup: string;
  closeBanner: string;
  promotion: string;
  openingSupport: string;
  loadingWinners: string;
  noWinners: string;
  noRecords: string;
  version: string;
  date: string;
  underConstruction: string;
  noImage: string;
  search: string;
  all: string;
  seeAll: string;
  tryAgain: string;
  loadMore: string;
  showingRecords: (from: number, to: number, total: number) => string;
  record: string;
  records: string;
};

export const COMMON_COPY: CopyByLanguage<CommonCopy> = {
  pt: {
    loading: 'Carregando...',
    redirecting: 'Redirecionando...',
    back: 'Voltar',
    yes: 'Sim',
    no: 'Não',
    play: 'Jogar',
    playUpper: 'JOGAR',
    opening: 'Abrindo...',
    converting: 'Convertendo...',
    closeSearch: 'Fechar pesquisa',
    previousBanner: 'Banner anterior',
    nextBanner: 'Próximo banner',
    goToBanner: (index) => `Ir para banner ${index}`,
    banner: 'Banner',
    closePopup: 'Fechar popup',
    closeBanner: 'Fechar banner',
    promotion: 'Promoção',
    openingSupport: 'Abrindo suporte...',
    loadingWinners: 'Carregando ganhadores...',
    noWinners: 'Nenhum ganhador encontrado',
    noRecords: 'Nenhum registro encontrado',
    version: 'Versão:',
    date: 'Data:',
    underConstruction: 'Em construção',
    noImage: 'Sem imagem',
    search: 'Pesquisar',
    all: 'Todos',
    seeAll: 'Ver Tudo',
    tryAgain: 'Tentar novamente',
    loadMore: 'Carregar mais',
    showingRecords: (from, to, total) =>
      `Exibindo ${from} a ${to} de ${total} ${total === 1 ? 'registro' : 'registros'}`,
    record: 'registro',
    records: 'registros',
  },
  en: {
    loading: 'Loading...',
    redirecting: 'Redirecting...',
    back: 'Back',
    yes: 'Yes',
    no: 'No',
    play: 'Play',
    playUpper: 'PLAY',
    opening: 'Opening...',
    converting: 'Converting...',
    closeSearch: 'Close search',
    previousBanner: 'Previous banner',
    nextBanner: 'Next banner',
    goToBanner: (index) => `Go to banner ${index}`,
    banner: 'Banner',
    closePopup: 'Close popup',
    closeBanner: 'Close banner',
    promotion: 'Promotion',
    openingSupport: 'Opening support...',
    loadingWinners: 'Loading winners...',
    noWinners: 'No winners found',
    noRecords: 'No records found',
    version: 'Version:',
    date: 'Date:',
    underConstruction: 'Under construction',
    noImage: 'No image',
    search: 'Search',
    all: 'All',
    seeAll: 'See All',
    tryAgain: 'Try again',
    loadMore: 'Load more',
    showingRecords: (from, to, total) =>
      `Showing ${from} to ${to} of ${total} ${total === 1 ? 'record' : 'records'}`,
    record: 'record',
    records: 'records',
  },
  es: {
    loading: 'Cargando...',
    redirecting: 'Redirigiendo...',
    back: 'Volver',
    yes: 'Sí',
    no: 'No',
    play: 'Jugar',
    playUpper: 'JUGAR',
    opening: 'Abriendo...',
    converting: 'Convirtiendo...',
    closeSearch: 'Cerrar búsqueda',
    previousBanner: 'Banner anterior',
    nextBanner: 'Siguiente banner',
    goToBanner: (index) => `Ir al banner ${index}`,
    banner: 'Banner',
    closePopup: 'Cerrar popup',
    closeBanner: 'Cerrar banner',
    promotion: 'Promoción',
    openingSupport: 'Abriendo soporte...',
    loadingWinners: 'Cargando ganadores...',
    noWinners: 'Ningún ganador encontrado',
    noRecords: 'Ningún registro encontrado',
    version: 'Versión:',
    date: 'Fecha:',
    underConstruction: 'En construcción',
    noImage: 'Sin imagen',
    search: 'Buscar',
    all: 'Todos',
    seeAll: 'Ver Todo',
    tryAgain: 'Intentar de nuevo',
    loadMore: 'Cargar más',
    showingRecords: (from, to, total) =>
      `Mostrando ${from} a ${to} de ${total} ${total === 1 ? 'registro' : 'registros'}`,
    record: 'registro',
    records: 'registros',
  },
};
