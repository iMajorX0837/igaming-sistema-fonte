import crypto from 'crypto';

const RETRY_DELAYS_MS = [0, 2000, 5000];
const REQUEST_TIMEOUT_MS = 15000;

function buildSignature(secret, timestamp, body) {
  const payload = `${timestamp}.${body}`;
  return `sha256=${crypto.createHmac('sha256', secret).update(payload).digest('hex')}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postWithTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {object} webhook
 * @param {string} eventName
 * @param {object} data
 * @param {{ test?: boolean }} [opts]
 */
export async function deliverWebhook(supabase, webhook, eventName, data, opts = {}) {
  const deliveryId = crypto.randomUUID();
  const timestamp = Math.floor(Date.now() / 1000);
  const envelope = {
    id: deliveryId,
    event: eventName,
    timestamp: new Date(timestamp * 1000).toISOString(),
    test: opts.test === true,
    data,
  };
  const body = JSON.stringify(envelope);
  const signature = buildSignature(webhook.secret_key, timestamp, body);

  const { error: insertError } = await supabase.from('webhook_deliveries').insert({
    id: deliveryId,
    webhook_id: webhook.id,
    evento: eventName,
    payload: envelope,
    status: 'pending',
    tentativas: 0,
  });

  if (insertError) {
    console.error('[webhooks] Erro ao registrar delivery:', insertError);
  }

  let lastError = null;
  let lastStatus = null;
  let lastBody = null;

  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
    if (RETRY_DELAYS_MS[attempt] > 0) {
      await sleep(RETRY_DELAYS_MS[attempt]);
    }

    try {
      const response = await postWithTimeout(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': 'VenuzBET-Webhooks/1.0',
          'X-Webhook-Event': eventName,
          'X-Webhook-Timestamp': String(timestamp),
          'X-Webhook-Signature': signature,
          'X-Webhook-Delivery-Id': deliveryId,
        },
        body,
      });

      lastStatus = response.status;
      lastBody = await response.text();

      if (response.ok) {
        await supabase
          .from('webhook_deliveries')
          .update({
            status: 'success',
            http_status: response.status,
            response_body: lastBody?.slice(0, 4000) ?? null,
            tentativas: attempt + 1,
            delivered_at: new Date().toISOString(),
            erro: null,
          })
          .eq('id', deliveryId);

        return { ok: true, deliveryId, httpStatus: response.status };
      }

      lastError = `HTTP ${response.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Erro de rede';
    }

    await supabase
      .from('webhook_deliveries')
      .update({
        tentativas: attempt + 1,
        http_status: lastStatus,
        response_body: lastBody?.slice(0, 4000) ?? null,
        erro: lastError,
      })
      .eq('id', deliveryId);
  }

  await supabase
    .from('webhook_deliveries')
    .update({
      status: 'failed',
      http_status: lastStatus,
      response_body: lastBody?.slice(0, 4000) ?? null,
      erro: lastError,
    })
    .eq('id', deliveryId);

  return { ok: false, deliveryId, error: lastError, httpStatus: lastStatus };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} eventName
 * @param {object} data
 * @param {{ test?: boolean, webhookId?: string }} [opts]
 */
export async function dispatchWebhookEvent(supabase, eventName, data, opts = {}) {
  try {
    let query = supabase.from('webhooks').select('*').eq('ativo', true);

    if (opts.webhookId) {
      query = query.eq('id', opts.webhookId);
    } else {
      query = query.eq('evento', eventName);
    }

    const { data: hooks, error } = await query;

    if (error) {
      console.error('[webhooks] Erro ao buscar webhooks:', error);
      return [];
    }

    if (!hooks?.length) {
      return [];
    }

    const results = await Promise.allSettled(
      hooks.map((hook) => deliverWebhook(supabase, hook, hook.evento, data, opts))
    );

    return results;
  } catch (err) {
    console.error('[webhooks] dispatchWebhookEvent:', err);
    return [];
  }
}

export function buildTestPayload(eventName) {
  const now = new Date().toISOString();
  if (eventName === 'deposit.paid') {
    return {
      deposito_id: '00000000-0000-0000-0000-000000000001',
      usuario_id: '00000000-0000-0000-0000-000000000002',
      fullName: 'João Silva',
      email: 'teste@exemplo.com',
      phone: '11999999999',
      country: 'BR',
      valor: 100,
      moeda: 'BRL',
      status: 'aprovado',
      origem: 'pix',
      test: true,
      timestamp: now,
    };
  }

  if (eventName === 'deposit.created') {
    return {
      deposito_id: '00000000-0000-0000-0000-000000000001',
      usuario_id: '00000000-0000-0000-0000-000000000002',
      fullName: 'João Silva',
      email: 'teste@exemplo.com',
      phone: '11999999999',
      document: '00000000000',
      createdAt: now,
      valor: 100,
      moeda: 'BRL',
      status: 'pendente',
      origem: 'pix',
      test: true,
      timestamp: now,
    };
  }

  if (eventName === 'withdraw.approved') {
    return {
      saque_id: '00000000-0000-0000-0000-000000000003',
      usuario_id: '00000000-0000-0000-0000-000000000002',
      fullName: 'João Silva',
      email: 'teste@exemplo.com',
      phone: '11999999999',
      document: '00000000000',
      country: 'BR',
      valor: 50,
      moeda: 'BRL',
      status: 'aprovado',
      pix_key_type: 'cpf',
      pix_key: '12345678909',
      misticpay_job_id: 'withdraw-test-job',
      misticpay_transaction_id: '12345',
      misticpay_status: 'QUEUED',
      test: true,
      timestamp: now,
    };
  }

  return {
    fullName: 'João Silva',
    email: 'teste@exemplo.com',
    phone: '11999999999',
    document: '00000000000',
    createdAt: now,
    utm_source: 'facebook',
    utm_campaign: 'teste_webhook',
    fbclid: 'test-fbclid',
    test: true,
    timestamp: now,
  };
}
