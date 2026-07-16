import { useCallback, useEffect, useState } from 'react';
import {
  getDefaultWheelImages,
  obterRoletaConfig,
  obterStatusRoleta,
  type PrizeWheelConfig,
  type PrizeWheelSegment,
  type PrizeWheelStatus,
} from '../lib/prizeWheel';

interface UsePrizeWheelResult {
  enabled: boolean;
  loading: boolean;
  config: PrizeWheelConfig | null;
  segments: PrizeWheelSegment[];
  status: PrizeWheelStatus | null;
  images: ReturnType<typeof getDefaultWheelImages>;
  refreshStatus: () => Promise<void>;
}

export function usePrizeWheel(isAuthenticated: boolean): UsePrizeWheelResult {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<PrizeWheelConfig | null>(null);
  const [segments, setSegments] = useState<PrizeWheelSegment[]>([]);
  const [status, setStatus] = useState<PrizeWheelStatus | null>(null);

  const loadConfig = useCallback(async () => {
    const result = await obterRoletaConfig();
    if (!result.ok || !result.config) {
      setEnabled(false);
      setConfig(null);
      setSegments([]);
      return;
    }

    if (!result.segments?.length) {
      setEnabled(false);
      setConfig(result.config);
      setSegments([]);
      return;
    }

    setEnabled(true);
    setConfig(result.config);
    setSegments(result.segments);
  }, []);

  const refreshStatus = useCallback(async () => {
    if (!isAuthenticated) {
      setStatus(null);
      return;
    }
    const nextStatus = await obterStatusRoleta();
    setStatus(nextStatus);
  }, [isAuthenticated]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      await loadConfig();
      if (!cancelled && isAuthenticated) {
        await refreshStatus();
      }
      if (!cancelled) setLoading(false);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, loadConfig, refreshStatus]);

  const defaults = getDefaultWheelImages();
  const images = {
    titulo: config?.titulo_imagem_url || defaults.titulo,
    banner: config?.banner_imagem_url || defaults.banner,
    roleta: config?.roleta_imagem_url || defaults.roleta,
    widget:
      config?.widget_imagem_url ||
      config?.centro_imagem_url ||
      defaults.widget,
    centro: config?.centro_imagem_url || defaults.centro,
  };

  return {
    enabled,
    loading,
    config,
    segments,
    status,
    images,
    refreshStatus,
  };
}
