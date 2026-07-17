import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { GIROS_JOGOS_PERMITIDOS, getJogoGirosBySlug } from '../lib/girosJogosPermitidos';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import LoadingState from '../components/ui/LoadingState';
import PagePanel from '../components/ui/PagePanel';
import StatCard from '../components/ui/StatCard';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import { CheckCircle, Gift, Ticket } from 'lucide-react';

type TipoValor = 'porcentagem' | 'fixo';
type TipoBonus = 'saldo_real' | 'giros_gratis';

interface Cupom {
  id: string;
  nome_admin: string;
  codigo: string;
  ativo: boolean;
  tipo_valor: TipoValor;
  valor: number;
  tipo_bonus: TipoBonus;
  deposito_minimo: number | null;
  bonus_maximo: number | null;
  limite_uso_total: number | null;
  limite_uso_por_usuario: number;
  usos_total: number;
  jogo_slug: string | null;
  jogo_nome: string | null;
  provider_slug: string | null;
}

const emptyForm = {
  nome_admin: '',
  codigo: '',
  ativo: true,
  tipo_valor: 'fixo' as TipoValor,
  valor: '',
  tipo_bonus: 'saldo_real' as TipoBonus,
  deposito_minimo: '',
  bonus_maximo: '',
  limite_uso_total: '',
  limite_uso_por_usuario: '1',
  jogo_slug: '',
};

function parseOptionalNumber(raw: string): number | null {
  const t = raw.trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function formatTipoValor(tipo: TipoValor, valor: number) {
  return tipo === 'porcentagem' ? `${valor}%` : `R$ ${valor.toFixed(2)}`;
}

export default function CuponsPage() {
  const { showToast } = useToast();
  const [cupons, setCupons] = useState<Cupom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadCupons = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('cupons')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        setError('Erro ao carregar cupons. Execute cupons.sql e cupons_rpc.sql no Supabase.');
        return;
      }

      setCupons(
        ((data || []) as Record<string, unknown>[]).map((row) => ({
          id: String(row.id),
          nome_admin: String(row.nome_admin || ''),
          codigo: String(row.codigo || ''),
          ativo: Boolean(row.ativo),
          tipo_valor: (row.tipo_valor === 'porcentagem' ? 'porcentagem' : 'fixo') as TipoValor,
          valor: Number(row.valor) || 0,
          tipo_bonus: row.tipo_bonus === 'giros_gratis' ? 'giros_gratis' : 'saldo_real',
          deposito_minimo: row.deposito_minimo != null ? Number(row.deposito_minimo) : null,
          bonus_maximo: row.bonus_maximo != null ? Number(row.bonus_maximo) : null,
          limite_uso_total: row.limite_uso_total != null ? Number(row.limite_uso_total) : null,
          limite_uso_por_usuario: Number(row.limite_uso_por_usuario) || 1,
          usos_total: Number(row.usos_total) || 0,
          jogo_slug: (row.jogo_slug as string | null) ?? null,
          jogo_nome: (row.jogo_nome as string | null) ?? null,
          provider_slug: (row.provider_slug as string | null) ?? null,
        }))
      );
    } catch {
      setError('Erro ao carregar cupons.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCupons();
  }, []);

  const validateForm = (form: typeof emptyForm) => {
    if (!form.nome_admin.trim()) {
      showToast('Informe o nome interno.', 'error');
      return false;
    }
    if (!form.codigo.trim()) {
      showToast('Informe o código do cupom.', 'error');
      return false;
    }
    const valor = Number(form.valor.replace(',', '.'));
    if (!Number.isFinite(valor) || valor <= 0) {
      showToast('Informe um valor válido maior que zero.', 'error');
      return false;
    }
    if (form.tipo_bonus === 'giros_gratis') {
      if (!Number.isInteger(valor)) {
        showToast('Quantidade de giros deve ser um número inteiro.', 'error');
        return false;
      }
      if (!form.jogo_slug) {
        showToast('Selecione o jogo para o cupom de rodadas.', 'error');
        return false;
      }
    }
    if (form.tipo_valor === 'porcentagem' && valor > 1000) {
      showToast('Porcentagem muito alta. Verifique o valor.', 'error');
      return false;
    }
    const limiteUsuario = Number(form.limite_uso_por_usuario);
    if (!Number.isInteger(limiteUsuario) || limiteUsuario < 1) {
      showToast('Limite por usuário deve ser pelo menos 1.', 'error');
      return false;
    }
    const limiteTotal = form.limite_uso_total.trim() ? Number(form.limite_uso_total) : null;
    if (limiteTotal !== null && (!Number.isInteger(limiteTotal) || limiteTotal < 1)) {
      showToast('Limite total de uso deve ser um número inteiro positivo.', 'error');
      return false;
    }
    return true;
  };

  const buildPayload = (form: typeof emptyForm) => {
    const jogo = form.tipo_bonus === 'giros_gratis' ? getJogoGirosBySlug(form.jogo_slug) : undefined;
    return {
      nome_admin: form.nome_admin.trim(),
      codigo: form.codigo.trim().toUpperCase(),
      ativo: form.ativo,
      tipo_valor: form.tipo_bonus === 'giros_gratis' ? 'fixo' : form.tipo_valor,
      valor: Number(form.valor.replace(',', '.')),
      tipo_bonus: form.tipo_bonus,
      deposito_minimo: parseOptionalNumber(form.deposito_minimo),
      bonus_maximo: form.tipo_bonus === 'giros_gratis' ? null : parseOptionalNumber(form.bonus_maximo),
      limite_uso_total: form.limite_uso_total.trim() ? Number(form.limite_uso_total) : null,
      limite_uso_por_usuario: Number(form.limite_uso_por_usuario) || 1,
      jogo_slug: jogo?.slug ?? null,
      jogo_nome: jogo?.nome ?? null,
      provider_slug: jogo?.provider ?? null,
      updated_at: new Date().toISOString(),
    };
  };

  const cupomToForm = (cupom: Cupom): typeof emptyForm => ({
    nome_admin: cupom.nome_admin,
    codigo: cupom.codigo,
    ativo: cupom.ativo,
    tipo_valor: cupom.tipo_valor,
    valor: String(cupom.valor),
    tipo_bonus: cupom.tipo_bonus,
    deposito_minimo: cupom.deposito_minimo != null ? String(cupom.deposito_minimo) : '',
    bonus_maximo: cupom.bonus_maximo != null ? String(cupom.bonus_maximo) : '',
    limite_uso_total: cupom.limite_uso_total != null ? String(cupom.limite_uso_total) : '',
    limite_uso_por_usuario: String(cupom.limite_uso_por_usuario),
    jogo_slug: cupom.jogo_slug ?? '',
  });

  const startEdit = (cupom: Cupom) => {
    setIsCreating(false);
    setEditingId(cupom.id);
    setEditForm(cupomToForm(cupom));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(emptyForm);
  };

  const startCreate = () => {
    setEditingId(null);
    setIsCreating(true);
    setCreateForm(emptyForm);
  };

  const cancelCreate = () => {
    setIsCreating(false);
    setCreateForm(emptyForm);
  };

  const saveEdit = async (id: string) => {
    if (!validateForm(editForm)) return;
    setSaving(true);
    try {
      const { error: updateError } = await supabase.from('cupons').update(buildPayload(editForm)).eq('id', id);
      if (updateError) {
        const msg = updateError.code === '23505' ? 'Já existe um cupom com este código.' : 'Erro ao salvar cupom.';
        showToast(msg, 'error');
        return;
      }
      showToast('Cupom atualizado!', 'success');
      cancelEdit();
      await loadCupons();
    } catch {
      showToast('Erro ao salvar cupom.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveCreate = async () => {
    if (!validateForm(createForm)) return;
    setSaving(true);
    try {
      const { error: insertError } = await supabase.from('cupons').insert(buildPayload(createForm));
      if (insertError) {
        const msg = insertError.code === '23505' ? 'Já existe um cupom com este código.' : 'Erro ao criar cupom.';
        showToast(msg, 'error');
        return;
      }
      showToast('Cupom criado!', 'success');
      cancelCreate();
      await loadCupons();
    } catch {
      showToast('Erro ao criar cupom.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteCupom = async (id: string) => {
    if (!window.confirm('Deseja excluir este cupom?')) return;
    setSaving(true);
    try {
      const { error: deleteError } = await supabase.from('cupons').delete().eq('id', id);
      if (deleteError) {
        showToast('Erro ao excluir cupom.', 'error');
        return;
      }
      showToast('Cupom excluído!', 'success');
      if (editingId === id) cancelEdit();
      await loadCupons();
    } catch {
      showToast('Erro ao excluir cupom.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleAtivo = async (cupom: Cupom) => {
    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('cupons')
        .update({ ativo: !cupom.ativo, updated_at: new Date().toISOString() })
        .eq('id', cupom.id);

      if (updateError) {
        showToast('Erro ao alterar status.', 'error');
        return;
      }
      showToast(cupom.ativo ? 'Cupom desativado.' : 'Cupom ativado.', 'success');
      await loadCupons();
    } catch {
      showToast('Erro ao alterar status.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const renderFormFields = (
    form: typeof emptyForm,
    setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>,
    formId: string
  ) => (
    <div className="space-y-6">
      <section>
        <h4 className="text-admin-accent text-xs font-bold uppercase tracking-wider mb-3">Identificação</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="Nome interno (admin)"
            value={form.nome_admin}
            onChange={(v) => setForm({ ...form, nome_admin: v })}
            placeholder="Bônus de boas-vindas"
          />
          <Field
            label="Código do Cupom"
            value={form.codigo}
            onChange={(v) => setForm({ ...form, codigo: v.toUpperCase() })}
            placeholder="BEMVINDO100"
          />
        </div>
      </section>

      <section>
        <h4 className="text-admin-accent text-xs font-bold uppercase tracking-wider mb-3">Configuração de Valor</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SelectField
            label="Tipo de Bônus"
            value={form.tipo_bonus}
            onChange={(v) => {
              const tipoBonus = v as TipoBonus;
              const jogo = tipoBonus === 'giros_gratis' && form.jogo_slug
                ? getJogoGirosBySlug(form.jogo_slug)
                : undefined;
              setForm({
                ...form,
                tipo_bonus: tipoBonus,
                tipo_valor: tipoBonus === 'giros_gratis' ? 'fixo' : form.tipo_valor,
                valor: jogo && !form.valor ? String(jogo.girosPadrao) : form.valor,
                bonus_maximo: tipoBonus === 'giros_gratis' ? '' : form.bonus_maximo,
              });
            }}
            options={[
              { value: 'saldo_real', label: 'Saldo Real' },
              { value: 'giros_gratis', label: 'Rodadas Grátis' },
            ]}
          />
          {form.tipo_bonus === 'saldo_real' ? (
            <SelectField
              label="Tipo de Valor"
              value={form.tipo_valor}
              onChange={(v) => setForm({ ...form, tipo_valor: v as TipoValor })}
              options={[
                { value: 'fixo', label: 'Valor Fixo (R$)' },
                { value: 'porcentagem', label: 'Porcentagem (%)' },
              ]}
            />
          ) : (
            <SelectField
              label="Jogo (apenas permitidos)"
              value={form.jogo_slug}
              onChange={(v) => {
                const jogo = getJogoGirosBySlug(v);
                setForm({
                  ...form,
                  jogo_slug: v,
                  valor: jogo ? String(jogo.girosPadrao) : form.valor,
                });
              }}
              options={[
                { value: '', label: 'Selecione o jogo...' },
                ...GIROS_JOGOS_PERMITIDOS.map((jogo) => ({
                  value: jogo.slug,
                  label: `${jogo.nome} (${jogo.girosPadrao} giros padrão)`,
                })),
              ]}
            />
          )}
          <Field
            label={form.tipo_bonus === 'giros_gratis' ? 'Quantidade de Giros' : 'Valor'}
            type="number"
            value={form.valor}
            onChange={(v) => setForm({ ...form, valor: v })}
            placeholder={form.tipo_bonus === 'giros_gratis' ? '85' : form.tipo_valor === 'porcentagem' ? '100' : '50.00'}
          />
        </div>
        {form.tipo_bonus === 'giros_gratis' && (
          <p className="text-gray-500 text-xs mt-2">
            Cupons de rodadas só podem ser criados para os 9 jogos listados. Use o depósito mínimo para exigir depósito antes de ativar as rodadas.
          </p>
        )}
      </section>

      <section>
        <h4 className="text-admin-accent text-xs font-bold uppercase tracking-wider mb-3">Limites e Restrições</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="Depósito Mínimo (R$)"
            type="number"
            value={form.deposito_minimo}
            onChange={(v) => setForm({ ...form, deposito_minimo: v })}
            placeholder={form.tipo_bonus === 'giros_gratis' ? 'Ex: 50 — exige depósito para ativar' : 'Vazio = sem mínimo'}
          />
          {form.tipo_bonus === 'saldo_real' && (
            <Field
              label="Bônus Máximo (R$)"
              type="number"
              value={form.bonus_maximo}
              onChange={(v) => setForm({ ...form, bonus_maximo: v })}
              placeholder="Apenas para % — vazio = sem teto"
            />
          )}
        </div>
        <p className="text-gray-500 text-xs mt-2">
          {form.tipo_bonus === 'giros_gratis'
            ? 'Com depósito mínimo, as rodadas ficam pendentes até o usuário depositar o valor exigido.'
            : 'Cupons com depósito mínimo ou porcentagem devem ser usados no fluxo de depósito. Cupons de valor fixo sem depósito mínimo podem ser ativados diretamente.'}
        </p>
      </section>

      <section>
        <h4 className="text-admin-accent text-xs font-bold uppercase tracking-wider mb-3">Limites de Uso</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="Limite Total de Uso"
            type="number"
            value={form.limite_uso_total}
            onChange={(v) => setForm({ ...form, limite_uso_total: v })}
            placeholder="Vazio = ilimitado"
          />
          <Field
            label="Limite por Usuário"
            type="number"
            value={form.limite_uso_por_usuario}
            onChange={(v) => setForm({ ...form, limite_uso_por_usuario: v })}
            placeholder="1"
          />
        </div>
      </section>
    </div>
  );

  const renderForm = (
    title: string,
    form: typeof emptyForm,
    setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>,
    onSave: () => void,
    onCancel: () => void
  ) => (
    <div>
      <h3 className="text-white font-semibold mb-4">{title}</h3>
      {renderFormFields(form, setForm, title)}
      <div className="flex gap-2 mt-6">
        <button
          onClick={onSave}
          disabled={saving}
          className="px-4 py-2 rounded bg-admin-info hover:bg-admin-info/90 text-white text-sm font-medium disabled:opacity-50"
        >
          Salvar
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-500 text-white text-sm font-medium"
        >
          Cancelar
        </button>
      </div>
    </div>
  );

  const ativosCount = cupons.filter((c) => c.ativo).length;
  const girosGratisCount = cupons.filter((c) => c.tipo_bonus === 'giros_gratis').length;

  return (
    <div>
      <PageHeader
        icon={Ticket}
        title="Cupons"
        description="Configure cupons de saldo real ou rodadas grátis nos jogos permitidos. Rodadas podem exigir depósito mínimo para ativação."
        actions={
          <button
            onClick={startCreate}
            disabled={isCreating || saving}
            className="px-4 py-2 rounded-lg bg-admin-accent hover:bg-admin-accent-hover text-[#0d0e10] text-sm font-medium disabled:opacity-50"
          >
            Novo cupom
          </button>
        }
      />

      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatCard
            title="Total de cupons"
            value={String(cupons.length)}
            icon={Ticket}
            color="text-admin-accent"
          />
          <StatCard
            title="Cupons ativos"
            value={String(ativosCount)}
            subtitle={cupons.length > 0 ? `${Math.round((ativosCount / cupons.length) * 100)}% do total` : undefined}
            icon={CheckCircle}
            color="text-admin-success"
          />
          <StatCard
            title="Rodadas grátis"
            value={String(girosGratisCount)}
            icon={Gift}
            color="text-admin-warning"
          />
        </div>
      )}

      {isCreating && (
        <Modal
          open={isCreating}
          onClose={cancelCreate}
          title="Novo cupom"
          description="Configure um cupom de saldo real ou rodadas grátis nos jogos permitidos."
          icon={Ticket}
          size="xl"
          footer={
            <>
              <Button variant="secondary" onClick={cancelCreate} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={saveCreate} loading={saving}>
                Criar cupom
              </Button>
            </>
          }
        >
          {renderFormFields(createForm, setCreateForm, 'novo-cupom')}
        </Modal>
      )}

      {loading ? (
        <LoadingState message="Carregando cupons..." />
      ) : error ? (
        <PagePanel>
          <p className="text-admin-danger">{error}</p>
        </PagePanel>
      ) : cupons.length === 0 ? (
        <PagePanel>
          <EmptyState
            icon={Ticket}
            title="Nenhum cupom cadastrado"
            description="Clique em Novo cupom para criar um cupom de saldo real ou rodadas grátis."
          />
        </PagePanel>
      ) : (
        <div className="space-y-4">
          {cupons.map((cupom) => (
            <PagePanel key={cupom.id} className="p-4 md:p-6">
              {editingId === cupom.id ? (
                renderForm(`Editar: ${cupom.nome_admin}`, editForm, setEditForm, () => saveEdit(cupom.id), cancelEdit)
              ) : (
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-white font-semibold">{cupom.nome_admin}</h3>
                      <span className="px-2 py-0.5 rounded bg-admin-panel-3 text-admin-accent text-xs font-mono font-bold">
                        {cupom.codigo}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          cupom.ativo ? 'bg-green-900/50 text-admin-success' : 'bg-gray-700 text-gray-400'
                        }`}
                      >
                        {cupom.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <InfoItem
                        label="Valor"
                        value={
                          cupom.tipo_bonus === 'giros_gratis'
                            ? `${cupom.valor} giros`
                            : formatTipoValor(cupom.tipo_valor, cupom.valor)
                        }
                      />
                      <InfoItem
                        label="Bônus"
                        value={cupom.tipo_bonus === 'giros_gratis' ? 'Rodadas Grátis' : 'Saldo Real'}
                      />
                      {cupom.tipo_bonus === 'giros_gratis' && (
                        <InfoItem label="Jogo" value={cupom.jogo_nome ?? '—'} />
                      )}
                      <InfoItem
                        label="Dep. Mínimo"
                        value={cupom.deposito_minimo != null ? `R$ ${cupom.deposito_minimo.toFixed(2)}` : '—'}
                      />
                      <InfoItem
                        label="Bônus Máx"
                        value={cupom.bonus_maximo != null ? `R$ ${cupom.bonus_maximo.toFixed(2)}` : '—'}
                      />
                      <InfoItem
                        label="Limite Total"
                        value={cupom.limite_uso_total != null ? String(cupom.limite_uso_total) : 'Ilimitado'}
                      />
                      <InfoItem label="Limite/Usuário" value={String(cupom.limite_uso_por_usuario)} />
                      <InfoItem
                        label="Usos"
                        value={`${cupom.usos_total}${cupom.limite_uso_total != null ? ` / ${cupom.limite_uso_total}` : ''}`}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:flex-col lg:items-end shrink-0">
                    <button
                      onClick={() => startEdit(cupom)}
                      disabled={saving}
                      className="px-3 py-1.5 rounded bg-admin-accent hover:bg-admin-accent-hover text-[#0d0e10] text-xs font-medium disabled:opacity-50"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => toggleAtivo(cupom)}
                      disabled={saving}
                      className="px-3 py-1.5 rounded bg-gray-600 hover:bg-gray-500 text-white text-xs font-medium disabled:opacity-50"
                    >
                      {cupom.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                    <button
                      onClick={() => deleteCupom(cupom.id)}
                      disabled={saving}
                      className="px-3 py-1.5 rounded bg-red-700 hover:bg-red-600 text-white text-xs font-medium disabled:opacity-50"
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
  className = '',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={className}>
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
  className = '',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-gray-300 text-sm mb-1 block">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded bg-admin-panel border border-admin-border-strong text-white text-sm"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
