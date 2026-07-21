import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Repeat,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import LoadingState from '../components/ui/LoadingState';
import PagePanel from '../components/ui/PagePanel';
import FormField from '../components/ui/FormField';
import Button from '../components/ui/Button';

interface PlataformaConfig {
  deposito_minimo: number;
  deposito_maximo: number;
  saque_minimo: number;
  saque_maximo: number;
  saques_diarios_permitidos: number;
  rollover_padrao: number;
  indicacao_recompensa: number;
  indicacao_deposito_minimo: number;
}

function formatCurrency(value: string) {
  const n = Number(value.replace(',', '.').trim());
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function ConfigSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <PagePanel className="h-full">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-9 h-9 rounded-lg bg-admin-accent/12 border border-admin-accent/20 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-admin-foreground" />
        </div>
        <div>
          <h2 className="text-white text-base font-semibold">{title}</h2>
          <p className="text-gray-400 text-sm mt-0.5">{description}</p>
        </div>
      </div>
      {children}
    </PagePanel>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-admin-border last:border-0">
      <span className="text-gray-500 text-sm">{label}</span>
      <span className="text-white text-sm font-medium text-right">{value}</span>
    </div>
  );
}

export default function ConfiguracoesPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [depositoForm, setDepositoForm] = useState({ minimo: '20', maximo: '1000000' });
  const [saqueForm, setSaqueForm] = useState({ minimo: '50', maximo: '1000000', diarios: '1' });
  const [rolloverForm, setRolloverForm] = useState({ padrao: '1' });
  const [indicacaoForm, setIndicacaoForm] = useState({ recompensa: '100', depositoMinimo: '50' });

  const loadConfig = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('obter_config_plataforma');

      if (error) {
        console.error(error);
        showToast('Erro ao carregar configurações. Execute deploy/supabase_nova_casa.sql no Supabase.', 'error');
        return;
      }

      const result = data as { ok: boolean } & PlataformaConfig;
      if (result?.ok) {
        setDepositoForm({
          minimo: String(result.deposito_minimo),
          maximo: String(result.deposito_maximo),
        });
        setSaqueForm({
          minimo: String(result.saque_minimo),
          maximo: String(result.saque_maximo),
          diarios: String(result.saques_diarios_permitidos ?? 1),
        });
        setRolloverForm({
          padrao: String(result.rollover_padrao ?? 1),
        });
        setIndicacaoForm({
          recompensa: String(result.indicacao_recompensa ?? 100),
          depositoMinimo: String(result.indicacao_deposito_minimo ?? 50),
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadConfig();
  }, []);

  const parseValue = (raw: string, label: string): number | null => {
    const n = Number(raw.replace(',', '.').trim());
    if (!Number.isFinite(n) || n <= 0) {
      showToast(`${label} deve ser um valor maior que zero.`, 'error');
      return null;
    }
    return n;
  };

  const parseIntValue = (raw: string, label: string): number | null => {
    const n = Number.parseInt(raw.trim(), 10);
    if (!Number.isFinite(n) || n < 1) {
      showToast(`${label} deve ser um número inteiro maior que zero.`, 'error');
      return null;
    }
    return n;
  };

  const parseRollover = (raw: string, label: string): number | null => {
    const n = Number(raw.replace(',', '.').trim());
    if (!Number.isFinite(n) || n < 0) {
      showToast(`${label} deve ser zero ou um valor positivo.`, 'error');
      return null;
    }
    return n;
  };

  const parseNonNegative = (raw: string, label: string): number | null => {
    const n = Number(raw.replace(',', '.').trim());
    if (!Number.isFinite(n) || n < 0) {
      showToast(`${label} deve ser zero ou um valor positivo.`, 'error');
      return null;
    }
    return n;
  };

  const handleSave = async () => {
    const depositoMin = parseValue(depositoForm.minimo, 'Depósito mínimo');
    if (depositoMin === null) return;
    const depositoMax = parseValue(depositoForm.maximo, 'Depósito máximo');
    if (depositoMax === null) return;
    const saqueMin = parseValue(saqueForm.minimo, 'Saque mínimo');
    if (saqueMin === null) return;
    const saqueMax = parseValue(saqueForm.maximo, 'Saque máximo');
    if (saqueMax === null) return;
    const saquesDiarios = parseIntValue(saqueForm.diarios, 'Saques diários permitidos');
    if (saquesDiarios === null) return;
    const rolloverPadrao = parseRollover(rolloverForm.padrao, 'Rollover padrão');
    if (rolloverPadrao === null) return;
    const indicacaoRecompensa = parseNonNegative(indicacaoForm.recompensa, 'Recompensa do indicador');
    if (indicacaoRecompensa === null) return;
    const indicacaoDepositoMin = parseNonNegative(
      indicacaoForm.depositoMinimo,
      'Depósito mínimo de indicação',
    );
    if (indicacaoDepositoMin === null) return;

    if (depositoMin > depositoMax) {
      showToast('Depósito mínimo não pode ser maior que o máximo.', 'error');
      return;
    }
    if (saqueMin > saqueMax) {
      showToast('Saque mínimo não pode ser maior que o máximo.', 'error');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('atualizar_config_plataforma_admin', {
        p_deposito_minimo: depositoMin,
        p_deposito_maximo: depositoMax,
        p_saque_minimo: saqueMin,
        p_saque_maximo: saqueMax,
        p_saques_diarios_permitidos: saquesDiarios,
        p_rollover_padrao: rolloverPadrao,
        p_indicacao_recompensa: indicacaoRecompensa,
        p_indicacao_deposito_minimo: indicacaoDepositoMin,
      });

      if (error) {
        showToast('Erro ao salvar configurações.', 'error');
        return;
      }

      const result = data as { ok: boolean; error?: string };
      if (!result?.ok) {
        showToast(result?.error || 'Erro ao salvar configurações.', 'error');
        return;
      }

      showToast('Configurações salvas com sucesso!', 'success');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState message="Carregando configurações..." />;
  }

  const rolloverValue = Number(rolloverForm.padrao.replace(',', '.').trim());
  const rolloverSummary =
    Number.isFinite(rolloverValue) && rolloverValue === 0
      ? 'Desativado'
      : Number.isFinite(rolloverValue)
        ? `${rolloverValue}x`
        : '—';

  return (
    <div>
      <PageHeader
        icon={Settings}
        title="Configurações da Plataforma"
        description="Limites financeiros, rollover e regras do programa Indique e Ganhe."
        actions={
          <Button onClick={handleSave} loading={saving}>
            Salvar configurações
          </Button>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5">
          <ConfigSection
            icon={ArrowUpCircle}
            title="Depósitos"
            description="Valores mínimo e máximo aceitos na plataforma."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="Mínimo (R$)"
                required
                hint="Valor mínimo por depósito."
                type="number"
                min="1"
                step="1"
                value={depositoForm.minimo}
                onChange={(v) => setDepositoForm({ ...depositoForm, minimo: v })}
              />
              <FormField
                label="Máximo (R$)"
                required
                hint="Valor máximo por depósito."
                type="number"
                min="1"
                step="1"
                value={depositoForm.maximo}
                onChange={(v) => setDepositoForm({ ...depositoForm, maximo: v })}
              />
            </div>
          </ConfigSection>

          <ConfigSection
            icon={ArrowDownCircle}
            title="Saques"
            description="Limites de valor e quantidade diária por usuário."
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="Mínimo (R$)"
                  required
                  hint="Valor mínimo por saque."
                  type="number"
                  min="1"
                  step="1"
                  value={saqueForm.minimo}
                  onChange={(v) => setSaqueForm({ ...saqueForm, minimo: v })}
                />
                <FormField
                  label="Máximo (R$)"
                  required
                  hint="Valor máximo por saque."
                  type="number"
                  min="1"
                  step="1"
                  value={saqueForm.maximo}
                  onChange={(v) => setSaqueForm({ ...saqueForm, maximo: v })}
                />
              </div>
              <FormField
                label="Saques diários permitidos"
                required
                hint="Quantidade máxima de saques por usuário por dia."
                type="number"
                min="1"
                step="1"
                value={saqueForm.diarios}
                onChange={(v) => setSaqueForm({ ...saqueForm, diarios: v })}
              />
            </div>
          </ConfigSection>

          <ConfigSection
            icon={Repeat}
            title="Rollover"
            description="Múltiplo exigido em apostas antes de liberar saque."
          >
            <FormField
              label="Rollover padrão (x)"
              required
              hint="Ex.: 2x em depósito de R$ 50 exige R$ 100 em apostas. Use 0 para desativar."
              type="number"
              min="0"
              step="1"
              value={rolloverForm.padrao}
              onChange={(v) => setRolloverForm({ ...rolloverForm, padrao: v })}
            />
          </ConfigSection>

          <ConfigSection
            icon={Users}
            title="Indique e Ganhe"
            description="Recompensa do indicador e depósito mínimo do indicado."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="Recompensa (R$)"
                required
                hint="Creditada na carteira comum. Use 0 para desativar."
                type="number"
                min="0"
                step="0.01"
                value={indicacaoForm.recompensa}
                onChange={(v) => setIndicacaoForm({ ...indicacaoForm, recompensa: v })}
              />
              <FormField
                label="Depósito mínimo (R$)"
                required
                hint="Primeiro depósito do indicado para validar."
                type="number"
                min="0"
                step="0.01"
                value={indicacaoForm.depositoMinimo}
                onChange={(v) => setIndicacaoForm({ ...indicacaoForm, depositoMinimo: v })}
              />
            </div>
          </ConfigSection>
        </div>

        <div className="xl:col-span-1">
          <PagePanel className="xl:sticky xl:top-24">
            <h3 className="text-white font-semibold mb-1">Resumo atual</h3>
            <p className="text-gray-400 text-sm mb-4">
              Valores que serão aplicados após salvar.
            </p>

            <div className="rounded-lg border border-admin-border bg-admin-panel/50 px-4 py-1">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 pt-3 pb-1">
                Depósitos
              </p>
              <SummaryRow
                label="Faixa permitida"
                value={`${formatCurrency(depositoForm.minimo)} — ${formatCurrency(depositoForm.maximo)}`}
              />

              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 pt-3 pb-1">
                Saques
              </p>
              <SummaryRow
                label="Faixa permitida"
                value={`${formatCurrency(saqueForm.minimo)} — ${formatCurrency(saqueForm.maximo)}`}
              />
              <SummaryRow label="Por dia / usuário" value={`${saqueForm.diarios || '—'} saque(s)`} />

              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 pt-3 pb-1">
                Rollover
              </p>
              <SummaryRow label="Padrão" value={rolloverSummary} />

              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 pt-3 pb-1">
                Indique e Ganhe
              </p>
              <SummaryRow label="Recompensa" value={formatCurrency(indicacaoForm.recompensa)} />
              <SummaryRow
                label="Depósito mínimo"
                value={formatCurrency(indicacaoForm.depositoMinimo)}
              />
            </div>

            <div className="mt-5 pt-4 border-t border-admin-border">
              <Button onClick={handleSave} loading={saving} className="w-full">
                Salvar configurações
              </Button>
            </div>
          </PagePanel>
        </div>
      </div>
    </div>
  );
}
