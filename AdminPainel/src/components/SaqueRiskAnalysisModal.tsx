import { useEffect, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Gamepad2,
  History,
  Loader2,
  ShieldAlert,
  User,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Modal from './ui/Modal';

interface SaqueRiskAnalysisModalProps {
  saqueId: string | null;
  onClose: () => void;
}

interface FatorRisco {
  titulo: string;
  descricao: string;
}

interface IndicadorPositivo {
  titulo: string;
  descricao: string;
  pontos: number;
}

interface JogoRecente {
  jogo: string;
  provedor: string;
  valor: number;
  retorno: number;
  tipo: string;
  data: string;
}

interface HistoricoSaque {
  id: string;
  valor: number;
  status: string;
  data_hora: string;
}

interface AnaliseRiscoData {
  ok: boolean;
  error?: string;
  usuario?: { email: string; nome: string };
  analise?: {
    score: number;
    nivel: string;
    recomendacao: string;
    descricao: string;
    fatores_risco: FatorRisco[];
    indicadores_positivos: IndicadorPositivo[];
  };
  saque_info?: {
    valor_solicitado: number;
    media_anterior: number;
    multiplo_media: number;
    pct_saldo: number;
    solicitado_em: string;
  };
  perfil?: {
    dias_registrado: number;
    total_depositado: number;
    total_sacado: number;
    ultimo_login: string | null;
    depositos_regulares: number;
    depositos_internos: number;
    documento_fornecido: boolean;
    telefone_fornecido: boolean;
  };
  carteira?: {
    saldo_atual: number;
    reservado_saques: number;
    total_depositado: number;
    total_sacado: number;
  };
  jogos?: {
    total_apostas: number;
    total_vitorias: number;
    win_rate: number;
    aposta_media: number;
    maior_vitoria: number;
    sessao_mais_longa: string;
    total_apostado: number;
    total_ganho: number;
    resultado_liquido_jogador: number;
  };
  jogos_recentes?: JogoRecente[];
  historico_saques?: HistoricoSaque[];
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDateTime = (value: string | null) => {
  if (!value) return 'Nunca';
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const timeAgo = (value: string) => {
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} dias atrás`;
  return formatDateTime(value);
};

const getRiskColor = (score: number) => {
  if (score <= 25) {
    return {
      ring: 'stroke-green-500',
      text: 'text-admin-success',
      bg: 'bg-green-600/15',
      border: 'border-green-600/30',
    };
  }
  if (score <= 50) {
    return {
      ring: 'stroke-amber-500',
      text: 'text-admin-warning',
      bg: 'bg-amber-600/15',
      border: 'border-amber-600/30',
    };
  }
  if (score <= 75) {
    return {
      ring: 'stroke-orange-500',
      text: 'text-admin-warning',
      bg: 'bg-orange-600/15',
      border: 'border-orange-600/30',
    };
  }
  return {
    ring: 'stroke-red-500',
    text: 'text-admin-danger',
    bg: 'bg-red-600/15',
    border: 'border-red-600/30',
  };
};

const getStatusLabel = (status: string) => {
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
    default:
      return 'bg-gray-600/20 text-gray-300 border-admin-border-strong/30';
  }
};

function ScoreRing({ score }: { score: number }) {
  const colors = getRiskColor(score);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-28 h-28 shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#374151" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          className={colors.ring}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white">{score}</span>
        <span className="text-gray-500 text-xs">/100</span>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-gray-500 text-xs mb-0.5">{label}</p>
      <p className="text-white text-sm font-medium">{value}</p>
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

export default function SaqueRiskAnalysisModal({ saqueId, onClose }: SaqueRiskAnalysisModalProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AnaliseRiscoData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!saqueId) {
      setData(null);
      setError(null);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: result, error: rpcError } = await supabase.rpc('obter_analise_risco_saque_admin', {
          p_saque_id: saqueId,
        });

        if (rpcError) {
          console.error(rpcError);
          setError('Erro ao carregar análise. Execute saques_risco_admin.sql no Supabase.');
          return;
        }

        const parsed = result as AnaliseRiscoData;
        if (!parsed?.ok) {
          setError(parsed?.error || 'Erro ao carregar análise de risco.');
          return;
        }

        setData(parsed);
      } catch {
        setError('Erro ao carregar análise de risco.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [saqueId]);

  const analise = data?.analise;
  const colors = analise ? getRiskColor(analise.score) : getRiskColor(0);

  return (
    <Modal
      open={!!saqueId}
      onClose={onClose}
      title="Análise de Risco"
      description={data?.usuario?.email ? `(${data.usuario.email})` : undefined}
      icon={ShieldAlert}
      size="xl"
    >
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3">
          <Loader2 className="w-6 h-6 text-admin-foreground animate-spin" />
          <p className="text-gray-400 text-sm">Calculando análise de risco...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <AlertTriangle className="w-10 h-10 text-admin-foreground mx-auto mb-3" />
          <p className="text-admin-danger text-sm">{error}</p>
        </div>
      ) : data && analise ? (
        <div className="space-y-6">
          <div className={`flex flex-col sm:flex-row items-center gap-5 p-5 rounded-xl border ${colors.bg} ${colors.border}`}>
            <ScoreRing score={analise.score} />
            <div className="flex-1 text-center sm:text-left">
              <p className={`text-xl font-bold mb-1 ${colors.text}`}>{analise.nivel}</p>
              <p className="text-white font-medium text-sm mb-1">{analise.recomendacao}</p>
              <p className="text-gray-400 text-sm">{analise.descricao}</p>
            </div>
          </div>

          <div className="rounded-xl border border-admin-border bg-admin-panel p-4">
            <SectionTitle icon={Wallet}>Sobre este saque</SectionTitle>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <InfoItem label="Valor solicitado" value={formatCurrency(data.saque_info?.valor_solicitado ?? 0)} />
              <InfoItem label="vs média anterior" value={`${data.saque_info?.multiplo_media ?? 0}x`} />
              <InfoItem label="média anterior" value={formatCurrency(data.saque_info?.media_anterior ?? 0)} />
              <InfoItem label="% do saldo total" value={`${data.saque_info?.pct_saldo ?? 0}%`} />
              <InfoItem label="Solicitado em" value={formatDateTime(data.saque_info?.solicitado_em ?? null)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-admin-border bg-admin-panel p-4">
              <SectionTitle icon={AlertTriangle}>Fatores de risco</SectionTitle>
              {analise.fatores_risco.length === 0 ? (
                <p className="text-gray-500 text-sm">Nenhum fator de risco detectado</p>
              ) : (
                <div className="space-y-2">
                  {analise.fatores_risco.map((fator, i) => (
                    <div key={i} className="p-3 rounded-lg bg-red-600/10 border border-red-600/20">
                      <p className="text-admin-danger text-sm font-medium">{fator.titulo}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{fator.descricao}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-admin-border bg-admin-panel p-4">
              <SectionTitle icon={CheckCircle2}>Indicadores positivos</SectionTitle>
              {analise.indicadores_positivos.length === 0 ? (
                <p className="text-gray-500 text-sm">Nenhum indicador positivo identificado</p>
              ) : (
                <div className="space-y-2">
                  {analise.indicadores_positivos.map((ind, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-green-600/10 border border-green-600/20">
                      <div className="flex-1 min-w-0">
                        <p className="text-admin-success text-sm font-medium">{ind.titulo}</p>
                        <p className="text-gray-400 text-xs mt-0.5">{ind.descricao}</p>
                      </div>
                      <span className="text-admin-success text-sm font-bold shrink-0">{ind.pontos}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-admin-border bg-admin-panel p-4">
              <SectionTitle icon={User}>Perfil do Usuário</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                <InfoItem label="Dias registrado" value={`${data.perfil?.dias_registrado ?? 0} dias`} />
                <InfoItem label="Total depositado" value={formatCurrency(data.perfil?.total_depositado ?? 0)} />
                <InfoItem label="Total sacado" value={formatCurrency(data.perfil?.total_sacado ?? 0)} />
                <InfoItem label="Último login" value={formatDateTime(data.perfil?.ultimo_login ?? null)} />
                <InfoItem label="Depósitos regulares" value={formatCurrency(data.perfil?.depositos_regulares ?? 0)} />
                <InfoItem label="Depósitos internos" value={formatCurrency(data.perfil?.depositos_internos ?? 0)} />
                <InfoItem
                  label="Documento"
                  value={data.perfil?.documento_fornecido ? '✓ Fornecido' : '✗ Não fornecido'}
                />
                <InfoItem
                  label="Telefone"
                  value={data.perfil?.telefone_fornecido ? '✓ Fornecido' : '✗ Não fornecido'}
                />
              </div>
            </div>

            <div className="rounded-xl border border-admin-border bg-admin-panel p-4">
              <SectionTitle icon={Wallet}>Carteira</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                <InfoItem label="Saldo atual" value={formatCurrency(data.carteira?.saldo_atual ?? 0)} />
                <InfoItem label="Reservado em saques" value={formatCurrency(data.carteira?.reservado_saques ?? 0)} />
                <InfoItem label="Total depositado" value={formatCurrency(data.carteira?.total_depositado ?? 0)} />
                <InfoItem label="Total sacado" value={formatCurrency(data.carteira?.total_sacado ?? 0)} />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-admin-border bg-admin-panel p-4">
            <SectionTitle icon={Gamepad2}>Estatísticas de jogos</SectionTitle>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <InfoItem label="Total de apostas" value={(data.jogos?.total_apostas ?? 0).toString()} />
              <InfoItem label="Total de vitórias" value={(data.jogos?.total_vitorias ?? 0).toString()} />
              <InfoItem label="Win rate" value={`${data.jogos?.win_rate ?? 0}%`} />
              <InfoItem label="Aposta média" value={formatCurrency(data.jogos?.aposta_media ?? 0)} />
              <InfoItem label="Maior vitória" value={formatCurrency(data.jogos?.maior_vitoria ?? 0)} />
              <InfoItem label="Sessão mais longa" value={data.jogos?.sessao_mais_longa ?? '—'} />
              <InfoItem label="Total apostado" value={formatCurrency(data.jogos?.total_apostado ?? 0)} />
              <InfoItem label="Total ganho" value={formatCurrency(data.jogos?.total_ganho ?? 0)} />
              <InfoItem
                label="Resultado líquido (jogador)"
                value={formatCurrency(data.jogos?.resultado_liquido_jogador ?? 0)}
              />
            </div>
          </div>

          <div className="rounded-xl border border-admin-border bg-admin-panel p-4">
            <SectionTitle icon={Gamepad2}>Jogos recentes</SectionTitle>
            {(data.jogos_recentes?.length ?? 0) === 0 ? (
              <p className="text-gray-500 text-sm">Nenhum jogo recente</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {data.jogos_recentes?.map((jogo, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg bg-admin-panel border border-admin-border"
                  >
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{jogo.jogo}</p>
                      <p className="text-gray-500 text-xs">
                        {jogo.provedor} · {timeAgo(jogo.data)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-gray-300 text-sm">Aposta {formatCurrency(jogo.valor)}</p>
                      <p className={`text-xs ${jogo.tipo === 'Ganhou' ? 'text-admin-success' : 'text-gray-500'}`}>
                        {jogo.tipo === 'Ganhou' ? `Ganho ${formatCurrency(jogo.retorno)}` : 'Sem ganho'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-admin-border bg-admin-panel p-4">
            <SectionTitle icon={History}>Histórico de saques</SectionTitle>
            {(data.historico_saques?.length ?? 0) === 0 ? (
              <p className="text-gray-500 text-sm">Nenhum saque anterior</p>
            ) : (
              <div className="space-y-2">
                {data.historico_saques?.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg bg-admin-panel border border-admin-border"
                  >
                    <div>
                      <p className="text-white font-medium text-sm">{formatCurrency(h.valor)}</p>
                      <p className="text-gray-500 text-xs">{timeAgo(h.data_hora)}</p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-md text-xs font-medium border ${getStatusBadge(h.status)}`}>
                      {getStatusLabel(h.status)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
