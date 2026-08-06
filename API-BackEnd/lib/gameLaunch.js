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
 * @param {'real' | 'bonus' | null | undefined} [preferredCarteira]
 */
export async function resolveGameLaunchUserContext(supabase, userId, preferredCarteira) {
  const carteiraPref =
    preferredCarteira === 'bonus' ? 'bonus' : preferredCarteira === 'real' ? 'real' : null;

  let data = null;

  if (carteiraPref) {
    const { data: rpcData, error: rpcError } = await supabase.rpc('sync_carteira_ativa_launch', {
      p_user_id: userId,
      p_carteira: carteiraPref,
    });

    if (!rpcError && rpcData?.ok) {
      data = {
        saldo: rpcData.saldo,
        saldo_bonus: rpcData.saldo_bonus,
        carteira_ativa: rpcData.carteira_ativa,
      };
    } else {
      if (rpcError) {
        console.warn('[game_launch] sync_carteira_ativa_launch:', rpcError.message);
      } else if (rpcData && !rpcData.ok) {
        console.warn('[game_launch] sync_carteira_ativa_launch:', rpcData.error || 'unknown');
      }

      const { error: persistError } = await supabase
        .from('usuarios')
        .update({ carteira_ativa: carteiraPref })
        .eq('id', userId);

      if (persistError) {
        console.error('[game_launch] falha ao persistir carteira_ativa:', persistError.message);
      }
    }
  }

  if (!data) {
    const baseSelect = 'saldo, saldo_bonus';

    let { data: row, error } = await supabase
      .from('usuarios')
      .select(`${baseSelect}, carteira_ativa`)
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      const msg = String(error.message || '').toLowerCase();
      if (msg.includes('carteira_ativa') || (msg.includes('column') && msg.includes('does not exist'))) {
        ({ data: row, error } = await supabase
          .from('usuarios')
          .select(baseSelect)
          .eq('id', userId)
          .maybeSingle());
        if (row) row.carteira_ativa = 'real';
      }
    }

    if (error) {
      console.error('[game_launch] consulta saldo:', error);
      throw new Error('Erro ao consultar saldo');
    }

    data = row;
  }

  const saldoReal = Number(data?.saldo ?? 0);
  const saldoBonus = Number(data?.saldo_bonus ?? 0);
  const carteira = data?.carteira_ativa === 'bonus' ? 'bonus' : 'real';
  const walletAmount = carteira === 'bonus' ? saldoBonus : saldoReal;
  const user_balance = Math.round(Math.max(0, walletAmount) * 100) / 100;

  if (carteiraPref && carteira !== carteiraPref) {
    console.error('[game_launch] carteira_ativa no DB difere do pedido — BALANCE webhook usaria saldo errado:', {
      userId,
      pedido: carteiraPref,
      noDb: carteira,
      saldoReal,
      saldoBonus,
      balanceEnviadoPlayFiver: user_balance,
    });
  }

  console.log('[game_launch] carteira:', {
    userId,
    carteiraAtiva: carteira,
    pedidoCarteira: carteiraPref,
    saldoReal,
    saldoBonus,
    balanceEnviadoPlayFiver: user_balance,
  });

  return {
    user_balance,
    user_rtp: getPlayFiverUserRtp(),
    carteira_ativa: carteira,
  };
}
