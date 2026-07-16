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
import { Gift } from 'lucide-react';

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
        setError('Erro ao carregar promoções. Execute cms_items.sql no Supabase.');
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

  const saveEdit = async (id: string) => {
    if (!validateForm(editForm)) return;
    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('cms_items')
        .update(buildPayload(editForm))
        .eq('id', id)
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

  const deleteBanner = async (id: string) => {
    if (!window.confirm('Deseja excluir esta promoção?')) return;
    setSaving(true);
    try {
      const { error: deleteError } = await supabase.from('cms_items').delete().eq('id', id).eq('secao', CMS_SECAO);
      if (deleteError) {
        showToast('Erro ao excluir promoção.', 'error');
        return;
      }
      showToast('Promoção excluída!', 'success');
      if (editingId === id) cancelEdit();
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
          label="Ordem"
          type="number"
          value={String(form.ordem)}
          onChange={(v) => setForm({ ...form, ordem: Number(v) })}
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
          value={form.imagem_url}
          onChange={(v) => setForm({ ...form, imagem_url: v })}
          placeholder="https://..."
          className="md:col-span-2"
        />
        <div className="flex items-center gap-2">
          <input
            id={`ativo-${idPrefix}`}
            type="checkbox"
            checked={form.ativo}
            onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
            className="rounded"
          />
          <label htmlFor={`ativo-${idPrefix}`} className="text-gray-300 text-sm">
            Ativo
          </label>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-gray-400 text-xs mb-2">Pré-visualização {BANNER_WIDTH}x{BANNER_HEIGHT}px</p>
        <BannerPreview titulo={form.titulo} texto={form.texto} imagem_url={form.imagem_url} />
      </div>
    </>
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
      <div className="flex gap-2 mt-4">
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

  return (
    <div>
      <PageHeader
        icon={Gift}
        title="Promoções"
        description={`Configure os banners da página de Promoções no tamanho fixo ${BANNER_WIDTH}x${BANNER_HEIGHT}px. Segure o ícone à esquerda e arraste para reorganizar a ordem.`}
        actions={
          <button
            onClick={startCreate}
            disabled={isCreating || saving}
            className="px-4 py-2 rounded-lg bg-admin-accent hover:bg-admin-accent-hover text-[#0d0e10] text-sm font-medium disabled:opacity-50"
          >
            Nova promoção
          </button>
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
          disabled={editingId !== null || isCreating || saving}
          className="space-y-4"
          renderItem={(banner) => (
            <PagePanel className="p-4 md:p-6">
              {editingId === banner.id ? (
                renderForm(`Editar: ${banner.nome_admin}`, editForm, setEditForm, () => saveEdit(banner.id), cancelEdit)
              ) : (
                <div className="flex flex-col lg:flex-row gap-4">
                  <BannerPreview
                    titulo={banner.titulo}
                    texto={banner.texto}
                    imagem_url={banner.imagem_url || ''}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-white font-semibold">{banner.nome_admin}</h3>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          banner.ativo ? 'bg-green-900/50 text-admin-success' : 'bg-gray-700 text-gray-400'
                        }`}
                      >
                        {banner.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                      <span className="text-gray-500 text-xs">Ordem: {banner.ordem}</span>
                    </div>
                    <p className="text-white text-sm font-medium mb-1">{banner.titulo}</p>
                    <p className="text-gray-400 text-xs line-clamp-3">{banner.texto}</p>
                    {banner.imagem_url && (
                      <p className="text-gray-500 text-xs break-all mt-2">{banner.imagem_url}</p>
                    )}
                  </div>
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
                </div>
              )}
            </PagePanel>
          )}
        />
      )}
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
