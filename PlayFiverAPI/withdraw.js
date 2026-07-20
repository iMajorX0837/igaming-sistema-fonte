import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { createMisticPayWithdraw, mapPixKeyTypeToMisticPay } from './misticpay.js';
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
   * Aprova saque pendente e envia PIX via MisticPay.
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
      let misticpayResult = null;

      if (origem === 'pix' || !saque.origem) {
        if (!saque.chave || !String(saque.chave).trim()) {
          return res.status(400).json({
            ok: false,
            message: 'Saque sem chave PIX cadastrada.',
          });
        }

        const webhookBase = (publicApiUrl || '').replace(/\/$/, '');
        const projectWebhook = webhookBase
          ? `${webhookBase}/api/withdraw/misticpay/webhook`
          : undefined;

        misticpayResult = await createMisticPayWithdraw({
          amount: valor,
          pixKey: saque.chave,
          pixKeyType: saque.key ?? mapPixKeyTypeToMisticPay(saque.key),
          description: `Saque — ${saqueId}`,
          projectWebhook,
        });
      }

      const { data: updated, error: updateError } = await supabase
        .from('saques')
        .update({
          status: 'aprovado',
          misticpay_job_id: misticpayResult?.jobId ?? null,
          misticpay_transaction_id: misticpayResult?.transactionId ?? null,
          misticpay_status: misticpayResult?.status ?? (origem === 'pix' ? null : 'MANUAL'),
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
            misticpayResult != null
              ? 'Pagamento enviado à MisticPay, mas falhou ao atualizar o saque. Verifique no painel e no gateway.'
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
          p_detalhes: `Saque ${saqueId} | Valor: R$ ${valor} | MisticPay: ${misticpayResult?.transactionId ?? 'manual'}`,
          p_status: 'sucesso',
          p_categoria: 'saque',
          p_metadata: {
            saque_id: saqueId,
            valor,
            misticpay: misticpayResult,
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
        misticpay: misticpayResult,
      });

      return res.status(200).json({
        ok: true,
        saque_id: saqueId,
        misticpay: misticpayResult,
        message:
          misticpayResult?.message ??
          (origem === 'pix'
            ? 'Saque enviado para processamento na MisticPay.'
            : 'Saque aprovado.'),
      });
    } catch (error) {
      console.error('❌ withdraw/approve:', error);
      return res.status(502).json({
        ok: false,
        message:
          error instanceof Error ? error.message : 'Erro ao aprovar saque via MisticPay.',
      });
    }
  });

  /**
   * POST /api/withdraw/misticpay/webhook
   * Callback opcional da MisticPay sobre status do saque PIX.
   */
  router.post('/misticpay/webhook', async (req, res) => {
    try {
      const payload = req.body ?? {};
      const data =
        typeof payload?.data === 'object' && payload.data !== null ? payload.data : payload;

      const transactionId = data?.transactionId ?? data?.transaction_id;
      const jobId = data?.jobId ?? data?.job_id;
      const status = String(data?.status ?? data?.transactionState ?? payload?.status ?? '').toUpperCase();

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
        console.error('withdraw/misticpay/webhook lookup:', error);
        return res.status(500).json({ ok: false });
      }

      if (!saque) {
        return res.status(200).json({ ok: true, ignored: true });
      }

      const updates = {
        misticpay_status: status || null,
        updated_at: new Date().toISOString(),
      };

      const failedStates = ['FAILED', 'FALHOU', 'CANCELLED', 'CANCELED', 'REJECTED', 'REJEITADO', 'ERROR'];
      const isFailure = failedStates.some((s) => status.includes(s));

      if (isFailure && saque.status === 'aprovado') {
        updates.status = 'falhou';
        try {
          await refundWithdrawBalance(saque.usuario_id, saque.valor);
        } catch (refundError) {
          console.error('withdraw/misticpay/webhook refund:', refundError);
        }
      }

      await supabase.from('saques').update(updates).eq('id', saque.id);

      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error('❌ withdraw/misticpay/webhook:', error);
      return res.status(500).json({ ok: false });
    }
  });

  return router;
}
