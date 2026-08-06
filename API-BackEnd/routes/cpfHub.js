import { Router } from 'express';
import { createRateLimiter } from '../lib/security.js';
import { formatCpf, isValidCpf, normalizeCpf } from '../lib/cpf.js';

/**
 * Consulta CPF no cadastro (RegisterModal) — sem JWT; chaves CPF Hub ficam no servidor.
 * Rate limit por IP reduz abuso (M2 aceito: não revalidar CPF de terceiros pós-login).
 *
 * @param {{
 *   apiKeys: string[];
 *   supabase?: import('@supabase/supabase-js').SupabaseClient;
 * }} deps
 */
export function createCpfHubRouter({ apiKeys, supabase }) {
  const router = Router();
  const rateLimit = createRateLimiter({ windowMs: 60_000, max: 10 });

  /** GET /api/cpfhub/cpf/:cpf — validação no fluxo de registro */
  router.get('/cpf/:cpf', rateLimit, async (req, res) => {
    try {
      const cpf = normalizeCpf(req.params.cpf);
      if (cpf.length !== 11 || !isValidCpf(cpf)) {
        return res.status(400).json({
          success: false,
          code: 'cpf_invalid',
          message: 'CPF inválido.',
        });
      }

      // Bloqueia CPF já cadastrado antes de gastar crédito na API externa
      if (supabase) {
        const formatted = formatCpf(cpf);
        const { data: existing, error: lookupError } = await supabase
          .from('usuarios')
          .select('id')
          .or(`cpf.eq.${cpf},cpf.eq.${formatted}`)
          .limit(1)
          .maybeSingle();

        if (lookupError) {
          console.error('[cpfhub] Erro ao verificar CPF em uso:', lookupError.message);
          return res.status(500).json({
            success: false,
            code: 'cpf_check_failed',
            message: 'Não foi possível validar o CPF. Tente novamente.',
          });
        }

        if (existing?.id) {
          return res.status(409).json({
            success: false,
            code: 'cpf_in_use',
            message: 'Este CPF já está cadastrado. Faça login ou recupere sua conta.',
          });
        }
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
