const DEFAULT_API_URL = 'https://api.misticpay.com/api';
const CACHE_TTL_MS = 30_000;

function envFallback() {
  return {
    ci: (process.env.MISTICPAY_CI || '').trim(),
    cs: (process.env.MISTICPAY_CS || '').trim(),
    apiUrl: (process.env.MISTICPAY_API_URL || DEFAULT_API_URL).replace(/\/$/, ''),
    webhookSecret: (process.env.MISTICPAY_WEBHOOK_SECRET || '').trim(),
  };
}

export function createMisticPayConfig(supabase) {
  let cache = null;
  let cacheAt = 0;

  async function getConfig({ force = false } = {}) {
    const now = Date.now();
    if (!force && cache && now - cacheAt < CACHE_TTL_MS) {
      return cache;
    }

    const fallback = envFallback();

    if (!supabase) {
      cache = fallback;
      cacheAt = now;
      return cache;
    }

    try {
      const { data, error } = await supabase
        .from('integration_secrets')
        .select('misticpay_ci, misticpay_cs, misticpay_api_url, misticpay_webhook_secret')
        .eq('id', 1)
        .maybeSingle();

      if (error) {
        console.warn('[MISTICPAY] Falha ao carregar credenciais do Supabase:', error.message);
        cache = fallback;
        cacheAt = now;
        return cache;
      }

      const ci = String(data?.misticpay_ci || '').trim() || fallback.ci;
      const cs = String(data?.misticpay_cs || '').trim() || fallback.cs;
      const apiUrl = String(data?.misticpay_api_url || fallback.apiUrl || DEFAULT_API_URL).replace(
        /\/$/,
        ''
      );
      const webhookSecret =
        String(data?.misticpay_webhook_secret || '').trim() || fallback.webhookSecret;

      cache = { ci, cs, apiUrl, webhookSecret };
      cacheAt = now;
      return cache;
    } catch (err) {
      console.warn('[MISTICPAY] Erro ao carregar credenciais:', err?.message || err);
      cache = fallback;
      cacheAt = now;
      return cache;
    }
  }

  function invalidateCache() {
    cache = null;
    cacheAt = 0;
  }

  return { getConfig, invalidateCache };
}

let sharedConfig = null;

export function initMisticPayConfig(supabase) {
  sharedConfig = createMisticPayConfig(supabase);
  return sharedConfig;
}

export function getMisticPayConfigService() {
  if (!sharedConfig) {
    sharedConfig = createMisticPayConfig(null);
  }
  return sharedConfig;
}
