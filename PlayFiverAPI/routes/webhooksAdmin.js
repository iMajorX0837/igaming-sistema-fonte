import { Router } from 'express';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { dispatchWebhookEvent, buildTestPayload } from '../lib/webhookDispatcher.js';
import { isAdminSessionElevated } from '../lib/adminTwoFactor.js';
import { extractAccessToken } from '../lib/authCookies.js';

const WEBHOOK_EVENTS = new Set([
  'user.register',
  'deposit.created',
  'deposit.paid',
  'withdraw.approved',
]);

function generateWebhookSecret() {
  return crypto.randomBytes(32).toString('hex');
}

function toPublicWebhook(row) {
  if (!row) return null;
  const secret = String(row.secret_key ?? '');
  return {
    id: row.id,
    nome: row.nome,
    url: row.url,
    evento: row.evento,
    secret_prefix: secret.slice(0, 8),
    ativo: row.ativo,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

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
    const token = extractAccessToken(req, { preferAdmin: true });
    if (!token) {
      return res.status(401).json({ ok: false, message: 'Não autenticado' });
    }

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

    const { data: adminRow } = await supabase
      .from('usuarios')
      .select('two_factor_enabled, totp_secret')
      .eq('id', userData.user.id)
      .maybeSingle();

    if (
      adminRow?.two_factor_enabled &&
      adminRow?.totp_secret &&
      !isAdminSessionElevated(token, req)
    ) {
      return res.status(403).json({
        ok: false,
        message: '2FA necessário. Entre pelo painel administrativo.',
      });
    }

    req.adminUser = userData.user;
    next();
  }

  /** GET /api/webhooks — lista sem secret completo (M8) */
  router.get('/', requireAdmin, async (_req, res) => {
    try {
      const { data, error } = await supabase
        .from('webhooks')
        .select('id, nome, url, evento, secret_key, ativo, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[webhooks/list]', error);
        return res.status(500).json({ ok: false, message: 'Erro ao listar webhooks' });
      }

      return res.json({
        ok: true,
        data: (data ?? []).map(toPublicWebhook),
      });
    } catch (err) {
      console.error('[webhooks/list]', err);
      return res.status(500).json({ ok: false, message: 'Erro interno' });
    }
  });

  /** POST /api/webhooks — cria; secret_once só na resposta */
  router.post('/', requireAdmin, async (req, res) => {
    try {
      const nome = String(req.body?.nome ?? '').trim();
      const url = String(req.body?.url ?? '').trim();
      const evento = String(req.body?.evento ?? '').trim();
      const ativo = req.body?.ativo !== false;

      if (!nome) {
        return res.status(400).json({ ok: false, message: 'Nome obrigatório' });
      }
      if (!url || !/^https?:\/\/.+/i.test(url)) {
        return res.status(400).json({ ok: false, message: 'URL inválida' });
      }
      if (!WEBHOOK_EVENTS.has(evento)) {
        return res.status(400).json({ ok: false, message: 'Evento inválido' });
      }

      const secret_key = generateWebhookSecret();
      const { data, error } = await supabase
        .from('webhooks')
        .insert({ nome, url, evento, secret_key, ativo })
        .select('id, nome, url, evento, secret_key, ativo, created_at, updated_at')
        .single();

      if (error || !data) {
        console.error('[webhooks/create]', error);
        return res.status(500).json({ ok: false, message: error?.message ?? 'Erro ao criar' });
      }

      return res.status(201).json({
        ok: true,
        data: toPublicWebhook(data),
        secret_once: secret_key,
      });
    } catch (err) {
      console.error('[webhooks/create]', err);
      return res.status(500).json({ ok: false, message: 'Erro interno' });
    }
  });

  /** PATCH /api/webhooks/:id — metadados; não altera secret */
  router.patch('/:id', requireAdmin, async (req, res) => {
    try {
      const id = String(req.params.id ?? '').trim();
      if (!id) {
        return res.status(400).json({ ok: false, message: 'ID inválido' });
      }

      const updates = { updated_at: new Date().toISOString() };

      if (req.body?.nome != null) {
        const nome = String(req.body.nome).trim();
        if (!nome) {
          return res.status(400).json({ ok: false, message: 'Nome inválido' });
        }
        updates.nome = nome;
      }

      if (req.body?.url != null) {
        const url = String(req.body.url).trim();
        if (!url || !/^https?:\/\/.+/i.test(url)) {
          return res.status(400).json({ ok: false, message: 'URL inválida' });
        }
        updates.url = url;
      }

      if (req.body?.evento != null) {
        const evento = String(req.body.evento).trim();
        if (!WEBHOOK_EVENTS.has(evento)) {
          return res.status(400).json({ ok: false, message: 'Evento inválido' });
        }
        updates.evento = evento;
      }

      if (req.body?.ativo != null) {
        updates.ativo = Boolean(req.body.ativo);
      }

      const { data, error } = await supabase
        .from('webhooks')
        .update(updates)
        .eq('id', id)
        .select('id, nome, url, evento, secret_key, ativo, created_at, updated_at')
        .maybeSingle();

      if (error) {
        console.error('[webhooks/update]', error);
        return res.status(500).json({ ok: false, message: error.message });
      }
      if (!data) {
        return res.status(404).json({ ok: false, message: 'Webhook não encontrado' });
      }

      return res.json({ ok: true, data: toPublicWebhook(data) });
    } catch (err) {
      console.error('[webhooks/update]', err);
      return res.status(500).json({ ok: false, message: 'Erro interno' });
    }
  });

  /** POST /api/webhooks/:id/rotate-secret */
  router.post('/:id/rotate-secret', requireAdmin, async (req, res) => {
    try {
      const id = String(req.params.id ?? '').trim();
      if (!id) {
        return res.status(400).json({ ok: false, message: 'ID inválido' });
      }

      const secret_key = generateWebhookSecret();
      const { data, error } = await supabase
        .from('webhooks')
        .update({ secret_key, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select('id, nome, url, evento, secret_key, ativo, created_at, updated_at')
        .maybeSingle();

      if (error) {
        console.error('[webhooks/rotate-secret]', error);
        return res.status(500).json({ ok: false, message: error.message });
      }
      if (!data) {
        return res.status(404).json({ ok: false, message: 'Webhook não encontrado' });
      }

      return res.json({
        ok: true,
        data: toPublicWebhook(data),
        secret_once: secret_key,
      });
    } catch (err) {
      console.error('[webhooks/rotate-secret]', err);
      return res.status(500).json({ ok: false, message: 'Erro interno' });
    }
  });

  /** DELETE /api/webhooks/:id */
  router.delete('/:id', requireAdmin, async (req, res) => {
    try {
      const id = String(req.params.id ?? '').trim();
      if (!id) {
        return res.status(400).json({ ok: false, message: 'ID inválido' });
      }

      const { error, count } = await supabase
        .from('webhooks')
        .delete({ count: 'exact' })
        .eq('id', id);

      if (error) {
        console.error('[webhooks/delete]', error);
        return res.status(500).json({ ok: false, message: error.message });
      }
      if (!count) {
        return res.status(404).json({ ok: false, message: 'Webhook não encontrado' });
      }

      return res.json({ ok: true });
    } catch (err) {
      console.error('[webhooks/delete]', err);
      return res.status(500).json({ ok: false, message: 'Erro interno' });
    }
  });

  /** POST /api/webhooks/test — envia payload de teste */
  router.post('/test', requireAdmin, async (req, res) => {
    try {
      const webhookId = req.body?.webhook_id ?? req.body?.webhookId;
      if (!webhookId) {
        return res.status(400).json({ ok: false, message: 'webhook_id obrigatório' });
      }

      const { data: webhook, error } = await supabase
        .from('webhooks')
        .select('id, evento, secret_key, url, ativo')
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
