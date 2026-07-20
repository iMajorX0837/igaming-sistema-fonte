import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from './Footer';
import AppPageScaffold from './AppPageScaffold';
import BackButton from './BackButton';
import DepositModal from './DepositModal';
import WithdrawModal from './WithdrawModal';
import Notification from './Notification';
import { useAuth } from '../contexts/AuthContext';
import { useVipProfile } from '../hooks/useVipProfile';
import { usePlataformaConfig } from '../hooks/usePlataformaConfig';
import { useHomeConfig } from '../hooks/useHomeConfig';
import { supabase } from '../lib/supabase';
import { listarCuponsUsuario, type CupomHistoricoItem } from '../lib/cupons';
import {
  getFreeBonusStatusClass,
  getFreeBonusStatusLabel,
  listFreeBonuses,
  type FreeBonusItem,
} from '../lib/freeBonus';
import { resolveGameByGameCode } from '../utils/resolveGameBySlug';
import LoadingScreen from './LoadingScreen';
import { appPageContainerClass } from '../constants/homeLayout';

function WalletMobileField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-slate-500 text-[11px] mb-0.5">{label}</p>
      <div className="text-xs text-white break-words">{value}</div>
    </div>
  );
}

function WalletTransactionMobileCard({
  activeTab,
  item,
  backgroundColor,
  playingRodadaId,
  onPlayRodada,
}: {
  activeTab: string;
  item: Record<string, unknown>;
  backgroundColor: string;
  playingRodadaId: string | null;
  onPlayRodada: (bonus: FreeBonusItem) => void;
}) {
  const statusBadge = (status: string, className = 'bg-brand/20 text-brand-light') => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${className}`}>
      {status}
    </span>
  );

  return (
    <div className="rounded-xl border border-white/10 p-3" style={{ backgroundColor }}>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
        {activeTab === 'transacoes' && (
          <>
            <WalletMobileField label="Identificador" value={String(item.id ?? '—')} />
            <WalletMobileField label="Data" value={String(item.data ?? '—')} />
            <WalletMobileField label="Jogo" value={String(item.jogo ?? '—')} />
            <WalletMobileField label="Aposta" value={String(item.aposta ?? '—')} />
            <WalletMobileField label="Retorno" value={String(item.retorno ?? '—')} />
            <WalletMobileField label="Status" value={statusBadge(String(item.status ?? '—'))} />
            <WalletMobileField label="Bônus" value={String(item.bonus ?? '—')} />
          </>
        )}
        {(activeTab === 'saques' || activeTab === 'depositos') && (
          <>
            <WalletMobileField label="Identificador" value={String(item.id ?? '—')} />
            <WalletMobileField label="Data" value={String(item.data ?? '—')} />
            <WalletMobileField label="Valor" value={String(item.valor ?? '—')} />
            <WalletMobileField
              label="Status"
              value={statusBadge(
                String(item.status ?? '—'),
                item.status === 'Aprovado'
                  ? 'bg-brand/20 text-brand-light'
                  : item.status === 'Rejeitado'
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-yellow-500/20 text-yellow-400',
              )}
            />
          </>
        )}
        {activeTab === 'cupons' && (
          <>
            <WalletMobileField label="Identificador" value={String(item.id ?? '—')} />
            <WalletMobileField label="Data" value={String(item.data ?? '—')} />
            <WalletMobileField label="Cupom" value={String(item.cupom ?? '—')} />
            <WalletMobileField label="Valor" value={String(item.valor ?? '—')} />
            <WalletMobileField label="Status" value={statusBadge(String(item.status ?? '—'))} />
            <WalletMobileField label="Bônus" value={String(item.bonus ?? '—')} />
          </>
        )}
        {activeTab === 'rodadas' && (
          <>
            <WalletMobileField label="Identificador" value={String(item.id ?? '—')} />
            <WalletMobileField label="Data" value={String(item.data ?? '—')} />
            <WalletMobileField label="Jogo" value={String(item.jogo ?? '—')} />
            <WalletMobileField label="Restantes" value={String(item.restantes ?? '—')} />
            <WalletMobileField label="Total" value={String(item.total ?? '—')} />
            <WalletMobileField
              label="Status"
              value={statusBadge(String(item.status ?? '—'), getFreeBonusStatusClass(String(item.statusApi ?? '')))}
            />
          </>
        )}
      </div>
      {activeTab === 'rodadas' && String(item.statusApi ?? '').toLowerCase() === 'pending' && (
        <button
          type="button"
          onClick={() => onPlayRodada(item.raw as FreeBonusItem)}
          disabled={playingRodadaId === String(item.id)}
          className="mt-3 h-9 w-full rounded-lg bg-brand hover:bg-brand-hover disabled:opacity-60 disabled:cursor-not-allowed text-xs font-bold text-white transition-all"
        >
          {playingRodadaId === String(item.id) ? 'Abrindo...' : 'Jogar'}
        </button>
      )}
    </div>
  );
}

export default function WalletPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { profile: vipProfile } = useVipProfile();
  const { config: plataformaConfig, refresh: refreshPlataformaConfig } = usePlataformaConfig();
  const { config: homeConfig } = useHomeConfig();
  const walletCardBg = `color-mix(in srgb, ${homeConfig.fundo} 90%, white)`;
  const walletRowAltBg = `color-mix(in srgb, ${homeConfig.fundo} 88%, black)`;
  const [activeTab, setActiveTab] = useState('transacoes');
  const [currentPage, setCurrentPage] = useState(1);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [saldo, setSaldo] = useState<number>(0);
  const [saques, setSaques] = useState<any[]>([]);
  const [depositos, setDepositos] = useState<any[]>([]);
  const [transacoesJogos, setTransacoesJogos] = useState<any[]>([]);
  const [cupons, setCupons] = useState<CupomHistoricoItem[]>([]);
  const [freeBonuses, setFreeBonuses] = useState<FreeBonusItem[]>([]);
  const [loadingSaques, setLoadingSaques] = useState(false);
  const [loadingTransacoes, setLoadingTransacoes] = useState(false);
  const [loadingCupons, setLoadingCupons] = useState(false);
  const [loadingFreeBonuses, setLoadingFreeBonuses] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [playingRodadaId, setPlayingRodadaId] = useState<string | null>(null);
  const itemsPerPage = 10;

  // Função para buscar saques do usuário
  const fetchSaques = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setSaques([]);
      return;
    }

    setLoadingSaques(true);
    try {
      const { data, error } = await supabase
        .from('saques')
        .select('*')
        .eq('usuario_id', user.id)
        .order('data_hora', { ascending: false });

      if (error) {
        console.error('Erro ao buscar saques:', error);
        return;
      }

      if (data) {
        setSaques(data);
      }
    } catch (error) {
      console.error('Erro ao buscar saques:', error);
    } finally {
      setLoadingSaques(false);
    }
  }, [isAuthenticated, user]);

  // Função para buscar depósitos do usuário
  const fetchDepositos = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setDepositos([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('depositos')
        .select('*')
        .eq('usuario_id', user.id)
        .order('data_hora', { ascending: false });

      if (error) {
        console.error('Erro ao buscar depósitos:', error);
        return;
      }

      if (data) {
        setDepositos(data);
      }
    } catch (error) {
      console.error('Erro ao buscar depósitos:', error);
    }
  }, [isAuthenticated, user]);

  // Função para buscar transações de jogos do usuário
  const fetchTransacoesJogos = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setTransacoesJogos([]);
      return;
    }

    setLoadingTransacoes(true);
    try {
      const { data, error } = await supabase
        .from('transacoes_jogos')
        .select('*')
        .eq('usuario_id', user.id)
        .order('data', { ascending: false });

      if (error) {
        console.error('Erro ao buscar transações de jogos:', error);
        return;
      }

      if (data) {
        setTransacoesJogos(data);
      }
    } catch (error) {
      console.error('Erro ao buscar transações de jogos:', error);
    } finally {
      setLoadingTransacoes(false);
    }
  }, [isAuthenticated, user]);

  const fetchCupons = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setCupons([]);
      return;
    }

    setLoadingCupons(true);
    try {
      const data = await listarCuponsUsuario();
      setCupons(data);
    } catch (error) {
      console.error('Erro ao buscar cupons:', error);
    } finally {
      setLoadingCupons(false);
    }
  }, [isAuthenticated, user]);

  const fetchFreeBonuses = useCallback(async () => {
    if (!isAuthenticated || !user?.email) {
      setFreeBonuses([]);
      return;
    }

    setLoadingFreeBonuses(true);
    try {
      const data = await listFreeBonuses(user.email);
      setFreeBonuses(data);
    } catch (error) {
      console.error('Erro ao buscar rodadas grátis:', error);
      setFreeBonuses([]);
    } finally {
      setLoadingFreeBonuses(false);
    }
  }, [isAuthenticated, user]);

  // Formatar data para exibição
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  // Formatar valor monetário
  const formatCurrency = (valor: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valor);
  };

  // Função para buscar saldo do usuário
  const fetchSaldo = useCallback(async () => {
    if (isAuthenticated && user) {
      try {
        const { data, error } = await supabase
          .from('usuarios')
          .select('saldo')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Erro ao buscar saldo:', error);
          return;
        }

        if (data) {
          setSaldo(data.saldo || 0);
        }
      } catch (error) {
        console.error('Erro ao buscar saldo:', error);
      }
    } else {
      setSaldo(0);
    }
  }, [isAuthenticated, user]);

  // Buscar saldo quando o usuário está autenticado
  useEffect(() => {
    fetchSaldo();
  }, [fetchSaldo]);

  // Buscar saques quando o usuário está autenticado
  useEffect(() => {
    fetchSaques();
  }, [fetchSaques]);

  // Buscar depósitos quando o usuário está autenticado
  useEffect(() => {
    fetchDepositos();
  }, [fetchDepositos]);

  // Buscar transações de jogos quando o usuário está autenticado
  useEffect(() => {
    fetchTransacoesJogos();
  }, [fetchTransacoesJogos]);

  // Buscar cupons quando o usuário está autenticado
  useEffect(() => {
    void fetchCupons();
  }, [fetchCupons]);

  // Resetar página quando trocar de aba
  useEffect(() => {
    setCurrentPage(1);
    if (activeTab === 'cupons') {
      void fetchCupons();
    }
    if (activeTab === 'rodadas') {
      void fetchFreeBonuses();
    }
  }, [activeTab, fetchCupons, fetchFreeBonuses]);

  // Listener para mudanças no saldo em tempo real
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const channel = supabase
      .channel('saldo-changes-wallet')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'usuarios',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new && 'saldo' in payload.new) {
            setSaldo(payload.new.saldo as number);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, user]);

  // Listener para novas transações de jogos em tempo real
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const channel = supabase
      .channel('transacoes-jogos-changes-wallet')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transacoes_jogos',
          filter: `usuario_id=eq.${user.id}`,
        },
        () => {
          // Recarregar transações quando uma nova for inserida
          fetchTransacoesJogos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, user, fetchTransacoesJogos]);

  // Formatar saldo para exibição
  const formatSaldo = (valor: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valor);
  };

  const openDepositModal = () => {
    void refreshPlataformaConfig();
    setIsDepositModalOpen(true);
  };

  const openWithdrawModal = () => {
    void refreshPlataformaConfig();
    if (saldo < plataformaConfig.saque_minimo) {
      setNotification('Saldo insuficiente para realizar um saque.');
      return;
    }
    setIsWithdrawModalOpen(true);
  };

  // Preparar dados formatados para exibição
  const withdrawalsFormatted = saques.map(saque => ({
    id: saque.id,
    valor: formatCurrency(saque.valor),
    status: saque.status === 'aprovado' ? 'Aprovado' : saque.status === 'rejeitado' ? 'Rejeitado' : 'Pendente',
    data: formatDate(saque.data_hora),
  }));

  const depositsFormatted = depositos.map(deposito => ({
    id: deposito.id,
    valor: formatCurrency(deposito.valor),
    status: deposito.status === 'aprovado' ? 'Aprovado' : 'Pendente',
    data: formatDate(deposito.data_hora),
  }));

  const transactionsFormatted = transacoesJogos.map(transacao => ({
    id: transacao.txn_id || transacao.id,
    jogo: transacao.jogo || 'Jogo Desconhecido',
    aposta: formatCurrency(transacao.valor || 0),
    retorno: formatCurrency(transacao.retorno || 0),
    status: transacao.status === 'Finalizado' ? 'Aprovado' : transacao.status || 'Aprovado',
    bonus: transacao.com_bonus || 'Não',
    data: formatDate(transacao.data || transacao.created_at),
  }));

  const cuponsFormatted = cupons
    .filter((cupom) => cupom.tipo_bonus !== 'giros_gratis')
    .map((cupom) => ({
      id: cupom.id,
      cupom: cupom.cupom,
      valor: formatCurrency(cupom.valor),
      status: cupom.status,
      bonus: 'Saldo Real',
      data: cupom.data,
    }));

  const rodadasFormatted = freeBonuses.map((bonus) => ({
    id: String(bonus.id),
    jogo: bonus.game_name,
    restantes: `${bonus.rounds} giros`,
    total: `${bonus.total_rounds} giros`,
    status: getFreeBonusStatusLabel(bonus.status),
    statusApi: bonus.status,
    data: formatDate(bonus.created_at),
    raw: bonus,
  }));

  const handleJogarRodadas = async (bonus: FreeBonusItem) => {
    if (!isAuthenticated || !user?.email) {
      setNotification('Faça login para jogar.');
      return;
    }

    if (bonus.status.toLowerCase() !== 'pending') {
      return;
    }

    setPlayingRodadaId(String(bonus.id));

    try {
      const resolved = await resolveGameByGameCode(bonus.game_id);
      if (!resolved) {
        setNotification('Jogo não encontrado na API PlayFivers.');
        return;
      }

      sessionStorage.setItem('previousPath', window.location.pathname);
      sessionStorage.setItem(
        'gameData',
        JSON.stringify({
          name: resolved.name,
          provider: resolved.provider,
          image: resolved.image,
          game_code: resolved.game_code,
        })
      );

      navigate(`/${resolved.provider_slug}/${resolved.game_slug}`);
    } catch (error) {
      console.error('Erro ao abrir jogo com rodadas grátis:', error);
      setNotification('Erro ao abrir o jogo. Tente novamente.');
    } finally {
      setPlayingRodadaId(null);
    }
  };

  const currentData =
    activeTab === 'transacoes'
      ? transactionsFormatted
      : activeTab === 'saques'
        ? withdrawalsFormatted
        : activeTab === 'cupons'
          ? cuponsFormatted
          : activeTab === 'rodadas'
            ? rodadasFormatted
            : activeTab === 'bonus'
              ? []
              : activeTab === 'depositos'
                ? depositsFormatted
                : transactionsFormatted;
  const totalPages = Math.ceil(currentData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTransactions = currentData.slice(startIndex, endIndex);

  return (
    <>
    <Notification
      isOpen={notification !== null}
      onClose={() => setNotification(null)}
      message={notification ?? ''}
    />
    <AppPageScaffold>
      <div className={`flex flex-col min-h-full ${appPageContainerClass}`}>
        <div className="flex-1 py-4 sm:py-6 max-md:pb-2">
            <BackButton onClick={() => navigate('/')} className="md:hidden mb-4 -mt-1" />
            <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
              <span className="iconify i-solar:wallet-bold-duotone shrink-0" aria-hidden="true" style={{ fontSize: '28px' }}></span>
              <h1 className="text-white text-xl md:text-2xl font-bold">Carteira</h1>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
              <div className="rounded-xl p-3 md:p-4 border border-slate-700/50" style={{ backgroundColor: walletCardBg }}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <svg enableBackground="new 0 0 512 512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9 md:w-10 md:h-10 shrink-0">
                      <g id="Currency">
                        <g id="Dollar">
                          <g id="Coin">
                            <g id="Bottom">
                              <ellipse cx="256" cy="256" fill="#e88102" rx="245" ry="256"></ellipse>
                              <circle cx="256" cy="242.5" fill="#fdd835" r="242.5"></circle>
                            </g>
                            <g id="Shade" fill="#fff">
                              <path d="m352.8 20.1-319.2 319.1c-10.7-24.5-17.4-51.1-19.4-79l259.5-259.6c27.9 2.1 54.5 8.8 79.1 19.5z" opacity=".5"></path>
                              <path d="m467.3 123.5-330.3 330.3c-20.6-11.6-39.2-26.1-55.5-43l342.9-342.8c16.8 16.2 31.3 34.9 42.9 55.5z" opacity=".5"></path>
                              <path d="m414.5 58.9-342 342c-5.3-6.2-10.4-12.7-15.1-19.4l337.7-337.7c6.7 4.7 13.2 9.8 19.4 15.1z" opacity=".5"></path>
                              <path d="m490.9 182-295.4 295.4c-8.9-2.3-17.6-5.1-26.1-8.3l313.2-313.2c3.2 8.5 6 17.2 8.3 26.1z" opacity=".5"></path>
                              <path d="m498.5 242.5c0 1.7 0 3.3-.1 5-2.6-131.6-110.1-237.5-242.4-237.5s-239.8 105.9-242.4 237.5c0-1.7-.1-3.3-.1-5 0-133.9 108.6-242.5 242.5-242.5s242.5 108.6 242.5 242.5z" opacity=".5"></path>
                              <path d="m453 253c0 104.9-85.1 190-190 190-58.9 0-111.6-26.9-146.5-69 34.7 37.5 84.3 61 139.5 61 104.9 0 190-85.1 190-190 0-46-16.3-88.1-43.5-121 31.3 33.9 50.5 79.2 50.5 129z" opacity=".5"></path>
                            </g>
                            <g id="Top">
                              <circle cx="256" cy="245" fill="#f39e09" r="190"></circle>
                              <path d="m400 121c-33.3-28.7-76.6-46-124-46-104.9 0-190 85.1-190 190 0 47.4 17.3 90.7 46 124-40.4-34.9-66-86.4-66-144 0-104.9 85.1-190 190-190 57.5 0 109.1 25.6 144 66z" fill="#e88102"></path>
                            </g>
                          </g>
                          <g id="Icon">
                            <path id="Bottom-2" d="m244.1 196.6c-3.4 3.9-5.2 9.3-5.2 16.2s2 12.6 6 16.7 10.4 8 19.2 11.8c8.8 3.7 17.1 7.6 24.9 11.6s14.5 8.6 20.2 13.7 10.1 11.1 13.3 17.9c1.2 2.6 4.8 7.5 4.8 7.5s0 16.6 0 17.1c0 16.2-5.1 29.4-15.4 39.6s-24.2 16.2-41.9 17.9v28.4h-22.6v-28.7c-20.6-2.2-36.4-9.2-47.5-21.2-11-12-16.5-27.7-16.5-47.3v-15l47.8 15c0 10.8 2.4 19 7.2 24.6s11.6 8.4 20.4 8.4c6.4 0 11.5-1.9 15.2-5.8s5.5-9.1 5.5-15.8c0-7.5-1.8-13.3-5.5-17.6s-10.2-8.3-19.4-12.1c-9.3-3.8-17.8-7.6-25.7-11.5s-14.6-8.4-20.3-13.5-10-11-13.1-17.7c-3-6.7-4.5-14.8-4.5-24.4v-15.9s8.9-16.7 16.2-23.6c10.8-10.4 25.2-16.4 43.1-18.1v-29.8h22.6v30.5c17.3 2.6 30.9 9.7 40.8 21.4 6.8 8 14.8 29.5 14.8 29.5v15h-48c0-9.8-1.9-17.4-5.7-22.7s-9.2-7.9-16.2-7.9c-6.2-.1-11 1.9-14.5 5.8z" fill="#db6704"></path>
                            <path id="Top-2" d="m279.5 294.3c0-7.5-1.8-13.3-5.5-17.6s-10.2-8.3-19.4-12.1c-9.3-3.8-17.8-7.6-25.7-11.5s-14.6-8.4-20.3-13.5-10-11-13.1-17.7c-3-6.7-4.5-14.9-4.5-24.4 0-16 5.4-29.2 16.2-39.5s25.2-16.4 43.1-18.1v-29.9h22.6v30.5c17.3 2.6 30.9 9.7 40.8 21.4s14.8 26.5 14.8 44.5h-48c0-9.8-1.9-17.4-5.7-22.7s-9.2-7.9-16.2-7.9c-6.2 0-11.1 2-14.5 5.9s-5.2 9.3-5.2 16.2 2 12.6 6 16.7 10.4 8 19.1 11.8c8.8 3.7 17.1 7.6 24.9 11.6s14.5 8.6 20.2 13.7 10.1 11.1 13.3 17.9 4.8 15 4.8 24.5c0 16.2-5.1 29.4-15.4 39.6s-24.2 16.2-41.9 17.9v28.4h-22.6v-28.7c-20.6-2.2-36.4-9.2-47.5-21.2-11-12-16.5-27.7-16.5-47.3h47.8c0 10.8 2.4 19 7.2 24.6s11.6 8.4 20.4 8.4c6.4 0 11.5-1.9 15.2-5.8s5.6-9 5.6-15.7z" fill="#fdd835"></path>
                            <g id="Shade-2" fill="#fff">
                              <path d="m207.2 158c5.8-5.6 12.7-9.9 20.6-13l-33.9 34c2.6-8 7-14.9 13.3-21z" opacity=".5"></path>
                              <path d="m262.8 110-12.5 12.5v-12.5z" opacity=".5"></path>
                              <path d="m322.1 268.7-81.7 81.7c-17.2-2.9-30.7-9.7-40.4-20.2-6.3-6.9-10.8-15-13.5-24.3l23-23h21.8c0 10.8 2.4 19 7.2 24.6s11.6 8.4 20.4 8.4c6.4 0 11.5-1.9 15.2-5.8s5.5-9.1 5.5-15.8c0-7.5-1.8-13.3-5.5-17.6s-10.2-8.3-19.4-12.1c-6.6-2.7-12.8-5.4-18.7-8.2l29.6-29.6c8.3 3.6 16.1 7.2 23.5 11 7.8 4 14.5 8.6 20.2 13.7 5.4 5 9.7 10.7 12.8 17.2z" opacity=".5"></path>
                              <path d="m328.5 206.3h-42.5l34.5-34.5c5.3 9.8 8 21.3 8 34.5z" opacity=".5"></path>
                              <path d="m183.5 282.8h7.1l-6.8 6.8c-.2-2.2-.3-4.5-.3-6.8z" opacity=".5"></path>
                              <path d="m244.9 214.5c2 2.1 4.6 4.1 7.9 6.1l-29.6 29.6c-5.5-3.1-10.4-6.6-14.6-10.5-1.7-1.5-3.2-3.1-4.6-4.7l35.1-35.1c.3 6 2.3 10.9 5.8 14.6z" opacity=".5"></path>
                              <path d="m312.7 160.7-33.4 33.4c-.9-4.1-2.4-7.6-4.4-10.4-3-4.2-7-6.7-12-7.6l29.9-29.9c7.7 3.5 14.3 8.3 19.9 14.5z" opacity=".5"></path>
                              <path d="m258.4 380 11.6-11.6v11.6z" opacity=".5"></path>
                              <path d="m324.2 314.2c-2.5 7.4-6.6 13.8-12.2 19.4s-12.3 9.9-20.1 12.9z" opacity=".5"></path>
                              <path d="m414.5 140.1c-123 43.2-221.8 138.1-270.2 258.6-4.2-3.1-8.3-6.3-12.3-9.8-28.7-33.3-46-76.6-46-123.9 0-104.9 85.1-190 190-190 47.4 0 90.7 17.3 123.9 46 5.3 6.1 10.1 12.5 14.6 19.1z" opacity=".25"></path>
                            </g>
                          </g>
                        </g>
                      </g>
                      </svg>
                    <div className="min-w-0">
                      <p className="text-white font-bold text-lg md:text-xl truncate">{formatSaldo(saldo)}</p>
                      <p className="text-slate-400 text-[10px] md:text-xs uppercase">Saldo disponível</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={openWithdrawModal}
                    className="flex-1 h-9 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition-all"
                  >
                    Sacar
                  </button>
                  <button type="button" onClick={openDepositModal} className="flex-1 h-9 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-bold transition-all">
                    Depositar
                  </button>
                </div>
              </div>

              <div className="rounded-xl p-3 md:p-4 border border-slate-700/50" style={{ backgroundColor: walletCardBg }}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <svg enableBackground="new 0 0 36 36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9 md:w-10 md:h-10 shrink-0">
                      <g id="_x37_1">
                        <g>
                          <g>
                            <g>
                              <path d="m32.3 15.5-.2 2.8-.5 8.4c-.1 1.4-1 2.7-2.3 3.2-10.3 4-10 4-10.4 4.1-.5.1-1.1.1-1.7 0-.5-.1-.1 0-10.4-4.1-1.3-.5-2.2-1.8-2.3-3.2l-.5-8.4-.2-2.8 14.2 4.5z" fill="#f45170"></path>
                            </g>
                          </g>
                          <g>
                            <g>
                              <path d="m18.8 21.8v12.1c-.5.1-1.1.1-1.7 0v-12.1c.6.3 1.2.3 1.7 0z" fill="#fa5f7f"></path>
                            </g>
                          </g>
                          <g>
                            <g>
                              <path d="m3.7 15.5.2 2.8 13.3 5.7c.5.2 1.1.2 1.7 0l13.3-5.7.2-2.8-14.4 4.5z" fill="#cc104a"></path>
                            </g>
                          </g>
                          <g opacity=".5">
                            <g>
                              <path d="m17.2 21.8v2.1c.5.2 1.1.2 1.7 0v-2.1c-.6.3-1.2.3-1.7 0z" fill="#93073a"></path>
                            </g>
                          </g>
                          <g>
                            <g>
                              <path d="m33 16-14.1 6c-.2.1-.5.2-.8.2-.3 0-.5-.1-.8-.2l-14.3-6c-1-.4-1.2-3.3-.8-5.2.1-.4.2-.7.3-1 .2-.3.3-.5.5-.6h30c.2.1.3.2.4.4.2.3.3.7.4 1.1.4 2 .1 4.9-.8 5.3z" fill="#e93565"></path>
                            </g>
                          </g>
                          <g>
                            <g>
                              <path d="m33.8 10.8c-.2-.6-1.1-.3-1.1-.3l-13.2 5.6c-.4.2-.7.6-.7 1.1v4.8c-.2.1-.5.2-.8.2-.3 0-.5-.1-.8-.2v-4.9c0-.5-.3-.9-.7-1.1l-13.3-5.6c-.3-.1-.9-.2-1.1.3.1-.4.2-.7.3-1 .2-.2.4-.4.6-.5l14.1-6c.5-.2 1.1-.2 1.7 0l14.1 6c.2.1.3.2.4.4.3.3.4.7.5 1.2z" fill="#fa5f7f"></path>
                            </g>
                          </g>
                          <g>
                            <g>
                              <path d="m18.4 15.5 13.2-5.5c.2-.1.2-.4 0-.5l-13.2-5.4c-.3-.1-.6-.1-.9 0l-13.1 5.4c-.2.1-.2.4 0 .5l13.1 5.4c.3.2.7.2.9.1z" fill="#e93565"></path>
                            </g>
                          </g>
                          <g>
                            <g>
                              <g>
                                <path d="m25 13.7-1.2.5c-.2-.2-.4-.3-1-.6l1.4-.6c.3.3.6.5.8.7z" fill="#df3260"></path>
                              </g>
                            </g>
                            <g>
                              <g>
                                <path d="m12.2 14.3-1.2-.6c.2-.3.5-.5.8-.7l1.4.6c-.5.3-.8.5-1 .7z" fill="#df3260"></path>
                              </g>
                            </g>
                            <g>
                              <g>
                                <path d="m18 9.7c1.4.7 4.4 2.3 6.2 3.4l-1.4.6c-1.4-.8-3.3-1.7-4.8-2.3-1.8.8-3.4 1.5-4.8 2.3l-1.4-.6c1.6-1 4.5-2.6 6.2-3.4z" fill="#cc104a"></path>
                              </g>
                            </g>
                          </g>
                        </g>
                        <g>
                          <g>
                            <g>
                              <path d="m13.2 7.2c-2.2 1.2-4.3 2.3-6.2 3.4-1.1.7-1.8 1.9-1.7 3.2l1.2 15.7c.1.8.5 1.6 1.1 2 1.5 1.1 4 2.6 5.2 1.6l-1.3-.9-.3-18.8 6.8-3.8v-2.4z" fill="#ffd475"></path>
                            </g>
                          </g>
                          <g opacity=".5">
                            <g>
                              <path d="m11.8 16.1.1 15.4-.7-1.2c-.6-14.6-1-15.4-.2-16.6l1.2.5c-.4.5-.4 1.2-.4 1.9z" fill="#93073a"></path>
                            </g>
                          </g>
                          <g>
                            <g>
                              <path d="m10.1 15.5.7 16.6c0 .8.8 1.5 1.6 1.3.4-.1.8-.4 1.1-.8l-1.3-.6c-.2-.1-.3-.3-.3-.5l-.5-16.2c0-.8.4-1.7 1.1-2.1 1.7-1 3.4-1.8 5.4-2.7v-1.5c-1.9.9-4.4 2.3-6.2 3.4-1 .6-1.7 1.8-1.6 3.1z" fill="#f3a250"></path>
                            </g>
                          </g>
                          <g>
                            <g>
                              <path d="m22.8 7.2c2.2 1.1 4.3 2.3 6.2 3.4 1.1.7 1.8 1.9 1.7 3.2l-1.2 15.7c-.1.8-.5 1.6-1.1 2-1.5 1.1-4 2.6-5.2 1.6l1.3-.9.3-18.8-6.8-3.8v-2.4z" fill="#ffd475"></path>
                            </g>
                          </g>
                          <g opacity=".5">
                            <g>
                              <path d="m24.2 16.1-.1 15.5.8-1.3c.4-14.6.9-15.3.1-16.5l-1.2.5c.4.4.4 1.1.4 1.8z" fill="#93073a"></path>
                            </g>
                          </g>
                          <g>
                            <g>
                              <path d="m25.9 15.5-.7 16.6c0 .8-.8 1.5-1.6 1.3-.4-.1-.8-.4-1.1-.8l1.3-.5c.2-.1.3-.2.3-.4l.5-16.2c0-.8-.4-1.7-1.1-2.1-.5-.3-1.1-.6-1.6-.9-1.1-.6-2.3-1.1-3.4-1.6-.2-.1-.3-.1-.4-.2v-1.7c.5.3 1 .5 1.5.8 1.6.8 3 1.6 4.7 2.6.1.1.2.2.3.2.8.7 1.4 1.8 1.3 2.9z" fill="#f3a250"></path>
                            </g>
                          </g>
                        </g>
                        <g>
                          <g>
                            <g>
                              <path d="m16.4 7.7c0 .1-.1.3-.1.4-.5 1.5-1.2 2.3-2.8 1.9-1-.3-5 .6-5.3.5-.9-.4-1.2-1.4-1.1-2.5 0-1.4.6-3 1.1-4 .5-1 1.3-1.8 2.2-2h.4c1.4 0 3.8 2.3 4.6 3.3s.1.1.1.1c.5.6.8 1.2.9 1.7z" fill="#ffd475"></path>
                            </g>
                          </g>
                          <g>
                            <g>
                              <path d="m16.4 7.7c0 .1-.1.3-.1.4-.2-.6-.8-1.5-1-1.7-.9-1.1-3.2-3.3-4.6-3.3-2 0-3.3 2.9-3.6 4.9 0-1.4.6-3 1.1-4 .4-.9 1.4-1.8 2.2-2h.4c1.4 0 3.8 2.3 4.6 3.3s.1.1.1.1c.6.8 1 1.6.8 2.2-.2.7-.4 1.4-.9 1.8.1.2.2.4.2.6.2-.1.5-.3.8-.4.6-.2 1.1-.5 1.6-.7.8.4 1.5.8 2.3 1.2 0-.2.1-.4.2-.6-.4-.5-.7-1.1-.9-1.8-.2-.6.2-1.4.9-2.2 0 0 0-.1.1-.1.2 0 .3.2.4.5 0 .2.5 2.9.5 3z" fill="#ffde9b"></path>
                            </g>
                          </g>
                          <g opacity=".5">
                            <g>
                              <path d="m17.5 10.8c-.3.1-.7.3-1 .4-1.2-.1-1.4-.1-1.7-.3.1 0 .2-.1.2-.2.4-.4.2-.8-.1-1.2h1.3l.2.2z" fill="#dd8536"></path>
                            </g>
                          </g>
                          <g>
                            <g>
                              <path d="m7.1 8.9c0 .6 0 2.5 2.2 2.8.8.1 2.4.1 3.3.1 1.3-.1 3.2-.3 3.2-1.6 0-.2-.1-.5-.2-.7-.2-.4-.9-1-1-1-1.6-1.2-4.1-2.2-5.2-2.3-1.4 0-2.3 1.3-2.3 2.7z" fill="#ffb961"></path>
                            </g>
                          </g>
                          <g>
                            <g>
                              <path d="m11.6 11.4c8.6 0 .1-4.7-2.2-4.8-1.1 0-1.9 1-1.9 2.3 0 2.6 1.5 2.5 4.1 2.5z" fill="#f3a250"></path>
                            </g>
                          </g>
                          <g>
                            <g>
                              <path d="m15.3 10.4c0 .1-.1.2-.1.2s.1-.1.1-.2z" fill="#f3a250"></path>
                            </g>
                          </g>
                          <g>
                            <g>
                              <path d="m15.1 10.8c.1 0 .1-.1 0 0 .1-.1 0 0 0 0z" fill="#f3a250"></path>
                            </g>
                          </g>
                          <g>
                            <g>
                              <path d="m7.5 8.9c0 .5.1 1.2.4 1.6.1-1.1.9-2.1 1.9-2.1s3.6 1 5.2 2.4 0 0 .1-.1c1.3-1.3-3.9-4-5.8-4.1-1 .1-1.8 1-1.8 2.3z" fill="#dd8536"></path>
                            </g>
                          </g>
                          <g>
                            <g>
                              <g>
                                <path d="m19.6 7.7c.4 1.6 1.2 2.8 2.9 2.2 1-.3 5 .6 5.3.5.7-.3 1-1 1.1-1.8.2-2.2-1.4-7.2-4.3-6.5-1 .3-2.9 1.8-4.1 3.3s-.1.1-.1.1c-.6.8-1 1.6-.8 2.2z" fill="#ffd475"></path>
                              </g>
                            </g>
                            <g>
                              <g>
                                <path d="m28.9 8c-.4-2.3-1.9-5.4-4.2-4.9-1.5.5-4.6 3.3-5 4.9-.2-.6-.4-1.2.7-2.6 0 0 .1-.1.1-.1 1.2-1.5 3.1-2.9 4.1-3.3 2.8-.6 4.3 4 4.3 6z" fill="#ffde9b"></path>
                              </g>
                            </g>
                            <g opacity=".5">
                              <g>
                                <path d="m29.3 10.8c-.8 1.7-2.7 1.8-4.7 1.8-.5 0-.9 0-1.4 0-.8 0-1.1-.1-1.4-.2-1.1-.6-2.3-1.1-3.4-1.6l1-1.1.2-.2h7.4c.7.4 2 1.1 2.3 1.3z" fill="#dd8536"></path>
                              </g>
                            </g>
                            <g>
                              <g>
                                <path d="m20.2 10.3c0 1.3 1.9 1.5 3.2 1.6 3.3.1 5.5.2 5.5-2.9 0-1.4-.9-2.7-2.3-2.7-1.7 0-6.4 2.2-6.4 4z" fill="#ffb961"></path>
                              </g>
                            </g>
                            <g>
                              <g>
                                <path d="m24.4 11.4c-8.6 0 0-4.7 2.2-4.8 1.1 0 1.9 1 1.9 2.3 0 2.6-1.6 2.5-4.1 2.5z" fill="#f3a250"></path>
                              </g>
                            </g>
                            <g>
                              <g>
                                <path d="m28.5 8.9c0 .5-.1 1.1-.4 1.6-.1-1.2-.9-2.1-1.9-2.1s-3.6 1-5.2 2.4 0 0-.1-.1c-1.3-1.3 3.9-4 5.8-4.1 1 .1 1.8 1 1.8 2.3z" fill="#dd8536"></path>
                              </g>
                            </g>
                            <g opacity=".1">
                              <g fill="#111d33">
                                <path d=""></path>
                                <path d="m21.5 9s0 .1 0 0c-.3.2-.7.7-.8 1.1 0 .2 0 .4.2.6 0 0 0 .1.1.1.1.1.1.1.2.2-.2.2-.5.2-1.7.3-.5-.3-1-.5-1.5-.7-.2.1-.3.1-.4.2-.3.1-.7.3-1 .4-1.2-.1-1.4-.1-1.7-.3.4-.2.7-.7.1-1.4-.2-.2-.3-.4-.5-.5 0-.2.5-2.9.5-3 .1-.3.2-.5.4-.6s.1.1.1.1c.6.8 1 1.6.8 2.2-.2.7-.4 1.4-.9 1.8.1.2.2.4.2.6.2-.1.5-.3.8-.4.6-.2 1.1-.5 1.6-.7.8.4 1.5.8 2.3 1.2 0-.2.1-.4.2-.6-.4-.5-.7-1.1-.9-1.8-.2-.6.2-1.4.9-2.2 0 0 0-.1.1-.1.2 0 .3.2.4.5 0 .2.5 2.9.5 3z"></path>
                              </g>
                            </g>
                          </g>
                          <g>
                            <g>
                              <path d="m14.8 9.9c-.1.4.2.7.5.7 2.3.3 2.9.3 5.3 0 .4 0 .6-.4.5-.7l-.5-2.4c0-.3-.3-.4-.6-.4-1.3.3-3 .3-4.3 0-.3-.1-.5.1-.6.4z" fill="#ffb961"></path>
                            </g>
                          </g>
                          <g>
                            <g>
                              <path d="m15.1 8.3c-.1.3.2.7.5.7 2 .3 2.8.3 4.8 0 .3 0 .6-.3.5-.7l-.4-2.2c0-.2-.3-.4-.5-.3-1.1.3-2.8.3-3.9 0-.2-.1-.5.1-.5.3z" fill="#ffd475"></path>
                            </g>
                          </g>
                        </g>
                      </g>
                      </svg>
                    <div className="min-w-0">
                      <p className="text-white font-bold text-lg md:text-xl">B$ 0,00</p>
                      <p className="text-slate-400 text-[10px] md:text-xs uppercase">Bônus disponível</p>
                    </div>
                  </div>
                </div>
                <div>
                  <button type="button" disabled className="w-full h-9 rounded-lg bg-slate-600 text-slate-400 text-xs font-bold transition-all cursor-not-allowed opacity-50">
                    Converter
                  </button>
                </div>
              </div>

              <div className="rounded-xl p-3 md:p-4 border border-slate-700/50 sm:col-span-2 lg:col-span-1" style={{ backgroundColor: walletCardBg }}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <svg enableBackground="new 0 0 512 512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" className="w-9 h-9 md:w-10 md:h-10 shrink-0">
                      <path d="m509.256 191.272c-1.907-2.048-4.655-3.104-7.453-3.104h-30.712c-12.402-51.322-41.402-97.831-82.36-131.752-43.899-36.353-99.51-56.386-156.604-56.416-.94 0-1.889.201-2.69.694-2.161 1.331-2.936 3.881-2.119 6.061l27.416 73.167c.731 1.953 2.597 3.246 4.682 3.246 64.833 0 121.64 43.53 139.152 105h-26.37c-2.799 0-5.546 1.056-7.453 3.104-3.594 3.86-3.576 9.518-.427 13.297l65 78c1.9 2.28 4.715 3.599 7.683 3.599s5.782-1.318 7.683-3.599l65-78c3.148-3.779 3.165-9.437-.428-13.297z" fill="#507be9"></path>
                      <circle cx="227" cy="125" fill="#ffee78" r="110"></circle>
                      <path d="m337 125c0-60.751-49.249-110-110-110v220c60.751 0 110-49.249 110-110z" fill="#fcd232"></path>
                      <path d="m227 250c-68.925 0-125-56.075-125-125s56.075-125 125-125 125 56.075 125 125-56.075 125-125 125zm0-220c-52.383 0-95 42.617-95 95s42.617 95 95 95 95-42.617 95-95-42.617-95-95-95z" fill="#fcd232"></path>
                      <path d="m322 125c0 52.383-42.617 95-95 95v30c68.925 0 125-56.075 125-125s-56.075-125-125-125v30c52.383 0 95 42.617 95 95z" fill="#f7b90f"></path>
                      <path d="m267 150c0-22.056-17.944-40-40-40-5.514 0-10-4.486-10-10s4.486-10 10-10c4.736 0 8.856 3.358 9.796 7.985 1.648 8.118 9.571 13.363 17.686 11.715 8.118-1.649 13.363-9.567 11.715-17.686-2.721-13.396-12.075-24.136-24.197-29.072v-2.942c0-8.284-6.716-15-15-15s-15 6.716-15 15v2.929c-14.643 5.947-25 20.318-25 37.071 0 22.056 17.944 40 40 40 5.514 0 10 4.486 10 10s-4.486 10-10 10c-4.736 0-8.856-3.358-9.796-7.985-1.648-8.118-9.565-13.361-17.686-11.715-8.119 1.649-13.363 9.567-11.715 17.686 2.721 13.396 12.075 24.137 24.196 29.073v2.941c0 8.284 6.716 15 15 15s15-6.716 15-15v-2.929c14.644-5.947 25.001-20.319 25.001-37.071z" fill="#fcd232"></path>
                      <path d="m227 110v30c5.514 0 10 4.486 10 10s-4.486 10-10 10v45c8.284 0 15-6.716 15-15v-2.929c14.643-5.947 25-20.318 25-37.071 0-22.056-17.944-40-40-40z" fill="#f7b90f"></path>
                      <path d="m236.796 97.985c1.648 8.118 9.571 13.363 17.686 11.715 8.118-1.649 13.363-9.567 11.715-17.686-2.721-13.396-12.075-24.136-24.197-29.072v-2.942c0-8.284-6.716-15-15-15v45c4.736 0 8.856 3.358 9.796 7.985z" fill="#f7b90f"></path>
                      <path d="m505.667 350.946c-11.087-15.834-32.911-19.682-48.745-8.595l-107.294 75.128c-4.203 2.943-9.209 4.521-14.339 4.521h-79.289v70h85.594c15.392 0 30.41-4.735 43.018-13.564l112.459-78.745c15.835-11.087 19.684-32.911 8.596-48.745z" fill="#fabe8c"></path>
                      <path d="m349.628 417.479c-4.203 2.943-9.209 4.521-14.339 4.521l-79.289-6.148v36.148h81c35.841 0 65-29.159 65-65 0-2.021-.106-4.017-.287-5.991z" fill="#e6a578"></path>
                      <path d="m505.667 350.946c-11.087-15.834-32.911-19.682-48.745-8.595l-90.237 63.185c3.364-5.377 5.315-11.727 5.315-18.536 0-19.33-15.67-35-35-35h-85l-9.784-7.338c-19.485-14.614-43.629-22.662-67.986-22.662-20.533 0-40.691 5.583-58.297 16.147 0 0-16.681 10.009-26.652 15.991-4.518 2.711-7.281 7.593-7.281 12.862v110c0 8.284 6.716 15 15 15h244.594c15.392 0 30.41-4.735 43.018-13.564l112.459-78.745c15.835-11.087 19.684-32.911 8.596-48.745z" fill="#ffd2aa"></path>
                      <path d="m256 492h85.594c15.392 0 30.41-4.735 43.018-13.564l112.459-78.745c15.834-11.087 19.682-32.911 8.595-48.745-11.087-15.834-32.911-19.682-48.745-8.595l-90.237 63.185c3.365-5.377 5.316-11.727 5.316-18.536 0-19.33-15.67-35-35-35h-81z" fill="#fabe8c"></path>
                      <path d="m401.713 381.009-35.028 24.527c-.217.347-.434.695-.663 1.033-6.289 9.31-16.941 15.431-29.022 15.431h-105c-8.284 0-15 6.716-15 15 0 8.284 6.716 15 15 15h105c35.841 0 65-29.159 65-65 0-2.021-.106-4.017-.287-5.991z" fill="#fabe8c"></path>
                      <path d="m97 512h-82c-8.284 0-15-6.716-15-15v-170c0-8.284 6.716-15 15-15h82c8.284 0 15 6.716 15 15v170c0 8.284-6.716 15-15 15z" fill="#6496f7"></path>
                      <path d="m401.713 381.009-35.028 24.527c-.217.347-.434.695-.663 1.033-6.289 9.31-16.941 15.431-29.022 15.431h-81v30h81c35.841 0 65-29.159 65-65 0-2.021-.106-4.017-.287-5.991z" fill="#e6a578"></path>
                      </svg>
                    <div className="min-w-0">
                      <p className="text-white font-bold text-lg md:text-xl">R$ 0,00</p>
                      <p className="text-slate-400 text-[10px] md:text-xs uppercase">
                        Cashback ({vipProfile.cashback_pct}% VIP)
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <button type="button" disabled className="w-full h-9 rounded-lg bg-slate-600 text-slate-400 text-xs font-bold transition-all cursor-not-allowed opacity-50">
                    Converter
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-xl overflow-hidden border border-slate-700/50">
              <div className="p-3 md:p-4 border-b border-slate-700/50">
                <h2 className="text-white font-bold text-base md:text-lg">Histórico de transações</h2>
              </div>

              <div className="border-b border-slate-700/50">
                <div className="flex gap-2 px-3 md:px-4 py-2.5 md:py-3 overflow-x-auto scrollbar-hide flex-nowrap">
                  <button
                    type="button"
                    onClick={() => setActiveTab('transacoes')}
                    className="shrink-0 whitespace-nowrap px-3 md:px-4 h-8 rounded-lg text-xs font-bold transition-all"
                    style={{ backgroundColor: 'var(--brand-primary)', color: '#ffffff', opacity: activeTab === 'transacoes' ? 1 : 0.5 }}
                  >
                    Transações
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('depositos')}
                    className="shrink-0 whitespace-nowrap px-3 md:px-4 h-8 rounded-lg text-xs font-bold transition-all"
                    style={{ backgroundColor: 'var(--brand-primary)', color: '#ffffff', opacity: activeTab === 'depositos' ? 1 : 0.5 }}
                  >
                    Depósitos
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('saques')}
                    className="shrink-0 whitespace-nowrap px-3 md:px-4 h-8 rounded-lg text-xs font-bold transition-all"
                    style={{ backgroundColor: 'var(--brand-primary)', color: '#ffffff', opacity: activeTab === 'saques' ? 1 : 0.5 }}
                  >
                    Saques
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('cupons')}
                    className="shrink-0 whitespace-nowrap px-3 md:px-4 h-8 rounded-lg text-xs font-bold transition-all"
                    style={{ backgroundColor: 'var(--brand-primary)', color: '#ffffff', opacity: activeTab === 'cupons' ? 1 : 0.5 }}
                  >
                    Cupons
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('bonus')}
                    className="shrink-0 whitespace-nowrap px-3 md:px-4 h-8 rounded-lg text-xs font-bold transition-all"
                    style={{ backgroundColor: 'var(--brand-primary)', color: '#ffffff', opacity: activeTab === 'bonus' ? 1 : 0.5 }}
                  >
                    Bônus
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('rodadas')}
                    className="shrink-0 whitespace-nowrap px-3 md:px-4 h-8 rounded-lg text-xs font-bold transition-all"
                    style={{ backgroundColor: 'var(--brand-primary)', color: '#ffffff', opacity: activeTab === 'rodadas' ? 1 : 0.5 }}
                  >
                    Rodadas Grátis
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                {activeTab === 'bonus' ? (
                  <div className="py-12 md:py-20 px-3">
                    <p className="text-slate-400 text-xs md:text-sm text-center">Nenhum registro encontrado</p>
                  </div>
                ) : (activeTab === 'transacoes' && loadingTransacoes) ? (
                  <LoadingScreen variant="inline" className="py-12 md:py-20" />
                ) : (activeTab === 'transacoes' && transactionsFormatted.length === 0) ? (
                  <div className="py-12 md:py-20 px-3">
                    <p className="text-slate-400 text-xs md:text-sm text-center">Nenhuma transação encontrada</p>
                  </div>
                ) : (activeTab === 'saques' && loadingSaques) ? (
                  <LoadingScreen variant="inline" className="py-12 md:py-20" />
                ) : (activeTab === 'saques' && saques.length === 0) ? (
                  <div className="py-12 md:py-20 px-3">
                    <p className="text-slate-400 text-xs md:text-sm text-center">Nenhum saque encontrado</p>
                  </div>
                ) : (activeTab === 'cupons' && loadingCupons) ? (
                  <LoadingScreen variant="inline" className="py-12 md:py-20" />
                ) : (activeTab === 'cupons' && currentData.length === 0) ? (
                  <div className="py-12 md:py-20 px-3">
                    <p className="text-slate-400 text-xs md:text-sm text-center">Nenhum cupom encontrado</p>
                  </div>
                ) : (activeTab === 'rodadas' && loadingFreeBonuses) ? (
                  <LoadingScreen variant="inline" className="py-12 md:py-20" />
                ) : (activeTab === 'rodadas' && rodadasFormatted.length === 0) ? (
                  <div className="py-12 md:py-20 px-3">
                    <p className="text-slate-400 text-xs md:text-sm text-center">Nenhuma rodada grátis encontrada</p>
                  </div>
                ) : (
                  <>
                  <div className="space-y-2 p-1 md:hidden">
                    {currentTransactions.map((item: Record<string, unknown>, index: number) => (
                      <WalletTransactionMobileCard
                        key={`${String(item.id ?? index)}-${index}`}
                        activeTab={activeTab}
                        item={item}
                        backgroundColor={index % 2 === 0 ? homeConfig.fundo : walletRowAltBg}
                        playingRodadaId={playingRodadaId}
                        onPlayRodada={handleJogarRodadas}
                      />
                    ))}
                  </div>
                  <table className="hidden md:table w-full">
                    <thead>
                      <tr className="border-b border-slate-700/50 bg-slate-800/30">
                        {activeTab === 'transacoes' ? (
                          <>
                            <th className="px-2 py-2 md:px-4 md:py-3 text-left text-[10px] md:text-xs font-bold text-slate-400 uppercase whitespace-nowrap">Identificador</th>
                            <th className="px-2 py-2 md:px-4 md:py-3 text-left text-[10px] md:text-xs font-bold text-slate-400 uppercase whitespace-nowrap">Jogo</th>
                            <th className="px-2 py-2 md:px-4 md:py-3 text-left text-[10px] md:text-xs font-bold text-slate-400 uppercase whitespace-nowrap">Aposta</th>
                            <th className="px-2 py-2 md:px-4 md:py-3 text-left text-[10px] md:text-xs font-bold text-slate-400 uppercase whitespace-nowrap">Retorno</th>
                            <th className="px-2 py-2 md:px-4 md:py-3 text-left text-[10px] md:text-xs font-bold text-slate-400 uppercase whitespace-nowrap">Status</th>
                            <th className="px-2 py-2 md:px-4 md:py-3 text-left text-[10px] md:text-xs font-bold text-slate-400 uppercase whitespace-nowrap">Bônus</th>
                            <th className="px-2 py-2 md:px-4 md:py-3 text-left text-[10px] md:text-xs font-bold text-slate-400 uppercase whitespace-nowrap">Data</th>
                          </>
                        ) : activeTab === 'cupons' ? (
                          <>
                            <th className="px-2 py-2 md:px-4 md:py-3 text-left text-[10px] md:text-xs font-bold text-slate-400 uppercase whitespace-nowrap">Identificador</th>
                            <th className="px-2 py-2 md:px-4 md:py-3 text-left text-[10px] md:text-xs font-bold text-slate-400 uppercase whitespace-nowrap">Cupom</th>
                            <th className="px-2 py-2 md:px-4 md:py-3 text-left text-[10px] md:text-xs font-bold text-slate-400 uppercase whitespace-nowrap">Valor</th>
                            <th className="px-2 py-2 md:px-4 md:py-3 text-left text-[10px] md:text-xs font-bold text-slate-400 uppercase whitespace-nowrap">Status</th>
                            <th className="px-2 py-2 md:px-4 md:py-3 text-left text-[10px] md:text-xs font-bold text-slate-400 uppercase whitespace-nowrap">Bônus</th>
                            <th className="px-2 py-2 md:px-4 md:py-3 text-left text-[10px] md:text-xs font-bold text-slate-400 uppercase whitespace-nowrap">Data</th>
                          </>
                        ) : activeTab === 'rodadas' ? (
                          <>
                            <th className="px-2 py-2 md:px-4 md:py-3 text-left text-[10px] md:text-xs font-bold text-slate-400 uppercase whitespace-nowrap">Identificador</th>
                            <th className="px-2 py-2 md:px-4 md:py-3 text-left text-[10px] md:text-xs font-bold text-slate-400 uppercase whitespace-nowrap">Jogo</th>
                            <th className="px-2 py-2 md:px-4 md:py-3 text-left text-[10px] md:text-xs font-bold text-slate-400 uppercase whitespace-nowrap">Restantes</th>
                            <th className="px-2 py-2 md:px-4 md:py-3 text-left text-[10px] md:text-xs font-bold text-slate-400 uppercase whitespace-nowrap">Total</th>
                            <th className="px-2 py-2 md:px-4 md:py-3 text-left text-[10px] md:text-xs font-bold text-slate-400 uppercase whitespace-nowrap">Status</th>
                            <th className="px-2 py-2 md:px-4 md:py-3 text-left text-[10px] md:text-xs font-bold text-slate-400 uppercase whitespace-nowrap">Data</th>
                            <th className="px-2 py-2 md:px-4 md:py-3 text-left text-[10px] md:text-xs font-bold text-slate-400 uppercase whitespace-nowrap">Ação</th>
                          </>
                        ) : (
                          <>
                            <th className="px-2 py-2 md:px-4 md:py-3 text-left text-[10px] md:text-xs font-bold text-slate-400 uppercase whitespace-nowrap">Identificador</th>
                            <th className="px-2 py-2 md:px-4 md:py-3 text-left text-[10px] md:text-xs font-bold text-slate-400 uppercase whitespace-nowrap">Valor</th>
                            <th className="px-2 py-2 md:px-4 md:py-3 text-left text-[10px] md:text-xs font-bold text-slate-400 uppercase whitespace-nowrap">Status</th>
                            <th className="px-2 py-2 md:px-4 md:py-3 text-left text-[10px] md:text-xs font-bold text-slate-400 uppercase whitespace-nowrap">Data</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {currentTransactions.map((item: any, index) => (
                        <tr key={index} className="border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors">
                          {activeTab === 'transacoes' ? (
                            <>
                              <td className="px-2 py-2 md:px-4 md:py-3 text-xs md:text-sm text-slate-300 font-mono max-w-[76px] md:max-w-none truncate align-middle" title={String(item.id)}>{item.id}</td>
                              <td className="px-2 py-2 md:px-4 md:py-3 text-xs md:text-sm text-white max-w-[110px] md:max-w-none truncate align-middle" title={item.jogo}>{item.jogo}</td>
                              <td className="px-2 py-2 md:px-4 md:py-3 text-xs md:text-sm text-white whitespace-nowrap align-middle">{item.aposta}</td>
                              <td className="px-2 py-2 md:px-4 md:py-3 text-xs md:text-sm text-white whitespace-nowrap align-middle">{item.retorno}</td>
                              <td className="px-2 py-2 md:px-4 md:py-3 align-middle">
                                <span className="inline-flex items-center px-2 py-0.5 md:px-3 md:py-1 rounded-full bg-brand/20 text-brand-light text-[10px] md:text-xs font-bold">
                                  {item.status}
                                </span>
                              </td>
                              <td className="px-2 py-2 md:px-4 md:py-3 text-xs md:text-sm text-slate-400 align-middle">{item.bonus}</td>
                              <td className="px-2 py-2 md:px-4 md:py-3 text-[10px] md:text-sm text-slate-400 whitespace-nowrap align-middle">{item.data}</td>
                            </>
                          ) : activeTab === 'saques' ? (
                            <>
                              <td className="px-2 py-2 md:px-4 md:py-3 text-xs md:text-sm text-slate-300 font-mono max-w-[76px] md:max-w-none truncate align-middle" title={String(item.id)}>{item.id}</td>
                              <td className="px-2 py-2 md:px-4 md:py-3 text-xs md:text-sm text-white whitespace-nowrap align-middle">{item.valor}</td>
                              <td className="px-2 py-2 md:px-4 md:py-3 align-middle">
                                <span className={`inline-flex items-center px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-bold ${
                                  item.status === 'Aprovado'
                                    ? 'bg-brand/20 text-brand-light'
                                    : item.status === 'Rejeitado'
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                  {item.status}
                                </span>
                              </td>
                              <td className="px-2 py-2 md:px-4 md:py-3 text-[10px] md:text-sm text-slate-400 whitespace-nowrap align-middle">{item.data}</td>
                            </>
                          ) : activeTab === 'cupons' ? (
                            <>
                              <td className="px-2 py-2 md:px-4 md:py-3 text-xs md:text-sm text-slate-300 font-mono max-w-[76px] md:max-w-none truncate align-middle" title={String(item.id)}>{item.id}</td>
                              <td className="px-2 py-2 md:px-4 md:py-3 text-xs md:text-sm text-white max-w-[100px] md:max-w-none truncate align-middle" title={item.cupom}>{item.cupom}</td>
                              <td className="px-2 py-2 md:px-4 md:py-3 text-xs md:text-sm text-white whitespace-nowrap align-middle">{item.valor}</td>
                              <td className="px-2 py-2 md:px-4 md:py-3 align-middle">
                                <span className="inline-flex items-center px-2 py-0.5 md:px-3 md:py-1 rounded-full bg-brand/20 text-brand-light text-[10px] md:text-xs font-bold">
                                  {item.status}
                                </span>
                              </td>
                              <td className="px-2 py-2 md:px-4 md:py-3 text-xs md:text-sm text-slate-400 align-middle">{item.bonus}</td>
                              <td className="px-2 py-2 md:px-4 md:py-3 text-[10px] md:text-sm text-slate-400 whitespace-nowrap align-middle">{item.data}</td>
                            </>
                          ) : activeTab === 'rodadas' ? (
                            <>
                              <td className="px-2 py-2 md:px-4 md:py-3 text-xs md:text-sm text-slate-300 font-mono max-w-[76px] md:max-w-none truncate align-middle" title={String(item.id)}>{item.id}</td>
                              <td className="px-2 py-2 md:px-4 md:py-3 text-xs md:text-sm text-white max-w-[120px] md:max-w-none truncate align-middle" title={item.jogo}>{item.jogo}</td>
                              <td className="px-2 py-2 md:px-4 md:py-3 text-xs md:text-sm text-white whitespace-nowrap align-middle">{item.restantes}</td>
                              <td className="px-2 py-2 md:px-4 md:py-3 text-xs md:text-sm text-slate-300 whitespace-nowrap align-middle">{item.total}</td>
                              <td className="px-2 py-2 md:px-4 md:py-3 align-middle">
                                <span className={`inline-flex items-center px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-bold ${getFreeBonusStatusClass(item.statusApi)}`}>
                                  {item.status}
                                </span>
                              </td>
                              <td className="px-2 py-2 md:px-4 md:py-3 text-[10px] md:text-sm text-slate-400 whitespace-nowrap align-middle">{item.data}</td>
                              <td className="px-2 py-2 md:px-4 md:py-3 align-middle">
                                {item.statusApi.toLowerCase() === 'pending' ? (
                                  <button
                                    type="button"
                                    onClick={() => void handleJogarRodadas(item.raw)}
                                    disabled={playingRodadaId === item.id}
                                    className="h-7 rounded-lg bg-brand hover:bg-brand-hover disabled:opacity-60 disabled:cursor-not-allowed px-2.5 text-[10px] md:text-xs font-bold text-white transition-all"
                                  >
                                    {playingRodadaId === item.id ? 'Abrindo...' : 'Jogar'}
                                  </button>
                                ) : (
                                  <span className="text-[10px] md:text-xs text-slate-500">—</span>
                                )}
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-2 py-2 md:px-4 md:py-3 text-xs md:text-sm text-slate-300 font-mono max-w-[76px] md:max-w-none truncate align-middle" title={String(item.id)}>{item.id}</td>
                              <td className="px-2 py-2 md:px-4 md:py-3 text-xs md:text-sm text-white whitespace-nowrap align-middle">{item.valor}</td>
                              <td className="px-2 py-2 md:px-4 md:py-3 align-middle">
                                <span className={`inline-flex items-center px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-xs font-bold ${
                                  item.status === 'Aprovado'
                                    ? 'bg-brand/20 text-brand-light'
                                    : 'bg-red-500/20 text-red-400'
                                }`}>
                                  {item.status}
                                </span>
                              </td>
                              <td className="px-2 py-2 md:px-4 md:py-3 text-[10px] md:text-sm text-slate-400 whitespace-nowrap align-middle">{item.data}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </>
                )}
              </div>

              {activeTab !== 'bonus' && (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-3 md:px-4 py-3 md:py-4 border-t border-slate-700/50">
                  <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setCurrentPage(1)}
                      className={`w-8 h-8 rounded font-semibold text-sm flex items-center justify-center transition-all ${
                        currentPage === 1
                          ? 'bg-brand hover:bg-brand-hover text-white'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      1
                    </button>
                    {activeTab !== 'saques' && activeTab !== 'cupons' && activeTab !== 'rodadas' && (
                      <>
                        <button
                          type="button"
                          onClick={() => setCurrentPage(2)}
                          className={`w-8 h-8 rounded font-semibold text-sm flex items-center justify-center transition-all ${
                            currentPage === 2
                              ? 'bg-brand hover:bg-brand-hover text-white'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          }`}
                        >
                          2
                        </button>
                        <span className="text-slate-400 text-sm">...</span>
                        <button
                          type="button"
                          onClick={() => setCurrentPage(Math.min(currentPage + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={currentPage === totalPages}
                          className="w-8 h-8 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="13 17 18 12 13 7" />
                            <polyline points="6 17 11 12 6 7" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-400 text-center sm:text-left">
                    Exibindo {startIndex + 1} a {Math.min(endIndex, currentData.length)} de {currentData.length} {currentData.length === 1 ? 'registro' : 'registros'}
                  </p>
                </div>
              )}
            </div>

            <div className="max-md:min-h-[6vh] md:min-h-[20vh]" />
        </div>

        <Footer containerClassName="w-full" />
      </div>
    </AppPageScaffold>

      <DepositModal 
        isOpen={isDepositModalOpen} 
        onClose={() => {
          setIsDepositModalOpen(false);
          fetchSaldo();
          void fetchCupons();
          void fetchFreeBonuses();
        }} 
      />
      <WithdrawModal 
        isOpen={isWithdrawModalOpen} 
        onClose={() => {
          setIsWithdrawModalOpen(false);
          // Recarregar saldo e saques após fechar o modal de saque
          fetchSaldo();
          fetchSaques();
        }} 
      />
    </>
  );
}
