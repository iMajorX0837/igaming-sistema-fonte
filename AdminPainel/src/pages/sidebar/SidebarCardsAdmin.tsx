import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../contexts/ToastContext';
import SortableOrderList from '../../components/SortableOrderList';
import { applySequentialOrder } from '../../lib/reorderUtils';
import { persistTableOrder } from '../../lib/persistTableOrder';
import {
  buildCardLabelsFromPortuguese,
  emptyLabels,
  translateFromPortuguese,
  type Labels,
} from '../../lib/autoTranslateLabels';
import LoadingState from '../../components/ui/LoadingState';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import { LayoutTemplate, Pencil, Trash2, Plus, Power } from 'lucide-react';
import { ADMIN_IMAGE_SIZES } from '../../lib/adminImageSizes';
import type { AdminImageSizeSpec } from '../../lib/adminImageSizes';
import ImageSizeHint from '../../components/ui/ImageSizeHint';

type TextTheme = 'light' | 'dark';
type CardLayout = 'single' | 'double';
type IconType = 'emoji' | 'image' | 'iconify' | 'none';
type StatusFilter = 'all' | 'active' | 'inactive';

interface SidebarPromoCardRow {
  id: string;
  nome_admin: string;
  href: string;
  ordem: number;
  ativo: boolean;
  background_color: string;
  bloom_color: string;
  outer_glow: string;
  text_theme: TextTheme;
  layout: CardLayout;
  icon_type: IconType;
  icon_value: string | null;
  icon_alt: string | null;
  labels: Labels;
}

const CMS_SECAO = 'sidebar_card';

const emptyForm = {
  nome_admin: '',
  href: '/help/',
  ordem: 1,
  ativo: true,
  background_color: '#6212A5',
  bloom_color: '#C084FC',
  outer_glow: '',
  text_theme: 'light' as TextTheme,
  layout: 'single' as CardLayout,
  icon_type: 'none' as IconType,
  icon_value: '',
  icon_alt: '',
  labels: emptyLabels(),
};

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.replace('#', '').trim();
  if (normalized.length === 3) {
    return {
      r: parseInt(normalized[0] + normalized[0], 16),
      g: parseInt(normalized[1] + normalized[1], 16),
      b: parseInt(normalized[2] + normalized[2], 16),
    };
  }
  if (normalized.length === 6) {
    return {
      r: parseInt(normalized.slice(0, 2), 16),
      g: parseInt(normalized.slice(2, 4), 16),
      b: parseInt(normalized.slice(4, 6), 16),
    };
  }
  return null;
}

function outerGlowFromBloomColor(bloomColor: string, opacity = 0.48): string {
  const rgb = hexToRgb(bloomColor);
  if (!rgb || Number.isNaN(rgb.r) || Number.isNaN(rgb.g) || Number.isNaN(rgb.b)) {
    return `rgba(192, 132, 252, ${opacity})`;
  }
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
}

function normalizeLabels(raw: unknown): Labels {
  const fallback = emptyLabels();
  if (!raw || typeof raw !== 'object') return fallback;
  const data = raw as Partial<Record<'pt' | 'en' | 'es', Partial<{ line1: string; line2: string }>>>;
  const pick = (lang: 'pt' | 'en' | 'es') => ({
    line1: data[lang]?.line1 || '',
    line2: data[lang]?.line2 || '',
  });
  return { pt: pick('pt'), en: pick('en'), es: pick('es') };
}

function rowToForm(card: SidebarPromoCardRow) {
  return {
    nome_admin: card.nome_admin,
    href: card.href,
    ordem: card.ordem,
    ativo: card.ativo,
    background_color: card.background_color,
    bloom_color: card.bloom_color,
    outer_glow: outerGlowFromBloomColor(card.bloom_color),
    text_theme: card.text_theme,
    layout: card.layout,
    icon_type: card.icon_type,
    icon_value: card.icon_value || '',
    icon_alt: card.icon_alt || '',
    labels: card.labels,
  };
}

function buildPayload(form: typeof emptyForm, labels: Labels) {
  return {
    secao: CMS_SECAO,
    nome_admin: form.nome_admin.trim(),
    href: form.href.trim(),
    ordem: form.ordem,
    ativo: form.ativo,
    background_color: form.background_color.trim(),
    bloom_color: form.bloom_color.trim(),
    outer_glow: outerGlowFromBloomColor(form.bloom_color.trim()),
    text_theme: form.text_theme,
    layout: form.layout,
    icon_type: form.icon_type,
    icon_value: form.icon_type === 'none' ? null : form.icon_value.trim() || null,
    icon_alt: form.icon_alt.trim() || null,
    labels: {
      pt: {
        line1: labels.pt.line1.trim(),
        line2: form.layout === 'double' ? labels.pt.line2.trim() || null : null,
      },
      en: {
        line1: labels.en.line1.trim(),
        line2: form.layout === 'double' ? labels.en.line2.trim() || null : null,
      },
      es: {
        line1: labels.es.line1.trim(),
        line2: form.layout === 'double' ? labels.es.line2.trim() || null : null,
      },
    },
    updated_at: new Date().toISOString(),
  };
}

function validateForm(form: typeof emptyForm, showToast: (msg: string, type: 'error' | 'success') => void) {
  if (!form.nome_admin.trim()) {
    showToast('Informe o nome interno do card.', 'error');
    return false;
  }
  if (!form.href.trim()) {
    showToast('Informe a rota do card.', 'error');
    return false;
  }
  if (!form.labels.pt.line1.trim()) {
    showToast('Informe o texto em português.', 'error');
    return false;
  }
  if (form.layout === 'double' && !form.labels.pt.line2.trim()) {
    showToast('Informe a linha 2 em português para layout duplo.', 'error');
    return false;
  }
  if (form.icon_type !== 'none' && !form.icon_value.trim()) {
    showToast('Informe o valor do ícone.', 'error');
    return false;
  }
  return true;
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

export default function SidebarCardsAdmin() {
  const { showToast } = useToast();
  const [cards, setCards] = useState<SidebarPromoCardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filteredCards = useMemo(() => {
    if (statusFilter === 'active') return cards.filter((card) => card.ativo);
    if (statusFilter === 'inactive') return cards.filter((card) => !card.ativo);
    return cards;
  }, [cards, statusFilter]);

  const statusCounts = useMemo(
    () => ({
      total: cards.length,
      active: cards.filter((card) => card.ativo).length,
      inactive: cards.filter((card) => !card.ativo).length,
    }),
    [cards],
  );

  const loadCards = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('cms_items')
        .select('*')
        .eq('secao', CMS_SECAO)
        .order('ordem', { ascending: true });

      if (fetchError) {
        setError('Erro ao carregar cards. Execute cms_items.sql no Supabase.');
        return;
      }

      setCards(
        ((data || []) as Record<string, unknown>[]).map((row) => ({
          id: String(row.id),
          nome_admin: String(row.nome_admin || ''),
          href: String(row.href || ''),
          ordem: Number(row.ordem) || 0,
          ativo: Boolean(row.ativo),
          background_color: String(row.background_color || '#6212A5'),
          bloom_color: String(row.bloom_color || '#C084FC'),
          outer_glow: String(row.outer_glow || 'rgba(98, 18, 165, 0.48)'),
          text_theme: row.text_theme === 'dark' ? 'dark' : 'light',
          layout: row.layout === 'double' ? 'double' : 'single',
          icon_type:
            row.icon_type === 'emoji' || row.icon_type === 'image' || row.icon_type === 'iconify'
              ? row.icon_type
              : 'none',
          icon_value: row.icon_value ? String(row.icon_value) : null,
          icon_alt: row.icon_alt ? String(row.icon_alt) : null,
          labels: normalizeLabels(row.labels),
        })),
      );
    } catch {
      setError('Erro ao carregar cards da sidebar.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCards();
  }, []);

  const modalBusy =
    saving || isCreating || editingId !== null || deletingId !== null;

  const startCreate = () => {
    setEditingId(null);
    setDeletingId(null);
    setIsCreating(true);
    const nextOrder = cards.length > 0 ? Math.max(...cards.map((c) => c.ordem)) + 1 : 1;
    setCreateForm({ ...emptyForm, ordem: nextOrder });
  };

  const cancelCreate = () => {
    setIsCreating(false);
    setCreateForm(emptyForm);
  };

  const startEdit = (card: SidebarPromoCardRow) => {
    setIsCreating(false);
    setDeletingId(null);
    setEditingId(card.id);
    setEditForm(rowToForm(card));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(emptyForm);
  };

  const saveWithLabels = async (form: typeof emptyForm, id?: string) => {
    const labels = await buildCardLabelsFromPortuguese(
      form.labels.pt.line1,
      form.layout === 'double' ? form.labels.pt.line2 : '',
    );
    const payload = buildPayload(form, labels);

    if (id) {
      return supabase.from('cms_items').update(payload).eq('id', id).eq('secao', CMS_SECAO);
    }
    return supabase.from('cms_items').insert(payload);
  };

  const saveEdit = async () => {
    if (!editingId || !validateForm(editForm, showToast)) return;
    setSaving(true);
    try {
      const { error: updateError } = await saveWithLabels(editForm, editingId);
      if (updateError) {
        showToast('Erro ao salvar card.', 'error');
        return;
      }
      showToast('Card atualizado! Traduções geradas automaticamente.', 'success');
      cancelEdit();
      await loadCards();
    } catch {
      showToast('Erro ao traduzir ou salvar card.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveCreate = async () => {
    if (!validateForm(createForm, showToast)) return;
    setSaving(true);
    try {
      const { error: insertError } = await saveWithLabels(createForm);
      if (insertError) {
        showToast('Erro ao criar card.', 'error');
        return;
      }
      showToast('Card criado! Traduções geradas automaticamente.', 'success');
      cancelCreate();
      await loadCards();
    } catch {
      showToast('Erro ao traduzir ou salvar card.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const removeCard = async () => {
    if (!deletingId) return;
    setSaving(true);
    try {
      const { error: deleteError } = await supabase
        .from('cms_items')
        .delete()
        .eq('id', deletingId)
        .eq('secao', CMS_SECAO);
      if (deleteError) {
        showToast('Erro ao excluir card.', 'error');
        return;
      }
      showToast('Card excluído.', 'success');
      setDeletingId(null);
      await loadCards();
    } finally {
      setSaving(false);
    }
  };

  const toggleAtivo = async (card: SidebarPromoCardRow) => {
    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('cms_items')
        .update({ ativo: !card.ativo, updated_at: new Date().toISOString() })
        .eq('id', card.id)
        .eq('secao', CMS_SECAO);

      if (updateError) {
        showToast('Erro ao alterar status.', 'error');
        return;
      }
      showToast(card.ativo ? 'Card desativado.' : 'Card ativado.', 'success');
      await loadCards();
    } finally {
      setSaving(false);
    }
  };

  const handleCardsReorder = async (reordered: SidebarPromoCardRow[]) => {
    const withOrder = applySequentialOrder(reordered);
    setCards(withOrder);
    try {
      await persistTableOrder(
        'cms_items',
        withOrder.map((card) => card.id),
      );
      showToast('Ordem dos cards atualizada!', 'success');
    } catch {
      showToast('Erro ao salvar ordem dos cards.', 'error');
      await loadCards();
    }
  };

  const cardToDelete = cards.find((c) => c.id === deletingId);

  if (loading) {
    return <LoadingState inline message="Carregando cards..." />;
  }

  if (error) {
    return <p className="text-admin-danger">{error}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-admin-border bg-admin-panel-2/40 p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <h3 className="text-white font-semibold mb-1">Cards promocionais</h3>
            <p className="text-gray-400 text-sm">
              Banners roxos no topo da sidebar (239×50). Arraste para reordenar. Digite só em
              português — inglês e espanhol são traduzidos ao salvar.
            </p>
            <p className="text-gray-500 text-xs mt-2">
              {statusCounts.total} cards · {statusCounts.active} ativos · {statusCounts.inactive}{' '}
              inativos
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <FilterChip
              active={statusFilter === 'all'}
              label="Todos"
              count={statusCounts.total}
              onClick={() => setStatusFilter('all')}
            />
            <FilterChip
              active={statusFilter === 'active'}
              label="Ativos"
              count={statusCounts.active}
              onClick={() => setStatusFilter('active')}
            />
            <FilterChip
              active={statusFilter === 'inactive'}
              label="Inativos"
              count={statusCounts.inactive}
              onClick={() => setStatusFilter('inactive')}
            />
            <Button icon={Plus} onClick={startCreate} disabled={modalBusy} className="!px-3 !py-2 !text-sm">
              Novo card
            </Button>
          </div>
        </div>
      </div>

      {filteredCards.length === 0 ? (
        <EmptyState
          icon={LayoutTemplate}
          title={statusFilter === 'all' ? 'Nenhum card cadastrado.' : 'Nenhum card neste filtro.'}
          description="Clique em Novo card para criar o primeiro banner promocional da sidebar."
        />
      ) : (
        <SortableOrderList
          items={filteredCards}
          onReorder={handleCardsReorder}
          disabled={modalBusy || statusFilter !== 'all'}
          className="space-y-3"
          renderItem={(card) => (
            <div
              className={`rounded-xl border border-admin-border bg-admin-panel-2/50 p-4 md:p-5 ${
                card.ativo ? '' : 'opacity-70'
              }`}
            >
              <div className="flex flex-col xl:flex-row gap-4 xl:items-center">
                <CardPreview form={rowToForm(card)} />

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="text-white font-semibold">{card.nome_admin}</h3>
                    <StatusBadge variant={card.ativo ? 'success' : 'neutral'}>
                      {card.ativo ? 'Ativo' : 'Inativo'}
                    </StatusBadge>
                    <StatusBadge variant="neutral">
                      {card.layout === 'double' ? '2 linhas' : '1 linha'}
                    </StatusBadge>
                    <span className="text-xs text-gray-500">#{card.ordem}</span>
                  </div>

                  <p className="text-sm text-gray-300 mb-1">
                    {card.layout === 'double' && card.labels.pt.line2 ? (
                      <span className="flex flex-col leading-tight">
                        <span>{card.labels.pt.line1}</span>
                        <span className="font-semibold">{card.labels.pt.line2}</span>
                      </span>
                    ) : (
                      card.labels.pt.line1
                    )}
                  </p>
                  <p className="text-xs text-gray-500 truncate">Rota: {card.href}</p>
                  <p className="text-xs text-gray-600 mt-1 font-mono">
                    {card.background_color} · bloom {card.bloom_color}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 xl:flex-col xl:items-stretch shrink-0">
                  <Button
                    variant="secondary"
                    icon={Pencil}
                    onClick={() => startEdit(card)}
                    disabled={saving}
                    className="!px-3 !py-1.5 !text-xs"
                  >
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    icon={Power}
                    onClick={() => toggleAtivo(card)}
                    disabled={saving}
                    className="!px-3 !py-1.5 !text-xs"
                  >
                    {card.ativo ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button
                    variant="danger"
                    icon={Trash2}
                    onClick={() => setDeletingId(card.id)}
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

      <Modal
        open={isCreating}
        onClose={cancelCreate}
        title="Novo card promocional"
        description="Banner roxo no topo da sidebar. Textos em português com tradução automática."
        icon={LayoutTemplate}
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={cancelCreate} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={saveCreate} loading={saving}>
              Criar card
            </Button>
          </>
        }
      >
        <CardEditor form={createForm} setForm={setCreateForm} saving={saving} />
      </Modal>

      <Modal
        open={editingId !== null}
        onClose={cancelEdit}
        title={editForm.nome_admin ? `Editar card: ${editForm.nome_admin}` : 'Editar card'}
        description="Atualize cores, textos e link do card promocional."
        icon={Pencil}
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={cancelEdit} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={saveEdit} loading={saving}>
              Salvar alterações
            </Button>
          </>
        }
      >
        <CardEditor form={editForm} setForm={setEditForm} saving={saving} />
      </Modal>

      <Modal
        open={deletingId !== null}
        onClose={() => setDeletingId(null)}
        title="Excluir card"
        description="Esta ação não pode ser desfeita."
        icon={Trash2}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeletingId(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={removeCard} loading={saving}>
              Excluir
            </Button>
          </>
        }
      >
        <p className="text-gray-300 text-sm">
          Deseja excluir o card{' '}
          <span className="text-white font-medium">{cardToDelete?.nome_admin || 'selecionado'}</span>?
        </p>
      </Modal>
    </div>
  );
}

function CardPreview({ form }: { form: typeof emptyForm }) {
  const textClass = form.text_theme === 'dark' ? 'text-slate-900' : 'text-white';
  const outerGlow = outerGlowFromBloomColor(form.bloom_color);

  return (
    <div
      className={`relative isolate rounded-md ${textClass} font-bold flex items-center justify-between px-4 overflow-hidden shrink-0`}
      style={{
        width: 239,
        height: 50,
        backgroundColor: form.background_color,
        boxShadow: `0 0 14px ${outerGlow}, 0 0 28px ${outerGlow}`,
      }}
    >
      <div className="absolute inset-0 pointer-events-none opacity-70" aria-hidden="true">
        <span
          className="absolute -left-4 top-1/2 h-14 w-20 -translate-y-1/2 rounded-full blur-2xl"
          style={{ backgroundColor: form.bloom_color }}
        />
        <span
          className="absolute -right-4 -top-3 h-16 w-20 rounded-full blur-3xl"
          style={{ backgroundColor: form.bloom_color }}
        />
      </div>
      <span className="relative z-10 flex flex-col items-start leading-tight">
        <span className={`${form.layout === 'double' ? 'text-[10px] font-normal' : 'text-xs font-black'}`}>
          {form.labels.pt.line1 || 'Linha 1'}
        </span>
        {form.layout === 'double' && (
          <span className="text-xs font-black">{form.labels.pt.line2 || 'Linha 2'}</span>
        )}
      </span>
      <span className="relative z-10">
        {form.icon_type === 'emoji' && <span className="text-lg">{form.icon_value || '✨'}</span>}
        {form.icon_type === 'image' && form.icon_value && (
          <img src={form.icon_value} alt="" className="w-6 h-6 object-contain" />
        )}
        {form.icon_type === 'iconify' && form.icon_value && (
          <span className="iconify" data-icon={form.icon_value} style={{ fontSize: '20px' }} />
        )}
      </span>
    </div>
  );
}

function PortugueseCardLabelsEditor({
  layout,
  line1,
  line2,
  onLine1Change,
  onLine2Change,
}: {
  layout: CardLayout;
  line1: string;
  line2: string;
  onLine1Change: (value: string) => void;
  onLine2Change: (value: string) => void;
}) {
  const [preview, setPreview] = useState<{
    line1: { en: string; es: string };
    line2: { en: string; es: string };
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    const t1 = line1.trim();
    const t2 = line2.trim();
    if (!t1 && !t2) {
      setPreview(null);
      return;
    }

    setPreviewLoading(true);
    const timer = window.setTimeout(() => {
      void Promise.all([
        t1 ? translateFromPortuguese(t1) : Promise.resolve({ en: '', es: '' }),
        layout === 'double' && t2
          ? translateFromPortuguese(t2)
          : Promise.resolve({ en: '', es: '' }),
      ])
        .then(([line1Trans, line2Trans]) => setPreview({ line1: line1Trans, line2: line2Trans }))
        .finally(() => setPreviewLoading(false));
    }, 450);

    return () => window.clearTimeout(timer);
  }, [line1, line2, layout]);

  return (
    <div className="space-y-3">
      <Field
        label={layout === 'double' ? 'Linha 1 (superior)' : 'Texto do card (português)'}
        value={line1}
        onChange={onLine1Change}
        placeholder="Indique um amigo e"
      />
      {layout === 'double' && (
        <Field
          label="Linha 2 (destaque em negrito)"
          value={line2}
          onChange={onLine2Change}
          placeholder="GANHE R$ 15 GRÁTIS"
        />
      )}
      <p className="text-xs text-gray-500">
        Inglês e espanhol são traduzidos automaticamente ao salvar.
      </p>
      {(line1.trim() || line2.trim()) && (
        <div className="rounded-lg border border-admin-border bg-admin-panel/50 px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-2">
            Tradução automática {previewLoading ? '· gerando...' : ''}
          </p>
          <div className="space-y-2 text-xs">
            {line1.trim() && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="rounded-md bg-admin-panel-2 px-2.5 py-2 text-gray-300">
                  <span className="text-gray-500">EN · </span>
                  {preview?.line1.en || '—'}
                </div>
                <div className="rounded-md bg-admin-panel-2 px-2.5 py-2 text-gray-300">
                  <span className="text-gray-500">ES · </span>
                  {preview?.line1.es || '—'}
                </div>
              </div>
            )}
            {layout === 'double' && line2.trim() && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="rounded-md bg-admin-panel-2 px-2.5 py-2 text-gray-300">
                  <span className="text-gray-500">EN · </span>
                  {preview?.line2.en || '—'}
                </div>
                <div className="rounded-md bg-admin-panel-2 px-2.5 py-2 text-gray-300">
                  <span className="text-gray-500">ES · </span>
                  {preview?.line2.es || '—'}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CardEditor({
  form,
  setForm,
  saving,
}: {
  form: typeof emptyForm;
  setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>;
  saving: boolean;
}) {
  return (
    <div className={`grid grid-cols-1 lg:grid-cols-5 gap-6 ${saving ? 'opacity-70 pointer-events-none' : ''}`}>
      <div className="lg:col-span-3 space-y-5">
        <section className="space-y-3">
          <SectionLabel>Identificação</SectionLabel>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Nome interno (admin)"
              value={form.nome_admin}
              onChange={(v) => setForm({ ...form, nome_admin: v })}
              placeholder="Indique e ganhe"
            />
            <Field
              label="Rota (href)"
              value={form.href}
              onChange={(v) => setForm({ ...form, href: v })}
              placeholder="/help/mobile"
            />
            <Field
              label="Ordem"
              type="number"
              value={String(form.ordem)}
              onChange={(v) => setForm({ ...form, ordem: Number(v) })}
            />
            <SelectField
              label="Layout do texto"
              value={form.layout}
              onChange={(v) => setForm({ ...form, layout: v as CardLayout })}
              options={[
                { value: 'single', label: 'Uma linha' },
                { value: 'double', label: 'Duas linhas' },
              ]}
            />
          </div>
        </section>

        <section className="space-y-3">
          <SectionLabel>Texto</SectionLabel>
          <PortugueseCardLabelsEditor
            layout={form.layout}
            line1={form.labels.pt.line1}
            line2={form.labels.pt.line2}
            onLine1Change={(value) =>
              setForm({
                ...form,
                labels: { ...form.labels, pt: { ...form.labels.pt, line1: value } },
              })
            }
            onLine2Change={(value) =>
              setForm({
                ...form,
                labels: { ...form.labels, pt: { ...form.labels.pt, line2: value } },
              })
            }
          />
        </section>

        <section className="space-y-3">
          <SectionLabel>Aparência</SectionLabel>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ColorField
              label="Cor de fundo"
              value={form.background_color}
              onChange={(v) => setForm({ ...form, background_color: v })}
            />
            <ColorField
              label="Cor do bloom"
              value={form.bloom_color}
              onChange={(v) =>
                setForm((prev) => ({
                  ...prev,
                  bloom_color: v,
                  outer_glow: outerGlowFromBloomColor(v),
                }))
              }
            />
            <SelectField
              label="Tema do texto"
              value={form.text_theme}
              onChange={(v) => setForm({ ...form, text_theme: v as TextTheme })}
              options={[
                { value: 'light', label: 'Claro (branco)' },
                { value: 'dark', label: 'Escuro (preto)' },
              ]}
            />
            <SelectField
              label="Tipo de ícone"
              value={form.icon_type}
              onChange={(v) => setForm({ ...form, icon_type: v as IconType })}
              options={[
                { value: 'none', label: 'Nenhum' },
                { value: 'emoji', label: 'Emoji' },
                { value: 'image', label: 'Imagem (URL)' },
                { value: 'iconify', label: 'Iconify' },
              ]}
            />
            {form.icon_type !== 'none' && (
              <Field
                label={
                  form.icon_type === 'emoji'
                    ? 'Emoji'
                    : form.icon_type === 'iconify'
                      ? 'Ícone Iconify'
                      : 'URL da imagem'
                }
                sizeHint={form.icon_type === 'image' ? ADMIN_IMAGE_SIZES.sidebarCardIcon : undefined}
                value={form.icon_value}
                onChange={(v) => setForm({ ...form, icon_value: v })}
                className="md:col-span-2"
                placeholder={
                  form.icon_type === 'iconify' ? 'ph:gift-duotone' : form.icon_type === 'emoji' ? '🎁' : 'https://...'
                }
              />
            )}
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={form.ativo}
              onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
              className="rounded"
            />
            Card ativo na sidebar
          </label>
        </section>
      </div>

      <div className="lg:col-span-2">
        <div className="lg:sticky lg:top-4 rounded-xl border border-admin-border bg-admin-panel/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
            Pré-visualização · 239×50
          </p>
          <CardPreview form={form} />
          <p className="text-xs text-gray-500 mt-3">
            Glow gerado automaticamente a partir da cor bloom.
          </p>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h4 className="text-gray-200 text-sm font-medium">{children}</h4>;
}

function Field({
  label,
  hint,
  sizeHint,
  value,
  onChange,
  type = 'text',
  placeholder,
  className = '',
}: {
  label: string;
  hint?: string;
  sizeHint?: AdminImageSizeSpec;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-gray-300 text-sm mb-1 block">{label}</label>
      {sizeHint ? <ImageSizeHint spec={sizeHint} /> : null}
      {hint ? <p className="text-gray-500 text-xs mb-2">{hint}</p> : null}
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

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-gray-300 text-sm mb-1 block">{label}</label>
      <div className="flex gap-2">
        <input
          type="color"
          value={value.startsWith('#') ? value : '#6212A5'}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 rounded border border-admin-border-strong bg-admin-panel cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 rounded bg-admin-panel border border-admin-border-strong text-white text-sm"
        />
      </div>
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
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
