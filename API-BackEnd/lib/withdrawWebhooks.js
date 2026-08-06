/**
 * Helpers para disparar webhooks de saque.
 */

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {Function} dispatchWebhookEvent
 * @param {object} opts
 */
export async function dispatchWithdrawApprovedWebhook(
  supabase,
  dispatchWebhookEvent,
  { saqueId, usuarioId, email, valor, pixKey, pixKeyType, misticpay }
) {
  if (typeof dispatchWebhookEvent !== 'function') return;

  const { data: profile } = await supabase
    .from('usuarios')
    .select('nome, usuario_nome, cpf, email, telefone, pais')
    .eq('id', usuarioId)
    .maybeSingle();

  void dispatchWebhookEvent(supabase, 'withdraw.approved', {
    saque_id: saqueId,
    usuario_id: usuarioId,
    fullName: profile?.usuario_nome ?? profile?.nome ?? null,
    email: profile?.email ?? email ?? null,
    phone: profile?.telefone ?? null,
    document: profile?.cpf ?? null,
    country: profile?.pais ?? 'BR',
    valor,
    moeda: 'BRL',
    status: 'aprovado',
    pix_key_type: pixKeyType ?? null,
    pix_key: pixKey ?? null,
    misticpay_job_id: misticpay?.jobId ?? null,
    misticpay_transaction_id: misticpay?.transactionId ?? null,
    misticpay_status: misticpay?.status ?? null,
    timestamp: new Date().toISOString(),
  });
}
