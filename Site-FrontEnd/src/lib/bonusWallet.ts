import { supabase } from './supabase';

export interface BonusWalletStatus {
  saldoBonus: number;
  rolloverBonusPendente: number;
  rolloverGirosGratis: number;
  podeConverter: boolean;
}

export interface ConverterBonusResult {
  ok: boolean;
  error?: string;
  msg?: string;
  valorConvertido?: number;
  saldo?: number;
}

export async function obterBonusUsuario(): Promise<BonusWalletStatus | null> {
  const { data, error } = await supabase.rpc('obter_bonus_usuario');

  if (error) {
    console.error('obter_bonus_usuario:', error);
    return null;
  }

  const result = data as {
    ok?: boolean;
    saldo_bonus?: number;
    rollover_bonus_pendente?: number;
    rollover_giros_gratis?: number;
    pode_converter?: boolean;
  };

  if (!result?.ok) {
    return null;
  }

  return {
    saldoBonus: Number(result.saldo_bonus) || 0,
    rolloverBonusPendente: Number(result.rollover_bonus_pendente) || 0,
    rolloverGirosGratis: Number(result.rollover_giros_gratis) || 5,
    podeConverter: Boolean(result.pode_converter),
  };
}

export async function converterBonusSaldo(): Promise<ConverterBonusResult> {
  const { data, error } = await supabase.rpc('converter_bonus_saldo');

  if (error) {
    console.error('converter_bonus_saldo:', error);
    return { ok: false, msg: 'Não foi possível converter o bônus.' };
  }

  const result = data as {
    ok?: boolean;
    error?: string;
    msg?: string;
    valor_convertido?: number;
    saldo?: number;
  };

  if (!result?.ok) {
    if (result?.error === 'rollover_pendente') {
      return {
        ok: false,
        error: result.error,
        msg: result.msg || 'Complete o rollover do bônus antes de converter.',
      };
    }
    if (result?.error === 'sem_bonus') {
      return {
        ok: false,
        error: result.error,
        msg: result.msg || 'Nenhum bônus disponível para converter.',
      };
    }
    return { ok: false, msg: result?.msg || 'Não foi possível converter o bônus.' };
  }

  return {
    ok: true,
    valorConvertido: Number(result.valor_convertido) || 0,
    saldo: Number(result.saldo) || 0,
  };
}
