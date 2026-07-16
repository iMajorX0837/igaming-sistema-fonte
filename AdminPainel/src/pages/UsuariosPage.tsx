import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { adminPageCache } from '../lib/adminPageCache';
import PageHeader from '../components/PageHeader';
import StatCard from '../components/ui/StatCard';
import LoadingState from '../components/ui/LoadingState';
import EmptyState from '../components/ui/EmptyState';
import PagePanel from '../components/ui/PagePanel';
import Pagination from '../components/jogos/Pagination';
import { Users, UserCheck, Wallet } from 'lucide-react';

const USUARIOS_LIST_CACHE = 'admin:usuarios:list:';
const USUARIOS_CARDS_CACHE = 'admin:usuarios:cards';

interface Usuario {
  id: string;
  nome: string;
  usuario_nome?: string | null;
  usuario: string;
  cpf: string;
  email: string;
  telefone: string;
  created_at: string;
  saldo: number;
  cargo?: string;
  vip_nivel?: number;
  total_depositado?: number;
  indicado_por?: string | null;
  indicador_id?: string | null;
  indicador_nome?: string | null;
}

const ITEMS_PER_PAGE = 11;

export default function UsuariosPage() {
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalUsuarios, setTotalUsuarios] = useState(0);
  const [totalDepositantes, setTotalDepositantes] = useState(0);
  const [bancaTotal, setBancaTotal] = useState(0);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [vipNomes, setVipNomes] = useState<Record<number, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    const loadVipNomes = async () => {
      const { data } = await supabase.from('vip_niveis').select('nivel, nome');
      if (data) {
        const map: Record<number, string> = {};
        for (const row of data) {
          map[row.nivel] = row.nome;
        }
        setVipNomes(map);
      }
    };
    void loadVipNomes();
  }, []);

  useEffect(() => {
    const page = currentPage;
    const listKey = `${USUARIOS_LIST_CACHE}${page}`;
    const listCached = adminPageCache.get<{
      usuarios: Usuario[];
      totalItems: number;
      error: string | null;
    }>(listKey);
    const cardsCached = adminPageCache.get<{
      totalUsuarios: number;
      totalDepositantes: number;
      bancaTotal: number;
    }>(USUARIOS_CARDS_CACHE);

    if (listCached) {
      setUsuarios(listCached.usuarios);
      setTotalItems(listCached.totalItems);
      setError(listCached.error);
      setLoading(false);
    } else {
      setLoading(true);
    }

    if (cardsCached) {
      setTotalUsuarios(cardsCached.totalUsuarios);
      setTotalDepositantes(cardsCached.totalDepositantes);
      setBancaTotal(cardsCached.bancaTotal);
      setCardsLoading(false);
    } else {
      setCardsLoading(true);
    }

    void loadUsuarios(page);
    void loadCardsData();
  }, [currentPage]);

  const loadUsuarios = async (page: number) => {
    try {
      setError(null);
      if (!adminPageCache.get(`${USUARIOS_LIST_CACHE}${page}`)) {
        setLoading(true);
      }

      const from = (page - 1) * ITEMS_PER_PAGE;

      const { data: rpcData, error: rpcError } = await supabase.rpc('listar_usuarios_admin', {
        p_offset: from,
        p_limit: ITEMS_PER_PAGE,
      });

      if (!rpcError && rpcData) {
        const parsed = rpcData as { total: number; items: Usuario[] };
        const usuariosData = parsed.items || [];
        const totalCount = parsed.total || 0;

        setUsuarios(usuariosData);
        setTotalItems(totalCount);
        setTotalUsuarios(totalCount);

        adminPageCache.set(`${USUARIOS_LIST_CACHE}${page}`, {
          usuarios: usuariosData,
          totalItems: totalCount,
          error: null,
        });
        return;
      }

      if (rpcError) {
        console.warn('[UsuariosPage] RPC indisponível, usando query direta:', rpcError.message);
      }

      const { count, error: countError } = await supabase
        .from('usuarios')
        .select('*', { count: 'exact', head: true });

      let totalCount = 0;
      if (countError) {
        console.error('Erro ao contar usuários:', countError);
      } else {
        totalCount = count || 0;
        setTotalItems(totalCount);
      }

      const { data, error: fetchError } = await supabase
        .from('usuarios')
        .select(
          'id, nome, usuario_nome, usuario, cpf, email, telefone, created_at, saldo, cargo, vip_nivel, total_depositado, indicado_por'
        )
        .order('created_at', { ascending: false })
        .range(from, from + ITEMS_PER_PAGE - 1);

      if (fetchError) {
        console.error('Erro ao buscar usuários:', fetchError);
        setError('Erro ao carregar usuários. Tente novamente.');
        return;
      }

      const usuariosData = data || [];
      setUsuarios(usuariosData);
      setTotalUsuarios(totalCount || usuariosData.length);

      adminPageCache.set(`${USUARIOS_LIST_CACHE}${page}`, {
        usuarios: usuariosData,
        totalItems: totalCount,
        error: null,
      });
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
      setError('Erro ao carregar usuários. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '-';
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${d}/${m}/${y} - ${h}:${min}`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatCPF = (cpf: string) => {
    if (!cpf) return '-';
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatPhone = (phone: string) => {
    if (!phone) return '-';
    return phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const getDisplayName = (usuario: Usuario) =>
    (usuario.usuario_nome && usuario.usuario_nome.trim()) ||
    (usuario.nome && usuario.nome.trim()) ||
    '-';

  const getWhatsAppLink = (phone: string) => {
    if (!phone) return '#';
    // Remove caracteres não numéricos
    const cleanPhone = phone.replace(/\D/g, '');
    return `https://wa.me/55${cleanPhone}`;
  };

  const handleUsuarioClick = (usuario: Usuario) => {
    navigate(`/usuarios/${usuario.id}`);
  };

  const loadCardsData = async () => {
    try {
      if (!adminPageCache.get(USUARIOS_CARDS_CACHE)) {
        setCardsLoading(true);
      }

      let totalU = 0;
      let totalD = 0;
      let banca = 0;

      const { data: statsData, error: statsError } = await supabase.rpc('obter_stats_usuarios_admin');

      if (!statsError && statsData) {
        const parsed = statsData as {
          total_usuarios: number;
          total_depositantes: number;
          banca_total: number;
        };
        totalU = parsed.total_usuarios ?? 0;
        totalD = parsed.total_depositantes ?? 0;
        banca = Number(parsed.banca_total ?? 0);

        setTotalUsuarios(totalU);
        setTotalDepositantes(totalD);
        setBancaTotal(banca);

        adminPageCache.set(USUARIOS_CARDS_CACHE, {
          totalUsuarios: totalU,
          totalDepositantes: totalD,
          bancaTotal: banca,
        });
        return;
      }

      if (statsError) {
        console.warn('[UsuariosPage] RPC stats indisponível, usando query direta:', statsError.message);
      }

      const { count: usuariosCount, error: usuariosError } = await supabase
        .from('usuarios')
        .select('*', { count: 'exact', head: true });

      if (!usuariosError && usuariosCount !== null) {
        totalU = usuariosCount;
        setTotalUsuarios(usuariosCount);
      } else {
        const { data: rpcCount } = await supabase.rpc('get_total_usuarios');
        if (rpcCount !== null) {
          totalU = rpcCount;
          setTotalUsuarios(rpcCount);
        }
      }

      const { data: depositosData, error: depositosError } = await supabase
        .from('depositos')
        .select('usuario_id');

      if (!depositosError && depositosData) {
        totalD = new Set(depositosData.map((d) => d.usuario_id).filter(Boolean)).size;
        setTotalDepositantes(totalD);
      }

      const { data: usuariosData, error: saldoError } = await supabase
        .from('usuarios')
        .select('saldo');

      if (!saldoError && usuariosData) {
        banca = usuariosData.reduce((acc, usuario) => acc + (usuario.saldo || 0), 0);
        setBancaTotal(banca);
      }

      adminPageCache.set(USUARIOS_CARDS_CACHE, {
        totalUsuarios: totalU,
        totalDepositantes: totalD,
        bancaTotal: banca,
      });
    } catch (err) {
      console.error('Erro ao carregar dados dos cards:', err);
    } finally {
      setCardsLoading(false);
    }
  };

  const cards = [
    {
      title: 'Usuários',
      value: totalUsuarios.toLocaleString('pt-BR'),
      subtitle: 'Total cadastrados',
      icon: Users,
      color: 'text-admin-accent',
    },
    {
      title: 'Depositantes',
      value: totalDepositantes.toLocaleString('pt-BR'),
      subtitle: 'Com pelo menos um depósito',
      icon: UserCheck,
      color: 'text-admin-info',
    },
    {
      title: 'Banca total',
      value: formatCurrency(bancaTotal),
      subtitle: 'Soma dos saldos',
      icon: Wallet,
      tone: 'good' as const,
    },
  ];

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div>
      <PageHeader
        icon={Users}
        title="Usuários"
        description="Gerencie contas, saldos e perfis dos usuários da plataforma."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {cards.map((card) => (
          <StatCard key={card.title} {...card} loading={cardsLoading} />
        ))}
      </div>

      {loading ? (
        <LoadingState message="Carregando usuários..." />
      ) : error ? (
        <PagePanel>
          <p className="text-admin-danger">{error}</p>
        </PagePanel>
      ) : (
        <PagePanel padding={usuarios.length > 0}>
          {usuarios.length === 0 ? (
            <EmptyState icon={Users} title="Nenhum usuário encontrado." />
          ) : (
            <>
              <div className="overflow-x-auto">
              <table className="w-full admin-table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>CPF</th>
                    <th>Telefone</th>
                    <th>Data de Criação</th>
                    <th>VIP</th>
                    <th>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((usuario) => (
                    <tr
                      key={usuario.id}
                      onClick={() => handleUsuarioClick(usuario)}
                      className="cursor-pointer"
                    >
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white">{getDisplayName(usuario)}</span>
                            <span
                              className="px-2 py-1 rounded-md text-xs font-medium"
                              style={{ backgroundColor: 'rgba(0, 98, 255, 0.2)', color: '#0062FF' }}
                            >
                              {usuario.cargo === 'admin' ? 'Administrador' : 'Usuário'}
                            </span>
                            {usuario.indicador_nome && (
                              <span
                                className={`px-2 py-1 rounded-md text-xs font-medium border border-violet-500/30 bg-violet-500/15 text-violet-200 ${
                                  usuario.indicador_id ? 'cursor-pointer hover:bg-violet-500/25' : ''
                                }`}
                                title={`Código: ${usuario.indicado_por || '—'}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (usuario.indicador_id) {
                                    navigate(`/usuarios/${usuario.indicador_id}`);
                                  }
                                }}
                              >
                                {usuario.indicador_nome}
                              </span>
                            )}
                          </div>
                          <span className="text-gray-400 text-xs">{usuario.email || '-'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-300">{formatCPF(usuario.cpf)}</td>
                      <td className="py-3 px-4 text-gray-300">
                        <div className="flex items-center gap-2">
                          <span>{formatPhone(usuario.telefone)}</span>
                          {usuario.telefone && (
                            <a
                              href={getWhatsAppLink(usuario.telefone)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-admin-foreground hover:text-white transition-colors"
                              title="Abrir WhatsApp"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                className="w-5 h-5"
                              >
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                              </svg>
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-300">{formatDate(usuario.created_at)}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-admin-accent text-sm font-medium">
                            {vipNomes[usuario.vip_nivel ?? 1] || `Nível ${usuario.vip_nivel ?? 1}`}
                          </span>
                          <span className="text-gray-500 text-xs">
                            {formatCurrency(usuario.total_depositado || 0)} depositado
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-admin-success font-medium">{formatCurrency(usuario.saldo || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>

              {totalItems > ITEMS_PER_PAGE && (
                <Pagination
                  page={currentPage}
                  pageSize={ITEMS_PER_PAGE}
                  total={totalItems}
                  onPageChange={handlePageChange}
                />
              )}
            </>
          )}
        </PagePanel>
      )}
    </div>
  );
}

