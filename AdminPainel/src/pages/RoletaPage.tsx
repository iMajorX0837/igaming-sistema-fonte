import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import PageHeader from '../components/PageHeader';
import LoadingState from '../components/ui/LoadingState';
import EmptyState from '../components/ui/EmptyState';
import PagePanel from '../components/ui/PagePanel';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import { CircleDot } from 'lucide-react';

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

export default function RoletaPage() {
  const { showToast } = useToast();
  const [config, setConfig] = useState<WheelConfig | null>(null);
  const [configForm, setConfigForm] = useState(defaultConfigForm);
  const [segments, setSegments] = useState<WheelSegment[]>([]);
  const [cupons, setCupons] = useState<CupomOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editSegmentForm, setEditSegmentForm] = useState(emptySegmentForm);
  const [isCreatingSegment, setIsCreatingSegment] = useState(false);
  const [createSegmentForm, setCreateSegmentForm] = useState(emptySegmentForm);

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
        setConfig(row);
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
        })
      );

      setCupons(
        ((cuponsRes.data || []) as Record<string, unknown>[]).map((row) => ({
          id: String(row.id),
          nome_admin: String(row.nome_admin || ''),
          codigo: String(row.codigo || ''),
          valor: Number(row.valor) || 0,
          jogo_nome: (row.jogo_nome as string | null) ?? null,
          deposito_minimo: row.deposito_minimo != null ? Number(row.deposito_minimo) : null,
        }))
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

  const saveEditSegment = async (id: string) => {
    if (!validateSegmentForm(editSegmentForm)) return;
    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('prize_wheel_segments')
        .update(buildSegmentPayload(editSegmentForm))
        .eq('id', id);

      if (updateError) {
        showToast('Erro ao salvar segmento.', 'error');
        return;
      }

      showToast('Segmento atualizado!', 'success');
      setEditingSegmentId(null);
      await loadData();
    } catch {
      showToast('Erro ao salvar segmento.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteSegment = async (id: string) => {
    if (!window.confirm('Excluir este segmento da roleta?')) return;
    setSaving(true);
    try {
      const { error: deleteError } = await supabase.from('prize_wheel_segments').delete().eq('id', id);
      if (deleteError) {
        showToast('Erro ao excluir segmento.', 'error');
        return;
      }
      showToast('Segmento excluído!', 'success');
      if (editingSegmentId === id) setEditingSegmentId(null);
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

  const renderSegmentFormFields = (
    form: typeof emptySegmentForm,
    setForm: React.Dispatch<React.SetStateAction<typeof emptySegmentForm>>
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
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.ativo}
            onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
            className="rounded"
          />
          <label className="text-gray-300 text-sm">Ativo</label>
        </div>
      </div>
      {cupons.length === 0 && (
        <p className="text-admin-warning text-xs mt-3">
          Crie cupons do tipo &quot;Rodadas Grátis&quot; na página de Cupons antes de adicionar segmentos.
        </p>
      )}
    </>
  );

  const renderSegmentForm = (
    title: string,
    form: typeof emptySegmentForm,
    setForm: React.Dispatch<React.SetStateAction<typeof emptySegmentForm>>,
    onSave: () => void,
    onCancel: () => void
  ) => (
    <div>
      <h3 className="text-white font-semibold mb-4">{title}</h3>
      {renderSegmentFormFields(form, setForm)}
      <div className="flex gap-2 mt-4">
        <button
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2 rounded bg-admin-info hover:bg-admin-info/90 text-white text-sm disabled:opacity-50"
        >
          Salvar
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-500 text-white text-sm"
        >
          Cancelar
        </button>
      </div>
    </div>
  );

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
    <div className="space-y-6">
      <PageHeader
        icon={CircleDot}
        title="Roleta"
        description="Configure a roleta de prêmios. Cada segmento deve estar vinculado a um cupom de rodadas grátis. O cupom define o jogo, quantidade de giros e se exige depósito para ativar."
      />

      <PagePanel>
        <h2 className="text-white font-semibold mb-4">Configuração Geral</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2 md:col-span-2">
            <input
              type="checkbox"
              checked={configForm.ativo}
              onChange={(e) => setConfigForm({ ...configForm, ativo: e.target.checked })}
              className="rounded"
            />
            <label className="text-gray-300 text-sm">Roleta ativa no site</label>
          </div>
          <Field
            label="URL imagem título"
            value={configForm.titulo_imagem_url}
            onChange={(v) => setConfigForm({ ...configForm, titulo_imagem_url: v })}
          />
          <Field
            label="URL imagem banner prêmio"
            value={configForm.banner_imagem_url}
            onChange={(v) => setConfigForm({ ...configForm, banner_imagem_url: v })}
          />
          <Field
            label="URL imagem roleta"
            value={configForm.roleta_imagem_url}
            onChange={(v) => setConfigForm({ ...configForm, roleta_imagem_url: v })}
          />
          <Field
            label="URL imagem widget (abrir roleta)"
            value={configForm.widget_imagem_url}
            onChange={(v) => setConfigForm({ ...configForm, widget_imagem_url: v })}
          />
          <Field
            label="URL imagem centro (girar)"
            value={configForm.centro_imagem_url}
            onChange={(v) => setConfigForm({ ...configForm, centro_imagem_url: v })}
          />
          <Field
            label="Giros permitidos por período"
            type="number"
            value={configForm.giros_por_periodo}
            onChange={(v) => setConfigForm({ ...configForm, giros_por_periodo: v })}
          />
          <Field
            label="Cooldown (horas)"
            type="number"
            value={configForm.cooldown_horas}
            onChange={(v) => setConfigForm({ ...configForm, cooldown_horas: v })}
          />
        </div>
        <button
          onClick={saveConfig}
          disabled={saving}
          className="mt-4 px-4 py-2 rounded bg-admin-accent hover:bg-admin-accent-hover text-[#0d0e10] text-sm disabled:opacity-50"
        >
          Salvar configuração
        </button>
      </PagePanel>

      <div className="flex justify-between items-center">
        <h2 className="text-white font-semibold">Segmentos da Roleta</h2>
        <button
          onClick={startCreateSegment}
          disabled={isCreatingSegment || saving}
          className="px-4 py-2 rounded-lg bg-admin-accent hover:bg-admin-accent-hover text-[#0d0e10] text-sm disabled:opacity-50"
        >
          Novo segmento
        </button>
      </div>

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
        {renderSegmentFormFields(createSegmentForm, setCreateSegmentForm)}
      </Modal>

      {segments.length === 0 ? (
        <PagePanel>
          <EmptyState
            icon={CircleDot}
            title="Nenhum segmento cadastrado."
            description="Clique em Novo segmento para adicionar um prêmio à roleta."
          />
        </PagePanel>
      ) : (
        <div className="space-y-4">
          {segments.map((segment) => (
            <PagePanel key={segment.id} className="p-4 md:p-6">
              {editingSegmentId === segment.id ? (
                renderSegmentForm(
                  `Editar: ${segment.nome_admin}`,
                  editSegmentForm,
                  setEditSegmentForm,
                  () => saveEditSegment(segment.id),
                  () => setEditingSegmentId(null)
                )
              ) : (
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-white font-semibold">{segment.nome_admin}</h3>
                      <span className="px-2 py-0.5 rounded bg-admin-panel-3 text-admin-accent text-xs font-bold">
                        {segment.label}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          segment.ativo ? 'bg-green-900/50 text-admin-success' : 'bg-gray-700 text-gray-400'
                        }`}
                      >
                        {segment.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <InfoItem label="Cupom" value={segment.cupom?.codigo ?? '—'} />
                      <InfoItem
                        label="Giros"
                        value={segment.cupom ? `${segment.cupom.valor} giros` : '—'}
                      />
                      <InfoItem label="Jogo" value={segment.cupom?.jogo_nome ?? '—'} />
                      <InfoItem
                        label="Dep. Mínimo"
                        value={
                          segment.cupom?.deposito_minimo != null
                            ? `R$ ${segment.cupom.deposito_minimo.toFixed(2)}`
                            : 'Não exige'
                        }
                      />
                      <InfoItem label="Peso" value={String(segment.peso)} />
                      <InfoItem label="Ordem" value={String(segment.ordem)} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:flex-col lg:items-end">
                    <button
                      onClick={() => {
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
                      }}
                      disabled={saving}
                      className="px-3 py-1.5 rounded bg-admin-accent hover:bg-admin-accent-hover text-[#0d0e10] text-xs disabled:opacity-50"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => toggleSegmentAtivo(segment)}
                      disabled={saving}
                      className="px-3 py-1.5 rounded bg-gray-600 hover:bg-gray-500 text-white text-xs disabled:opacity-50"
                    >
                      {segment.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                    <button
                      onClick={() => deleteSegment(segment.id)}
                      disabled={saving}
                      className="px-3 py-1.5 rounded bg-red-700 hover:bg-red-600 text-white text-xs disabled:opacity-50"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              )}
            </PagePanel>
          ))}
        </div>
      )}
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
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-gray-300 text-sm mb-1 block">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded bg-admin-panel border border-admin-border-strong text-white text-sm"
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
      <label className="text-gray-300 text-sm mb-1 block">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded bg-admin-panel border border-admin-border-strong text-white text-sm"
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
