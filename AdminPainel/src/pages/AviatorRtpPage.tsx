import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import PageHeader from '../components/PageHeader';
import LoadingState from '../components/ui/LoadingState';
import PagePanel from '../components/ui/PagePanel';
import StatCard from '../components/ui/StatCard';
import { fetchAviatorRtpPreview, invalidateAviatorQueue, type AviatorScheduleEntry } from '../lib/aviatorEngineApi';
import {
  Activity,
  Clock,
  History,
  ListOrdered,
  Plane,
  Radio,
  RefreshCw,
  Save,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';

type ModoGeracao = 'rtp_geral' | 'velas' | 'crash';

interface AviatorConfig {
  modo_geracao: ModoGeracao;
  rtp_geral: number;
  pct_vela_azul: number;
  pct_vela_roxa: number;
  pct_vela_rosa: number;
  geracao_min_crash: number;
  geracao_max_crash: number;
  min_crash: number;
  max_crash: number;
  queue_size: number;
  rtp_limit_min_pct?: number;
  rtp_limit_max_pct?: number;
  crash_technical_max?: number;
  updated_at?: string;
}

interface AviatorStats {
  window_hours: number;
  total_wagered: number;
  total_paid: number;
  ggr: number;
  ggr_pct: number;
  rtp_real_pct: number;
  bet_count: number;
}

interface ConfigForm {
  modo_geracao: ModoGeracao;
  rtp_geral_pct: string;
  pct_vela_azul: string;
  pct_vela_roxa: string;
  pct_vela_rosa: string;
  geracao_min_crash: string;
  geracao_max_crash: string;
  min_crash: string;
  max_crash: string;
  queue_size: string;
}

const defaultForm: ConfigForm = {
  modo_geracao: 'velas',
  rtp_geral_pct: '96',
  pct_vela_azul: '52',
  pct_vela_roxa: '38',
  pct_vela_rosa: '10',
  geracao_min_crash: '1.01',
  geracao_max_crash: '500',
  min_crash: '1.01',
  max_crash: '500',
  queue_size: '50',
};

const MODO_LABELS: Record<ModoGeracao, string> = {
  rtp_geral: 'RTP geral',
  velas: 'Porcentagens das velas',
  crash: 'Configuração manual do crash',
};

function parseModo(raw: unknown): ModoGeracao {
  if (raw === 'rtp_geral' || raw === 'velas' || raw === 'crash') return raw;
  return 'velas';
}

function parseDecimal(raw: string): number | null {
  const n = Number(raw.replace(',', '.').trim());
  if (!Number.isFinite(n)) return null;
  return n;
}

function parsePctField(raw: string, { min = 0, max = 100 } = {}): number | null {
  const n = parseDecimal(raw);
  if (n === null || n < min || n > max) return null;
  return Math.round(n * 100) / 100;
}

function pctToFactor(raw: string): number | null {
  const n = parsePctField(raw, { min: 0.01, max: 99.99 });
  if (n === null) return null;
  return n / 100;
}

function formatMoney(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatPct(value: number, digits = 2) {
  return `${Number(value || 0).toFixed(digits)}%`;
}

function formatCountdown(seconds: number) {
  if (seconds <= 0) return 'agora';
  if (seconds < 60) return `em ${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `em ${m}m ${s}s`;
}

function formatLocalTime(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function secondsUntilCrash(crashAtMs: number, clockOffset: number) {
  const now = Date.now() + clockOffset;
  return Math.max(0, Math.floor((crashAtMs - now) / 1000));
}

const AVIATOR_VELA_COLORS = {
  low: '#34B4FF',
  mid: '#913EF8',
  high: '#C017B4',
} as const;

type CrashTier = keyof typeof AVIATOR_VELA_COLORS;

function hexWithAlpha(hex: string, alpha: number) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function crashTier(x: number): CrashTier {
  if (x >= 10) return 'high';
  if (x >= 2) return 'mid';
  return 'low';
}

function crashTierLabel(tier: CrashTier) {
  switch (tier) {
    case 'low':
      return 'Azul';
    case 'mid':
      return 'Roxo';
    case 'high':
      return 'Rosa';
  }
}

function crashTierStyles(tier: CrashTier) {
  const hex = AVIATOR_VELA_COLORS[tier];
  return {
    hex,
    textStyle: { color: hex } as const,
    barStyle: { backgroundColor: hex } as const,
    chipStyle: {
      color: hex,
      backgroundColor: hexWithAlpha(hex, 0.14),
      borderColor: hexWithAlpha(hex, 0.35),
    } as const,
  };
}

function crashBarWidth(x: number) {
  const capped = Math.min(Math.max(x, 1.01), 50);
  return Math.max(8, (Math.log10(capped) / Math.log10(50)) * 100);
}

function formatCrashX(x: number) {
  return `${Number(x || 0).toFixed(2)}x`;
}

function summarizeUpcoming(rounds: AviatorScheduleEntry[]) {
  if (!rounds.length) return null;
  const values = rounds.map((r) => Number(r.crash_x));
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const low = values.filter((v) => v < 2).length;
  const mid = values.filter((v) => v >= 2 && v < 10).length;
  const high = values.filter((v) => v >= 10).length;
  return { avg, low, mid, high, total: rounds.length };
}

function crashUniformHint(minCrash: number, maxCrash: number): string | null {
  if (!Number.isFinite(minCrash) || !Number.isFinite(maxCrash) || maxCrash <= minCrash) return null;
  const span = maxCrash - minCrash;
  const blueEnd = Math.min(2, maxCrash);
  const bluePct = blueEnd > minCrash ? ((blueEnd - minCrash) / span) * 100 : 0;
  const purpleStart = Math.max(2, minCrash);
  const purpleEnd = Math.min(10, maxCrash);
  const purplePct = purpleEnd > purpleStart ? ((purpleEnd - purpleStart) / span) * 100 : 0;
  const pinkPct = Math.max(0, 100 - bluePct - purplePct);
  return `Geração uniforme entre ${minCrash.toFixed(2)}x e ${maxCrash.toFixed(2)}x. Aproximadamente ${pinkPct.toFixed(0)}% serão rosa (≥10x), ${purplePct.toFixed(1)}% roxa e ${bluePct.toFixed(1)}% azul.`;
}

function validateFormForModo(
  form: ConfigForm,
  limits: { rtpMin: number; rtpMax: number; crashMax: number },
  modo: ModoGeracao
): string | null {
  let rtpGeral: number | null = parseDecimal(form.rtp_geral_pct);
  if (rtpGeral !== null) rtpGeral = rtpGeral / 100;

  const pctAzul = parsePctField(form.pct_vela_azul);
  const pctRoxa = parsePctField(form.pct_vela_roxa);
  const pctRosa = parsePctField(form.pct_vela_rosa);
  const geracaoMin = parseDecimal(form.geracao_min_crash);
  const geracaoMax = parseDecimal(form.geracao_max_crash);
  const minCrash = parseDecimal(form.min_crash);
  const maxCrash = parseDecimal(form.max_crash);
  const queueSize = Number(form.queue_size);

  if (modo === 'rtp_geral') {
    if (rtpGeral === null || rtpGeral <= 0 || rtpGeral >= 1) {
      return `RTP geral deve estar entre ${limits.rtpMin}% e ${limits.rtpMax}%.`;
    }
    const rtpPct = rtpGeral * 100;
    if (rtpPct < limits.rtpMin || rtpPct > limits.rtpMax) {
      return `RTP geral deve estar entre ${limits.rtpMin}% e ${limits.rtpMax}%.`;
    }
  }

  if (modo === 'velas') {
    if (pctAzul === null || pctRoxa === null || pctRosa === null) {
      return 'Porcentagens de cor inválidas.';
    }
    const sum = Math.round((pctAzul + pctRoxa + pctRosa) * 100) / 100;
    if (sum !== 100) {
      return 'A soma das porcentagens das velas deve ser exatamente 100%.';
    }
  }

  if (modo === 'rtp_geral' || modo === 'velas') {
    if (
      geracaoMin === null ||
      geracaoMax === null ||
      geracaoMin < 1 ||
      geracaoMax > limits.crashMax ||
      geracaoMin > geracaoMax
    ) {
      return `Limite mínimo ≥ 1,00x e máximo ≤ ${limits.crashMax.toFixed(2)}x.`;
    }
  }

  if (modo === 'crash') {
    if (minCrash === null || maxCrash === null || minCrash < 1 || maxCrash > limits.crashMax || minCrash > maxCrash) {
      return `Crash mínimo ≥ 1,00x e máximo ≤ ${limits.crashMax.toFixed(2)}x.`;
    }
  }

  if (!Number.isFinite(queueSize) || queueSize < 10 || queueSize > 200) {
    return 'Fila deve ter entre 10 e 200 rodadas.';
  }

  return null;
}

function buildSavePayload(form: ConfigForm, modo: ModoGeracao) {
  let rtpGeral: number | null = parseDecimal(form.rtp_geral_pct);
  if (rtpGeral !== null) rtpGeral = rtpGeral / 100;

  const pctAzul = parsePctField(form.pct_vela_azul);
  const pctRoxa = parsePctField(form.pct_vela_roxa);
  const pctRosa = parsePctField(form.pct_vela_rosa);
  const geracaoMin = parseDecimal(form.geracao_min_crash);
  const geracaoMax = parseDecimal(form.geracao_max_crash);
  const minCrash = parseDecimal(form.min_crash);
  const maxCrash = parseDecimal(form.max_crash);
  const queueSize = Number(form.queue_size);

  return {
    p_modo_geracao: modo,
    p_rtp_geral: rtpGeral ?? pctToFactor(form.rtp_geral_pct) ?? 0.96,
    p_pct_vela_azul: pctAzul ?? parsePctField(form.pct_vela_azul) ?? 52,
    p_pct_vela_roxa: pctRoxa ?? parsePctField(form.pct_vela_roxa) ?? 38,
    p_pct_vela_rosa: pctRosa ?? parsePctField(form.pct_vela_rosa) ?? 10,
    p_geracao_min_crash: geracaoMin ?? parseDecimal(form.geracao_min_crash) ?? 1.01,
    p_geracao_max_crash: geracaoMax ?? parseDecimal(form.geracao_max_crash) ?? 500,
    p_min_crash: minCrash ?? parseDecimal(form.min_crash) ?? 1.01,
    p_max_crash: maxCrash ?? parseDecimal(form.max_crash) ?? 500,
    p_queue_size: queueSize,
  };
}

export default function AviatorRtpPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [switchingModo, setSwitchingModo] = useState(false);
  const [refreshingPreview, setRefreshingPreview] = useState(false);
  const [motorRefreshing, setMotorRefreshing] = useState(false);
  const [form, setForm] = useState<ConfigForm>(defaultForm);
  const [limits, setLimits] = useState({ rtpMin: 85, rtpMax: 99.99, crashMax: 1000 });
  const [stats, setStats] = useState<AviatorStats | null>(null);
  const [liveRound, setLiveRound] = useState<AviatorScheduleEntry | null>(null);
  const [upcomingRounds, setUpcomingRounds] = useState<AviatorScheduleEntry[]>([]);
  const [pastRounds, setPastRounds] = useState<AviatorScheduleEntry[]>([]);
  const [clockOffset, setClockOffset] = useState(0);
  const [, setTick] = useState(0);
  const [engineMotor, setEngineMotor] = useState<{
    modo_geracao?: string;
    min_crash?: number;
    max_crash?: number;
  } | null>(null);

  const applyConfigToForm = (config: AviatorConfig) => {
    setForm({
      modo_geracao: parseModo(config.modo_geracao),
      rtp_geral_pct: String(Number(config.rtp_geral) * 100),
      pct_vela_azul: String(config.pct_vela_azul),
      pct_vela_roxa: String(config.pct_vela_roxa),
      pct_vela_rosa: String(config.pct_vela_rosa),
      geracao_min_crash: String(config.geracao_min_crash ?? config.min_crash ?? 1.01),
      geracao_max_crash: String(config.geracao_max_crash ?? config.max_crash ?? 500),
      min_crash: String(config.min_crash),
      max_crash: String(config.max_crash),
      queue_size: String(config.queue_size),
    });
    setLimits({
      rtpMin: Number(config.rtp_limit_min_pct ?? 85),
      rtpMax: Number(config.rtp_limit_max_pct ?? 99.99),
      crashMax: Number(config.crash_technical_max ?? 1000),
    });
  };

  const refreshMotorPreview = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      if (!silent) setMotorRefreshing(true);
      const preview = await fetchAviatorRtpPreview();
      const nodeEngine = preview.engine as { modo_geracao?: string; min_crash?: number; max_crash?: number };
      const pyEngine = (preview.queue as { engine?: { modo_geracao?: string; min_crash?: number; max_crash?: number } })?.engine;
      setEngineMotor({
        modo_geracao: String(nodeEngine?.modo_geracao ?? pyEngine?.modo_geracao ?? ''),
        min_crash: Number(nodeEngine?.min_crash ?? pyEngine?.min_crash ?? 0) || undefined,
        max_crash: Number(nodeEngine?.max_crash ?? pyEngine?.max_crash ?? 0) || undefined,
      });
      const timeline = preview.queue?.timeline;
      if (timeline) {
        if (timeline.server_time_ms) {
          setClockOffset(timeline.server_time_ms - Date.now());
        }
        setLiveRound(timeline.live_round ?? null);
        setUpcomingRounds(timeline.upcoming ?? timeline.schedule?.filter((s) => !s.is_live && !s.is_past) ?? []);
        setPastRounds(timeline.past ?? []);
      } else {
        setLiveRound(null);
        setUpcomingRounds([]);
        setPastRounds([]);
      }
    } catch (err) {
      console.warn('[Aviator RTP] Preview indisponível:', err);
    } finally {
      if (!silent) setMotorRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.rpc('obter_aviator_config_admin');
        if (cancelled) return;

        if (error) {
          showToast('Execute patch_aviator_modo_geracao.sql no Supabase.', 'error');
          return;
        }

        const result = data as {
          ok: boolean;
          config?: AviatorConfig;
          stats?: AviatorStats;
        };

        if (result?.ok && result.config) {
          applyConfigToForm(result.config);
          setStats(result.stats || null);
        }

        await refreshMotorPreview({ silent: true });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Carga inicial única — não reexecutar quando callbacks do contexto mudarem
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshData = useCallback(async () => {
    try {
      setRefreshingPreview(true);
      const { data } = await supabase.rpc('obter_aviator_config_admin');
      const result = data as { config?: AviatorConfig; stats?: AviatorStats };
      if (result?.config) applyConfigToForm(result.config);
      if (result?.stats) setStats(result.stats);
      await refreshMotorPreview({ silent: true });
    } finally {
      setRefreshingPreview(false);
    }
  }, [refreshMotorPreview]);

  const refreshMotorOnly = useCallback(async () => {
    await refreshMotorPreview();
  }, [refreshMotorPreview]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      void refreshMotorPreview({ silent: true });
    }, 10000);
    return () => window.clearInterval(id);
  }, [refreshMotorPreview]);

  const colorSum = useMemo(() => {
    const azul = parsePctField(form.pct_vela_azul) ?? 0;
    const roxa = parsePctField(form.pct_vela_roxa) ?? 0;
    const rosa = parsePctField(form.pct_vela_rosa) ?? 0;
    return Math.round((azul + roxa + rosa) * 100) / 100;
  }, [form.pct_vela_azul, form.pct_vela_roxa, form.pct_vela_rosa]);

  const colorSumInvalid = form.modo_geracao === 'velas' && colorSum !== 100;

  const persistConfig = useCallback(
    async (nextForm: ConfigForm, { modeSwitchOnly = false }: { modeSwitchOnly?: boolean } = {}) => {
      const validationError = validateFormForModo(nextForm, limits, nextForm.modo_geracao);
      if (validationError) {
        showToast(validationError, 'error');
        return false;
      }

      const { data, error } = await supabase.rpc(
        'atualizar_aviator_config_admin',
        buildSavePayload(nextForm, nextForm.modo_geracao)
      );

      if (error) {
        showToast('Erro ao salvar configurações.', 'error');
        return false;
      }

      const result = data as { ok: boolean; error?: string; stats?: AviatorStats; config?: AviatorConfig };
      if (!result?.ok) {
        showToast(result?.error || 'Erro ao salvar.', 'error');
        return false;
      }

      if (result.config) {
        if (modeSwitchOnly) {
          setForm((prev) => ({
            ...prev,
            modo_geracao: parseModo(result.config!.modo_geracao),
          }));
        } else {
          applyConfigToForm(result.config);
        }
      }
      if (!modeSwitchOnly && result.stats) setStats(result.stats);

      try {
        await invalidateAviatorQueue();
      } catch (err) {
        console.warn(err);
        showToast('Config salva, mas fila não atualizou. Reinicie a API se necessário.', 'error');
        return false;
      }

      return true;
    },
    [limits, showToast]
  );

  const handleChangeModo = useCallback(
    async (modo: ModoGeracao) => {
      if (modo === form.modo_geracao || saving || switchingModo) return;

      const validationError = validateFormForModo(form, limits, modo);
      if (validationError) {
        showToast(validationError, 'error');
        return;
      }

      const previousModo = form.modo_geracao;
      setSwitchingModo(true);
      setForm((prev) => ({ ...prev, modo_geracao: modo }));
      try {
        const ok = await persistConfig({ ...form, modo_geracao: modo }, { modeSwitchOnly: true });
        if (ok) {
          showToast(`${MODO_LABELS[modo]} ativado.`, 'success');
          await refreshMotorPreview();
        } else {
          setForm((prev) => ({ ...prev, modo_geracao: previousModo }));
        }
      } finally {
        setSwitchingModo(false);
      }
    },
    [form, limits, persistConfig, refreshMotorPreview, saving, showToast, switchingModo]
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const ok = await persistConfig(form);
      if (ok) {
        showToast('Configurações salvas e aplicadas!', 'success');
        await refreshMotorPreview();
      }
    } finally {
      setSaving(false);
    }
  };

  const rtpGeralNum = Number(form.rtp_geral_pct.replace(',', '.')) || 0;
  const houseEdgeHint = Math.max(0, Math.round((100 - rtpGeralNum) * 100) / 100);
  const houseGgr = Number(stats?.ggr ?? 0);
  const houseProfit = houseGgr >= 0;
  const upcomingPreview = upcomingRounds.slice(0, 12);
  const upcomingStats = summarizeUpcoming(upcomingPreview);
  const engineModo = parseModo(engineMotor?.modo_geracao);
  const engineModoMismatch = engineMotor?.modo_geracao && engineModo !== form.modo_geracao;
  const crashHint = useMemo(() => {
    if (form.modo_geracao !== 'crash') return null;
    const min = parseDecimal(form.min_crash);
    const max = parseDecimal(form.max_crash);
    if (min === null || max === null) return null;
    return crashUniformHint(min, max);
  }, [form.modo_geracao, form.min_crash, form.max_crash]);

  if (loading) {
    return <LoadingState message="Carregando Aviator..." className="w-full" />;
  }

  return (
    <div className="w-full space-y-6">
      <PageHeader
        icon={Plane}
        title="Aviator — Configuração da Casa"
        description="Configure RTP de referência, distribuição de cores e intervalo de crash."
        actions={
          <button
            type="button"
            onClick={() => void refreshData()}
            disabled={refreshingPreview}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 text-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshingPreview ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        }
      />

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label={houseProfit ? 'Seu lucro' : 'Sua perda'}
            value={formatMoney(Math.abs(houseGgr))}
            sub={`Últimas ${stats.window_hours}h`}
            icon={houseProfit ? TrendingUp : TrendingDown}
            tone={houseProfit ? 'good' : 'warn'}
          />
          <StatCard
            label="Apostado no período"
            value={formatMoney(stats.total_wagered)}
            sub={`${stats.bet_count} apostas finalizadas`}
            icon={Wallet}
          />
          <StatCard
            label="Pago em prêmios"
            value={formatMoney(stats.total_paid)}
            sub="Quanto saiu do caixa para jogadores"
            icon={Activity}
          />
          <StatCard
            label="Retorno real (RTP)"
            value={formatPct(stats.rtp_real_pct)}
            sub={`Referência configurada: ${formatPct(rtpGeralNum)}`}
            icon={Plane}
            tone={Math.abs(stats.rtp_real_pct - rtpGeralNum) > 5 ? 'warn' : 'neutral'}
          />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-7 space-y-6">
          <PagePanel className="border-admin-accent/20 bg-admin-accent/[0.04]">
            <p className="text-sm text-gray-400">
              Apenas <strong className="text-white">um modo</strong> pode ficar ativo. O modo ativo controla como
              as próximas velas são geradas no preview e no jogo.
            </p>
          </PagePanel>

          <ConfigSection
            title="RTP geral"
            active={form.modo_geracao === 'rtp_geral'}
            disabled={saving || switchingModo}
            onToggle={() => void handleChangeModo('rtp_geral')}
          >
            <Field
              label="RTP geral (%)"
              hint="Distribuição estatística inversa baseada no RTP configurado."
              example={`Margem teórica da casa: ${formatPct(houseEdgeHint)}`}
              value={form.rtp_geral_pct}
              disabled={form.modo_geracao !== 'rtp_geral'}
              onChange={(v) => setForm((prev) => ({ ...prev, rtp_geral_pct: v }))}
            />
            <GenerationBoundsFields
              minCrash={form.geracao_min_crash}
              maxCrash={form.geracao_max_crash}
              crashMax={limits.crashMax}
              disabled={form.modo_geracao !== 'rtp_geral'}
              onMinChange={(v) => setForm((prev) => ({ ...prev, geracao_min_crash: v }))}
              onMaxChange={(v) => setForm((prev) => ({ ...prev, geracao_max_crash: v }))}
            />
            {form.modo_geracao === 'rtp_geral' && (
              <p className="mt-2 text-xs text-gray-500">
                A geração continua aleatória pelo RTP, mas nenhuma vela ficará fora desse intervalo. Isso é
                independente do modo criativos.
              </p>
            )}
            {form.modo_geracao === 'rtp_geral' && (
              <p className="mt-1 text-xs text-gray-500">
                Após alterar os limites, clique em <strong className="text-gray-300">Salvar e aplicar</strong> para
                regenerar a fila.
              </p>
            )}
          </ConfigSection>

          <ConfigSection
            title="Porcentagens das velas"
            active={form.modo_geracao === 'velas'}
            disabled={saving || switchingModo}
            onToggle={() => void handleChangeModo('velas')}
          >
            <p className="text-sm text-gray-500 mb-4">A soma deve ser exatamente 100%.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field
                label="Porcentagem da vela azul (%)"
                value={form.pct_vela_azul}
                disabled={form.modo_geracao !== 'velas'}
                onChange={(v) => setForm((prev) => ({ ...prev, pct_vela_azul: v }))}
              />
              <Field
                label="Porcentagem da vela roxa (%)"
                value={form.pct_vela_roxa}
                disabled={form.modo_geracao !== 'velas'}
                onChange={(v) => setForm((prev) => ({ ...prev, pct_vela_roxa: v }))}
              />
              <Field
                label="Porcentagem da vela rosa (%)"
                value={form.pct_vela_rosa}
                disabled={form.modo_geracao !== 'velas'}
                onChange={(v) => setForm((prev) => ({ ...prev, pct_vela_rosa: v }))}
              />
            </div>
            {form.modo_geracao === 'velas' && (
              <p className={`mt-3 text-sm ${colorSumInvalid ? 'text-rose-400' : 'text-gray-500'}`}>
                Total: {colorSum.toFixed(2)}%
                {colorSumInvalid && ' — A soma das porcentagens das velas deve ser exatamente 100%.'}
              </p>
            )}
            <GenerationBoundsFields
              minCrash={form.geracao_min_crash}
              maxCrash={form.geracao_max_crash}
              crashMax={limits.crashMax}
              disabled={form.modo_geracao !== 'velas'}
              onMinChange={(v) => setForm((prev) => ({ ...prev, geracao_min_crash: v }))}
              onMaxChange={(v) => setForm((prev) => ({ ...prev, geracao_max_crash: v }))}
            />
            {form.modo_geracao === 'velas' && (
              <p className="mt-2 text-xs text-gray-500">
                As cores são sorteadas pelas porcentagens, mas o multiplicador final respeita esse intervalo.
                Independente do modo criativos.
              </p>
            )}
            {form.modo_geracao === 'velas' && (
              <p className="mt-1 text-xs text-gray-500">
                Após alterar os limites, clique em <strong className="text-gray-300">Salvar e aplicar</strong> para
                regenerar a fila.
              </p>
            )}
          </ConfigSection>

          <ConfigSection
            title="Configuração manual do crash"
            titleExtra={
              <span className="inline-flex items-center rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-200">
                Recomendado para criativos
              </span>
            }
            active={form.modo_geracao === 'crash'}
            disabled={saving || switchingModo}
            onToggle={() => void handleChangeModo('crash')}
          >
            <p className="text-sm text-gray-500 mb-4">
              Geração uniforme entre mínimo e máximo — ideal para criativos e anúncios.
            </p>
            <CrashBoundsFields
              minCrash={form.min_crash}
              maxCrash={form.max_crash}
              crashMax={limits.crashMax}
              disabled={form.modo_geracao !== 'crash'}
              onMinChange={(v) => setForm((prev) => ({ ...prev, min_crash: v }))}
              onMaxChange={(v) => setForm((prev) => ({ ...prev, max_crash: v }))}
            />
            {form.modo_geracao === 'crash' && crashHint && (
              <p className="mt-4 text-sm text-gray-500">{crashHint}</p>
            )}
            {form.modo_geracao === 'crash' && (
              <p className="mt-2 text-xs text-gray-500">
                Após alterar mínimo/máximo, clique em <strong className="text-gray-300">Salvar e aplicar</strong> para regenerar a fila.
              </p>
            )}
          </ConfigSection>

          <PagePanel>
            <Field
              label="Fila de velas (rodadas pré-geradas)"
              hint="Entre 10 e 200. Alterações só afetam rodadas futuras."
              value={form.queue_size}
              onChange={(v) => setForm((prev) => ({ ...prev, queue_size: v }))}
            />
          </PagePanel>

          <button
            onClick={() => void handleSave()}
            disabled={saving || switchingModo || (form.modo_geracao === 'velas' && colorSumInvalid)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-admin-accent hover:bg-admin-accent-hover text-[#0d0e10] text-sm font-medium disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar e aplicar'}
          </button>
        </div>

        <PagePanel className="xl:col-span-5 xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:flex xl:flex-col">
          <div className="flex items-center justify-between mb-1 shrink-0">
            <div>
              <h2 className="text-white text-lg font-semibold">Rodadas do motor</h2>
              <p className="text-xs text-gray-500 mt-0.5">Preview em tempo real · atualiza a cada 10s</p>
            </div>
            <button
              type="button"
              onClick={() => void refreshMotorOnly()}
              disabled={motorRefreshing || switchingModo}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-50"
              title="Atualizar agora"
            >
              <RefreshCw className={`w-4 h-4 ${motorRefreshing || switchingModo ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div
            className={`xl:overflow-y-auto xl:flex-1 xl:min-h-0 space-y-4 mt-3 transition-opacity ${
              motorRefreshing || switchingModo ? 'opacity-70' : ''
            }`}
          >
            <div className="rounded-xl border border-admin-accent/30 bg-admin-accent/10 px-3 py-2.5 text-xs text-admin-accent space-y-1">
              <p>
                <span className="font-semibold uppercase tracking-wide">Modo ativo:</span>{' '}
                {MODO_LABELS[form.modo_geracao]}
              </p>
              {engineMotor?.min_crash != null && engineMotor?.max_crash != null && (
                <p>
                  <span className="font-semibold uppercase tracking-wide">Intervalo do motor:</span>{' '}
                  {Number(engineMotor.min_crash).toFixed(2)}x – {Number(engineMotor.max_crash).toFixed(2)}x
                </p>
              )}
              {engineModoMismatch && (
                <p className="text-amber-300">
                  Motor ainda em &quot;{MODO_LABELS[engineModo]}&quot; — aguarde ou clique em Salvar e aplicar.
                </p>
              )}
            </div>

            <section className="rounded-xl border border-admin-accent/25 bg-admin-accent/[0.06] overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-admin-accent/15 bg-admin-accent/[0.04]">
                <Radio className="w-3.5 h-3.5 text-admin-accent" />
                <h3 className="text-xs uppercase tracking-wide text-admin-accent font-semibold">Ao vivo agora</h3>
              </div>
              <div className="p-3">
                {!liveRound ? (
                  <p className="text-gray-400 text-sm py-2 text-center">Motor offline ou indisponível.</p>
                ) : (
                  <LiveRoundCard item={liveRound} clockOffset={clockOffset} />
                )}
              </div>
            </section>

            <section className="rounded-xl border border-admin-border bg-black/20 overflow-hidden">
              <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-admin-border bg-black/25">
                <div className="flex items-center gap-2">
                  <ListOrdered className="w-3.5 h-3.5 text-gray-400" />
                  <h3 className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Próximas velas</h3>
                </div>
                {upcomingRounds.length > 0 && (
                  <span className="text-[10px] text-gray-500 tabular-nums">{upcomingRounds.length} na fila</span>
                )}
              </div>

              {upcomingRounds.length === 0 ? (
                <p className="text-gray-500 text-sm px-3 py-4 text-center">Nenhuma vela na fila.</p>
              ) : (
                <>
                  {upcomingStats && <UpcomingSummary stats={upcomingStats} />}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-gray-500 border-b border-admin-border/80">
                          <th className="py-2 pl-3 pr-1 text-left font-medium w-8">#</th>
                          <th className="py-2 px-1 text-left font-medium">Rodada</th>
                          <th className="py-2 px-1 text-left font-medium min-w-[88px]">Cor visual</th>
                          <th className="py-2 px-1 text-right font-medium">Crash</th>
                          <th className="py-2 px-1 text-right font-medium hidden sm:table-cell">Início</th>
                          <th className="py-2 pr-3 pl-1 text-right font-medium">Falta</th>
                        </tr>
                      </thead>
                      <tbody>
                        {upcomingPreview.map((item, idx) => (
                          <UpcomingRow
                            key={`up-${item.round_id}-${item.queue_position ?? idx}`}
                            item={item}
                            index={idx + 1}
                            clockOffset={clockOffset}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>

            <section className="rounded-xl border border-admin-border bg-black/20 overflow-hidden">
              <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-admin-border bg-black/25">
                <div className="flex items-center gap-2">
                  <History className="w-3.5 h-3.5 text-gray-400" />
                  <h3 className="text-xs uppercase tracking-wide text-gray-400 font-semibold">Velas recentes</h3>
                </div>
                {pastRounds.length > 0 && (
                  <span className="text-[10px] text-gray-500 tabular-nums">{pastRounds.length} registradas</span>
                )}
              </div>

              {pastRounds.length === 0 ? (
                <p className="text-gray-500 text-sm px-3 py-4 text-center">Nenhuma vela recente.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-gray-500 border-b border-admin-border/80">
                        <th className="py-2 pl-3 pr-1 text-left font-medium w-8">#</th>
                        <th className="py-2 px-1 text-left font-medium">Rodada</th>
                        <th className="py-2 px-1 text-left font-medium min-w-[88px]">Resultado</th>
                        <th className="py-2 pr-3 pl-1 text-right font-medium">Horário</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pastRounds.slice(0, 10).map((item, idx) => (
                        <PastRow key={`past-${item.round_id}-${idx}`} item={item} index={idx + 1} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </PagePanel>
      </div>
    </div>
  );
}

function LiveRoundCard({ item, clockOffset }: { item: AviatorScheduleEntry; clockOffset: number }) {
  const countdown = secondsUntilCrash(item.crash_at_ms, clockOffset);
  const tier = crashTier(Number(item.crash_x));
  const styles = crashTierStyles(tier);

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-gray-500">Rodada #{item.round_id}</p>
          <p className="font-mono text-3xl font-semibold tabular-nums" style={styles.textStyle}>
            {formatCrashX(Number(item.crash_x))}
          </p>
        </div>
        <span className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-full bg-admin-accent text-[#0d0e10] font-semibold shrink-0">
          {item.phase || 'Ao vivo'}
        </span>
      </div>

      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ ...styles.barStyle, width: `${crashBarWidth(Number(item.crash_x))}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-black/25 border border-white/5 px-2.5 py-2">
          <p className="text-gray-500 mb-0.5">Crash previsto</p>
          <p className="text-gray-200 font-medium tabular-nums">{formatLocalTime(item.crash_at)}</p>
        </div>
        <div className="rounded-lg bg-black/25 border border-white/5 px-2.5 py-2">
          <p className="text-gray-500 mb-0.5 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Tempo restante
          </p>
          <p className={`font-medium tabular-nums ${countdown <= 5 ? 'text-admin-warning' : 'text-gray-200'}`}>
            {formatCountdown(countdown)}
          </p>
        </div>
      </div>
    </div>
  );
}

function UpcomingSummary({
  stats,
}: {
  stats: { avg: number; low: number; mid: number; high: number; total: number };
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-admin-border/50 border-b border-admin-border/80 text-[10px]">
      <div className="bg-black/20 px-3 py-2">
        <p className="text-gray-500">Média</p>
        <p className="text-gray-200 font-mono font-medium tabular-nums">{formatCrashX(stats.avg)}</p>
      </div>
      <div className="bg-black/20 px-3 py-2">
        <p style={{ color: AVIATOR_VELA_COLORS.low }}>&lt;2x · Azul</p>
        <p className="font-medium tabular-nums" style={{ color: AVIATOR_VELA_COLORS.low }}>
          {stats.low}
        </p>
      </div>
      <div className="bg-black/20 px-3 py-2">
        <p style={{ color: AVIATOR_VELA_COLORS.mid }}>2–10x · Roxo</p>
        <p className="font-medium tabular-nums" style={{ color: AVIATOR_VELA_COLORS.mid }}>
          {stats.mid}
        </p>
      </div>
      <div className="bg-black/20 px-3 py-2">
        <p style={{ color: AVIATOR_VELA_COLORS.high }}>≥10x · Rosa</p>
        <p className="font-medium tabular-nums" style={{ color: AVIATOR_VELA_COLORS.high }}>
          {stats.high}
        </p>
      </div>
    </div>
  );
}

function UpcomingRow({
  item,
  index,
  clockOffset,
}: {
  item: AviatorScheduleEntry;
  index: number;
  clockOffset: number;
}) {
  const x = Number(item.crash_x);
  const tier = crashTier(x);
  const styles = crashTierStyles(tier);
  const countdown = secondsUntilCrash(item.crash_at_ms, clockOffset);

  return (
    <tr className="border-b border-admin-border/40 last:border-0 hover:bg-white/[0.02]">
      <td className="py-2.5 pl-3 pr-1 text-gray-500 tabular-nums">{index}</td>
      <td className="py-2.5 px-1 text-gray-400 tabular-nums">#{item.round_id}</td>
      <td className="py-2.5 px-1">
        <span className="text-[10px]" style={{ color: styles.hex }}>
          {crashTierLabel(tier)}
        </span>
      </td>
      <td className="py-2.5 px-1 text-right font-mono font-semibold tabular-nums" style={styles.textStyle}>
        {formatCrashX(x)}
      </td>
      <td className="py-2.5 px-1 text-right text-gray-500 tabular-nums hidden sm:table-cell">
        {formatLocalTime(item.bet_start_at || item.crash_at)}
      </td>
      <td className="py-2.5 pr-3 pl-1 text-right text-gray-400 tabular-nums">{formatCountdown(countdown)}</td>
    </tr>
  );
}

function PastRow({ item, index }: { item: AviatorScheduleEntry; index: number }) {
  const x = Number(item.crash_x);
  const tier = crashTier(x);
  const styles = crashTierStyles(tier);

  return (
    <tr className="border-b border-admin-border/40 last:border-0 hover:bg-white/[0.02]">
      <td className="py-2.5 pl-3 pr-1 text-gray-500 tabular-nums">{index}</td>
      <td className="py-2.5 px-1 text-gray-400 tabular-nums">#{item.round_id}</td>
      <td className="py-2.5 px-1">
        <span
          className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono font-semibold tabular-nums"
          style={styles.chipStyle}
        >
          {formatCrashX(x)}
        </span>
      </td>
      <td className="py-2.5 pr-3 pl-1 text-right text-gray-500 tabular-nums">
        {formatLocalTime(item.crash_at)}
      </td>
    </tr>
  );
}

function ConfigSection({
  title,
  titleExtra,
  active,
  disabled,
  onToggle,
  children,
}: {
  title: string;
  titleExtra?: ReactNode;
  active: boolean;
  disabled?: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <PagePanel
      className={
        active
          ? 'border-admin-accent/40 ring-1 ring-admin-accent/20'
          : 'border-admin-border opacity-80'
      }
    >
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className={`text-lg font-semibold ${active ? 'text-admin-accent' : 'text-white'}`}>{title}</h2>
            {titleExtra}
          </div>
          {active && (
            <p className="text-xs text-admin-accent/80 mt-0.5">Ativo — controlando a geração das velas</p>
          )}
        </div>
        <label className="flex items-center gap-2 shrink-0 cursor-pointer">
          <span className="text-xs text-gray-400">{active ? 'Ligado' : 'Desligado'}</span>
          <button
            type="button"
            role="switch"
            aria-checked={active}
            disabled={disabled || active}
            onClick={onToggle}
            className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              active ? 'bg-admin-accent' : 'bg-white/10'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                active ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </label>
      </div>
      <div className={active ? '' : 'pointer-events-none opacity-50'}>{children}</div>
    </PagePanel>
  );
}

function GenerationBoundsFields({
  minCrash,
  maxCrash,
  crashMax,
  disabled,
  onMinChange,
  onMaxChange,
}: {
  minCrash: string;
  maxCrash: string;
  crashMax: number;
  disabled?: boolean;
  onMinChange: (value: string) => void;
  onMaxChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
      <Field
        label="Limite mínimo do crash (x)"
        hint="Nenhuma vela abaixo desse valor."
        value={minCrash}
        disabled={disabled}
        onChange={onMinChange}
      />
      <Field
        label="Limite máximo do crash (x)"
        hint={`Nenhuma vela acima desse valor. Máx. técnico: ${crashMax.toFixed(2)}x`}
        value={maxCrash}
        disabled={disabled}
        onChange={onMaxChange}
      />
    </div>
  );
}

function CrashBoundsFields({
  minCrash,
  maxCrash,
  crashMax,
  disabled,
  onMinChange,
  onMaxChange,
}: {
  minCrash: string;
  maxCrash: string;
  crashMax: number;
  disabled?: boolean;
  onMinChange: (value: string) => void;
  onMaxChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
      <Field
        label="Crash mínimo (x)"
        hint="Início do intervalo uniforme."
        value={minCrash}
        disabled={disabled}
        onChange={onMinChange}
      />
      <Field
        label="Crash máximo (x)"
        hint={`Fim do intervalo uniforme. Máx. técnico: ${crashMax.toFixed(2)}x`}
        value={maxCrash}
        disabled={disabled}
        onChange={onMaxChange}
      />
    </div>
  );
}

function Field({
  label,
  hint,
  example,
  value,
  disabled,
  onChange,
}: {
  label: string;
  hint?: string;
  example?: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm text-gray-200 font-medium">{label}</span>
      {hint && <span className="block text-xs text-gray-500 mt-0.5">{hint}</span>}
      <input
        type="text"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-lg bg-admin-panel border border-admin-border px-3 py-2.5 text-white text-sm focus:outline-none focus:border-admin-accent/30 disabled:opacity-60 disabled:cursor-not-allowed"
      />
      {example && <span className="block text-xs text-admin-accent/80 mt-1.5">{example}</span>}
    </label>
  );
}
