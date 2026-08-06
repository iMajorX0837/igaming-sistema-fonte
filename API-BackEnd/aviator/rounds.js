/** Persistência de rodadas, velas e apostas do Aviator no Supabase. */

import { goldToReal, realToGold } from './wallet.js';

/** Mesmo limite exibido no histórico do cliente Aviator. */
export const MAX_VELAS = 27;

function mapRoundStatus(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'open' || s === 'waiting') return 'waiting';
  if (s === 'flying' || s === 'playing') return 'flying';
  if (s === 'crashed' || s === 'ending') return 'crashed';
  return 'waiting';
}

function parseTimestamp(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function mapVelaRowToPython(velaRow, roundRow) {
  const mul = Number(velaRow?.multiplier ?? roundRow?.final_multiplier ?? roundRow?.target_multiplier ?? 0);
  const extId = Number(velaRow?.external_round_id ?? roundRow?.external_round_id);
  return {
    round_id: extId,
    crash_mul: Math.round(mul * 100),
    crash_x: mul,
    server_seed: roundRow?.server_seed || '',
    started_at: roundRow?.started_at || velaRow?.created_at || null,
    crashed_at: roundRow?.crashed_at || velaRow?.created_at || null,
    bet_count: 0,
    player_bet_count: 0,
    total_bet_usd: 0,
    total_cashout_usd: 0,
    player_gold: null,
    status: 'crashed',
    created_at: velaRow?.created_at || roundRow?.created_at || null,
  };
}

function mapBetRowToPython(bet, usuario) {
  const betGold = realToGold(bet.bet_amount);
  const profitGold = realToGold(bet.profit);
  const cashoutGold =
    bet.cashout_multiplier != null ? Math.round(betGold * Number(bet.cashout_multiplier)) : 0;

  return {
    userid: usuario?.email || String(bet.usuario_id || ''),
    name: usuario?.nome || 'Jogador',
    bet_id: Number(bet.bet_slot) || 1,
    bet_usd: betGold,
    co_usd: bet.status === 'cashed_out' ? cashoutGold || profitGold + betGold : 0,
    co_rate: bet.cashout_multiplier != null ? Math.round(Number(bet.cashout_multiplier) * 100) : 0,
    is_bot: 0,
    icon: '1',
  };
}

export function createAviatorRounds(supabase) {
  async function findRoundByExternalId(externalRoundId) {
    const extId = Number(externalRoundId);
    if (!Number.isFinite(extId)) return null;

    const { data } = await supabase
      .from('aviator_rounds')
      .select('*')
      .eq('external_round_id', extId)
      .maybeSingle();

    return data;
  }

  async function getOrCreateRound(externalRoundId, fields = {}) {
    const existing = await findRoundByExternalId(externalRoundId);
    if (existing) return existing;

    const crashX = fields.crashX ?? fields.targetMultiplier ?? fields.finalMultiplier;
    const insert = {
      external_round_id: Number(externalRoundId),
      target_multiplier: crashX != null ? Number(crashX) : 1.01,
      final_multiplier: fields.finalMultiplier != null ? Number(fields.finalMultiplier) : null,
      status: mapRoundStatus(fields.status),
      started_at: parseTimestamp(fields.startedAt),
      crashed_at: parseTimestamp(fields.crashedAt),
      server_seed: fields.serverSeed || null,
    };

    const { data, error } = await supabase.from('aviator_rounds').insert(insert).select().single();

    if (error) {
      if (error.code === '23505') {
        return findRoundByExternalId(externalRoundId);
      }
      console.error('[AVIATOR ROUNDS] Erro ao criar rodada:', error.message, error.details || '', error.hint || '');
      return null;
    }

    return data;
  }

  async function updateRound(externalRoundId, fields = {}) {
    const round = await getOrCreateRound(externalRoundId, fields);
    if (!round) return null;

    const patch = {};
    if (fields.crashX != null || fields.targetMultiplier != null) {
      patch.target_multiplier = Number(fields.crashX ?? fields.targetMultiplier);
    }
    if (fields.finalMultiplier != null) patch.final_multiplier = Number(fields.finalMultiplier);
    if (fields.status != null) patch.status = mapRoundStatus(fields.status);
    if (fields.startedAt != null) patch.started_at = parseTimestamp(fields.startedAt);
    if (fields.crashedAt != null) patch.crashed_at = parseTimestamp(fields.crashedAt);
    if (fields.serverSeed != null) patch.server_seed = fields.serverSeed;

    if (!Object.keys(patch).length) return round;

    const { data, error } = await supabase
      .from('aviator_rounds')
      .update(patch)
      .eq('id', round.id)
      .select()
      .single();

    if (error) {
      console.error('[AVIATOR ROUNDS] Erro ao atualizar rodada:', error.message);
      return round;
    }

    return data;
  }

  async function trimVelas() {
    const { count, error: countErr } = await supabase
      .from('aviator_velas')
      .select('id', { count: 'exact', head: true });

    if (countErr) {
      console.error('[AVIATOR ROUNDS] Erro ao contar velas:', countErr.message);
      return { removed: 0 };
    }

    if (!count || count <= MAX_VELAS) return { removed: 0 };

    const excess = count - MAX_VELAS;
    const { data: oldest, error } = await supabase
      .from('aviator_velas')
      .select('id, round_id')
      .order('created_at', { ascending: true })
      .limit(excess);

    if (error || !oldest?.length) {
      console.error('[AVIATOR ROUNDS] Erro ao buscar velas antigas:', error?.message);
      return { removed: 0 };
    }

    const velaIds = oldest.map((v) => v.id);
    const roundIds = [...new Set(oldest.map((v) => v.round_id).filter(Boolean))];

    const { error: delVelasErr } = await supabase.from('aviator_velas').delete().in('id', velaIds);
    if (delVelasErr) {
      console.error('[AVIATOR ROUNDS] Erro ao podar velas:', delVelasErr.message);
      return { removed: 0 };
    }

    if (roundIds.length) {
      await supabase.from('aviator_bets').delete().in('round_id', roundIds);
      await supabase.from('aviator_rounds').delete().in('id', roundIds);
    }

    console.log(`[AVIATOR ROUNDS] Podadas ${velaIds.length} vela(s); mantidas ${MAX_VELAS} no Supabase`);
    return { removed: velaIds.length };
  }

  async function insertVela(roundUuid, multiplier, externalRoundId) {
    if (!roundUuid || multiplier == null) return false;

    const { data: existing } = await supabase
      .from('aviator_velas')
      .select('id, external_round_id')
      .eq('round_id', roundUuid)
      .maybeSingle();

    if (existing) {
      if (externalRoundId != null && !existing.external_round_id) {
        await supabase
          .from('aviator_velas')
          .update({ external_round_id: Number(externalRoundId) })
          .eq('id', existing.id);
      }
      return false;
    }

    const { error } = await supabase.from('aviator_velas').insert({
      round_id: roundUuid,
      multiplier: Number(multiplier),
      external_round_id: externalRoundId != null ? Number(externalRoundId) : null,
    });

    if (error && error.code !== '23505') {
      console.error('[AVIATOR ROUNDS] Erro ao inserir vela:', error.message);
      return false;
    }

    return !error;
  }

  /** Sincronização completa enviada pelo motor Python (save_vela). */
  async function syncRound(payload = {}) {
    const externalRoundId = Number(payload.roundId);
    if (!Number.isFinite(externalRoundId)) {
      return { ok: false, error: 'roundId inválido' };
    }

    const crashX = payload.crashX ?? (payload.crashMul ? payload.crashMul / 100 : null);
    const status = mapRoundStatus(payload.status);

    const round = await updateRound(externalRoundId, {
      crashX,
      targetMultiplier: crashX,
      finalMultiplier: status === 'crashed' ? crashX : undefined,
      status: status === 'crashed' ? 'crashed' : 'waiting',
      startedAt: payload.startedAt,
      crashedAt: payload.crashedAt,
      serverSeed: payload.serverSeed,
    });

    if (!round) return { ok: false, error: 'Falha ao salvar rodada' };

    if (status === 'crashed' && crashX != null) {
      await insertVela(round.id, crashX, externalRoundId);
      // Sempre podar: o trigger do Supabase pode inserir a vela antes e pular o insert acima.
      await trimVelas();
    }

    return { ok: true, roundId: round.id, externalRoundId };
  }

  async function findBet(roundUuid, usuarioId, betSlot) {
    const { data } = await supabase
      .from('aviator_bets')
      .select('*')
      .eq('round_id', roundUuid)
      .eq('usuario_id', usuarioId)
      .eq('bet_slot', Number(betSlot) || 1)
      .maybeSingle();

    return data;
  }

  async function placeBet({ externalRoundId, usuarioId, betSlot, betGold }) {
    const round = await getOrCreateRound(externalRoundId, { status: 'waiting' });
    if (!round) return null;

    const slot = Number(betSlot) || 1;
    const existing = await findBet(round.id, usuarioId, slot);
    if (existing) return existing;

    const { data, error } = await supabase
      .from('aviator_bets')
      .insert({
        round_id: round.id,
        usuario_id: usuarioId,
        bet_slot: slot,
        bet_amount: goldToReal(betGold),
        profit: 0,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') return findBet(round.id, usuarioId, slot);
      console.error('[AVIATOR ROUNDS] Erro ao registrar aposta:', error.message);
      return null;
    }

    await supabase.from('aviator_rounds').update({ status: 'flying' }).eq('id', round.id);

    return data;
  }

  async function cashoutBet({ externalRoundId, usuarioId, betSlot, cashoutMultiplier, profitGold }) {
    const round = await findRoundByExternalId(externalRoundId);
    if (!round) return null;

    const slot = Number(betSlot) || 1;
    const bet = await findBet(round.id, usuarioId, slot);
    if (!bet) return null;

    const mul = Number(cashoutMultiplier) / 100;
    const profit = goldToReal(profitGold);

    const { data, error } = await supabase
      .from('aviator_bets')
      .update({
        status: 'cashed_out',
        cashout_multiplier: Number.isFinite(mul) ? mul : null,
        profit,
        cashed_out_at: new Date().toISOString(),
      })
      .eq('id', bet.id)
      .select()
      .single();

    if (error) {
      console.error('[AVIATOR ROUNDS] Erro ao cashout aposta:', error.message);
      return bet;
    }

    return data;
  }

  async function crashBet({ externalRoundId, usuarioId, betSlot }) {
    const round = await findRoundByExternalId(externalRoundId);
    if (!round) return null;

    const slot = Number(betSlot) || 1;
    const bet = await findBet(round.id, usuarioId, slot);
    if (!bet || bet.status !== 'active') return bet;

    const { data, error } = await supabase
      .from('aviator_bets')
      .update({ status: 'crashed', profit: 0 })
      .eq('id', bet.id)
      .select()
      .single();

    if (error) {
      console.error('[AVIATOR ROUNDS] Erro ao marcar aposta crash:', error.message);
      return bet;
    }

    return data;
  }

  async function cancelBet({ externalRoundId, usuarioId, betSlot }) {
    const round = await findRoundByExternalId(externalRoundId);
    if (!round) return null;

    const slot = Number(betSlot) || 1;
    const bet = await findBet(round.id, usuarioId, slot);
    if (!bet) return null;

    const { error } = await supabase.from('aviator_bets').delete().eq('id', bet.id);

    if (error) {
      console.error('[AVIATOR ROUNDS] Erro ao cancelar aposta:', error.message);
    }

    return { ok: !error };
  }

  async function listVelas(limit = MAX_VELAS) {
    const safeLimit = Math.max(1, Math.min(Number(limit) || MAX_VELAS, MAX_VELAS));
    const { data, error } = await supabase
      .from('aviator_velas')
      .select('multiplier, created_at, external_round_id')
      .order('created_at', { ascending: false })
      .limit(safeLimit);

    if (error) {
      console.error('[AVIATOR ROUNDS] Erro ao listar velas:', error.message);
      return [];
    }

    return data || [];
  }

  async function listVelasDetailed(limit = MAX_VELAS) {
    const safeLimit = Math.max(1, Math.min(Number(limit) || MAX_VELAS, MAX_VELAS));
    const { data, error } = await supabase
      .from('aviator_velas')
      .select(
        `
        multiplier,
        created_at,
        external_round_id,
        round:round_id (
          external_round_id,
          server_seed,
          started_at,
          crashed_at,
          target_multiplier,
          final_multiplier,
          created_at
        )
      `
      )
      .order('created_at', { ascending: false })
      .limit(safeLimit);

    if (error) {
      console.error('[AVIATOR ROUNDS] Erro ao listar velas detalhadas:', error.message);
      return { ok: false, total: 0, velas: [] };
    }

    const velas = (data || []).map((row) => mapVelaRowToPython(row, row.round));
    return { ok: true, total: velas.length, velas };
  }

  async function listUserBetHistory({ usuarioId, lastId = 0, dateStamp = 0, size = 10 } = {}) {
    if (!usuarioId) {
      return { bets: [], isMorePagesAvailable: false, lastBetId: 0, lastDateStamp: 0 };
    }

    const pageSize = Math.max(1, Math.min(Number(size) || 10, 50));
    let query = supabase
      .from('aviator_bets')
      .select(
        `
        id,
        bet_slot,
        bet_amount,
        cashout_multiplier,
        profit,
        status,
        placed_at,
        cashed_out_at,
        round:round_id (
          external_round_id,
          final_multiplier,
          target_multiplier,
          crashed_at,
          status
        )
      `
      )
      .eq('usuario_id', usuarioId)
      .in('status', ['cashed_out', 'crashed'])
      .order('placed_at', { ascending: false })
      .limit(pageSize + 1);

    if (Number(dateStamp) > 0) {
      query = query.lt('placed_at', new Date(Number(dateStamp)).toISOString());
    }

    const { data, error } = await query;
    if (error) {
      console.error('[AVIATOR ROUNDS] Erro ao listar histórico de apostas:', error.message);
      return { bets: [], isMorePagesAvailable: false, lastBetId: 0, lastDateStamp: 0 };
    }

    const rows = data || [];
    const hasMore = rows.length > pageSize;
    const pageRows = hasMore ? rows.slice(0, pageSize) : rows;

    const bets = pageRows.map((row) => {
      const round = row.round || {};
      const extRoundId = Number(round.external_round_id) || 0;
      const betSlot = Number(row.bet_slot) || 1;
      const betAmount = Number(row.bet_amount) || 0;
      const isWin = row.status === 'cashed_out';
      const eventDate = row.cashed_out_at || round.crashed_at || row.placed_at;
      const eventMs = eventDate ? new Date(eventDate).getTime() : Date.now();
      const roundBetId = extRoundId * 10 + betSlot;

      return {
        bet: betAmount,
        winAmount: isWin ? Number(row.profit) || betAmount : 0,
        payout: isWin ? Number(row.cashout_multiplier) || 0 : 0,
        maxMultiplier: Number(round.final_multiplier || round.target_multiplier) || 0,
        cashOutDate: eventMs,
        roundId: extRoundId,
        roundBetId,
        betId: betSlot,
        isFreeBet: false,
      };
    });

    const last = bets[bets.length - 1];
    return {
      bets,
      isMorePagesAvailable: hasMore,
      lastBetId: last?.roundBetId || Number(lastId) || 0,
      lastDateStamp: last?.cashOutDate || Number(dateStamp) || 0,
    };
  }

  async function getVelaDetail(externalRoundId) {
    const extId = Number(externalRoundId);
    if (!Number.isFinite(extId)) return null;

    const round = await findRoundByExternalId(extId);
    if (!round) return null;

    const { data: vela } = await supabase
      .from('aviator_velas')
      .select('multiplier, created_at, external_round_id')
      .eq('round_id', round.id)
      .maybeSingle();

    const { data: bets } = await supabase
      .from('aviator_bets')
      .select(
        `
        bet_slot,
        bet_amount,
        cashout_multiplier,
        profit,
        status,
        usuario_id,
        usuario:usuario_id ( nome, email )
      `
      )
      .eq('round_id', round.id);

    return {
      ok: true,
      vela: mapVelaRowToPython(vela || { external_round_id: extId, multiplier: round.final_multiplier ?? round.target_multiplier }, round),
      bets: (bets || []).map((bet) => mapBetRowToPython(bet, bet.usuario)),
    };
  }

  return {
    syncRound,
    placeBet,
    cashoutBet,
    crashBet,
    cancelBet,
    listVelas,
    listVelasDetailed,
    getVelaDetail,
    listUserBetHistory,
    trimVelas,
    findRoundByExternalId,
  };
}
