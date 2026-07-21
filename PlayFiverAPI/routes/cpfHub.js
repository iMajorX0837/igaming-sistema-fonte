import { Router } from 'express';
import { createRateLimiter } from '../lib/security.js';

/**
 * @param {{
 *   apiKeys: string[];
 *   supabase: import('@supabase/supabase-js').SupabaseClient;
 * }} deps
 */
export function createCpfHubRouter({ apiKeys, supabase }) {
  const router = Router();
  const rateLimit = createRateLimiter({ windowMs: 60_000, max: 8 });

  async function requireAuth(req, res) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'Faça login para consultar CPF.' });
      return null;
    }

    const token = authHeader.slice(7).trim();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      res.status(401).json({ success: false, message: 'Sessão inválida.' });
      return null;
    }

    return data.user;
  }

  /** GET /api/cpfhub/cpf/:cpf — consulta CPF (chaves ficam no servidor) */
  router.get('/cpf/:cpf', rateLimit, async (req, res) => {
    try {
      if (!(await requireAuth(req, res))) {
        return;
      }

      const cpf = String(req.params.cpf ?? '').replace(/\D/g, '');
      if (cpf.length !== 11) {
        return res.status(400).json({ success: false, message: 'CPF inválido' });
      }

      if (apiKeys.length === 0) {
        console.warn('[cpfhub] CPFHUB_API_KEY não configurada');
        return res.status(503).json({ success: false, message: 'Serviço de CPF indisponível' });
      }

      const targetUrl = `https://api.cpfhub.io/cpf/${cpf}`;
      let lastResponse = null;
      let lastBody = null;

      for (const key of apiKeys) {
        try {
          const upstream = await fetch(targetUrl, {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              'x-api-key': key,
            },
          });

          const rawText = await upstream.text();
          if (upstream.ok) {
            res.status(upstream.status);
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            return res.send(rawText);
          }

          lastResponse = upstream;
          lastBody = rawText;
        } catch (err) {
          console.error('[cpfhub] Erro ao consultar CPF Hub:', err.message);
        }
      }

      if (lastResponse) {
        res.status(lastResponse.status);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return res.send(lastBody ?? JSON.stringify({ success: false }));
      }

      res.status(502).json({ success: false, message: 'Erro ao consultar CPF Hub' });
    } catch (err) {
      console.error('[cpfhub] Erro interno:', err);
      res.status(500).json({ success: false, message: 'Erro interno ao consultar CPF' });
    }
  });

  return router;
}
