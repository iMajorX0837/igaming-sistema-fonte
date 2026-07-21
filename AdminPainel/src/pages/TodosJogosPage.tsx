import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import SortableOrderList from '../components/SortableOrderList';
import { applySequentialOrder } from '../lib/reorderUtils';
import { persistTableOrder } from '../lib/persistTableOrder';
import PageHeader from '../components/PageHeader';
import LoadingState from '../components/ui/LoadingState';
import EmptyState from '../components/ui/EmptyState';
import PagePanel from '../components/ui/PagePanel';
import { LayoutGrid } from 'lucide-react';

interface PageConfigForm {
  titulo: string;
  jogos_por_pagina: number;
}

interface ProviderRow {
  id: string;
  slug: string;
  nome: string;
  api_provider_id: number | null;
  ordem: number;
  ativo: boolean;
}

interface CategoryRow {
  id: string;
  slug: string;
  nome: string;
  ordem: number;
  ativo: boolean;
}

const defaultPageConfig: PageConfigForm = {
  titulo: 'Todos os jogos',
  jogos_por_pagina: 18,
};

const emptyProviderForm = {
  slug: '',
  nome: '',
  api_provider_id: '',
  ordem: 1,
  ativo: true,
};

const emptyCategoryForm = {
  slug: '',
  nome: '',
  ordem: 1,
  ativo: true,
};

export default function TodosJogosPage() {
  const { showToast } = useToast();
  const [pageConfig, setPageConfig] = useState<PageConfigForm>(defaultPageConfig);
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);

  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [providerForm, setProviderForm] = useState(emptyProviderForm);
  const [isCreatingProvider, setIsCreatingProvider] = useState(false);

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [configRes, providersRes, categoriesRes] = await Promise.all([
        supabase.from('all_games_page_config').select('titulo, jogos_por_pagina').eq('id', 1).maybeSingle(),
        supabase.from('all_games_providers').select('*').order('ordem', { ascending: true }),
        supabase.from('all_games_categories').select('*').order('ordem', { ascending: true }),
      ]);

      if (configRes.error) {
        showToast('Execute deploy/supabase_nova_casa.sql no Supabase.', 'error');
      } else if (configRes.data) {
        setPageConfig({
          titulo: String(configRes.data.titulo || defaultPageConfig.titulo),
          jogos_por_pagina: Number(configRes.data.jogos_por_pagina) || defaultPageConfig.jogos_por_pagina,
        });
      }

      if (providersRes.error) {
        showToast('Erro ao carregar provedores.', 'error');
      } else {
        setProviders(
          ((providersRes.data || []) as Record<string, unknown>[]).map((row) => ({
            id: String(row.id),
            slug: String(row.slug),
            nome: String(row.nome),
            api_provider_id: row.api_provider_id == null ? null : Number(row.api_provider_id),
            ordem: Number(row.ordem) || 0,
            ativo: Boolean(row.ativo),
          }))
        );
      }

      if (categoriesRes.error) {
        showToast('Erro ao carregar categorias.', 'error');
      } else {
        setCategories(
          ((categoriesRes.data || []) as Record<string, unknown>[]).map((row) => ({
            id: String(row.id),
            slug: String(row.slug),
            nome: String(row.nome),
            ordem: Number(row.ordem) || 0,
            ativo: Boolean(row.ativo),
          }))
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const savePageConfig = async () => {
    if (!pageConfig.titulo.trim()) {
      showToast('Informe o título da página.', 'error');
      return;
    }
    if (pageConfig.jogos_por_pagina <= 0) {
      showToast('Jogos por página deve ser maior que zero.', 'error');
      return;
    }

    setConfigSaving(true);
    try {
      const { error } = await supabase.from('all_games_page_config').upsert({
        id: 1,
        titulo: pageConfig.titulo.trim(),
        jogos_por_pagina: pageConfig.jogos_por_pagina,
        updated_at: new Date().toISOString(),
      });
      if (error) {
        showToast('Erro ao salvar configurações da página.', 'error');
        return;
      }
      showToast('Configurações da página salvas!', 'success');
    } finally {
      setConfigSaving(false);
    }
  };

  const startCreateProvider = () => {
    setEditingProviderId(null);
    setIsCreatingProvider(true);
    const nextOrder = providers.length > 0 ? Math.max(...providers.map((p) => p.ordem)) + 1 : 1;
    setProviderForm({ ...emptyProviderForm, ordem: nextOrder });
  };

  const startEditProvider = (row: ProviderRow) => {
    setIsCreatingProvider(false);
    setEditingProviderId(row.id);
    setProviderForm({
      slug: row.slug,
      nome: row.nome,
      api_provider_id: row.api_provider_id == null ? '' : String(row.api_provider_id),
      ordem: row.ordem,
      ativo: row.ativo,
    });
  };

  const saveProvider = async (id?: string) => {
    if (!providerForm.slug.trim() || !providerForm.nome.trim()) {
      showToast('Informe slug e nome do provedor.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        slug: providerForm.slug.trim().toLowerCase(),
        nome: providerForm.nome.trim(),
        api_provider_id: providerForm.api_provider_id.trim() ? Number(providerForm.api_provider_id) : null,
        ordem: providerForm.ordem,
        ativo: providerForm.ativo,
        updated_at: new Date().toISOString(),
      };

      const { error } = id
        ? await supabase.from('all_games_providers').update(payload).eq('id', id)
        : await supabase.from('all_games_providers').insert(payload);

      if (error) {
        showToast('Erro ao salvar provedor.', 'error');
        return;
      }

      showToast(id ? 'Provedor atualizado!' : 'Provedor criado!', 'success');
      setEditingProviderId(null);
      setIsCreatingProvider(false);
      setProviderForm(emptyProviderForm);
      await loadAll();
    } finally {
      setSaving(false);
    }
  };

  const toggleProvider = async (row: ProviderRow) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('all_games_providers')
        .update({ ativo: !row.ativo, updated_at: new Date().toISOString() })
        .eq('id', row.id);
      if (error) {
        showToast('Erro ao alterar status do provedor.', 'error');
        return;
      }
      await loadAll();
    } finally {
      setSaving(false);
    }
  };

  const removeProvider = async (id: string) => {
    if (!window.confirm('Excluir este provedor do filtro?')) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('all_games_providers').delete().eq('id', id);
      if (error) {
        showToast('Erro ao excluir provedor.', 'error');
        return;
      }
      showToast('Provedor excluído.', 'success');
      await loadAll();
    } finally {
      setSaving(false);
    }
  };

  const startCreateCategory = () => {
    setEditingCategoryId(null);
    setIsCreatingCategory(true);
    const nextOrder = categories.length > 0 ? Math.max(...categories.map((c) => c.ordem)) + 1 : 1;
    setCategoryForm({ ...emptyCategoryForm, ordem: nextOrder });
  };

  const startEditCategory = (row: CategoryRow) => {
    setIsCreatingCategory(false);
    setEditingCategoryId(row.id);
    setCategoryForm({
      slug: row.slug,
      nome: row.nome,
      ordem: row.ordem,
      ativo: row.ativo,
    });
  };

  const saveCategory = async (id?: string) => {
    if (!categoryForm.slug.trim() || !categoryForm.nome.trim()) {
      showToast('Informe slug e nome da categoria.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        slug: categoryForm.slug.trim().toLowerCase(),
        nome: categoryForm.nome.trim(),
        ordem: categoryForm.ordem,
        ativo: categoryForm.ativo,
        updated_at: new Date().toISOString(),
      };

      const { error } = id
        ? await supabase.from('all_games_categories').update(payload).eq('id', id)
        : await supabase.from('all_games_categories').insert(payload);

      if (error) {
        showToast('Erro ao salvar categoria.', 'error');
        return;
      }

      showToast(id ? 'Categoria atualizada!' : 'Categoria criada!', 'success');
      setEditingCategoryId(null);
      setIsCreatingCategory(false);
      setCategoryForm(emptyCategoryForm);
      await loadAll();
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = async (row: CategoryRow) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('all_games_categories')
        .update({ ativo: !row.ativo, updated_at: new Date().toISOString() })
        .eq('id', row.id);
      if (error) {
        showToast('Erro ao alterar status da categoria.', 'error');
        return;
      }
      await loadAll();
    } finally {
      setSaving(false);
    }
  };

  const removeCategory = async (id: string) => {
    if (!window.confirm('Excluir esta categoria do filtro?')) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('all_games_categories').delete().eq('id', id);
      if (error) {
        showToast('Erro ao excluir categoria.', 'error');
        return;
      }
      showToast('Categoria excluída.', 'success');
      await loadAll();
    } finally {
      setSaving(false);
    }
  };

  const handleProvidersReorder = async (reordered: ProviderRow[]) => {
    const withOrder = applySequentialOrder(reordered);
    setProviders(withOrder);
    try {
      await persistTableOrder('all_games_providers', withOrder.map((row) => row.id));
      showToast('Ordem dos provedores atualizada!', 'success');
    } catch {
      showToast('Erro ao salvar ordem dos provedores.', 'error');
      await loadAll();
    }
  };

  const handleCategoriesReorder = async (reordered: CategoryRow[]) => {
    const withOrder = applySequentialOrder(reordered);
    setCategories(withOrder);
    try {
      await persistTableOrder('all_games_categories', withOrder.map((row) => row.id));
      showToast('Ordem das categorias atualizada!', 'success');
    } catch {
      showToast('Erro ao salvar ordem das categorias.', 'error');
      await loadAll();
    }
  };

  if (loading) {
    return <LoadingState message="Carregando configuração..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={LayoutGrid}
        title="Config. Todos os Jogos"
        description="Configure filtros, categorias e provedores da página de todos os jogos."
      />

      <PagePanel>
        <h2 className="text-white text-lg font-semibold mb-4">Configurações gerais</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Título da página" value={pageConfig.titulo} onChange={(v) => setPageConfig({ ...pageConfig, titulo: v })} />
          <Field
            label="Jogos por página"
            type="number"
            value={String(pageConfig.jogos_por_pagina)}
            onChange={(v) => setPageConfig({ ...pageConfig, jogos_por_pagina: Number(v) })}
          />
        </div>
        <button
          onClick={savePageConfig}
          disabled={configSaving}
          className="mt-4 px-4 py-2 rounded-lg bg-admin-accent hover:bg-admin-accent-hover text-[#0d0e10] text-sm font-medium disabled:opacity-50"
        >
          {configSaving ? 'Salvando...' : 'Salvar configurações'}
        </button>
      </PagePanel>

      <SectionHeader
        title="Provedores (filtro)"
        description="Organize a ordem e os nomes exibidos no dropdown de provedores. Segure o ícone à esquerda e arraste para reorganizar."
        actionLabel="Novo provedor"
        onAction={startCreateProvider}
        disabled={saving || isCreatingProvider}
      />

      {isCreatingProvider && (
        <ProviderEditor
          form={providerForm}
          setForm={setProviderForm}
          onSave={() => saveProvider()}
          onCancel={() => {
            setIsCreatingProvider(false);
            setProviderForm(emptyProviderForm);
          }}
          saving={saving}
          title="Novo provedor"
        />
      )}

      <ItemList
        items={providers}
        emptyText="Nenhum provedor cadastrado."
        onReorder={handleProvidersReorder}
        sortDisabled={saving || isCreatingProvider || editingProviderId !== null}
        renderItem={(row) =>
          editingProviderId === row.id ? (
            <ProviderEditor
              form={providerForm}
              setForm={setProviderForm}
              onSave={() => saveProvider(row.id)}
              onCancel={() => {
                setEditingProviderId(null);
                setProviderForm(emptyProviderForm);
              }}
              saving={saving}
              title={`Editar: ${row.nome}`}
            />
          ) : (
            <ItemRow
              title={row.nome}
              subtitle={`Slug: ${row.slug}${row.api_provider_id ? ` · API ID: ${row.api_provider_id}` : ''}`}
              ordem={row.ordem}
              ativo={row.ativo}
              onEdit={() => startEditProvider(row)}
              onToggle={() => toggleProvider(row)}
              onDelete={() => removeProvider(row.id)}
              saving={saving}
            />
          )
        }
      />

      <SectionHeader
        title="Categorias (filtro)"
        description="Organize as categorias exibidas no dropdown. Segure o ícone à esquerda e arraste para reorganizar."
        actionLabel="Nova categoria"
        onAction={startCreateCategory}
        disabled={saving || isCreatingCategory}
      />

      {isCreatingCategory && (
        <CategoryEditor
          form={categoryForm}
          setForm={setCategoryForm}
          onSave={() => saveCategory()}
          onCancel={() => {
            setIsCreatingCategory(false);
            setCategoryForm(emptyCategoryForm);
          }}
          saving={saving}
          title="Nova categoria"
        />
      )}

      <ItemList
        items={categories}
        emptyText="Nenhuma categoria cadastrada."
        onReorder={handleCategoriesReorder}
        sortDisabled={saving || isCreatingCategory || editingCategoryId !== null}
        renderItem={(row) =>
          editingCategoryId === row.id ? (
            <CategoryEditor
              form={categoryForm}
              setForm={setCategoryForm}
              onSave={() => saveCategory(row.id)}
              onCancel={() => {
                setEditingCategoryId(null);
                setCategoryForm(emptyCategoryForm);
              }}
              saving={saving}
              title={`Editar: ${row.nome}`}
            />
          ) : (
            <ItemRow
              title={row.nome}
              subtitle={`Slug: ${row.slug}`}
              ordem={row.ordem}
              ativo={row.ativo}
              onEdit={() => startEditCategory(row)}
              onToggle={() => toggleCategory(row)}
              onDelete={() => removeCategory(row.id)}
              saving={saving}
            />
          )
        }
      />
    </div>
  );
}

function SectionHeader({
  title,
  description,
  actionLabel,
  onAction,
  disabled,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-white text-lg font-semibold">{title}</h2>
        <p className="text-gray-400 text-sm">{description}</p>
      </div>
      <button
        onClick={onAction}
        disabled={disabled}
        className="px-4 py-2 rounded-lg bg-admin-accent hover:bg-admin-accent-hover text-[#0d0e10] text-sm font-medium disabled:opacity-50 self-start"
      >
        {actionLabel}
      </button>
    </div>
  );
}

function ItemList<T extends { id: string }>({
  items,
  emptyText,
  renderItem,
  onReorder,
  sortDisabled = false,
}: {
  items: T[];
  emptyText: string;
  renderItem: (item: T) => React.ReactNode;
  onReorder?: (items: T[]) => void | Promise<void>;
  sortDisabled?: boolean;
}) {
  if (items.length === 0) {
    return (
      <PagePanel>
        <EmptyState icon={LayoutGrid} title={emptyText} />
      </PagePanel>
    );
  }

  if (onReorder) {
    return (
      <SortableOrderList
        items={items}
        onReorder={onReorder}
        disabled={sortDisabled}
        className="space-y-3"
        renderItem={(item) => (
          <PagePanel className="p-4">
            {renderItem(item)}
          </PagePanel>
        )}
      />
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <PagePanel key={item.id} className="p-4">
          {renderItem(item)}
        </PagePanel>
      ))}
    </div>
  );
}

function ItemRow({
  title,
  subtitle,
  ordem,
  ativo,
  onEdit,
  onToggle,
  onDelete,
  saving,
}: {
  title: string;
  subtitle: string;
  ordem: number;
  ativo: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  saving: boolean;
}) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <h3 className="text-white font-semibold">{title}</h3>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${ativo ? 'bg-green-900/50 text-admin-success' : 'bg-gray-700 text-gray-400'}`}>
            {ativo ? 'Ativo' : 'Inativo'}
          </span>
          <span className="text-gray-500 text-xs">Ordem: {ordem}</span>
        </div>
        <p className="text-gray-400 text-xs">{subtitle}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <ActionButton label="Editar" onClick={onEdit} disabled={saving} color="blue" />
        <ActionButton label={ativo ? 'Desativar' : 'Ativar'} onClick={onToggle} disabled={saving} color="gray" />
        <ActionButton label="Excluir" onClick={onDelete} disabled={saving} color="red" />
      </div>
    </div>
  );
}

function ProviderEditor({
  title,
  form,
  setForm,
  onSave,
  onCancel,
  saving,
}: {
  title: string;
  form: typeof emptyProviderForm;
  setForm: React.Dispatch<React.SetStateAction<typeof emptyProviderForm>>;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <EditorShell title={title} onSave={onSave} onCancel={onCancel} saving={saving}>
      <Field label="Slug (identificador)" value={form.slug} onChange={(v) => setForm({ ...form, slug: v })} placeholder="pgsoft" />
      <Field label="Nome exibido" value={form.nome} onChange={(v) => setForm({ ...form, nome: v })} placeholder="PG Soft" />
      <Field
        label="API Provider ID (opcional)"
        value={form.api_provider_id}
        onChange={(v) => setForm({ ...form, api_provider_id: v })}
        placeholder="1"
      />
    </EditorShell>
  );
}

function CategoryEditor({
  title,
  form,
  setForm,
  onSave,
  onCancel,
  saving,
}: {
  title: string;
  form: typeof emptyCategoryForm;
  setForm: React.Dispatch<React.SetStateAction<typeof emptyCategoryForm>>;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <EditorShell title={title} onSave={onSave} onCancel={onCancel} saving={saving}>
      <Field label="Slug (identificador)" value={form.slug} onChange={(v) => setForm({ ...form, slug: v })} placeholder="slots" />
      <Field label="Nome exibido" value={form.nome} onChange={(v) => setForm({ ...form, nome: v })} placeholder="Slots" />
    </EditorShell>
  );
}

function EditorShell({
  title,
  children,
  onSave,
  onCancel,
  saving,
}: {
  title: string;
  children: React.ReactNode;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <PagePanel className="border-admin-accent/24">
      <h3 className="text-white font-semibold mb-4">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>
      <div className="flex gap-2 mt-4">
        <ActionButton label="Salvar" onClick={onSave} disabled={saving} color="blue" />
        <ActionButton label="Cancelar" onClick={onCancel} disabled={saving} color="gray" />
      </div>
    </PagePanel>
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

function ActionButton({
  label,
  onClick,
  disabled,
  color,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  color: 'blue' | 'gray' | 'red';
}) {
  const classes =
    color === 'blue'
      ? 'bg-admin-info hover:bg-admin-info/90'
      : color === 'red'
        ? 'bg-red-700 hover:bg-red-600'
        : 'bg-gray-600 hover:bg-gray-500';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 rounded text-white text-xs font-medium disabled:opacity-50 ${classes}`}
    >
      {label}
    </button>
  );
}
