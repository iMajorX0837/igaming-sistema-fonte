import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface PlataformaConfig {
  deposito_minimo: number;
  deposito_maximo: number;
  saque_minimo: number;
  saque_maximo: number;
  saques_diarios_permitidos: number;
  rollover_padrao: number;
  indicacao_recompensa: number;
  indicacao_deposito_minimo: number;
}

export const DEFAULT_PLATAFORMA_CONFIG: PlataformaConfig = {
  deposito_minimo: 20,
  deposito_maximo: 1_000_000,
  saque_minimo: 50,
  saque_maximo: 1_000_000,
  saques_diarios_permitidos: 1,
  rollover_padrao: 1,
  indicacao_recompensa: 100,
  indicacao_deposito_minimo: 50,
};

let cachedConfig: PlataformaConfig | null = null;
let fetchPromise: Promise<PlataformaConfig> | null = null;

export async function fetchPlataformaConfig(): Promise<PlataformaConfig> {
  if (cachedConfig) return cachedConfig;

  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const { data, error } = await supabase.rpc('obter_config_plataforma');

      if (error) {
        console.error('obter_config_plataforma:', error);
        return DEFAULT_PLATAFORMA_CONFIG;
      }

      const result = data as { ok?: boolean } & PlataformaConfig;
      if (result?.ok) {
        cachedConfig = {
          deposito_minimo: Number(result.deposito_minimo) || DEFAULT_PLATAFORMA_CONFIG.deposito_minimo,
          deposito_maximo: Number(result.deposito_maximo) || DEFAULT_PLATAFORMA_CONFIG.deposito_maximo,
          saque_minimo: Number(result.saque_minimo) || DEFAULT_PLATAFORMA_CONFIG.saque_minimo,
          saque_maximo: Number(result.saque_maximo) || DEFAULT_PLATAFORMA_CONFIG.saque_maximo,
          saques_diarios_permitidos:
            Number(result.saques_diarios_permitidos) || DEFAULT_PLATAFORMA_CONFIG.saques_diarios_permitidos,
          rollover_padrao: Number(result.rollover_padrao) || DEFAULT_PLATAFORMA_CONFIG.rollover_padrao,
          indicacao_recompensa: Number.isFinite(Number(result.indicacao_recompensa))
            ? Number(result.indicacao_recompensa)
            : DEFAULT_PLATAFORMA_CONFIG.indicacao_recompensa,
          indicacao_deposito_minimo: Number.isFinite(Number(result.indicacao_deposito_minimo))
            ? Number(result.indicacao_deposito_minimo)
            : DEFAULT_PLATAFORMA_CONFIG.indicacao_deposito_minimo,
        };
        return cachedConfig;
      }

      return DEFAULT_PLATAFORMA_CONFIG;
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

export function invalidatePlataformaConfigCache() {
  cachedConfig = null;
}

export function usePlataformaConfig() {
  const [config, setConfig] = useState<PlataformaConfig>(DEFAULT_PLATAFORMA_CONFIG);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    invalidatePlataformaConfigCache();
    setLoading(true);
    const next = await fetchPlataformaConfig();
    setConfig(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;
    fetchPlataformaConfig().then((c) => {
      if (mounted) {
        setConfig(c);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  return { config, loading, refresh };
}
