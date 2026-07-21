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

const ERROR_MESSAGES: Record<CupomErrorCode, string> = {
  not_authenticated: 'Faça login para usar cupons.',
  empty_code: 'Informe o código do cupom.',
  invalid_coupon: 'Cupom inválido ou expirado!',
  usage_limit_reached: 'Este cupom atingiu o limite total de uso.',
  user_limit_reached: 'Você já utilizou este cupom.',
  min_deposit_not_met: 'O valor do depósito não atinge o mínimo exigido pelo cupom.',
  requires_deposit: 'Este cupom deve ser usado durante um depósito.',
  zero_bonus: 'Este cupom não gera bônus.',
  deposit_not_found: 'Depósito não encontrado.',
  deposit_not_approved: 'O depósito ainda não foi aprovado.',
  forbidden: 'Operação não permitida.',
  invalid_spin_coupon_type: 'Cupom de rodadas inválido.',
  missing_game: 'Cupom de rodadas sem jogo configurado.',
  game_not_allowed: 'Jogo não permitido para cupons de rodadas.',
  invalid_spin_count: 'Quantidade de giros inválida.',
};

export function getCupomErrorMessage(error?: string, depositoMinimo?: number): string {
  if (error === 'min_deposit_not_met' && depositoMinimo != null) {
    return `Depósito mínimo de R$ ${depositoMinimo.toFixed(2)} para este cupom.`;
  }
  if (error === 'requires_deposit' && depositoMinimo != null && depositoMinimo > 0) {
    return `Este cupom requer depósito mínimo de R$ ${depositoMinimo.toFixed(2)}.`;
  }
  return ERROR_MESSAGES[error as CupomErrorCode] ?? 'Cupom inválido ou expirado!';
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

export function formatCupomGiros(quantidade: number, jogoNome?: string): string {
  const giros = `${quantidade} giros`;
  return jogoNome ? `${giros} em ${jogoNome}` : giros;
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
