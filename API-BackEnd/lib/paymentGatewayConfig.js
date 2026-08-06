const CACHE_TTL_MS = 30_000;
const VALID_GATEWAYS = new Set(['misticpay', 'bspay', 'veopag']);

function envFallbackGateway() {
  const raw = (process.env.PAYMENT_GATEWAY || 'misticpay').trim().toLowerCase();
  return VALID_GATEWAYS.has(raw) ? raw : 'misticpay';
}

function normalizeGateway(value, fallback) {
  const gateway = String(value || fallback).trim().toLowerCase();
  return VALID_GATEWAYS.has(gateway) ? gateway : fallback;
}

export function createPaymentGatewayConfig(supabase) {
  let cache = null;
  let cacheAt = 0;

  async function loadGateways({ force = false } = {}) {
    const now = Date.now();
    if (!force && cache && now - cacheAt < CACHE_TTL_MS) {
      return cache;
    }

    const fallback = envFallbackGateway();

    if (!supabase) {
      cache = { deposit: fallback, withdraw: fallback };
      cacheAt = now;
      return cache;
    }

    try {
      const { data, error } = await supabase
        .from('integration_secrets')
        .select('payment_gateway, payment_gateway_deposit, payment_gateway_withdraw')
        .eq('id', 1)
        .maybeSingle();

      if (error) {
        console.warn('[PAYMENT] Falha ao carregar gateways ativos:', error.message);
        cache = { deposit: fallback, withdraw: fallback };
        cacheAt = now;
        return cache;
      }

      const legacy = normalizeGateway(data?.payment_gateway, fallback);
      cache = {
        deposit: normalizeGateway(data?.payment_gateway_deposit, legacy),
        withdraw: normalizeGateway(data?.payment_gateway_withdraw, legacy),
      };
      cacheAt = now;
      return cache;
    } catch (err) {
      console.warn('[PAYMENT] Erro ao carregar gateways ativos:', err?.message || err);
      cache = { deposit: fallback, withdraw: fallback };
      cacheAt = now;
      return cache;
    }
  }

  async function getDepositGateway(options) {
    const gateways = await loadGateways(options);
    return gateways.deposit;
  }

  async function getWithdrawGateway(options) {
    const gateways = await loadGateways(options);
    return gateways.withdraw;
  }

  /** @deprecated Use getDepositGateway ou getWithdrawGateway */
  async function getActiveGateway(options) {
    return getDepositGateway(options);
  }

  function invalidateCache() {
    cache = null;
    cacheAt = 0;
  }

  return { getDepositGateway, getWithdrawGateway, getActiveGateway, invalidateCache };
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
