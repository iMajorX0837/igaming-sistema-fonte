/** Carteira Aviator integrada ao Supabase (RPC atômica — H3). */

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

function buildAviatorTxnId(usuarioId, roundId, betId, suffix) {
  return `aviator_${usuarioId}_${roundId || 0}_${betId || 1}_${suffix}`;
}

function mapRpcError(result, fallbackGold = 0) {
  const err = result?.error;
  if (err === 'INVALID_USER') {
    return { ok: false, status: 404, error: 'Usuário não encontrado', gold: fallbackGold };
  }
  if (err === 'INSUFFICIENT_FUNDS') {
    return {
      ok: false,
      status: 400,
      error: 'Saldo insuficiente',
      gold: realToGold(result?.balance ?? 0),
      balance: Number(result?.balance ?? 0),
    };
  }
  if (err === 'INVALID_AMOUNT') {
    return { ok: false, status: 400, error: 'Valor inválido' };
  }
  return { ok: false, status: 500, error: err || 'Erro na carteira' };
}

export function createAviatorWallet(supabase, rounds = null) {
  async function findUsuario(userCode) {
    const email = String(userCode || '').trim();
    if (!email) return null;

    let { data: usuario } = await supabase
      .from('usuarios')
      .select('id, saldo, saldo_bonus, carteira_ativa, email, nome')
      .eq('email', email)
      .maybeSingle();

    if (!usuario) {
      const { data: usuarioIlike } = await supabase
        .from('usuarios')
        .select('id, saldo, saldo_bonus, carteira_ativa, email, nome')
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

  function resolvePlayableBalance(usuario) {
    const carteira = usuario?.carteira_ativa === 'bonus' ? 'bonus' : 'real';
    if (carteira === 'bonus') {
      return parseFloat(usuario.saldo_bonus) || 0;
    }
    return parseFloat(usuario.saldo) || 0;
  }

  async function getBalance(userCode) {
    const usuario = await findUsuario(userCode);
    if (!usuario) {
      return { ok: false, status: 404, error: 'Usuário não encontrado', gold: 0, balance: 0 };
    }
    const balance = resolvePlayableBalance(usuario);
    return {
      ok: true,
      usuario,
      balance,
      gold: realToGold(balance),
      nickName: usuario.nome || usuario.email.split('@')[0],
    };
  }

  async function debit({ userCode, gold, betId, roundId, txnSuffix = 'bet' }) {
    const betGold = Math.round(Number(gold) || 0);
    if (betGold <= 0) {
      return { ok: false, status: 400, error: 'Valor da aposta inválido' };
    }

    const usuario = await findUsuario(userCode);
    if (!usuario) {
      return { ok: false, status: 404, error: 'Usuário não encontrado' };
    }

    const betReal = goldToReal(betGold);
    const txnId = buildAviatorTxnId(usuario.id, roundId, betId, txnSuffix || 'bet');

    const { data: rpcResult, error: rpcError } = await supabase.rpc('aviator_debit_saldo', {
      p_email: userCode,
      p_valor: betReal,
      p_txn_id: txnId,
    });

    if (rpcError) {
      return { ok: false, status: 500, error: 'Erro ao debitar saldo' };
    }

    const result = rpcResult && typeof rpcResult === 'object' ? rpcResult : {};
    if (!result.ok) {
      return mapRpcError(result, realToGold(resolvePlayableBalance(usuario)));
    }

    const newBalance = Number(result.balance);

    if (!result.duplicate && rounds && roundId && usuario?.id) {
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
      usuario: { ...usuario, saldo: newBalance },
      duplicate: !!result.duplicate,
    };
  }

  async function credit({
    userCode,
    gold,
    betId,
    roundId,
    tipo = 'Ganhou',
    betGold = 0,
    txnSuffix = 'win',
    cashoutMultiplier = 0,
  }) {
    const winGold = Math.round(Number(gold) || 0);
    if (winGold <= 0) {
      return { ok: false, status: 400, error: 'Valor de crédito inválido' };
    }

    const usuario = await findUsuario(userCode);
    if (!usuario) {
      return { ok: false, status: 404, error: 'Usuário não encontrado' };
    }

    const winReal = goldToReal(winGold);
    const txnId = buildAviatorTxnId(usuario.id, roundId, betId, txnSuffix || 'win');

    const { data: rpcResult, error: rpcError } = await supabase.rpc('aviator_creditar_saldo', {
      p_email: userCode,
      p_valor: winReal,
      p_txn_id: txnId,
      p_bet_valor: goldToReal(betGold || 0),
      p_tipo: tipo,
    });

    if (rpcError) {
      return { ok: false, status: 500, error: 'Erro ao creditar saldo' };
    }

    const result = rpcResult && typeof rpcResult === 'object' ? rpcResult : {};
    if (!result.ok) {
      return mapRpcError(result);
    }

    const newBalance = Number(result.balance);

    if (!result.duplicate && rounds && roundId && usuario?.id) {
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
      usuario: { ...usuario, saldo: newBalance },
      duplicate: !!result.duplicate,
    };
  }

  async function recordLoss({ userCode, betGold, roundId, betId }) {
    const usuario = await findUsuario(userCode);
    if (!usuario) return { ok: false };

    const betReal = goldToReal(betGold);
    const txnId = buildAviatorTxnId(usuario.id, roundId, betId, 'crash');

    const { data: rpcResult, error: rpcError } = await supabase.rpc('aviator_registrar_perda', {
      p_email: userCode,
      p_txn_id: txnId,
      p_bet_valor: betReal,
    });

    if (rpcError) {
      return { ok: false, error: rpcError.message };
    }

    const result = rpcResult && typeof rpcResult === 'object' ? rpcResult : {};
    if (!result.ok) {
      return { ok: false, error: result.error || 'Erro ao registrar perda' };
    }

    if (!result.duplicate && rounds && roundId && usuario?.id) {
      await rounds.crashBet({
        externalRoundId: roundId,
        usuarioId: usuario.id,
        betSlot: betId || 1,
      });
    }

    return { ok: true, duplicate: !!result.duplicate };
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

    const refundReal = goldToReal(refundGold);
    const txnId = buildAviatorTxnId(usuario.id, roundId, betId, 'refund');

    const { data: rpcResult, error: rpcError } = await supabase.rpc('aviator_reembolsar_saldo', {
      p_email: userCode,
      p_valor: refundReal,
      p_txn_id: txnId,
    });

    if (rpcError) {
      return { ok: false, status: 500, error: 'Erro ao reembolsar saldo' };
    }

    const result = rpcResult && typeof rpcResult === 'object' ? rpcResult : {};
    if (!result.ok) {
      return mapRpcError(result);
    }

    const newBalance = Number(result.balance);

    if (!result.duplicate && rounds && roundId && usuario?.id) {
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
      usuario: { ...usuario, saldo: newBalance },
      duplicate: !!result.duplicate,
    };
  }

  return { getBalance, debit, credit, refund, recordLoss, findUsuario, realToGold, goldToReal };
}
