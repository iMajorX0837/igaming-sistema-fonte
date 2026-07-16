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
import { Star } from 'lucide-react';

interface RecommendedBanner {
  id: string;
  titulo: string | null;
  imagem_url: string;
  imagem_mobile_url: string | null;
  game_name: string;
  provider: string;
  ordem: number;
  ativo: boolean;
}

const CMS_SECAO = 'recommended';

const emptyForm = {
  titulo: '',
  imagem_url: '',
  imagem_mobile_url: '',
  game_name: '',
  provider: '',
  ordem: 1,
  ativo: true,
};

function buildPayload(form: typeof emptyForm) {
  return {
    secao: CMS_SECAO,
    titulo: form.titulo.trim() || null,
    imagem_url: form.imagem_url.trim(),
    imagem_mobile_url: form.imagem_mobile_url.trim() || null,
    game_name: form.game_name.trim(),
    provider: form.provider.trim(),
    ordem: form.ordem,
    ativo: form.ativo,
  };
}

export default function RecommendedBannersPage() {
  const { showToast } = useToast();
  const [banners, setBanners] = useState<RecommendedBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState(emptyForm);
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
      game_name: banner.game_name,
      provider: banner.provider,
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
    if (!form.game_name.trim()) {
      showToast('Informe o nome do jogo.', 'error');
      return false;
    }
    if (!form.provider.trim()) {
      showToast('Informe o provedor do jogo.', 'error');
      return false;
    }
    return true;
  };

  const saveEdit = async (id: string) => {
    if (!validateForm(editForm)) return;

    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('cms_items')
        .update({
          ...buildPayload(editForm),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
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

  const deleteBanner = async (id: string) => {
    if (!window.confirm('Deseja excluir este banner?')) return;

    setSaving(true);
    try {
      const { error: deleteError } = await supabase.from('cms_items').delete().eq('id', id).eq('secao', CMS_SECAO);

      if (deleteError) {
        showToast('Erro ao excluir banner.', 'error');
        return;
      }

      showToast('Banner excluído!', 'success');
      if (editingId === id) cancelEdit();
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

  const renderFormFields = (
    form: typeof emptyForm,
    setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>,
    idPrefix: string
  ) => (
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
      <div>
        <label className="text-gray-300 text-sm mb-1 block">Nome do jogo</label>
        <input
          type="text"
          value={form.game_name}
          onChange={(e) => setForm({ ...form, game_name: e.target.value })}
          className="w-full px-3 py-2 rounded bg-admin-panel border border-admin-border-strong text-white text-sm"
          placeholder="Aviator"
        />
      </div>
      <div>
        <label className="text-gray-300 text-sm mb-1 block">Provedor</label>
        <input
          type="text"
          value={form.provider}
          onChange={(e) => setForm({ ...form, provider: e.target.value })}
          className="w-full px-3 py-2 rounded bg-admin-panel border border-admin-border-strong text-white text-sm"
          placeholder="Spribe"
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
        <label htmlFor={`${idPrefix}-ativo`} className="text-gray-300 text-sm">Ativo</label>
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader
        icon={Star}
        title="Recomendados"
        description="Configure os banners da seção Recomendados na home. Segure o ícone à esquerda e arraste para reorganizar a ordem."
        actions={
          <button
            onClick={startCreate}
            disabled={isCreating || saving}
            className="px-4 py-2 rounded-lg bg-admin-accent hover:bg-admin-accent-hover text-[#0d0e10] text-sm font-medium disabled:opacity-50"
          >
            Novo banner
          </button>
        }
      />

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
        {renderFormFields(createForm, setCreateForm, 'create')}
        {createForm.imagem_url && (
          <div className="mt-4">
            <p className="text-gray-400 text-xs mb-2">Pré-visualização</p>
            <img
              src={createForm.imagem_url}
              alt="Pré-visualização"
              className="max-h-32 rounded-lg object-contain bg-admin-panel p-2"
            />
          </div>
        )}
      </Modal>

      {loading ? (
        <LoadingState message="Carregando banners..." />
      ) : error ? (
        <PagePanel>
          <p className="text-admin-danger">{error}</p>
        </PagePanel>
      ) : banners.length === 0 ? (
        <PagePanel>
          <EmptyState icon={Star} title="Nenhum banner cadastrado." description="Clique em Novo banner para começar." />
        </PagePanel>
      ) : (
        <SortableOrderList
          items={banners}
          onReorder={handleBannersReorder}
          disabled={editingId !== null || isCreating || saving}
          className="space-y-4"
          renderItem={(banner) => (
            <PagePanel className="p-4 md:p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <img
                  src={banner.imagem_url}
                  alt={banner.titulo || banner.game_name}
                  className="w-full lg:w-48 h-28 object-contain rounded-lg bg-admin-panel p-2 shrink-0"
                />

                <div className="flex-1 min-w-0">
                  {editingId === banner.id ? (
                    <div className="space-y-3">
                      {renderFormFields(editForm, setEditForm, `edit-${banner.id}`)}
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEdit(banner.id)}
                          disabled={saving}
                          className="px-3 py-1.5 rounded bg-admin-info hover:bg-admin-info/90 text-white text-xs font-medium disabled:opacity-50"
                        >
                          Salvar
                        </button>
                        <button
                          onClick={cancelEdit}
                          disabled={saving}
                          className="px-3 py-1.5 rounded bg-gray-600 hover:bg-gray-500 text-white text-xs font-medium"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="text-white font-semibold">{banner.titulo || banner.game_name}</h3>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${
                            banner.ativo ? 'bg-green-900/50 text-admin-success' : 'bg-gray-700 text-gray-400'
                          }`}
                        >
                          {banner.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                        <span className="text-gray-500 text-xs">Ordem: {banner.ordem}</span>
                      </div>
                      <p className="text-gray-300 text-sm mb-1">
                        Jogo: <span className="text-white">{banner.game_name}</span> · Provedor:{' '}
                        <span className="text-white">{banner.provider}</span>
                      </p>
                      <p className="text-gray-400 text-xs break-all">{banner.imagem_url}</p>
                    </>
                  )}
                </div>

                {editingId !== banner.id && (
                  <div className="flex flex-wrap gap-2 lg:flex-col lg:items-end shrink-0">
                    <button
                      onClick={() => startEdit(banner)}
                      disabled={saving}
                      className="px-3 py-1.5 rounded bg-admin-accent hover:bg-admin-accent-hover text-[#0d0e10] text-xs font-medium disabled:opacity-50"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => toggleAtivo(banner)}
                      disabled={saving}
                      className="px-3 py-1.5 rounded bg-gray-600 hover:bg-gray-500 text-white text-xs font-medium disabled:opacity-50"
                    >
                      {banner.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                    <button
                      onClick={() => deleteBanner(banner.id)}
                      disabled={saving}
                      className="px-3 py-1.5 rounded bg-red-700 hover:bg-red-600 text-white text-xs font-medium disabled:opacity-50"
                    >
                      Excluir
                    </button>
                  </div>
                )}
              </div>
            </PagePanel>
          )}
        />
      )}
    </div>
  );
}
