import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { adminPageCache } from '../lib/adminPageCache';
import DashboardDateFilter from '../components/DashboardDateFilter';
import CadastrosEvolutionChart, {
  type CadastrosChartPoint,
} from '../components/CadastrosEvolutionChart';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/ui/StatCard';
import LoadingState from '../components/ui/LoadingState';
import EmptyState from '../components/ui/EmptyState';
import PagePanel from '../components/ui/PagePanel';
import {
  LayoutDashboard,
  Users,
  ArrowDownCircle,
  ArrowUpCircle,
  Trophy,
  Wallet,
  Coins,
  Receipt,
  TrendingUp,
  Percent,
  UserCheck,
  Banknote,
} from 'lucide-react';
import {
  buildFilterKey,
  defaultCustomRange,
  getEvolutionChartPoints,
  spDayEndExclusive,
  ymdFromDateSP,
  type CustomDateRange,
} from '../lib/dashboardDateRange';

const dashStatsCacheKey = (filterKey: string) => `admin:dashboard:stats:${filterKey}`;
const dashChartsCacheKey = (filterKey: string) => `admin:dashboard:charts:${filterKey}`;
const DASH_TRANSACTIONS_CACHE = 'admin:dashboard:transactions:recent';
const DASH_SAQUES_PENDENTES_CACHE = 'admin:dashboard:saques-pendentes';
const RECENT_TRANSACTIONS_LIMIT = 10;

interface SaquesPendentesStats {
  pendente_count: number;
  pendente_valor: number;
}

interface DashboardStats {
  novos_usuarios: number;
  depositos_valor: number;
  saques_valor: number;
  volume_apostas: number;
  ganhos_jogadores: number;
  rtp_medio: number;
  ftd: number;
  taxa_conversao: number;
  deposito_medio: number;
  saque_medio: number;
}

interface RecentTransaction {
  id: string;
  usuario_id: string;
  usuario_nome: string | null;
  usuario_email: string | null;
  tipo: 'deposito' | 'saque';
  valor: number;
  status: string;
  origem?: string;
  data_hora: string;
}

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getDepositoStatusDisplay = (status: string, origem: string) => {
  if (origem === 'manual' && status === 'aprovado') return 'Saldo Manual';
  const map: Record<string, string> = {
    aprovado: 'Completo',
    pendente: 'Pendente',
    falhou: 'Falhou',
    expirado: 'Expirado',
  };
  return map[status] || status;
};

const getDepositoStatusBadge = (status: string, origem: string) => {
  if (origem === 'manual') {
    return 'bg-admin-info/12 text-admin-info border-admin-info/20';
  }
  switch (status) {
    case 'aprovado':
      return 'bg-admin-success/12 text-admin-success border-admin-success/20';
    case 'pendente':
      return 'bg-admin-warning/12 text-admin-warning border-admin-warning/20';
    case 'falhou':
      return 'bg-admin-danger/12 text-admin-danger border-admin-danger/20';
    case 'expirado':
      return 'bg-gray-600/20 text-gray-300 border-admin-border-strong/30';
    default:
      return 'bg-gray-600/20 text-gray-300 border-admin-border-strong/30';
  }
};

const getSaqueStatusDisplay = (status: string) => {
  const map: Record<string, string> = {
    aprovado: 'Aprovado',
    pendente: 'Pendente',
    rejeitado: 'Rejeitado',
    falhou: 'Falhou',
  };
  return map[status] || status;
};

const getSaqueStatusBadge = (status: string) => {
  switch (status) {
    case 'aprovado':
      return 'bg-admin-success/12 text-admin-success border-admin-success/20';
    case 'pendente':
      return 'bg-admin-warning/12 text-admin-warning border-admin-warning/20';
    case 'rejeitado':
      return 'bg-admin-danger/12 text-admin-danger border-admin-danger/20';
    case 'falhou':
      return 'bg-gray-600/20 text-gray-300 border-admin-border-strong/30';
    default:
      return 'bg-gray-600/20 text-gray-300 border-admin-border-strong/30';
  }
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatNumber = (value: number) =>
  new Intl.NumberFormat('pt-BR').format(value);

const formatPercent = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value) + '%';

function buildCadastrosChartPoints(
  chartPoints: ReturnType<typeof getEvolutionChartPoints>,
  timestamps: Array<{ date: Date; ymd: string }>
): CadastrosChartPoint[] {
  const countsByYmd = new Map<string, number>();
  chartPoints.forEach((point) => countsByYmd.set(point.ymd, 0));

  timestamps.forEach(({ ymd }) => {
    if (countsByYmd.has(ymd)) {
      countsByYmd.set(ymd, (countsByYmd.get(ymd) || 0) + 1);
    }
  });

  const raw = chartPoints.map((point) => {
    const dayEnd = spDayEndExclusive(point.ymd);
    const totalAcumulado = timestamps.filter(({ date }) => date < dayEnd).length;

    return {
      label: point.label,
      ymd: point.ymd,
      cadastros: countsByYmd.get(point.ymd) || 0,
      totalAcumulado,
    };
  });

  const maxCadastros = Math.max(...raw.map((day) => day.cadastros), 0);
  const maxTotal = Math.max(...raw.map((day) => day.totalAcumulado), 0);

  return raw.map((day) => ({
    ...day,
    barHeight:
      day.cadastros > 0 && maxCadastros > 0
        ? Math.max(8, (day.cadastros / maxCadastros) * 100)
        : 0,
    lineY: maxTotal > 0 ? (day.totalAcumulado / maxTotal) * 100 : 0,
  }));
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [customRange, setCustomRange] = useState<CustomDateRange>(defaultCustomRange);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [chartPoints, setChartPoints] = useState<CadastrosChartPoint[]>([]);
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);
  const [saquesPendentes, setSaquesPendentes] = useState<SaquesPendentesStats | null>(null);
  const [loadingSaquesPendentes, setLoadingSaquesPendentes] = useState(true);

  const filterKey = buildFilterKey(customRange);

  useEffect(() => {
    const statsKey = dashStatsCacheKey(filterKey);
    const statsCached = adminPageCache.get<DashboardStats>(statsKey);
    if (statsCached !== undefined) {
      setStats(statsCached);
      setLoadingStats(false);
    } else {
      void loadStats();
    }

    const chartsKey = dashChartsCacheKey(filterKey);
    const chartsCached = adminPageCache.get<CadastrosChartPoint[]>(chartsKey);
    if (chartsCached !== undefined) {
      setChartPoints(chartsCached);
      setLoadingCharts(false);
    } else {
      void loadChartData();
    }
  }, [filterKey, customRange]);

  useEffect(() => {
    const cached = adminPageCache.get<RecentTransaction[]>(DASH_TRANSACTIONS_CACHE);
    if (cached) {
      setRecentTransactions(cached);
      setLoadingTransactions(false);
    } else {
      setLoadingTransactions(true);
    }

    void loadRecentTransactions();
  }, []);

  useEffect(() => {
    const cached = adminPageCache.get<SaquesPendentesStats>(DASH_SAQUES_PENDENTES_CACHE);
    if (cached) {
      setSaquesPendentes(cached);
      setLoadingSaquesPendentes(false);
    } else {
      void loadSaquesPendentes();
    }
  }, []);

  const loadStats = async () => {
    try {
      setLoadingStats(true);

      const { data, error } = await supabase.rpc('obter_stats_dashboard_admin', {
        p_periodo: 'hoje',
        p_data_inicio: customRange.start,
        p_data_fim: customRange.end,
      });

      if (error) {
        console.error('[DashboardPage] Erro ao carregar estatísticas:', error);
        setStats(null);
        return;
      }

      const result = data as { ok: boolean } & DashboardStats;
      if (result?.ok) {
        const statsData: DashboardStats = {
          novos_usuarios: result.novos_usuarios ?? 0,
          depositos_valor: Number(result.depositos_valor) || 0,
          saques_valor: Number(result.saques_valor) || 0,
          volume_apostas: Number(result.volume_apostas) || 0,
          ganhos_jogadores: Number(result.ganhos_jogadores) || 0,
          rtp_medio: Number(result.rtp_medio) || 0,
          ftd: result.ftd ?? 0,
          taxa_conversao: Number(result.taxa_conversao) || 0,
          deposito_medio: Number(result.deposito_medio) || 0,
          saque_medio: Number(result.saque_medio) || 0,
        };
        setStats(statsData);
        adminPageCache.set(dashStatsCacheKey(filterKey), statsData);
      }
    } catch (error) {
      console.error('[DashboardPage] Erro ao carregar estatísticas:', error);
      setStats(null);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadChartData = async () => {
    try {
      setLoadingCharts(true);
      const evolutionPoints = getEvolutionChartPoints(customRange);
      const lastPoint = evolutionPoints[evolutionPoints.length - 1];
      const queryEnd = spDayEndExclusive(lastPoint.ymd);

      const { data: usuariosData, error: usuariosError } = await supabase
        .from('usuarios')
        .select('created_at')
        .lt('created_at', queryEnd.toISOString())
        .order('created_at', { ascending: true });

      if (usuariosError) {
        console.error('[DashboardPage] Erro ao carregar evolução de cadastros:', usuariosError);
        setChartPoints([]);
        return;
      }

      const timestamps = (usuariosData || [])
        .map((usuario) => {
          if (!usuario.created_at) return null;
          const date = new Date(usuario.created_at);
          if (Number.isNaN(date.getTime())) return null;
          return { date, ymd: ymdFromDateSP(date) };
        })
        .filter((item): item is { date: Date; ymd: string } => item !== null);

      const points = buildCadastrosChartPoints(evolutionPoints, timestamps);
      setChartPoints(points);
      adminPageCache.set(dashChartsCacheKey(filterKey), points);
    } catch (error) {
      console.error('[DashboardPage] Erro ao carregar evolução de cadastros:', error);
      setChartPoints([]);
    } finally {
      setLoadingCharts(false);
    }
  };

  const loadRecentTransactions = async () => {
    try {
      setTransactionsError(null);

      const { data, error } = await supabase.rpc('listar_transacoes_recentes_admin', {
        p_limite: RECENT_TRANSACTIONS_LIMIT,
      });

      if (error) {
        console.error('[DashboardPage] Erro ao carregar transações recentes:', error);
        setTransactionsError('Erro ao carregar transações recentes.');
        setRecentTransactions([]);
        return;
      }

      const result = data as { ok?: boolean; items?: RecentTransaction[] } | null;
      const items = (result?.items || []).slice(0, RECENT_TRANSACTIONS_LIMIT).map((item) => ({
        ...item,
        valor: Number(item.valor) || 0,
      }));

      setRecentTransactions(items);
      adminPageCache.set(DASH_TRANSACTIONS_CACHE, items);
    } catch (error) {
      console.error('[DashboardPage] Erro ao carregar transações recentes:', error);
      setTransactionsError('Erro ao carregar transações recentes.');
      setRecentTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const loadSaquesPendentes = async () => {
    try {
      setLoadingSaquesPendentes(true);

      const { data, error } = await supabase.rpc('obter_stats_saques_admin', {
        p_periodo: 'todos',
      });

      if (error) {
        console.error('[DashboardPage] Erro ao carregar saques pendentes:', error);
        setSaquesPendentes(null);
        return;
      }

      const result = data as { ok?: boolean; pendente_count?: number; pendente_valor?: number };
      if (result?.ok) {
        const statsData: SaquesPendentesStats = {
          pendente_count: result.pendente_count ?? 0,
          pendente_valor: Number(result.pendente_valor) || 0,
        };
        setSaquesPendentes(statsData);
        adminPageCache.set(DASH_SAQUES_PENDENTES_CACHE, statsData);
      }
    } catch (error) {
      console.error('[DashboardPage] Erro ao carregar saques pendentes:', error);
      setSaquesPendentes(null);
    } finally {
      setLoadingSaquesPendentes(false);
    }
  };

  const cards = [
    {
      title: 'Novos Usuários',
      value: formatNumber(stats?.novos_usuarios ?? 0),
      subtitle: 'No período selecionado',
      icon: Users,
      color: 'text-admin-accent',
    },
    {
      title: 'Taxa de Conversão',
      value: formatPercent(stats?.taxa_conversao ?? 0),
      subtitle: `${formatNumber(stats?.ftd ?? 0)} FTD de ${formatNumber(stats?.novos_usuarios ?? 0)} novos usuários`,
      icon: UserCheck,
      color: 'text-admin-accent',
    },
    {
      title: 'Depósitos',
      value: formatCurrency(stats?.depositos_valor ?? 0),
      subtitle: 'Total no período',
      icon: ArrowDownCircle,
      color: 'text-admin-info',
    },
    {
      title: 'Saques',
      value: formatCurrency(stats?.saques_valor ?? 0),
      subtitle: 'Total no período',
      icon: ArrowUpCircle,
      color: 'text-admin-danger',
    },
    {
      title: 'Volume de Apostas',
      value: formatCurrency(stats?.volume_apostas ?? 0),
      subtitle: 'Total apostado',
      icon: Trophy,
      color: 'text-admin-warning',
    },
    {
      title: 'Ganhos de Jogadores',
      value: formatCurrency(stats?.ganhos_jogadores ?? 0),
      subtitle: 'Total pago em prêmios',
      icon: TrendingUp,
      color: 'text-admin-success',
    },
    {
      title: 'RTP Médio',
      value: formatPercent(stats?.rtp_medio ?? 0),
      subtitle: 'Retorno ao jogador',
      icon: Percent,
      color: 'text-admin-info',
    },
    {
      title: 'Depósito Médio',
      value: formatCurrency(stats?.deposito_medio ?? 0),
      subtitle: 'Valor médio por depósito',
      icon: Wallet,
      color: 'text-admin-success',
    },
    {
      title: 'Saque Médio',
      value: formatCurrency(stats?.saque_medio ?? 0),
      subtitle: 'Valor médio por saque',
      icon: Coins,
      color: 'text-admin-warning',
    },
  ];

  return (
    <div>
      <PageHeader
        icon={LayoutDashboard}
        title="Dashboard"
        description="Acompanhe métricas e a evolução de cadastros da plataforma."
      />
      <DashboardDateFilter
        customRange={customRange}
        onCustomRangeApply={setCustomRange}
      />

      <div className="mb-6">
        <StatCard
          title="Saques Pendentes"
          value={formatNumber(saquesPendentes?.pendente_count ?? 0)}
          secondaryValue={formatCurrency(saquesPendentes?.pendente_valor ?? 0)}
          subtitle="valor total"
          icon={Banknote}
          tone="danger"
          compact
          className="w-[380px] h-[80px] bg-admin-danger/10 border-admin-danger/25 hover:border-admin-danger/40 backdrop-blur-[2px]"
          loading={loadingSaquesPendentes}
          onClick={() => navigate('/saques')}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {cards.map((card) => (
          <StatCard key={card.title} {...card} loading={loadingStats} />
        ))}
      </div>

      <PagePanel padding={false} className="mb-6 overflow-hidden">
        <div className="min-h-[64px] px-[18px] flex items-center justify-between gap-3 border-b border-admin-border">
          <div>
            <h3 className="text-sm font-semibold text-admin-foreground">Evolução de Cadastros</h3>
            <p className="mt-1 text-[11px] text-admin-muted">
              Cadastros diários e total acumulado no período selecionado
            </p>
          </div>
        </div>

        <CadastrosEvolutionChart
          points={chartPoints}
          loading={loadingCharts}
          formatNumber={formatNumber}
        />
      </PagePanel>

      <PagePanel>
        <h3 className="text-admin-foreground text-lg font-semibold mb-1">Transações Recentes</h3>
        <p className="text-admin-muted text-sm mb-4">Últimas {RECENT_TRANSACTIONS_LIMIT} transações</p>

        {loadingTransactions ? (
          <LoadingState inline message="Carregando transações..." />
        ) : transactionsError ? (
          <p className="text-admin-danger text-center py-8">{transactionsError}</p>
        ) : recentTransactions.length === 0 ? (
          <EmptyState icon={Receipt} title="Nenhuma transação encontrada." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full admin-table">
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Tipo</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((transaction) => (
                  <tr key={`${transaction.tipo}-${transaction.id}`}>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-admin-foreground text-sm">
                          {transaction.usuario_nome || 'Usuário'}
                        </span>
                        <span className="text-admin-muted text-xs">
                          {transaction.usuario_email || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                          transaction.tipo === 'deposito'
                            ? 'bg-admin-info/12 text-admin-info border-admin-info/20'
                            : 'bg-admin-accent/12 text-admin-accent border-admin-accent/20'
                        }`}
                      >
                        {transaction.tipo === 'deposito' ? 'Depósito' : 'Saque'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-admin-foreground font-medium whitespace-nowrap">
                      {formatCurrency(transaction.valor)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                          transaction.tipo === 'deposito'
                            ? getDepositoStatusBadge(transaction.status, transaction.origem || 'pix')
                            : getSaqueStatusBadge(transaction.status)
                        }`}
                      >
                        {transaction.tipo === 'deposito'
                          ? getDepositoStatusDisplay(transaction.status, transaction.origem || 'pix')
                          : getSaqueStatusDisplay(transaction.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-admin-foreground-soft text-sm whitespace-nowrap">
                      {formatDateTime(transaction.data_hora)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PagePanel>
    </div>
  );
}
