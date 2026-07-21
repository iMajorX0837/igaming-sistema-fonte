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
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';
import { Gift, Pencil, Plus, Power, Trash2 } from 'lucide-react';
import { ADMIN_IMAGE_SIZES } from '../lib/adminImageSizes';
import type { AdminImageSizeSpec } from '../lib/adminImageSizes';
import ImageSizeHint from '../components/ui/ImageSizeHint';

interface PromotionBanner {
  id: string;
  nome_admin: string;
  titulo: string;
  texto: string;
  imagem_url: string | null;
  ordem: number;
  ativo: boolean;
}

const BANNER_WIDTH = 525;
const BANNER_HEIGHT = 281;

const CMS_SECAO = 'promotion';

const emptyForm = {
  nome_admin: '',
  titulo: '',
  texto: '',
  imagem_url: '',
  ordem: 1,
  ativo: true,
};

function BannerPreview({ titulo, texto, imagem_url }: { titulo: string; texto: string; imagem_url: string }) {
  return (
    <div
      className="flex flex-col overflow-hidden rounded-xl border shrink-0"
      style={{
        width: BANNER_WIDTH,
        height: BANNER_HEIGHT,
        maxWidth: '100%',
        borderColor: '#7B3FF2',
      }}
    >
      <div className="min-h-0 flex-1 w-full overflow-hidden bg-[#121319]">
        {imagem_url.trim() ? (
          <img src={imagem_url} alt={titulo || 'Pré-visualização'} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-500 text-sm">
            Imagem
          </div>
        )}
      </div>
      <div className="shrink-0 px-4 py-2.5 bg-admin-panel">
        <h2 className="text-sm font-bold leading-tight text-white line-clamp-1">
          {titulo || 'Título da promoção'}
        </h2>
        <p className="mt-0.5 text-xs leading-snug text-slate-300 line-clamp-2">
          {texto || 'Texto descritivo da promoção aparece aqui.'}
        </p>
      </div>
    </div>
  );
}

export default function PromotionsPage() {
  const { showToast } = useToast();
  const [banners, setBanners] = useState<PromotionBanner[]>([]);
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
        setError('Erro ao carregar promoções. Execute deploy/supabase_nova_casa.sql no Supabase.');
        return;
      }

      setBanners(
        ((data || []) as Record<string, unknown>[]).map((row) => ({
          id: String(row.id),
          nome_admin: String(row.nome_admin || ''),
          titulo: String(row.titulo || ''),
          texto: String(row.texto || ''),
          imagem_url: row.imagem_url ? String(row.imagem_url) : null,
          ordem: Number(row.ordem) || 0,
          ativo: Boolean(row.ativo),
        }))
      );
    } catch {
      setError('Erro ao carregar promoções.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBanners();
  }, []);

  const validateForm = (form: typeof emptyForm) => {
    if (!form.nome_admin.trim()) {
      showToast('Informe o nome interno.', 'error');
      return false;
    }
    if (!form.titulo.trim()) {
      showToast('Informe o título.', 'error');
      return false;
    }
    if (!form.texto.trim()) {
      showToast('Informe o texto.', 'error');
      return false;
    }
    if (!form.imagem_url.trim()) {
      showToast('Informe a URL da imagem.', 'error');
      return false;
    }
    return true;
  };

  const buildPayload = (form: typeof emptyForm) => ({
    secao: CMS_SECAO,
    nome_admin: form.nome_admin.trim(),
    titulo: form.titulo.trim(),
    texto: form.texto.trim(),
    imagem_url: form.imagem_url.trim() || null,
    ordem: form.ordem,
    ativo: form.ativo,
    updated_at: new Date().toISOString(),
  });

  const startEdit = (banner: PromotionBanner) => {
    setIsCreating(false);
    setEditingId(banner.id);
    setEditForm({
      nome_admin: banner.nome_admin,
      titulo: banner.titulo,
      texto: banner.texto,
      imagem_url: banner.imagem_url || '',
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

  const saveEdit = async () => {
    if (!editingId || !validateForm(editForm)) return;
    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('cms_items')
        .update(buildPayload(editForm))
        .eq('id', editingId)
        .eq('secao', CMS_SECAO);

      if (updateError) {
        showToast('Erro ao salvar promoção.', 'error');
        return;
      }

      showToast('Promoção atualizada!', 'success');
      cancelEdit();
      await loadBanners();
    } catch {
      showToast('Erro ao salvar promoção.', 'error');
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
        showToast('Erro ao criar promoção.', 'error');
        return;
      }

      showToast('Promoção criada!', 'success');
      cancelCreate();
      await loadBanners();
    } catch {
      showToast('Erro ao criar promoção.', 'error');
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
        showToast('Erro ao excluir promoção.', 'error');
        return;
      }
      showToast('Promoção excluída!', 'success');
      if (editingId === deletingId) cancelEdit();
      setDeletingId(null);
      await loadBanners();
    } catch {
      showToast('Erro ao excluir promoção.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleAtivo = async (banner: PromotionBanner) => {
    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('cms_items')
        .update({ ativo: !banner.ativo, updated_at: new Date().toISOString() })
        .eq('id', banner.id)
        .eq('secao', CMS_SECAO);

      if (updateError) {
        showToast('Erro ao alterar status.', 'error');
        return;
      }

      showToast(banner.ativo ? 'Promoção desativada.' : 'Promoção ativada.', 'success');
      await loadBanners();
    } catch {
      showToast('Erro ao alterar status.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleBannersReorder = async (reordered: PromotionBanner[]) => {
    const withOrder = applySequentialOrder(reordered);
    setBanners(withOrder);
    try {
      await persistTableOrder('cms_items', withOrder.map((banner) => banner.id));
      showToast('Ordem das promoções atualizada!', 'success');
    } catch {
      showToast('Erro ao salvar ordem das promoções.', 'error');
      await loadBanners();
    }
  };

  const renderFormFields = (
    form: typeof emptyForm,
    setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>,
    idPrefix: string
  ) => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field
          label="Nome interno (admin)"
          value={form.nome_admin}
          onChange={(v) => setForm({ ...form, nome_admin: v })}
          placeholder="Promo de boas-vindas"
        />
        <Field
          label="Título"
          value={form.titulo}
          onChange={(v) => setForm({ ...form, titulo: v })}
          placeholder="Bônus de 100%"
          className="md:col-span-2"
        />
        <TextAreaField
          label="Texto"
          value={form.texto}
          onChange={(v) => setForm({ ...form, texto: v })}
          placeholder="Deposite agora e ganhe até R$ 500 em bônus..."
          className="md:col-span-2"
        />
        <Field
          label="URL da imagem"
          sizeHint={ADMIN_IMAGE_SIZES.promotionBanner}
          value={form.imagem_url}
          onChange={(v) => setForm({ ...form, imagem_url: v })}
          placeholder="https://..."
          className="md:col-span-2"
        />
      </div>

      <div className="mt-4">
        <p className="text-gray-400 text-xs mb-2">Pré-visualização {BANNER_WIDTH}x{BANNER_HEIGHT}px</p>
        <BannerPreview titulo={form.titulo} texto={form.texto} imagem_url={form.imagem_url} />
      </div>
    </>
  );

  const bannerToDelete = banners.find((b) => b.id === deletingId);
  const modalBusy = editingId !== null || isCreating || saving || deletingId !== null;

  return (
    <div>
      <PageHeader
        icon={Gift}
        title="Promoções"
        description={`Configure os banners da página de Promoções no tamanho fixo ${BANNER_WIDTH}x${BANNER_HEIGHT}px. Segure o ícone à esquerda e arraste para reorganizar a ordem.`}
        actions={
          <Button icon={Plus} onClick={startCreate} disabled={modalBusy}>
            Nova promoção
          </Button>
        }
      />

      <Modal
        open={isCreating}
        onClose={cancelCreate}
        title="Nova promoção"
        description={`Configure um banner de promoção no tamanho ${BANNER_WIDTH}x${BANNER_HEIGHT}px.`}
        icon={Gift}
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={cancelCreate} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={saveCreate} loading={saving}>
              Criar promoção
            </Button>
          </>
        }
      >
        {renderFormFields(createForm, setCreateForm, 'create')}
      </Modal>

      <Modal
        open={editingId !== null}
        onClose={cancelEdit}
        title={editForm.nome_admin ? `Editar: ${editForm.nome_admin}` : 'Editar promoção'}
        description={`Atualize o banner de promoção no tamanho ${BANNER_WIDTH}x${BANNER_HEIGHT}px.`}
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
        {renderFormFields(editForm, setEditForm, 'edit')}
      </Modal>

      <Modal
        open={deletingId !== null}
        onClose={() => setDeletingId(null)}
        title="Excluir promoção"
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
          Deseja excluir a promoção{' '}
          <span className="text-white font-medium">{bannerToDelete?.nome_admin || 'selecionada'}</span>?
        </p>
      </Modal>

      {loading ? (
        <LoadingState message="Carregando promoções..." />
      ) : error ? (
        <PagePanel>
          <p className="text-admin-danger">{error}</p>
        </PagePanel>
      ) : banners.length === 0 ? (
        <PagePanel>
          <EmptyState icon={Gift} title="Nenhuma promoção cadastrada." description="Clique em Nova promoção para começar." />
        </PagePanel>
      ) : (
        <SortableOrderList
          items={banners}
          onReorder={handleBannersReorder}
          disabled={modalBusy}
          className="space-y-3"
          renderItem={(banner) => (
            <div className="rounded-xl border border-admin-border bg-admin-panel-2/50 p-4 md:p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <BannerPreview
                  titulo={banner.titulo}
                  texto={banner.texto}
                  imagem_url={banner.imagem_url || ''}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="text-white font-semibold">{banner.nome_admin}</h3>
                    <StatusBadge variant={banner.ativo ? 'success' : 'neutral'}>
                      {banner.ativo ? 'Ativo' : 'Inativo'}
                    </StatusBadge>
                    <span className="text-gray-500 text-xs">Ordem: {banner.ordem}</span>
                  </div>
                  <p className="text-white text-sm font-medium mb-1">{banner.titulo}</p>
                  <p className="text-gray-400 text-xs line-clamp-3">{banner.texto}</p>
                  {banner.imagem_url && (
                    <p className="text-gray-500 text-xs break-all mt-2">{banner.imagem_url}</p>
                  )}
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
    </div>
  );
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

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  className = '',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-gray-300 text-sm mb-1 block">{label}</label>
      <textarea
        value={value}
        placeholder={placeholder}
        rows={3}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded bg-admin-panel border border-admin-border-strong text-white text-sm resize-y"
      />
    </div>
  );
}
