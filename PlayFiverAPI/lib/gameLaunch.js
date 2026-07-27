/**
 * H6: saldo e RTP do game_launch vêm do servidor — nunca do body do client.
 */

export function getPlayFiverUserRtp() {
  const raw = process.env.PLAYFIVER_USER_RTP;
  const parsed = raw != null && String(raw).trim() !== '' ? Number(raw) : 70;
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 100) {
    return 70;
  }
  return Math.round(parsed * 100) / 100;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 */
export async function resolveGameLaunchUserContext(supabase, userId) {
  const { data, error } = await supabase
    .from('usuarios')
    .select('saldo, saldo_bonus')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('[game_launch] consulta saldo:', error);
    throw new Error('Erro ao consultar saldo');
  }

  const saldo = Number(data?.saldo ?? 0);
  const saldoBonus = Number(data?.saldo_bonus ?? 0);
  const total = (Number.isFinite(saldo) ? saldo : 0) + (Number.isFinite(saldoBonus) ? saldoBonus : 0);
  const user_balance = Math.round(Math.max(0, total) * 100) / 100;

  return {
    user_balance,
    user_rtp: getPlayFiverUserRtp(),
  };
}
