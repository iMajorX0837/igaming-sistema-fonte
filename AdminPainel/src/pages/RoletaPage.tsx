import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import PageHeader from '../components/PageHeader';
import LoadingState from '../components/ui/LoadingState';
import EmptyState from '../components/ui/EmptyState';
import PagePanel from '../components/ui/PagePanel';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';
import {
  CircleDot,
  Image as ImageIcon,
  Pencil,
  Plus,
  Power,
  Settings2,
  Trash2,
} from 'lucide-react';
import { ADMIN_IMAGE_SIZES } from '../lib/adminImageSizes';
import type { AdminImageSizeSpec } from '../lib/adminImageSizes';
import ImageSizeHint from '../components/ui/ImageSizeHint';

type TabKey = 'config' | 'segmentos';
type StatusFilter = 'all' | 'active' | 'inactive';

interface WheelConfig {
  id: number;
  ativo: boolean;
  titulo_imagem_url: string | null;
  banner_imagem_url: string | null;
  roleta_imagem_url: string | null;
  widget_imagem_url: string | null;
  centro_imagem_url: string | null;
  giros_por_periodo: number;
  cooldown_horas: number;
}

interface CupomOption {
  id: string;
  nome_admin: string;
  codigo: string;
  valor: number;
  jogo_nome: string | null;
  deposito_minimo: number | null;
}

interface WheelSegment {
  id: string;
  nome_admin: string;
  label: string;
  cupom_id: string;
  peso: number;
  ordem: number;
  ativo: boolean;
  cupom?: CupomOption;
}

const defaultConfigForm = {
  ativo: true,
  titulo_imagem_url: '',
  banner_imagem_url: '',
  roleta_imagem_url: '',
  widget_imagem_url: '',
  centro_imagem_url: '',
  giros_por_periodo: '1',
  cooldown_horas: '24',
};

const emptySegmentForm = {
  nome_admin: '',
  label: '',
  cupom_id: '',
  peso: '1',
  ordem: '1',
  ativo: true,
};

const IMAGE_FIELDS = [
  { key: 'titulo_imagem_url' as const, label: 'Título', size: ADMIN_IMAGE_SIZES.roletaTitulo },
  { key: 'banner_imagem_url' as const, label: 'Banner prêmio', size: ADMIN_IMAGE_SIZES.roletaBanner },
  { key: 'roleta_imagem_url' as const, label: 'Disco da roleta', size: ADMIN_IMAGE_SIZES.roletaDisco },
  { key: 'widget_imagem_url' as const, label: 'Widget flutuante', size: ADMIN_IMAGE_SIZES.roletaWidget },
  { key: 'centro_imagem_url' as const, label: 'Botão girar', size: ADMIN_IMAGE_SIZES.roletaCentro },
];

const TABS: { key: TabKey; label: string; icon: typeof Settings2; description: string }[] = [
  {
    key: 'config',
    label: 'Configuração',
    icon: Settings2,
    description: 'Status, limites de giro e imagens da roleta de prêmios.',
  },
  {
    key: 'segmentos',
    label: 'Segmentos',
    icon: CircleDot,
    description: 'Prêmios da roleta vinculados a cupons de rodadas grátis.',
  },
];

export default function RoletaPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>('config');
  const [configForm, setConfigForm] = useState(defaultConfigForm);
  const [segments, setSegments] = useState<WheelSegment[]>([]);
  const [cupons, setCupons] = useState<CupomOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editSegmentForm, setEditSegmentForm] = useState(emptySegmentForm);
  const [isCreatingSegment, setIsCreatingSegment] = useState(false);
  const [createSegmentForm, setCreateSegmentForm] = useState(emptySegmentForm);
  const [deletingSegmentId, setDeletingSegmentId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [configRes, segmentsRes, cuponsRes] = await Promise.all([
        supabase.from('prize_wheel_config').select('*').eq('id', 1).maybeSingle(),
        supabase
          .from('prize_wheel_segments')
          .select('*, cupom:cupons(id, nome_admin, codigo, valor, jogo_nome, deposito_minimo)')
          .order('ordem', { ascending: true }),
        supabase
          .from('cupons')
          .select('id, nome_admin, codigo, valor, jogo_nome, deposito_minimo')
          .eq('ativo', true)
          .eq('tipo_bonus', 'giros_gratis')
          .order('nome_admin'),
      ]);

      if (configRes.error) {
        setError('Execute prize_wheel.sql e prize_wheel_rpc.sql no Supabase.');
        return;
      }

      if (configRes.data) {
        const row = configRes.data as WheelConfig;
        setConfigForm({
          ativo: row.ativo,
          titulo_imagem_url: row.titulo_imagem_url ?? '',
          banner_imagem_url: row.banner_imagem_url ?? '',
          roleta_imagem_url: row.roleta_imagem_url ?? '',
          widget_imagem_url: row.widget_imagem_url ?? '',
          centro_imagem_url: row.centro_imagem_url ?? '',
          giros_por_periodo: String(row.giros_por_periodo),
          cooldown_horas: String(row.cooldown_horas),
        });
      }

      if (segmentsRes.error) {
        setError('Erro ao carregar segmentos da roleta.');
        return;
      }

      setSegments(
        ((segmentsRes.data || []) as Record<string, unknown>[]).map((row) => {
          const cupomRaw = row.cupom;
          const cupom = Array.isArray(cupomRaw) ? cupomRaw[0] : cupomRaw;
          return {
            id: String(row.id),
            nome_admin: String(row.nome_admin || ''),
            label: String(row.label || ''),
            cupom_id: String(row.cupom_id || ''),
            peso: Number(row.peso) || 1,
            ordem: Number(row.ordem) || 0,
            ativo: Boolean(row.ativo),
            cupom: cupom
              ? {
                  id: String((cupom as Record<string, unknown>).id),
                  nome_admin: String((cupom as Record<string, unknown>).nome_admin || ''),
                  codigo: String((cupom as Record<string, unknown>).codigo || ''),
                  valor: Number((cupom as Record<string, unknown>).valor) || 0,
                  jogo_nome: ((cupom as Record<string, unknown>).jogo_nome as string | null) ?? null,
                  deposito_minimo:
                    (cupom as Record<string, unknown>).deposito_minimo != null
                      ? Number((cupom as Record<string, unknown>).deposito_minimo)
                      : null,
                }
              : undefined,
          };
        }),
      );

      setCupons(
        ((cuponsRes.data || []) as Record<string, unknown>[]).map((row) => ({
          id: String(row.id),
          nome_admin: String(row.nome_admin || ''),
          codigo: String(row.codigo || ''),
          valor: Number(row.valor) || 0,
          jogo_nome: (row.jogo_nome as string | null) ?? null,
          deposito_minimo: row.deposito_minimo != null ? Number(row.deposito_minimo) : null,
        })),
      );
    } catch {
      setError('Erro ao carregar configuração da roleta.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filteredSegments = useMemo(() => {
    if (statusFilter === 'active') return segments.filter((s) => s.ativo);
    if (statusFilter === 'inactive') return segments.filter((s) => !s.ativo);
    return segments;
  }, [segments, statusFilter]);

  const segmentCounts = useMemo(
    () => ({
      all: segments.length,
      active: segments.filter((s) => s.ativo).length,
      inactive: segments.filter((s) => !s.ativo).length,
    }),
    [segments],
  );

  const modalBusy =
    editingSegmentId !== null || isCreatingSegment || saving || deletingSegmentId !== null;

  const toggleConfigAtivo = async () => {
    setSaving(true);
    try {
      const next = !configForm.ativo;
      const { error } = await supabase
        .from('prize_wheel_config')
        .update({ ativo: next, updated_at: new Date().toISOString() })
        .eq('id', 1);

      if (error) {
        showToast('Erro ao atualizar status da roleta.', 'error');
        return;
      }

      setConfigForm((current) => ({ ...current, ativo: next }));
      showToast(next ? 'Roleta ativada.' : 'Roleta desativada.', 'success');
    } finally {
      setSaving(false);
    }
  };

  const saveConfig = async () => {
    const girosPeriodo = Number(configForm.giros_por_periodo);
    const cooldown = Number(configForm.cooldown_horas);

    if (!Number.isInteger(girosPeriodo) || girosPeriodo < 1) {
      showToast('Giros por período deve ser pelo menos 1.', 'error');
      return;
    }
    if (!Number.isInteger(cooldown) || cooldown < 0) {
      showToast('Cooldown inválido.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ativo: configForm.ativo,
        titulo_imagem_url: configForm.titulo_imagem_url.trim() || null,
        banner_imagem_url: configForm.banner_imagem_url.trim() || null,
        roleta_imagem_url: configForm.roleta_imagem_url.trim() || null,
        widget_imagem_url: configForm.widget_imagem_url.trim() || null,
        centro_imagem_url: configForm.centro_imagem_url.trim() || null,
        giros_por_periodo: girosPeriodo,
        cooldown_horas: cooldown,
        updated_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabase
        .from('prize_wheel_config')
        .upsert({ id: 1, ...payload });

      if (upsertError) {
        showToast('Erro ao salvar configuração.', 'error');
        return;
      }

      showToast('Configuração salva!', 'success');
      await loadData();
    } catch {
      showToast('Erro ao salvar configuração.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const validateSegmentForm = (form: typeof emptySegmentForm) => {
    if (!form.nome_admin.trim()) {
      showToast('Informe o nome interno do segmento.', 'error');
      return false;
    }
    if (!form.label.trim()) {
      showToast('Informe o rótulo do segmento (ex: 85 GIROS).', 'error');
      return false;
    }
    if (!form.cupom_id) {
      showToast('Selecione um cupom de rodadas.', 'error');
      return false;
    }
    const peso = Number(form.peso);
    if (!Number.isInteger(peso) || peso < 1) {
      showToast('Peso deve ser um inteiro positivo.', 'error');
      return false;
    }
    const ordem = Number(form.ordem);
    if (!Number.isInteger(ordem) || ordem < 0) {
      showToast('Ordem inválida.', 'error');
      return false;
    }
    return true;
  };

  const buildSegmentPayload = (form: typeof emptySegmentForm) => ({
    nome_admin: form.nome_admin.trim(),
    label: form.label.trim().toUpperCase(),
    cupom_id: form.cupom_id,
    peso: Number(form.peso) || 1,
    ordem: Number(form.ordem) || 0,
    ativo: form.ativo,
    updated_at: new Date().toISOString(),
  });

  const saveCreateSegment = async () => {
    if (!validateSegmentForm(createSegmentForm)) return;
    setSaving(true);
    try {
      const { error: insertError } = await supabase
        .from('prize_wheel_segments')
        .insert(buildSegmentPayload(createSegmentForm));

      if (insertError) {
        showToast('Erro ao criar segmento.', 'error');
        return;
      }

      showToast('Segmento criado!', 'success');
      cancelCreateSegment();
      await loadData();
    } catch {
      showToast('Erro ao criar segmento.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveEditSegment = async () => {
    if (!editingSegmentId || !validateSegmentForm(editSegmentForm)) return;
    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('prize_wheel_segments')
        .update(buildSegmentPayload(editSegmentForm))
        .eq('id', editingSegmentId);

      if (updateError) {
        showToast('Erro ao salvar segmento.', 'error');
        return;
      }

      showToast('Segmento atualizado!', 'success');
      cancelEditSegment();
      await loadData();
    } catch {
      showToast('Erro ao salvar segmento.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteSegment = async () => {
    if (!deletingSegmentId) return;
    setSaving(true);
    try {
      const { error: deleteError } = await supabase
        .from('prize_wheel_segments')
        .delete()
        .eq('id', deletingSegmentId);
      if (deleteError) {
        showToast('Erro ao excluir segmento.', 'error');
        return;
      }
      showToast('Segmento excluído!', 'success');
      if (editingSegmentId === deletingSegmentId) cancelEditSegment();
      setDeletingSegmentId(null);
      await loadData();
    } catch {
      showToast('Erro ao excluir segmento.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleSegmentAtivo = async (segment: WheelSegment) => {
    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('prize_wheel_segments')
        .update({ ativo: !segment.ativo, updated_at: new Date().toISOString() })
        .eq('id', segment.id);

      if (updateError) {
        showToast('Erro ao alterar status.', 'error');
        return;
      }
      showToast(segment.ativo ? 'Segmento desativado.' : 'Segmento ativado.', 'success');
      await loadData();
    } catch {
      showToast('Erro ao alterar status.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const cancelCreateSegment = () => {
    setIsCreatingSegment(false);
    setCreateSegmentForm(emptySegmentForm);
  };

  const startCreateSegment = () => {
    setEditingSegmentId(null);
    setIsCreatingSegment(true);
    setCreateSegmentForm({
      ...emptySegmentForm,
      ordem: String(segments.length + 1),
    });
  };

  const startEditSegment = (segment: WheelSegment) => {
    setIsCreatingSegment(false);
    setEditingSegmentId(segment.id);
    setEditSegmentForm({
      nome_admin: segment.nome_admin,
      label: segment.label,
      cupom_id: segment.cupom_id,
      peso: String(segment.peso),
      ordem: String(segment.ordem),
      ativo: segment.ativo,
    });
  };

  const cancelEditSegment = () => {
    setEditingSegmentId(null);
    setEditSegmentForm(emptySegmentForm);
  };

  const renderSegmentFormFields = (
    form: typeof emptySegmentForm,
    setForm: React.Dispatch<React.SetStateAction<typeof emptySegmentForm>>,
    idPrefix: string,
  ) => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field
          label="Nome interno"
          value={form.nome_admin}
          onChange={(v) => setForm({ ...form, nome_admin: v })}
          placeholder="Gates 85 giros"
        />
        <Field
          label="Rótulo na roleta"
          hint="Exibido no disco. Será convertido para maiúsculas."
          value={form.label}
          onChange={(v) => setForm({ ...form, label: v })}
          placeholder="85 GIROS"
        />
        <SelectField
          label="Cupom de rodadas"
          value={form.cupom_id}
          onChange={(v) => setForm({ ...form, cupom_id: v })}
          options={[
            { value: '', label: 'Selecione um cupom...' },
            ...cupons.map((c) => ({
              value: c.id,
              label: `${c.nome_admin} (${c.codigo}) — ${c.valor} giros${c.jogo_nome ? ` — ${c.jogo_nome}` : ''}`,
            })),
          ]}
        />
        <Field
          label="Peso (probabilidade)"
          type="number"
          value={form.peso}
          onChange={(v) => setForm({ ...form, peso: v })}
          placeholder="1"
        />
        <Field
          label="Ordem"
          type="number"
          value={form.ordem}
          onChange={(v) => setForm({ ...form, ordem: v })}
          placeholder="1"
        />
      </div>
      {cupons.length === 0 && (
        <p className="text-admin-warning text-xs mt-4">
          Crie cupons do tipo &quot;Rodadas Grátis&quot; na página de Cupons antes de adicionar segmentos.
        </p>
      )}
    </>
  );

  const segmentToDelete = segments.find((s) => s.id === deletingSegmentId);

  if (loading) {
    return <LoadingState message="Carregando roleta..." />;
  }

  if (error) {
    return (
      <PagePanel>
        <p className="text-admin-danger">{error}</p>
      </PagePanel>
    );
  }

  return (
    <div>
      <PageHeader
        icon={CircleDot}
        title="Roleta de Prêmios"
        description="Configure a roleta exibida no site. Cada segmento deve estar vinculado a um cupom de rodadas grátis."
        actions={
          activeTab === 'config' ? (
            <Button onClick={saveConfig} loading={saving}>
              Salvar configuração
            </Button>
          ) : (
            <Button icon={Plus} onClick={startCreateSegment} disabled={modalBusy}>
              Novo segmento
            </Button>
          )
        }
      />

      <PagePanel padding={false} className="overflow-hidden">
        <div className="flex border-b border-admin-border overflow-x-auto px-4 gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
                  isActive
                    ? 'text-white border-white'
                    : 'text-gray-500 border-transparent hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-5 md:p-6">
          {activeTab === 'config' && (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
              <div className="lg:col-span-3 space-y-5">
                <PagePanel className="!p-0 border-0 bg-transparent">
                  <div className="rounded-xl border border-admin-border bg-admin-panel-2/50 p-4 md:p-5">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-2">
                        <Settings2 className="w-4 h-4 text-admin-muted" />
                        <h3 className="text-white font-semibold">Status e limites</h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge variant={configForm.ativo ? 'success' : 'neutral'}>
                          {configForm.ativo ? 'Ativa' : 'Inativa'}
                        </StatusBadge>
                        <Button
                          variant="ghost"
                          icon={Power}
                          onClick={() => void toggleConfigAtivo()}
                          disabled={saving}
                          className="!px-3 !py-1.5 !text-xs"
                        >
                          {configForm.ativo ? 'Desativar' : 'Ativar'}
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Field
                        label="Giros permitidos por período"
                        type="number"
                        value={configForm.giros_por_periodo}
                        onChange={(v) => setConfigForm({ ...configForm, giros_por_periodo: v })}
                      />
                      <Field
                        label="Cooldown (horas)"
                        hint="Tempo de espera entre períodos de giros."
                        type="number"
                        value={configForm.cooldown_horas}
                        onChange={(v) => setConfigForm({ ...configForm, cooldown_horas: v })}
                      />
                    </div>
                  </div>
                </PagePanel>

                <PagePanel className="!p-0 border-0 bg-transparent">
                  <div className="rounded-xl border border-admin-border bg-admin-panel-2/50 p-4 md:p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <ImageIcon className="w-4 h-4 text-admin-muted" />
                      <h3 className="text-white font-semibold">Imagens</h3>
                    </div>

                    <div className="space-y-5">
                      {IMAGE_FIELDS.map((field) => (
                        <ImageUrlField
                          key={field.key}
                          label={field.label}
                          size={field.size}
                          value={configForm[field.key]}
                          onChange={(v) => setConfigForm({ ...configForm, [field.key]: v })}
                        />
                      ))}
                    </div>
                  </div>
                </PagePanel>
              </div>

              <div className="lg:col-span-2">
                <PagePanel className="!p-0 border-0 bg-transparent lg:sticky lg:top-6">
                  <div className="rounded-xl border border-admin-border bg-admin-panel-2/50 p-4 md:p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <CircleDot className="w-4 h-4 text-admin-muted" />
                      <h3 className="text-white font-semibold">Resumo</h3>
                    </div>

                    <div className="space-y-2 mb-5">
                      <SummaryRow label="Status" value={configForm.ativo ? 'Ativa' : 'Inativa'} />
                      <SummaryRow
                        label="Giros / período"
                        value={configForm.giros_por_periodo || '1'}
                      />
                      <SummaryRow
                        label="Cooldown"
                        value={`${configForm.cooldown_horas || '0'}h`}
                      />
                      <SummaryRow
                        label="Segmentos"
                        value={`${segmentCounts.active} ativos de ${segmentCounts.all}`}
                      />
                    </div>

                    <p className="text-gray-500 text-[11px] uppercase tracking-wide mb-3">Prévia das imagens</p>
                    <div className="grid grid-cols-2 gap-3">
                      {IMAGE_FIELDS.map((field) => (
                        <ImageThumb
                          key={field.key}
                          label={field.label}
                          url={configForm[field.key]}
                        />
                      ))}
                    </div>

                    {!configForm.ativo ? (
                      <p className="text-admin-warning text-xs mt-4">
                        Roleta desativada — não será exibida no site.
                      </p>
                    ) : null}
                  </div>
                </PagePanel>
              </div>
            </div>
          )}

          {activeTab === 'segmentos' && (
            <div className="space-y-5">
              <div className="rounded-xl border border-admin-border bg-admin-panel-2/30 p-4 md:p-5">
                <p className="text-gray-300 text-sm">
                  Cada segmento representa um prêmio na roleta. O cupom vinculado define o jogo, quantidade de
                  giros e se exige depósito mínimo para ativar.
                </p>
                <div className="flex flex-wrap gap-2 mt-4">
                  {(
                    [
                      { key: 'all' as const, label: 'Todos' },
                      { key: 'active' as const, label: 'Ativos' },
                      { key: 'inactive' as const, label: 'Inativos' },
                    ] as const
                  ).map((filter) => (
                    <button
                      key={filter.key}
                      type="button"
                      onClick={() => setStatusFilter(filter.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        statusFilter === filter.key
                          ? 'bg-admin-accent text-[#0d0e10]'
                          : 'bg-admin-panel text-gray-400 hover:text-white border border-admin-border'
                      }`}
                    >
                      {filter.label} ({segmentCounts[filter.key]})
                    </button>
                  ))}
                </div>
              </div>

              {filteredSegments.length === 0 ? (
                <EmptyState
                  icon={CircleDot}
                  title={
                    segments.length === 0
                      ? 'Nenhum segmento cadastrado.'
                      : 'Nenhum segmento neste filtro.'
                  }
                  description={
                    segments.length === 0
                      ? 'Clique em Novo segmento para adicionar um prêmio à roleta.'
                      : 'Altere o filtro ou crie um novo segmento.'
                  }
                />
              ) : (
                <div className="space-y-3">
                  {filteredSegments.map((segment) => (
                    <div
                      key={segment.id}
                      className="rounded-xl border border-admin-border bg-admin-panel-2/50 p-4 md:p-5"
                    >
                      <div className="flex flex-col lg:flex-row gap-4">
                        <div className="shrink-0">
                          <div className="w-20 h-20 rounded-full border-2 border-admin-accent/40 bg-admin-panel flex items-center justify-center">
                            <span className="text-admin-accent text-[10px] font-bold text-center leading-tight px-2">
                              {segment.label}
                            </span>
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h3 className="text-white font-semibold">{segment.nome_admin}</h3>
                            <StatusBadge variant={segment.ativo ? 'success' : 'neutral'}>
                              {segment.ativo ? 'Ativo' : 'Inativo'}
                            </StatusBadge>
                            <span className="text-gray-500 text-xs">Ordem: {segment.ordem}</span>
                            <span className="text-gray-500 text-xs">Peso: {segment.peso}</span>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                            <InfoItem label="Cupom" value={segment.cupom?.codigo ?? '—'} />
                            <InfoItem
                              label="Giros"
                              value={segment.cupom ? `${segment.cupom.valor} giros` : '—'}
                            />
                            <InfoItem label="Jogo" value={segment.cupom?.jogo_nome ?? '—'} />
                            <InfoItem
                              label="Dep. mínimo"
                              value={
                                segment.cupom?.deposito_minimo != null
                                  ? `R$ ${segment.cupom.deposito_minimo.toFixed(2)}`
                                  : 'Não exige'
                              }
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 lg:flex-col lg:items-stretch shrink-0">
                          <Button
                            variant="secondary"
                            icon={Pencil}
                            onClick={() => startEditSegment(segment)}
                            disabled={saving}
                            className="!px-3 !py-1.5 !text-xs"
                          >
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            icon={Power}
                            onClick={() => toggleSegmentAtivo(segment)}
                            disabled={saving}
                            className="!px-3 !py-1.5 !text-xs"
                          >
                            {segment.ativo ? 'Desativar' : 'Ativar'}
                          </Button>
                          <Button
                            variant="danger"
                            icon={Trash2}
                            onClick={() => setDeletingSegmentId(segment.id)}
                            disabled={saving}
                            className="!px-3 !py-1.5 !text-xs"
                          >
                            Excluir
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </PagePanel>

      <Modal
        open={isCreatingSegment}
        onClose={cancelCreateSegment}
        title="Novo segmento"
        description="Vincule um cupom de rodadas grátis a um segmento da roleta."
        icon={CircleDot}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={cancelCreateSegment} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={saveCreateSegment} loading={saving}>
              Criar segmento
            </Button>
          </>
        }
      >
        {renderSegmentFormFields(createSegmentForm, setCreateSegmentForm, 'create')}
      </Modal>

      <Modal
        open={editingSegmentId !== null}
        onClose={cancelEditSegment}
        title={editSegmentForm.nome_admin ? `Editar: ${editSegmentForm.nome_admin}` : 'Editar segmento'}
        description="Atualize o prêmio vinculado a este segmento da roleta."
        icon={Pencil}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={cancelEditSegment} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={saveEditSegment} loading={saving}>
              Salvar alterações
            </Button>
          </>
        }
      >
        {renderSegmentFormFields(editSegmentForm, setEditSegmentForm, 'edit')}
      </Modal>

      <Modal
        open={deletingSegmentId !== null}
        onClose={() => setDeletingSegmentId(null)}
        title="Excluir segmento"
        description="Esta ação não pode ser desfeita."
        icon={Trash2}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeletingSegmentId(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={deleteSegment} loading={saving}>
              Excluir
            </Button>
          </>
        }
      >
        <p className="text-gray-300 text-sm">
          Deseja excluir o segmento{' '}
          <span className="text-white font-medium">{segmentToDelete?.nome_admin || 'selecionado'}</span>?
        </p>
      </Modal>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1">
      <span className="text-gray-500 text-sm">{label}</span>
      <span className="text-white text-sm font-medium text-right">{value}</span>
    </div>
  );
}

function ImageThumb({ label, url }: { label: string; url: string }) {
  return (
    <div>
      <p className="text-gray-500 text-[11px] mb-1.5 truncate">{label}</p>
      <div className="aspect-square rounded-lg border border-white/10 bg-black/20 overflow-hidden flex items-center justify-center">
        {url.trim() ? (
          <img
            src={url}
            alt={label}
            className="w-full h-full object-contain p-1"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <ImageIcon className="w-5 h-5 text-gray-600" />
        )}
      </div>
    </div>
  );
}

function ImageUrlField({
  label,
  size,
  value,
  onChange,
}: {
  label: string;
  size: AdminImageSizeSpec;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-gray-200 text-sm font-medium mb-1 block">{label}</label>
      <ImageSizeHint spec={size} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="https://..."
        className="w-full px-4 py-2.5 text-white text-sm rounded-lg bg-admin-panel border border-admin-border focus:outline-none focus:ring-2 focus:ring-admin-accent/30"
      />
      {value.trim() ? (
        <div className="mt-2 p-2 rounded-lg border border-white/10 bg-black/20 inline-block">
          <img
            src={value}
            alt={label}
            className="h-16 w-auto max-w-[200px] object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-gray-500">{label}</p>
      <p className="text-gray-200 font-medium">{value}</p>
    </div>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-gray-200 text-sm font-medium mb-1 block">{label}</label>
      {hint ? <p className="text-gray-500 text-xs mb-2">{hint}</p> : null}
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 text-white text-sm rounded-lg bg-admin-panel border border-admin-border focus:outline-none focus:ring-2 focus:ring-admin-accent/30"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="text-gray-200 text-sm font-medium mb-1 block">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 text-white text-sm rounded-lg bg-admin-panel border border-admin-border focus:outline-none focus:ring-2 focus:ring-admin-accent/30"
      >
        {options.map((opt) => (
          <option key={opt.value || 'empty'} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
