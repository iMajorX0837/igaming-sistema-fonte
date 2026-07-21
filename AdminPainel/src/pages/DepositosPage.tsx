import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import {
  CheckCircle2,
  Clock,
  Wallet,
  HandCoins,
  Search,
  Eye,
  Check,
  XCircle,
  Timer,
  ArrowUpCircle,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/ui/StatCard';
import LoadingState from '../components/ui/LoadingState';
import EmptyState from '../components/ui/EmptyState';
import PagePanel from '../components/ui/PagePanel';
import FilterPanel from '../components/ui/FilterPanel';
import FilterChip from '../components/ui/FilterChip';
import Pagination from '../components/jogos/Pagination';
import DepositoDetalhesModal from '../components/DepositoDetalhesModal';

interface DepositoItem {
  id: string;
  usuario_id: string;
  valor: number;
  status: string;
  origem: string;
  data_hora: string;
  created_at: string;
  usuario_nome: string | null;
  usuario_email: string | null;
  usuario_cargo: string | null;
}

interface StatsDepositos {
  data_label: string;
  completos_count: number;
  completos_valor: number;
  pendente_count: number;
  pendente_valor: number;
  manual_count: number;
  manual_valor: number;
}

type StatusFilter = 'todos' | 'completo' | 'pendente' | 'falhou' | 'expirado' | 'manual';
type PeriodoFilter = 'todos' | 'hoje' | 'ontem' | '7dias' | '30dias' | 'mes';

const ITEMS_PER_PAGE = 11;

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'completo', label: 'Completo' },
  { key: 'pendente', label: 'Pendente' },
  { key: 'falhou', label: 'Falhou' },
  { key: 'expirado', label: 'Expirado' },
  { key: 'manual', label: 'Saldo Manual' },
];

const PERIODO_FILTERS: { key: PeriodoFilter; label: string }[] = [
  { key: 'todos', label: 'Todos os períodos' },
  { key: 'hoje', label: 'Hoje' },
  { key: 'ontem', label: 'Ontem' },
  { key: '7dias', label: 'Últimos 7 dias' },
  { key: '30dias', label: 'Últimos 30 dias' },
  { key: 'mes', label: 'Este mês' },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const shortId = (id: string) => id.replace(/-/g, '').slice(0, 24);

const getStatusDisplay = (status: string, origem: string) => {
  if (origem === 'manual' && status === 'aprovado') return 'Saldo Manual';
  const map: Record<string, string> = {
    aprovado: 'Completo',
    pendente: 'Pendente',
    falhou: 'Falhou',
    expirado: 'Expirado',
  };
  return map[status] || status;
};

const getStatusBadge = (status: string, origem: string) => {
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

export default function DepositosPage() {
  const { showToast } = useToast();

  const [depositos, setDepositos] = useState<DepositoItem[]>([]);
  const [stats, setStats] = useState<StatsDepositos | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [periodoFilter, setPeriodoFilter] = useState<PeriodoFilter>('todos');
  const [busca, setBusca] = useState('');
  const [buscaInput, setBuscaInput] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [detalhesDepositoId, setDetalhesDepositoId] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const { data, error: rpcError } = await supabase.rpc('obter_stats_depositos_admin', {
        p_periodo: 'hoje',
      });

      if (rpcError) {
        console.error(rpcError);
        return;
      }

      const result = data as { ok: boolean } & StatsDepositos;
      if (result?.ok) {
        setStats(result);
      }
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadDepositos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('listar_depositos_admin', {
        p_status: statusFilter,
        p_periodo: periodoFilter,
        p_busca: busca || null,
        p_pagina: currentPage,
        p_por_pagina: ITEMS_PER_PAGE,
      });

      if (rpcError) {
        console.error(rpcError);
        setError('Erro ao carregar depósitos. Execute deploy/supabase_nova_casa.sql no Supabase.');
        return;
      }

      const result = data as {
        ok: boolean;
        total: number;
        items: DepositoItem[];
      };

      if (result?.ok) {
        setDepositos(result.items || []);
        setTotalItems(result.total || 0);
      }
    } catch {
      setError('Erro ao carregar depósitos.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, periodoFilter, busca, currentPage]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    void loadDepositos();
  }, [loadDepositos]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, periodoFilter, busca]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setBusca(buscaInput.trim());
  };

  const handleApprove = async (depositoId: string) => {
    setActionLoading(depositoId);
    try {
      const { data, error: rpcError } = await supabase.rpc('atualizar_status_deposito_admin', {
        p_deposito_id: depositoId,
        p_status: 'aprovado',
      });

      if (rpcError) {
        showToast('Erro ao aprovar depósito.', 'error');
        return;
      }

      const result = data as { ok?: boolean; already?: boolean; error?: string };
      if (result?.ok === false) {
        showToast(result?.error || 'Erro ao aprovar depósito.', 'error');
        return;
      }

      showToast('Depósito aprovado!', 'success');
      await Promise.all([loadDepositos(), loadStats()]);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (depositoId: string, status: 'falhou' | 'expirado') => {
    setActionLoading(depositoId);
    try {
      const { data, error: rpcError } = await supabase.rpc('atualizar_status_deposito_admin', {
        p_deposito_id: depositoId,
        p_status: status,
      });

      if (rpcError) {
        showToast('Erro ao atualizar depósito.', 'error');
        return;
      }

      const result = data as { ok?: boolean; error?: string };
      if (!result?.ok) {
        showToast(result?.error || 'Erro ao atualizar depósito.', 'error');
        return;
      }

      showToast('Status atualizado!', 'success');
      await Promise.all([loadDepositos(), loadStats()]);
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const dataLabel = stats?.data_label || new Date().toLocaleDateString('pt-BR');

  const cards = [
    {
      title: 'Depósitos Completos',
      value: (stats?.completos_count ?? 0).toLocaleString('pt-BR'),
      subtitle: `Confirmados hoje (${dataLabel})`,
      icon: CheckCircle2,
      color: 'text-admin-success',
    },
    {
      title: 'Valor Completo',
      value: formatCurrency(stats?.completos_valor ?? 0),
      subtitle: 'Total confirmado hoje',
      icon: Wallet,
      color: 'text-admin-accent',
    },
    {
      title: 'Valor Pendente',
      value: formatCurrency(stats?.pendente_valor ?? 0),
      subtitle: `Pendente hoje (${stats?.pendente_count ?? 0} depósitos)`,
      icon: Clock,
      color: 'text-admin-warning',
    },
    {
      title: 'Saldo Manual',
      value: formatCurrency(stats?.manual_valor ?? 0),
      subtitle: `Depósitos manuais hoje (${stats?.manual_count ?? 0} depósitos)`,
      icon: HandCoins,
      color: 'text-admin-info',
    },
  ];

  return (
    <div>
      <PageHeader
        icon={ArrowUpCircle}
        title="Depósitos"
        description="Gerencie e visualize todos os depósitos realizados na plataforma."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {cards.map((card) => (
          <StatCard key={card.title} {...card} loading={statsLoading} />
        ))}
      </div>

      <FilterPanel>
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-admin-muted" />
          <input
            type="text"
            value={buscaInput}
            onChange={(e) => setBuscaInput(e.target.value)}
            placeholder="Buscar por ID, usuário, email..."
            className="admin-input pl-10"
          />
        </form>

        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <FilterChip
              key={f.key}
              label={f.label}
              active={statusFilter === f.key}
              onClick={() => setStatusFilter(f.key)}
            />
          ))}
        </div>

        <select
          value={periodoFilter}
          onChange={(e) => setPeriodoFilter(e.target.value as PeriodoFilter)}
          className="admin-input"
        >
          {PERIODO_FILTERS.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
        </select>
      </FilterPanel>

      {loading ? (
        <LoadingState message="Carregando depósitos..." />
      ) : error ? (
        <PagePanel>
          <p className="text-admin-danger">{error}</p>
        </PagePanel>
      ) : (
        <PagePanel className="overflow-x-auto">
          {depositos.length === 0 ? (
            <EmptyState icon={ArrowUpCircle} title="Nenhum depósito encontrado." />
          ) : (
            <>
              <table className="w-full min-w-[900px] admin-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Usuário</th>
                    <th>Data</th>
                    <th>Valor</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {depositos.map((deposito) => (
                    <tr key={deposito.id}>
                      <td className="py-3 px-4 text-gray-400 text-xs font-mono">
                        {shortId(deposito.id)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-white font-medium text-sm">
                            {deposito.usuario_nome || '-'}
                          </span>
                          {deposito.usuario_email && (
                            <span className="text-gray-500 text-xs">{deposito.usuario_email}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-300 text-sm whitespace-nowrap">
                        {formatDateTime(deposito.data_hora || deposito.created_at)}
                      </td>
                      <td className="py-3 px-4 text-white font-medium text-sm">
                        {formatCurrency(deposito.valor || 0)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadge(deposito.status, deposito.origem)}`}
                        >
                          {getStatusDisplay(deposito.status, deposito.origem)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setDetalhesDepositoId(deposito.id)}
                            className="p-1.5 rounded bg-admin-accent/12 hover:bg-admin-accent/20 text-admin-accent"
                            title="Detalhes do depósito"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {deposito.status === 'pendente' && (
                            <>
                              <button
                                onClick={() => handleApprove(deposito.id)}
                                disabled={actionLoading === deposito.id}
                                className="p-1.5 rounded bg-green-600/20 hover:bg-green-600/30 text-admin-success disabled:opacity-50"
                                title="Aprovar"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleReject(deposito.id, 'falhou')}
                                disabled={actionLoading === deposito.id}
                                className="p-1.5 rounded bg-red-600/20 hover:bg-red-600/30 text-admin-danger disabled:opacity-50"
                                title="Marcar como falhou"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleReject(deposito.id, 'expirado')}
                                disabled={actionLoading === deposito.id}
                                className="p-1.5 rounded bg-gray-600/20 hover:bg-gray-600/30 text-gray-300 disabled:opacity-50"
                                title="Marcar como expirado"
                              >
                                <Timer className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {totalPages > 1 && (
                <Pagination
                  page={currentPage}
                  pageSize={ITEMS_PER_PAGE}
                  total={totalItems}
                  onPageChange={goToPage}
                />
              )}
            </>
          )}
        </PagePanel>
      )}

      <DepositoDetalhesModal
        depositoId={detalhesDepositoId}
        onClose={() => setDetalhesDepositoId(null)}
      />
    </div>
  );
}
