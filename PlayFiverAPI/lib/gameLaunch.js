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
/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @param {'real' | 'bonus' | null | undefined} [preferredCarteira]
 */
export async function resolveGameLaunchUserContext(supabase, userId, preferredCarteira) {
  const carteiraPref =
    preferredCarteira === 'bonus' ? 'bonus' : preferredCarteira === 'real' ? 'real' : null;

  if (carteiraPref) {
    const { error: persistError } = await supabase
      .from('usuarios')
      .update({ carteira_ativa: carteiraPref })
      .eq('id', userId);

    if (persistError && !String(persistError.message || '').toLowerCase().includes('carteira_ativa')) {
      console.warn('[game_launch] persistir carteira_ativa:', persistError.message);
    }
  }

  const baseSelect = 'saldo, saldo_bonus';

  let { data, error } = await supabase
    .from('usuarios')
    .select(`${baseSelect}, carteira_ativa`)
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    const msg = String(error.message || '').toLowerCase();
    if (msg.includes('carteira_ativa') || (msg.includes('column') && msg.includes('does not exist'))) {
      ({ data, error } = await supabase
        .from('usuarios')
        .select(baseSelect)
        .eq('id', userId)
        .maybeSingle());
      if (data) data.carteira_ativa = 'real';
    }
  }

  if (error) {
    console.error('[game_launch] consulta saldo:', error);
    throw new Error('Erro ao consultar saldo');
  }

  const saldo = Number(data?.saldo ?? 0);
  const saldoBonus = Number(data?.saldo_bonus ?? 0);
  const carteira =
    carteiraPref ??
    (data?.carteira_ativa === 'bonus' ? 'bonus' : 'real');
  const walletAmount = carteira === 'bonus' ? saldoBonus : saldo;
  const user_balance = Math.round(Math.max(0, walletAmount) * 100) / 100;

  console.log('[game_launch] carteira:', {
    userId,
    carteira,
    preferredCarteira: carteiraPref,
    saldo,
    saldoBonus,
    user_balance,
  });

  return {
    user_balance,
    user_rtp: getPlayFiverUserRtp(),
    carteira_ativa: carteira,
  };
}
