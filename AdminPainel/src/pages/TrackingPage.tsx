import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import LoadingState from '../components/ui/LoadingState';
import PagePanel from '../components/ui/PagePanel';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import { CheckCircle2, Crosshair, XCircle } from 'lucide-react';

interface TrackingPixelRow {
  id: string;
  nome: string;
  pixel_id: string;
  plataforma: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

const emptyForm = {
  nome: '',
  pixel_id: '',
  ativo: true,
};

const PIXEL_ID_PATTERN = /^[0-9]{10,20}$/;

export default function TrackingPage() {
  const { showToast } = useToast();
  const [pixels, setPixels] = useState<TrackingPixelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tracking_pixels')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        showToast('Erro ao carregar pixels. Execute tracking_pixels.sql no Supabase.', 'error');
        return;
      }

      setPixels((data as TrackingPixelRow[]) ?? []);
    } catch {
      showToast('Erro ao carregar pixels de tracking.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const validateForm = (form: typeof emptyForm) => {
    if (!form.nome.trim()) {
      showToast('Informe um nome para identificar o pixel.', 'warning');
      return false;
    }
    const pixelId = form.pixel_id.trim();
    if (!pixelId || !PIXEL_ID_PATTERN.test(pixelId)) {
      showToast('Informe um Pixel ID válido (apenas números, 10 a 20 dígitos).', 'warning');
      return false;
    }
    return true;
  };

  const saveCreate = async () => {
    if (!validateForm(createForm)) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('tracking_pixels').insert({
        nome: createForm.nome.trim(),
        pixel_id: createForm.pixel_id.trim(),
        plataforma: 'facebook',
        ativo: createForm.ativo,
      });

      if (error) {
        showToast(`Erro ao criar: ${error.message}`, 'error');
        return;
      }

      showToast('Pixel adicionado!', 'success');
      setIsCreating(false);
      setCreateForm(emptyForm);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!editingId || !validateForm(editForm)) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('tracking_pixels')
        .update({
          nome: editForm.nome.trim(),
          pixel_id: editForm.pixel_id.trim(),
          ativo: editForm.ativo,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingId);

      if (error) {
        showToast(`Erro ao salvar: ${error.message}`, 'error');
        return;
      }

      showToast('Pixel atualizado!', 'success');
      setEditingId(null);
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (row: TrackingPixelRow) => {
    const { error } = await supabase
      .from('tracking_pixels')
      .update({ ativo: !row.ativo, updated_at: new Date().toISOString() })
      .eq('id', row.id);

    if (error) {
      showToast('Erro ao alterar status.', 'error');
      return;
    }

    await loadData();
  };

  const deletePixel = async (id: string) => {
    if (!window.confirm('Excluir este pixel?')) return;

    const { error } = await supabase.from('tracking_pixels').delete().eq('id', id);
    if (error) {
      showToast('Erro ao excluir pixel.', 'error');
      return;
    }

    showToast('Pixel excluído.', 'success');
    await loadData();
  };

  const renderFormFields = (
    form: typeof emptyForm,
    setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>,
  ) => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-admin-muted mb-1">Nome</label>
        <input
          className="w-full rounded-lg bg-admin-panel-2 border border-admin-border px-3 py-2 text-admin-foreground"
          value={form.nome}
          onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
          placeholder="Campanha principal"
        />
      </div>
      <div>
        <label className="block text-sm text-admin-muted mb-1">Pixel ID (Facebook)</label>
        <input
          className="w-full rounded-lg bg-admin-panel-2 border border-admin-border px-3 py-2 text-admin-foreground font-mono"
          value={form.pixel_id}
          onChange={(e) => setForm((f) => ({ ...f, pixel_id: e.target.value.replace(/\D/g, '') }))}
          placeholder="123456789012345"
          inputMode="numeric"
        />
        <p className="mt-1 text-xs text-admin-muted">
          Encontre em Meta Events Manager → Fontes de dados → seu pixel → ID do pixel.
        </p>
      </div>
      <label className="flex items-center gap-2 text-sm text-admin-foreground">
        <input
          type="checkbox"
          checked={form.ativo}
          onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))}
        />
        Ativo (dispara PageView no frontend do cassino)
      </label>
    </div>
  );

  return (
    <div>
      <PageHeader
        icon={Crosshair}
        title="Tracking"
        description="Configure pixels do Facebook (Meta) para rastrear PageView no frontend do cassino. Você pode adicionar vários pixels ativos ao mesmo tempo."
        actions={
          <Button onClick={() => { setCreateForm(emptyForm); setIsCreating(true); }}>
            Novo pixel
          </Button>
        }
      />

      {loading ? (
        <LoadingState message="Carregando pixels..." />
      ) : pixels.length === 0 ? (
        <PagePanel>
          <EmptyState
            icon={Crosshair}
            title="Nenhum pixel configurado"
            description="Adicione o Pixel ID do Facebook para começar a rastrear visualizações de página no cassino."
          />
        </PagePanel>
      ) : (
        <PagePanel>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-admin-muted border-b border-admin-border">
                  <th className="py-3 pr-4">Nome</th>
                  <th className="py-3 pr-4">Pixel ID</th>
                  <th className="py-3 pr-4">Plataforma</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {pixels.map((row) => (
                  <tr key={row.id} className="border-b border-admin-border/60">
                    <td className="py-3 pr-4 font-medium text-admin-foreground">{row.nome}</td>
                    <td className="py-3 pr-4 font-mono text-admin-muted-2">{row.pixel_id}</td>
                    <td className="py-3 pr-4 text-admin-muted-2">Facebook</td>
                    <td className="py-3 pr-4">
                      <button
                        type="button"
                        onClick={() => void toggleActive(row)}
                        className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${row.ativo ? 'bg-emerald-500/15 text-emerald-300' : 'bg-admin-panel-3 text-admin-muted'}`}
                      >
                        {row.ativo ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {row.ativo ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setEditingId(row.id);
                            setEditForm({ nome: row.nome, pixel_id: row.pixel_id, ativo: row.ativo });
                          }}
                        >
                          Editar
                        </Button>
                        <Button variant="danger" onClick={() => void deletePixel(row.id)}>
                          Excluir
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PagePanel>
      )}

      <Modal
        open={isCreating}
        onClose={() => setIsCreating(false)}
        title="Novo pixel do Facebook"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsCreating(false)}>
              Cancelar
            </Button>
            <Button disabled={saving} onClick={() => void saveCreate()}>
              {saving ? 'Salvando…' : 'Adicionar'}
            </Button>
          </>
        }
      >
        {renderFormFields(createForm, setCreateForm)}
      </Modal>

      <Modal
        open={!!editingId}
        onClose={() => setEditingId(null)}
        title="Editar pixel"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditingId(null)}>
              Cancelar
            </Button>
            <Button disabled={saving} onClick={() => void saveEdit()}>
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </>
        }
      >
        {renderFormFields(editForm, setEditForm)}
      </Modal>
    </div>
  );
}
