import { getAppCopy } from '../i18n';
import type { AppLanguage } from '../i18n/types';
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
  titulo: '',
  banner: '',
  roleta: '',
  widget: '',
  centro: '',
};

export function getPrizeWheelErrorMessage(error?: string, lang: AppLanguage = 'pt'): string {
  const copy = getAppCopy(lang).prizeWheel;
  const messages: Record<PrizeWheelErrorCode, string> = {
    not_authenticated: copy.loginRequired,
    wheel_disabled: copy.wheelDisabled,
    no_segments: copy.noSegments,
    cooldown_active: copy.cooldownActive,
    usage_limit_reached: copy.usageLimitReached,
    user_limit_reached: copy.userLimitReached,
    invalid_segment: copy.invalidSegment,
  };
  return messages[error as PrizeWheelErrorCode] ?? copy.spinFailed;
}

export function getDefaultWheelImages() {
  return DEFAULT_IMAGES;
}

function isRpcMissing(error: { code?: string } | null): boolean {
  return error?.code === 'PGRST202';
}

type RoletaConfigResult = {
  ok: boolean;
  config?: PrizeWheelConfig;
  segments?: PrizeWheelSegment[];
  error?: string;
};

let roletaConfigCache: RoletaConfigResult | null = null;
let roletaConfigInflight: Promise<RoletaConfigResult> | null = null;
let roletaStatusInflight: Promise<PrizeWheelStatus | null> | null = null;

async function fetchRoletaConfigFromNetwork(): Promise<RoletaConfigResult> {
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

export async function obterRoletaConfig(): Promise<RoletaConfigResult> {
  if (roletaConfigCache) return roletaConfigCache;
  if (roletaConfigInflight) return roletaConfigInflight;

  roletaConfigInflight = fetchRoletaConfigFromNetwork()
    .then((result) => {
      roletaConfigCache = result;
      return result;
    })
    .finally(() => {
      roletaConfigInflight = null;
    });

  return roletaConfigInflight;
}

export function invalidateRoletaConfigCache(): void {
  roletaConfigCache = null;
}

function parseRpcBoolean(value: unknown): boolean {
  if (value === true || value === 1) return true;
  if (value === false || value === 0 || value === null || value === undefined) return false;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return Boolean(value);
}

async function fetchStatusRoletaFromNetwork(): Promise<PrizeWheelStatus | null> {
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

export async function obterStatusRoleta(): Promise<PrizeWheelStatus | null> {
  if (roletaStatusInflight) return roletaStatusInflight;

  roletaStatusInflight = fetchStatusRoletaFromNetwork().finally(() => {
    roletaStatusInflight = null;
  });

  return roletaStatusInflight;
}

export async function girarRoleta(): Promise<GirarRoletaResult> {
  const { data, error } = await supabase.rpc('girar_roleta');

  if (error) {
    console.error('girar_roleta:', error);
    return { ok: false, error: 'invalid_segment' };
  }

  return data as GirarRoletaResult;
}

export function formatPrizeMessage(result: GirarRoletaResult, lang: AppLanguage = 'pt'): string {
  const copy = getAppCopy(lang).prizeWheel;

  if (!result.ok || !result.quantidade_giros || !result.jogo_nome) {
    return getPrizeWheelErrorMessage(result.error, lang);
  }

  const giros = copy.wonSpins(`${result.quantidade_giros} giros`, result.jogo_nome);

  if (result.requer_deposito && (result.deposito_minimo ?? 0) > 0) {
    return copy.wonSpinsDeposit(
      giros,
      result.deposito_minimo!.toFixed(2).replace('.', ','),
      result.codigo ?? '',
    );
  }

  return copy.wonSpinsAvailable(giros);
}
