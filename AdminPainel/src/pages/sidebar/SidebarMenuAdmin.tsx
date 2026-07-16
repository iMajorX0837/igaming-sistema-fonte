import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import SortableOrderList from '../../components/SortableOrderList';
import { applySequentialOrder } from '../../lib/reorderUtils';
import { persistTableOrder } from '../../lib/persistTableOrder';
import LoadingState from '../../components/ui/LoadingState';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import { FolderTree, Link2, Pencil, Trash2, Plus } from 'lucide-react';

type StatusFilter = 'all' | 'active' | 'inactive';

type SidebarLanguage = 'pt' | 'en' | 'es';
type CategoryTipo = 'menu' | 'language';
type LinkTipo = 'href' | 'game' | 'external' | 'event';
type IconType = 'emoji' | 'image' | 'iconify' | 'none';

interface LabelSet {
  line1: string;
  line2: string;
}

interface Labels {
  pt: LabelSet;
  en: LabelSet;
  es: LabelSet;
}

interface CategoryRow {
  id: string;
  nome_admin: string;
  slug: string;
  category_tipo: CategoryTipo;
  labels: Labels;
  ordem: number;
  ativo: boolean;
}

interface MenuItemRow {
  id: string;
  nome_admin: string;
  categoria_slug: string;
  labels: Labels;
  link_tipo: LinkTipo;
  href: string | null;
  game_name: string | null;
  action_value: string | null;
  icon_type: IconType;
  icon_value: string | null;
  destaque: boolean;
  ordem: number;
  ativo: boolean;
}

const CMS_CATEGORY = 'sidebar_category';
const CMS_MENU_ITEM = 'sidebar_menu_item';

const emptyLabels = (): Labels => ({
  pt: { line1: '', line2: '' },
  en: { line1: '', line2: '' },
  es: { line1: '', line2: '' },
});

const emptyCategoryForm = {
  nome_admin: '',
  slug: '',
  category_tipo: 'menu' as CategoryTipo,
  labels: emptyLabels(),
  ordem: 1,
  ativo: true,
};

const emptyMenuItemForm = {
  nome_admin: '',
  categoria_slug: '',
  labels: emptyLabels(),
  link_tipo: 'href' as LinkTipo,
  href: '',
  game_name: '',
  action_value: '',
  icon_type: 'iconify' as IconType,
  icon_value: '',
  destaque: true,
  ordem: 1,
  ativo: true,
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeLabels(raw: unknown): Labels {
  const fallback = emptyLabels();
  if (!raw || typeof raw !== 'object') return fallback;
  const data = raw as Partial<Record<SidebarLanguage, Partial<LabelSet>>>;
  const pick = (lang: SidebarLanguage): LabelSet => ({
    line1: data[lang]?.line1 || '',
    line2: data[lang]?.line2 || '',
  });
  return { pt: pick('pt'), en: pick('en'), es: pick('es') };
}

function rowToCategory(row: Record<string, unknown>): CategoryRow {
  return {
    id: String(row.id),
    nome_admin: String(row.nome_admin || ''),
    slug: String(row.titulo || ''),
    category_tipo: row.category_tipo === 'language' ? 'language' : 'menu',
    labels: normalizeLabels(row.labels),
    ordem: Number(row.ordem) || 0,
    ativo: Boolean(row.ativo),
  };
}

function rowToMenuItem(row: Record<string, unknown>): MenuItemRow {
  const linkTipo =
    row.link_tipo === 'game' || row.link_tipo === 'external' || row.link_tipo === 'event'
      ? row.link_tipo
      : 'href';

  return {
    id: String(row.id),
    nome_admin: String(row.nome_admin || ''),
    categoria_slug: String(row.categoria_slug || ''),
    labels: normalizeLabels(row.labels),
    link_tipo: linkTipo,
    href: row.href ? String(row.href) : null,
    game_name: row.game_name ? String(row.game_name) : null,
    action_value: row.texto ? String(row.texto) : null,
    icon_type:
      row.icon_type === 'emoji' || row.icon_type === 'image' || row.icon_type === 'iconify'
        ? row.icon_type
        : 'none',
    icon_value: row.icon_value ? String(row.icon_value) : null,
    destaque: Boolean(row.destaque),
    ordem: Number(row.ordem) || 0,
    ativo: Boolean(row.ativo),
  };
}

function buildCategoryPayload(form: typeof emptyCategoryForm) {
  return {
    secao: CMS_CATEGORY,
    nome_admin: form.nome_admin.trim(),
    titulo: form.slug.trim(),
    category_tipo: form.category_tipo,
    labels: {
      pt: { line1: form.labels.pt.line1.trim(), line2: null },
      en: { line1: form.labels.en.line1.trim(), line2: null },
      es: { line1: form.labels.es.line1.trim(), line2: null },
    },
    ordem: form.ordem,
    ativo: form.ativo,
    updated_at: new Date().toISOString(),
  };
}

function buildMenuItemPayload(form: typeof emptyMenuItemForm) {
  return {
    secao: CMS_MENU_ITEM,
    nome_admin: form.nome_admin.trim(),
    categoria_slug: form.categoria_slug.trim(),
    labels: {
      pt: { line1: form.labels.pt.line1.trim(), line2: null },
      en: { line1: form.labels.en.line1.trim(), line2: null },
      es: { line1: form.labels.es.line1.trim(), line2: null },
    },
    link_tipo: form.link_tipo,
    href: form.link_tipo === 'href' ? form.href.trim() : null,
    game_name: form.link_tipo === 'game' ? form.game_name.trim() : null,
    texto:
      form.link_tipo === 'external' || form.link_tipo === 'event'
        ? form.action_value.trim()
        : null,
    icon_type: form.icon_type,
    icon_value: form.icon_type === 'none' ? null : form.icon_value.trim() || null,
    destaque: form.destaque,
    ordem: form.ordem,
    ativo: form.ativo,
    updated_at: new Date().toISOString(),
  };
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
      <label className="mb-1 block text-sm text-gray-300">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-admin-border-strong bg-admin-panel px-3 py-2 text-sm text-white"
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
      <label className="mb-1 block text-sm text-gray-300">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-admin-border-strong bg-admin-panel px-3 py-2 text-sm text-white"
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

function LabelsEditor({
  labels,
  onChange,
}: {
  labels: Labels;
  onChange: (labels: Labels) => void;
}) {
  const update = (lang: SidebarLanguage, value: string) => {
    onChange({
      ...labels,
      [lang]: { ...labels[lang], line1: value },
    });
  };

  return (
    <div className="space-y-3">
      {(['pt', 'en', 'es'] as const).map((lang) => (
        <Field
          key={lang}
          label={lang.toUpperCase()}
          value={labels[lang].line1}
          onChange={(value) => update(lang, value)}
        />
      ))}
    </div>
  );
}

function ActiveToggle({
  active,
  disabled,
  label,
  onToggle,
}: {
  active: boolean;
  disabled?: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-label={active ? `Desativar ${label}` : `Ativar ${label}`}
      title={active ? 'Clique para desativar' : 'Clique para ativar'}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        active
          ? 'border-admin-success/40 bg-admin-success/25'
          : 'border-admin-border bg-admin-panel-3'
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          active ? 'translate-x-6' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

function FilterChip({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'border-admin-accent/40 bg-admin-accent/15 text-white'
          : 'border-admin-border bg-admin-panel text-gray-400 hover:text-gray-200'
      }`}
    >
      {label} ({count})
    </button>
  );
}

function getMenuItemLinkLabel(item: MenuItemRow) {
  if (item.link_tipo === 'href') return item.href || '—';
  if (item.link_tipo === 'game') return item.game_name || '—';
  return item.action_value || '—';
}

export default function SidebarMenuAdmin() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm);

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [creatingItem, setCreatingItem] = useState(false);
  const [menuItemForm, setMenuItemForm] = useState(emptyMenuItemForm);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const menuCategoryOptions = useMemo(
    () => categories.filter((category) => category.category_tipo === 'menu'),
    [categories],
  );

  const activeMenuCategories = useMemo(
    () => menuCategoryOptions.filter((category) => category.ativo),
    [menuCategoryOptions],
  );

  const filteredCategories = useMemo(() => {
    if (statusFilter === 'active') return categories.filter((category) => category.ativo);
    if (statusFilter === 'inactive') return categories.filter((category) => !category.ativo);
    return categories;
  }, [categories, statusFilter]);

  const sortedMenuItems = useMemo(() => {
    const categoryOrder = new Map(categories.map((category) => [category.slug, category.ordem]));
    return [...menuItems].sort((a, b) => {
      const categoryDiff =
        (categoryOrder.get(a.categoria_slug) ?? 999) - (categoryOrder.get(b.categoria_slug) ?? 999);
      if (categoryDiff !== 0) return categoryDiff;
      return a.ordem - b.ordem;
    });
  }, [menuItems, categories]);

  const filteredMenuItems = useMemo(() => {
    if (statusFilter === 'active') return sortedMenuItems.filter((item) => item.ativo);
    if (statusFilter === 'inactive') return sortedMenuItems.filter((item) => !item.ativo);
    return sortedMenuItems;
  }, [sortedMenuItems, statusFilter]);

  const statusCounts = useMemo(() => {
    const inactiveCategories = categories.filter((category) => !category.ativo).length;
    const inactiveItems = menuItems.filter((item) => !item.ativo).length;
    return {
      categories: categories.length,
      items: menuItems.length,
      inactive: inactiveCategories + inactiveItems,
    };
  }, [categories, menuItems]);

  const loadMenu = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cms_items')
        .select('*')
        .in('secao', [CMS_CATEGORY, CMS_MENU_ITEM])
        .order('ordem', { ascending: true });

      if (error) {
        showToast('Erro ao carregar menu da sidebar. Execute sidebar_menu.sql.', 'error');
        return;
      }

      const rows = (data || []) as Record<string, unknown>[];
      setCategories(rows.filter((row) => row.secao === CMS_CATEGORY).map(rowToCategory));
      setMenuItems(rows.filter((row) => row.secao === CMS_MENU_ITEM).map(rowToMenuItem));
    } catch {
      showToast('Erro ao carregar menu da sidebar.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMenu();
  }, []);

  const startCreateCategory = () => {
    setEditingCategoryId(null);
    setCreatingCategory(true);
    const nextOrder = categories.length > 0 ? Math.max(...categories.map((c) => c.ordem)) + 1 : 1;
    setCategoryForm({ ...emptyCategoryForm, ordem: nextOrder });
  };

  const startEditCategory = (category: CategoryRow) => {
    setCreatingCategory(false);
    setEditingCategoryId(category.id);
    setCategoryForm({
      nome_admin: category.nome_admin,
      slug: category.slug,
      category_tipo: category.category_tipo,
      labels: category.labels,
      ordem: category.ordem,
      ativo: category.ativo,
    });
  };

  const saveCategory = async () => {
    if (!categoryForm.nome_admin.trim() || !categoryForm.slug.trim()) {
      showToast('Informe nome interno e slug da categoria.', 'error');
      return;
    }
    if (!categoryForm.labels.pt.line1.trim()) {
      showToast('Informe o título em português.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = buildCategoryPayload({
        ...categoryForm,
        slug: slugify(categoryForm.slug),
      });

      const response = editingCategoryId
        ? await supabase
            .from('cms_items')
            .update(payload)
            .eq('id', editingCategoryId)
            .eq('secao', CMS_CATEGORY)
        : await supabase.from('cms_items').insert(payload);

      if (response.error) {
        showToast('Erro ao salvar categoria.', 'error');
        return;
      }

      showToast(editingCategoryId ? 'Categoria atualizada!' : 'Categoria criada!', 'success');
      setEditingCategoryId(null);
      setCreatingCategory(false);
      setCategoryForm(emptyCategoryForm);
      await loadMenu();
    } finally {
      setSaving(false);
    }
  };

  const removeCategory = async (category: CategoryRow) => {
    const linkedItems = menuItems.filter((item) => item.categoria_slug === category.slug);
    if (linkedItems.length > 0) {
      showToast('Remova ou mova os botões desta categoria antes de excluí-la.', 'error');
      return;
    }
    if (!window.confirm(`Excluir categoria "${category.nome_admin}"?`)) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('cms_items')
        .delete()
        .eq('id', category.id)
        .eq('secao', CMS_CATEGORY);
      if (error) {
        showToast('Erro ao excluir categoria.', 'error');
        return;
      }
      showToast('Categoria excluída.', 'success');
      await loadMenu();
    } finally {
      setSaving(false);
    }
  };

  const startCreateItem = () => {
    setEditingItemId(null);
    setCreatingItem(true);
    const nextOrder = menuItems.length > 0 ? Math.max(...menuItems.map((item) => item.ordem)) + 1 : 1;
    setMenuItemForm({
      ...emptyMenuItemForm,
      ordem: nextOrder,
      categoria_slug: activeMenuCategories[0]?.slug || menuCategoryOptions[0]?.slug || '',
    });
  };

  const startEditItem = (item: MenuItemRow) => {
    setCreatingItem(false);
    setEditingItemId(item.id);
    setMenuItemForm({
      nome_admin: item.nome_admin,
      categoria_slug: item.categoria_slug,
      labels: item.labels,
      link_tipo: item.link_tipo,
      href: item.href || '',
      game_name: item.game_name || '',
      action_value: item.action_value || '',
      icon_type: item.icon_type,
      icon_value: item.icon_value || '',
      destaque: item.destaque,
      ordem: item.ordem,
      ativo: item.ativo,
    });
  };

  const saveMenuItem = async () => {
    if (!menuItemForm.nome_admin.trim() || !menuItemForm.categoria_slug.trim()) {
      showToast('Informe nome interno e categoria.', 'error');
      return;
    }
    if (!menuItemForm.labels.pt.line1.trim()) {
      showToast('Informe o texto em português.', 'error');
      return;
    }
    if (menuItemForm.link_tipo === 'href' && !menuItemForm.href.trim()) {
      showToast('Informe a rota do botão.', 'error');
      return;
    }
    if (menuItemForm.link_tipo === 'game' && !menuItemForm.game_name.trim()) {
      showToast('Informe o nome do jogo.', 'error');
      return;
    }
    if (
      (menuItemForm.link_tipo === 'external' || menuItemForm.link_tipo === 'event') &&
      !menuItemForm.action_value.trim()
    ) {
      showToast('Informe a URL externa ou o evento.', 'error');
      return;
    }
    if (menuItemForm.icon_type !== 'none' && !menuItemForm.icon_value.trim()) {
      showToast('Informe o valor do ícone.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = buildMenuItemPayload(menuItemForm);
      const response = editingItemId
        ? await supabase
            .from('cms_items')
            .update(payload)
            .eq('id', editingItemId)
            .eq('secao', CMS_MENU_ITEM)
        : await supabase.from('cms_items').insert(payload);

      if (response.error) {
        showToast('Erro ao salvar botão.', 'error');
        return;
      }

      showToast(editingItemId ? 'Botão atualizado!' : 'Botão criado!', 'success');
      setEditingItemId(null);
      setCreatingItem(false);
      setMenuItemForm(emptyMenuItemForm);
      await loadMenu();
    } finally {
      setSaving(false);
    }
  };

  const removeMenuItem = async (id: string) => {
    if (!window.confirm('Excluir este botão do menu?')) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('cms_items').delete().eq('id', id).eq('secao', CMS_MENU_ITEM);
      if (error) {
        showToast('Erro ao excluir botão.', 'error');
        return;
      }
      showToast('Botão excluído.', 'success');
      await loadMenu();
    } finally {
      setSaving(false);
    }
  };

  const handleCategoriesReorder = async (reordered: CategoryRow[]) => {
    const withOrder = applySequentialOrder(reordered);
    setCategories(withOrder);
    try {
      await persistTableOrder('cms_items', withOrder.map((item) => item.id));
      showToast('Ordem das categorias atualizada!', 'success');
    } catch {
      showToast('Erro ao salvar ordem das categorias.', 'error');
      await loadMenu();
    }
  };

  const handleItemsReorder = async (reordered: MenuItemRow[]) => {
    const withOrder = applySequentialOrder(reordered);
    setMenuItems(withOrder);
    try {
      await persistTableOrder('cms_items', withOrder.map((item) => item.id));
      showToast('Ordem dos botões atualizada!', 'success');
    } catch {
      showToast('Erro ao salvar ordem dos botões.', 'error');
      await loadMenu();
    }
  };

  const setToggling = (id: string, toggling: boolean) => {
    setTogglingIds((current) => {
      const next = new Set(current);
      if (toggling) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleCategoryAtivo = async (category: CategoryRow) => {
    if (togglingIds.has(category.id)) return;

    const nextAtivo = !category.ativo;
    setToggling(category.id, true);
    setCategories((current) =>
      current.map((row) => (row.id === category.id ? { ...row, ativo: nextAtivo } : row)),
    );

    try {
      const { error } = await supabase
        .from('cms_items')
        .update({ ativo: nextAtivo, updated_at: new Date().toISOString() })
        .eq('id', category.id)
        .eq('secao', CMS_CATEGORY);

      if (error) {
        setCategories((current) =>
          current.map((row) => (row.id === category.id ? { ...row, ativo: category.ativo } : row)),
        );
        showToast('Erro ao alterar status da categoria.', 'error');
        return;
      }

      showToast(nextAtivo ? 'Categoria ativada.' : 'Categoria desativada.', 'success');
    } finally {
      setToggling(category.id, false);
    }
  };

  const toggleMenuItemAtivo = async (item: MenuItemRow) => {
    if (togglingIds.has(item.id)) return;

    const nextAtivo = !item.ativo;
    setToggling(item.id, true);
    setMenuItems((current) =>
      current.map((row) => (row.id === item.id ? { ...row, ativo: nextAtivo } : row)),
    );

    try {
      const { error } = await supabase
        .from('cms_items')
        .update({ ativo: nextAtivo, updated_at: new Date().toISOString() })
        .eq('id', item.id)
        .eq('secao', CMS_MENU_ITEM);

      if (error) {
        setMenuItems((current) =>
          current.map((row) => (row.id === item.id ? { ...row, ativo: item.ativo } : row)),
        );
        showToast('Erro ao alterar status do botão.', 'error');
        return;
      }

      showToast(nextAtivo ? 'Botão ativado.' : 'Botão desativado.', 'success');
    } finally {
      setToggling(item.id, false);
    }
  };

  const renderCategoryEditor = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field
          label="Nome interno (admin)"
          value={categoryForm.nome_admin}
          onChange={(value) =>
            setCategoryForm((prev) => ({
              ...prev,
              nome_admin: value,
              slug: prev.slug || slugify(value),
            }))
          }
        />
        <Field
          label="Slug (identificador)"
          value={categoryForm.slug}
          onChange={(value) => setCategoryForm({ ...categoryForm, slug: slugify(value) })}
          placeholder="cassino"
        />
        <SelectField
          label="Tipo"
          value={categoryForm.category_tipo}
          onChange={(value) =>
            setCategoryForm({ ...categoryForm, category_tipo: value as CategoryTipo })
          }
          options={[
            { value: 'menu', label: 'Menu com botões' },
            { value: 'language', label: 'Seletor de idioma' },
          ]}
        />
        <Field
          label="Ordem"
          type="number"
          value={String(categoryForm.ordem)}
          onChange={(value) => setCategoryForm({ ...categoryForm, ordem: Number(value) })}
        />
      </div>
      <div>
        <p className="mb-2 text-sm font-medium text-gray-200">Título da seção por idioma</p>
        <LabelsEditor
          labels={categoryForm.labels}
          onChange={(labels) => setCategoryForm({ ...categoryForm, labels })}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-300">
        <input
          type="checkbox"
          checked={categoryForm.ativo}
          onChange={(e) => setCategoryForm({ ...categoryForm, ativo: e.target.checked })}
        />
        Ativa
      </label>
    </div>
  );

  const renderMenuItemEditor = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field
          label="Nome interno (admin)"
          value={menuItemForm.nome_admin}
          onChange={(value) => setMenuItemForm({ ...menuItemForm, nome_admin: value })}
        />
        <SelectField
          label="Categoria"
          value={menuItemForm.categoria_slug}
          onChange={(value) => setMenuItemForm({ ...menuItemForm, categoria_slug: value })}
          options={[
            { value: '', label: 'Selecione...' },
            ...menuCategoryOptions.map((category) => ({
              value: category.slug,
              label: `${category.nome_admin}${category.ativo ? '' : ' (inativa)'}`,
            })),
          ]}
        />
        <SelectField
          label="Tipo de link"
          value={menuItemForm.link_tipo}
          onChange={(value) => setMenuItemForm({ ...menuItemForm, link_tipo: value as LinkTipo })}
          options={[
            { value: 'href', label: 'Rota interna' },
            { value: 'game', label: 'Abrir jogo' },
            { value: 'external', label: 'Link externo' },
            { value: 'event', label: 'Evento do site' },
          ]}
        />
        <Field
          label="Ordem"
          type="number"
          value={String(menuItemForm.ordem)}
          onChange={(value) => setMenuItemForm({ ...menuItemForm, ordem: Number(value) })}
        />
        {menuItemForm.link_tipo === 'href' ? (
          <Field
            label="Rota (href)"
            value={menuItemForm.href}
            onChange={(value) => setMenuItemForm({ ...menuItemForm, href: value })}
            placeholder="/games"
            className="md:col-span-2"
          />
        ) : null}
        {menuItemForm.link_tipo === 'game' ? (
          <Field
            label="Nome do jogo"
            value={menuItemForm.game_name}
            onChange={(value) => setMenuItemForm({ ...menuItemForm, game_name: value })}
            placeholder="Mines"
            className="md:col-span-2"
          />
        ) : null}
        {menuItemForm.link_tipo === 'external' ? (
          <Field
            label="URL externa"
            value={menuItemForm.action_value}
            onChange={(value) => setMenuItemForm({ ...menuItemForm, action_value: value })}
            placeholder="https://t.me/royalbet_oficial"
            className="md:col-span-2"
          />
        ) : null}
        {menuItemForm.link_tipo === 'event' ? (
          <SelectField
            label="Evento"
            value={menuItemForm.action_value}
            onChange={(value) => setMenuItemForm({ ...menuItemForm, action_value: value })}
            options={[
              { value: '', label: 'Selecione...' },
              { value: 'openCouponModal', label: 'Abrir modal de cupom' },
            ]}
          />
        ) : null}
        <SelectField
          label="Tipo de ícone"
          value={menuItemForm.icon_type}
          onChange={(value) => setMenuItemForm({ ...menuItemForm, icon_type: value as IconType })}
          options={[
            { value: 'none', label: 'Nenhum' },
            { value: 'emoji', label: 'Emoji' },
            { value: 'image', label: 'Imagem (URL)' },
            { value: 'iconify', label: 'Iconify' },
          ]}
        />
        {menuItemForm.icon_type !== 'none' ? (
          <Field
            label="Valor do ícone"
            value={menuItemForm.icon_value}
            onChange={(value) => setMenuItemForm({ ...menuItemForm, icon_value: value })}
            placeholder="ph:gift-duotone"
          />
        ) : null}
      </div>
      <div>
        <p className="mb-2 text-sm font-medium text-gray-200">Texto do botão por idioma</p>
        <LabelsEditor
          labels={menuItemForm.labels}
          onChange={(labels) => setMenuItemForm({ ...menuItemForm, labels })}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-300">
        <input
          type="checkbox"
          checked={menuItemForm.destaque}
          onChange={(e) => setMenuItemForm({ ...menuItemForm, destaque: e.target.checked })}
        />
        Texto em negrito
      </label>
      <label className="flex items-center gap-2 text-sm text-gray-300">
        <input
          type="checkbox"
          checked={menuItemForm.ativo}
          onChange={(e) => setMenuItemForm({ ...menuItemForm, ativo: e.target.checked })}
        />
        Ativo
      </label>
    </div>
  );

  if (loading) {
    return <LoadingState message="Carregando menu da sidebar..." />;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-admin-border bg-admin-panel p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-gray-300">
              {statusCounts.categories} categorias · {statusCounts.items} botões ·{' '}
              {statusCounts.inactive} inativos
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Use o interruptor para ativar ou desativar sem abrir o editor.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FilterChip
              active={statusFilter === 'all'}
              label="Todos"
              count={categories.length + menuItems.length}
              onClick={() => setStatusFilter('all')}
            />
            <FilterChip
              active={statusFilter === 'active'}
              label="Ativos"
              count={
                categories.filter((category) => category.ativo).length +
                menuItems.filter((item) => item.ativo).length
              }
              onClick={() => setStatusFilter('active')}
            />
            <FilterChip
              active={statusFilter === 'inactive'}
              label="Inativos"
              count={statusCounts.inactive}
              onClick={() => setStatusFilter('inactive')}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-admin-border bg-admin-panel-2/50 p-4 md:p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-white">
              <FolderTree className="h-5 w-5" />
              Categorias do menu
            </h2>
            <p className="text-sm text-gray-400">
              Seções como Cassino, Extras ou seletor de idioma.
            </p>
          </div>
          <Button
            icon={Plus}
            onClick={startCreateCategory}
            disabled={saving || creatingCategory || editingCategoryId !== null}
            className="!px-3 !py-2 !text-sm"
          >
            Nova categoria
          </Button>
        </div>

        {filteredCategories.length === 0 ? (
          <EmptyState
            icon={FolderTree}
            title={
              statusFilter === 'all'
                ? 'Nenhuma categoria cadastrada.'
                : 'Nenhuma categoria neste filtro.'
            }
          />
        ) : (
          <SortableOrderList
            items={filteredCategories}
            onReorder={handleCategoriesReorder}
            disabled={
              saving ||
              creatingCategory ||
              editingCategoryId !== null ||
              statusFilter !== 'all'
            }
            className="space-y-3"
            renderItem={(category) => (
              <div
                className={`rounded-lg border border-admin-border bg-admin-panel p-4 transition-opacity ${
                  category.ativo ? '' : 'opacity-60'
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-white">{category.nome_admin}</h3>
                      <StatusBadge variant={category.ativo ? 'success' : 'neutral'}>
                        {category.ativo ? 'Ativa' : 'Inativa'}
                      </StatusBadge>
                      <span className="rounded bg-gray-700 px-2 py-0.5 text-xs text-gray-300">
                        {category.slug}
                      </span>
                      <span className="rounded bg-gray-700 px-2 py-0.5 text-xs text-gray-300">
                        {category.category_tipo === 'language' ? 'Idioma' : 'Menu'}
                      </span>
                      <span className="text-xs text-gray-500">Ordem {category.ordem}</span>
                    </div>
                    <p className="text-sm text-gray-400">{category.labels.pt.line1 || '—'}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {menuItems.filter((item) => item.categoria_slug === category.slug).length} botões
                      vinculados
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                    <div className="flex items-center gap-2 rounded-lg border border-admin-border bg-admin-panel-2 px-3 py-2">
                      <span className="text-xs text-gray-400">Ativa</span>
                      <ActiveToggle
                        active={category.ativo}
                        disabled={saving || togglingIds.has(category.id)}
                        label={category.nome_admin}
                        onToggle={() => void toggleCategoryAtivo(category)}
                      />
                    </div>
                    <Button
                      variant="secondary"
                      icon={Pencil}
                      onClick={() => startEditCategory(category)}
                      disabled={saving}
                      className="!px-3 !py-1.5 !text-xs"
                    >
                      Editar
                    </Button>
                    <Button
                      variant="danger"
                      icon={Trash2}
                      onClick={() => void removeCategory(category)}
                      disabled={saving}
                      className="!px-3 !py-1.5 !text-xs"
                    >
                      Excluir
                    </Button>
                  </div>
                </div>
              </div>
            )}
          />
        )}
      </div>

      <div className="rounded-xl border border-admin-border bg-admin-panel-2/50 p-4 md:p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-white">
              <Link2 className="h-5 w-5" />
              Botões do menu
            </h2>
            <p className="text-sm text-gray-400">
              Rotas, links externos, jogos e eventos exibidos na sidebar.
            </p>
          </div>
          <Button
            icon={Plus}
            onClick={startCreateItem}
            disabled={
              saving ||
              creatingItem ||
              editingItemId !== null ||
              menuCategoryOptions.length === 0
            }
            className="!px-3 !py-2 !text-sm"
          >
            Novo botão
          </Button>
        </div>

        {menuCategoryOptions.length === 0 ? (
          <p className="text-sm text-gray-400">Crie uma categoria do tipo menu antes de adicionar botões.</p>
        ) : filteredMenuItems.length === 0 ? (
          <EmptyState
            icon={Link2}
            title={
              statusFilter === 'all' ? 'Nenhum botão cadastrado.' : 'Nenhum botão neste filtro.'
            }
          />
        ) : (
          <div className="space-y-6">
            {menuCategoryOptions.map((category) => {
              const categoryItems = filteredMenuItems.filter(
                (item) => item.categoria_slug === category.slug,
              );
              if (categoryItems.length === 0) return null;

              return (
                <div key={category.id} className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 border-b border-admin-border pb-2">
                    <h3 className="text-sm font-semibold text-white">{category.nome_admin}</h3>
                    <span className="text-xs text-gray-500">{category.slug}</span>
                    {!category.ativo ? (
                      <StatusBadge variant="warning">Categoria inativa</StatusBadge>
                    ) : null}
                    <span className="text-xs text-gray-500">
                      {categoryItems.length} botão{categoryItems.length === 1 ? '' : 'es'}
                    </span>
                  </div>

                  <SortableOrderList
                    items={categoryItems}
                    onReorder={async (reordered) => {
                      const itemsByCategory = new Map<string, MenuItemRow[]>();
                      for (const menuCategory of menuCategoryOptions) {
                        if (menuCategory.slug === category.slug) {
                          itemsByCategory.set(menuCategory.slug, applySequentialOrder(reordered));
                          continue;
                        }
                        itemsByCategory.set(
                          menuCategory.slug,
                          menuItems.filter((row) => row.categoria_slug === menuCategory.slug),
                        );
                      }

                      const orphanItems = menuItems.filter(
                        (row) =>
                          !menuCategoryOptions.some(
                            (menuCategory) => menuCategory.slug === row.categoria_slug,
                          ),
                      );

                      const merged = [
                        ...menuCategoryOptions.flatMap(
                          (menuCategory) => itemsByCategory.get(menuCategory.slug) || [],
                        ),
                        ...orphanItems,
                      ];

                      await handleItemsReorder(merged);
                    }}
                    disabled={
                      saving ||
                      creatingItem ||
                      editingItemId !== null ||
                      statusFilter !== 'all'
                    }
                    className="space-y-3"
                    renderItem={(item) => (
                      <div
                        className={`rounded-lg border border-admin-border bg-admin-panel p-4 transition-opacity ${
                          item.ativo ? '' : 'opacity-60'
                        }`}
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              {item.icon_type === 'iconify' && item.icon_value ? (
                                <span
                                  className="iconify text-gray-300"
                                  data-icon={item.icon_value}
                                  style={{ fontSize: '18px' }}
                                />
                              ) : null}
                              <h3 className="font-semibold text-white">{item.nome_admin}</h3>
                              <StatusBadge variant={item.ativo ? 'success' : 'neutral'}>
                                {item.ativo ? 'Ativo' : 'Inativo'}
                              </StatusBadge>
                              {item.destaque ? (
                                <StatusBadge variant="info">Negrito</StatusBadge>
                              ) : null}
                              <span className="rounded bg-gray-700 px-2 py-0.5 text-xs text-gray-300">
                                {item.link_tipo}
                              </span>
                              <span className="text-xs text-gray-500">Ordem {item.ordem}</span>
                            </div>
                            <p className="text-sm text-gray-300">{item.labels.pt.line1 || '—'}</p>
                            <p className="mt-1 truncate text-xs text-gray-500">
                              {getMenuItemLinkLabel(item)}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
                            <div className="flex items-center gap-2 rounded-lg border border-admin-border bg-admin-panel-2 px-3 py-2">
                              <span className="text-xs text-gray-400">Ativo</span>
                              <ActiveToggle
                                active={item.ativo}
                                disabled={saving || togglingIds.has(item.id)}
                                label={item.nome_admin}
                                onToggle={() => void toggleMenuItemAtivo(item)}
                              />
                            </div>
                            <Button
                              variant="secondary"
                              icon={Pencil}
                              onClick={() => startEditItem(item)}
                              disabled={saving}
                              className="!px-3 !py-1.5 !text-xs"
                            >
                              Editar
                            </Button>
                            <Button
                              variant="danger"
                              icon={Trash2}
                              onClick={() => void removeMenuItem(item.id)}
                              disabled={saving}
                              className="!px-3 !py-1.5 !text-xs"
                            >
                              Excluir
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  />
                </div>
              );
            })}

            {filteredMenuItems.some(
              (item) => !menuCategoryOptions.some((category) => category.slug === item.categoria_slug),
            ) ? (
              <div className="space-y-3">
                <div className="border-b border-admin-border pb-2">
                  <h3 className="text-sm font-semibold text-white">Sem categoria</h3>
                </div>
                {filteredMenuItems
                  .filter(
                    (item) =>
                      !menuCategoryOptions.some((category) => category.slug === item.categoria_slug),
                  )
                  .map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-admin-border bg-admin-panel p-4 opacity-80"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{item.nome_admin}</p>
                          <p className="text-xs text-gray-500">Categoria: {item.categoria_slug}</p>
                        </div>
                        <Button
                          variant="secondary"
                          icon={Pencil}
                          onClick={() => startEditItem(item)}
                          className="!px-3 !py-1.5 !text-xs"
                        >
                          Editar
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            ) : null}
          </div>
        )}
      </div>

      <Modal
        open={creatingCategory}
        onClose={() => {
          setCreatingCategory(false);
          setCategoryForm(emptyCategoryForm);
        }}
        title="Nova categoria"
        description="Crie uma seção do menu lateral."
        icon={FolderTree}
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setCreatingCategory(false);
                setCategoryForm(emptyCategoryForm);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={saveCategory} loading={saving}>
              Criar categoria
            </Button>
          </>
        }
      >
        {renderCategoryEditor()}
      </Modal>

      <Modal
        open={editingCategoryId !== null}
        onClose={() => {
          setEditingCategoryId(null);
          setCategoryForm(emptyCategoryForm);
        }}
        title={categoryForm.nome_admin ? `Editar: ${categoryForm.nome_admin}` : 'Editar categoria'}
        description="Atualize título, tipo e status da seção."
        icon={Pencil}
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setEditingCategoryId(null);
                setCategoryForm(emptyCategoryForm);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={saveCategory} loading={saving}>
              Salvar alterações
            </Button>
          </>
        }
      >
        {renderCategoryEditor()}
      </Modal>

      <Modal
        open={creatingItem}
        onClose={() => {
          setCreatingItem(false);
          setMenuItemForm(emptyMenuItemForm);
        }}
        title="Novo botão do menu"
        description="Configure rota, ícone e textos do botão."
        icon={Link2}
        size="xl"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setCreatingItem(false);
                setMenuItemForm(emptyMenuItemForm);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={saveMenuItem} loading={saving}>
              Criar botão
            </Button>
          </>
        }
      >
        {renderMenuItemEditor()}
      </Modal>

      <Modal
        open={editingItemId !== null}
        onClose={() => {
          setEditingItemId(null);
          setMenuItemForm(emptyMenuItemForm);
        }}
        title={menuItemForm.nome_admin ? `Editar: ${menuItemForm.nome_admin}` : 'Editar botão'}
        description="Atualize link, ícone, textos e status do botão."
        icon={Pencil}
        size="xl"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setEditingItemId(null);
                setMenuItemForm(emptyMenuItemForm);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={saveMenuItem} loading={saving}>
              Salvar alterações
            </Button>
          </>
        }
      >
        {renderMenuItemEditor()}
      </Modal>
    </div>
  );
}
