import { supabase } from './supabase';

export type PrizeWheelErrorCode =
  | 'not_authenticated'
  | 'wheel_disabled'
  | 'no_segments'
  | 'cooldown_active'
  | 'usage_limit_reached'
  | 'user_limit_reached'
  | 'invalid_segment';

export interface PrizeWheelConfig {
  titulo_imagem_url: string | null;
  banner_imagem_url: string | null;
  roleta_imagem_url: string | null;
  widget_imagem_url: string | null;
  centro_imagem_url: string | null;
  giros_por_periodo: number;
  cooldown_horas: number;
}

export interface PrizeWheelSegment {
  id: string;
  label: string;
  peso: number;
  ordem: number;
  cupom_codigo: string;
  tipo_bonus: string;
  quantidade_giros: number;
  jogo_slug: string;
  jogo_nome: string;
  provider_slug: string;
  deposito_minimo: number;
}

export interface PrizeWheelStatus {
  pode_girar: boolean;
  giros_por_periodo: number;
  cooldown_horas: number;
  proximo_giro_em: string | null;
}

export interface GirarRoletaResult {
  ok: boolean;
  error?: PrizeWheelErrorCode;
  winner_index?: number;
  segment_id?: string;
  label?: string;
  codigo?: string;
  tipo_bonus?: string;
  quantidade_giros?: number;
  jogo_slug?: string;
  jogo_nome?: string;
  provider_slug?: string;
  requer_deposito?: boolean;
  deposito_minimo?: number;
  status_giro?: string;
  proximo_giro_em?: string;
  grant_error?: string;
  cupom_uso_id?: string;
}

const DEFAULT_IMAGES = {
  titulo:
    'https://betsolution.net/roleta/api/image_proxy.php?p=uploads%2Froulettes%2F69b332751671a_Camada%200.png',
  banner:
    'https://betsolution.net/roleta/api/image_proxy.php?p=uploads%2Froulettes%2F69ae5a84b9cff_SEU%20PR%C3%8AMIO%20URANO.png',
  roleta:
    'https://betsolution.net/roleta/api/image_proxy.php?p=uploads%2Froulettes%2F69ae5add7dcc9_URANO%20ROLETA.png',
  widget:
    'https://betsolution.net/roleta/api/image_proxy.php?p=uploads%2Froulettes%2F69ae5a84b95b9_ChatGPTImage8_03_202617_52_42.png',
  centro:
    'https://betsolution.net/roleta/api/image_proxy.php?p=uploads%2Froulettes%2F69ae5a84b95b9_ChatGPTImage8_03_202617_52_42.png',
};

const ERROR_MESSAGES: Record<PrizeWheelErrorCode, string> = {
  not_authenticated: 'Faça login para girar a roleta.',
  wheel_disabled: 'A roleta não está disponível no momento.',
  no_segments: 'A roleta ainda não foi configurada.',
  cooldown_active: 'Você já girou a roleta. Aguarde para girar novamente.',
  usage_limit_reached: 'Este prêmio atingiu o limite de uso.',
  user_limit_reached: 'Você já utilizou este prêmio.',
  invalid_segment: 'Erro ao processar o prêmio. Tente novamente.',
};

export function getPrizeWheelErrorMessage(error?: string): string {
  return ERROR_MESSAGES[error as PrizeWheelErrorCode] ?? 'Não foi possível girar a roleta.';
}

export function getDefaultWheelImages() {
  return DEFAULT_IMAGES;
}

function isRpcMissing(error: { code?: string } | null): boolean {
  return error?.code === 'PGRST202';
}

export async function obterRoletaConfig(): Promise<{
  ok: boolean;
  config?: PrizeWheelConfig;
  segments?: PrizeWheelSegment[];
  error?: string;
}> {
  const { data, error } = await supabase.rpc('obter_roleta_config');

  if (error) {
    if (!isRpcMissing(error)) {
      console.error('obter_roleta_config:', error);
    }
    return { ok: false, error: error.code };
  }

  const result = data as {
    ok: boolean;
    error?: string;
    config?: PrizeWheelConfig;
    segments?: PrizeWheelSegment[];
  };

  if (!result?.ok) {
    return { ok: false, error: result?.error };
  }

  return {
    ok: true,
    config: result.config,
    segments: result.segments ?? [],
  };
}

function parseRpcBoolean(value: unknown): boolean {
  if (value === true || value === 1) return true;
  if (value === false || value === 0 || value === null || value === undefined) return false;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return Boolean(value);
}

export async function obterStatusRoleta(): Promise<PrizeWheelStatus | null> {
  const { data, error } = await supabase.rpc('obter_status_roleta');

  if (error) {
    if (!isRpcMissing(error)) {
      console.error('obter_status_roleta:', error);
    }
    return null;
  }

  const result = data as { ok: boolean } & PrizeWheelStatus;
  if (!result?.ok) return null;

  return {
    pode_girar: parseRpcBoolean(result.pode_girar),
    giros_por_periodo: Number(result.giros_por_periodo) || 1,
    cooldown_horas: Number(result.cooldown_horas) || 24,
    proximo_giro_em: result.proximo_giro_em ?? null,
  };
}

export async function girarRoleta(): Promise<GirarRoletaResult> {
  const { data, error } = await supabase.rpc('girar_roleta');

  if (error) {
    console.error('girar_roleta:', error);
    return { ok: false, error: 'invalid_segment' };
  }

  return data as GirarRoletaResult;
}

export function formatPrizeMessage(result: GirarRoletaResult): string {
  if (!result.ok || !result.quantidade_giros || !result.jogo_nome) {
    return getPrizeWheelErrorMessage(result.error);
  }

  const giros = `${result.quantidade_giros} giros em ${result.jogo_nome}`;

  if (result.requer_deposito && (result.deposito_minimo ?? 0) > 0) {
    return `Você ganhou ${giros}! Deposite no mínimo R$ ${result.deposito_minimo!.toFixed(2).replace('.', ',')} com o cupom ${result.codigo} para ativar.`;
  }

  return `Parabéns! Você ganhou ${giros}! As rodadas já estão disponíveis.`;
}
