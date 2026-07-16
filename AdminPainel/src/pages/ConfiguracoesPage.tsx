import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { ArrowDownCircle, ArrowUpCircle, Loader2, Repeat, Save, Settings, Users } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import LoadingState from '../components/ui/LoadingState';
import PagePanel from '../components/ui/PagePanel';
import FormField from '../components/ui/FormField';

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
        showToast('Erro ao carregar configurações. Execute site_config.sql.', 'error');
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
      'Depósito mínimo de indicação'
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

  return (
    <div className="max-w-2xl">
      <PageHeader
        icon={Settings}
        title="Configurações"
        description="Defina os limites mínimos e máximos para depósitos e saques na plataforma."
      />

      <div className="space-y-6">
        {/* Depósitos */}
        <PagePanel>
          <div className="flex items-center gap-3 mb-5">
            <ArrowUpCircle className="w-5 h-5 text-admin-foreground" />
            <h2 className="text-white text-lg font-semibold">Configurações de Depósito</h2>
          </div>

          <div className="space-y-4">
            <FormField
              label="Depósito Mínimo (R$)"
              required
              hint="Valor mínimo permitido para depósitos."
              type="number"
              min="1"
              step="1"
              value={depositoForm.minimo}
              onChange={(v) => setDepositoForm({ ...depositoForm, minimo: v })}
            />
            <FormField
              label="Depósito Máximo (R$)"
              required
              hint="Valor máximo permitido para depósitos."
              type="number"
              min="1"
              step="1"
              value={depositoForm.maximo}
              onChange={(v) => setDepositoForm({ ...depositoForm, maximo: v })}
            />
          </div>
        </PagePanel>

        {/* Saques */}
        <PagePanel>
          <div className="flex items-center gap-3 mb-5">
            <ArrowDownCircle className="w-5 h-5 text-admin-foreground" />
            <h2 className="text-white text-lg font-semibold">Configurações de Saque</h2>
          </div>

          <div className="space-y-4">
            <FormField
              label="Saque Mínimo (R$)"
              required
              hint="Valor mínimo permitido para saques."
              type="number"
              min="1"
              step="1"
              value={saqueForm.minimo}
              onChange={(v) => setSaqueForm({ ...saqueForm, minimo: v })}
            />
            <FormField
              label="Saque Máximo (R$)"
              required
              hint="Valor máximo permitido para saques."
              type="number"
              min="1"
              step="1"
              value={saqueForm.maximo}
              onChange={(v) => setSaqueForm({ ...saqueForm, maximo: v })}
            />
            <FormField
              label="Saques Diários Permitidos"
              required
              hint="Número máximo de saques permitidos por dia por usuário."
              type="number"
              min="1"
              step="1"
              value={saqueForm.diarios}
              onChange={(v) => setSaqueForm({ ...saqueForm, diarios: v })}
            />
          </div>
        </PagePanel>

        {/* Rollover */}
        <PagePanel>
          <div className="flex items-center gap-3 mb-5">
            <Repeat className="w-5 h-5 text-admin-foreground" />
            <h2 className="text-white text-lg font-semibold">Configurações de Rollover</h2>
          </div>

          <div className="space-y-4">
            <FormField
              label="Rollover Padrão (x)"
              required
              hint="Múltiplo padrão para rollover em depósitos. Ex.: 2x em depósito de R$ 50 exige R$ 100 em apostas para sacar. Use 0 para desativar."
              type="number"
              min="0"
              step="1"
              value={rolloverForm.padrao}
              onChange={(v) => setRolloverForm({ ...rolloverForm, padrao: v })}
            />
          </div>
        </PagePanel>

        {/* Indique e Ganhe */}
        <PagePanel>
          <div className="flex items-center gap-3 mb-5">
            <Users className="w-5 h-5 text-admin-foreground" />
            <h2 className="text-white text-lg font-semibold">Indique e Ganhe</h2>
          </div>

          <div className="space-y-4">
            <FormField
              label="Recompensa do Indicador (R$)"
              required
              hint="Valor que o player recebe quando seu indicado faz o primeiro depósito. A recompensa vai direto para a carteira comum (pode sacar). Use 0 para desativar."
              type="number"
              min="0"
              step="0.01"
              value={indicacaoForm.recompensa}
              onChange={(v) => setIndicacaoForm({ ...indicacaoForm, recompensa: v })}
            />
            <FormField
              label="Depósito Mínimo (R$)"
              required
              hint="Valor mínimo do primeiro depósito do indicado para validar a indicação."
              type="number"
              min="0"
              step="0.01"
              value={indicacaoForm.depositoMinimo}
              onChange={(v) => setIndicacaoForm({ ...indicacaoForm, depositoMinimo: v })}
            />
          </div>
        </PagePanel>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-admin-accent hover:bg-admin-accent-hover text-[#0d0e10] text-sm font-medium disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Salvando...' : 'Salvar configurações'}
        </button>
      </div>
    </div>
  );
}
