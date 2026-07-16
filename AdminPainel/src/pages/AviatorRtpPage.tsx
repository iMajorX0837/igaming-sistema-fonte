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
  Banknote,
  Plane,
  RefreshCw,
  Save,
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

function pctToFactor(raw: string): number | null {
  const n = Number(raw.replace(',', '.').trim());
  if (!Number.isFinite(n) || n <= 0 || n >= 100) return null;
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

export default function AviatorRtpPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshingPreview, setRefreshingPreview] = useState(false);
  const [form, setForm] = useState<ConfigForm>(defaultForm);
  const [stats, setStats] = useState<AviatorStats | null>(null);
  const [engine, setEngine] = useState<Record<string, unknown> | null>(null);
  const [liveRound, setLiveRound] = useState<AviatorScheduleEntry | null>(null);
  const [upcomingRounds, setUpcomingRounds] = useState<AviatorScheduleEntry[]>([]);
  const [pastRounds, setPastRounds] = useState<AviatorScheduleEntry[]>([]);
  const [clockOffset, setClockOffset] = useState(0);

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
      showToast('Janela de recovery inválida.', 'error');
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
        showToast('Config salva, mas fila de velas não foi invalidada. Reinicie o motor se necessário.', 'error');
        return;
      }

      showToast('Configurações RTP salvas e fila atualizada!', 'success');
      await loadPreview();
    } finally {
      setSaving(false);
    }
  };

  const effectiveRtp = Number(engine?.effective_rtp ?? engine?.rtp_factor ?? 0) * 100;
  const recoveryAdj = Number(engine?.recovery_adjustment ?? 0) * 100;
  const houseGgr = Number(stats?.ggr ?? 0);
  const houseProfit = houseGgr >= 0;
  const ggrTargetPct = Number(form.ggr_target_pct) || 0;
  const ggrTargetAmount = Number(stats?.total_wagered ?? 0) * (ggrTargetPct / 100);
  const vsTarget = houseGgr - ggrTargetAmount;

  if (loading) {
    return <LoadingState message="Carregando RTP do Aviator..." className="w-full" />;
  }

  return (
    <div className="w-full space-y-6">
      <PageHeader
        icon={Plane}
        title="Aviator — RTP & Recovery"
        description="Controle o RTP base, recovery automático da casa e acompanhe estatísticas."
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
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <StatCard
              label={houseProfit ? 'Lucro da casa' : 'Perda da casa'}
              value={formatMoney(Math.abs(houseGgr))}
              sub={
                houseProfit
                  ? `Margem ${formatPct(stats.ggr_pct)} · Meta ${formatPct(ggrTargetPct)}`
                  : `Jogadores ganharam ${formatMoney(Math.abs(houseGgr))} acima das apostas`
              }
              icon={houseProfit ? TrendingUp : TrendingDown}
              tone={houseProfit ? 'good' : 'warn'}
            />
            <StatCard
              label={`vs Meta (${stats.window_hours}h)`}
              value={vsTarget >= 0 ? `+${formatMoney(vsTarget)}` : `-${formatMoney(Math.abs(vsTarget))}`}
              sub={
                vsTarget >= 0
                  ? `Acima da meta de ${formatMoney(ggrTargetAmount)}`
                  : `Abaixo da meta de ${formatMoney(ggrTargetAmount)}`
              }
              icon={vsTarget >= 0 ? TrendingUp : TrendingDown}
              tone={vsTarget >= 0 ? 'good' : 'warn'}
            />
            <StatCard
              label="Volume apostado"
              value={formatMoney(stats.total_wagered)}
              sub={`${stats.bet_count} apostas finalizadas`}
              icon={Wallet}
            />
            <StatCard
              label="Pago aos jogadores"
              value={formatMoney(stats.total_paid)}
              sub={`${formatPct(stats.rtp_real_pct)} de retorno (RTP real)`}
              icon={Banknote}
            />
            <StatCard
              label={`RTP real (${stats.window_hours}h)`}
              value={formatPct(stats.rtp_real_pct)}
              icon={Activity}
              tone={stats.rtp_real_pct > Number(form.rtp_base_pct) + 2 ? 'warn' : 'neutral'}
            />
            <StatCard
              label="RTP efetivo agora"
              value={effectiveRtp ? formatPct(effectiveRtp) : '—'}
              sub={
                recoveryAdj !== 0
                  ? `${recoveryAdj > 0 ? '-' : '+'}${Math.abs(recoveryAdj).toFixed(2)}% recovery`
                  : 'Sem ajuste de recovery'
              }
              icon={Plane}
              tone="accent"
            />
          </div>

          <PagePanel className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500 text-xs mb-1">Entrada (apostas)</p>
              <p className="text-white font-medium">{formatMoney(stats.total_wagered)}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Saída (prêmios)</p>
              <p className="text-admin-warning font-medium">{formatMoney(stats.total_paid)}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">
                {houseProfit ? 'Lucro líquido da casa' : 'Perda líquida da casa'}
              </p>
              <p className={`font-semibold ${houseProfit ? 'text-admin-success' : 'text-admin-danger'}`}>
                {houseProfit ? '+' : '-'}
                {formatMoney(Math.abs(houseGgr))}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Janela / Apostas</p>
              <p className="text-gray-300 font-medium">
                {stats.window_hours}h · {stats.bet_count} apostas
              </p>
            </div>
          </PagePanel>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-7 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PagePanel>
              <h2 className="text-white text-lg font-semibold mb-4">RTP base</h2>
              <div className="space-y-4">
                <Field
                  label="RTP base (%)"
                  hint="Retorno teórico ao jogador."
                  value={form.rtp_base_pct}
                  onChange={(v) => setForm({ ...form, rtp_base_pct: v })}
                />
                <Field
                  label="RTP mínimo (%)"
                  hint="Limite inferior com recovery."
                  value={form.rtp_min_pct}
                  onChange={(v) => setForm({ ...form, rtp_min_pct: v })}
                />
                <Field
                  label="RTP máximo (%)"
                  hint="Limite superior com recovery."
                  value={form.rtp_max_pct}
                  onChange={(v) => setForm({ ...form, rtp_max_pct: v })}
                />
              </div>
            </PagePanel>

            <PagePanel>
              <h2 className="text-white text-lg font-semibold mb-4">Limites do jogo</h2>
              <div className="space-y-4">
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
                  label="Tamanho da fila"
                  hint="Velas pré-geradas em memória."
                  value={form.queue_size}
                  onChange={(v) => setForm({ ...form, queue_size: v })}
                />
              </div>
            </PagePanel>
          </div>

          <PagePanel>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white text-lg font-semibold">Recovery automático</h2>
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.recovery_enabled}
                  onChange={(e) => setForm({ ...form, recovery_enabled: e.target.checked })}
                  className="rounded border-admin-border-strong"
                />
                Ativo
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field
                label="Margem alvo GGR (%)"
                hint="House edge desejado na janela."
                value={form.ggr_target_pct}
                onChange={(v) => setForm({ ...form, ggr_target_pct: v })}
              />
              <Field
                label="Janela (horas)"
                hint="Período para calcular GGR real."
                value={form.recovery_window_hours}
                onChange={(v) => setForm({ ...form, recovery_window_hours: v })}
              />
              <Field
                label="Intensidade recovery (%)"
                hint="Quanto corrigir por desvio de margem."
                value={form.recovery_strength_pct}
                onChange={(v) => setForm({ ...form, recovery_strength_pct: v })}
              />
              <Field
                label="Ajuste máximo RTP (%)"
                hint="Teto de correção sobre o RTP base."
                value={form.recovery_max_adjustment_pct}
                onChange={(v) => setForm({ ...form, recovery_max_adjustment_pct: v })}
              />
              <Field
                label="Volume mínimo (R$)"
                hint="Apostas mínimas para ativar recovery."
                value={form.min_wagered_for_recovery}
                onChange={(v) => setForm({ ...form, min_wagered_for_recovery: v })}
              />
            </div>
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
          <div className="flex items-center justify-between mb-4 shrink-0">
            <h2 className="text-white text-lg font-semibold">Velas do motor</h2>
            <button
              type="button"
              onClick={() => void refreshData()}
              disabled={refreshingPreview}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-50"
              title="Atualizar preview"
            >
              <RefreshCw className={`w-4 h-4 ${refreshingPreview ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="xl:overflow-y-auto xl:flex-1 xl:min-h-0 space-y-5">
            <section>
              <h3 className="text-xs uppercase tracking-wide text-admin-accent font-semibold mb-2">
                Ao vivo agora
              </h3>
              {!liveRound ? (
                <p className="text-gray-400 text-sm">Motor offline.</p>
              ) : (
                <VelaCard item={liveRound} clockOffset={clockOffset} variant="live" />
              )}
            </section>

            <section>
              <h3 className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">
                Próximas na fila ({upcomingRounds.length})
              </h3>
              {upcomingRounds.length === 0 ? (
                <p className="text-gray-500 text-sm">Nenhuma vela na fila.</p>
              ) : (
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {upcomingRounds.map((item) => (
                    <li key={`up-${item.round_id}-${item.index ?? item.queue_position}`}>
                      <VelaCard item={item} clockOffset={clockOffset} variant="upcoming" />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className="text-xs uppercase tracking-wide text-gray-500 font-semibold mb-2">
                Velas anteriores ({pastRounds.length})
              </h3>
              {pastRounds.length === 0 ? (
                <p className="text-gray-500 text-sm">Sem histórico recente.</p>
              ) : (
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {pastRounds.map((item) => (
                    <li key={`past-${item.round_id}`}>
                      <VelaCard item={item} clockOffset={clockOffset} variant="past" />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </PagePanel>
      </div>
    </div>
  );
}

function VelaCard({
  item,
  clockOffset,
  variant,
}: {
  item: AviatorScheduleEntry;
  clockOffset: number;
  variant: 'live' | 'upcoming' | 'past';
}) {
  const countdown = secondsUntilCrash(item.crash_at_ms, clockOffset);
  const isLive = variant === 'live';
  const isPast = variant === 'past';

  const shellClass = isLive
    ? 'bg-admin-accent/10 border-admin-accent/24'
    : isPast
      ? 'bg-black/10 border-white/5 opacity-80'
      : 'bg-black/20 border-transparent';

  return (
    <div className={`text-sm px-3 py-3 rounded-lg border ${shellClass}`}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-gray-300 font-medium">#{item.round_id}</span>
        <div className="flex items-center gap-1.5">
          {isLive && (
            <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-admin-accent text-[#0d0e10]">
              Ao vivo
            </span>
          )}
          <span className="text-xs text-gray-500">{item.phase}</span>
        </div>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className={`font-mono ${isLive ? 'text-white text-xl' : 'text-white text-lg'}`}>
          {Number(item.crash_x).toFixed(2)}x
        </span>
        {!isPast && (
          <span
            className={`text-xs font-medium ${
              isLive && countdown <= 5 ? 'text-admin-warning' : 'text-gray-400'
            }`}
          >
            {formatCountdown(countdown)}
          </span>
        )}
      </div>
      <div className="mt-2 space-y-0.5 text-xs text-gray-500">
        <p>
          {isPast ? 'Crashou' : 'Crash'}:{' '}
          <span className="text-gray-300">{formatLocalTime(item.crash_at)}</span>
        </p>
        {!isPast && item.bet_start_at && (
          <p>
            Apostas: <span className="text-gray-400">{formatLocalTime(item.bet_start_at)}</span>
          </p>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm text-gray-300">{label}</span>
      {hint && <span className="block text-xs text-gray-500 mt-0.5">{hint}</span>}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-lg bg-admin-panel border border-admin-border px-3 py-2 text-white text-sm focus:outline-none focus:border-admin-accent/30"
      />
    </label>
  );
}
