/** Serviço de configuração RTP do Aviator (Supabase + cache). */

const CACHE_TTL_MS = 10_000;

const DEFAULT_ENGINE = {
  ok: true,
  rtp_factor: 0.97,
  rtp_base: 0.97,
  rtp_min: 0.9,
  rtp_max: 0.99,
  effective_rtp: 0.97,
  recovery_enabled: true,
  recovery_adjustment: 0,
  min_crash_mul: 101,
  max_crash_mul: 50000,
  queue_size: 50,
  config_version: 'default',
  ggr_target_pct: 3,
  ggr_pct: 0,
  rtp_real_pct: 0,
  stats: {
    total_wagered: 0,
    total_paid: 0,
    ggr: 0,
    bet_count: 0,
  },
};

export function createAviatorConfig(supabase) {
  let cache = null;
  let cacheAt = 0;

  async function getEngineConfig({ force = false } = {}) {
    const now = Date.now();
    if (!force && cache && now - cacheAt < CACHE_TTL_MS) {
      return cache;
    }

    try {
      const { data, error } = await supabase.rpc('obter_aviator_engine_config');
      if (error) {
        console.warn('[AVIATOR CONFIG] RPC falhou:', error.message);
        return cache || DEFAULT_ENGINE;
      }
      if (!data?.ok) {
        console.warn('[AVIATOR CONFIG] RPC retornou ok=false');
        return cache || DEFAULT_ENGINE;
      }

      cache = {
        ...DEFAULT_ENGINE,
        ...data,
        rtp_factor: Number(data.rtp_factor ?? data.effective_rtp ?? 0.97),
        effective_rtp: Number(data.effective_rtp ?? data.rtp_factor ?? 0.97),
        min_crash_mul: Number(data.min_crash_mul ?? 101),
        max_crash_mul: Number(data.max_crash_mul ?? 50000),
        queue_size: Number(data.queue_size ?? 50),
        config_version: String(data.config_version ?? 'default'),
      };
      cacheAt = now;
      return cache;
    } catch (err) {
      console.warn('[AVIATOR CONFIG] Erro ao carregar:', err?.message || err);
      return cache || DEFAULT_ENGINE;
    }
  }

  function invalidateCache() {
    cache = null;
    cacheAt = 0;
  }

  async function validateAdminBearer(req) {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return false;

    const token = auth.slice(7).trim();
    if (!token) return false;

    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data?.user?.id) return false;

      const { data: usuario, error: userError } = await supabase
        .from('usuarios')
        .select('cargo')
        .eq('id', data.user.id)
        .maybeSingle();

      if (userError || !usuario) return false;
      return usuario.cargo === 'admin';
    } catch {
      return false;
    }
  }

  return {
    getEngineConfig,
    invalidateCache,
    validateAdminBearer,
  };
}
