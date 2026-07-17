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
import { Zap, Pencil, Plus, Power, Trash2 } from 'lucide-react';
import { ADMIN_IMAGE_SIZES } from '../lib/adminImageSizes';
import ImageSizeHint from '../components/ui/ImageSizeHint';

type LinkTipo = 'href' | 'game';

interface HomeQuickNavRow {
  id: string;
  nome_admin: string;
  titulo: string;
  imagem_url: string;
  link_tipo: LinkTipo;
  href: string | null;
  game_name: string | null;
  ordem: number;
  ativo: boolean;
}

const CMS_SECAO = 'quick_nav';

const emptyForm = {
  nome_admin: '',
  titulo: '',
  imagem_url: '',
  link_tipo: 'href' as LinkTipo,
  href: '',
  game_name: '',
  ordem: 1,
  ativo: true,
};

function buildPayload(form: typeof emptyForm) {
  const linkTipo = form.link_tipo;
  return {
    secao: CMS_SECAO,
    nome_admin: form.nome_admin.trim(),
    titulo: form.titulo.trim(),
    imagem_url: form.imagem_url.trim(),
    link_tipo: linkTipo,
    href: linkTipo === 'href' ? form.href.trim() : null,
    game_name: linkTipo === 'game' ? form.game_name.trim() : null,
    ordem: form.ordem,
    ativo: form.ativo,
  };
}

function CardPreview({ titulo, imagemUrl }: { titulo: string; imagemUrl: string }) {
  return (
    <div className="flex h-[142px] w-[96px] shrink-0 flex-col overflow-hidden rounded-lg border border-admin-border-strong bg-admin-panel">
      <div className="h-[96px] w-full overflow-hidden bg-[#181923]">
        <img src={imagemUrl} alt={titulo} className="h-full w-full object-cover" />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-center">
        <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: '#FFFFFF80' }}>
          Jogue Agora
        </span>
        <span className="line-clamp-2 text-[14px] font-bold leading-tight text-white">{titulo || 'Nome do jogo'}</span>
      </div>
    </div>
  );
}

function CardFormFields({
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
          <label className="text-gray-300 text-sm mb-1 block">Nome interno (admin)</label>
          <input
            type="text"
            value={form.nome_admin}
            onChange={(e) => setForm({ ...form, nome_admin: e.target.value })}
            className="w-full px-3 py-2 rounded bg-admin-panel border border-admin-border-strong text-white text-sm"
            placeholder="Ex: Fortune Tiger"
          />
        </div>
        <div>
          <label className="text-gray-300 text-sm mb-1 block">Título no card</label>
          <input
            type="text"
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            className="w-full px-3 py-2 rounded bg-admin-panel border border-admin-border-strong text-white text-sm"
            placeholder="Nome exibido na home"
          />
        </div>
        <div>
          <label className="text-gray-300 text-sm mb-1 block">Tipo de link</label>
          <select
            value={form.link_tipo}
            onChange={(e) => setForm({ ...form, link_tipo: e.target.value as LinkTipo })}
            className="w-full px-3 py-2 rounded bg-admin-panel border border-admin-border-strong text-white text-sm"
          >
            <option value="href">Página (URL interna)</option>
            <option value="game">Jogo (busca por nome)</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="text-gray-300 text-sm mb-1 block">URL da imagem</label>
          <ImageSizeHint spec={ADMIN_IMAGE_SIZES.quickNav} />
          <input
            type="url"
            value={form.imagem_url}
            onChange={(e) => setForm({ ...form, imagem_url: e.target.value })}
            className="w-full px-3 py-2 rounded bg-admin-panel border border-admin-border-strong text-white text-sm"
            placeholder="https://..."
          />
        </div>
        {form.link_tipo === 'href' ? (
          <div className="md:col-span-2">
            <label className="text-gray-300 text-sm mb-1 block">Link de destino</label>
            <input
              type="text"
              value={form.href}
              onChange={(e) => setForm({ ...form, href: e.target.value })}
              className="w-full px-3 py-2 rounded bg-admin-panel border border-admin-border-strong text-white text-sm"
              placeholder="/games ou /pragmatic/spaceman"
            />
          </div>
        ) : (
          <div className="md:col-span-2">
            <label className="text-gray-300 text-sm mb-1 block">Nome do jogo</label>
            <input
              type="text"
              value={form.game_name}
              onChange={(e) => setForm({ ...form, game_name: e.target.value })}
              className="w-full px-3 py-2 rounded bg-admin-panel border border-admin-border-strong text-white text-sm"
              placeholder="Ex: Aviator, Mines, Fortune Tiger"
            />
          </div>
        )}
      </div>
      {form.imagem_url && (
        <div className="mt-4">
          <p className="text-gray-400 text-xs mb-2">Pré-visualização (96×142)</p>
          <CardPreview titulo={form.titulo} imagemUrl={form.imagem_url} />
        </div>
      )}
    </>
  );
}

export default function HomeQuickNavPage({ embedded = false }: { embedded?: boolean }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<HomeQuickNavRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('cms_items')
        .select('*')
        .eq('secao', CMS_SECAO)
        .order('ordem', { ascending: true });

      if (fetchError) {
        setError('Erro ao carregar atalhos. Execute cms_items.sql no Supabase.');
        return;
      }

      setItems((data as HomeQuickNavRow[]) || []);
    } catch {
      setError('Erro ao carregar atalhos da home.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
  }, []);

  const startEdit = (item: HomeQuickNavRow) => {
    setIsCreating(false);
    setEditingId(item.id);
    setEditForm({
      nome_admin: item.nome_admin,
      titulo: item.titulo,
      imagem_url: item.imagem_url,
      link_tipo: item.link_tipo,
      href: item.href || '',
      game_name: item.game_name || '',
      ordem: item.ordem,
      ativo: item.ativo,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(emptyForm);
  };

  const startCreate = () => {
    setEditingId(null);
    setIsCreating(true);
    const nextOrder = items.length > 0 ? Math.max(...items.map((item) => item.ordem)) + 1 : 1;
    setCreateForm({ ...emptyForm, ordem: nextOrder });
  };

  const cancelCreate = () => {
    setIsCreating(false);
    setCreateForm(emptyForm);
  };

  const validateForm = (form: typeof emptyForm) => {
    if (!form.nome_admin.trim()) {
      showToast('Informe o nome interno do card.', 'error');
      return false;
    }
    if (!form.titulo.trim()) {
      showToast('Informe o título exibido no card.', 'error');
      return false;
    }
    if (!form.imagem_url.trim()) {
      showToast('Informe a URL da imagem.', 'error');
      return false;
    }
    if (form.link_tipo === 'href' && !form.href.trim()) {
      showToast('Informe o link de destino.', 'error');
      return false;
    }
    if (form.link_tipo === 'game' && !form.game_name.trim()) {
      showToast('Informe o nome do jogo para abrir.', 'error');
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
        showToast('Erro ao salvar card.', 'error');
        return;
      }

      showToast('Card atualizado!', 'success');
      cancelEdit();
      await loadItems();
    } catch {
      showToast('Erro ao salvar card.', 'error');
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
        showToast('Erro ao criar card.', 'error');
        return;
      }

      showToast('Card criado!', 'success');
      cancelCreate();
      await loadItems();
    } catch {
      showToast('Erro ao criar card.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async () => {
    if (!deletingId) return;

    setSaving(true);
    try {
      const { error: deleteError } = await supabase.from('cms_items').delete().eq('id', deletingId).eq('secao', CMS_SECAO);

      if (deleteError) {
        showToast('Erro ao excluir card.', 'error');
        return;
      }

      showToast('Card excluído!', 'success');
      if (editingId === deletingId) cancelEdit();
      setDeletingId(null);
      await loadItems();
    } catch {
      showToast('Erro ao excluir card.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleAtivo = async (item: HomeQuickNavRow) => {
    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('cms_items')
        .update({ ativo: !item.ativo, updated_at: new Date().toISOString() })
        .eq('id', item.id)
        .eq('secao', CMS_SECAO);

      if (updateError) {
        showToast('Erro ao atualizar status.', 'error');
        return;
      }

      showToast(item.ativo ? 'Card desativado.' : 'Card ativado.', 'success');
      await loadItems();
    } catch {
      showToast('Erro ao atualizar status.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleItemsReorder = async (reordered: HomeQuickNavRow[]) => {
    const withOrder = applySequentialOrder(reordered);
    setItems(withOrder);
    try {
      await persistTableOrder('cms_items', withOrder.map((item) => item.id));
      showToast('Ordem dos cards atualizada!', 'success');
    } catch {
      showToast('Erro ao salvar ordem dos cards.', 'error');
      await loadItems();
    }
  };

  const itemToDelete = items.find((i) => i.id === deletingId);
  const modalBusy = editingId !== null || isCreating || saving || deletingId !== null;

  const content = (
    <>
      {!embedded && (
        <PageHeader
          icon={Zap}
          title="Atalhos da Home"
          description="Configure os cards de atalhos da home (96×142). Segure o ícone à esquerda e arraste para reorganizar a ordem."
          actions={
            <Button icon={Plus} onClick={startCreate} disabled={modalBusy}>
              Novo card
            </Button>
          }
        />
      )}

      {embedded && (
        <div className="flex justify-end mb-4">
          <Button icon={Plus} onClick={startCreate} disabled={modalBusy}>
            Novo card
          </Button>
        </div>
      )}

      <Modal
        open={isCreating}
        onClose={cancelCreate}
        title="Novo card de atalho"
        description="Configure um card de atalho da home (96×142)."
        icon={Zap}
        size="lg"
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
        <CardFormFields form={createForm} setForm={setCreateForm} idPrefix="create" />
      </Modal>

      <Modal
        open={editingId !== null}
        onClose={cancelEdit}
        title={editForm.nome_admin ? `Editar: ${editForm.nome_admin}` : 'Editar card de atalho'}
        description="Atualize as informações do card de atalho."
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
        <CardFormFields form={editForm} setForm={setEditForm} idPrefix="edit" />
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
            <Button variant="danger" onClick={deleteItem} loading={saving}>
              Excluir
            </Button>
          </>
        }
      >
        <p className="text-gray-300 text-sm">
          Deseja excluir o card{' '}
          <span className="text-white font-medium">{itemToDelete?.nome_admin || 'selecionado'}</span>?
        </p>
      </Modal>

      {loading ? (
        <LoadingState message="Carregando cards..." inline={embedded} />
      ) : error ? (
        embedded ? (
          <p className="text-admin-danger">{error}</p>
        ) : (
          <PagePanel>
            <p className="text-admin-danger">{error}</p>
          </PagePanel>
        )
      ) : items.length === 0 ? (
        embedded ? (
          <EmptyState icon={Zap} title="Nenhum card cadastrado." description="Clique em Novo card para começar." />
        ) : (
          <PagePanel>
            <EmptyState icon={Zap} title="Nenhum card cadastrado." description="Clique em Novo card para começar." />
          </PagePanel>
        )
      ) : (
        <SortableOrderList
          items={items}
          onReorder={handleItemsReorder}
          disabled={modalBusy}
          className="space-y-3"
          renderItem={(item) => (
            <div className="rounded-xl border border-admin-border bg-admin-panel-2/50 p-4 md:p-5">
              <div className="flex flex-col lg:flex-row gap-4">
                <CardPreview titulo={item.titulo} imagemUrl={item.imagem_url} />

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="text-white font-semibold">{item.nome_admin}</h3>
                    <StatusBadge variant={item.ativo ? 'success' : 'neutral'}>
                      {item.ativo ? 'Ativo' : 'Inativo'}
                    </StatusBadge>
                    <span className="text-gray-500 text-xs">Ordem: {item.ordem}</span>
                  </div>
                  <p className="text-gray-300 text-sm mb-1">
                    <span className="text-gray-500">Título:</span> {item.titulo}
                  </p>
                  <p className="text-gray-400 text-xs mb-1 break-all">
                    <span className="text-gray-500">Imagem:</span> {item.imagem_url}
                  </p>
                  <p className="text-gray-400 text-xs">
                    <span className="text-gray-500">Destino:</span>{' '}
                    {item.link_tipo === 'href' ? item.href : `Jogo: ${item.game_name}`}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 lg:flex-col lg:items-stretch shrink-0">
                  <Button
                    variant="secondary"
                    icon={Pencil}
                    onClick={() => startEdit(item)}
                    disabled={saving}
                    className="!px-3 !py-1.5 !text-xs"
                  >
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    icon={Power}
                    onClick={() => toggleAtivo(item)}
                    disabled={saving}
                    className="!px-3 !py-1.5 !text-xs"
                  >
                    {item.ativo ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button
                    variant="danger"
                    icon={Trash2}
                    onClick={() => setDeletingId(item.id)}
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
