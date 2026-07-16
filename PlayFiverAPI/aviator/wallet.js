/** Carteira Aviator integrada ao Supabase (mesmo fluxo da PlayFiver). */

const GOLD_MULTIPLE = 100;

export function realToGold(amount) {
  const n = parseFloat(String(amount ?? '').replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * GOLD_MULTIPLE);
}

export function goldToReal(gold) {
  const n = Number(gold);
  if (!Number.isFinite(n)) return 0;
  return parseFloat((n / GOLD_MULTIPLE).toFixed(2));
}

export function createAviatorWallet(supabase, rounds = null) {
  async function findUsuario(userCode) {
    const email = String(userCode || '').trim();
    if (!email) return null;

    let { data: usuario } = await supabase
      .from('usuarios')
      .select('id, saldo, email, nome')
      .eq('email', email)
      .maybeSingle();

    if (!usuario) {
      const { data: usuarioIlike } = await supabase
        .from('usuarios')
        .select('id, saldo, email, nome')
        .ilike('email', email)
        .maybeSingle();
      usuario = usuarioIlike;
    }

    if (!usuario) {
      const { data: usuarioRpc } = await supabase.rpc('get_user_by_email', { user_email: email });
      if (usuarioRpc?.length) usuario = usuarioRpc[0];
    }

    return usuario;
  }

  async function getBalance(userCode) {
    const usuario = await findUsuario(userCode);
    if (!usuario) {
      return { ok: false, status: 404, error: 'Usuário não encontrado', gold: 0, balance: 0 };
    }
    const balance = parseFloat(usuario.saldo) || 0;
    return {
      ok: true,
      usuario,
      balance,
      gold: realToGold(balance),
      nickName: usuario.nome || usuario.email.split('@')[0],
    };
  }

  async function debit({ userCode, gold, betId, roundId, txnSuffix = '' }) {
    const betGold = Math.round(Number(gold) || 0);
    if (betGold <= 0) {
      return { ok: false, status: 400, error: 'Valor da aposta inválido' };
    }

    const usuario = await findUsuario(userCode);
    if (!usuario) {
      return { ok: false, status: 404, error: 'Usuário não encontrado' };
    }

    const saldoNum = parseFloat(String(usuario.saldo ?? '').replace(',', '.'));
    const betReal = goldToReal(betGold);
    if (!Number.isFinite(saldoNum) || saldoNum < betReal) {
      return { ok: false, status: 400, error: 'Saldo insuficiente', gold: realToGold(saldoNum) };
    }

    const newBalance = parseFloat((saldoNum - betReal).toFixed(2));
    const { error: updateError } = await supabase
      .from('usuarios')
      .update({ saldo: newBalance })
      .eq('id', usuario.id);

    if (updateError) {
      return { ok: false, status: 500, error: 'Erro ao debitar saldo' };
    }

    if (rounds && roundId && usuario?.id) {
      await rounds.placeBet({
        externalRoundId: roundId,
        usuarioId: usuario.id,
        betSlot: betId || 1,
        betGold,
      });
    }

    return {
      ok: true,
      gold: realToGold(newBalance),
      balance: newBalance,
      betGold,
      usuario,
    };
  }

  async function credit({ userCode, gold, betId, roundId, tipo = 'Ganhou', betGold = 0, txnSuffix = '', cashoutMultiplier = 0 }) {
    const winGold = Math.round(Number(gold) || 0);
    if (winGold <= 0) {
      return { ok: false, status: 400, error: 'Valor de crédito inválido' };
    }

    const usuario = await findUsuario(userCode);
    if (!usuario) {
      return { ok: false, status: 404, error: 'Usuário não encontrado' };
    }

    const saldoNum = parseFloat(String(usuario.saldo ?? '').replace(',', '.'));
    const winReal = goldToReal(winGold);
    const newBalance = parseFloat((saldoNum + winReal).toFixed(2));

    const { error: updateError } = await supabase
      .from('usuarios')
      .update({ saldo: newBalance })
      .eq('id', usuario.id);

    if (updateError) {
      return { ok: false, status: 500, error: 'Erro ao creditar saldo' };
    }

    const txnId = `aviator_${usuario.id}_${roundId || 0}_${betId || 0}_${txnSuffix || Date.now()}`;
    await supabase.from('transacoes_jogos').insert({
      usuario_id: usuario.id,
      txn_id: txnId,
      tipo,
      jogo: 'Aviator',
      valor: goldToReal(betGold || 0),
      retorno: winReal,
      status: 'Finalizado',
      com_bonus: 'Não',
      data: new Date().toISOString(),
    });

    if (rounds && roundId && usuario?.id) {
      await rounds.cashoutBet({
        externalRoundId: roundId,
        usuarioId: usuario.id,
        betSlot: betId || 1,
        cashoutMultiplier: cashoutMultiplier || gold,
        profitGold: winGold,
      });
    }

    return {
      ok: true,
      gold: realToGold(newBalance),
      balance: newBalance,
      winGold,
      usuario,
    };
  }

  async function recordLoss({ userCode, betGold, roundId, betId }) {
    const usuario = await findUsuario(userCode);
    if (!usuario) return { ok: false };

    const betReal = goldToReal(betGold);
    const txnId = `aviator_${usuario.id}_${roundId || 0}_${betId || 0}_crash_${Date.now()}`;

    const { data: existing } = await supabase
      .from('transacoes_jogos')
      .select('id')
      .eq('txn_id', txnId)
      .maybeSingle();

    if (existing) return { ok: true, duplicate: true };

    await supabase.from('transacoes_jogos').insert({
      usuario_id: usuario.id,
      txn_id: txnId,
      tipo: 'Perdeu',
      jogo: 'Aviator',
      valor: betReal,
      retorno: 0,
      status: 'Finalizado',
      com_bonus: 'Não',
      data: new Date().toISOString(),
    });

    if (rounds && roundId && usuario?.id) {
      await rounds.crashBet({
        externalRoundId: roundId,
        usuarioId: usuario.id,
        betSlot: betId || 1,
      });
    }

    return { ok: true };
  }

  async function refund({ userCode, gold, betId, roundId }) {
    const refundGold = Math.round(Number(gold) || 0);
    if (refundGold <= 0) {
      return { ok: false, status: 400, error: 'Valor de reembolso inválido' };
    }

    const usuario = await findUsuario(userCode);
    if (!usuario) {
      return { ok: false, status: 404, error: 'Usuário não encontrado' };
    }

    const saldoNum = parseFloat(String(usuario.saldo ?? '').replace(',', '.'));
    const refundReal = goldToReal(refundGold);
    const newBalance = parseFloat((saldoNum + refundReal).toFixed(2));

    const { error: updateError } = await supabase
      .from('usuarios')
      .update({ saldo: newBalance })
      .eq('id', usuario.id);

    if (updateError) {
      return { ok: false, status: 500, error: 'Erro ao reembolsar saldo' };
    }

    if (rounds && roundId && usuario?.id) {
      await rounds.cancelBet({
        externalRoundId: roundId,
        usuarioId: usuario.id,
        betSlot: betId || 1,
      });
    }

    return {
      ok: true,
      gold: realToGold(newBalance),
      balance: newBalance,
      usuario,
    };
  }

  return { getBalance, debit, credit, refund, recordLoss, findUsuario, realToGold, goldToReal };
}
