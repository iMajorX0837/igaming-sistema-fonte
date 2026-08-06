import type { SidebarLanguage } from './sidebar';

export type HeaderCopy = {
  casino: string;
  sports: string;
  promotionsAria: string;
  login: string;
  register: string;
  registerShort: string;
  accountMenuAria: string;
  nextVip: string;
  maxVipLevel: string;
  myAccount: string;
  wallet: string;
  vipLevels: string;
  activateCoupon: string;
  referrals: string;
  promotions: string;
  appDownload: string;
  liveSupport: string;
  logout: string;
  collapseSidebar: string;
  expandSidebar: string;
  closeMenu: string;
};

export type FooterCopy = {
  rules: string;
  community: string;
  payment: string;
  terms: string;
  bettingTerms: string;
  privacy: string;
  kyc: string;
  responsibleGaming: string;
  aml: string;
  mobileApp: string;
  headline: string;
  summary: string;
  showMore: string;
  showLess: string;
  expandedTitle1: string;
  expandedP1: string;
  expandedTitle2: string;
  expandedP2: string;
  expandedTitle3: string;
  expandedP3: string;
  expandedTitle4: string;
  expandedP4: string;
  expandedTitle5: string;
  expandedP5: string;
};

export type HeaderFooterCopy = {
  header: HeaderCopy;
  footer: FooterCopy;
};

export type HeaderFooterCopyByLanguage = Record<SidebarLanguage, HeaderFooterCopy>;

export const DEFAULT_HEADER_FOOTER_COPY: HeaderFooterCopyByLanguage = {
  pt: {
    header: {
      casino: 'Cassino',
      sports: 'Esportes',
      promotionsAria: 'Promoções',
      login: 'Entrar',
      register: 'Cadastre-se',
      registerShort: 'Cadastrar',
      accountMenuAria: 'Menu da conta',
      nextVip: 'Próximo:',
      maxVipLevel: 'Nível máximo VIP',
      myAccount: 'Minha conta',
      wallet: 'Carteira',
      vipLevels: 'Níveis VIP',
      activateCoupon: 'Ativar cupom',
      referrals: 'Indicações',
      promotions: 'Promoções',
      appDownload: 'App Download',
      liveSupport: 'Suporte Ao Vivo',
      logout: 'Sair',
      collapseSidebar: 'Recolher menu lateral',
      expandSidebar: 'Expandir menu lateral',
      closeMenu: 'Fechar menu',
    },
    footer: {
      rules: 'Regras',
      community: 'Comunidade',
      payment: 'Pagamento',
      terms: 'Termos & Condições',
      bettingTerms: 'Termos de Apostas',
      privacy: 'Políticas de Privacidade',
      kyc: 'Política KYC',
      responsibleGaming: 'Política de Jogo Responsável',
      aml: 'Política AML',
      mobileApp: 'Aplicativo Móvel',
      headline: 'Cassino 24 horas 🎲 - Pix Instantâneo e Saque Rápido!',
      summary:
        'Aposte agora no Cassino dos Brasileiros com cashback garantido, bets ilimitadas 🎰 e mais de 1.000 jogos disponíveis para você se divertir. Aproveite promoções exclusivas, suporte 24h e total segurança nas suas apostas! 🍀',
      showMore: 'Ver mais',
      showLess: 'Ver menos',
      expandedTitle1: '🎰 Aposte onde a emoção não tem limites! - Pix Instantâneo, Suporte 24h e Saques Rápidos!',
      expandedP1:
        'Curta os melhores jogos de cassino virtual e esportes online. São mais de 1.000 jogos e milhares de opções de apostas em futebol, basquete, tênis, e-sports e muito mais!',
      expandedTitle2: '⚠️ Proibido para menores de 18 anos',
      expandedP2:
        'Este site é destinado exclusivamente a maiores de 18 anos. Menores de idade não devem fornecer informações pessoais, como nome, e-mail ou telefone. Caso você tenha menos de 18 anos (ou abaixo da idade legal permitida em seu país), pedimos que não acesse esta plataforma. O jogo pode causar dependência. Jogue com responsabilidade. Para mais orientações, acesse nossa seção Jogo Responsável.',
      expandedTitle3: '🔒 Utilizamos cookies para melhorar sua experiência',
      expandedP3:
        'Ao continuar navegando, você concorda com o uso de cookies que melhoram sua experiência. Utilizamos apenas cookies essenciais e respeitamos sua privacidade. Para saber mais, consulte nossa Política de Privacidade.',
      expandedTitle4: '🎯 Jogo Responsável: Diversão com Consciência Sempre em Primeiro Lugar',
      expandedP4:
        'Apostar deve ser uma atividade leve, segura e feita com equilíbrio. Nosso compromisso é oferecer um ambiente saudável, onde o entretenimento vem acompanhado de responsabilidade. Por isso, disponibilizamos ferramentas que ajudam você a manter o controle da sua jornada, como limites personalizáveis e pausas voluntárias. Também oferecemos acesso a canais de apoio para quem precisa de orientação. Nosso objetivo é garantir que sua experiência seja sempre positiva, consciente e segura.',
      expandedTitle5: '⚡ Apostas em Tempo Real: Emoção Segundo a Segundo',
      expandedP5:
        'Mergulhe na intensidade das apostas em tempo real! Nossa plataforma permite que você acompanhe cada lance dos eventos esportivos enquanto faz suas apostas com rapidez e estratégia. Tome decisões instantâneas, aproveite cotações que mudam ao vivo e explore diversos tipos de mercados em uma experiência interativa e cheia de adrenalina. Para quem busca emoção de verdade, o jogo acontece aqui e agora!',
    },
  },
  en: {
    header: {
      casino: 'Casino',
      sports: 'Sports',
      promotionsAria: 'Promotions',
      login: 'Sign in',
      register: 'Sign up',
      registerShort: 'Sign up',
      accountMenuAria: 'Account menu',
      nextVip: 'Next:',
      maxVipLevel: 'Maximum VIP level',
      myAccount: 'My account',
      wallet: 'Wallet',
      vipLevels: 'VIP levels',
      activateCoupon: 'Activate coupon',
      referrals: 'Referrals',
      promotions: 'Promotions',
      appDownload: 'App Download',
      liveSupport: 'Live Support',
      logout: 'Sign out',
      collapseSidebar: 'Collapse sidebar',
      expandSidebar: 'Expand sidebar',
      closeMenu: 'Close menu',
    },
    footer: {
      rules: 'Rules',
      community: 'Community',
      payment: 'Payment',
      terms: 'Terms & Conditions',
      bettingTerms: 'Betting Terms',
      privacy: 'Privacy Policy',
      kyc: 'KYC Policy',
      responsibleGaming: 'Responsible Gaming Policy',
      aml: 'AML Policy',
      mobileApp: 'Mobile App',
      headline: '24/7 Casino 🎲 - Instant Pix and Fast Withdrawals!',
      summary:
        'Bet now at the Brazilian Casino with guaranteed cashback, unlimited bets 🎰 and over 1,000 games for you to enjoy. Take advantage of exclusive promotions, 24/7 support and total security on your bets! 🍀',
      showMore: 'Show more',
      showLess: 'Show less',
      expandedTitle1: '🎰 Bet where the excitement never ends! - Instant Pix, 24/7 Support and Fast Withdrawals!',
      expandedP1:
        'Enjoy the best virtual casino games and online sports. Over 1,000 games and thousands of betting options on football, basketball, tennis, e-sports and much more!',
      expandedTitle2: '⚠️ Not allowed for users under 18',
      expandedP2:
        'This site is intended exclusively for people aged 18 or older. Minors must not provide personal information such as name, email or phone number. If you are under 18 (or below the legal age allowed in your country), please do not access this platform. Gambling can cause addiction. Play responsibly. For more guidance, visit our Responsible Gaming section.',
      expandedTitle3: '🔒 We use cookies to improve your experience',
      expandedP3:
        'By continuing to browse, you agree to the use of cookies that improve your experience. We only use essential cookies and respect your privacy. To learn more, see our Privacy Policy.',
      expandedTitle4: '🎯 Responsible Gaming: Fun with Awareness Always Comes First',
      expandedP4:
        'Betting should be a light, safe activity done in balance. Our commitment is to offer a healthy environment where entertainment comes with responsibility. That is why we provide tools to help you stay in control of your journey, such as customizable limits and voluntary breaks. We also offer access to support channels for those who need guidance. Our goal is to ensure your experience is always positive, conscious and safe.',
      expandedTitle5: '⚡ Live Betting: Emotion Second by Second',
      expandedP5:
        'Dive into the intensity of live betting! Our platform lets you follow every play in sporting events while placing bets quickly and strategically. Make instant decisions, take advantage of live odds and explore different market types in an interactive, adrenaline-filled experience. For those seeking real excitement, the game happens here and now!',
    },
  },
  es: {
    header: {
      casino: 'Casino',
      sports: 'Deportes',
      promotionsAria: 'Promociones',
      login: 'Entrar',
      register: 'Regístrate',
      registerShort: 'Registro',
      accountMenuAria: 'Menú de cuenta',
      nextVip: 'Siguiente:',
      maxVipLevel: 'Nivel VIP máximo',
      myAccount: 'Mi cuenta',
      wallet: 'Cartera',
      vipLevels: 'Niveles VIP',
      activateCoupon: 'Activar cupón',
      referrals: 'Referidos',
      promotions: 'Promociones',
      appDownload: 'Descargar App',
      liveSupport: 'Soporte en Vivo',
      logout: 'Salir',
      collapseSidebar: 'Contraer menú lateral',
      expandSidebar: 'Expandir menú lateral',
      closeMenu: 'Cerrar menú',
    },
    footer: {
      rules: 'Reglas',
      community: 'Comunidad',
      payment: 'Pago',
      terms: 'Términos y Condiciones',
      bettingTerms: 'Términos de Apuestas',
      privacy: 'Política de Privacidad',
      kyc: 'Política KYC',
      responsibleGaming: 'Política de Juego Responsable',
      aml: 'Política AML',
      mobileApp: 'Aplicación Móvil',
      headline: 'Casino 24 horas 🎲 - ¡Pix instantáneo y retiros rápidos!',
      summary:
        'Apuesta ahora en el Casino de los Brasileños con cashback garantizado, apuestas ilimitadas 🎰 y más de 1.000 juegos disponibles para divertirte. ¡Aprovecha promociones exclusivas, soporte 24h y total seguridad en tus apuestas! 🍀',
      showMore: 'Ver más',
      showLess: 'Ver menos',
      expandedTitle1: '🎰 ¡Apuesta donde la emoción no tiene límites! - Pix instantáneo, soporte 24h y retiros rápidos!',
      expandedP1:
        'Disfruta de los mejores juegos de casino virtual y deportes online. ¡Más de 1.000 juegos y miles de opciones de apuestas en fútbol, baloncesto, tenis, e-sports y mucho más!',
      expandedTitle2: '⚠️ Prohibido para menores de 18 años',
      expandedP2:
        'Este sitio está destinado exclusivamente a mayores de 18 años. Los menores no deben proporcionar información personal, como nombre, correo electrónico o teléfono. Si tienes menos de 18 años (o por debajo de la edad legal permitida en tu país), te pedimos que no accedas a esta plataforma. El juego puede causar adicción. Juega con responsabilidad. Para más orientación, visita nuestra sección de Juego Responsable.',
      expandedTitle3: '🔒 Utilizamos cookies para mejorar tu experiencia',
      expandedP3:
        'Al continuar navegando, aceptas el uso de cookies que mejoran tu experiencia. Utilizamos solo cookies esenciales y respetamos tu privacidad. Para saber más, consulta nuestra Política de Privacidad.',
      expandedTitle4: '🎯 Juego Responsable: Diversión con Conciencia Siempre en Primer Lugar',
      expandedP4:
        'Apostar debe ser una actividad ligera, segura y hecha con equilibrio. Nuestro compromiso es ofrecer un entorno saludable, donde el entretenimiento viene acompañado de responsabilidad. Por eso, ponemos a disposición herramientas que te ayudan a mantener el control de tu recorrido, como límites personalizables y pausas voluntarias. También ofrecemos acceso a canales de apoyo para quien necesite orientación. Nuestro objetivo es garantizar que tu experiencia sea siempre positiva, consciente y segura.',
      expandedTitle5: '⚡ Apuestas en Tiempo Real: Emoción Segundo a Segundo',
      expandedP5:
        '¡Sumérgete en la intensidad de las apuestas en tiempo real! Nuestra plataforma te permite seguir cada jugada de los eventos deportivos mientras haces tus apuestas con rapidez y estrategia. Toma decisiones instantáneas, aprovecha cuotas que cambian en vivo y explora diversos tipos de mercados en una experiencia interactiva y llena de adrenalina. ¡Para quien busca emoción de verdad, el juego sucede aquí y ahora!',
    },
  },
};

export function getHeaderFooterCopy(language: SidebarLanguage): HeaderFooterCopy {
  return DEFAULT_HEADER_FOOTER_COPY[language] ?? DEFAULT_HEADER_FOOTER_COPY.pt;
}

export function getLocaleForLanguage(language: SidebarLanguage): string {
  if (language === 'en') return 'en-US';
  if (language === 'es') return 'es-ES';
  return 'pt-BR';
}
