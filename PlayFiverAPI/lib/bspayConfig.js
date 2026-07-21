const DEFAULT_API_URL = 'https://api.bspay.co';
const CACHE_TTL_MS = 30_000;

function envFallback() {
  return {
    clientId: (process.env.BSPAY_CLIENT_ID || '').trim(),
    clientSecret: (process.env.BSPAY_CLIENT_SECRET || '').trim(),
    signingKey: (process.env.BSPAY_SIGNING_KEY || '').trim(),
    webhookSecret: (process.env.BSPAY_WEBHOOK_SECRET || '').trim(),
    apiUrl: (process.env.BSPAY_API_URL || DEFAULT_API_URL).replace(/\/$/, ''),
  };
}

export function createBspayConfig(supabase) {
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
        .select(
          'bspay_client_id, bspay_client_secret, bspay_signing_key, bspay_webhook_secret, bspay_api_url'
        )
        .eq('id', 1)
        .maybeSingle();

      if (error) {
        console.warn('[BSPAY] Falha ao carregar credenciais do Supabase:', error.message);
        cache = fallback;
        cacheAt = now;
        return cache;
      }

      const clientId = String(data?.bspay_client_id || '').trim() || fallback.clientId;
      const clientSecret = String(data?.bspay_client_secret || '').trim() || fallback.clientSecret;
      const signingKey = String(data?.bspay_signing_key || '').trim() || fallback.signingKey;
      const webhookSecret =
        String(data?.bspay_webhook_secret || '').trim() || fallback.webhookSecret;
      const apiUrl = String(data?.bspay_api_url || fallback.apiUrl || DEFAULT_API_URL).replace(
        /\/$/,
        ''
      );

      cache = { clientId, clientSecret, signingKey, webhookSecret, apiUrl };
      cacheAt = now;
      return cache;
    } catch (err) {
      console.warn('[BSPAY] Erro ao carregar credenciais:', err?.message || err);
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

export function initBspayConfig(supabase) {
  sharedConfig = createBspayConfig(supabase);
  return sharedConfig;
}

export function getBspayConfigService() {
  if (!sharedConfig) {
    sharedConfig = createBspayConfig(null);
  }
  return sharedConfig;
}
