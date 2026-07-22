import { Router } from 'express';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import {
  createPixWithdraw,
  mapPixKeyType,
  getWithdrawPaymentGateway,
} from './lib/paymentGateway.js';
import { getMisticPayWebhookSecret } from './misticpay.js';
import { getBspayWebhookSecret, validateBspayWebhookSignature } from './bspay.js';
import { getVeopagWebhookSecret, validateVeopagWebhookSignature } from './veopag.js';
import { dispatchWithdrawApprovedWebhook } from './lib/withdrawWebhooks.js';

/**
 * @param {{
 *   supabase: import('@supabase/supabase-js').SupabaseClient;
 *   supabaseUrl: string;
 *   supabaseAnonKey: string;
 *   publicApiUrl?: string;
 *   dispatchWebhookEvent?: Function;
 * }} deps
 */
export function createWithdrawRouter({
  supabase,
  supabaseUrl,
  supabaseAnonKey,
  publicApiUrl,
  dispatchWebhookEvent,
}) {
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
    req.adminToken = token;
    req.adminClient = userClient;
    next();
  }

  async function refundWithdrawBalance(usuarioId, valor) {
    const { data: usuario, error: loadError } = await supabase
      .from('usuarios')
      .select('saldo')
      .eq('id', usuarioId)
      .maybeSingle();

    if (loadError || !usuario) {
      throw loadError ?? new Error('Usuário não encontrado para devolução');
    }

    const saldoAtual = Number(usuario.saldo) || 0;
    const { error: updateError } = await supabase
      .from('usuarios')
      .update({ saldo: saldoAtual + Number(valor) })
      .eq('id', usuarioId);

    if (updateError) {
      throw updateError;
    }
  }

  /**
   * POST /api/withdraw/approve
   * Aprova saque pendente e envia PIX via gateway ativo.
   */
  router.post('/approve', requireAdmin, async (req, res) => {
    const saqueId = req.body?.saque_id ?? req.body?.saqueId;
    if (!saqueId) {
      return res.status(400).json({ ok: false, message: 'saque_id é obrigatório' });
    }

    try {
      const { data: saque, error: saqueError } = await supabase
        .from('saques')
        .select('id, usuario_id, valor, status, origem, key, chave')
        .eq('id', saqueId)
        .maybeSingle();

      if (saqueError) {
        console.error('withdraw/approve load:', saqueError);
        return res.status(500).json({ ok: false, message: 'Erro ao carregar saque.' });
      }

      if (!saque) {
        return res.status(404).json({ ok: false, message: 'Saque não encontrado' });
      }

      if (saque.status !== 'pendente') {
        return res.status(409).json({
          ok: false,
          message: 'Apenas saques pendentes podem ser aprovados.',
        });
      }

      const valor = Number(saque.valor);
      if (!Number.isFinite(valor) || valor <= 0) {
        return res.status(400).json({ ok: false, message: 'Valor do saque inválido.' });
      }

      const origem = String(saque.origem ?? 'pix').toLowerCase();
      let gatewayResult = null;
      const activeGateway = await getWithdrawPaymentGateway();

      if (origem === 'pix' || !saque.origem) {
        if (!saque.chave || !String(saque.chave).trim()) {
          return res.status(400).json({
            ok: false,
            message: 'Saque sem chave PIX cadastrada.',
          });
        }

        const webhookBase = (publicApiUrl || '').replace(/\/$/, '');
        const webhookPaths = {
          bspay: '/api/withdraw/bspay/webhook',
          veopag: '/api/withdraw/veopag/webhook',
          misticpay: '/api/withdraw/misticpay/webhook',
        };
        const webhookPath = webhookPaths[activeGateway] ?? webhookPaths.misticpay;
        const postbackUrl = webhookBase ? `${webhookBase}${webhookPath}` : undefined;

        let receiverName;
        let receiverDocument;
        if (activeGateway === 'veopag') {
          const { data: usuario } = await supabase
            .from('usuarios')
            .select('nome, cpf')
            .eq('id', saque.usuario_id)
            .maybeSingle();
          receiverName = usuario?.nome ?? undefined;
          receiverDocument = usuario?.cpf ?? undefined;
        }

        gatewayResult = await createPixWithdraw({
          amount: valor,
          pixKey: saque.chave,
          pixKeyType: saque.key ?? mapPixKeyType(saque.key),
          description: `Saque — ${saqueId}`,
          externalId: String(saqueId),
          receiverName,
          receiverDocument,
          projectWebhook: postbackUrl,
          postbackUrl,
        });
      }

      const { data: updated, error: updateError } = await supabase
        .from('saques')
        .update({
          status: 'aprovado',
          misticpay_job_id: gatewayResult?.jobId ?? null,
          misticpay_transaction_id: gatewayResult?.transactionId ?? null,
          misticpay_status: gatewayResult?.status ?? (origem === 'pix' ? null : 'MANUAL'),
          updated_at: new Date().toISOString(),
        })
        .eq('id', saqueId)
        .eq('status', 'pendente')
        .select('id, usuario_id, valor, key, chave')
        .maybeSingle();

      if (updateError) {
        console.error('withdraw/approve update:', updateError);
        return res.status(500).json({
          ok: false,
          message:
            gatewayResult != null
              ? 'Pagamento enviado ao gateway, mas falhou ao atualizar o saque. Verifique no painel e no gateway.'
              : 'Erro ao atualizar status do saque.',
        });
      }

      if (!updated) {
        return res.status(409).json({
          ok: false,
          message: 'Saque já foi processado por outro administrador.',
        });
      }

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('email')
        .eq('id', updated.usuario_id)
        .maybeSingle();

      try {
        await req.adminClient.rpc('registrar_admin_log', {
          p_acao: 'Aprovar saque com pagamento PIX',
          p_detalhes: `Saque ${saqueId} | Valor: R$ ${valor} | Gateway: ${gatewayResult?.transactionId ?? 'manual'}`,
          p_status: 'sucesso',
          p_categoria: 'saque',
          p_metadata: {
            saque_id: saqueId,
            valor,
            gateway: activeGateway,
            payment: gatewayResult,
          },
        });
      } catch (logErr) {
        console.warn('withdraw/approve log:', logErr);
      }

      void dispatchWithdrawApprovedWebhook(supabase, dispatchWebhookEvent, {
        saqueId,
        usuarioId: updated.usuario_id,
        email: usuario?.email ?? null,
        valor,
        pixKey: updated.chave,
        pixKeyType: updated.key,
        misticpay: gatewayResult,
      });

      return res.status(200).json({
        ok: true,
        saque_id: saqueId,
        misticpay: gatewayResult,
        message:
          gatewayResult?.message ??
          (origem === 'pix'
            ? 'Saque enviado para processamento no gateway.'
            : 'Saque aprovado.'),
      });
    } catch (error) {
      console.error('❌ withdraw/approve:', error);
      return res.status(502).json({
        ok: false,
        message:
          error instanceof Error ? error.message : 'Erro ao aprovar saque via gateway.',
      });
    }
  });

  async function handleWithdrawGatewayWebhook(req, res, { gateway }) {
    try {
      const webhookSecret =
        gateway === 'bspay'
          ? await getBspayWebhookSecret()
          : gateway === 'veopag'
            ? await getVeopagWebhookSecret()
            : await getMisticPayWebhookSecret();
      if (!webhookSecret) {
        console.error(`withdraw/${gateway}/webhook: webhook secret não configurado`);
        return res.status(503).json({ ok: false, message: 'Webhook não configurado' });
      } else if (gateway === 'bspay') {
        const rawBody = typeof req.rawBody === 'string' ? req.rawBody : JSON.stringify(req.body ?? {});
        const valid = validateBspayWebhookSignature({
          rawBody,
          headers: req.headers,
          secret: webhookSecret,
        });
        if (!valid) {
          return res.status(401).json({ ok: false, message: 'Não autorizado' });
        }
      } else if (gateway === 'veopag') {
        const rawBody = typeof req.rawBody === 'string' ? req.rawBody : JSON.stringify(req.body ?? {});
        const valid = validateVeopagWebhookSignature({
          rawBody,
          headers: req.headers,
          secret: webhookSecret,
        });
        if (!valid) {
          return res.status(401).json({ ok: false, message: 'Não autorizado' });
        }
      } else {
        const provided = String(
          req.headers['x-misticpay-secret'] ||
            req.headers['x-webhook-secret'] ||
            req.body?.secret ||
            '',
        );
        let valid = false;
        try {
          valid = crypto.timingSafeEqual(
            Buffer.from(provided),
            Buffer.from(String(webhookSecret)),
          );
        } catch {
          valid = false;
        }
        if (!valid) {
          return res.status(401).json({ ok: false, message: 'Não autorizado' });
        }
      }

      const payload = req.body ?? {};
      const data =
        typeof payload?.data === 'object' && payload.data !== null ? payload.data : payload;

      const transactionId =
        data?.transactionId ??
        data?.transaction_id ??
        payload?.transaction_id ??
        payload?.transactionId;
      const jobId = data?.jobId ?? data?.job_id;
      const event = String(payload?.event ?? '').toLowerCase();
      const status = String(
        data?.status ?? data?.transactionState ?? payload?.status ?? event ?? ''
      ).toUpperCase();

      if (!transactionId && !jobId) {
        return res.status(200).json({ ok: true, ignored: true });
      }

      let query = supabase.from('saques').select('id, usuario_id, valor, status');

      if (transactionId) {
        query = query.eq('misticpay_transaction_id', String(transactionId));
      } else {
        query = query.eq('misticpay_job_id', String(jobId));
      }

      const { data: saque, error } = await query.maybeSingle();

      if (error) {
        console.error(`withdraw/${gateway}/webhook lookup:`, error);
        return res.status(500).json({ ok: false });
      }

      if (!saque) {
        return res.status(200).json({ ok: true, ignored: true });
      }

      const updates = {
        misticpay_status: status || null,
        updated_at: new Date().toISOString(),
      };

      const failedStates = [
        'FAILED',
        'FALHOU',
        'CANCELLED',
        'CANCELED',
        'REJECTED',
        'REJEITADO',
        'ERROR',
        'CASHOUT.FAILED',
        'CASHOUT_FAILED',
      ];
      const isFailure =
        failedStates.some((s) => status.includes(s)) ||
        event.includes('cashout.failed') ||
        event.includes('withdrawal.failed') ||
        status === 'FAILED';

      if (isFailure && saque.status === 'aprovado') {
        updates.status = 'falhou';
        const { data: updatedSaque, error: updateError } = await supabase
          .from('saques')
          .update(updates)
          .eq('id', saque.id)
          .eq('status', 'aprovado')
          .select('id')
          .maybeSingle();

        if (updateError) {
          console.error(`withdraw/${gateway}/webhook update:`, updateError);
          return res.status(500).json({ ok: false });
        }

        if (updatedSaque) {
          try {
            await refundWithdrawBalance(saque.usuario_id, saque.valor);
          } catch (refundError) {
            console.error(`withdraw/${gateway}/webhook refund:`, refundError);
          }
        }

        return res.status(200).json({ ok: true });
      }

      await supabase.from('saques').update(updates).eq('id', saque.id);

      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error(`❌ withdraw/${gateway}/webhook:`, error);
      return res.status(500).json({ ok: false });
    }
  }

  /**
   * POST /api/withdraw/misticpay/webhook
   * Callback opcional da MisticPay sobre status do saque PIX.
   */
  router.post('/misticpay/webhook', async (req, res) => {
    return handleWithdrawGatewayWebhook(req, res, { gateway: 'misticpay' });
  });

  /**
   * POST /api/withdraw/bspay/webhook
   * Callback BSPay sobre status do saque PIX.
   */
  router.post('/bspay/webhook', async (req, res) => {
    return handleWithdrawGatewayWebhook(req, res, { gateway: 'bspay' });
  });

  /**
   * POST /api/withdraw/veopag/webhook
   * Callback VeoPag sobre status do saque PIX.
   */
  router.post('/veopag/webhook', async (req, res) => {
    return handleWithdrawGatewayWebhook(req, res, { gateway: 'veopag' });
  });

  return router;
}
