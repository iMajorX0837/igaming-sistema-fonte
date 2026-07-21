const CACHE_TTL_MS = 30_000;
const VALID_GATEWAYS = new Set(['misticpay', 'bspay', 'veopag']);

function envFallbackGateway() {
  const raw = (process.env.PAYMENT_GATEWAY || 'misticpay').trim().toLowerCase();
  return VALID_GATEWAYS.has(raw) ? raw : 'misticpay';
}

export function createPaymentGatewayConfig(supabase) {
  let cache = null;
  let cacheAt = 0;

  async function getActiveGateway({ force = false } = {}) {
    const now = Date.now();
    if (!force && cache && now - cacheAt < CACHE_TTL_MS) {
      return cache;
    }

    const fallback = envFallbackGateway();

    if (!supabase) {
      cache = fallback;
      cacheAt = now;
      return cache;
    }

    try {
      const { data, error } = await supabase
        .from('integration_secrets')
        .select('payment_gateway')
        .eq('id', 1)
        .maybeSingle();

      if (error) {
        console.warn('[PAYMENT] Falha ao carregar gateway ativo:', error.message);
        cache = fallback;
        cacheAt = now;
        return cache;
      }

      const gateway = String(data?.payment_gateway || fallback).trim().toLowerCase();
      cache = VALID_GATEWAYS.has(gateway) ? gateway : fallback;
      cacheAt = now;
      return cache;
    } catch (err) {
      console.warn('[PAYMENT] Erro ao carregar gateway ativo:', err?.message || err);
      cache = fallback;
      cacheAt = now;
      return cache;
    }
  }

  function invalidateCache() {
    cache = null;
    cacheAt = 0;
  }

  return { getActiveGateway, invalidateCache };
}

let sharedGatewayConfig = null;

export function initPaymentGatewayConfig(supabase) {
  sharedGatewayConfig = createPaymentGatewayConfig(supabase);
  return sharedGatewayConfig;
}

export function getPaymentGatewayConfigService() {
  if (!sharedGatewayConfig) {
    sharedGatewayConfig = createPaymentGatewayConfig(null);
  }
  return sharedGatewayConfig;
}
