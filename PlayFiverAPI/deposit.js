import { Router } from 'express';
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { createPixTransaction, checkPixTransaction } from './lib/paymentGateway.js';
import {
  dispatchDepositCreatedWebhook,
  dispatchDepositPaidWebhook,
  shouldDispatchDepositPaid,
  parseRpcJson,
} from './lib/depositWebhooks.js';

/**
 * @param {{
 *   supabase: import('@supabase/supabase-js').SupabaseClient;
 *   supabaseUrl: string;
 *   supabaseAnonKey: string;
 *   dispatchWebhookEvent?: Function;
 * }} deps
 */
export function createDepositRouter({ supabase, supabaseUrl, supabaseAnonKey, dispatchWebhookEvent }) {
  const router = Router();

  function createUserSupabaseClient(token) {
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });
  }

  async function getAuthUser(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      return null;
    }

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return null;
    }

    return { user: data.user, token };
  }

  async function getPlatformDepositLimits() {
    const { data, error } = await supabase.rpc('obter_config_plataforma');
    if (error || !data?.ok) {
      return { min: 20, max: 1_000_000 };
    }

    return {
      min: Number(data.deposito_minimo) || 20,
      max: Number(data.deposito_maximo) || 1_000_000,
    };
  }

  /**
   * POST /api/deposit/pix/create
   * Gera cobrança PIX na MisticPay e registra depósito pendente.
   */
  router.post('/pix/create', async (req, res) => {
    try {
      const auth = await getAuthUser(req);
      if (!auth) {
        return res.status(401).json({ ok: false, message: 'Faça login para depositar.' });
      }

      const { user } = auth;

      const amount = Number(req.body?.amount);
      const cupomCodigo =
        typeof req.body?.cupom_codigo === 'string' && req.body.cupom_codigo.trim()
          ? req.body.cupom_codigo.trim().toUpperCase()
          : null;

      if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) {
        return res.status(400).json({
          ok: false,
          message: 'Informe um valor inteiro em reais válido.',
        });
      }

      const limits = await getPlatformDepositLimits();
      if (amount < limits.min) {
        return res.status(400).json({
          ok: false,
          message: `Valor mínimo de depósito: R$ ${limits.min},00.`,
        });
      }
      if (amount > limits.max) {
        return res.status(400).json({
          ok: false,
          message: `Valor máximo de depósito: R$ ${limits.max.toLocaleString('pt-BR')},00.`,
        });
      }

      const { data: profile, error: profileError } = await supabase
        .from('usuarios')
        .select('nome, cpf, email')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('deposit/pix/create profile:', profileError);
        return res.status(500).json({
          ok: false,
          message: profileError.message || 'Erro ao carregar seus dados.',
        });
      }

      const cpfDigits = (profile?.cpf ?? '').replace(/\D/g, '');
      if (cpfDigits.length !== 11) {
        return res.status(400).json({
          ok: false,
          message: 'Cadastre um CPF válido no perfil para gerar o PIX.',
        });
      }

      const payerName =
        (profile?.nome ?? user.user_metadata?.nome ?? user.email ?? 'Cliente').trim() || 'Cliente';
      const transactionId = randomUUID();

      const pixResult = await createPixTransaction({
        amount,
        payerName,
        payerDocument: cpfDigits,
        payerEmail: profile?.email ?? user.email ?? '',
        transactionId,
        description: `Depósito — ${payerName}`,
      });

      const checkTransactionId = pixResult.externalTransactionId ?? transactionId;

      const { data: depRow, error: insertError } = await supabase
        .from('depositos')
        .insert({
          usuario_id: user.id,
          valor: amount,
          status: 'pendente',
          cupom_codigo: cupomCodigo,
          gateway_check_id: String(checkTransactionId),
        })
        .select('id')
        .maybeSingle();

      if (insertError) {
        console.error('deposit/pix/create insert:', insertError);
        return res.status(500).json({
          ok: false,
          message: insertError.message || 'Erro ao registrar o depósito.',
        });
      }

      if (depRow?.id && typeof dispatchWebhookEvent === 'function') {
        void dispatchDepositCreatedWebhook(supabase, dispatchWebhookEvent, {
          depositoId: depRow.id,
          usuarioId: user.id,
          email: profile?.email ?? user.email ?? null,
          valor: amount,
          cupomCodigo: cupomCodigo,
          origem: 'pix',
        });
      }

      return res.status(200).json({
        ok: true,
        copyPaste: pixResult.copyPaste,
        qrCodeBase64: pixResult.qrCodeBase64,
        qrcodeUrl: pixResult.qrcodeUrl,
        externalTransactionId: pixResult.externalTransactionId,
        checkTransactionId,
        depositoId: depRow?.id ?? null,
        amount,
      });
    } catch (error) {
      console.error('❌ deposit/pix/create:', error);
      return res.status(500).json({
        ok: false,
        message: error instanceof Error ? error.message : 'Erro ao gerar o PIX. Tente novamente.',
      });
    }
  });

  /**
   * POST /api/deposit/pix/check
   * Consulta status na MisticPay e confirma depósito quando pago.
   */
  router.post('/pix/check', async (req, res) => {
    try {
      const auth = await getAuthUser(req);
      if (!auth) {
        return res.status(401).json({ ok: false, message: 'Faça login para consultar o pagamento.' });
      }

      const { user, token } = auth;
      const userSupabase = createUserSupabaseClient(token);

      const checkTransactionId = req.body?.checkTransactionId ?? req.body?.transactionId;
      const depositoId = req.body?.depositoId ?? req.body?.deposito_id ?? null;
      const cupomCodigo =
        typeof req.body?.cupom_codigo === 'string' && req.body.cupom_codigo.trim()
          ? req.body.cupom_codigo.trim()
          : null;

      if (!checkTransactionId) {
        return res.status(400).json({
          ok: false,
          message: 'checkTransactionId é obrigatório.',
        });
      }

      const { transactionState } = await checkPixTransaction(checkTransactionId);
      const state = transactionState.toUpperCase();

      if (state === 'PENDENTE') {
        return res.status(200).json({
          ok: true,
          transactionState: state,
          paid: false,
        });
      }

      if (state !== 'COMPLETO') {
        return res.status(200).json({
          ok: true,
          transactionState: state,
          paid: false,
        });
      }

      let vipResult = null;
      let confirmError = null;
      let cupomBonus = null;

      if (depositoId) {
        const { data: depRow, error: depOwnerError } = await supabase
          .from('depositos')
          .select('id, usuario_id, gateway_check_id')
          .eq('id', depositoId)
          .maybeSingle();

        if (depOwnerError) {
          console.error('deposit/pix/check owner:', depOwnerError);
        } else if (!depRow || depRow.usuario_id !== user.id) {
          return res.status(403).json({
            ok: false,
            message: 'Depósito não pertence ao usuário autenticado.',
          });
        } else if (
          depRow.gateway_check_id &&
          String(depRow.gateway_check_id) !== String(checkTransactionId)
        ) {
          return res.status(403).json({
            ok: false,
            message: 'Transação PIX não corresponde a este depósito.',
          });
        }

        const { data: rpcData, error: rpcError } = await supabase.rpc(
          'confirmar_deposito_pix_pago_server',
          {
            p_deposito_id: depositoId,
            p_usuario_id: user.id,
            p_gateway_check_id: String(checkTransactionId),
          },
        );

        if (rpcError) {
          console.error('confirmar_deposito_pix_pago_server:', rpcError);
          confirmError =
            'Pagamento confirmado na operadora, mas houve erro ao atualizar o saldo. Entre em contato com o suporte.';
        } else {
          const row = parseRpcJson(rpcData);
          if (row && row.ok === false) {
            console.error('confirmar_deposito_pix_pago_server recusou:', row);
            confirmError =
              'Pagamento confirmado, mas não foi possível concluir o depósito no sistema. Entre em contato com o suporte.';
          } else {
            vipResult = row;

            if (shouldDispatchDepositPaid(row)) {
              void dispatchDepositPaidWebhook(supabase, dispatchWebhookEvent, {
                depositoId,
                usuarioId: user.id,
                email: user.email ?? null,
                cupomCodigo,
                vip: row,
              });
            }
          }
        }

        if (!confirmError && cupomCodigo) {
          const { data: cupomData, error: cupomError } = await userSupabase.rpc('aplicar_cupom_deposito', {
            p_deposito_id: depositoId,
            p_codigo: cupomCodigo,
          });

          if (cupomError) {
            console.error('aplicar_cupom_deposito:', cupomError);
          } else if (cupomData?.ok && !cupomData.already && cupomData.valor_bonus) {
            cupomBonus = {
              codigo: cupomData.codigo ?? cupomCodigo.toUpperCase(),
              valor: cupomData.valor_bonus,
            };
          }
        }
      } else {
        confirmError =
          'Pagamento confirmado. Não encontramos o registro do depósito — fale com o suporte se o saldo não aparecer.';
      }

      return res.status(200).json({
        ok: true,
        transactionState: state,
        paid: true,
        confirmError,
        vip: vipResult,
        cupomBonus,
      });
    } catch (error) {
      console.error('❌ deposit/pix/check:', error);
      return res.status(500).json({
        ok: false,
        message:
          error instanceof Error ? error.message : 'Erro ao consultar pagamento. Tente novamente.',
      });
    }
  });

  return router;
}
