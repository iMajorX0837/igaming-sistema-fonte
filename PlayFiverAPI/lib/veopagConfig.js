const DEFAULT_API_URL = 'https://api.veopag.com';
const CACHE_TTL_MS = 30_000;

function envFallback() {
  return {
    clientId: (process.env.VEOPAG_CLIENT_ID || '').trim(),
    clientSecret: (process.env.VEOPAG_CLIENT_SECRET || '').trim(),
    webhookSecret: (process.env.VEOPAG_WEBHOOK_SECRET || '').trim(),
    apiUrl: (process.env.VEOPAG_API_URL || DEFAULT_API_URL).replace(/\/$/, ''),
  };
}

export function createVeopagConfig(supabase) {
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
        .select('veopag_client_id, veopag_client_secret, veopag_webhook_secret, veopag_api_url')
        .eq('id', 1)
        .maybeSingle();

      if (error) {
        console.warn('[VEOPAG] Falha ao carregar credenciais do Supabase:', error.message);
        cache = fallback;
        cacheAt = now;
        return cache;
      }

      const clientId = String(data?.veopag_client_id || '').trim() || fallback.clientId;
      const clientSecret = String(data?.veopag_client_secret || '').trim() || fallback.clientSecret;
      const webhookSecret =
        String(data?.veopag_webhook_secret || '').trim() || fallback.webhookSecret;
      const apiUrl = String(data?.veopag_api_url || fallback.apiUrl || DEFAULT_API_URL).replace(
        /\/$/,
        ''
      );

      cache = { clientId, clientSecret, webhookSecret, apiUrl };
      cacheAt = now;
      return cache;
    } catch (err) {
      console.warn('[VEOPAG] Erro ao carregar credenciais:', err?.message || err);
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

export function initVeopagConfig(supabase) {
  sharedConfig = createVeopagConfig(supabase);
  return sharedConfig;
}

export function getVeopagConfigService() {
  if (!sharedConfig) {
    sharedConfig = createVeopagConfig(null);
  }
  return sharedConfig;
}
