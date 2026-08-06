import { getAppCopy } from '../i18n';
import type { AppLanguage } from '../i18n/types';
import { supabase } from './supabase';

export type CupomErrorCode =
  | 'not_authenticated'
  | 'empty_code'
  | 'invalid_coupon'
  | 'usage_limit_reached'
  | 'user_limit_reached'
  | 'min_deposit_not_met'
  | 'requires_deposit'
  | 'zero_bonus'
  | 'deposit_not_found'
  | 'deposit_not_approved'
  | 'forbidden'
  | 'invalid_spin_coupon_type'
  | 'missing_game'
  | 'game_not_allowed'
  | 'invalid_spin_count';

export interface ValidarCupomResult {
  ok: boolean;
  error?: CupomErrorCode;
  codigo?: string;
  tipo_valor?: 'porcentagem' | 'fixo';
  valor?: number;
  tipo_bonus?: 'saldo_real' | 'giros_gratis';
  deposito_minimo?: number;
  bonus_maximo?: number | null;
  requer_deposito?: boolean;
  bonus_calculado?: number | null;
  quantidade_giros?: number;
  jogo_slug?: string;
  jogo_nome?: string;
  provider_slug?: string;
  mensagem?: string;
}

export interface AtivarCupomResult {
  ok: boolean;
  error?: CupomErrorCode;
  codigo?: string;
  valor_bonus?: number;
  tipo_bonus?: 'saldo_real' | 'giros_gratis';
  quantidade_giros?: number;
  jogo_slug?: string;
  jogo_nome?: string;
  provider_slug?: string;
  status_giro?: string;
  cupom_uso_id?: string;
}

export interface AplicarCupomDepositoResult {
  ok: boolean;
  error?: CupomErrorCode;
  already?: boolean;
  codigo?: string;
  valor_bonus?: number;
  tipo_bonus?: 'saldo_real' | 'giros_gratis';
  quantidade_giros?: number;
  jogo_slug?: string;
  jogo_nome?: string;
  provider_slug?: string;
  status_giro?: string;
}

export interface CupomHistoricoItem {
  id: string;
  cupom: string;
  valor: number;
  valor_deposito: number | null;
  tipo_bonus?: string;
  quantidade_giros?: number | null;
  jogo_slug?: string | null;
  jogo_nome?: string | null;
  provider_slug?: string | null;
  status_giro?: string | null;
  origem?: string;
  status: string;
  data: string;
}

export function getCupomErrorMessage(
  error?: string,
  depositoMinimo?: number,
  lang: AppLanguage = 'pt',
): string {
  const coupon = getAppCopy(lang).coupon;
  if (error === 'min_deposit_not_met' && depositoMinimo != null) {
    return coupon.minDeposit(depositoMinimo.toFixed(2).replace('.', ','));
  }
  if (error === 'requires_deposit' && depositoMinimo != null && depositoMinimo > 0) {
    return coupon.requiresDepositMin(depositoMinimo.toFixed(2).replace('.', ','));
  }
  return coupon.errors[error as CupomErrorCode] ?? coupon.invalidFallback;
}

export async function validarCupom(codigo: string, valorDeposito?: number): Promise<ValidarCupomResult> {
  const { data, error } = await supabase.rpc('validar_cupom', {
    p_codigo: codigo.trim(),
    p_valor_deposito: valorDeposito ?? null,
  });

  if (error) {
    console.error('validar_cupom:', error);
    return { ok: false, error: 'invalid_coupon' };
  }

  return data as ValidarCupomResult;
}

export async function ativarCupom(codigo: string): Promise<AtivarCupomResult> {
  const { data, error } = await supabase.rpc('ativar_cupom', {
    p_codigo: codigo.trim(),
  });

  if (error) {
    console.error('ativar_cupom:', error);
    return { ok: false, error: 'invalid_coupon' };
  }

  return data as AtivarCupomResult;
}

export async function aplicarCupomDeposito(
  depositoId: string,
  codigo: string
): Promise<AplicarCupomDepositoResult> {
  const { data, error } = await supabase.rpc('aplicar_cupom_deposito', {
    p_deposito_id: depositoId,
    p_codigo: codigo.trim(),
  });

  if (error) {
    console.error('aplicar_cupom_deposito:', error);
    return { ok: false, error: 'invalid_coupon' };
  }

  return data as AplicarCupomDepositoResult;
}

export async function listarCuponsUsuario(): Promise<CupomHistoricoItem[]> {
  const { data, error } = await supabase.rpc('listar_cupons_usuario');

  if (error) {
    console.error('listar_cupons_usuario:', error);
    return [];
  }

  const result = data as { ok: boolean; cupons?: CupomHistoricoItem[] };
  if (!result?.ok || !Array.isArray(result.cupons)) return [];

  return result.cupons.map((item) => ({
    ...item,
    valor: Number(item.valor) || 0,
  }));
}

export function formatCupomBonus(valor: number): string {
  return `R$ ${valor.toFixed(2).replace('.', ',')}`;
}

export function formatCupomGiros(
  quantidade: number,
  jogoNome?: string,
  lang: AppLanguage = 'pt',
): string {
  return getAppCopy(lang).coupon.formatSpins(quantidade, jogoNome);
}

export async function marcarRodadasGratisUsadas(
  cupomUsoId: string
): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.rpc('marcar_rodadas_gratis_usadas', {
    p_cupom_uso_id: cupomUsoId,
  });

  if (error) {
    console.error('marcar_rodadas_gratis_usadas:', error);
    return { ok: false, error: error.message };
  }

  const result = data as { ok: boolean; error?: string };
  return { ok: Boolean(result?.ok), error: result?.error };
}
