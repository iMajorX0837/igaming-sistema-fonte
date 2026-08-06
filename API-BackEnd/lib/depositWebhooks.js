/**
 * Helpers para disparar webhooks de depósito.
 */

export function parseRpcJson(data) {
  if (data == null) return null;
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return data;
}

/** Dispara deposit.paid salvo quando o RPC indica confirmação idempotente (already: true). */
export function shouldDispatchDepositPaid(rpcRow) {
  const row = parseRpcJson(rpcRow);
  if (!row || row.ok === false) return false;
  return row.already !== true;
}

async function loadDepositContext(supabase, depositoId, usuarioId) {
  const [{ data: depRow }, { data: profile }] = await Promise.all([
    supabase
      .from('depositos')
      .select('id, valor, origem, cupom_codigo, status, created_at, usuario_id')
      .eq('id', depositoId)
      .maybeSingle(),
    supabase
      .from('usuarios')
      .select(
        'nome, usuario_nome, cpf, email, telefone, pais, created_at, utm_source, utm_medium, utm_campaign, utm_content, utm_term, fbclid, fbc, fbp'
      )
      .eq('id', usuarioId)
      .maybeSingle(),
  ]);

  return { depRow, profile };
}

function buildTrackingFields(profile) {
  return {
    utm_source: profile?.utm_source ?? null,
    utm_medium: profile?.utm_medium ?? null,
    utm_campaign: profile?.utm_campaign ?? null,
    utm_content: profile?.utm_content ?? null,
    utm_term: profile?.utm_term ?? null,
    fbclid: profile?.fbclid ?? null,
    fbc: profile?.fbc ?? null,
    fbp: profile?.fbp ?? null,
  };
}

function buildUserIdentityFields(profile, createdAt) {
  return {
    fullName: profile?.usuario_nome ?? profile?.nome ?? null,
    email: profile?.email ?? null,
    phone: profile?.telefone ?? null,
    document: profile?.cpf ?? null,
    createdAt: createdAt ?? profile?.created_at ?? null,
  };
}

function buildDepositPaidIdentityFields(profile, emailFallback) {
  return {
    fullName: profile?.usuario_nome ?? profile?.nome ?? null,
    email: profile?.email ?? emailFallback ?? null,
    phone: profile?.telefone ?? null,
    country: profile?.pais ?? 'BR',
  };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {Function} dispatchWebhookEvent
 * @param {object} opts
 */
export async function dispatchDepositCreatedWebhook(
  supabase,
  dispatchWebhookEvent,
  { depositoId, usuarioId, email, valor, cupomCodigo, origem = 'pix' }
) {
  if (typeof dispatchWebhookEvent !== 'function' || !depositoId || !usuarioId) {
    return;
  }

  try {
    const { depRow, profile } = await loadDepositContext(supabase, depositoId, usuarioId);

    const depositCreatedAt = depRow?.created_at ?? new Date().toISOString();

    void dispatchWebhookEvent(supabase, 'deposit.created', {
      deposito_id: depositoId,
      usuario_id: usuarioId,
      valor: depRow?.valor ?? valor ?? null,
      moeda: 'BRL',
      status: depRow?.status ?? 'pendente',
      origem: depRow?.origem ?? origem,
      cupom_codigo: depRow?.cupom_codigo ?? cupomCodigo ?? null,
      ...buildUserIdentityFields(profile ?? { email }, depositCreatedAt),
      ...buildTrackingFields(profile),
    });
  } catch (err) {
    console.error('[webhooks] dispatchDepositCreatedWebhook:', err);
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {Function} dispatchWebhookEvent
 * @param {object} opts
 */
export async function dispatchDepositPaidWebhook(
  supabase,
  dispatchWebhookEvent,
  { depositoId, usuarioId, email, cupomCodigo, vip = null }
) {
  if (typeof dispatchWebhookEvent !== 'function' || !depositoId || !usuarioId) {
    return;
  }

  try {
    const { depRow, profile } = await loadDepositContext(supabase, depositoId, usuarioId);

    void dispatchWebhookEvent(supabase, 'deposit.paid', {
      deposito_id: depositoId,
      usuario_id: usuarioId,
      valor: depRow?.valor ?? null,
      moeda: 'BRL',
      status: depRow?.status ?? 'aprovado',
      origem: depRow?.origem ?? 'pix',
      cupom_codigo: depRow?.cupom_codigo ?? cupomCodigo ?? null,
      ...buildDepositPaidIdentityFields(profile, email),
      ...buildTrackingFields(profile),
      vip,
    });
  } catch (err) {
    console.error('[webhooks] dispatchDepositPaidWebhook:', err);
  }
}

/**
 * Dispara deposit.paid após RPC de confirmação, se aplicável.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {Function} dispatchWebhookEvent
 * @param {string} rpcName
 * @param {object} params
 * @param {unknown} rpcData
 * @param {string | undefined} fallbackUserId
 */
export async function maybeDispatchDepositPaidFromRpc(
  supabase,
  dispatchWebhookEvent,
  rpcName,
  params,
  rpcData,
  fallbackUserId
) {
  if (typeof dispatchWebhookEvent !== 'function') return;

  const depositoId = params?.p_deposito_id ?? params?.p_depositoId ?? null;
  if (!depositoId) return;

  const row = parseRpcJson(rpcData);
  if (!shouldDispatchDepositPaid(row)) return;

  let usuarioId = fallbackUserId ?? null;

  if (!usuarioId) {
    const { data: depRow } = await supabase
      .from('depositos')
      .select('usuario_id')
      .eq('id', depositoId)
      .maybeSingle();
    usuarioId = depRow?.usuario_id ?? null;
  }

  if (!usuarioId) return;

  await dispatchDepositPaidWebhook(supabase, dispatchWebhookEvent, {
    depositoId,
    usuarioId,
    cupomCodigo: params?.p_codigo ?? null,
    vip: row,
  });
}
