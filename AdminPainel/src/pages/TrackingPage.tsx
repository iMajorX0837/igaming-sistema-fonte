import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import PageHeader from '../components/PageHeader';
import LoadingState from '../components/ui/LoadingState';
import PagePanel from '../components/ui/PagePanel';
import { Crosshair, Plus, Trash2 } from 'lucide-react';

interface TrackingPixelRow {
  id: string;
  nome: string;
  pixel_id: string;
  plataforma: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

interface PixelFieldRow {
  key: string;
  id: string | null;
  pixel_id: string;
}

const PIXEL_ID_PATTERN = /^[0-9]{10,20}$/;

function FacebookIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#1877F2" />
      <path
        d="M15.5 8.5H13.6C12.5 8.5 12 9.1 12 10.1V11.5H15.3L15 14.5H12V22H9V14.5H7V11.5H9V9.8C9 7.6 10.1 6 12.7 6H15.5V8.5Z"
        fill="white"
      />
    </svg>
  );
}

function createDraftRow(): PixelFieldRow {
  return {
    key: `draft-${crypto.randomUUID()}`,
    id: null,
    pixel_id: '',
  };
}

function mapPixelsToRows(pixels: TrackingPixelRow[]): PixelFieldRow[] {
  return pixels.map((pixel) => ({
    key: pixel.id,
    id: pixel.id,
    pixel_id: pixel.pixel_id,
  }));
}

export default function TrackingPage() {
  const { showToast } = useToast();
  const [rows, setRows] = useState<PixelFieldRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());
  const [deletingKeys, setDeletingKeys] = useState<Set<string>>(new Set());

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tracking_pixels')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        showToast('Erro ao carregar pixels. Execute tracking_pixels.sql no Supabase.', 'error');
        return;
      }

      setRows(mapPixelsToRows((data as TrackingPixelRow[]) ?? []));
    } catch {
      showToast('Erro ao carregar pixels de tracking.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const setSaving = (key: string, active: boolean) => {
    setSavingKeys((prev) => {
      const next = new Set(prev);
      if (active) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const setDeleting = (key: string, active: boolean) => {
    setDeletingKeys((prev) => {
      const next = new Set(prev);
      if (active) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const handleAddRow = () => {
    setRows((prev) => [...prev, createDraftRow()]);
  };

  const handleChangePixelId = (key: string, value: string) => {
    const sanitized = value.replace(/\D/g, '');
    setRows((prev) =>
      prev.map((row) => (row.key === key ? { ...row, pixel_id: sanitized } : row)),
    );
  };

  const persistRow = async (row: PixelFieldRow) => {
    const pixelId = row.pixel_id.trim();
    if (!pixelId) return;

    if (!PIXEL_ID_PATTERN.test(pixelId)) {
      showToast('Informe um Pixel ID válido (apenas números, 10 a 20 dígitos).', 'warning');
      return;
    }

    setSaving(row.key, true);
    try {
      if (row.id) {
        const { error } = await supabase
          .from('tracking_pixels')
          .update({
            pixel_id: pixelId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', row.id);

        if (error) {
          showToast(`Erro ao salvar: ${error.message}`, 'error');
          await loadData();
          return;
        }

        showToast('Pixel atualizado!', 'success');
        return;
      }

      const { data, error } = await supabase
        .from('tracking_pixels')
        .insert({
          nome: 'Facebook Pixel',
          pixel_id: pixelId,
          plataforma: 'facebook',
          ativo: true,
        })
        .select('id')
        .single();

      if (error) {
        showToast(`Erro ao adicionar: ${error.message}`, 'error');
        return;
      }

      setRows((prev) =>
        prev.map((item) =>
          item.key === row.key
            ? { key: String(data.id), id: String(data.id), pixel_id: pixelId }
            : item,
        ),
      );
      showToast('Pixel adicionado!', 'success');
    } finally {
      setSaving(row.key, false);
    }
  };

  const handleBlur = (row: PixelFieldRow) => {
    void persistRow(row);
  };

  const handleDelete = async (row: PixelFieldRow) => {
    if (row.id) {
      if (!window.confirm('Excluir este pixel?')) return;

      setDeleting(row.key, true);
      try {
        const { error } = await supabase.from('tracking_pixels').delete().eq('id', row.id);
        if (error) {
          showToast('Erro ao excluir pixel.', 'error');
          return;
        }
        showToast('Pixel excluído.', 'success');
      } finally {
        setDeleting(row.key, false);
      }
    }

    setRows((prev) => prev.filter((item) => item.key !== row.key));
  };

  return (
    <div>
      <PageHeader
        icon={Crosshair}
        title="Tracking"
        description="Configure pixels do Facebook (Meta) para rastrear PageView no frontend do cassino."
      />

      {loading ? (
        <LoadingState message="Carregando pixels..." />
      ) : (
        <PagePanel padding={false}>
          <div className="border-b border-admin-border px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <FacebookIcon />
                <span className="text-sm font-semibold text-admin-foreground">Facebook Pixel</span>
              </div>
              <button
                type="button"
                onClick={handleAddRow}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-admin-foreground-soft hover:text-admin-foreground transition-colors shrink-0"
              >
                <Plus className="w-4 h-4" />
                Adicionar
              </button>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="px-5 py-6 text-sm text-admin-muted">
              Nenhum pixel configurado. Clique em Adicionar para incluir um Pixel ID.
            </div>
          ) : (
            <div className="divide-y divide-admin-border">
              {rows.map((row) => (
                <div key={row.key} className="flex items-center gap-3 px-5 py-3">
                  <input
                    className="flex-1 min-w-0 rounded-lg bg-admin-panel-2 border border-admin-border px-3 py-2.5 text-admin-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-admin-accent/30 focus:border-admin-accent/30"
                    value={row.pixel_id}
                    onChange={(e) => handleChangePixelId(row.key, e.target.value)}
                    onBlur={() => handleBlur(row)}
                    placeholder="123456789012345"
                    inputMode="numeric"
                    disabled={savingKeys.has(row.key) || deletingKeys.has(row.key)}
                  />
                  <button
                    type="button"
                    onClick={() => void handleDelete(row)}
                    disabled={savingKeys.has(row.key) || deletingKeys.has(row.key)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-admin-border bg-admin-panel-2 text-admin-muted hover:text-admin-danger hover:border-admin-danger/40 hover:bg-admin-danger/10 transition-colors disabled:opacity-50 shrink-0"
                    aria-label="Excluir pixel"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </PagePanel>
      )}
    </div>
  );
}
