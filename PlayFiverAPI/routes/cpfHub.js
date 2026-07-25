import { Router } from 'express';
import { createRateLimiter } from '../lib/security.js';

/**
 * Consulta CPF no cadastro (RegisterModal) — sem JWT; chaves CPF Hub ficam no servidor.
 * Rate limit por IP reduz abuso (M2 aceito: não revalidar CPF de terceiros pós-login).
 *
 * @param {{
 *   apiKeys: string[];
 * }} deps
 */
export function createCpfHubRouter({ apiKeys }) {
  const router = Router();
  const rateLimit = createRateLimiter({ windowMs: 60_000, max: 10 });

  /** GET /api/cpfhub/cpf/:cpf — validação no fluxo de registro */
  router.get('/cpf/:cpf', rateLimit, async (req, res) => {
    try {
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
