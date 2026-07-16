import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { dispatchWebhookEvent, buildTestPayload } from '../lib/webhookDispatcher.js';

/**
 * @param {{
 *   supabase: import('@supabase/supabase-js').SupabaseClient;
 *   supabaseUrl: string;
 *   supabaseAnonKey: string;
 * }} deps
 */
export function createWebhooksAdminRouter({ supabase, supabaseUrl, supabaseAnonKey }) {
  const router = Router();

  async function requireAdmin(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ ok: false, message: 'Não autenticado' });
    }

    const token = authHeader.slice(7).trim();
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return res.status(401).json({ ok: false, message: 'Sessão inválida' });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: cargo, error: cargoError } = await userClient.rpc('get_user_cargo');
    if (cargoError || cargo !== 'admin') {
      return res.status(403).json({ ok: false, message: 'Acesso negado' });
    }

    req.adminUser = userData.user;
    next();
  }

  /** POST /api/webhooks/test — envia payload de teste */
  router.post('/test', requireAdmin, async (req, res) => {
    try {
      const webhookId = req.body?.webhook_id ?? req.body?.webhookId;
      if (!webhookId) {
        return res.status(400).json({ ok: false, message: 'webhook_id obrigatório' });
      }

      const { data: webhook, error } = await supabase
        .from('webhooks')
        .select('*')
        .eq('id', webhookId)
        .maybeSingle();

      if (error || !webhook) {
        return res.status(404).json({ ok: false, message: 'Webhook não encontrado' });
      }

      const payload = buildTestPayload(webhook.evento);
      const results = await dispatchWebhookEvent(supabase, webhook.evento, payload, {
        test: true,
        webhookId: webhook.id,
      });

      const first = results[0];
      const value = first?.status === 'fulfilled' ? first.value : null;

      if (value?.ok) {
        return res.json({
          ok: true,
          message: 'Webhook de teste enviado com sucesso',
          delivery_id: value.deliveryId,
          http_status: value.httpStatus,
        });
      }

      return res.status(502).json({
        ok: false,
        message: value?.error ?? 'Falha ao entregar webhook de teste',
        delivery_id: value?.deliveryId ?? null,
        http_status: value?.httpStatus ?? null,
      });
    } catch (err) {
      console.error('[webhooks/test]', err);
      return res.status(500).json({ ok: false, message: 'Erro interno ao testar webhook' });
    }
  });

  return router;
}
