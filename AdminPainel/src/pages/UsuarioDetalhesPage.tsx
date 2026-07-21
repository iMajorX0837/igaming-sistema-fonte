import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import {
  ArrowLeft,
  ArrowDownCircle,
  ArrowUpCircle,
  Ban,
  BarChart3,
  Calendar,
  CheckCircle,
  CheckCircle2,
  Clock,
  Copy,
  Crown,
  Eye,
  Fingerprint,
  Globe,
  Hash,
  Loader2,
  Lock,
  LogIn,
  Mail,
  Minus,
  Monitor,
  Phone,
  Plus,
  Receipt,
  RefreshCw,
  Save,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trophy,
  User,
  UserPlus,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/jogos/Pagination';
import LoadingState from '../components/ui/LoadingState';
import PagePanel from '../components/ui/PagePanel';
import Modal from '../components/ui/Modal';
import FormField from '../components/ui/FormField';

interface UsuarioDetalhe {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  telefone: string;
  data_nascimento: string | null;
  pais: string;
  kyc_status: string;
  verificado: boolean;
  ativo: boolean;
  cargo: string;
  saldo: number;
  vip_nivel: number;
  total_depositado: number;
  created_at: string;
  ultimo_login: string | null;
  sessoes: number;
}

interface Resumo {
  total_depositos: number;
  valor_depositos: number;
  total_saques: number;
  valor_saques: number;
  total_apostas: number;
}

interface Estatisticas {
  total_depositado: number;
  total_retirado: number;
  total_apostado: number;
  total_ganho: number;
  media_deposito: number;
  media_saque: number;
  media_aposta: number;
}

interface Sessao {
  id: string;
  created_at: string;
  updated_at: string;
  user_agent: string | null;
  ip: string | null;
}

interface Deposito {
  id: string;
  valor: number;
  status: string;
  data_hora: string;
}

interface Saque {
  id: string;
  valor: number;
  status: string;
  data_hora: string;
}

interface Aposta {
  id: string;
  jogo: string;
  valor: number;
  retorno: number;
  tipo: string;
  status: string;
  com_bonus: string;
  data: string;
}

interface RolloverInfo {
  ativo: boolean;
  rollover_pendente: number;
  rollover_meta: number;
  rollover_apostado: number;
  progresso: number;
  data_inicio: string | null;
  saques_bloqueados: boolean;
}

type TabKey = 'saldo' | 'transacoes' | 'verificacoes' | 'indicacao' | 'perfil';

interface IndicacaoUsuario {
  link_indicacao: string | null;
  recompensa_custom: number | null;
  deposito_minimo_custom: number | null;
  usa_padrao_plataforma: boolean;
  global_recompensa: number;
  global_deposito_minimo: number;
  recompensa_efetiva: number;
  deposito_minimo_efetivo: number;
  total_indicados: number;
  indicados_qualificados: number;
  ganhos_totais: number;
}
type TransTipo = 'depositos' | 'saques' | 'apostas';

const TRANS_ITEMS_PER_PAGE = 10;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const toNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeEstatisticas = (
  raw: unknown,
  usuario?: UsuarioDetalhe | null,
  resumo?: Resumo | null,
): Estatisticas => {
  const data = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

  let total_depositado = toNumber(data.total_depositado);
  let total_retirado = toNumber(data.total_retirado);
  let total_apostado = toNumber(data.total_apostado);
  let total_ganho = toNumber(data.total_ganho);
  let media_deposito = toNumber(data.media_deposito);
  let media_saque = toNumber(data.media_saque);
  let media_aposta = toNumber(data.media_aposta);

  if (total_depositado <= 0 && usuario?.total_depositado) {
    total_depositado = toNumber(usuario.total_depositado);
  }
  if (total_depositado <= 0 && resumo?.valor_depositos) {
    total_depositado = toNumber(resumo.valor_depositos);
  }
  if (total_retirado <= 0 && resumo?.valor_saques) {
    total_retirado = toNumber(resumo.valor_saques);
  }
  if (media_deposito <= 0 && resumo && resumo.total_depositos > 0 && total_depositado > 0) {
    media_deposito = total_depositado / resumo.total_depositos;
  }
  if (media_saque <= 0 && resumo && resumo.total_saques > 0 && total_retirado > 0) {
    media_saque = total_retirado / resumo.total_saques;
  }
  if (media_aposta <= 0 && resumo && resumo.total_apostas > 0 && total_apostado > 0) {
    media_aposta = total_apostado / resumo.total_apostas;
  }

  return {
    total_depositado,
    total_retirado,
    total_apostado,
    total_ganho,
    media_deposito,
    media_saque,
    media_aposta,
  };
};

const formatDate = (value: string | null) => {
  if (!value) return 'Não informado';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Não informado';
  return date.toLocaleDateString('pt-BR');
};

const formatDateTime = (value: string | null) => {
  if (!value) return 'Nunca';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Nunca';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatCPF = (cpf: string) => {
  if (!cpf) return '-';
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return cpf;
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

const formatPhone = (phone: string) => {
  if (!phone) return '-';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  if (cleaned.length === 10) return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  return phone;
};

const shortId = (id: string) => id.replace(/-/g, '').slice(0, 24);

const kycLabel = (status: string) => {
  const map: Record<string, string> = {
    nao_enviado: 'Não enviado',
    pendente: 'Pendente',
    aprovado: 'Aprovado',
    rejeitado: 'Rejeitado',
  };
  return map[status] || status;
};

const cargoLabel = (cargo: string) => {
  const map: Record<string, string> = {
    usuario: 'Usuário',
    admin: 'Administrador',
    moderador: 'Moderador',
    suporte: 'Suporte',
  };
  return map[cargo] || cargo;
};

const getStatusLabel = (ativo: boolean, verificado: boolean) => {
  if (!ativo && !verificado) return 'Inativo (Não Verificado)';
  if (!ativo) return 'Inativo';
  if (!verificado) return 'Ativo (Não Verificado)';
  return 'Ativo';
};

const getStatusBadge = (ativo: boolean, verificado: boolean) => {
  if (!ativo) return 'bg-admin-panel text-gray-500 border-admin-border';
  if (!verificado) return 'bg-white/5 text-gray-300 border-admin-border';
  return 'bg-white/10 text-white border-admin-border-strong';
};

const getKycBadge = () => 'bg-white/5 text-gray-300 border-admin-border';

const getTransacaoBadge = () => 'bg-white/5 text-gray-300 border-admin-border';

export default function UsuarioDetalhesPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [usuario, setUsuario] = useState<UsuarioDetalhe | null>(null);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [estatisticas, setEstatisticas] = useState<Estatisticas | null>(null);
  const [showEstatisticas, setShowEstatisticas] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('saldo');
  const [showSessoes, setShowSessoes] = useState(false);
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [sessoesLoading, setSessoesLoading] = useState(false);
  const [depositos, setDepositos] = useState<Deposito[]>([]);
  const [saques, setSaques] = useState<Saque[]>([]);
  const [apostas, setApostas] = useState<Aposta[]>([]);
  const [transLoading, setTransLoading] = useState(false);
  const [transTipo, setTransTipo] = useState<TransTipo>('depositos');
  const [transPage, setTransPage] = useState(1);
  const [transTotals, setTransTotals] = useState({ depositos: 0, saques: 0, apostas: 0 });
  const [valorSaldo, setValorSaldo] = useState('');
  const [rollover, setRollover] = useState<RolloverInfo | null>(null);
  const [rolloverLoading, setRolloverLoading] = useState(false);
  const [showRolloverManage, setShowRolloverManage] = useState(false);
  const [showAumentarRollover, setShowAumentarRollover] = useState(false);
  const [valorRollover, setValorRollover] = useState('');
  const [perfilForm, setPerfilForm] = useState({
    nome: '',
    email: '',
    cpf: '',
    telefone: '',
    data_nascimento: '',
    pais: 'BR',
    cargo: 'usuario',
  });
  const [indicacao, setIndicacao] = useState<IndicacaoUsuario | null>(null);
  const [indicacaoLoading, setIndicacaoLoading] = useState(false);
  const [indicacaoForm, setIndicacaoForm] = useState({
    usaPadraoPlataforma: true,
    recompensa: '',
    depositoMinimo: '',
  });

  const loadDetalhes = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('obter_detalhes_usuario_admin', {
        p_usuario_id: userId,
      });

      if (error) {
        console.error(error);
        showToast('Erro ao carregar usuário. Execute deploy/supabase_nova_casa.sql no Supabase.', 'error');
        return;
      }

      const result = data as {
        ok: boolean;
        error?: string;
        usuario?: UsuarioDetalhe;
        resumo?: Resumo;
        estatisticas?: Estatisticas;
      };

      if (!result?.ok || !result.usuario) {
        showToast(result?.error || 'Usuário não encontrado', 'error');
        navigate('/usuarios');
        return;
      }

      setUsuario(result.usuario);
      setResumo(result.resumo || null);
      setEstatisticas(normalizeEstatisticas(result.estatisticas, result.usuario, result.resumo));
      setPerfilForm({
        nome: result.usuario.nome || '',
        email: result.usuario.email || '',
        cpf: result.usuario.cpf || '',
        telefone: result.usuario.telefone || '',
        data_nascimento: result.usuario.data_nascimento || '',
        pais: result.usuario.pais || 'BR',
        cargo: result.usuario.cargo || 'usuario',
      });
    } catch {
      showToast('Erro ao carregar usuário.', 'error');
    } finally {
      setLoading(false);
    }
  }, [userId, navigate, showToast]);

  const loadTransacoes = useCallback(async () => {
    if (!userId) return;

    try {
      setTransLoading(true);
      const offset = (transPage - 1) * TRANS_ITEMS_PER_PAGE;
      const { data, error } = await supabase.rpc('listar_transacoes_usuario_admin', {
        p_usuario_id: userId,
        p_tipo: transTipo,
        p_limite: TRANS_ITEMS_PER_PAGE,
        p_offset: offset,
      });

      if (error) {
        console.error(error);
        return;
      }

      const result = data as {
        ok: boolean;
        depositos: Deposito[];
        saques: Saque[];
        apostas: Aposta[];
        total_depositos?: number;
        total_saques?: number;
        total_apostas?: number;
      };

      if (result?.ok) {
        setDepositos(result.depositos || []);
        setSaques(result.saques || []);
        setApostas(result.apostas || []);
        setTransTotals({
          depositos: result.total_depositos ?? result.depositos?.length ?? 0,
          saques: result.total_saques ?? result.saques?.length ?? 0,
          apostas: result.total_apostas ?? result.apostas?.length ?? 0,
        });
      }
    } finally {
      setTransLoading(false);
    }
  }, [userId, transTipo, transPage]);

  const loadIndicacao = useCallback(async () => {
    if (!userId) return;

    try {
      setIndicacaoLoading(true);
      const { data, error } = await supabase.rpc('obter_indicacao_usuario_admin', {
        p_usuario_id: userId,
      });

      if (error) {
        console.error(error);
        showToast('Erro ao carregar Indique e Ganhe. Execute deploy/supabase_nova_casa.sql no Supabase.', 'error');
        return;
      }

      const result = data as { ok: boolean; error?: string } & IndicacaoUsuario;
      if (!result?.ok) {
        showToast(result?.error || 'Erro ao carregar Indique e Ganhe.', 'error');
        return;
      }

      setIndicacao(result);
      setIndicacaoForm({
        usaPadraoPlataforma: result.usa_padrao_plataforma,
        recompensa: String(result.recompensa_efetiva ?? result.global_recompensa ?? 0),
        depositoMinimo: String(result.deposito_minimo_efetivo ?? result.global_deposito_minimo ?? 0),
      });
    } finally {
      setIndicacaoLoading(false);
    }
  }, [userId, showToast]);

  const loadRollover = useCallback(async () => {
    if (!userId) return;

    try {
      setRolloverLoading(true);
      const { data, error } = await supabase.rpc('obter_rollover_usuario_admin', {
        p_usuario_id: userId,
      });

      if (error) {
        console.error(error);
        return;
      }

      const result = data as { ok: boolean; error?: string } & RolloverInfo;
      if (result?.ok) {
        setRollover({
          ativo: result.ativo,
          rollover_pendente: Number(result.rollover_pendente) || 0,
          rollover_meta: Number(result.rollover_meta) || 0,
          rollover_apostado: Number(result.rollover_apostado) || 0,
          progresso: Number(result.progresso) || 0,
          data_inicio: result.data_inicio || null,
          saques_bloqueados: result.saques_bloqueados,
        });
      }
    } finally {
      setRolloverLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadDetalhes();
  }, [loadDetalhes]);

  useEffect(() => {
    void loadRollover();
  }, [loadRollover]);

  useEffect(() => {
    if (activeTab === 'transacoes') {
      void loadTransacoes();
    }
    if (activeTab === 'indicacao') {
      void loadIndicacao();
    }
  }, [activeTab, loadTransacoes, loadIndicacao]);

  const handleTransTipoChange = (tipo: TransTipo) => {
    setTransTipo(tipo);
    setTransPage(1);
  };

  const handleStatusUpdate = async (ativo?: boolean, verificado?: boolean, kyc_status?: string) => {
    if (!userId) return;

    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('atualizar_status_usuario_admin', {
        p_usuario_id: userId,
        p_ativo: ativo ?? null,
        p_verificado: verificado ?? null,
        p_kyc_status: kyc_status ?? null,
      });

      if (error) {
        showToast('Erro ao atualizar status.', 'error');
        return;
      }

      const result = data as { ok: boolean; error?: string };
      if (!result?.ok) {
        showToast(result?.error || 'Erro ao atualizar status.', 'error');
        return;
      }

      showToast('Status atualizado!', 'success');
      await loadDetalhes();
    } finally {
      setSaving(false);
    }
  };

  const loadSessoes = async () => {
    if (!userId) return;

    setShowSessoes(true);
    setSessoesLoading(true);
    try {
      const { data, error } = await supabase.rpc('listar_sessoes_usuario_admin', {
        p_usuario_id: userId,
      });

      if (error) {
        showToast('Erro ao carregar sessões.', 'error');
        return;
      }

      setSessoes((data as Sessao[]) || []);
    } finally {
      setSessoesLoading(false);
    }
  };

  const atualizarSaldo = async (novoSaldo: number, mensagem: string) => {
    if (!usuario) return;

    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('atualizar_saldo_usuario', {
        p_usuario_id: usuario.id,
        p_novo_saldo: novoSaldo,
      });

      if (error) {
        showToast(`Erro: ${error.message}`, 'error');
        return;
      }

      const result = data as { success?: boolean; error?: string };
      if (!result?.success) {
        showToast(result?.error || 'Erro ao atualizar saldo.', 'error');
        return;
      }

      showToast(mensagem, 'success');
      setValorSaldo('');
      await loadDetalhes();
    } finally {
      setSaving(false);
    }
  };

  const handleAdicionarSaldo = async () => {
    if (!usuario || !valorSaldo) return;

    const valor = parseFloat(valorSaldo);
    if (Number.isNaN(valor) || valor <= 0) {
      showToast('Digite um valor válido.', 'warning');
      return;
    }

    const novoSaldo = (usuario.saldo || 0) + valor;
    await atualizarSaldo(novoSaldo, 'Saldo adicionado!');
  };

  const handleRemoverSaldo = async () => {
    if (!usuario || !valorSaldo) return;

    const valor = parseFloat(valorSaldo);
    if (Number.isNaN(valor) || valor <= 0) {
      showToast('Digite um valor válido.', 'warning');
      return;
    }

    if (valor > (usuario.saldo || 0)) {
      showToast('Valor maior que o saldo disponível.', 'warning');
      return;
    }

    const novoSaldo = (usuario.saldo || 0) - valor;
    await atualizarSaldo(novoSaldo, 'Saldo removido!');
  };

  const handleAplicarRollover = async () => {
    if (!userId || !valorRollover) return;

    const valor = parseFloat(valorRollover.replace(',', '.'));
    if (Number.isNaN(valor) || valor <= 0) {
      showToast('Digite um valor válido.', 'warning');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('aplicar_rollover_usuario_admin', {
        p_usuario_id: userId,
        p_valor: valor,
      });

      if (error) {
        showToast(`Erro: ${error.message}`, 'error');
        return;
      }

      const result = data as { ok: boolean; error?: string };
      if (!result?.ok) {
        showToast(result?.error || 'Erro ao aplicar rollover.', 'error');
        return;
      }

      showToast('Rollover aplicado com sucesso!', 'success');
      setValorRollover('');
      setShowAumentarRollover(false);
      setShowRolloverManage(true);
      await loadRollover();
    } finally {
      setSaving(false);
    }
  };

  const handleDesativarRollover = async () => {
    if (!userId) return;

    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('desativar_rollover_usuario_admin', {
        p_usuario_id: userId,
      });

      if (error) {
        showToast(`Erro: ${error.message}`, 'error');
        return;
      }

      const result = data as { ok: boolean; error?: string };
      if (!result?.ok) {
        showToast(result?.error || 'Erro ao desativar rollover.', 'error');
        return;
      }

      showToast('Trava de rollover desativada!', 'success');
      setShowRolloverManage(false);
      await loadRollover();
    } finally {
      setSaving(false);
    }
  };

  const handleSaveIndicacao = async () => {
    if (!userId) return;

    if (!indicacaoForm.usaPadraoPlataforma) {
      const recompensa = parseFloat(indicacaoForm.recompensa.replace(',', '.'));
      const depositoMinimo = parseFloat(indicacaoForm.depositoMinimo.replace(',', '.'));
      if (Number.isNaN(recompensa) || recompensa < 0) {
        showToast('Informe uma recompensa válida (≥ 0).', 'warning');
        return;
      }
      if (Number.isNaN(depositoMinimo) || depositoMinimo < 0) {
        showToast('Informe um depósito mínimo válido (≥ 0).', 'warning');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = indicacaoForm.usaPadraoPlataforma
        ? {
            p_usuario_id: userId,
            p_usar_padrao_plataforma: true,
            p_recompensa: null,
            p_deposito_minimo: null,
          }
        : {
            p_usuario_id: userId,
            p_usar_padrao_plataforma: false,
            p_recompensa: parseFloat(indicacaoForm.recompensa.replace(',', '.')),
            p_deposito_minimo: parseFloat(indicacaoForm.depositoMinimo.replace(',', '.')),
          };

      const { data, error } = await supabase.rpc('atualizar_indicacao_usuario_admin', payload);

      if (error) {
        showToast('Erro ao salvar Indique e Ganhe.', 'error');
        return;
      }

      const result = data as { ok: boolean; error?: string };
      if (!result?.ok) {
        showToast(result?.error || 'Erro ao salvar Indique e Ganhe.', 'error');
        return;
      }

      showToast('Configuração de indicação salva!', 'success');
      await loadIndicacao();
    } finally {
      setSaving(false);
    }
  };

  const handleSavePerfil = async () => {
    if (!userId) return;

    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('atualizar_perfil_usuario_admin', {
        p_usuario_id: userId,
        p_nome: perfilForm.nome,
        p_email: perfilForm.email,
        p_cpf: perfilForm.cpf,
        p_telefone: perfilForm.telefone,
        p_data_nascimento: perfilForm.data_nascimento || null,
        p_pais: perfilForm.pais,
        p_cargo: perfilForm.cargo,
      });

      if (error) {
        showToast('Erro ao salvar perfil.', 'error');
        return;
      }

      const result = data as { ok: boolean; error?: string };
      if (!result?.ok) {
        showToast(result?.error || 'Erro ao salvar perfil.', 'error');
        return;
      }

      showToast('Perfil atualizado!', 'success');
      await loadDetalhes();
    } finally {
      setSaving(false);
    }
  };

  const copyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      showToast('ID copiado!', 'success');
    } catch {
      showToast('Não foi possível copiar o ID.', 'error');
    }
  };

  if (loading) {
    return <LoadingState message="Carregando detalhes do usuário..." />;
  }

  if (!usuario) return null;

  const tabs: { key: TabKey; label: string; icon: LucideIcon }[] = [
    { key: 'saldo', label: 'Saldo', icon: Wallet },
    { key: 'transacoes', label: 'Transações', icon: Receipt },
    { key: 'verificacoes', label: 'Verificações', icon: ShieldCheck },
    { key: 'indicacao', label: 'Indique e Ganhe', icon: UserPlus },
    { key: 'perfil', label: 'Perfil', icon: User },
  ];

  const transTipoFilters: { key: TransTipo; label: string; icon: LucideIcon }[] = [
    { key: 'depositos', label: 'Depósitos', icon: ArrowDownCircle },
    { key: 'saques', label: 'Saques', icon: ArrowUpCircle },
    { key: 'apostas', label: 'Apostas', icon: Trophy },
  ];

  const transTotal = transTotals[transTipo];

  const overviewStats = [
    { label: 'Saldo atual', value: formatCurrency(usuario.saldo), icon: Wallet },
    { label: 'Total depositado', value: formatCurrency(usuario.total_depositado), icon: ArrowDownCircle },
    { label: 'Nível VIP', value: `Nível ${usuario.vip_nivel}`, icon: Crown },
  ];

  const resumoCards = resumo
    ? [
        {
          title: 'Depósitos',
          value: resumo.total_depositos.toString(),
          subtitle: formatCurrency(resumo.valor_depositos),
          icon: ArrowDownCircle,
        },
        {
          title: 'Saques',
          value: resumo.total_saques.toString(),
          subtitle: formatCurrency(resumo.valor_saques),
          icon: ArrowUpCircle,
        },
        {
          title: 'Apostas',
          value: resumo.total_apostas.toString(),
          subtitle: 'Total registrado',
          icon: Trophy,
        },
      ]
    : [];

  const estatisticasItems = [
    { label: 'Total Depositado', value: formatCurrency(estatisticas?.total_depositado ?? 0), icon: ArrowDownCircle },
    { label: 'Total Retirado', value: formatCurrency(estatisticas?.total_retirado ?? 0), icon: ArrowUpCircle },
    { label: 'Total Apostado', value: formatCurrency(estatisticas?.total_apostado ?? 0), icon: Trophy },
    { label: 'Total Ganho', value: formatCurrency(estatisticas?.total_ganho ?? 0), icon: Wallet },
    { label: 'Média por Depósito', value: formatCurrency(estatisticas?.media_deposito ?? 0), icon: ArrowDownCircle },
    { label: 'Média por Saque', value: formatCurrency(estatisticas?.media_saque ?? 0), icon: ArrowUpCircle },
    { label: 'Média por Aposta', value: formatCurrency(estatisticas?.media_aposta ?? 0), icon: Trophy },
  ];

  return (
    <div>
      <PageHeader
        icon={Users}
        title="Detalhes do Usuário"
        description={`Visualize e gerencie ${usuario.nome} — saldo, transações e verificações.`}
        actions={
          <button
            onClick={() => navigate('/usuarios')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-admin-panel hover:bg-white/5 text-gray-300 hover:text-white text-sm font-medium transition-colors border border-admin-border"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
            Voltar
          </button>
        }
      />

      {/* Resumo do usuário */}
      <div className="mb-6 rounded-xl bg-admin-panel border border-admin-border overflow-hidden">
        <div className="p-5 lg:p-6">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-white text-xl font-bold truncate">{usuario.nome}</h2>
              <p className="text-gray-500 text-sm truncate mt-1">{usuario.email}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${getStatusBadge(usuario.ativo, usuario.verificado)}`}
                >
                  {usuario.ativo ? (
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  ) : (
                    <Ban className="w-3 h-3 text-admin-muted" />
                  )}
                  {getStatusLabel(usuario.ativo, usuario.verificado)}
                </span>
                {usuario.cargo !== 'usuario' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-white/5 text-gray-300 border border-admin-border">
                    <Shield className="w-3 h-3 text-white" />
                    {cargoLabel(usuario.cargo)}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-white/5 text-gray-300 border border-admin-border">
                  <Crown className="w-3 h-3 text-white" />
                  VIP {usuario.vip_nivel}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 shrink-0">
              <button
                onClick={() => setShowEstatisticas(true)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-admin-border text-white text-sm font-medium transition-colors"
              >
                <BarChart3 className="w-4 h-4" />
                Estatísticas Detalhadas
              </button>
              <button
                onClick={() => copyId(usuario.id)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-admin-panel hover:bg-white/5 border border-admin-border text-gray-400 hover:text-white text-sm transition-colors"
              >
                <Hash className="w-4 h-4 text-white" />
                <span className="font-mono text-xs">{shortId(usuario.id)}</span>
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-5 border-t border-admin-border">
            {overviewStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg bg-admin-panel border border-admin-border"
                >
                  <div className="w-9 h-9 rounded-lg bg-admin-panel border border-admin-border flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-gray-500 text-xs">{stat.label}</p>
                    <p className="text-white font-semibold text-sm truncate">{stat.value}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-6">
        {/* Painel lateral */}
        <PagePanel padding={false} className="xl:col-span-1 h-fit overflow-hidden !p-0 !border-admin-border">
          <div className="px-5 py-4 border-b border-admin-border">
            <h3 className="text-white text-sm font-semibold flex items-center gap-2">
              <User className="w-4 h-4 text-white" />
              Informações
            </h3>
          </div>
          <div className="px-3 py-3 space-y-0.5">
            <InfoRow icon={Mail} label="Email" value={usuario.email} />
            <InfoRow icon={Fingerprint} label="CPF" value={formatCPF(usuario.cpf)} />
            <InfoRow icon={Phone} label="Telefone" value={formatPhone(usuario.telefone)} />
            <InfoRow icon={Calendar} label="Nascimento" value={formatDate(usuario.data_nascimento)} />
            <InfoRow icon={Calendar} label="Cadastro" value={formatDate(usuario.created_at)} />
            <InfoRow icon={Globe} label="País" value={usuario.pais} />
            <InfoRow
              icon={ShieldCheck}
              label="KYC"
              value={kycLabel(usuario.kyc_status)}
              badgeClass={getKycBadge()}
            />
            <InfoRow icon={Clock} label="Último login" value={formatDateTime(usuario.ultimo_login)} />
          </div>

          <div className="px-5 py-4 border-t border-admin-border">
            <h3 className="text-white text-sm font-semibold flex items-center gap-2 mb-3">
              <Monitor className="w-4 h-4 text-white" />
              Ações rápidas
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <ActionButton
                icon={Eye}
                label="Transações"
                onClick={() => {
                  setActiveTab('transacoes');
                  handleTransTipoChange('depositos');
                }}
              />
              <ActionButton icon={Monitor} label="Sessões" onClick={loadSessoes} />
              <ActionButton
                icon={LogIn}
                label="Logar como"
                onClick={() => showToast('Requer service role no Supabase. Em breve.', 'info')}
              />
              {!usuario.ativo ? (
                <ActionButton
                  icon={CheckCircle}
                  label="Ativar"
                  disabled={saving}
                  onClick={() => handleStatusUpdate(true)}
                />
              ) : (
                <ActionButton
                  icon={Ban}
                  label="Bloquear"
                  disabled={saving}
                  onClick={() => handleStatusUpdate(false)}
                />
              )}
            </div>
          </div>
        </PagePanel>

        {/* Conteúdo principal */}
        <PagePanel padding={false} className="overflow-hidden !p-0 !border-admin-border">
          <div className="flex border-b border-admin-border overflow-x-auto px-4 gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
                    isActive
                      ? 'text-white border-white'
                      : 'text-gray-500 border-transparent hover:text-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 text-white" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="p-5 lg:p-6">
            {activeTab === 'saldo' && (
              <div className="space-y-6">
                {resumoCards.length > 0 && (
                  <div>
                    <h3 className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-white" />
                      Resumo financeiro
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {resumoCards.map((card) => {
                        const Icon = card.icon;
                        return (
                          <div
                            key={card.title}
                            className="rounded-xl px-4 py-4 bg-admin-panel border border-admin-border"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="text-gray-500 text-xs font-medium">{card.title}</h4>
                              <Icon className="w-4 h-4 text-white shrink-0" />
                            </div>
                            <p className="text-white font-bold text-lg">{card.value}</p>
                            {card.subtitle && (
                              <p className="text-gray-500 text-xs mt-1">{card.subtitle}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <RolloverSection
                  rollover={rollover}
                  loading={rolloverLoading}
                  expanded={showRolloverManage}
                  saving={saving}
                  onToggleExpand={() => setShowRolloverManage((v) => !v)}
                  onAumentar={() => {
                    setValorRollover('');
                    setShowAumentarRollover(true);
                  }}
                  onDesativar={handleDesativarRollover}
                />

                <div className="rounded-xl border border-admin-border p-5 bg-admin-panel">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-white/5 border border-admin-border flex items-center justify-center">
                      <Wallet className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold text-sm">Gerenciar saldo</h3>
                      <p className="text-gray-500 text-xs">
                        Saldo atual: {formatCurrency(usuario.saldo)} — informe o valor para adicionar ou remover
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">R$</span>
                      <input
                        type="number"
                        value={valorSaldo}
                        onChange={(e) => setValorSaldo(e.target.value)}
                        placeholder="0,00"
                        step="0.01"
                        min="0"
                        className="w-full pl-10 pr-4 py-2.5 text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-white/30 border border-admin-border bg-admin-panel"
                      />
                    </div>
                    <button
                      onClick={handleAdicionarSaldo}
                      disabled={saving || !valorSaldo}
                      className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white hover:bg-gray-200 disabled:opacity-50 text-black rounded-lg text-sm font-medium transition-colors"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4" />
                      )}
                      Adicionar
                    </button>
                    <button
                      onClick={handleRemoverSaldo}
                      disabled={saving || !valorSaldo}
                      className="flex items-center justify-center gap-2 px-5 py-2.5 bg-admin-panel hover:bg-white/5 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors border border-admin-border"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Minus className="w-4 h-4" />
                      )}
                      Remover
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'transacoes' && (
              <div className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  {transTipoFilters.map((filter) => {
                    const Icon = filter.icon;
                    const isActive = transTipo === filter.key;
                    const count = transTotals[filter.key];
                    return (
                      <button
                        key={filter.key}
                        onClick={() => handleTransTipoChange(filter.key)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                          isActive
                            ? 'bg-white/10 text-white border-admin-border-strong'
                            : 'bg-admin-panel text-gray-500 border-admin-border hover:text-gray-300 hover:border-admin-border'
                        }`}
                      >
                        <Icon className="w-4 h-4 text-white" />
                        {filter.label}
                        <span
                          className={`px-1.5 py-0.5 rounded text-xs ${
                            isActive ? 'bg-white/10 text-white' : 'bg-white/5 text-gray-500'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {transLoading ? (
                  <div className="flex items-center justify-center py-12 gap-3">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                    <p className="text-gray-500 text-sm">Carregando transações...</p>
                  </div>
                ) : (
                  <>
                    {transTipo === 'depositos' && (
                      <TransacaoSection
                        title="Depósitos"
                        empty="Nenhum depósito registrado"
                        count={depositos.length}
                        total={transTotal}
                        icon={ArrowDownCircle}
                      >
                        {depositos.map((d) => (
                          <TransacaoRow
                            key={d.id}
                            icon={ArrowDownCircle}
                            label={formatDateTime(d.data_hora)}
                            value={formatCurrency(d.valor)}
                            status={d.status}
                          />
                        ))}
                      </TransacaoSection>
                    )}

                    {transTipo === 'saques' && (
                      <TransacaoSection
                        title="Saques"
                        empty="Nenhum saque registrado"
                        count={saques.length}
                        total={transTotal}
                        icon={ArrowUpCircle}
                      >
                        {saques.map((s) => (
                          <TransacaoRow
                            key={s.id}
                            icon={ArrowUpCircle}
                            label={formatDateTime(s.data_hora)}
                            value={formatCurrency(s.valor)}
                            status={s.status}
                          />
                        ))}
                      </TransacaoSection>
                    )}

                    {transTipo === 'apostas' && (
                      <TransacaoSection
                        title="Apostas"
                        empty="Nenhuma aposta registrada"
                        count={apostas.length}
                        total={transTotal}
                        icon={Trophy}
                      >
                        {apostas.map((a) => (
                          <TransacaoRow
                            key={a.id}
                            icon={Trophy}
                            label={`${a.jogo} — ${formatDateTime(a.data)}`}
                            value={`${formatCurrency(a.valor)} → ${formatCurrency(a.retorno)}`}
                            status={a.tipo}
                          />
                        ))}
                      </TransacaoSection>
                    )}

                    {transTotal > TRANS_ITEMS_PER_PAGE && (
                      <Pagination
                        page={transPage}
                        pageSize={TRANS_ITEMS_PER_PAGE}
                        total={transTotal}
                        onPageChange={setTransPage}
                      />
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === 'verificacoes' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-white" />
                    Status KYC
                  </h3>
                  <p className="text-gray-500 text-sm mb-4">
                    Selecione o status de verificação de identidade do usuário
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(['nao_enviado', 'pendente', 'aprovado', 'rejeitado'] as const).map((status) => {
                      const isSelected = usuario.kyc_status === status;
                      const icons: Record<string, LucideIcon> = {
                        nao_enviado: ShieldAlert,
                        pendente: Clock,
                        aprovado: CheckCircle2,
                        rejeitado: XCircle,
                      };
                      const Icon = icons[status];
                      return (
                        <button
                          key={status}
                          onClick={() => handleStatusUpdate(undefined, undefined, status)}
                          disabled={saving}
                          className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all disabled:opacity-50 ${
                            isSelected
                              ? 'border-gray-500 bg-white/5 ring-1 ring-white/20'
                              : 'border-admin-border bg-admin-panel hover:border-admin-border hover:bg-white/[0.02]'
                          }`}
                        >
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${
                              isSelected ? 'bg-white/10 border-admin-border-strong' : 'bg-admin-panel border-admin-border'
                            }`}
                          >
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className={`font-medium text-sm ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                              {kycLabel(status)}
                            </p>
                            {isSelected && (
                              <p className="text-gray-500 text-xs mt-0.5">Status atual</p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-xl border border-admin-border p-5 bg-admin-panel">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-white/5 border border-admin-border">
                        {usuario.verificado ? (
                          <CheckCircle2 className="w-5 h-5 text-white" />
                        ) : (
                          <ShieldAlert className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div>
                        <p className="text-white font-medium">Verificação da conta</p>
                        <p className="text-gray-500 text-sm mt-0.5">
                          {usuario.verificado
                            ? 'Usuário verificado pelo administrador'
                            : 'Usuário ainda não foi verificado'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleStatusUpdate(undefined, !usuario.verificado)}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors shrink-0 bg-white hover:bg-gray-200 text-black"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : usuario.verificado ? (
                        <XCircle className="w-4 h-4" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      {usuario.verificado ? 'Remover verificação' : 'Verificar conta'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'indicacao' && (
              <div className="max-w-2xl space-y-5">
                {indicacaoLoading ? (
                  <div className="flex items-center justify-center py-12 gap-3">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                    <p className="text-gray-500 text-sm">Carregando indicações...</p>
                  </div>
                ) : (
                  <>
                    <p className="text-gray-500 text-sm">
                      Personalize quanto este usuário ganha por indicação e o depósito mínimo exigido do
                      indicado. Deixe no padrão da plataforma para usar os valores globais de Configurações.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <IndicacaoStat
                        label="Indicados"
                        value={String(indicacao?.total_indicados ?? 0)}
                      />
                      <IndicacaoStat
                        label="Qualificados"
                        value={String(indicacao?.indicados_qualificados ?? 0)}
                      />
                      <IndicacaoStat
                        label="Ganhos totais"
                        value={formatCurrency(indicacao?.ganhos_totais ?? 0)}
                      />
                    </div>

                    {indicacao?.link_indicacao ? (
                      <div className="rounded-xl border border-admin-border p-4 bg-admin-panel">
                        <p className="text-gray-500 text-xs mb-1">Código de indicação</p>
                        <div className="flex items-center gap-2">
                          <code className="text-white text-sm font-mono flex-1 truncate">
                            {indicacao.link_indicacao}
                          </code>
                          <button
                            type="button"
                            onClick={() => copyId(indicacao.link_indicacao!)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-admin-border bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-colors shrink-0"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            Copiar
                          </button>
                        </div>
                      </div>
                    ) : null}

                    <div className="rounded-xl border border-admin-border p-5 bg-admin-panel space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-white font-semibold text-sm">Regras personalizadas</h3>
                          <p className="text-gray-500 text-xs mt-1">
                            Padrão da plataforma: recompensa{' '}
                            {formatCurrency(indicacao?.global_recompensa ?? 0)} · depósito mín.{' '}
                            {formatCurrency(indicacao?.global_deposito_minimo ?? 0)}
                          </p>
                        </div>
                        {!indicacaoForm.usaPadraoPlataforma ? (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-admin-accent/15 text-admin-accent border border-admin-accent/30 shrink-0">
                            Personalizado
                          </span>
                        ) : null}
                      </div>

                      <label className="flex items-center gap-2.5 text-gray-300 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={indicacaoForm.usaPadraoPlataforma}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setIndicacaoForm({
                              usaPadraoPlataforma: checked,
                              recompensa: checked
                                ? String(indicacao?.global_recompensa ?? 0)
                                : indicacaoForm.recompensa,
                              depositoMinimo: checked
                                ? String(indicacao?.global_deposito_minimo ?? 0)
                                : indicacaoForm.depositoMinimo,
                            });
                          }}
                          className="rounded"
                        />
                        Usar padrão da plataforma
                      </label>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-gray-300 text-sm font-medium mb-1.5 block">
                            Recompensa do indicador (R$)
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                              R$
                            </span>
                            <input
                              type="number"
                              value={indicacaoForm.recompensa}
                              onChange={(e) =>
                                setIndicacaoForm({ ...indicacaoForm, recompensa: e.target.value })
                              }
                              disabled={indicacaoForm.usaPadraoPlataforma}
                              min="0"
                              step="0.01"
                              className="w-full pl-10 pr-4 py-2.5 text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-white/30 border border-admin-border bg-admin-panel disabled:opacity-50"
                            />
                          </div>
                          <p className="text-gray-500 text-xs mt-1.5">
                            Valor creditado quando o indicado faz o primeiro depósito qualificado.
                          </p>
                        </div>

                        <div>
                          <label className="text-gray-300 text-sm font-medium mb-1.5 block">
                            Depósito mínimo do indicado (R$)
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                              R$
                            </span>
                            <input
                              type="number"
                              value={indicacaoForm.depositoMinimo}
                              onChange={(e) =>
                                setIndicacaoForm({ ...indicacaoForm, depositoMinimo: e.target.value })
                              }
                              disabled={indicacaoForm.usaPadraoPlataforma}
                              min="0"
                              step="0.01"
                              className="w-full pl-10 pr-4 py-2.5 text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-white/30 border border-admin-border bg-admin-panel disabled:opacity-50"
                            />
                          </div>
                          <p className="text-gray-500 text-xs mt-1.5">
                            Primeiro depósito do indicado precisa ser igual ou maior que este valor.
                          </p>
                        </div>
                      </div>

                      {!indicacaoForm.usaPadraoPlataforma ? (
                        <div className="rounded-lg border border-admin-accent/20 bg-admin-accent/5 px-4 py-3 text-xs text-gray-300">
                          Valores efetivos para este usuário: recompensa{' '}
                          <span className="text-white font-medium">
                            {formatCurrency(parseFloat(indicacaoForm.recompensa.replace(',', '.')) || 0)}
                          </span>{' '}
                          · depósito mín.{' '}
                          <span className="text-white font-medium">
                            {formatCurrency(parseFloat(indicacaoForm.depositoMinimo.replace(',', '.')) || 0)}
                          </span>
                        </div>
                      ) : null}
                    </div>

                    <button
                      onClick={handleSaveIndicacao}
                      disabled={saving}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-200 disabled:opacity-50 text-black rounded-lg font-medium transition-colors"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      {saving ? 'Salvando...' : 'Salvar indicação'}
                    </button>
                  </>
                )}
              </div>
            )}

            {activeTab === 'perfil' && (
              <div className="max-w-xl space-y-5">
                <p className="text-gray-500 text-sm">
                  Edite as informações pessoais e o tipo de acesso do usuário.
                </p>

                <FormField
                  label="Nome completo"
                  icon={User}
                  type="text"
                  value={perfilForm.nome}
                  onChange={(v) => setPerfilForm({ ...perfilForm, nome: v })}
                />
                <FormField
                  label="Email"
                  icon={Mail}
                  type="email"
                  value={perfilForm.email}
                  onChange={(v) => setPerfilForm({ ...perfilForm, email: v })}
                />
                <FormField
                  label="CPF"
                  icon={Fingerprint}
                  type="text"
                  value={perfilForm.cpf}
                  onChange={(v) => setPerfilForm({ ...perfilForm, cpf: v })}
                />
                <FormField
                  label="Telefone"
                  icon={Phone}
                  type="text"
                  value={perfilForm.telefone}
                  onChange={(v) => setPerfilForm({ ...perfilForm, telefone: v })}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    label="Nascimento"
                    icon={Calendar}
                    type="date"
                    value={perfilForm.data_nascimento}
                    onChange={(v) => setPerfilForm({ ...perfilForm, data_nascimento: v })}
                  />
                  <FormField
                    label="País"
                    icon={Globe}
                    type="text"
                    value={perfilForm.pais}
                    onChange={(v) => setPerfilForm({ ...perfilForm, pais: v })}
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-gray-300 text-sm font-medium mb-1.5">
                    <Shield className="w-3.5 h-3.5 text-white" />
                    Tipo de acesso
                  </label>
                  <select
                    value={perfilForm.cargo}
                    onChange={(e) => setPerfilForm({ ...perfilForm, cargo: e.target.value })}
                    className="w-full px-4 py-2.5 text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-white/30 border border-admin-border bg-admin-panel"
                  >
                    <option value="usuario">Usuário</option>
                    <option value="admin">Administrador</option>
                    <option value="moderador">Moderador</option>
                    <option value="suporte">Suporte</option>
                  </select>
                </div>

                <button
                  onClick={handleSavePerfil}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-200 disabled:opacity-50 text-black rounded-lg font-medium transition-colors"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {saving ? 'Salvando...' : 'Salvar perfil'}
                </button>
              </div>
            )}
          </div>
        </PagePanel>
      </div>

      <Modal
        open={showEstatisticas}
        onClose={() => setShowEstatisticas(false)}
        title="Estatísticas Detalhadas"
        description={usuario.nome}
        icon={BarChart3}
        size="lg"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {estatisticasItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-center gap-3 p-4 rounded-xl border border-admin-border bg-admin-panel"
              >
                <div className="w-10 h-10 rounded-lg bg-white/5 border border-admin-border flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-gray-500 text-xs">{item.label}</p>
                  <p className="text-white text-lg font-bold">{item.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Modal>

      <Modal
        open={showAumentarRollover}
        onClose={() => setShowAumentarRollover(false)}
        title="Aumentar Rollover"
        icon={RefreshCw}
        size="md"
        footer={
          <>
            <button
              onClick={() => setShowAumentarRollover(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white border border-admin-border bg-admin-panel hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleAplicarRollover}
              disabled={saving || !valorRollover}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white hover:bg-gray-200 disabled:opacity-50 text-black transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Aplicar Rollover
            </button>
          </>
        }
      >
        {rollover?.ativo && (
          <div className="mb-5 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
            <p className="text-amber-200 text-sm font-medium">Rollover Ativo — Saques Bloqueados</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-400">
              <span>
                Progresso: <span className="text-white">{rollover.progresso.toFixed(1)}%</span>
              </span>
              <span>
                Falta Apostar:{' '}
                <span className="text-white">{formatCurrency(rollover.rollover_pendente)}</span>
              </span>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-gray-300 text-sm font-medium">Valor que deve apostar (R$)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">R$</span>
            <input
              type="number"
              value={valorRollover}
              onChange={(e) => setValorRollover(e.target.value)}
              placeholder="0,00"
              step="0.01"
              min="0"
              className="w-full pl-10 pr-4 py-2.5 text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-white/30 border border-admin-border bg-admin-panel"
            />
          </div>
          <p className="text-gray-500 text-xs">Este valor será somado ao rollover existente</p>
        </div>

        <div className="mt-4 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
          <p className="text-amber-200/90 text-xs flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            Valor será ADICIONADO ao rollover existente.
          </p>
        </div>
      </Modal>

      <Modal
        open={showSessoes}
        onClose={() => setShowSessoes(false)}
        title="Sessões ativas"
        description={`${usuario.sessoes} sessão(ões) registrada(s)`}
        icon={Monitor}
        size="lg"
      >
              {sessoesLoading ? (
                <div className="flex items-center justify-center py-8 gap-3">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                  <p className="text-gray-500 text-sm">Carregando sessões...</p>
                </div>
              ) : sessoes.length === 0 ? (
                <div className="text-center py-10">
                  <Monitor className="w-10 h-10 text-white mx-auto mb-3 opacity-40" />
                  <p className="text-gray-500 text-sm">Nenhuma sessão encontrada.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessoes.map((s, i) => (
                    <div
                      key={s.id}
                      className="p-4 rounded-xl border border-admin-border bg-admin-panel"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Globe className="w-4 h-4 text-white shrink-0" />
                        <p className="text-white text-sm font-medium">
                          {s.ip || 'IP desconhecido'}
                        </p>
                        {i === 0 && (
                          <span className="ml-auto px-2 py-0.5 rounded text-xs font-medium bg-white/10 text-gray-300 border border-admin-border">
                            Mais recente
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400 text-xs mb-2 break-all pl-6">
                        {s.user_agent || 'User agent não disponível'}
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 pl-6 text-gray-500 text-xs">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Criada: {formatDateTime(s.created_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Atualizada: {formatDateTime(s.updated_at)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
      </Modal>
    </div>
  );
}

function RolloverSection({
  rollover,
  loading,
  expanded,
  saving,
  onToggleExpand,
  onAumentar,
  onDesativar,
}: {
  rollover: RolloverInfo | null;
  loading: boolean;
  expanded: boolean;
  saving: boolean;
  onToggleExpand: () => void;
  onAumentar: () => void;
  onDesativar: () => void;
}) {
  const ativo = rollover?.ativo ?? false;
  const progresso = rollover?.progresso ?? 0;
  const pendente = rollover?.rollover_pendente ?? 0;
  const meta = rollover?.rollover_meta ?? 0;
  const apostado = rollover?.rollover_apostado ?? 0;

  if (loading && !rollover) {
    return (
      <div className="rounded-xl border border-admin-border p-5 bg-admin-panel flex items-center justify-center gap-3 py-8">
        <Loader2 className="w-5 h-5 text-white animate-spin" />
        <p className="text-gray-500 text-sm">Carregando rollover...</p>
      </div>
    );
  }

  if (!expanded) {
    return (
      <div className="rounded-xl border border-admin-border p-5 bg-admin-panel">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${
                ativo ? 'bg-amber-500/10 border-amber-500/30' : 'bg-white/5 border-admin-border'
              }`}
            >
              <Lock className={`w-5 h-5 ${ativo ? 'text-amber-300' : 'text-white'}`} />
            </div>
            <div className="min-w-0">
              <h3 className="text-white font-semibold text-sm">Trava de Rollover</h3>
              {ativo ? (
                <div className="mt-1 space-y-0.5">
                  <p className="text-gray-400 text-xs">
                    Progresso: <span className="text-white font-medium">{progresso.toFixed(1)}%</span>
                  </p>
                  <p className="text-gray-400 text-xs">
                    Precisa apostar:{' '}
                    <span className="text-amber-200 font-medium">{formatCurrency(pendente)}</span>
                  </p>
                </div>
              ) : (
                <p className="text-gray-500 text-xs mt-1">Nenhuma trava ativa — saques liberados</p>
              )}
            </div>
          </div>
          <button
            onClick={onToggleExpand}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shrink-0 bg-white/5 hover:bg-white/10 border border-admin-border text-white"
          >
            <RefreshCw className="w-4 h-4" />
            Gerenciar Rollover
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-admin-border bg-admin-panel overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-admin-border">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-300" />
          Trava de Rollover
        </h3>
        <button
          onClick={onToggleExpand}
          className="text-gray-400 hover:text-white text-xs font-medium transition-colors"
        >
          Ocultar
        </button>
      </div>

      <div className="p-5 space-y-5">
        {ativo ? (
          <>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <ShieldAlert className="w-4 h-4 text-amber-300 shrink-0" />
              <span className="text-amber-200 text-sm font-medium">Trava Ativa — Saques Bloqueados</span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-xs">Progresso</span>
                <span className="text-white text-sm font-semibold">{progresso.toFixed(1)}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/5 border border-admin-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, progresso))}%` }}
                />
              </div>
              <div className="flex flex-wrap justify-between gap-2 mt-2 text-xs text-gray-500">
                <span>
                  Apostado: <span className="text-gray-300">{formatCurrency(apostado)}</span>
                </span>
                <span>
                  Meta: <span className="text-gray-300">{formatCurrency(meta)}</span>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <RolloverStat label="Valor Requerido" value={formatCurrency(meta)} />
              <RolloverStat label="Ainda Falta Apostar" value={formatCurrency(pendente)} highlight />
              <RolloverStat label="Data de Início" value={formatDate(rollover?.data_inicio ?? null)} />
              <RolloverStat
                label="Status de Saque"
                value={rollover?.saques_bloqueados ? 'Bloqueado' : 'Liberado'}
                valueClass={rollover?.saques_bloqueados ? 'text-amber-300' : 'text-emerald-400'}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={onAumentar}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-white hover:bg-gray-200 disabled:opacity-50 text-black transition-colors"
              >
                <Plus className="w-4 h-4" />
                Aumentar Rollover
              </button>
              <button
                onClick={onDesativar}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-admin-border bg-admin-panel hover:bg-white/5 disabled:opacity-50 text-white transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Desativar
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="text-emerald-300 text-sm font-medium">Sem trava ativa — saques liberados</span>
            </div>
            <button
              onClick={onAumentar}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-white hover:bg-gray-200 disabled:opacity-50 text-black transition-colors"
            >
              <Plus className="w-4 h-4" />
              Aplicar Rollover
            </button>
          </>
        )}

        <p className="text-gray-500 text-xs border-t border-admin-border pt-4">
          <span className="text-gray-400 font-medium">Trava de Saque:</span> O rollover impede que o
          usuário realize saques até movimentar o valor especificado em apostas.
        </p>
      </div>
    </div>
  );
}

function IndicacaoStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl px-4 py-4 bg-admin-panel border border-admin-border">
      <p className="text-gray-500 text-xs font-medium">{label}</p>
      <p className="text-white font-bold text-lg mt-1">{value}</p>
    </div>
  );
}

function RolloverStat({
  label,
  value,
  highlight = false,
  valueClass,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  valueClass?: string;
}) {
  return (
    <div
      className={`rounded-lg px-4 py-3 border ${
        highlight ? 'border-amber-500/30 bg-amber-500/5' : 'border-admin-border bg-white/[0.02]'
      }`}
    >
      <p className="text-gray-500 text-xs mb-1">{label}</p>
      <p className={`font-semibold text-sm ${valueClass || (highlight ? 'text-amber-200' : 'text-white')}`}>
        {value}
      </p>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  badgeClass,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  badgeClass?: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-white/[0.02] transition-colors">
      <Icon className="w-4 h-4 text-white shrink-0" />
      <span className="text-gray-500 text-sm shrink-0 w-24">{label}</span>
      {badgeClass ? (
        <span className={`px-2 py-0.5 rounded text-xs font-medium border capitalize ${badgeClass}`}>
          {value}
        </span>
      ) : (
        <span className="text-gray-300 text-sm break-all">{value}</span>
      )}
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  disabled = false,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 border bg-admin-panel hover:bg-white/5 text-gray-300 hover:text-white border-admin-border"
    >
      <Icon className="w-3.5 h-3.5 text-white" />
      {label}
    </button>
  );
}

function TransacaoSection({
  title,
  empty,
  count,
  total,
  icon: Icon,
  children,
}: {
  title: string;
  empty: string;
  count: number;
  total: number;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-white" />
        <h3 className="text-white font-semibold">{title}</h3>
        <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-medium bg-white/5 text-gray-400 border border-admin-border">
          {total}
        </span>
      </div>
      {count === 0 ? (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-admin-border bg-admin-panel">
          <Icon className="w-5 h-5 text-white opacity-40" />
          <p className="text-gray-500 text-sm">{empty}</p>
        </div>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </div>
  );
}

function TransacaoRow({
  icon: Icon,
  label,
  value,
  status,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  status: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-admin-border bg-admin-panel">
      <div className="w-9 h-9 rounded-lg bg-white/5 border border-admin-border flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-gray-500 text-xs truncate">{label}</p>
        <p className="text-white font-medium text-sm">{value}</p>
      </div>
      <span
        className={`px-2.5 py-0.5 rounded-md text-xs font-medium border shrink-0 capitalize ${getTransacaoBadge()}`}
      >
        {status}
      </span>
    </div>
  );
}

