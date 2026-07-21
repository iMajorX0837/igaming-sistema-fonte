import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { executeQuery } from '../lib/executeQuery.js';
import { maybeDispatchDepositPaidFromRpc } from '../lib/depositWebhooks.js';
import {
  BLOCKED_USER_RPCS,
  getQueryTableAndOperation,
  isBlockedUserTableWrite,
} from '../lib/proxySecurity.js';
import { createRateLimiter } from '../lib/security.js';
import {
  buildOtpAuthUrl,
  buildQrDataUrl,
  consume2FAChallenge,
  create2FAChallenge,
  generateTotpSecret,
  get2FAChallenge,
  verifyTotpCode,
} from '../lib/adminTwoFactor.js';

/**
 * @param {{
 *   supabase: import('@supabase/supabase-js').SupabaseClient;
 *   supabaseUrl: string;
 *   supabaseAnonKey: string;
 *   supabaseServiceKey: string;
 * }} deps
 */
export function createSupabaseProxyRouter({
  supabase,
  supabaseUrl,
  supabaseAnonKey,
  supabaseServiceKey,
  dispatchWebhookEvent,
}) {
  const router = Router();
  const authSignInRateLimit = createRateLimiter({ windowMs: 60_000, max: 20 });

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  function createAnonClient(extraHeaders = {}) {
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: extraHeaders },
    });
  }

  function createUserClient(token, extraHeaders = {}) {
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
          ...extraHeaders,
        },
      },
    });
  }

  function createServiceClient(extraHeaders = {}) {
    const key = supabaseServiceKey || supabaseAnonKey;
    return createClient(supabaseUrl, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: extraHeaders },
    });
  }

  function extractExtraHeaders(req) {
    const headers = {};
    const clientInfo = req.headers['x-client-info'];
    const adminIp = req.headers['x-admin-ip'];
    const adminDevice = req.headers['x-admin-device'];
    if (clientInfo) headers['x-client-info'] = String(clientInfo);
    if (adminIp) headers['x-admin-ip'] = String(adminIp);
    if (adminDevice) headers['x-admin-device'] = String(adminDevice);
    return headers;
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

  function getClientForRequest(req) {
    const extraHeaders = extractExtraHeaders(req);
    const authHeader = req.headers.authorization;
    const token =
      authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

    if (token) {
      return createUserClient(token, extraHeaders);
    }

    return createAnonClient(extraHeaders);
  }

  async function getUserCargo(userId) {
    const serviceClient = createServiceClient();
    const { data, error } = await serviceClient
      .from('usuarios')
      .select('cargo')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data?.cargo) return null;
    return data.cargo;
  }

  async function getAdmin2FARecord(userId) {
    const serviceClient = createServiceClient();
    const { data, error } = await serviceClient
      .from('usuarios')
      .select('cargo, two_factor_enabled, totp_secret, totp_pending_secret')
      .eq('id', userId)
      .maybeSingle();

    if (error) return null;
    return data;
  }

  async function requireAdminUser(req, res) {
    const auth = await getAuthUser(req);
    if (!auth) {
      res.status(401).json({ data: null, error: { message: 'Não autenticado' } });
      return null;
    }

    const cargo = await getUserCargo(auth.user.id);
    if (cargo !== 'admin') {
      res.status(403).json({ data: null, error: { message: 'Acesso negado' } });
      return null;
    }

    return auth;
  }

  /** POST /api/supabase/auth/sign-in */
  router.post('/auth/sign-in', authSignInRateLimit, async (req, res) => {
    try {
      const { email, password } = req.body ?? {};
      if (!email || !password) {
        return res.status(400).json({
          data: { user: null, session: null },
          error: { message: 'Email e senha são obrigatórios' },
        });
      }

      const { data, error } = await authClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return res.status(401).json({ data: { user: null, session: null }, error });
      }

      const isAdminPanel = req.headers['x-client-info'] === 'admin-panel';

      if (isAdminPanel && data?.user?.id) {
        const record = await getAdmin2FARecord(data.user.id);

        if (record?.cargo !== 'admin') {
          return res.status(403).json({
            data: { user: null, session: null },
            error: { message: 'Esta conta não possui permissões de administrador' },
          });
        }

        if (record.two_factor_enabled && record.totp_secret) {
          const challengeToken = create2FAChallenge(data);
          return res.json({
            data: {
              user: data.user,
              session: null,
              requires2FA: true,
              challengeToken,
            },
            error: null,
          });
        }
      } else if (data?.user?.id) {
        const record = await getAdmin2FARecord(data.user.id);
        if (record?.cargo === 'admin') {
          return res.status(403).json({
            data: { user: null, session: null },
            error: { message: 'Contas administrativas devem acessar pelo painel admin.' },
          });
        }
      }

      res.json({ data, error: null });
    } catch (err) {
      console.error('[supabase-proxy] sign-in:', err);
      res.status(500).json({
        data: { user: null, session: null },
        error: { message: 'Erro interno ao autenticar' },
      });
    }
  });

  /** POST /api/supabase/auth/2fa/verify-login */
  router.post('/auth/2fa/verify-login', async (req, res) => {
    try {
      const { challengeToken, code } = req.body ?? {};
      if (!challengeToken || !code) {
        return res.status(400).json({
          data: { user: null, session: null },
          error: { message: 'Código e token de verificação são obrigatórios' },
        });
      }

      const pendingSession = get2FAChallenge(challengeToken);
      if (!pendingSession?.user?.id) {
        return res.status(401).json({
          data: { user: null, session: null },
          error: { message: 'Sessão expirada. Faça login novamente.' },
        });
      }

      const record = await getAdmin2FARecord(pendingSession.user.id);
      if (record?.cargo !== 'admin' || !record.two_factor_enabled || !record.totp_secret) {
        consume2FAChallenge(challengeToken);
        return res.status(403).json({
          data: { user: null, session: null },
          error: { message: '2FA não configurado para esta conta' },
        });
      }

      if (!(await verifyTotpCode(record.totp_secret, code))) {
        return res.status(401).json({
          data: { user: null, session: null, challengeToken },
          error: { message: 'Código inválido. Tente novamente.' },
        });
      }

      consume2FAChallenge(challengeToken);
      res.json({
        data: {
          user: pendingSession.user,
          session: pendingSession.session,
        },
        error: null,
      });
    } catch (err) {
      console.error('[supabase-proxy] 2fa verify-login:', err);
      res.status(500).json({
        data: { user: null, session: null },
        error: { message: 'Erro ao verificar código 2FA' },
      });
    }
  });

  /** GET /api/supabase/auth/2fa/status */
  router.get('/auth/2fa/status', async (req, res) => {
    try {
      const auth = await requireAdminUser(req, res);
      if (!auth) return;

      const record = await getAdmin2FARecord(auth.user.id);
      res.json({
        data: { enabled: !!record?.two_factor_enabled },
        error: null,
      });
    } catch (err) {
      console.error('[supabase-proxy] 2fa status:', err);
      res.status(500).json({ data: null, error: { message: 'Erro ao obter status do 2FA' } });
    }
  });

  /** POST /api/supabase/auth/2fa/setup */
  router.post('/auth/2fa/setup', async (req, res) => {
    try {
      const auth = await requireAdminUser(req, res);
      if (!auth) return;

      const record = await getAdmin2FARecord(auth.user.id);
      if (record?.two_factor_enabled) {
        return res.status(400).json({
          data: null,
          error: { message: '2FA já está ativo. Desative antes de reconfigurar.' },
        });
      }

      const secret = generateTotpSecret();
      const otpauthUrl = buildOtpAuthUrl(auth.user.email, secret);
      const qrDataUrl = await buildQrDataUrl(otpauthUrl);

      const serviceClient = createServiceClient();
      const { error: updateError } = await serviceClient
        .from('usuarios')
        .update({ totp_pending_secret: secret })
        .eq('id', auth.user.id);

      if (updateError) {
        return res.status(500).json({
          data: null,
          error: { message: 'Erro ao iniciar configuração do 2FA' },
        });
      }

      res.json({
        data: { qrDataUrl, otpauthUrl, secret },
        error: null,
      });
    } catch (err) {
      console.error('[supabase-proxy] 2fa setup:', err);
      res.status(500).json({ data: null, error: { message: 'Erro ao configurar 2FA' } });
    }
  });

  /** POST /api/supabase/auth/2fa/confirm */
  router.post('/auth/2fa/confirm', async (req, res) => {
    try {
      const auth = await requireAdminUser(req, res);
      if (!auth) return;

      const { code } = req.body ?? {};
      if (!code) {
        return res.status(400).json({
          data: null,
          error: { message: 'Código de verificação obrigatório' },
        });
      }

      const record = await getAdmin2FARecord(auth.user.id);
      if (!record?.totp_pending_secret) {
        return res.status(400).json({
          data: null,
          error: { message: 'Nenhuma configuração pendente. Inicie o setup novamente.' },
        });
      }

      if (!(await verifyTotpCode(record.totp_pending_secret, code))) {
        return res.status(401).json({
          data: null,
          error: { message: 'Código inválido. Verifique o Google Authenticator.' },
        });
      }

      const serviceClient = createServiceClient();
      const { error: updateError } = await serviceClient
        .from('usuarios')
        .update({
          totp_secret: record.totp_pending_secret,
          totp_pending_secret: null,
          two_factor_enabled: true,
        })
        .eq('id', auth.user.id);

      if (updateError) {
        return res.status(500).json({
          data: null,
          error: { message: 'Erro ao ativar 2FA' },
        });
      }

      res.json({ data: { enabled: true }, error: null });
    } catch (err) {
      console.error('[supabase-proxy] 2fa confirm:', err);
      res.status(500).json({ data: null, error: { message: 'Erro ao confirmar 2FA' } });
    }
  });

  /** POST /api/supabase/auth/2fa/disable */
  router.post('/auth/2fa/disable', async (req, res) => {
    try {
      const auth = await requireAdminUser(req, res);
      if (!auth) return;

      const { password, code } = req.body ?? {};
      if (!password || !code) {
        return res.status(400).json({
          data: null,
          error: { message: 'Senha e código 2FA são obrigatórios' },
        });
      }

      const record = await getAdmin2FARecord(auth.user.id);
      if (!record?.two_factor_enabled || !record?.totp_secret) {
        return res.status(400).json({
          data: null,
          error: { message: '2FA não está ativo' },
        });
      }

      const { error: signInError } = await authClient.auth.signInWithPassword({
        email: auth.user.email,
        password,
      });

      if (signInError) {
        return res.status(401).json({
          data: null,
          error: { message: 'Senha incorreta' },
        });
      }

      if (!(await verifyTotpCode(record.totp_secret, code))) {
        return res.status(401).json({
          data: null,
          error: { message: 'Código 2FA inválido' },
        });
      }

      const serviceClient = createServiceClient();
      const { error: updateError } = await serviceClient
        .from('usuarios')
        .update({
          totp_secret: null,
          totp_pending_secret: null,
          two_factor_enabled: false,
        })
        .eq('id', auth.user.id);

      if (updateError) {
        return res.status(500).json({
          data: null,
          error: { message: 'Erro ao desativar 2FA' },
        });
      }

      res.json({ data: { enabled: false }, error: null });
    } catch (err) {
      console.error('[supabase-proxy] 2fa disable:', err);
      res.status(500).json({ data: null, error: { message: 'Erro ao desativar 2FA' } });
    }
  });

  /** POST /api/supabase/auth/sign-up */
  router.post('/auth/sign-up', async (req, res) => {
    try {
      const { email, password, options } = req.body ?? {};
      if (!email || !password) {
        return res.status(400).json({
          data: { user: null, session: null },
          error: { message: 'Email e senha são obrigatórios' },
        });
      }

      const { data, error } = await authClient.auth.signUp({
        email,
        password,
        options: options ?? undefined,
      });

      if (error) {
        return res.status(400).json({ data: { user: null, session: null }, error });
      }

      if (data?.user && typeof dispatchWebhookEvent === 'function') {
        const meta = options?.data ?? {};
        void dispatchWebhookEvent(supabase, 'user.register', {
          fullName: meta.usuario_nome ?? meta.nome ?? null,
          email: data.user.email ?? null,
          phone: meta.phone ?? null,
          document: meta.cpf ?? null,
          createdAt: data.user.created_at ?? new Date().toISOString(),
          utm_source: meta.utm_source ?? null,
          utm_medium: meta.utm_medium ?? null,
          utm_campaign: meta.utm_campaign ?? null,
          utm_content: meta.utm_content ?? null,
          utm_term: meta.utm_term ?? null,
          fbclid: meta.fbclid ?? null,
          fbc: meta.fbc ?? null,
          fbp: meta.fbp ?? null,
          ip: req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ?? req.socket?.remoteAddress ?? null,
          user_agent: req.headers['user-agent'] ?? null,
        });
      }

      res.json({ data, error: null });
    } catch (err) {
      console.error('[supabase-proxy] sign-up:', err);
      res.status(500).json({
        data: { user: null, session: null },
        error: { message: 'Erro interno ao registrar' },
      });
    }
  });

  /** POST /api/supabase/auth/sign-out */
  router.post('/auth/sign-out', async (req, res) => {
    try {
      const auth = await getAuthUser(req);
      if (auth?.token) {
        const userClient = createUserClient(auth.token);
        await userClient.auth.signOut();
      }
      res.json({ error: null });
    } catch (err) {
      console.error('[supabase-proxy] sign-out:', err);
      res.status(500).json({ error: { message: 'Erro ao encerrar sessão' } });
    }
  });

  /** GET /api/supabase/auth/session */
  router.get('/auth/session', async (req, res) => {
    try {
      const auth = await getAuthUser(req);
      if (!auth) {
        return res.json({ data: { session: null }, error: null });
      }

      const userClient = createUserClient(auth.token);
      const { data, error } = await userClient.auth.getSession();

      if (error || !data?.session) {
        return res.json({
          data: {
            session: {
              access_token: auth.token,
              user: auth.user,
            },
          },
          error: null,
        });
      }

      res.json({ data, error: null });
    } catch (err) {
      console.error('[supabase-proxy] session:', err);
      res.status(500).json({
        data: { session: null },
        error: { message: 'Erro ao obter sessão' },
      });
    }
  });

  /** POST /api/supabase/auth/refresh */
  router.post('/auth/refresh', async (req, res) => {
    try {
      const refreshToken = req.body?.refresh_token;
      if (!refreshToken) {
        return res.status(400).json({
          data: { session: null },
          error: { message: 'refresh_token obrigatório' },
        });
      }

      const { data, error } = await authClient.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (error) {
        return res.status(401).json({ data: { session: null }, error });
      }

      res.json({ data, error: null });
    } catch (err) {
      console.error('[supabase-proxy] refresh:', err);
      res.status(500).json({
        data: { session: null },
        error: { message: 'Erro ao renovar sessão' },
      });
    }
  });

  /** POST /api/supabase/auth/admin/update-user */
  router.post('/auth/admin/update-user', async (req, res) => {
    try {
      const auth = await requireAdminUser(req, res);
      if (!auth) return;

      if (!supabaseServiceKey) {
        return res.status(503).json({
          error: { message: 'SUPABASE_SERVICE_KEY não configurada no servidor' },
        });
      }

      const { userId, attributes } = req.body ?? {};
      if (!userId) {
        return res.status(400).json({ error: { message: 'userId obrigatório' } });
      }

      const serviceClient = createServiceClient();
      const { data, error } = await serviceClient.auth.admin.updateUserById(
        userId,
        attributes ?? {}
      );

      if (error) {
        return res.status(400).json({ error });
      }

      res.json({ data, error: null });
    } catch (err) {
      console.error('[supabase-proxy] admin update-user:', err);
      res.status(500).json({ error: { message: 'Erro ao atualizar usuário' } });
    }
  });

  async function assertProxyAllowed(req, res, { rpcName, spec } = {}) {
    const auth = await getAuthUser(req);
    if (!auth) {
      return true;
    }

    const cargo = await getUserCargo(auth.user.id);
    if (cargo === 'admin') {
      return true;
    }

    if (rpcName && BLOCKED_USER_RPCS.has(rpcName)) {
      res.status(403).json({
        data: null,
        error: { message: 'Operação não permitida' },
        count: null,
      });
      return false;
    }

    const { table, operation } = getQueryTableAndOperation(spec ?? {});
    if (table && operation && isBlockedUserTableWrite(table, operation)) {
      res.status(403).json({
        data: null,
        error: { message: 'Operação não permitida nesta tabela' },
        count: null,
      });
      return false;
    }

    return true;
  }

  async function handleTableQuery(req, res) {
    try {
      const spec = req.body?.query;
      if (!spec || typeof spec !== 'object') {
        return res.status(400).json({
          data: null,
          error: { message: 'Campo query obrigatório' },
          count: null,
        });
      }

      if (!(await assertProxyAllowed(req, res, { spec }))) {
        return;
      }

      const client = getClientForRequest(req);
      const result = await executeQuery(client, spec);

      res.json({
        data: result.data ?? null,
        error: result.error ?? null,
        count: result.count ?? null,
      });
    } catch (err) {
      console.error('[supabase-proxy] query:', err);
      res.status(500).json({
        data: null,
        error: { message: err.message || 'Erro ao executar query' },
        count: null,
      });
    }
  }

  async function handleRpc(req, res) {
    try {
      const fn = req.params.name;

      if (!(await assertProxyAllowed(req, res, { rpcName: fn }))) {
        return;
      }

      const client = getClientForRequest(req);
      const params = req.body?.params ?? req.body?.query?.params ?? {};

      const { data, error } = await client.rpc(fn, params);

      if (!error && typeof dispatchWebhookEvent === 'function') {
        const auth = await getAuthUser(req);
        if (fn === 'confirmar_deposito_pix_pago') {
          void maybeDispatchDepositPaidFromRpc(
            supabase,
            dispatchWebhookEvent,
            fn,
            params,
            data,
            auth?.user?.id
          );
        } else if (fn === 'atualizar_status_deposito_admin') {
          const status = String(params?.p_status ?? params?.pStatus ?? '').toLowerCase();
          if (status === 'aprovado') {
            void maybeDispatchDepositPaidFromRpc(
              supabase,
              dispatchWebhookEvent,
              fn,
              params,
              data,
              auth?.user?.id
            );
          }
        }
      }

      res.json({ data: data ?? null, error: error ?? null, count: null });
    } catch (err) {
      console.error('[supabase-proxy] rpc:', err);
      res.status(500).json({
        data: null,
        error: { message: err.message || 'Erro ao executar RPC' },
        count: null,
      });
    }
  }

  /** Rotas legíveis no DevTools → Network (último segmento = tabela, RPC ou hint) */
  router.post('/query', handleTableQuery);
  router.post('/rpc/:name', handleRpc);

  for (const op of ['select', 'insert', 'update', 'delete', 'upsert']) {
    router.post(`/${op}/:table`, handleTableQuery);
    router.post(`/${op}/:table/:label`, handleTableQuery);
  }

  return router;
}
