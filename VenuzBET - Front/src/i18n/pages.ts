import type { CopyByLanguage } from './types';

export type VipCopy = {
  heroTitle: string;
  heroSubtitle: string;
  playNow: string;
  currentLevel: string;
  totalDeposited: string;
  cashback: string;
  progressTo: (level: string) => string;
  remaining: (amount: string) => string;
  maxLevel: string;
  classification: string;
  previousLevels: string;
  nextLevels: string;
  current: string;
  cashbackLabel: string;
  levelsAlt: string;
};

export const VIP_COPY: CopyByLanguage<VipCopy> = {
  pt: {
    heroTitle: 'Assuma o trono e conquiste benefícios exclusivos!',
    heroSubtitle:
      'Suba de nível VIP depositando e desbloqueie cashback, bônus e vantagens exclusivas.',
    playNow: 'JOGAR AGORA',
    currentLevel: 'Seu nível atual',
    totalDeposited: 'Total depositado:',
    cashback: 'Cashback:',
    progressTo: (level) => `Progresso para ${level}`,
    remaining: (amount) => `Faltam ${amount}`,
    maxLevel: 'Você atingiu o nível máximo — Diamante 3!',
    classification: 'Classificação VIP',
    previousLevels: 'Níveis anteriores',
    nextLevels: 'Próximos níveis',
    current: 'ATUAL',
    cashbackLabel: 'cashback',
    levelsAlt: 'Níveis VIP',
  },
  en: {
    heroTitle: 'Take the throne and unlock exclusive benefits!',
    heroSubtitle:
      'Level up your VIP status by depositing and unlock cashback, bonuses and exclusive perks.',
    playNow: 'PLAY NOW',
    currentLevel: 'Your current level',
    totalDeposited: 'Total deposited:',
    cashback: 'Cashback:',
    progressTo: (level) => `Progress to ${level}`,
    remaining: (amount) => `${amount} remaining`,
    maxLevel: 'You reached the maximum level — Diamond 3!',
    classification: 'VIP Classification',
    previousLevels: 'Previous levels',
    nextLevels: 'Next levels',
    current: 'CURRENT',
    cashbackLabel: 'cashback',
    levelsAlt: 'VIP Levels',
  },
  es: {
    heroTitle: '¡Toma el trono y conquista beneficios exclusivos!',
    heroSubtitle:
      'Sube de nivel VIP depositando y desbloquea cashback, bonos y ventajas exclusivas.',
    playNow: 'JUGAR AHORA',
    currentLevel: 'Tu nivel actual',
    totalDeposited: 'Total depositado:',
    cashback: 'Cashback:',
    progressTo: (level) => `Progreso hacia ${level}`,
    remaining: (amount) => `Faltan ${amount}`,
    maxLevel: '¡Alcanzaste el nivel máximo — Diamante 3!',
    classification: 'Clasificación VIP',
    previousLevels: 'Niveles anteriores',
    nextLevels: 'Próximos niveles',
    current: 'ACTUAL',
    cashbackLabel: 'cashback',
    levelsAlt: 'Niveles VIP',
  },
};

export type ReferralCopy = {
  headline: string;
  description: string;
  copyLink: string;
  linkCopied: string;
  qualifiedReferrals: string;
  linkRegistrations: string;
  totalEarnings: string;
  programDisabled: string;
  loading: string;
  loginRequired: string;
};

export const REFERRAL_COPY: CopyByLanguage<ReferralCopy> = {
  pt: {
    headline: 'Indique amigos e ganhe recompensas',
    description:
      'Compartilhe seu link exclusivo. Quando seus indicados se registrarem e cumprirem os requisitos, você ganha comissões.',
    copyLink: 'Copiar link',
    linkCopied: 'Link Copiado!',
    qualifiedReferrals: 'Indicações qualificadas',
    linkRegistrations: 'Registros ao seu link',
    totalEarnings: 'Seus ganhos totais',
    programDisabled: 'Programa de indicações temporariamente indisponível.',
    loading: 'Carregando indicações...',
    loginRequired: 'Você precisa estar logado para acessar indicações.',
  },
  en: {
    headline: 'Refer friends and earn rewards',
    description:
      'Share your exclusive link. When your referrals sign up and meet the requirements, you earn commissions.',
    copyLink: 'Copy link',
    linkCopied: 'Link Copied!',
    qualifiedReferrals: 'Qualified referrals',
    linkRegistrations: 'Registrations via your link',
    totalEarnings: 'Your total earnings',
    programDisabled: 'Referral program temporarily unavailable.',
    loading: 'Loading referrals...',
    loginRequired: 'You must be signed in to access referrals.',
  },
  es: {
    headline: 'Invita amigos y gana recompensas',
    description:
      'Comparte tu enlace exclusivo. Cuando tus referidos se registren y cumplan los requisitos, ganas comisiones.',
    copyLink: 'Copiar enlace',
    linkCopied: '¡Enlace copiado!',
    qualifiedReferrals: 'Referidos calificados',
    linkRegistrations: 'Registros con tu enlace',
    totalEarnings: 'Tus ganancias totales',
    programDisabled: 'Programa de referidos temporalmente no disponible.',
    loading: 'Cargando referidos...',
    loginRequired: 'Debes iniciar sesión para acceder a referidos.',
  },
};

export type PromotionsCopy = {
  loading: string;
  empty: string;
  loadingDetail: string;
  notFound: string;
  loadError: string;
};

export const PROMOTIONS_COPY: CopyByLanguage<PromotionsCopy> = {
  pt: {
    loading: 'Carregando promoções...',
    empty: 'Sem promoções no momento',
    loadingDetail: 'Carregando promoção...',
    notFound: 'Promoção não encontrada',
    loadError: 'Erro ao carregar a promoção',
  },
  en: {
    loading: 'Loading promotions...',
    empty: 'No promotions at the moment',
    loadingDetail: 'Loading promotion...',
    notFound: 'Promotion not found',
    loadError: 'Error loading promotion',
  },
  es: {
    loading: 'Cargando promociones...',
    empty: 'Sin promociones por el momento',
    loadingDetail: 'Cargando promoción...',
    notFound: 'Promoción no encontrada',
    loadError: 'Error al cargar la promoción',
  },
};

export type HomeCopy = {
  sports: string;
  liveBets: string;
  casino: string;
  liveCasino: string;
  recommended: string;
  recommendedBanner: string;
  mostPlayedWeek: string;
  pgGames: string;
  providers: string;
  studios: string;
  originals: string;
  quickNavAria: string;
  playNow: string;
  lastWinnersToday: string;
  minutesAgo: (minutes: number) => string;
};

export const HOME_COPY: CopyByLanguage<HomeCopy> = {
  pt: {
    sports: 'Esportes',
    liveBets: 'Apostas Ao Vivo',
    casino: 'Cassino',
    liveCasino: 'Cassino Ao Vivo',
    recommended: 'Recomendados',
    recommendedBanner: 'Banner recomendado',
    mostPlayedWeek: '+ Jogados da Semana',
    pgGames: 'Jogos da PG',
    providers: 'Provedoras',
    studios: 'Estúdios',
    originals: 'Originais',
    quickNavAria: 'Atalhos rápidos',
    playNow: 'Jogar agora',
    lastWinnersToday: 'Últimos Ganhadores de Hoje',
    minutesAgo: (minutes) => `Há ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`,
  },
  en: {
    sports: 'Sports',
    liveBets: 'Live Betting',
    casino: 'Casino',
    liveCasino: 'Live Casino',
    recommended: 'Recommended',
    recommendedBanner: 'Recommended banner',
    mostPlayedWeek: 'Most Played This Week',
    pgGames: 'PG Games',
    providers: 'Providers',
    studios: 'Studios',
    originals: 'Originals',
    quickNavAria: 'Quick shortcuts',
    playNow: 'Play now',
    lastWinnersToday: "Today's Latest Winners",
    minutesAgo: (minutes) => `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`,
  },
  es: {
    sports: 'Deportes',
    liveBets: 'Apuestas en Vivo',
    casino: 'Casino',
    liveCasino: 'Casino en Vivo',
    recommended: 'Recomendados',
    recommendedBanner: 'Banner recomendado',
    mostPlayedWeek: '+ Jugados de la Semana',
    pgGames: 'Juegos PG',
    providers: 'Proveedoras',
    studios: 'Estudios',
    originals: 'Originales',
    quickNavAria: 'Accesos rápidos',
    playNow: 'Jugar ahora',
    lastWinnersToday: 'Últimos Ganadores de Hoy',
    minutesAgo: (minutes) => `Hace ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`,
  },
};

export type LegalPageCopy = {
  terms: string;
  bettingTerms: string;
  privacy: string;
  kyc: string;
  responsibleGaming: string;
  aml: string;
};

export const LEGAL_PAGE_COPY: CopyByLanguage<LegalPageCopy> = {
  pt: {
    terms: 'Termos & Condições',
    bettingTerms: 'Termos de Apostas',
    privacy: 'Políticas de Privacidade',
    kyc: 'Política KYC',
    responsibleGaming: 'Política de Jogo Responsável',
    aml: 'Política AML',
  },
  en: {
    terms: 'Terms & Conditions',
    bettingTerms: 'Betting Terms',
    privacy: 'Privacy Policy',
    kyc: 'KYC Policy',
    responsibleGaming: 'Responsible Gaming Policy',
    aml: 'AML Policy',
  },
  es: {
    terms: 'Términos y Condiciones',
    bettingTerms: 'Términos de Apuestas',
    privacy: 'Política de Privacidad',
    kyc: 'Política KYC',
    responsibleGaming: 'Política de Juego Responsable',
    aml: 'Política AML',
  },
};

export type MobileAppCopy = {
  title: string;
  subtitle: string;
  iphone: string;
  android: string;
  desktop: string;
  install: string;
  installAppTitle: string;
  installAppSubtitle: string;
  howToInstall: string;
  desktopIntro: string;
  chromeInstallHeading: string;
  installImageAlt: string;
  iphoneSteps: string[];
  androidSteps: string[];
  chromeSteps: string[];
};

export const MOBILE_APP_COPY: CopyByLanguage<MobileAppCopy> = {
  pt: {
    title: 'Aplicativo Móvel',
    subtitle: 'Instale nosso app e tenha a melhor experiência no seu celular',
    iphone: 'iPhone (Safari)',
    android: 'Android (Chrome)',
    desktop: 'Computador',
    install: 'Instalar',
    installAppTitle: 'Instale o app',
    installAppSubtitle:
      'Adicione o site à tela inicial do celular para acessar como app, sem precisar ir à loja de aplicativos.',
    howToInstall: 'Como instalar?',
    desktopIntro:
      'Nosso site está disponível como um aplicativo. Você pode instalá-lo no seu computador em poucos segundos, sem precisar ir na loja de aplicativos!',
    chromeInstallHeading: 'Para instalar este app no seu computador usando o navegador Chrome:',
    installImageAlt: 'Como instalar',
    iphoneSteps: [
      'Abra o site no Safari.',
      'Toque em Compartilhar (ícone de exportar na barra inferior).',
      'Selecione "Adicionar à Tela de Início".',
      'Confirme em Adicionar.',
    ],
    androidSteps: [
      'Abra o site no Chrome.',
      'Toque no menu ⋮ no canto superior direito.',
      'Selecione "Instalar aplicativo" ou "Adicionar à tela inicial".',
      'Confirme a instalação.',
    ],
    chromeSteps: [
      'Clique no ícone de instalação que aparece no canto direito da barra de endereço.',
      'Se não aparecer, clique no menu ⋮ no canto superior direito e procure por "Instalar aplicativo".',
      'Confirme clicando em "Instalar".',
      'O app será adicionado como um programa no seu computador.',
    ],
  },
  en: {
    title: 'Mobile App',
    subtitle: 'Install our app for the best experience on your phone',
    iphone: 'iPhone (Safari)',
    android: 'Android (Chrome)',
    desktop: 'Desktop',
    install: 'Install',
    installAppTitle: 'Install the app',
    installAppSubtitle:
      'Add the site to your phone home screen to use it like an app, without visiting the app store.',
    howToInstall: 'How to install?',
    desktopIntro:
      'Our site is available as an app. You can install it on your computer in seconds, without visiting the app store!',
    chromeInstallHeading: 'To install this app on your computer using Chrome:',
    installImageAlt: 'How to install',
    iphoneSteps: [
      'Open the site in Safari.',
      'Tap Share (the export icon in the bottom bar).',
      'Select "Add to Home Screen".',
      'Confirm by tapping Add.',
    ],
    androidSteps: [
      'Open the site in Chrome.',
      'Tap the ⋮ menu in the top-right corner.',
      'Select "Install app" or "Add to Home screen".',
      'Confirm the installation.',
    ],
    chromeSteps: [
      'Click the install icon on the right side of the address bar.',
      'If it does not appear, click the ⋮ menu in the top-right and look for "Install app".',
      'Confirm by clicking "Install".',
      'The app will be added as a program on your computer.',
    ],
  },
  es: {
    title: 'Aplicación Móvil',
    subtitle: 'Instala nuestra app y disfruta la mejor experiencia en tu celular',
    iphone: 'iPhone (Safari)',
    android: 'Android (Chrome)',
    desktop: 'Computadora',
    install: 'Instalar',
    installAppTitle: 'Instala la app',
    installAppSubtitle:
      'Agrega el sitio a la pantalla de inicio del celular para usarlo como app, sin ir a la tienda de aplicaciones.',
    howToInstall: '¿Cómo instalar?',
    desktopIntro:
      'Nuestro sitio está disponible como una aplicación. ¡Puedes instalarla en tu computadora en pocos segundos, sin ir a la tienda de aplicaciones!',
    chromeInstallHeading: 'Para instalar esta app en tu computadora usando Chrome:',
    installImageAlt: 'Cómo instalar',
    iphoneSteps: [
      'Abre el sitio en Safari.',
      'Toca Compartir (el ícono de exportar en la barra inferior).',
      'Selecciona "Añadir a pantalla de inicio".',
      'Confirma en Añadir.',
    ],
    androidSteps: [
      'Abre el sitio en Chrome.',
      'Toca el menú ⋮ en la esquina superior derecha.',
      'Selecciona "Instalar aplicación" o "Añadir a la pantalla de inicio".',
      'Confirma la instalación.',
    ],
    chromeSteps: [
      'Haz clic en el ícono de instalación que aparece a la derecha de la barra de direcciones.',
      'Si no aparece, haz clic en el menú ⋮ arriba a la derecha y busca "Instalar aplicación".',
      'Confirma haciendo clic en "Instalar".',
      'La app se agregará como un programa en tu computadora.',
    ],
  },
};

export type FreeBonusCopy = {
  available: string;
  finished: string;
  inUse: string;
};

export const FREE_BONUS_COPY: CopyByLanguage<FreeBonusCopy> = {
  pt: { available: 'Disponível', finished: 'Finalizado', inUse: 'Em uso' },
  en: { available: 'Available', finished: 'Finished', inUse: 'In use' },
  es: { available: 'Disponible', finished: 'Finalizado', inUse: 'En uso' },
};

export type PrizeWheelCopy = {
  spinError: string;
  alreadySpun: string;
  notAvailable: string;
  loginRequired: string;
  winMessage: (prize: string) => string;
  loseMessage: string;
  wheelDisabled: string;
  noSegments: string;
  cooldownActive: string;
  usageLimitReached: string;
  userLimitReached: string;
  invalidSegment: string;
  spinFailed: string;
  wonSpins: (spins: string, game: string) => string;
  wonSpinsDeposit: (spins: string, minDeposit: string, coupon: string) => string;
  wonSpinsAvailable: (spins: string) => string;
  missingCouponId: string;
  gameNotIdentified: (game: string) => string;
  unknownGame: string;
  grantFailed: string;
  invalidRounds: string;
  altDaily: string;
  altPrize: string;
  altWheel: string;
  altWidget: string;
};

export const PRIZE_WHEEL_COPY: CopyByLanguage<PrizeWheelCopy> = {
  pt: {
    spinError: 'Erro ao girar a roleta. Tente novamente.',
    alreadySpun: 'Você já girou a roleta hoje.',
    notAvailable: 'Roleta de prêmios indisponível no momento.',
    loginRequired: 'Faça login para girar a roleta.',
    winMessage: (prize) => `Parabéns! Você ganhou: ${prize}`,
    loseMessage: 'Não foi dessa vez. Tente novamente amanhã!',
    wheelDisabled: 'A roleta não está disponível no momento.',
    noSegments: 'A roleta ainda não foi configurada.',
    cooldownActive: 'Você já girou a roleta. Aguarde para girar novamente.',
    usageLimitReached: 'Este prêmio atingiu o limite de uso.',
    userLimitReached: 'Você já utilizou este prêmio.',
    invalidSegment: 'Erro ao processar o prêmio. Tente novamente.',
    spinFailed: 'Não foi possível girar a roleta.',
    wonSpins: (spins, game) => `${spins} em ${game}`,
    wonSpinsDeposit: (spins, minDeposit, coupon) =>
      `Você ganhou ${spins}! Deposite no mínimo R$ ${minDeposit} com o cupom ${coupon} para ativar.`,
    wonSpinsAvailable: (spins) => `Parabéns! Você ganhou ${spins}! As rodadas já estão disponíveis.`,
    missingCouponId: 'Prêmio registrado, mas falta identificador do cupom para ativar as rodadas.',
    gameNotIdentified: (game) => `Não foi possível identificar o jogo "${game}" na PlayFivers.`,
    unknownGame: 'desconhecido',
    grantFailed:
      'Prêmio sorteado, mas não foi possível enviar as rodadas grátis. Verifique em Rodadas Grátis na carteira.',
    invalidRounds: 'Quantidade de rodadas do prêmio inválida.',
    altDaily: 'Roleta Diária de Prêmios',
    altPrize: 'Seu Prêmio',
    altWheel: 'Roleta Urano',
    altWidget: 'Roleta de prêmios',
  },
  en: {
    spinError: 'Error spinning the wheel. Please try again.',
    alreadySpun: 'You already spun the wheel today.',
    notAvailable: 'Prize wheel unavailable at the moment.',
    loginRequired: 'Sign in to spin the wheel.',
    winMessage: (prize) => `Congratulations! You won: ${prize}`,
    loseMessage: 'Not this time. Try again tomorrow!',
    wheelDisabled: 'The wheel is not available at the moment.',
    noSegments: 'The wheel has not been configured yet.',
    cooldownActive: 'You already spun the wheel. Wait to spin again.',
    usageLimitReached: 'This prize has reached its usage limit.',
    userLimitReached: 'You have already used this prize.',
    invalidSegment: 'Error processing prize. Please try again.',
    spinFailed: 'Could not spin the wheel.',
    wonSpins: (spins, game) => `${spins} on ${game}`,
    wonSpinsDeposit: (spins, minDeposit, coupon) =>
      `You won ${spins}! Deposit at least R$ ${minDeposit} with coupon ${coupon} to activate.`,
    wonSpinsAvailable: (spins) => `Congratulations! You won ${spins}! The spins are now available.`,
    missingCouponId: 'Prize registered, but the coupon identifier is missing to activate the spins.',
    gameNotIdentified: (game) => `Could not identify the game "${game}" on PlayFivers.`,
    unknownGame: 'unknown',
    grantFailed:
      'Prize drawn, but free spins could not be sent. Check Free Spins in your wallet.',
    invalidRounds: 'Invalid prize spin quantity.',
    altDaily: 'Daily Prize Wheel',
    altPrize: 'Your Prize',
    altWheel: 'Urano Wheel',
    altWidget: 'Prize wheel',
  },
  es: {
    spinError: 'Error al girar la ruleta. Inténtalo de nuevo.',
    alreadySpun: 'Ya giraste la ruleta hoy.',
    notAvailable: 'Ruleta de premios no disponible en este momento.',
    loginRequired: 'Inicia sesión para girar la ruleta.',
    winMessage: (prize) => `¡Felicitaciones! Ganaste: ${prize}`,
    loseMessage: 'No fue esta vez. ¡Inténtalo mañana!',
    wheelDisabled: 'La ruleta no está disponible en este momento.',
    noSegments: 'La ruleta aún no fue configurada.',
    cooldownActive: 'Ya giraste la ruleta. Espera para girar de nuevo.',
    usageLimitReached: 'Este premio alcanzó el límite de uso.',
    userLimitReached: 'Ya utilizaste este premio.',
    invalidSegment: 'Error al procesar el premio. Inténtalo de nuevo.',
    spinFailed: 'No fue posible girar la ruleta.',
    wonSpins: (spins, game) => `${spins} en ${game}`,
    wonSpinsDeposit: (spins, minDeposit, coupon) =>
      `¡Ganaste ${spins}! Deposita mínimo R$ ${minDeposit} con el cupón ${coupon} para activar.`,
    wonSpinsAvailable: (spins) => `¡Felicitaciones! Ganaste ${spins}! Los giros ya están disponibles.`,
    missingCouponId: 'Premio registrado, pero falta el identificador del cupón para activar los giros.',
    gameNotIdentified: (game) => `No fue posible identificar el juego "${game}" en PlayFivers.`,
    unknownGame: 'desconocido',
    grantFailed:
      'Premio sorteado, pero no fue posible enviar los giros gratis. Revisa Giros Gratis en tu billetera.',
    invalidRounds: 'Cantidad de giros del premio inválida.',
    altDaily: 'Ruleta Diaria de Premios',
    altPrize: 'Tu Premio',
    altWheel: 'Ruleta Urano',
    altWidget: 'Ruleta de premios',
  },
};
