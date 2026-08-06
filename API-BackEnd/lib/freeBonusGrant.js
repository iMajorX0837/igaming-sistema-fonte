/**
 * Valida e consome cupom_uso antes de conceder rodadas na PlayFivers.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
export async function validateCupomUsoForFreeBonusGrant(
  supabase,
  userId,
  cupomUsoId,
  { rounds } = {}
) {
  if (!cupomUsoId) {
    return { ok: false, status: 400, msg: 'cupom_uso_id obrigatório' };
  }

  const { data: uso, error } = await supabase
    .from('cupom_usos')
    .select(
      'id, usuario_id, quantidade_giros, status_giro, jogo_slug, jogo_nome, cupom_id, cupons(tipo_bonus, jogo_slug, jogo_nome, valor, provider_slug)'
    )
    .eq('id', cupomUsoId)
    .eq('usuario_id', userId)
    .maybeSingle();

  if (error || !uso) {
    return { ok: false, status: 403, msg: 'Rodadas não disponíveis para ativação' };
  }

  if (uso.status_giro !== 'disponivel') {
    return {
      ok: false,
      status: 403,
      msg: 'Rodadas já ativadas ou aguardando depósito',
    };
  }

  const cupom = Array.isArray(uso.cupons) ? uso.cupons[0] : uso.cupons;
  if (!cupom || cupom.tipo_bonus !== 'giros_gratis') {
    return { ok: false, status: 403, msg: 'Cupom inválido para rodadas grátis' };
  }

  const expectedRounds = Number(uso.quantidade_giros ?? cupom.valor);
  const requestedRounds = Number(rounds);

  if (!Number.isFinite(expectedRounds) || expectedRounds <= 0) {
    return { ok: false, status: 400, msg: 'Quantidade de rodadas inválida no cupom' };
  }

  if (Number.isFinite(requestedRounds) && requestedRounds !== expectedRounds) {
    return { ok: false, status: 400, msg: 'Quantidade de rodadas não confere com o prêmio' };
  }

  return {
    ok: true,
    uso,
    cupom,
    rounds: expectedRounds,
    jogo_slug: uso.jogo_slug || cupom.jogo_slug,
    jogo_nome: uso.jogo_nome || cupom.jogo_nome,
    provider_slug: cupom.provider_slug,
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 */
export async function markCupomUsoFreeBonusGranted(supabase, cupomUsoId, userId) {
  const { data, error } = await supabase
    .from('cupom_usos')
    .update({ status_giro: 'usado' })
    .eq('id', cupomUsoId)
    .eq('usuario_id', userId)
    .eq('status_giro', 'disponivel')
    .select('id')
    .maybeSingle();

  if (error || !data) {
    return { ok: false, msg: 'Não foi possível registrar a ativação das rodadas' };
  }

  return { ok: true };
}
