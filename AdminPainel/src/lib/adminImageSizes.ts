export interface AdminImageSizeSpec {
  size: string;
  detail: string;
}

/** Tamanhos recomendados exibidos nos formulários de imagem do admin. */
export const ADMIN_IMAGE_SIZES = {
  siteLogo: {
    size: '400×120 px',
    detail: 'PNG ou WebP com fundo transparente. Exibida no header com até ~180 px de largura.',
  },
  loginModal: {
    size: '840×520 px',
    detail: 'Proporção ~4:3. Largura máxima no site: 420 px.',
  },
  registerModal: {
    size: '840×520 px',
    detail: 'Proporção ~4:3. Largura máxima no site: 420 px.',
  },
  depositModal: {
    size: '1000×400 px',
    detail: 'Horizontal. Largura máxima no site: 500 px. Deixe vazio para usar a logo.',
  },
  entryPopup: {
    size: '480×640 px',
    detail: 'Retrato (proporção 3:4). Largura máxima no site: ~480 px.',
  },
  homeCarousel: {
    size: '2100×900 px',
    detail: 'Proporção 21:9. Largura máxima no site: 1100 px.',
  },
  recommendedDesktop: {
    size: '800×600 px',
    detail: 'Proporção 4:3. Exibido em grid de 3 colunas no desktop.',
  },
  recommendedMobile: {
    size: '720×960 px',
    detail: 'Proporção 4:3. Usado em telas mobile (até 767 px).',
  },
  quickNav: {
    size: '256×256 px',
    detail: 'Quadrado. Área visível do card: 96×96 px.',
  },
  promotionBanner: {
    size: '525×281 px',
    detail: 'Proporção fixa exibida na página de promoções.',
  },
  sidebarCardIcon: {
    size: '128×128 px',
    detail: 'Quadrado. Ícone exibido no card da sidebar (239×50 px).',
  },
  roletaTitulo: {
    size: '500×274 px',
    detail: 'Exibido acima da roleta em 250×137 px.',
  },
  roletaBanner: {
    size: '400×166 px',
    detail: 'Banner exibido ao ganhar prêmio em 200×83 px.',
  },
  roletaDisco: {
    size: '868×868 px',
    detail: 'Quadrado. Disco da roleta exibido em 434×434 px.',
  },
  roletaWidget: {
    size: '176×176 px',
    detail: 'Quadrado. Widget flutuante exibido em 88×88 px.',
  },
  roletaCentro: {
    size: '240×240 px',
    detail: 'Quadrado. Botão central exibido em 120×120 px.',
  },
} as const satisfies Record<string, AdminImageSizeSpec>;
