import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { spawn } from 'child_process';
import { createAviatorWallet } from './wallet.js';
import { createAviatorRounds, MAX_VELAS } from './rounds.js';
import { createAviatorConfig } from './config.js';
import { startAviatorRecoveryWatcher } from './recoveryWatcher.js';
import {
  createAviatorGameSessionToken,
  validateAviatorGameSessionToken,
  validateAviatorInternal,
  validateAviatorGameSessionRequest,
} from '../lib/security.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AVIATOR_DIR = path.join(__dirname, '..', 'Aviator - Spribe (Clonado)');
const ICON_DIR = path.join(AVIATOR_DIR, 'images', 'icons');

export function isAviatorGameCode(gameCode, provider) {
  const code = String(gameCode || '').toLowerCase();
  const prov = String(provider || '').toLowerCase();
  if (!code) return false;
  if (code === 'aviator' || code.includes('aviator')) return true;
  return prov.includes('spribe') && code.includes('aviator');
}

export function buildAviatorLaunchUrl(publicApiUrl, { userCode, lang = 'pt', balance = 0 }) {
  const base = publicApiUrl.replace(/\/$/, '');
  const host = new URL(base).host;
  const gameSession = createAviatorGameSessionToken(userCode);
  const params = new URLSearchParams({
    param1: userCode,
    param2: 'venuz',
    param3: '1',
    param4: '1',
    param5: host,
    param6: lang,
    apiurl: host,
    currency: 'BRL',
    balance: String(balance ?? 0),
  });
  if (gameSession) {
    params.set('gs_token', gameSession);
  }
  return `${base}/aviator/?${params.toString()}`;
}

function proxyToPython(targetBase, req, res) {
  const target = new URL(req.originalUrl, targetBase);
  const headers = { ...req.headers, host: new URL(targetBase).host };
  delete headers['host'];

  const proxyReq = http.request(
    target,
    {
      method: req.method,
      headers,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on('error', (err) => {
    console.error('[AVIATOR] Proxy erro:', err.message);
    if (!res.headersSent) {
      res.status(502).json({ ok: false, error: 'Servidor Aviator indisponível' });
    }
  });

  if (req.method === 'GET' || req.method === 'HEAD') {
    proxyReq.end();
    return;
  }

  // express.json() on this route consumes the stream — re-send parsed body to Python
  if (req.body !== undefined && req.readableEnded) {
    const payload = Buffer.from(JSON.stringify(req.body), 'utf8');
    proxyReq.setHeader('Content-Type', req.headers['content-type'] || 'application/json');
    proxyReq.setHeader('Content-Length', payload.length);
    proxyReq.end(payload);
    return;
  }

  req.pipe(proxyReq);
}

let pythonProcess = null;

export function startAviatorPythonServer(nodePort, pythonPort) {
  if (pythonProcess || process.env.AVIATOR_PYTHON_AUTOSTART === 'false') return;

  const walletBridge = `http://127.0.0.1:${nodePort}/aviator/wallet`;
  const serverPy = path.join(AVIATOR_DIR, 'server.py');

  if (!fs.existsSync(serverPy)) {
    console.warn('[AVIATOR] server.py não encontrado — inicie o Python manualmente');
    return;
  }

  const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
  pythonProcess = spawn(
    pythonCmd,
    [serverPy],
    {
      cwd: AVIATOR_DIR,
      env: {
        ...process.env,
        PORT: String(pythonPort),
        WALLET_BRIDGE_URL: walletBridge,
        DISCORD_WEBHOOK: process.env.AVIATOR_DISCORD_WEBHOOK || '',
        AVIATOR_INTERNAL_SECRET: process.env.AVIATOR_INTERNAL_SECRET || '',
        AVIATOR_CONFIG_REFRESH_MS: process.env.AVIATOR_CONFIG_REFRESH_MS || '12000',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );

  pythonProcess.stdout?.on('data', (d) => process.stdout.write(`[AVIATOR-PY] ${d}`));
  pythonProcess.stderr?.on('data', (d) => process.stderr.write(`[AVIATOR-PY] ${d}`));
  pythonProcess.on('exit', (code) => {
    console.warn(`[AVIATOR] Python encerrou (code ${code})`);
    pythonProcess = null;
  });

  console.log(`[AVIATOR] Python iniciado na porta ${pythonPort} (wallet: ${walletBridge})`);
}

function requireAviatorInternalOnly(req, res, next) {
  if (validateAviatorInternal(req)) return next();
  return res.status(403).json({ ok: false, error: 'Acesso negado' });
}

function requireAviatorGameSessionOrInternal(req, res, next) {
  if (validateAviatorGameSessionRequest(req)) return next();
  return res.status(403).json({ ok: false, error: 'Acesso negado' });
}

export function mountAviatorProxy(app, { enabled = true } = {}) {
  if (!enabled) return null;

  const pythonPort = Number(process.env.AVIATOR_PYTHON_PORT || 8001);
  const pythonBase = `http://127.0.0.1:${pythonPort}`;
  const jsonParser = express.json({ limit: '1mb' });
  const proxy = (req, res) => proxyToPython(pythonBase, req, res);

  app.post('/api/game/rpc', jsonParser, requireAviatorGameSessionOrInternal, proxy);
  app.get('/api/game/events', requireAviatorGameSessionOrInternal, proxy);
  app.use('/api/game', requireAviatorGameSessionOrInternal, proxy);
  app.use('/api/history', requireAviatorGameSessionOrInternal, proxy);
  app.use('/api/chat', requireAviatorGameSessionOrInternal, proxy);
  app.use('/api/discord-notify', requireAviatorInternalOnly, proxy);

  return { pythonPort, pythonBase };
}

export function mountAviatorRoutes(app, { supabase, enabled = true }) {
  if (!enabled) return null;

  const rounds = createAviatorRounds(supabase);
  const aviatorConfig = createAviatorConfig(supabase);
  const pythonPort = Number(process.env.AVIATOR_PYTHON_PORT || 8001);
  const pythonBase = `http://127.0.0.1:${pythonPort}`;
  const internalSecret = process.env.AVIATOR_INTERNAL_SECRET || '';

  async function proxyPythonInternal(path, { method = 'GET', body = null } = {}) {
    const target = new URL(path, pythonBase);
    const headers = {};
    if (internalSecret) headers['X-Aviator-Internal'] = internalSecret;
    if (body != null) headers['Content-Type'] = 'application/json';

    return new Promise((resolve, reject) => {
      const req = http.request(
        target,
        { method, headers },
        (res) => {
          let raw = '';
          res.on('data', (chunk) => {
            raw += chunk;
          });
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode || 502, body: raw ? JSON.parse(raw) : {} });
            } catch {
              resolve({ status: res.statusCode || 502, body: { ok: false, error: 'Resposta inválida' } });
            }
          });
        }
      );
      req.on('error', reject);
      if (body != null) req.write(JSON.stringify(body));
      req.end();
    });
  }
  rounds
    .trimVelas()
    .then((result) => {
      if (result?.removed > 0) {
        console.log(`[AVIATOR] Startup: removidas ${result.removed} vela(s) excedentes do Supabase`);
      }
    })
    .catch((err) => {
      console.warn('[AVIATOR] Podar velas antigas na inicialização:', err?.message || err);
    });
  const wallet = createAviatorWallet(supabase, rounds);
  const router = express.Router();

  function requireAviatorInternal(req, res, next) {
    if (validateAviatorInternal(req)) return next();
    return res.status(403).json({ ok: false, error: 'Acesso negado' });
  }

  function requireAviatorInternalOrGameSession(req, res, next) {
    if (validateAviatorInternal(req)) return next();

    const userCode = String(
      req.body?.user_code || req.body?.account || req.query?.account || ''
    ).trim();
    const token =
      req.headers['x-game-session'] ||
      req.headers['X-Game-Session'] ||
      req.body?.game_session ||
      req.query?.gs_token;

    if (userCode && token && validateAviatorGameSessionToken(userCode, token)) {
      return next();
    }

    return res.status(403).json({ ok: false, error: 'Acesso negado' });
  }

  function sendHashedSvg(req, res, next) {
    const name = path.basename(req.path);
    if (!name.endsWith('.svg') || name.includes('..')) return next();
    const iconPath = path.join(ICON_DIR, name);
    if (fs.existsSync(iconPath)) return res.sendFile(iconPath);
    const rootPath = path.join(AVIATOR_DIR, name);
    if (fs.existsSync(rootPath)) return res.sendFile(rootPath);
    return next();
  }

  // Ícones hashed pedidos em /aviator/nome.hash.svg ou /nome.hash.svg
  app.get(/^\/aviator\/[^/]+\.svg$/i, sendHashedSvg);
  app.get(/^\/[^/]+\.svg$/i, sendHashedSvg);

  /** Config do motor RTP (Python consulta a cada rodada). */
  router.get('/engine-config', requireAviatorInternal, async (req, res) => {
    try {
      const engine = await aviatorConfig.getEngineConfig();
      res.json(engine);
    } catch (err) {
      console.error('[AVIATOR CONFIG] engine-config:', err);
      res.status(500).json({ ok: false, error: 'Erro interno' });
    }
  });

  /** Preview da fila RTP — somente admin autenticado. */
  app.get('/aviator/admin/rtp-preview', async (req, res) => {
    try {
      const isAdmin = await aviatorConfig.validateAdminBearer(req);
      if (!isAdmin) {
        return res.status(403).json({ ok: false, error: 'Acesso negado' });
      }
      const engine = await aviatorConfig.getEngineConfig({ force: true });
      const proxied = await proxyPythonInternal('/api/rtp');
      res.json({
        ok: true,
        engine,
        queue: proxied.body,
      });
    } catch (err) {
      console.error('[AVIATOR CONFIG] rtp-preview:', err);
      res.status(500).json({ ok: false, error: 'Erro interno' });
    }
  });

  /** Invalida fila após salvar config no admin. */
  app.post('/aviator/admin/invalidate-queue', express.json(), async (req, res) => {
    try {
      const isAdmin = await aviatorConfig.validateAdminBearer(req);
      if (!isAdmin) {
        return res.status(403).json({ ok: false, error: 'Acesso negado' });
      }
      aviatorConfig.invalidateCache();
      const proxied = await proxyPythonInternal('/api/rtp/invalidate', { method: 'POST', body: {} });
      res.status(proxied.status).json(proxied.body);
    } catch (err) {
      console.error('[AVIATOR CONFIG] invalidate-queue:', err);
      res.status(500).json({ ok: false, error: 'Erro ao invalidar fila' });
    }
  });

  /** Invalida fila de velas após alteração de config (interno). */
  router.post('/invalidate-queue', express.json(), requireAviatorInternal, async (req, res) => {
    try {
      aviatorConfig.invalidateCache();
      const proxied = await proxyPythonInternal('/api/rtp/invalidate', { method: 'POST', body: {} });
      res.status(proxied.status).json(proxied.body);
    } catch (err) {
      console.error('[AVIATOR CONFIG] invalidate-queue:', err);
      res.status(500).json({ ok: false, error: 'Erro ao invalidar fila' });
    }
  });

  async function invalidateAviatorQueueInternal() {
    aviatorConfig.invalidateCache();
    await proxyPythonInternal('/api/rtp/invalidate', { method: 'POST', body: {} });
  }

  startAviatorRecoveryWatcher({
    aviatorConfig,
    invalidateQueue: invalidateAviatorQueueInternal,
    intervalMs: Number(process.env.AVIATOR_RECOVERY_POLL_MS || 5000),
  });

  // ── Wallet bridge (Python chama estes endpoints) ──
  router.get('/balance', requireAviatorInternal, async (req, res) => {
    try {
      const userCode = String(req.query.user_code || req.query.account || '').trim();
      const result = await wallet.getBalance(userCode);
      if (!result.ok) return res.status(result.status || 404).json(result);
      res.json({
        ok: true,
        gold: result.gold,
        balance: result.balance,
        nickName: result.nickName,
        email: result.usuario.email,
      });
    } catch (err) {
      console.error('[AVIATOR WALLET] balance:', err);
      res.status(500).json({ ok: false, error: 'Erro interno' });
    }
  });

  router.post('/debit', express.json(), requireAviatorInternal, async (req, res) => {
    try {
      const { user_code, gold, betId, roundId } = req.body || {};
      const result = await wallet.debit({
        userCode: user_code,
        gold,
        betId,
        roundId,
        txnSuffix: 'bet',
      });
      if (!result.ok) return res.status(result.status || 400).json(result);
      res.json({ ok: true, gold: result.gold, balance: result.balance });
    } catch (err) {
      console.error('[AVIATOR WALLET] debit:', err);
      res.status(500).json({ ok: false, error: 'Erro interno' });
    }
  });

  router.post('/credit', express.json(), requireAviatorInternal, async (req, res) => {
    try {
      const { user_code, gold, betId, roundId, betGold, tipo, cashoutMultiplier } = req.body || {};
      const result = await wallet.credit({
        userCode: user_code,
        gold,
        betId,
        roundId,
        betGold,
        tipo: tipo || 'Ganhou',
        txnSuffix: 'win',
        cashoutMultiplier: cashoutMultiplier || gold,
      });
      if (!result.ok) return res.status(result.status || 400).json(result);
      res.json({ ok: true, gold: result.gold, balance: result.balance, winGold: result.winGold });
    } catch (err) {
      console.error('[AVIATOR WALLET] credit:', err);
      res.status(500).json({ ok: false, error: 'Erro interno' });
    }
  });

  router.post('/refund', express.json(), requireAviatorInternal, async (req, res) => {
    try {
      const { user_code, gold, betId, roundId } = req.body || {};
      const result = await wallet.refund({
        userCode: user_code,
        gold,
        betId,
        roundId,
      });
      if (!result.ok) return res.status(result.status || 400).json(result);
      res.json({ ok: true, gold: result.gold, balance: result.balance });
    } catch (err) {
      console.error('[AVIATOR WALLET] refund:', err);
      res.status(500).json({ ok: false, error: 'Erro interno' });
    }
  });

  router.post('/loss', express.json(), requireAviatorInternal, async (req, res) => {
    try {
      const { user_code, betGold, betId, roundId } = req.body || {};
      await wallet.recordLoss({ userCode: user_code, betGold, betId, roundId });
      res.json({ ok: true });
    } catch (err) {
      console.error('[AVIATOR WALLET] loss:', err);
      res.status(500).json({ ok: false, error: 'Erro interno' });
    }
  });

  /** Sincroniza rodada completa (Python → Supabase). */
  router.post('/round', express.json(), requireAviatorInternal, async (req, res) => {
    try {
      const result = await rounds.syncRound(req.body || {});
      if (!result.ok) return res.status(400).json(result);
      res.json(result);
    } catch (err) {
      console.error('[AVIATOR WALLET] round sync:', err);
      res.status(500).json({ ok: false, error: 'Erro interno' });
    }
  });

  /** Histórico de velas do Supabase (Python / admin). */
  router.get('/history', requireAviatorInternal, async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit, 10) || MAX_VELAS, MAX_VELAS);
      const detailed = await rounds.listVelasDetailed(limit);
      res.json({
        ...detailed,
        history: detailed.velas.map((v) => Number(v.crash_x)).filter(Boolean),
      });
    } catch (err) {
      console.error('[AVIATOR WALLET] history:', err);
      res.status(500).json({ ok: false, error: 'Erro interno' });
    }
  });

  router.get('/history/:externalRoundId', requireAviatorInternal, async (req, res) => {
    try {
      const detail = await rounds.getVelaDetail(req.params.externalRoundId);
      if (!detail) {
        return res.status(404).json({ ok: false, error: 'Rodada não encontrada' });
      }
      res.json(detail);
    } catch (err) {
      console.error('[AVIATOR WALLET] history detail:', err);
      res.status(500).json({ ok: false, error: 'Erro interno' });
    }
  });

  /** Meu histórico de apostas (modal do jogo). */
  router.post('/histories', express.json(), requireAviatorInternalOrGameSession, async (req, res) => {
    try {
      const userCode = String(
        req.body?.user_code || req.body?.account || req.query?.account || ''
      ).trim();
      const usuario = await wallet.findUsuario(userCode);
      if (!usuario) {
        return res.json({
          code: 404,
          bets: [],
          isMorePagesAvailable: false,
          lastBetId: 0,
          lastDateStamp: 0,
        });
      }

      const result = await rounds.listUserBetHistory({
        usuarioId: usuario.id,
        lastId: req.body?.lastId,
        dateStamp: req.body?.dateStamp,
        size: req.body?.size,
      });

      res.json({ code: 200, ...result });
    } catch (err) {
      console.error('[AVIATOR WALLET] histories:', err);
      res.status(500).json({
        code: 500,
        bets: [],
        isMorePagesAvailable: false,
        lastBetId: 0,
        lastDateStamp: 0,
      });
    }
  });

  app.use('/aviator/wallet', router);

  app.post('/histories', express.json(), requireAviatorInternalOrGameSession, async (req, res) => {
    try {
      const userCode = String(
        req.body?.user_code || req.body?.account || req.query?.account || ''
      ).trim();
      const usuario = await wallet.findUsuario(userCode);
      if (!usuario) {
        return res.json({
          code: 404,
          bets: [],
          isMorePagesAvailable: false,
          lastBetId: 0,
          lastDateStamp: 0,
        });
      }

      const result = await rounds.listUserBetHistory({
        usuarioId: usuario.id,
        lastId: req.body?.lastId,
        dateStamp: req.body?.dateStamp,
        size: req.body?.size,
      });

      res.json({ code: 200, ...result });
    } catch (err) {
      console.error('[AVIATOR] histories:', err);
      res.status(500).json({
        code: 500,
        bets: [],
        isMorePagesAvailable: false,
        lastBetId: 0,
        lastDateStamp: 0,
      });
    }
  });

  // RTP page (legado — preferir painel admin)
  app.get('/rtp', (req, res, next) => {
    if (process.env.AVIATOR_RTP_PAGE_ENABLED !== 'true') {
      return res.status(404).json({ ok: false, error: 'Página RTP desabilitada' });
    }
    const rtpPath = path.join(AVIATOR_DIR, 'rtp.html');
    if (fs.existsSync(rtpPath)) return res.sendFile(rtpPath);
    next();
  });

  // Arquivos estáticos do jogo
  if (fs.existsSync(AVIATOR_DIR)) {
    app.use('/aviator', express.static(AVIATOR_DIR, { index: 'index.html' }));
    console.log(`[AVIATOR] Static em /aviator/ (${AVIATOR_DIR})`);
  } else {
    console.warn('[AVIATOR] Pasta do jogo não encontrada:', AVIATOR_DIR);
  }

  return { wallet, rounds, aviatorConfig };
}
