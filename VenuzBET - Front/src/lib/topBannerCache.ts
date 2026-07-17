export interface TopBannerConfig {
  ativo: boolean;
  background_color: string;
  emoji: string;
  mensagem: string;
  botao_texto: string;
  botao_href: string;
  botao_cor_fundo: string;
  botao_cor_texto: string;
  permitir_fechar: boolean;
}

export const DEFAULT_TOP_BANNER_CONFIG: TopBannerConfig = {
  ativo: true,
  background_color: 'var(--brand-primary)',
  emoji: '📲',
  mensagem: 'Faça o download do nosso aplicativo para uma experiência ainda melhor!',
  botao_texto: 'Download',
  botao_href: '/help/mobile',
  botao_cor_fundo: '#FFFFFF',
  botao_cor_texto: '#0f172a',
  permitir_fechar: true,
};

const STORAGE_KEY = 'venuz-top-banner-v1';

function readCache(): TopBannerConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeTopBannerConfig(JSON.parse(raw) as Record<string, unknown>);
  } catch {
    return null;
  }
}

export function normalizeTopBannerConfig(row: Record<string, unknown> | null): TopBannerConfig {
  if (!row) return DEFAULT_TOP_BANNER_CONFIG;

  if ('top_banner_ativo' in row) {
    return {
      ativo: Boolean(row.top_banner_ativo),
      background_color: String(
        row.top_banner_background_color || DEFAULT_TOP_BANNER_CONFIG.background_color,
      ),
      emoji: String(row.top_banner_emoji ?? DEFAULT_TOP_BANNER_CONFIG.emoji),
      mensagem: String(row.top_banner_mensagem || DEFAULT_TOP_BANNER_CONFIG.mensagem),
      botao_texto: String(row.top_banner_botao_texto || DEFAULT_TOP_BANNER_CONFIG.botao_texto),
      botao_href: String(row.top_banner_botao_href || DEFAULT_TOP_BANNER_CONFIG.botao_href),
      botao_cor_fundo: String(
        row.top_banner_botao_cor_fundo || DEFAULT_TOP_BANNER_CONFIG.botao_cor_fundo,
      ),
      botao_cor_texto: String(
        row.top_banner_botao_cor_texto || DEFAULT_TOP_BANNER_CONFIG.botao_cor_texto,
      ),
      permitir_fechar: row.top_banner_permitir_fechar !== false,
    };
  }

  return {
    ativo: row.ativo !== false,
    background_color: String(row.background_color || DEFAULT_TOP_BANNER_CONFIG.background_color),
    emoji: String(row.emoji ?? DEFAULT_TOP_BANNER_CONFIG.emoji),
    mensagem: String(row.mensagem || DEFAULT_TOP_BANNER_CONFIG.mensagem),
    botao_texto: String(row.botao_texto || DEFAULT_TOP_BANNER_CONFIG.botao_texto),
    botao_href: String(row.botao_href || DEFAULT_TOP_BANNER_CONFIG.botao_href),
    botao_cor_fundo: String(row.botao_cor_fundo || DEFAULT_TOP_BANNER_CONFIG.botao_cor_fundo),
    botao_cor_texto: String(row.botao_cor_texto || DEFAULT_TOP_BANNER_CONFIG.botao_cor_texto),
    permitir_fechar: row.permitir_fechar !== false,
  };
}

export function getInitialTopBannerConfig(): TopBannerConfig {
  return readCache() ?? DEFAULT_TOP_BANNER_CONFIG;
}

export function persistTopBannerConfig(config: TopBannerConfig) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore quota / private mode
  }
}
