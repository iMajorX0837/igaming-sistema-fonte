import type { CopyByLanguage } from './types';

export type NavigationCopy = {
  mainNavAria: string;
  openCloseMenu: string;
  menu: string;
  sports: string;
  casino: string;
  casinoHome: string;
  live: string;
  aviator: string;
  aviatorOpen: string;
  notFoundTitle: string;
  notFoundSubtitle: string;
  notFoundBack: string;
  openPrizeWheel: string;
  closePrizeWheel: string;
  spinPrizeWheel: string;
  spinningPrizeWheel: string;
};

export const NAVIGATION_COPY: CopyByLanguage<NavigationCopy> = {
  pt: {
    mainNavAria: 'Navegação principal',
    openCloseMenu: 'Abrir ou fechar menu',
    menu: 'Menu',
    sports: 'Esporte',
    casino: 'Cassino',
    casinoHome: 'Cassino — início',
    live: 'Ao Vivo',
    aviator: 'Aviator',
    aviatorOpen: 'Abrir Aviator',
    notFoundTitle: 'Esta página não foi encontrada',
    notFoundSubtitle: 'ESTE LINK PODE ESTAR CORROMPIDO',
    notFoundBack: 'VOLTAR PARA PAGINA INICIAL',
    openPrizeWheel: 'Abrir roleta de prêmios',
    closePrizeWheel: 'Fechar roleta',
    spinPrizeWheel: 'Girar roleta',
    spinningPrizeWheel: 'Roleta girando',
  },
  en: {
    mainNavAria: 'Main navigation',
    openCloseMenu: 'Open or close menu',
    menu: 'Menu',
    sports: 'Sports',
    casino: 'Casino',
    casinoHome: 'Casino — home',
    live: 'Live',
    aviator: 'Aviator',
    aviatorOpen: 'Open Aviator',
    notFoundTitle: 'This page was not found',
    notFoundSubtitle: 'THIS LINK MAY BE CORRUPTED',
    notFoundBack: 'BACK TO HOME PAGE',
    openPrizeWheel: 'Open prize wheel',
    closePrizeWheel: 'Close wheel',
    spinPrizeWheel: 'Spin wheel',
    spinningPrizeWheel: 'Wheel spinning',
  },
  es: {
    mainNavAria: 'Navegación principal',
    openCloseMenu: 'Abrir o cerrar menú',
    menu: 'Menú',
    sports: 'Deportes',
    casino: 'Casino',
    casinoHome: 'Casino — inicio',
    live: 'En Vivo',
    aviator: 'Aviator',
    aviatorOpen: 'Abrir Aviator',
    notFoundTitle: 'Esta página no fue encontrada',
    notFoundSubtitle: 'ESTE ENLACE PUEDE ESTAR CORRUPTO',
    notFoundBack: 'VOLVER A LA PÁGINA INICIAL',
    openPrizeWheel: 'Abrir ruleta de premios',
    closePrizeWheel: 'Cerrar ruleta',
    spinPrizeWheel: 'Girar ruleta',
    spinningPrizeWheel: 'Ruleta girando',
  },
};
