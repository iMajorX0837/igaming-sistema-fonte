import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import PageHeader from '../components/PageHeader';
import LoadingState from '../components/ui/LoadingState';
import PagePanel from '../components/ui/PagePanel';
import StatCard from '../components/ui/StatCard';
import { fetchAviatorRtpPreview, invalidateAviatorQueue, type AviatorScheduleEntry } from '../lib/aviatorEngineApi';
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Clock,
  History,
  ListOrdered,
  Plane,
  Radio,
  RefreshCw,
  Save,
  Shield,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';

interface AviatorConfig {
  rtp_base: number;
  rtp_min: number;
  rtp_max: number;
  recovery_enabled: boolean;
  recovery_window_hours: number;
  ggr_target_pct: number;
  recovery_strength: number;
  recovery_max_adjustment: number;
  min_wagered_for_recovery: number;
  min_crash: number;
  max_crash: number;
  queue_size: number;
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
  rtp_base_pct: string;
  rtp_min_pct: string;
  rtp_max_pct: string;
  recovery_enabled: boolean;
  recovery_window_hours: string;
  ggr_target_pct: string;
  recovery_strength_pct: string;
  recovery_max_adjustment_pct: string;
  min_wagered_for_recovery: string;
  min_crash: string;
  max_crash: string;
  queue_size: string;
}

type PresetKey = 'conservador' | 'equilibrado' | 'generoso';

const defaultForm: ConfigForm = {
  rtp_base_pct: '97',
  rtp_min_pct: '90',
  rtp_max_pct: '99',
  recovery_enabled: true,
  recovery_window_hours: '24',
  ggr_target_pct: '3',
  recovery_strength_pct: '25',
  recovery_max_adjustment_pct: '2',
  min_wagered_for_recovery: '100',
  min_crash: '1.01',
  max_crash: '500',
  queue_size: '50',
};

const PRESETS: Record<
  PresetKey,
  { label: string; desc: string; rtp: string; ggr: string; recovery: boolean }
> = {
  conservador: {
    label: 'Conservador',
    desc: 'Casa ganha mais · RTP 95%',
    rtp: '95',
    ggr: '5',
    recovery: true,
  },
  equilibrado: {
    label: 'Equilibrado',
    desc: 'Padrão de mercado · RTP 97%',
    rtp: '97',
    ggr: '3',
    recovery: true,
  },
  generoso: {
    label: 'Generoso',
    desc: 'Jogador ganha mais · RTP 98%',
    rtp: '98',
    ggr: '2',
    recovery: true,
  },
};

const WINDOW_OPTIONS = [
  { value: '12', label: '12 horas' },
  { value: '24', label: '24 horas (1 dia)' },
  { value: '48', label: '48 horas (2 dias)' },
  { value: '72', label: '72 horas (3 dias)' },
];

function pctToFactor(raw: string): number | null {
  const n = Number(raw.replace(',', '.').trim());
  if (!Number.isFinite(n) || n <= 0 || n >= 100) return null;
  return n / 100;
}

function deriveRtpLimits(basePct: number) {
  const min = Math.max(85, Math.round(basePct - 7));
  const max = Math.min(99, Math.round(basePct + 2));
  return { min: String(min), max: String(Math.max(max, min + 1)) };
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

type CrashTier = 'low' | 'mid' | 'high' | 'mega';

function crashTier(x: number): CrashTier {
  if (x >= 50) return 'mega';
  if (x >= 10) return 'high';
  if (x >= 2) return 'mid';
  return 'low';
}

function crashTierLabel(tier: CrashTier) {
  switch (tier) {
    case 'low':
      return 'Baixa';
    case 'mid':
      return 'Média';
    case 'high':
      return 'Alta';
    case 'mega':
      return 'Muito alta';
  }
}

function crashTierStyles(tier: CrashTier) {
  switch (tier) {
    case 'low':
      return {
        text: 'text-emerald-400',
        bar: 'bg-emerald-500',
        chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
      };
    case 'mid':
      return {
        text: 'text-gray-200',
        bar: 'bg-gray-400',
        chip: 'bg-white/5 text-gray-300 border-white/10',
      };
    case 'high':
      return {
        text: 'text-amber-400',
        bar: 'bg-amber-500',
        chip: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
      };
    case 'mega':
      return {
        text: 'text-rose-400',
        bar: 'bg-rose-500',
        chip: 'bg-rose-500/15 text-rose-300 border-rose-500/25',
      };
  }
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
  const high = values.filter((v) => v >= 10).length;
  return { avg, low, high, total: rounds.length };
}

export default function AviatorRtpPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshingPreview, setRefreshingPreview] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activePreset, setActivePreset] = useState<PresetKey | null>(null);
  const [form, setForm] = useState<ConfigForm>(defaultForm);
  const [stats, setStats] = useState<AviatorStats | null>(null);
  const [engine, setEngine] = useState<Record<string, unknown> | null>(null);
  const [liveRound, setLiveRound] = useState<AviatorScheduleEntry | null>(null);
  const [upcomingRounds, setUpcomingRounds] = useState<AviatorScheduleEntry[]>([]);
  const [pastRounds, setPastRounds] = useState<AviatorScheduleEntry[]>([]);
  const [clockOffset, setClockOffset] = useState(0);
  const [, setTick] = useState(0);

  const applyConfigToForm = (config: AviatorConfig) => {
    setForm({
      rtp_base_pct: String(Number(config.rtp_base) * 100),
      rtp_min_pct: String(Number(config.rtp_min) * 100),
      rtp_max_pct: String(Number(config.rtp_max) * 100),
      recovery_enabled: config.recovery_enabled,
      recovery_window_hours: String(config.recovery_window_hours),
      ggr_target_pct: String(config.ggr_target_pct),
      recovery_strength_pct: String(Number(config.recovery_strength) * 100),
      recovery_max_adjustment_pct: String(Number(config.recovery_max_adjustment) * 100),
      min_wagered_for_recovery: String(config.min_wagered_for_recovery),
      min_crash: String(config.min_crash),
      max_crash: String(config.max_crash),
      queue_size: String(config.queue_size),
    });
    setActivePreset(null);
  };

  const applyPreset = (key: PresetKey) => {
    const preset = PRESETS[key];
    const base = Number(preset.rtp);
    const limits = deriveRtpLimits(base);
    setForm((prev) => ({
      ...prev,
      rtp_base_pct: preset.rtp,
      rtp_min_pct: limits.min,
      rtp_max_pct: limits.max,
      ggr_target_pct: preset.ggr,
      recovery_enabled: preset.recovery,
    }));
    setActivePreset(key);
  };

  const loadPreview = useCallback(async () => {
    try {
      setRefreshingPreview(true);
      const preview = await fetchAviatorRtpPreview();
      if (preview.engine) setEngine(preview.engine);
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
      setRefreshingPreview(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    const { data, error } = await supabase.rpc('obter_aviator_config_admin');
    if (error) return;

    const result = data as {
      ok: boolean;
      config?: AviatorConfig;
      stats?: AviatorStats;
    };

    if (result?.ok && result.stats) {
      setStats(result.stats);
    }
  }, []);

  const loadConfig = useCallback(
    async ({ initial = false }: { initial?: boolean } = {}) => {
      try {
        if (initial) setLoading(true);
        const { data, error } = await supabase.rpc('obter_aviator_config_admin');
        if (error) {
          if (initial) showToast('Execute aviator_config.sql no Supabase.', 'error');
          return;
        }

        const result = data as {
          ok: boolean;
          config?: AviatorConfig;
          stats?: AviatorStats;
        };

        if (result?.ok && result.config) {
          if (initial) applyConfigToForm(result.config);
          setStats(result.stats || null);
        }

        await loadPreview();
      } finally {
        if (initial) setLoading(false);
      }
    },
    [loadPreview, showToast]
  );

  const refreshData = useCallback(async () => {
    try {
      setRefreshingPreview(true);
      await loadStats();
      await loadPreview();
    } finally {
      setRefreshingPreview(false);
    }
  }, [loadPreview, loadStats]);

  useEffect(() => {
    void loadConfig({ initial: true });
  }, [loadConfig]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      void loadPreview();
    }, 10000);
    return () => window.clearInterval(id);
  }, [loadPreview]);

  const handleSave = async () => {
    const rtpBase = pctToFactor(form.rtp_base_pct);
    const rtpMin = pctToFactor(form.rtp_min_pct);
    const rtpMax = pctToFactor(form.rtp_max_pct);
    if (rtpBase === null || rtpMin === null || rtpMax === null) {
      showToast('RTP deve estar entre 1% e 99%.', 'error');
      return;
    }

    const recoveryWindow = Number(form.recovery_window_hours);
    const ggrTarget = Number(form.ggr_target_pct.replace(',', '.'));
    const recoveryStrength = Number(form.recovery_strength_pct.replace(',', '.')) / 100;
    const recoveryMaxAdj = Number(form.recovery_max_adjustment_pct.replace(',', '.')) / 100;
    const minWagered = Number(form.min_wagered_for_recovery.replace(',', '.'));
    const minCrash = Number(form.min_crash.replace(',', '.'));
    const maxCrash = Number(form.max_crash.replace(',', '.'));
    const queueSize = Number(form.queue_size);

    if (!Number.isFinite(recoveryWindow) || recoveryWindow < 1) {
      showToast('Período de análise inválido.', 'error');
      return;
    }

    if (!Number.isFinite(ggrTarget) || ggrTarget < 0 || ggrTarget > 100) {
      showToast('Meta de lucro deve estar entre 0% e 100%.', 'error');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('atualizar_aviator_config_admin', {
        p_rtp_base: rtpBase,
        p_rtp_min: rtpMin,
        p_rtp_max: rtpMax,
        p_recovery_enabled: form.recovery_enabled,
        p_recovery_window_hours: recoveryWindow,
        p_ggr_target_pct: ggrTarget,
        p_recovery_strength: recoveryStrength,
        p_recovery_max_adjustment: recoveryMaxAdj,
        p_min_wagered_for_recovery: minWagered,
        p_min_crash: minCrash,
        p_max_crash: maxCrash,
        p_queue_size: queueSize,
      });

      if (error) {
        showToast('Erro ao salvar configurações.', 'error');
        return;
      }

      const result = data as { ok: boolean; error?: string; stats?: AviatorStats; config?: AviatorConfig };
      if (!result?.ok) {
        showToast(result?.error || 'Erro ao salvar.', 'error');
        return;
      }

      if (result.config) applyConfigToForm(result.config);
      if (result.stats) setStats(result.stats);

      try {
        await invalidateAviatorQueue();
      } catch (err) {
        console.warn(err);
        showToast('Config salva, mas fila não atualizou. Reinicie a API se necessário.', 'error');
        return;
      }

      showToast('Configurações salvas e aplicadas!', 'success');
      await loadPreview();
    } finally {
      setSaving(false);
    }
  };

  const rtpBaseNum = Number(form.rtp_base_pct) || 0;
  const houseEdgeHint = Math.max(0, 100 - rtpBaseNum);
  const effectiveRtp = Number(engine?.effective_rtp ?? engine?.rtp_factor ?? 0) * 100;
  const houseGgr = Number(stats?.ggr ?? 0);
  const houseProfit = houseGgr >= 0;
  const ggrTargetPct = Number(form.ggr_target_pct) || 0;
  const upcomingPreview = upcomingRounds.slice(0, 12);
  const upcomingStats = summarizeUpcoming(upcomingPreview);

  if (loading) {
    return <LoadingState message="Carregando Aviator..." className="w-full" />;
  }

  return (
    <div className="w-full space-y-6">
      <PageHeader
        icon={Plane}
        title="Aviator — Configuração da Casa"
        description="Defina quanto o jogador recebe de volta e acompanhe se você está lucrando."
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
            sub={`Últimas ${stats.window_hours}h · meta ${formatPct(ggrTargetPct)} da casa`}
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
            sub={
              effectiveRtp
                ? `Configurado: ${formatPct(rtpBaseNum)} · Motor agora: ${formatPct(effectiveRtp)}`
                : `Configurado: ${formatPct(rtpBaseNum)}`
            }
            icon={Plane}
            tone={stats.rtp_real_pct > rtpBaseNum + 2 ? 'warn' : 'neutral'}
          />
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-7 space-y-6">
          <PagePanel className="border-admin-accent/20 bg-admin-accent/[0.04]">
            <h2 className="text-white font-semibold mb-2">Entenda em 30 segundos</h2>
            <ul className="text-sm text-gray-400 space-y-2 list-disc pl-5">
              <li>
                <strong className="text-gray-200">RTP</strong> = quanto volta para o jogador. RTP 97% → de cada R$
                100 apostados, ~R$ 97 voltam em prêmios e ~R$ 3 ficam com você.
              </li>
              <li>
                <strong className="text-gray-200">Proteção automática</strong> = se os jogadores ganharem demais no
                período, o jogo ajusta levemente para proteger seu lucro (sem você precisar mexer manualmente).
              </li>
            </ul>
          </PagePanel>

          <PagePanel>
            <h2 className="text-white text-lg font-semibold mb-1">Perfis rápidos</h2>
            <p className="text-sm text-gray-500 mb-4">Clique em um perfil e depois em Salvar. Você pode ajustar depois.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(Object.keys(PRESETS) as PresetKey[]).map((key) => {
                const preset = PRESETS[key];
                const selected = activePreset === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => applyPreset(key)}
                    className={`text-left rounded-xl border px-4 py-3 transition-colors ${
                      selected
                        ? 'border-admin-accent bg-admin-accent/10'
                        : 'border-admin-border bg-admin-panel hover:border-admin-accent/30'
                    }`}
                  >
                    <p className={`font-medium ${selected ? 'text-admin-accent' : 'text-white'}`}>{preset.label}</p>
                    <p className="text-xs text-gray-500 mt-1">{preset.desc}</p>
                  </button>
                );
              })}
            </div>
          </PagePanel>

          <PagePanel>
            <h2 className="text-white text-lg font-semibold mb-4">Suas configurações</h2>
            <div className="space-y-6">
              <Field
                label="Retorno ao jogador — RTP (%)"
                hint="Quanto, em média, o jogo devolve aos jogadores."
                example={`Com ${rtpBaseNum || '—'}%, sua margem teórica é ~${houseEdgeHint}% por aposta.`}
                value={form.rtp_base_pct}
                onChange={(v) => {
                  setActivePreset(null);
                  const base = Number(v.replace(',', '.'));
                  if (Number.isFinite(base) && base > 0 && base < 100) {
                    const limits = deriveRtpLimits(base);
                    setForm((prev) => ({
                      ...prev,
                      rtp_base_pct: v,
                      rtp_min_pct: limits.min,
                      rtp_max_pct: limits.max,
                    }));
                  } else {
                    setForm((prev) => ({ ...prev, rtp_base_pct: v }));
                  }
                }}
              />

              <div className="rounded-xl border border-admin-border bg-black/20 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-white font-medium">
                      <Shield className="w-4 h-4 text-admin-accent" />
                      Proteção automática da casa
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Recomendado deixar ligado. O sistema corrige sozinho quando os jogadores estão ganhando acima do
                      normal.
                    </p>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={form.recovery_enabled}
                      onChange={(e) => {
                        setActivePreset(null);
                        setForm({ ...form, recovery_enabled: e.target.checked });
                      }}
                      className="rounded border-admin-border-strong"
                    />
                    {form.recovery_enabled ? 'Ligada' : 'Desligada'}
                  </label>
                </div>

                {form.recovery_enabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-admin-border">
                    <Field
                      label="Meta de lucro da casa (%)"
                      hint="Quanto você quer ficar das apostas no período."
                      example="3% = de R$ 1.000 apostados, R$ 30 de lucro alvo."
                      value={form.ggr_target_pct}
                      onChange={(v) => {
                        setActivePreset(null);
                        setForm({ ...form, ggr_target_pct: v });
                      }}
                    />
                    <SelectField
                      label="Analisar resultados de"
                      hint="Período usado para calcular se está ganhando ou perdendo."
                      value={form.recovery_window_hours}
                      options={WINDOW_OPTIONS}
                      onChange={(v) => {
                        setActivePreset(null);
                        setForm({ ...form, recovery_window_hours: v });
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </PagePanel>

          <PagePanel>
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="w-full flex items-center justify-between text-left"
            >
              <div>
                <h2 className="text-white text-lg font-semibold">Configurações avançadas</h2>
                <p className="text-sm text-gray-500 mt-0.5">Só mexa aqui se souber o que está fazendo.</p>
              </div>
              {showAdvanced ? (
                <ChevronUp className="w-5 h-5 text-gray-400 shrink-0" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
              )}
            </button>

            {showAdvanced && (
              <div className="mt-5 pt-5 border-t border-admin-border space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-3">Limites de RTP (proteção automática)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field
                      label="RTP mínimo (%)"
                      hint="O jogo nunca fica mais seco que isso."
                      value={form.rtp_min_pct}
                      onChange={(v) => setForm({ ...form, rtp_min_pct: v })}
                    />
                    <Field
                      label="RTP máximo (%)"
                      hint="O jogo nunca paga além disso no recovery."
                      value={form.rtp_max_pct}
                      onChange={(v) => setForm({ ...form, rtp_max_pct: v })}
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-3">Força da proteção</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field
                      label="Intensidade (%)"
                      hint="Quão rápido o sistema corrige quando você está perdendo."
                      value={form.recovery_strength_pct}
                      onChange={(v) => setForm({ ...form, recovery_strength_pct: v })}
                    />
                    <Field
                      label="Ajuste máximo (%)"
                      hint="Limite de quanto o RTP pode mudar."
                      value={form.recovery_max_adjustment_pct}
                      onChange={(v) => setForm({ ...form, recovery_max_adjustment_pct: v })}
                    />
                    <Field
                      label="Volume mínimo (R$)"
                      hint="Proteção só ativa após esse volume apostado."
                      value={form.min_wagered_for_recovery}
                      onChange={(v) => setForm({ ...form, min_wagered_for_recovery: v })}
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-3">Limites das velas</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Field
                      label="Crash mínimo (x)"
                      value={form.min_crash}
                      onChange={(v) => setForm({ ...form, min_crash: v })}
                    />
                    <Field
                      label="Crash máximo (x)"
                      value={form.max_crash}
                      onChange={(v) => setForm({ ...form, max_crash: v })}
                    />
                    <Field
                      label="Fila de velas"
                      hint="Rodadas pré-geradas na memória."
                      value={form.queue_size}
                      onChange={(v) => setForm({ ...form, queue_size: v })}
                    />
                  </div>
                </div>
              </div>
            )}
          </PagePanel>

          <button
            onClick={() => void handleSave()}
            disabled={saving}
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
              onClick={() => void refreshData()}
              disabled={refreshingPreview}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-50"
              title="Atualizar agora"
            >
              <RefreshCw className={`w-4 h-4 ${refreshingPreview ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="xl:overflow-y-auto xl:flex-1 xl:min-h-0 space-y-4 mt-3">
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
                  <h3 className="text-xs uppercase tracking-wide text-gray-400 font-semibold">
                    Próximas velas
                  </h3>
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
                          <th className="py-2 px-1 text-left font-medium min-w-[88px]">Intensidade</th>
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
                  <h3 className="text-xs uppercase tracking-wide text-gray-400 font-semibold">
                    Velas recentes
                  </h3>
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
          <p className={`font-mono text-3xl font-semibold tabular-nums ${styles.text}`}>
            {formatCrashX(Number(item.crash_x))}
          </p>
        </div>
        <span className="text-[10px] uppercase tracking-wide px-2 py-1 rounded-full bg-admin-accent text-[#0d0e10] font-semibold shrink-0">
          {item.phase || 'Ao vivo'}
        </span>
      </div>

      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div className={`h-full rounded-full ${styles.bar}`} style={{ width: `${crashBarWidth(Number(item.crash_x))}%` }} />
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
          <p
            className={`font-medium tabular-nums ${
              countdown <= 5 ? 'text-admin-warning' : 'text-gray-200'
            }`}
          >
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
  stats: { avg: number; low: number; high: number; total: number };
}) {
  return (
    <div className="grid grid-cols-3 gap-px bg-admin-border/50 border-b border-admin-border/80 text-[10px]">
      <div className="bg-black/20 px-3 py-2">
        <p className="text-gray-500">Média</p>
        <p className="text-gray-200 font-mono font-medium tabular-nums">{formatCrashX(stats.avg)}</p>
      </div>
      <div className="bg-black/20 px-3 py-2">
        <p className="text-gray-500">Baixas (&lt;2x)</p>
        <p className="text-emerald-400 font-medium tabular-nums">{stats.low}</p>
      </div>
      <div className="bg-black/20 px-3 py-2">
        <p className="text-gray-500">Altas (≥10x)</p>
        <p className="text-amber-400 font-medium tabular-nums">{stats.high}</p>
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
        <div className="flex items-center gap-2 min-w-[88px]">
          <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div className={`h-full rounded-full ${styles.bar}`} style={{ width: `${crashBarWidth(x)}%` }} />
          </div>
          <span className="text-[10px] text-gray-500 w-10 shrink-0">{crashTierLabel(tier)}</span>
        </div>
      </td>
      <td className={`py-2.5 px-1 text-right font-mono font-semibold tabular-nums ${styles.text}`}>
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
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono font-semibold tabular-nums ${styles.chip}`}
          >
            {formatCrashX(x)}
          </span>
        </div>
      </td>
      <td className="py-2.5 pr-3 pl-1 text-right text-gray-500 tabular-nums">
        {formatLocalTime(item.crash_at)}
      </td>
    </tr>
  );
}

function Field({
  label,
  hint,
  example,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  example?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm text-gray-200 font-medium">{label}</span>
      {hint && <span className="block text-xs text-gray-500 mt-0.5">{hint}</span>}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-lg bg-admin-panel border border-admin-border px-3 py-2.5 text-white text-sm focus:outline-none focus:border-admin-accent/30"
      />
      {example && <span className="block text-xs text-admin-accent/80 mt-1.5">{example}</span>}
    </label>
  );
}

function SelectField({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm text-gray-200 font-medium">{label}</span>
      {hint && <span className="block text-xs text-gray-500 mt-0.5">{hint}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-lg bg-admin-panel border border-admin-border px-3 py-2.5 text-white text-sm focus:outline-none focus:border-admin-accent/30"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
