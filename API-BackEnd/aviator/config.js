/** Serviço de configuração RTP do Aviator (Supabase + cache). */

import { extractAccessToken } from '../lib/authCookies.js';
import { isAdminSessionElevated } from '../lib/adminTwoFactor.js';

const CACHE_TTL_MS = 3_000;

const DEFAULT_ENGINE = {
  ok: true,
  modo_geracao: 'velas',
  rtp_geral: 0.97,
  pct_vela_azul: 52,
  pct_vela_roxa: 38,
  pct_vela_rosa: 10,
  min_crash: 1.01,
  max_crash: 500,
  min_crash_mul: 101,
  max_crash_mul: 50000,
  queue_size: 50,
  config_version: 'default',
  engine_version: 'default',
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

      // RPC antiga omite modo/pct/geracao_* — completa pela tabela.
      let row = null;
      const rpcMissingVelas =
        data.pct_vela_azul == null ||
        data.pct_vela_roxa == null ||
        data.pct_vela_rosa == null ||
        data.modo_geracao == null;
      if (rpcMissingVelas) {
        console.warn(
          '[AVIATOR CONFIG] RPC sem pct_vela_*/modo_geracao — lendo aviator_config. Aplique Deploy-Infra/fix_aviator_engine_config_velas.sql'
        );
        const { data: tableRow, error: tableError } = await supabase
          .from('aviator_config')
          .select(
            'modo_geracao, pct_vela_azul, pct_vela_roxa, pct_vela_rosa, geracao_min_crash, geracao_max_crash, min_crash, max_crash, crash_technical_max, queue_size, updated_at'
          )
          .eq('id', 1)
          .maybeSingle();
        if (tableError) {
          console.warn('[AVIATOR CONFIG] Fallback tabela falhou:', tableError.message);
        } else {
          row = tableRow;
        }
      }

      const modo = String(data.modo_geracao ?? row?.modo_geracao ?? 'velas');
      const pctAzul = Number(data.pct_vela_azul ?? row?.pct_vela_azul ?? 52);
      const pctRoxa = Number(data.pct_vela_roxa ?? row?.pct_vela_roxa ?? 38);
      const pctRosa = Number(data.pct_vela_rosa ?? row?.pct_vela_rosa ?? 10);

      let minCrash = Number(data.min_crash ?? 1.01);
      let maxCrash = Number(data.max_crash ?? 500);
      if (row) {
        if (modo === 'crash') {
          minCrash = Number(row.min_crash ?? minCrash);
          maxCrash = Number(row.max_crash ?? maxCrash);
        } else {
          minCrash = Number(row.geracao_min_crash ?? row.min_crash ?? minCrash);
          maxCrash = Number(row.geracao_max_crash ?? row.max_crash ?? maxCrash);
        }
      }

      const minMulFromBounds = Math.max(101, Math.floor(minCrash * 100));
      const techMax = Number(data.crash_technical_max ?? row?.crash_technical_max ?? 1000);
      const maxMulFromBounds = Math.min(
        Math.floor(techMax * 100),
        Math.floor(maxCrash * 100)
      );

      const configVersion = String(
        data.config_version ?? row?.updated_at ?? 'default'
      );
      const engineVersion = String(
        data.engine_version && !rpcMissingVelas
          ? data.engine_version
          : `${modo}:${pctAzul}:${pctRoxa}:${pctRosa}:${configVersion}`
      );

      cache = {
        ...DEFAULT_ENGINE,
        ...data,
        modo_geracao: modo,
        rtp_geral: Number(data.rtp_geral ?? data.rtp_base ?? data.effective_rtp ?? 0.97),
        pct_vela_azul: pctAzul,
        pct_vela_roxa: pctRoxa,
        pct_vela_rosa: pctRosa,
        geracao_min_crash: Number(
          data.geracao_min_crash ?? row?.geracao_min_crash ?? minCrash
        ),
        geracao_max_crash: Number(
          data.geracao_max_crash ?? row?.geracao_max_crash ?? maxCrash
        ),
        min_crash: minCrash,
        max_crash: maxCrash,
        min_crash_mul: rpcMissingVelas
          ? minMulFromBounds
          : Number(data.min_crash_mul ?? minMulFromBounds),
        max_crash_mul: rpcMissingVelas
          ? maxMulFromBounds
          : Number(data.max_crash_mul ?? maxMulFromBounds),
        queue_size: Number(data.queue_size ?? row?.queue_size ?? 50),
        config_version: configVersion,
        engine_version: engineVersion,
        ggr: Number(data.ggr ?? data.stats?.ggr ?? 0),
        rtp_real_pct: Number(data.stats?.rtp_real_pct ?? data.rtp_real_pct ?? 0),
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
    const token = extractAccessToken(req, { preferAdmin: true });
    if (!token) return false;

    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data?.user?.id) return false;

      const { data: usuario, error: userError } = await supabase
        .from('usuarios')
        .select('cargo, two_factor_enabled, totp_secret')
        .eq('id', data.user.id)
        .maybeSingle();

      if (userError || !usuario || usuario.cargo !== 'admin') return false;

      if (!usuario.two_factor_enabled || !usuario.totp_secret) return false;

      if (!isAdminSessionElevated(token, req, data.user.id)) {
        return false;
      }

      return true;
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
