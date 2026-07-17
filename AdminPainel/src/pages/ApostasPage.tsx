import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { adminPageCache } from '../lib/adminPageCache';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/ui/StatCard';
import LoadingState from '../components/ui/LoadingState';
import EmptyState from '../components/ui/EmptyState';
import PagePanel from '../components/ui/PagePanel';
import Pagination from '../components/jogos/Pagination';
import { Trophy, Hash, TrendingUp } from 'lucide-react';

const APOSTAS_LIST_CACHE = 'admin:apostas:list:';

interface Aposta {
  id: string;
  usuario_id: string;
  valor: number;
  data?: string;
  created_at: string;
  status: string;
  jogo?: string;
  retorno?: number;
  com_bonus?: string;
  usuarios?: {
    nome: string;
    cargo?: string;
  };
}

const ITEMS_PER_PAGE = 11;

export default function ApostasPage() {
  const [apostas, setApostas] = useState<Aposta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    const page = currentPage;
    const cacheKey = `${APOSTAS_LIST_CACHE}${page}`;
    const cached = adminPageCache.get<{
      apostas: Aposta[];
      totalItems: number;
      error: string | null;
    }>(cacheKey);
    if (cached) {
      setApostas(cached.apostas);
      setTotalItems(cached.totalItems);
      setError(cached.error);
      setLoading(false);
      return;
    }
    loadApostas(page);
  }, [currentPage]);

  const loadApostas = async (page: number) => {
    try {
      setLoading(true);
      setError(null);
      
      // Calcular offset baseado na página atual
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      // Buscar total de registros
      const { count, error: countError } = await supabase
        .from('transacoes_jogos')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error('Erro ao contar apostas:', countError);
      } else {
        setTotalItems(count || 0);
      }

      const totalCount = countError ? 0 : count || 0;

      // Buscar apostas com join na tabela usuarios e paginação
      const { data, error: fetchError } = await supabase
        .from('transacoes_jogos')
        .select(`
          id,
          usuario_id,
          valor,
          data,
          created_at,
          status,
          jogo,
          retorno,
          com_bonus,
          usuarios!inner(nome, cargo)
        `)
        .order('data', { ascending: false })
        .range(from, to);

      if (fetchError) {
        console.error('Erro ao buscar apostas:', fetchError);
        // Tentar buscar sem join caso o relacionamento não esteja configurado
        const { data: apostasData, error: apostasError } = await supabase
          .from('transacoes_jogos')
          .select('id, usuario_id, valor, data, created_at, status, jogo, retorno, com_bonus')
          .order('data', { ascending: false })
          .range(from, to);

        if (apostasError) {
          setError('Erro ao carregar apostas. Tente novamente.');
          return;
        }

        // Buscar nomes e cargos dos usuários separadamente
        const userIds = [...new Set((apostasData || []).map(a => a.usuario_id).filter(Boolean))];
        const usuariosMap = new Map<string, { nome: string; cargo?: string }>();

        if (userIds.length > 0) {
          const { data: usuariosData } = await supabase
            .from('usuarios')
            .select('id, nome, cargo')
            .in('id', userIds);

          (usuariosData || []).forEach(usuario => {
            usuariosMap.set(usuario.id, { 
              nome: usuario.nome || '-',
              cargo: usuario.cargo 
            });
          });
        }

        // Combinar dados
        const apostasComNome = (apostasData || []).map(aposta => {
          const usuario = usuariosMap.get(aposta.usuario_id);
          return {
            ...aposta,
            usuarios: { 
              id: aposta.usuario_id,
              nome: usuario?.nome || '-',
              cpf: '',
              email: '',
              telefone: '',
              created_at: '',
              saldo: 0,
              cargo: usuario?.cargo 
            } as any
          };
        });

        const lista = apostasComNome as Aposta[];
        setApostas(lista);
        adminPageCache.set(`${APOSTAS_LIST_CACHE}${page}`, {
          apostas: lista,
          totalItems: totalCount,
          error: null,
        });
        return;
      }

      // Transformar dados do Supabase para o formato esperado
      const apostasFormatados = (data || []).map((item: any) => ({
        ...item,
        usuarios: Array.isArray(item.usuarios) && item.usuarios.length > 0 
          ? {
              id: item.usuario_id,
              nome: item.usuarios[0].nome || '-',
              cpf: '',
              email: '',
              telefone: '',
              created_at: '',
              saldo: 0,
              cargo: item.usuarios[0].cargo
            } as any
          : undefined
      })) as Aposta[];
      
      setApostas(apostasFormatados);
      adminPageCache.set(`${APOSTAS_LIST_CACHE}${page}`, {
        apostas: apostasFormatados,
        totalItems: totalCount,
        error: null,
      });
    } catch (err) {
      console.error('Erro ao carregar apostas:', err);
      setError('Erro ao carregar apostas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase() || '';
    
    switch (statusLower) {
      case 'ganhou':
      case 'vitoria':
        return {
          className: 'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-admin-accent/12 text-admin-accent border border-admin-accent/20',
          dot: 'w-2 h-2 rounded-full bg-admin-accent mr-2'
        };
      case 'perdeu':
      case 'derrota':
        return {
          className: 'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-red-500/20 text-admin-danger border border-red-500/30',
          dot: 'w-2 h-2 rounded-full bg-red-400 mr-2'
        };
      case 'pendente':
      case 'aguardando':
        return {
          className: 'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
          dot: 'w-2 h-2 rounded-full bg-yellow-400 mr-2 animate-pulse'
        };
      default:
        return {
          className: 'inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-500/20 text-gray-300 border border-gray-500/30',
          dot: 'w-2 h-2 rounded-full bg-gray-400 mr-2'
        };
    }
  };

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const pageVolume = apostas.reduce((sum, aposta) => sum + (aposta.valor || 0), 0);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div>
      <PageHeader
        icon={Trophy}
        title="Apostas"
        description="Visualize o histórico de apostas e transações de jogos."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Total de Apostas"
          value={totalItems.toLocaleString('pt-BR')}
          icon={Trophy}
          color="text-admin-accent"
          loading={loading}
        />
        <StatCard
          title="Registros na Página"
          value={apostas.length.toString()}
          subtitle={`Página ${currentPage} de ${Math.max(totalPages, 1)}`}
          icon={Hash}
          color="text-admin-info"
          loading={loading}
        />
        <StatCard
          title="Volume da Página"
          value={formatCurrency(pageVolume)}
          icon={TrendingUp}
          color="text-admin-success"
          loading={loading}
        />
      </div>

      {loading ? (
        <LoadingState message="Carregando apostas..." />
      ) : error ? (
        <PagePanel>
          <p className="text-admin-danger">{error}</p>
        </PagePanel>
      ) : (
        <PagePanel padding={false} className="overflow-x-auto">
          {apostas.length === 0 ? (
            <EmptyState icon={Trophy} title="Nenhuma aposta encontrada." />
          ) : (
            <>
              <div className="p-6 overflow-x-auto overflow-y-visible">
                <table className="w-full admin-table">
                  <thead>
                    <tr>
                      <th>Usuário</th>
                      <th>ID</th>
                      <th>Slot</th>
                      <th>Valor</th>
                      <th>Retorno</th>
                      <th>Bonus</th>
                      <th>Data/Hora</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {apostas.map((aposta) => (
                      <tr key={aposta.id}>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">
                              {aposta.usuarios?.nome || '-'}
                            </span>
                            <span 
                              className="px-2 py-1 rounded-md text-xs font-medium"
                              style={{ backgroundColor: 'rgba(0, 98, 255, 0.2)', color: '#0062FF' }}
                            >
                              {aposta.usuarios?.cargo === 'admin' ? 'Administrador' : 'Usuário'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-400 text-sm">{aposta.id || '-'}</td>
                        <td className="py-3 px-4 text-gray-300">
                          {aposta.jogo ? (
                            <span className="px-2 py-1 rounded-md text-xs font-medium bg-purple-500/20 text-purple-400">
                              {aposta.jogo}
                            </span>
                          ) : (
                            <span className="text-gray-500 text-sm">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-white font-medium">{formatCurrency(aposta.valor || 0)}</td>
                        <td className="py-3 px-4">
                          {aposta.retorno !== undefined && aposta.retorno !== null ? (
                            <span className={`font-medium ${aposta.retorno > 0 ? 'text-admin-accent' : 'text-gray-400'}`}>
                              {formatCurrency(aposta.retorno)}
                            </span>
                          ) : (
                            <span className="text-gray-500 text-sm">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {aposta.com_bonus ? (
                            <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                              aposta.com_bonus.toLowerCase() === 'sim' || aposta.com_bonus.toLowerCase() === 'yes'
                                ? 'bg-yellow-500/20 text-yellow-400'
                                : 'bg-gray-500/20 text-gray-400'
                            }`}>
                              {aposta.com_bonus}
                            </span>
                          ) : (
                            <span className="text-gray-500 text-sm">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-300">{formatDateTime(aposta.data || aposta.created_at)}</td>
                        <td className="py-3 px-4">
                          {aposta.status ? (
                            <span className={getStatusBadge(aposta.status).className}>
                              <span className={getStatusBadge(aposta.status).dot}></span>
                              {aposta.status.charAt(0).toUpperCase() + aposta.status.slice(1).toLowerCase()}
                            </span>
                          ) : (
                            <span className="text-gray-500 text-sm">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalItems > 0 && (
                <div className="px-6 pb-6">
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
      )}
    </div>
  );
}

