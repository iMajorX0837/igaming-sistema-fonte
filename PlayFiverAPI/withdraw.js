import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import {
  createPixWithdraw,
  mapPixKeyType,
  getWithdrawPaymentGateway,
} from './lib/paymentGateway.js';
import {
  buildMisticPayWithdrawWebhookUrl,
  getMisticPayWebhookSecret,
  validateMisticPayWebhookAuth,
  verifyMisticPayWithdrawWebhookStatus,
} from './misticpay.js';
import { getBspayWebhookSecret, validateBspayWebhookSignature } from './bspay.js';
import { getVeopagWebhookSecret, validateVeopagWebhookSignature } from './veopag.js';
import { dispatchWithdrawApprovedWebhook } from './lib/withdrawWebhooks.js';
import { isAdminSessionElevated } from './lib/adminTwoFactor.js';
import { extractAccessToken } from './lib/authCookies.js';

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
   * Ordem segura: pendente → processando → gateway → aprovado|falhou
   * (evita double-pay se o update falhar depois do PIX).
   */
  router.post('/approve', requireAdmin, async (req, res) => {
    const saqueId = req.body?.saque_id ?? req.body?.saqueId;
    if (!saqueId) {
      return res.status(400).json({ ok: false, message: 'saque_id é obrigatório' });
    }

    let claimed = false;

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

      if (saque.status === 'processando') {
        return res.status(409).json({
          ok: false,
          message: 'Saque já está em processamento. Aguarde ou marque como falhou se necessário.',
        });
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
      const activeGateway = await getWithdrawPaymentGateway();

      if (origem === 'pix' || !saque.origem) {
        if (!saque.chave || !String(saque.chave).trim()) {
          return res.status(400).json({
            ok: false,
            message: 'Saque sem chave PIX cadastrada.',
          });
        }
      }

      // 1) Claim atômico — só um admin/request segue para o gateway
      const { data: claimedRow, error: claimError } = await supabase
        .from('saques')
        .update({
          status: 'processando',
          updated_at: new Date().toISOString(),
        })
        .eq('id', saqueId)
        .eq('status', 'pendente')
        .select('id, usuario_id, valor, key, chave, origem')
        .maybeSingle();

      if (claimError) {
        console.error('withdraw/approve claim:', claimError);
        return res.status(500).json({ ok: false, message: 'Erro ao reservar saque para pagamento.' });
      }

      if (!claimedRow) {
        return res.status(409).json({
          ok: false,
          message: 'Saque já foi processado por outro administrador.',
        });
      }

      claimed = true;

      // 2) Gateway (só depois do claim)
      let gatewayResult = null;
      if (origem === 'pix' || !saque.origem) {
        const webhookBase = (publicApiUrl || '').replace(/\/$/, '');
        const webhookPaths = {
          bspay: '/api/withdraw/bspay/webhook',
          veopag: '/api/withdraw/veopag/webhook',
          misticpay: null,
        };
        let postbackUrl;
        if (activeGateway === 'misticpay') {
          const misticSecret = await getMisticPayWebhookSecret();
          postbackUrl = buildMisticPayWithdrawWebhookUrl(webhookBase, misticSecret);
        } else {
          const webhookPath = webhookPaths[activeGateway];
          postbackUrl = webhookBase && webhookPath ? `${webhookBase}${webhookPath}` : undefined;
        }

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

      // 3) Commit aprovado (só a partir de processando)
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
        .eq('status', 'processando')
        .select('id, usuario_id, valor, key, chave')
        .maybeSingle();

      if (updateError) {
        console.error('withdraw/approve update aprovado:', updateError);
        // PIX pode ter sido enviado — grava ids e deixa processando para auditoria
        if (gatewayResult) {
          await supabase
            .from('saques')
            .update({
              misticpay_job_id: gatewayResult.jobId ?? null,
              misticpay_transaction_id: gatewayResult.transactionId ?? null,
              misticpay_status: gatewayResult.status ?? null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', saqueId)
            .eq('status', 'processando');
        }
        return res.status(500).json({
          ok: false,
          message:
            gatewayResult != null
              ? 'Pagamento enviado ao gateway, mas falhou ao confirmar no banco. Saque ficou em processando — não aprove de novo; confira no gateway.'
              : 'Erro ao atualizar status do saque.',
        });
      }

      if (!updated) {
        return res.status(409).json({
          ok: false,
          message: 'Saque saiu de processando durante a confirmação. Verifique o status atual.',
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

      // Gateway falhou depois do claim → marca falhou (trigger devolve saldo se debitado)
      if (claimed) {
        try {
          await supabase
            .from('saques')
            .update({
              status: 'falhou',
              updated_at: new Date().toISOString(),
            })
            .eq('id', saqueId)
            .eq('status', 'processando');
        } catch (failErr) {
          console.error('withdraw/approve mark falhou:', failErr);
        }
      }

      return res.status(502).json({
        ok: false,
        message:
          error instanceof Error ? error.message : 'Erro ao aprovar saque via gateway.',
      });
    }
  });

  async function handleWithdrawGatewayWebhook(req, res, { gateway, urlToken } = {}) {
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
        const rawBody = typeof req.rawBody === 'string' ? req.rawBody : JSON.stringify(req.body ?? {});
        const valid = validateMisticPayWebhookAuth({
          rawBody,
          headers: req.headers,
          secret: webhookSecret,
          urlToken,
        });
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

      if (isFailure && (saque.status === 'aprovado' || saque.status === 'processando')) {
        if (gateway === 'misticpay' && transactionId) {
          const verified = await verifyMisticPayWithdrawWebhookStatus(transactionId, {
            expectFailure: true,
          });
          if (!verified) {
            console.warn(`withdraw/${gateway}/webhook: status remoto divergente`, {
              transactionId,
              status,
            });
            return res.status(409).json({ ok: false, message: 'Status não confirmado no gateway' });
          }
        }

        updates.status = 'falhou';
        const fromStatus = saque.status;
        const { data: updatedSaque, error: updateError } = await supabase
          .from('saques')
          .update(updates)
          .eq('id', saque.id)
          .eq('status', fromStatus)
          .select('id')
          .maybeSingle();

        if (updateError) {
          console.error(`withdraw/${gateway}/webhook update:`, updateError);
          return res.status(500).json({ ok: false });
        }

        // aprovado→falhou: trigger nao reembolsa (so pendente/processando); webhook devolve.
        // processando→falhou: trigger handle_saque_rejeitado devolve o saldo.
        if (updatedSaque && fromStatus === 'aprovado') {
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
   * POST /api/withdraw/misticpay/webhook/:token
   * Callback MisticPay — token opaco na URL (M5).
   */
  router.post('/misticpay/webhook/:token', async (req, res) => {
    return handleWithdrawGatewayWebhook(req, res, {
      gateway: 'misticpay',
      urlToken: req.params.token,
    });
  });

  /**
   * POST /api/withdraw/misticpay/webhook
   * Legado — exige HMAC ou header; URL sem token não aceita secret no body.
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
