import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import SortableOrderList from '../components/SortableOrderList';
import { applySequentialOrder } from '../lib/reorderUtils';
import { persistTableOrder } from '../lib/persistTableOrder';
import PageHeader from '../components/PageHeader';
import LoadingState from '../components/ui/LoadingState';
import EmptyState from '../components/ui/EmptyState';
import PagePanel from '../components/ui/PagePanel';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';
import { Star, Pencil, Plus, Power, Trash2 } from 'lucide-react';

interface RecommendedBanner {
  id: string;
  titulo: string | null;
  imagem_url: string;
  imagem_mobile_url: string | null;
  href: string | null;
  link_tipo: 'href' | 'external' | null;
  ordem: number;
  ativo: boolean;
}

const CMS_SECAO = 'recommended';

const emptyForm = {
  titulo: '',
  imagem_url: '',
  imagem_mobile_url: '',
  href: '',
  ordem: 1,
  ativo: true,
};

function normalizeRecommendedLink(href: string): { href: string | null; link_tipo: 'href' | 'external' | null } {
  const trimmed = href.trim();
  if (!trimmed) return { href: null, link_tipo: null };
  if (/^https?:\/\//i.test(trimmed)) return { href: trimmed, link_tipo: 'external' };
  return { href: trimmed.startsWith('/') ? trimmed : `/${trimmed}`, link_tipo: 'href' };
}

function buildPayload(form: typeof emptyForm) {
  const link = normalizeRecommendedLink(form.href);
  return {
    secao: CMS_SECAO,
    titulo: form.titulo.trim() || null,
    imagem_url: form.imagem_url.trim(),
    imagem_mobile_url: form.imagem_mobile_url.trim() || null,
    href: link.href,
    link_tipo: link.link_tipo,
    game_name: null,
    provider: null,
    ordem: form.ordem,
    ativo: form.ativo,
  };
}

function BannerFormFields({
  form,
  setForm,
  idPrefix,
}: {
  form: typeof emptyForm;
  setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>;
  idPrefix: string;
}) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-gray-300 text-sm mb-1 block">Título (opcional)</label>
          <input
            type="text"
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            className="w-full px-3 py-2 rounded bg-admin-panel border border-admin-border-strong text-white text-sm"
            placeholder="Banner promocional"
          />
        </div>
        <div>
          <label className="text-gray-300 text-sm mb-1 block">Ordem</label>
          <input
            type="number"
            value={form.ordem}
            onChange={(e) => setForm({ ...form, ordem: Number(e.target.value) })}
            className="w-full px-3 py-2 rounded bg-admin-panel border border-admin-border-strong text-white text-sm"
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-gray-300 text-sm mb-1 block">URL da imagem (desktop)</label>
          <input
            type="url"
            value={form.imagem_url}
            onChange={(e) => setForm({ ...form, imagem_url: e.target.value })}
            className="w-full px-3 py-2 rounded bg-admin-panel border border-admin-border-strong text-white text-sm"
            placeholder="https://..."
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-gray-300 text-sm mb-1 block">URL da imagem mobile (opcional)</label>
          <input
            type="url"
            value={form.imagem_mobile_url}
            onChange={(e) => setForm({ ...form, imagem_mobile_url: e.target.value })}
            className="w-full px-3 py-2 rounded bg-admin-panel border border-admin-border-strong text-white text-sm"
            placeholder="Deixe vazio para usar a imagem desktop"
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-gray-300 text-sm mb-1 block">Link ou rota</label>
          <input
            type="text"
            value={form.href}
            onChange={(e) => setForm({ ...form, href: e.target.value })}
            className="w-full px-3 py-2 rounded bg-admin-panel border border-admin-border-strong text-white text-sm"
            placeholder="/spribe/aviator, /help/promotions ou https://..."
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            id={`${idPrefix}-ativo`}
            type="checkbox"
            checked={form.ativo}
            onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
            className="rounded"
          />
          <label htmlFor={`${idPrefix}-ativo`} className="text-gray-300 text-sm">
            Ativo
          </label>
        </div>
      </div>
      {form.imagem_url && (
        <div className="mt-4">
          <p className="text-gray-400 text-xs mb-2">Pré-visualização</p>
          <img
            src={form.imagem_url}
            alt="Pré-visualização"
            className="max-h-32 rounded-lg object-contain bg-admin-panel p-2"
          />
        </div>
      )}
    </>
  );
}

export default function RecommendedBannersPage({ embedded = false }: { embedded?: boolean }) {
  const { showToast } = useToast();
  const [banners, setBanners] = useState<RecommendedBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadBanners = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('cms_items')
        .select('*')
        .eq('secao', CMS_SECAO)
        .order('ordem', { ascending: true });

      if (fetchError) {
        setError('Erro ao carregar recomendados. Execute cms_items.sql no Supabase.');
        return;
      }

      setBanners((data as RecommendedBanner[]) || []);
    } catch {
      setError('Erro ao carregar recomendados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBanners();
  }, []);

  const startEdit = (banner: RecommendedBanner) => {
    setIsCreating(false);
    setEditingId(banner.id);
    setEditForm({
      titulo: banner.titulo || '',
      imagem_url: banner.imagem_url,
      imagem_mobile_url: banner.imagem_mobile_url || '',
      href: banner.href || '',
      ordem: banner.ordem,
      ativo: banner.ativo,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(emptyForm);
  };

  const startCreate = () => {
    setEditingId(null);
    setIsCreating(true);
    const nextOrder = banners.length > 0 ? Math.max(...banners.map((b) => b.ordem)) + 1 : 1;
    setCreateForm({ ...emptyForm, ordem: nextOrder });
  };

  const cancelCreate = () => {
    setIsCreating(false);
    setCreateForm(emptyForm);
  };

  const validateForm = (form: typeof emptyForm) => {
    if (!form.imagem_url.trim()) {
      showToast('Informe a URL da imagem desktop.', 'error');
      return false;
    }
    if (!form.href.trim()) {
      showToast('Informe o link ou rota do banner.', 'error');
      return false;
    }
    return true;
  };

  const saveEdit = async () => {
    if (!editingId || !validateForm(editForm)) return;

    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('cms_items')
        .update({
          ...buildPayload(editForm),
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingId)
        .eq('secao', CMS_SECAO);

      if (updateError) {
        showToast('Erro ao salvar banner.', 'error');
        return;
      }

      showToast('Banner atualizado!', 'success');
      cancelEdit();
      await loadBanners();
    } catch {
      showToast('Erro ao salvar banner.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveCreate = async () => {
    if (!validateForm(createForm)) return;

    setSaving(true);
    try {
      const { error: insertError } = await supabase.from('cms_items').insert(buildPayload(createForm));

      if (insertError) {
        showToast('Erro ao criar banner.', 'error');
        return;
      }

      showToast('Banner criado!', 'success');
      cancelCreate();
      await loadBanners();
    } catch {
      showToast('Erro ao criar banner.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteBanner = async () => {
    if (!deletingId) return;

    setSaving(true);
    try {
      const { error: deleteError } = await supabase.from('cms_items').delete().eq('id', deletingId).eq('secao', CMS_SECAO);

      if (deleteError) {
        showToast('Erro ao excluir banner.', 'error');
        return;
      }

      showToast('Banner excluído!', 'success');
      if (editingId === deletingId) cancelEdit();
      setDeletingId(null);
      await loadBanners();
    } catch {
      showToast('Erro ao excluir banner.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleAtivo = async (banner: RecommendedBanner) => {
    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('cms_items')
        .update({ ativo: !banner.ativo, updated_at: new Date().toISOString() })
        .eq('id', banner.id)
        .eq('secao', CMS_SECAO);

      if (updateError) {
        showToast('Erro ao atualizar status.', 'error');
        return;
      }

      showToast(banner.ativo ? 'Banner desativado.' : 'Banner ativado.', 'success');
      await loadBanners();
    } catch {
      showToast('Erro ao atualizar status.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleBannersReorder = async (reordered: RecommendedBanner[]) => {
    const withOrder = applySequentialOrder(reordered);
    setBanners(withOrder);
    try {
      await persistTableOrder('cms_items', withOrder.map((banner) => banner.id));
      showToast('Ordem dos banners atualizada!', 'success');
    } catch {
      showToast('Erro ao salvar ordem dos banners.', 'error');
      await loadBanners();
    }
  };

  const bannerToDelete = banners.find((b) => b.id === deletingId);
  const modalBusy = editingId !== null || isCreating || saving || deletingId !== null;

  const content = (
    <>
      {!embedded && (
        <PageHeader
          icon={Star}
          title="Recomendados"
          description="Configure os banners da seção Recomendados na home. Segure o ícone à esquerda e arraste para reorganizar a ordem."
          actions={
            <Button icon={Plus} onClick={startCreate} disabled={modalBusy}>
              Novo banner
            </Button>
          }
        />
      )}

      {embedded && (
        <div className="flex justify-end mb-4">
          <Button icon={Plus} onClick={startCreate} disabled={modalBusy}>
            Novo banner
          </Button>
        </div>
      )}

      <Modal
        open={isCreating}
        onClose={cancelCreate}
        title="Novo banner recomendado"
        description="Adicione um banner à seção Recomendados da home."
        icon={Star}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={cancelCreate} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={saveCreate} loading={saving}>
              Criar banner
            </Button>
          </>
        }
      >
        <BannerFormFields form={createForm} setForm={setCreateForm} idPrefix="create" />
      </Modal>

      <Modal
        open={editingId !== null}
        onClose={cancelEdit}
        title={editForm.titulo ? `Editar: ${editForm.titulo}` : 'Editar banner recomendado'}
        description="Atualize as informações do banner da seção Recomendados."
        icon={Pencil}
        size="lg"
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
        <BannerFormFields form={editForm} setForm={setEditForm} idPrefix="edit" />
      </Modal>

      <Modal
        open={deletingId !== null}
        onClose={() => setDeletingId(null)}
        title="Excluir banner"
        description="Esta ação não pode ser desfeita."
        icon={Trash2}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeletingId(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={deleteBanner} loading={saving}>
              Excluir
            </Button>
          </>
        }
      >
        <p className="text-gray-300 text-sm">
          Deseja excluir o banner{' '}
          <span className="text-white font-medium">{bannerToDelete?.titulo || 'selecionado'}</span>?
        </p>
      </Modal>

      {loading ? (
        <LoadingState message="Carregando banners..." inline={embedded} />
      ) : error ? (
        embedded ? (
          <p className="text-admin-danger">{error}</p>
        ) : (
          <PagePanel>
            <p className="text-admin-danger">{error}</p>
          </PagePanel>
        )
      ) : banners.length === 0 ? (
        embedded ? (
          <EmptyState icon={Star} title="Nenhum banner cadastrado." description="Clique em Novo banner para começar." />
        ) : (
          <PagePanel>
            <EmptyState icon={Star} title="Nenhum banner cadastrado." description="Clique em Novo banner para começar." />
          </PagePanel>
        )
      ) : (
        <SortableOrderList
          items={banners}
          onReorder={handleBannersReorder}
          disabled={modalBusy}
          className="space-y-3"
          renderItem={(banner) => (
            <div className="rounded-xl border border-admin-border bg-admin-panel-2/50 p-4 md:p-5">
              <div className="flex flex-col lg:flex-row gap-4">
                <img
                  src={banner.imagem_url}
                  alt={banner.titulo || 'Banner recomendado'}
                  className="w-full lg:w-48 h-28 object-contain rounded-lg bg-admin-panel p-2 shrink-0"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="text-white font-semibold">{banner.titulo || 'Sem título'}</h3>
                    <StatusBadge variant={banner.ativo ? 'success' : 'neutral'}>
                      {banner.ativo ? 'Ativo' : 'Inativo'}
                    </StatusBadge>
                    <span className="text-gray-500 text-xs">Ordem: {banner.ordem}</span>
                  </div>
                  {banner.href ? (
                    <p className="text-admin-info text-sm mb-1 break-all">
                      Link: <span className="text-white">{banner.href}</span>
                    </p>
                  ) : (
                    <p className="text-admin-warning text-sm mb-1">Sem link configurado</p>
                  )}
                  <p className="text-gray-400 text-xs break-all">{banner.imagem_url}</p>
                </div>

                <div className="flex flex-wrap gap-2 lg:flex-col lg:items-stretch shrink-0">
                  <Button
                    variant="secondary"
                    icon={Pencil}
                    onClick={() => startEdit(banner)}
                    disabled={saving}
                    className="!px-3 !py-1.5 !text-xs"
                  >
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    icon={Power}
                    onClick={() => toggleAtivo(banner)}
                    disabled={saving}
                    className="!px-3 !py-1.5 !text-xs"
                  >
                    {banner.ativo ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button
                    variant="danger"
                    icon={Trash2}
                    onClick={() => setDeletingId(banner.id)}
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
    </>
  );

  return embedded ? content : <div>{content}</div>;
}
