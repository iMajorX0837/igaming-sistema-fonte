import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Check,
  X,
  ArrowDownCircle,
  ShieldAlert,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import SaqueRiskAnalysisModal from '../components/SaqueRiskAnalysisModal';
import StatCard from '../components/ui/StatCard';
import LoadingState from '../components/ui/LoadingState';
import EmptyState from '../components/ui/EmptyState';
import PagePanel from '../components/ui/PagePanel';
import FilterPanel from '../components/ui/FilterPanel';
import FilterChip from '../components/ui/FilterChip';
import Pagination from '../components/jogos/Pagination';
import { approveWithdraw } from '../lib/withdrawApi';

interface SaqueItem {
  id: string;
  usuario_id: string;
  valor: number;
  status: string;
  origem: string;
  metodo_key: string | null;
  metodo_chave: string | null;
  data_hora: string;
  created_at: string;
  usuario_nome: string | null;
  usuario_email: string | null;
  usuario_cargo: string | null;
}

interface StatsSaques {
  pendente_count: number;
  pendente_valor: number;
  aprovado_count: number;
  aprovado_valor: number;
  rejeitado_count: number;
  rejeitado_valor: number;
  falhou_count: number;
  falhou_valor: number;
}

type StatusFilter = 'todos' | 'pendente' | 'aprovado' | 'rejeitado' | 'falhou';
type PeriodoFilter = 'todos' | 'hoje' | 'ontem' | '7dias' | '30dias' | 'mes';

const ITEMS_PER_PAGE = 11;

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'pendente', label: 'Pendentes' },
  { key: 'aprovado', label: 'Aprovados' },
  { key: 'rejeitado', label: 'Rejeitados' },
  { key: 'falhou', label: 'Falhados' },
  { key: 'todos', label: 'Todos' },
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

const formatPixType = (type?: string | null) => {
  if (!type) return 'PIX';
  const map: Record<string, string> = {
    email: 'Email',
    cpf: 'CPF',
    cnpj: 'CNPJ',
    telefone: 'Telefone',
    'chave aleatória': 'Chave Aleatória',
  };
  return map[type.toLowerCase()] || type;
};

const getStatusDisplay = (status: string) => {
  const map: Record<string, string> = {
    aprovado: 'Aprovado',
    pendente: 'Pendente',
    rejeitado: 'Rejeitado',
    falhou: 'Falhou',
  };
  return map[status] || status;
};

const getStatusBadge = (status: string) => {
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

export default function SaquesPage() {
  const { showToast } = useToast();

  const [saques, setSaques] = useState<SaqueItem[]>([]);
  const [stats, setStats] = useState<StatsSaques | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pendente');
  const [periodoFilter, setPeriodoFilter] = useState<PeriodoFilter>('todos');
  const [busca, setBusca] = useState('');
  const [buscaInput, setBuscaInput] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [riskSaqueId, setRiskSaqueId] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const { data, error: rpcError } = await supabase.rpc('obter_stats_saques_admin', {
        p_periodo: periodoFilter,
      });

      if (rpcError) {
        console.error(rpcError);
        return;
      }

      const result = data as { ok: boolean } & StatsSaques;
      if (result?.ok) setStats(result);
    } finally {
      setStatsLoading(false);
    }
  }, [periodoFilter]);

  const loadSaques = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('listar_saques_admin', {
        p_status: statusFilter,
        p_periodo: periodoFilter,
        p_busca: busca || null,
        p_pagina: currentPage,
        p_por_pagina: ITEMS_PER_PAGE,
      });

      if (rpcError) {
        console.error(rpcError);
        setError('Erro ao carregar saques. Execute saques_admin.sql no Supabase.');
        return;
      }

      const result = data as { ok: boolean; total: number; items: SaqueItem[] };
      if (result?.ok) {
        setSaques(result.items || []);
        setTotalItems(result.total || 0);
      }
    } catch {
      setError('Erro ao carregar saques.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, periodoFilter, busca, currentPage]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    void loadSaques();
  }, [loadSaques]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, periodoFilter, busca]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setBusca(buscaInput.trim());
  };

  const handleStatusUpdate = async (saqueId: string, status: 'aprovado' | 'rejeitado' | 'falhou') => {
    setActionLoading(saqueId);
    try {
      if (status === 'aprovado') {
        const result = await approveWithdraw(saqueId);
        showToast(result.message || 'Saque aprovado e enviado para pagamento PIX!', 'success');
        await Promise.all([loadSaques(), loadStats()]);
        return;
      }

      const { data, error: rpcError } = await supabase.rpc('atualizar_status_saque_admin', {
        p_saque_id: saqueId,
        p_status: status,
      });

      if (rpcError) {
        console.error('atualizar_status_saque_admin:', rpcError);
        showToast(rpcError.message || 'Erro ao atualizar saque.', 'error');
        return;
      }

      const result = data as { ok?: boolean; error?: string };
      if (!result?.ok) {
        showToast(result?.error || 'Erro ao atualizar saque.', 'error');
        return;
      }

      const labels = { aprovado: 'aprovado', rejeitado: 'rejeitado', falhou: 'marcado como falhou' };
      showToast(`Saque ${labels[status]}!`, 'success');
      await Promise.all([loadSaques(), loadStats()]);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao atualizar saque.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReprovarPendentes = async () => {
    if (!window.confirm('Reprovar todos os saques pendentes? O saldo será devolvido aos usuários.')) return;

    setBulkLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('reprovar_pendentes_saques_admin');

      if (rpcError) {
        showToast('Erro ao reprovar saques.', 'error');
        return;
      }

      const result = data as { ok?: boolean; reprovados?: number; error?: string };
      if (!result?.ok) {
        showToast(result?.error || 'Erro ao reprovar saques.', 'error');
        return;
      }

      showToast(`${result.reprovados ?? 0} saque(s) reprovado(s)!`, 'success');
      await Promise.all([loadSaques(), loadStats()]);
    } finally {
      setBulkLoading(false);
    }
  };

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const cards = [
    {
      title: 'Pendentes',
      value: formatCurrency(stats?.pendente_valor ?? 0),
      subtitle: `${stats?.pendente_count ?? 0} saques`,
      icon: Clock,
      color: 'text-admin-warning',
    },
    {
      title: 'Aprovados',
      value: formatCurrency(stats?.aprovado_valor ?? 0),
      subtitle: `${stats?.aprovado_count ?? 0} saques`,
      icon: CheckCircle2,
      color: 'text-admin-success',
    },
    {
      title: 'Rejeitados',
      value: formatCurrency(stats?.rejeitado_valor ?? 0),
      subtitle: `${stats?.rejeitado_count ?? 0} saques`,
      icon: XCircle,
      color: 'text-admin-danger',
    },
    {
      title: 'Falhados',
      value: formatCurrency(stats?.falhou_valor ?? 0),
      subtitle: `${stats?.falhou_count ?? 0} saques`,
      icon: AlertTriangle,
      color: 'text-gray-400',
    },
  ];

  return (
    <div>
      <PageHeader
        icon={ArrowDownCircle}
        title="Saques"
        description="Gerencie solicitações de saque, aprove ou rejeite transações."
        actions={
          <button
            onClick={handleReprovarPendentes}
            disabled={bulkLoading || (stats?.pendente_count ?? 0) === 0}
            className="px-4 py-2 rounded-lg bg-red-700 hover:bg-red-600 text-white text-sm font-medium disabled:opacity-50 whitespace-nowrap"
          >
            {bulkLoading ? 'Reprovando...' : 'Reprovar pendentes'}
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
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
            placeholder="Buscar por usuário, email, valor..."
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
        <LoadingState message="Carregando saques..." />
      ) : error ? (
        <PagePanel>
          <p className="text-admin-danger">{error}</p>
        </PagePanel>
      ) : (
        <PagePanel className="overflow-x-auto">
          {saques.length === 0 ? (
            <EmptyState icon={ArrowDownCircle} title="Nenhum saque encontrado." />
          ) : (
            <>
              <table className="w-full min-w-[900px] admin-table">
                <thead>
                  <tr>
                    <th>Usuário</th>
                    <th>Valor</th>
                    <th>Método</th>
                    <th>Status</th>
                    <th>Data</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {saques.map((saque) => (
                    <tr key={saque.id}>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-white font-medium text-sm">
                            {saque.usuario_nome || '-'}
                          </span>
                          {saque.usuario_email && (
                            <span className="text-gray-500 text-xs">{saque.usuario_email}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-white font-medium text-sm">
                        {formatCurrency(saque.valor || 0)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-admin-info text-xs font-medium">
                            {formatPixType(saque.metodo_key)}
                          </span>
                          {saque.metodo_chave && (
                            <span className="text-gray-500 text-xs truncate max-w-[160px]" title={saque.metodo_chave}>
                              {saque.metodo_chave}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadge(saque.status)}`}
                        >
                          {getStatusDisplay(saque.status)}
                          {saque.origem === 'revenue_share' && (
                            <span className="ml-1 opacity-70">· RS</span>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-300 text-sm whitespace-nowrap">
                        {formatDateTime(saque.data_hora || saque.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => setRiskSaqueId(saque.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-admin-warning text-xs font-medium"
                            title="Análise de Risco"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            Análise
                          </button>
                          {saque.status === 'pendente' && (
                            <>
                              <button
                                onClick={() => handleStatusUpdate(saque.id, 'aprovado')}
                                disabled={actionLoading === saque.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-600/20 hover:bg-green-600/30 text-admin-success text-xs font-medium disabled:opacity-50"
                                title="Aceitar saque"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Aceitar
                              </button>
                              <button
                                onClick={() => handleStatusUpdate(saque.id, 'rejeitado')}
                                disabled={actionLoading === saque.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-admin-danger text-xs font-medium disabled:opacity-50"
                                title="Recusar saque"
                              >
                                <X className="w-3.5 h-3.5" />
                                Recusar
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

      <SaqueRiskAnalysisModal saqueId={riskSaqueId} onClose={() => setRiskSaqueId(null)} />
    </div>
  );
}
