import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { executeQuery } from '../lib/executeQuery.js';
import { maybeDispatchDepositPaidFromRpc } from '../lib/depositWebhooks.js';
import {
  BLOCKED_USER_RPCS,
  getQueryTableAndOperation,
  isAdminOnlyRpcName,
  isBlockedUserTableWrite,
  ADMIN_2FA_SETUP_ALLOWED_RPCS,
  PUBLIC_ANON_RPCS,
  PUBLIC_ANON_SELECT_TABLES,
  sanitizeAdminUpdateUserAttributes,
} from '../lib/proxySecurity.js';
import { createRateLimiter, getClientIp } from '../lib/security.js';
import { getAuthUser as resolveAuthUser } from '../lib/auth.js';
import {
  clearAuthCookies,
  collectStoredAccessTokens,
  extractAccessToken,
  extractRefreshToken,
  isAdminClient,
  ADMIN_SESSION_TEST_MAX_AGE_SEC,
  sanitizeAuthPayload,
  sanitizeSessionForClient,
  setAuthCookies,
} from '../lib/authCookies.js';
import {
  buildOtpAuthUrl,
  buildQrDataUrl,
  consume2FAChallenge,
  create2FAChallenge,
  generateTotpSecret,
  get2FAChallenge,
  isAdminSessionElevated,
  markAdminSessionElevated,
  revokeAdminSessionElevation,
  transferAdminSessionElevation,
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
  const authIp = (req) => getClientIp(req) || 'unknown';

  /**
   * Error.message do AuthError do Supabase não é enumerável —
   * res.json({ error }) chega no client sem message. Serializa explicitamente.
   */
  function serializeAuthError(error, fallback = 'Erro de autenticação') {
    if (!error) return { message: fallback };
    if (typeof error === 'string') return { message: error || fallback };
    return {
      message: error.message || fallback,
      ...(error.status != null ? { status: error.status } : {}),
      ...(error.code != null ? { code: error.code } : {}),
      ...(error.name != null ? { name: error.name } : {}),
    };
  }

  const authSignInRateLimit = createRateLimiter({
    windowMs: 60_000,
    max: 20,
    keyFn: (req) => {
      const email = String(req.body?.email || '').trim().toLowerCase();
      return email ? `signin:${authIp(req)}:${email}` : `signin:${authIp(req)}`;
    },
  });

  const authSignUpRateLimit = createRateLimiter({
    windowMs: 60_000,
    max: 10,
    keyFn: (req) => {
      const email = String(req.body?.email || '').trim().toLowerCase();
      return email ? `signup:${authIp(req)}:${email}` : `signup:${authIp(req)}`;
    },
  });

  const auth2FAVerifyRateLimit = createRateLimiter({
    windowMs: 60_000,
    max: 10,
    keyFn: (req) => {
      const challenge = String(req.body?.challengeToken || '').slice(0, 48);
      return challenge ? `2fa:${authIp(req)}:${challenge}` : `2fa:${authIp(req)}`;
    },
  });

  const authRefreshRateLimit = createRateLimiter({
    windowMs: 60_000,
    max: 30,
    keyFn: (req) => `refresh:${authIp(req)}`,
  });

  const proxyDataRateLimit = createRateLimiter({
    windowMs: 60_000,
    max: 180,
    keyFn: (req) => `proxy:${authIp(req)}`,
  });

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

  async function getAuthUser(req, options) {
    return resolveAuthUser(supabase, req, options);
  }

  function getClientForRequest(req) {
    const extraHeaders = extractExtraHeaders(req);
    const token = extractAccessToken(req);

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

  async function getAdmin2FARecord(userId, accessToken = null) {
    const serviceClient = createServiceClient();
    const { data, error } = await serviceClient
      .from('usuarios')
      .select('cargo, two_factor_enabled, totp_secret, totp_pending_secret')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data) return data;

    if (!accessToken) return null;

    const userClient = createUserClient(accessToken);
    const { data: userRow, error: userError } = await userClient
      .from('usuarios')
      .select('cargo, two_factor_enabled, totp_secret, totp_pending_secret')
      .eq('id', userId)
      .maybeSingle();

    if (!userError && userRow) return userRow;

    const { data: cargo, error: cargoError } = await userClient.rpc('get_user_cargo');
    if (cargoError || cargo == null || cargo === '') return null;

    return {
      cargo: String(cargo),
      two_factor_enabled: false,
      totp_secret: null,
      totp_pending_secret: null,
    };
  }

  function adminRequires2FASetup(record) {
    return record?.cargo === 'admin' && (!record.two_factor_enabled || !record.totp_secret);
  }

  /** Admin autenticado — permite endpoints de configuração do 2FA antes da ativação. */
  async function requireAdminUserForSetup(req, res) {
    const auth = await getAuthUser(req);
    if (!auth) {
      res.status(401).json({ data: null, error: { message: 'Não autenticado' } });
      return null;
    }

    const record = await getAdmin2FARecord(auth.user.id, auth.token);
    if (record?.cargo !== 'admin') {
      res.status(403).json({ data: null, error: { message: 'Acesso negado' } });
      return null;
    }

    return { auth, record };
  }

  async function requireAdminUser(req, res) {
    const setup = await requireAdminUserForSetup(req, res);
    if (!setup) return null;

    const { auth, record } = setup;

    if (adminRequires2FASetup(record)) {
      res.status(403).json({
        data: null,
        error: {
          message: 'Configure o 2FA antes de continuar.',
          code: 'REQUIRES_2FA_SETUP',
        },
      });
      return null;
    }

    if (!isAdminSessionElevated(auth.token, req, auth.user.id)) {
      res.status(403).json({
        data: null,
        error: { message: '2FA necessário. Entre pelo painel administrativo.' },
      });
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
        return res.status(401).json({
          data: { user: null, session: null },
          error: serializeAuthError(error, 'Erro ao fazer login'),
        });
      }

      const isAdminPanel = req.headers['x-client-info'] === 'admin-panel';

      if (data?.user?.id) {
        const record = await getAdmin2FARecord(data.user.id, data.session?.access_token);

        // Painel admin: só conta admin; 2FA obrigatório se ativo.
        if (isAdminPanel) {
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

          // Admin sem 2FA: login permitido, mas exige configuração antes de acessar o painel.
          if (data.session?.access_token) {
            setAuthCookies(res, req, data.session);
            return res.json({
              data: {
                user: data.user,
                session: sanitizeSessionForClient(data.session, { admin: isAdminClient(req) }),
                requires2FASetup: true,
              },
              error: null,
            });
          }
        }
        // Front (ou qualquer cliente sem header admin-panel):
        // admin entra normalmente como jogador — SEM exigir 2FA e SEM elevação.
      }

      if (data?.session?.access_token) {
        setAuthCookies(res, req, data.session);
      }

      res.json({ data: sanitizeAuthPayload(data, { admin: isAdminClient(req) }), error: null });
    } catch (err) {
      console.error('[supabase-proxy] sign-in:', err);
      res.status(500).json({
        data: { user: null, session: null },
        error: { message: 'Erro interno ao autenticar' },
      });
    }
  });

  /** POST /api/supabase/auth/2fa/verify-login */
  router.post('/auth/2fa/verify-login', auth2FAVerifyRateLimit, async (req, res) => {
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
      if (pendingSession.session?.access_token) {
        markAdminSessionElevated(
          pendingSession.session.access_token,
          undefined,
          res,
          pendingSession.user.id
        );
        setAuthCookies(res, req, pendingSession.session);
      }
      res.json({
        data: sanitizeAuthPayload(
          {
            user: pendingSession.user,
            session: pendingSession.session,
          },
          { admin: isAdminClient(req) }
        ),
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
      const setup = await requireAdminUserForSetup(req, res);
      if (!setup) return;

      const { record } = setup;
      res.json({
        data: {
          enabled: !!record?.two_factor_enabled,
          requiresSetup: adminRequires2FASetup(record),
        },
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
      const setup = await requireAdminUserForSetup(req, res);
      if (!setup) return;

      const { auth, record } = setup;
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
      const setup = await requireAdminUserForSetup(req, res);
      if (!setup) return;

      const { auth, record } = setup;

      const { code } = req.body ?? {};
      if (!code) {
        return res.status(400).json({
          data: null,
          error: { message: 'Código de verificação obrigatório' },
        });
      }
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

      if (auth.token) {
        markAdminSessionElevated(auth.token, undefined, res, auth.user.id);
      }

      res.json({ data: { enabled: true, requiresSetup: false }, error: null });
    } catch (err) {
      console.error('[supabase-proxy] 2fa confirm:', err);
      res.status(500).json({ data: null, error: { message: 'Erro ao confirmar 2FA' } });
    }
  });

  /** POST /api/supabase/auth/2fa/disable */
  router.post('/auth/2fa/disable', async (req, res) => {
    try {
      const setup = await requireAdminUserForSetup(req, res);
      if (!setup) return;

      return res.status(403).json({
        data: null,
        error: { message: '2FA é obrigatório para administradores e não pode ser desativado.' },
      });
    } catch (err) {
      console.error('[supabase-proxy] 2fa disable:', err);
      res.status(500).json({ data: null, error: { message: 'Erro ao desativar 2FA' } });
    }
  });

  /** POST /api/supabase/auth/sign-up */
  router.post('/auth/sign-up', authSignUpRateLimit, async (req, res) => {
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
        return res.status(400).json({
          data: { user: null, session: null },
          error: serializeAuthError(error, 'Erro ao criar conta'),
        });
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

      if (data?.session?.access_token) {
        setAuthCookies(res, req, data.session);
      }

      res.json({ data: sanitizeAuthPayload(data, { admin: isAdminClient(req) }), error: null });
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
      for (const token of collectStoredAccessTokens(req)) {
        revokeAdminSessionElevation(token, res);
        try {
          const userClient = createUserClient(token);
          await userClient.auth.signOut();
        } catch (signOutErr) {
          console.warn('[supabase-proxy] sign-out token:', signOutErr?.message ?? signOutErr);
        }
      }

      clearAuthCookies(res, req, { both: true, includeElevation: true });
      res.json({ error: null });
    } catch (err) {
      console.error('[supabase-proxy] sign-out:', err);
      clearAuthCookies(res, req, { both: true, includeElevation: true });
      res.status(500).json({ error: { message: 'Erro ao encerrar sessão' } });
    }
  });

  /** GET /api/supabase/auth/session */
  router.get('/auth/session', async (req, res) => {
    try {
      const adminClient = isAdminClient(req);
      let auth = await getAuthUser(req, { preferAdmin: adminClient });

      if (!auth) {
        const refreshToken = extractRefreshToken(req, { preferAdmin: adminClient });
        if (refreshToken && !(adminClient && ADMIN_SESSION_TEST_MAX_AGE_SEC > 0)) {
          const { data, error } = await authClient.auth.refreshSession({
            refresh_token: refreshToken,
          });

          if (!error && data?.session?.access_token) {
            const oldToken = extractAccessToken(req, { preferAdmin: adminClient });
            const userId = data.session.user?.id;
            if (oldToken) {
              transferAdminSessionElevation(
                oldToken,
                data.session.access_token,
                req,
                res,
                undefined,
                userId
              );
            }
            if (
              userId &&
              !isAdminSessionElevated(data.session.access_token, req, userId) &&
              isAdminSessionElevated(null, req, userId)
            ) {
              markAdminSessionElevated(data.session.access_token, undefined, res, userId);
            }
            setAuthCookies(res, req, data.session);
            return res.json({
              data: { session: sanitizeSessionForClient(data.session, { admin: adminClient }) },
              error: null,
            });
          }

          if (error) {
            clearAuthCookies(res, req);
          }
        }

        return res.json({ data: { session: null }, error: null });
      }

      const userClient = createUserClient(auth.token);
      const { data, error } = await userClient.auth.getSession();

      if (error || !data?.session) {
        const elevated = isAdminSessionElevated(auth.token, req, auth.user.id);
        if (adminClient && auth.user?.id && elevated) {
          markAdminSessionElevated(auth.token, undefined, res, auth.user.id);
        }
        return res.json({
          data: {
            session: sanitizeSessionForClient(
              { user: auth.user },
              { admin: adminClient, elevated: adminClient ? elevated : undefined }
            ),
          },
          error: null,
        });
      }

      const elevated =
        adminClient && auth.user?.id
          ? isAdminSessionElevated(auth.token, req, auth.user.id)
          : false;

      if (adminClient && auth.user?.id && elevated) {
        markAdminSessionElevated(auth.token, undefined, res, auth.user.id);
      }

      res.json({
        data: {
          session: sanitizeSessionForClient(data.session, {
            admin: adminClient,
            elevated: adminClient ? elevated : undefined,
          }),
        },
        error: null,
      });
    } catch (err) {
      console.error('[supabase-proxy] session:', err);
      res.status(500).json({
        data: { session: null },
        error: { message: 'Erro ao obter sessão' },
      });
    }
  });

  /** POST /api/supabase/auth/refresh */
  router.post('/auth/refresh', authRefreshRateLimit, async (req, res) => {
    try {
      const adminClient = isAdminClient(req);
      if (adminClient && ADMIN_SESSION_TEST_MAX_AGE_SEC > 0) {
        return res.status(401).json({
          data: { session: null },
          error: null,
        });
      }

      const refreshToken = extractRefreshToken(req, { preferAdmin: adminClient });
      if (!refreshToken) {
        return res.status(401).json({
          data: { session: null },
          error: null,
        });
      }

      const { data, error } = await authClient.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (error) {
        clearAuthCookies(res, req);
        return res.status(401).json({
          data: { session: null },
          error: serializeAuthError(error, 'Erro ao renovar sessão'),
        });
      }

      const oldToken = extractAccessToken(req, { preferAdmin: adminClient });
      const userId = data?.session?.user?.id;
      if (oldToken && data?.session?.access_token) {
        transferAdminSessionElevation(
          oldToken,
          data.session.access_token,
          req,
          res,
          undefined,
          userId
        );
      }
      if (
        userId &&
        data?.session?.access_token &&
        !isAdminSessionElevated(data.session.access_token, req, userId) &&
        isAdminSessionElevated(null, req, userId)
      ) {
        markAdminSessionElevated(data.session.access_token, undefined, res, userId);
      }

      if (data?.session?.access_token) {
        setAuthCookies(res, req, data.session);
      }

      res.json({ data: sanitizeAuthPayload(data, { admin: adminClient }), error: null });
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
      if (!isAdminClient(req)) {
        return res.status(404).json({ error: { message: 'Não encontrado' } });
      }

      const auth = await requireAdminUser(req, res);
      if (!auth) return;

      if (!supabaseServiceKey) {
        return res.status(503).json({
          error: { message: 'SUPABASE_SERVICE_KEY não configurada no servidor' },
        });
      }

      const { userId, attributes } = req.body ?? {};
      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ error: { message: 'userId obrigatório' } });
      }

      const sanitized = sanitizeAdminUpdateUserAttributes(attributes);
      if (!sanitized.ok) {
        return res.status(400).json({ error: { message: sanitized.error } });
      }

      const serviceClient = createServiceClient();
      const { data, error } = await serviceClient.auth.admin.updateUserById(
        userId,
        sanitized.attributes
      );

      if (error) {
        return res.status(400).json({
          error: serializeAuthError(error, 'Erro ao atualizar usuário'),
        });
      }

      try {
        const adminClient = createUserClient(auth.token, extractExtraHeaders(req));
        await adminClient.rpc('registrar_admin_log', {
          p_acao: 'Alterar senha Auth (admin)',
          p_detalhes: `Usuario alvo: ${userId}`,
          p_status: 'sucesso',
          p_categoria: 'usuarios',
          p_metadata: { target_user_id: userId, fields: ['password'] },
        });
      } catch (logErr) {
        console.warn('[supabase-proxy] admin update-user log:', logErr);
      }

      res.json({ data, error: null });
    } catch (err) {
      console.error('[supabase-proxy] admin update-user:', err);
      res.status(500).json({ error: { message: 'Erro ao atualizar usuário' } });
    }
  });

  async function assertProxyAllowed(req, res, { rpcName, spec } = {}) {
    const { table, operation } = getQueryTableAndOperation(spec ?? {});
    const effectiveRpc =
      rpcName ||
      (spec?.operation === 'rpc' && typeof spec.function === 'string' ? spec.function : null);

    // Deny-list de tabelas — todos os callers (anon, user, admin elevado).
    if (table && operation && isBlockedUserTableWrite(table, operation)) {
      res.status(403).json({
        data: null,
        error: { message: 'Operação não permitida nesta tabela' },
        count: null,
      });
      return false;
    }

    const auth = await getAuthUser(req);

    if (!auth) {
      if (effectiveRpc) {
        if (PUBLIC_ANON_RPCS.has(effectiveRpc)) return true;
        res.status(401).json({
          data: null,
          error: { message: 'Não autenticado' },
          count: null,
        });
        return false;
      }
      if (table && operation === 'select' && PUBLIC_ANON_SELECT_TABLES.has(table.toLowerCase())) {
        return true;
      }
      res.status(401).json({
        data: null,
        error: { message: 'Não autenticado' },
        count: null,
      });
      return false;
    }

    const record = await getAdmin2FARecord(auth.user.id, auth.token);
    const isAdmin = record?.cargo === 'admin';
    const needsSetup = adminRequires2FASetup(record);
    const needsElevation = !!(isAdmin && record.two_factor_enabled && record.totp_secret);
    const fromAdminPanel = isAdminClient(req);
    const elevated = isAdminSessionElevated(auth.token, req, auth.user.id);

    if (fromAdminPanel && isAdmin && needsSetup) {
      if (effectiveRpc && ADMIN_2FA_SETUP_ALLOWED_RPCS.has(effectiveRpc)) {
        return true;
      }
      if (table && operation === 'select' && PUBLIC_ANON_SELECT_TABLES.has(table.toLowerCase())) {
        return true;
      }

      res.status(403).json({
        data: null,
        error: {
          message: 'Configure o 2FA antes de continuar.',
          code: 'REQUIRES_2FA_SETUP',
        },
        count: null,
      });
      return false;
    }

    // Admin com 2FA configurado e sessão elevada: bypass deny-list de RPCs.
    if (isAdmin && needsElevation && elevated) {
      return true;
    }

    if (
      effectiveRpc &&
      isAdminOnlyRpcName(effectiveRpc) &&
      isAdmin &&
      needsElevation &&
      !elevated
    ) {
      res.status(403).json({
        data: null,
        error: { message: '2FA necessário. Faça login novamente no painel administrativo.' },
        count: null,
      });
      return false;
    }

    if (effectiveRpc && (BLOCKED_USER_RPCS.has(effectiveRpc) || isAdminOnlyRpcName(effectiveRpc))) {
      res.status(403).json({
        data: null,
        error: { message: 'Operação não permitida' },
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
  router.post('/query', proxyDataRateLimit, handleTableQuery);
  router.post('/rpc/:name', proxyDataRateLimit, handleRpc);

  for (const op of ['select', 'insert', 'update', 'delete', 'upsert']) {
    router.post(`/${op}/:table`, proxyDataRateLimit, handleTableQuery);
    router.post(`/${op}/:table/:label`, proxyDataRateLimit, handleTableQuery);
  }

  return router;
}
