import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { Search, ScrollText, Filter } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/ui/StatCard';
import FilterPanel from '../components/ui/FilterPanel';
import LoadingState from '../components/ui/LoadingState';
import EmptyState from '../components/ui/EmptyState';
import PagePanel from '../components/ui/PagePanel';
import Pagination from '../components/jogos/Pagination';

interface LogItem {
  id: string;
  created_at: string;
  acao: string;
  admin_nome: string | null;
  admin_email: string | null;
  status: string;
  ip_address: string | null;
  dispositivo: string | null;
  detalhes: string | null;
  categoria: string;
}

const ITEMS_PER_PAGE = 20;

const ACTION_TYPES = [
  { key: 'todos', label: 'Todas as ações' },
  { key: 'saque', label: 'Saques' },
  { key: 'deposito', label: 'Depósitos' },
  { key: 'usuario', label: 'Usuários' },
  { key: 'cupom', label: 'Cupons' },
  { key: 'roleta', label: 'Roleta' },
  { key: 'jogo', label: 'Jogos' },
  { key: 'site', label: 'Site / Banners' },
  { key: 'vip', label: 'VIP' },
  { key: 'config', label: 'Configurações' },
  { key: 'equipe', label: 'Equipe' },
  { key: 'sistema', label: 'Sistema' },
];

const STATUS_FILTERS = [
  { key: 'todos', label: 'Todos os status' },
  { key: 'sucesso', label: 'Sucesso' },
  { key: 'falha', label: 'Falha' },
];

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const getStatusBadge = (status: string) => {
  if (status === 'sucesso') {
    return 'bg-admin-success/12 text-admin-success border-admin-success/20';
  }
  if (status === 'falha') {
    return 'bg-admin-danger/12 text-admin-danger border-admin-danger/20';
  }
  return 'bg-gray-600/20 text-gray-300 border-admin-border-strong/30';
};

const getStatusLabel = (status: string) => {
  if (status === 'sucesso') return 'Sucesso';
  if (status === 'falha') return 'Falha';
  return status;
};

export default function LogsPage() {
  const { showToast } = useToast();
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const [dataInicial, setDataInicial] = useState('');
  const [dataFinal, setDataFinal] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('todos');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [buscaInput, setBuscaInput] = useState('');
  const [busca, setBusca] = useState('');

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('listar_logs_admin', {
        p_data_inicial: dataInicial || null,
        p_data_final: dataFinal || null,
        p_categoria: categoriaFilter === 'todos' ? null : categoriaFilter,
        p_status: statusFilter === 'todos' ? null : statusFilter,
        p_busca: busca || null,
        p_pagina: currentPage,
        p_por_pagina: ITEMS_PER_PAGE,
      });

      if (error) {
        showToast('Erro ao carregar logs do sistema.', 'error');
        return;
      }

      const result = data as { ok?: boolean; total?: number; items?: LogItem[] };
      setLogs(result?.items ?? []);
      setTotalItems(result?.total ?? 0);
    } catch {
      showToast('Erro ao carregar logs do sistema.', 'error');
    } finally {
      setLoading(false);
    }
  }, [busca, categoriaFilter, currentPage, dataFinal, dataInicial, showToast, statusFilter]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    setBusca(buscaInput.trim());
  };

  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const activeFiltersCount = [
    dataInicial,
    dataFinal,
    categoriaFilter !== 'todos',
    statusFilter !== 'todos',
    busca,
  ].filter(Boolean).length;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div>
      <PageHeader
        icon={ScrollText}
        title="Logs do Sistema"
        description="Visualize e filtre todos os registros de atividades do sistema."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <StatCard
          title="Total de Registros"
          value={totalItems.toLocaleString('pt-BR')}
          subtitle={loading ? undefined : `Página ${currentPage} de ${totalPages}`}
          icon={ScrollText}
          color="text-admin-accent"
          loading={loading}
        />
        <StatCard
          title="Filtros Ativos"
          value={activeFiltersCount.toString()}
          subtitle={activeFiltersCount === 1 ? '1 filtro aplicado' : `${activeFiltersCount} filtros aplicados`}
          icon={Filter}
          color="text-admin-info"
        />
      </div>

      <FilterPanel>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-gray-400 text-xs font-medium mb-1.5">Data Inicial</label>
            <input
              type="date"
              value={dataInicial}
              onChange={(e) => {
                setDataInicial(e.target.value);
                handleFilterChange();
              }}
              className="admin-input [color-scheme:dark]"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-xs font-medium mb-1.5">Data Final</label>
            <input
              type="date"
              value={dataFinal}
              onChange={(e) => {
                setDataFinal(e.target.value);
                handleFilterChange();
              }}
              className="admin-input [color-scheme:dark]"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-xs font-medium mb-1.5">Tipo de Ação</label>
            <select
              value={categoriaFilter}
              onChange={(e) => {
                setCategoriaFilter(e.target.value);
                handleFilterChange();
              }}
              className="admin-input"
            >
              {ACTION_TYPES.map((type) => (
                <option key={type.key} value={type.key}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-400 text-xs font-medium mb-1.5">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                handleFilterChange();
              }}
              className="admin-input"
            >
              {STATUS_FILTERS.map((status) => (
                <option key={status.key} value={status.key}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-admin-muted" />
            <input
              type="text"
              value={buscaInput}
              onChange={(e) => setBuscaInput(e.target.value)}
              placeholder="Pesquisar por usuário, IP ou detalhes..."
              className="admin-input pl-10"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-admin-accent hover:bg-admin-accent-hover text-[#0d0e10] text-sm font-medium rounded-lg transition-colors"
          >
            Buscar
          </button>
        </form>
      </FilterPanel>

      <PagePanel padding={false}>
        {loading ? (
          <LoadingState message="Carregando logs..." inline />
        ) : logs.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title="Nenhum registro encontrado."
            description="Tente ajustar os filtros ou o termo de busca."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm admin-table">
                <thead>
                  <tr>
                    <th className="whitespace-nowrap">Data/Hora</th>
                    <th className="whitespace-nowrap">Ação</th>
                    <th className="whitespace-nowrap">Usuário</th>
                    <th className="whitespace-nowrap">Status</th>
                    <th className="whitespace-nowrap">IP</th>
                    <th className="whitespace-nowrap">Dispositivo</th>
                    <th className="min-w-[200px]">Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                        {formatDateTime(log.created_at)}
                      </td>
                      <td className="px-4 py-3 text-white font-medium whitespace-nowrap">{log.acao}</td>
                      <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                        <div>{log.admin_nome || '—'}</div>
                        {log.admin_email ? (
                          <div className="text-xs text-gray-500">{log.admin_email}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium border ${getStatusBadge(log.status)}`}
                        >
                          {getStatusLabel(log.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap font-mono text-xs">
                        {log.ip_address || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs max-w-[140px] truncate">
                        {log.dispositivo || '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs max-w-xs">
                        <span className="line-clamp-2" title={log.detalhes || undefined}>
                          {log.detalhes || '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalItems > 0 && (
              <div className="px-4 pb-4">
                <Pagination
                  page={currentPage}
                  pageSize={ITEMS_PER_PAGE}
                  total={totalItems}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        )}
      </PagePanel>
    </div>
  );
}
