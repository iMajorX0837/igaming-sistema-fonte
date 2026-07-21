import { useEffect, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowUpCircle,
  Loader2,
  RefreshCw,
  User,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Modal from './ui/Modal';

interface DepositoDetalhesModalProps {
  depositoId: string | null;
  onClose: () => void;
}

interface DepositoDetalhesData {
  ok: boolean;
  error?: string;
  deposito?: {
    id: string;
    valor: number;
    status: string;
    origem: string;
    status_display: string;
    data_hora: string;
    created_at: string;
    updated_at: string;
  };
  rollover?: {
    aplicado: number;
    multiplicador: number;
    data_aplicacao: string;
    acao: string;
    data_inicio: string;
  } | null;
  usuario?: {
    id: string;
    nome: string;
    usuario: string | null;
    email: string;
  };
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDateTime = (dateString: string | null | undefined) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const shortId = (id: string) => id.replace(/-/g, '').slice(0, 24);

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

function InfoItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-gray-500 text-xs mb-0.5">{label}</p>
      <div className="text-white text-sm font-medium">{value}</div>
    </div>
  );
}

function SectionTitle({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <h4 className="flex items-center gap-2 text-white font-semibold text-sm mb-3">
      <Icon className="w-4 h-4 text-admin-foreground" />
      {children}
    </h4>
  );
}

export default function DepositoDetalhesModal({ depositoId, onClose }: DepositoDetalhesModalProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DepositoDetalhesData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!depositoId) {
      setData(null);
      setError(null);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: result, error: rpcError } = await supabase.rpc('obter_detalhes_deposito_admin', {
          p_deposito_id: depositoId,
        });

        if (rpcError) {
          console.error(rpcError);
          setError('Erro ao carregar detalhes. Execute deploy/supabase_nova_casa.sql no Supabase.');
          return;
        }

        const parsed = result as DepositoDetalhesData;
        if (!parsed?.ok) {
          setError(parsed?.error || 'Erro ao carregar detalhes do depósito.');
          return;
        }

        setData(parsed);
      } catch {
        setError('Erro ao carregar detalhes do depósito.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [depositoId]);

  const deposito = data?.deposito;
  const rollover = data?.rollover;
  const usuario = data?.usuario;

  return (
    <Modal
      open={!!depositoId}
      onClose={onClose}
      title="Detalhes do Depósito"
      icon={ArrowUpCircle}
      size="lg"
    >
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3">
          <Loader2 className="w-6 h-6 text-admin-foreground animate-spin" />
          <p className="text-gray-400 text-sm">Carregando detalhes...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <AlertTriangle className="w-10 h-10 text-admin-foreground mx-auto mb-3" />
          <p className="text-admin-danger text-sm">{error}</p>
        </div>
      ) : deposito && usuario ? (
        <div className="space-y-5">
          <div className="rounded-xl border border-admin-border bg-admin-panel p-4">
            <SectionTitle icon={Wallet}>Detalhes do Depósito</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoItem label="ID do Depósito" value={<span className="font-mono text-xs">{shortId(deposito.id)}</span>} />
              <InfoItem label="Data" value={formatDateTime(deposito.data_hora || deposito.created_at)} />
              <InfoItem label="Valor" value={formatCurrency(deposito.valor || 0)} />
              <InfoItem
                label="Status"
                value={
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadge(deposito.status, deposito.origem)}`}
                  >
                    {deposito.status_display}
                  </span>
                }
              />
            </div>
          </div>

          {rollover ? (
            <div className="rounded-xl border border-admin-border bg-admin-panel p-4">
              <SectionTitle icon={RefreshCw}>Informações de Rollover</SectionTitle>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoItem label="Rollover Aplicado" value={formatCurrency(rollover.aplicado)} />
                <InfoItem label="Multiplicador" value={`${rollover.multiplicador}x`} />
                <InfoItem label="Data de Aplicação" value={formatDateTime(rollover.data_aplicacao)} />
                <InfoItem label="Ação" value={rollover.acao} />
                <InfoItem label="Data de Início do Rollover" value={formatDateTime(rollover.data_inicio)} />
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-admin-border bg-admin-panel p-4">
              <SectionTitle icon={RefreshCw}>Informações de Rollover</SectionTitle>
              <p className="text-gray-500 text-sm">Rollover não aplicado neste depósito.</p>
            </div>
          )}

          <div className="rounded-xl border border-admin-border bg-admin-panel p-4">
            <SectionTitle icon={User}>Informações do Usuário</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoItem label="ID do Usuário" value={<span className="font-mono text-xs">{shortId(usuario.id)}</span>} />
              <InfoItem
                label="Nome"
                value={
                  <div>
                    <p>{usuario.nome}</p>
                    {usuario.usuario && <p className="text-gray-400 text-xs font-normal mt-0.5">{usuario.usuario}</p>}
                  </div>
                }
              />
              <InfoItem label="Email" value={usuario.email} />
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
