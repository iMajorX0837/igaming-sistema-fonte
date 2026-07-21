import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import PageHeader from '../components/PageHeader';
import LoadingState from '../components/ui/LoadingState';
import PagePanel from '../components/ui/PagePanel';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';
import { ADMIN_IMAGE_SIZES } from '../lib/adminImageSizes';
import type { AdminImageSizeSpec } from '../lib/adminImageSizes';
import ImageSizeHint from '../components/ui/ImageSizeHint';
import { ImageIcon, Settings2, X } from 'lucide-react';

interface EntryPopupForm {
  ativo: boolean;
  imagem_url: string;
}

const defaultEntryPopupForm: EntryPopupForm = {
  ativo: false,
  imagem_url: '',
};

export default function EntryPopupPage({ embedded = false }: { embedded?: boolean }) {
  const { showToast } = useToast();
  const [form, setForm] = useState<EntryPopupForm>(defaultEntryPopupForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('site_config')
        .select('entry_popup_ativo, entry_popup_imagem_url')
        .eq('id', 1)
        .maybeSingle();

      if (error) {
        showToast('Execute deploy/supabase_nova_casa.sql no Supabase.', 'error');
        return;
      }

      if (data) {
        setForm({
          ativo: Boolean(data.entry_popup_ativo),
          imagem_url: String(data.entry_popup_imagem_url || ''),
        });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadConfig();
  }, []);

  const saveConfig = async () => {
    if (form.ativo && !form.imagem_url.trim()) {
      showToast('Informe a URL da imagem do popup.', 'error');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('site_config').upsert({
        id: 1,
        entry_popup_ativo: form.ativo,
        entry_popup_imagem_url: form.imagem_url.trim() || null,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        showToast('Erro ao salvar popup.', 'error');
        return;
      }

      showToast('Popup de entrada salvo!', 'success');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState message="Carregando popup..." inline={embedded} />;
  }

  const content = (
    <>
      {!embedded && (
        <PageHeader
          icon={ImageIcon}
          title="Popup de Entrada"
          description="Imagem exibida em popup ao acessar o site (uma vez por sessão do visitante)."
          actions={
            <Button onClick={saveConfig} loading={saving}>
              Salvar popup
            </Button>
          }
        />
      )}

      {embedded && (
        <div className="flex justify-end mb-4">
          <Button onClick={saveConfig} loading={saving}>
            Salvar popup
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3">
          <PagePanel>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-admin-muted" />
                <h3 className="text-white font-semibold">Configuração</h3>
              </div>
              <StatusBadge variant={form.ativo ? 'success' : 'neutral'}>
                {form.ativo ? 'Ativo' : 'Inativo'}
              </StatusBadge>
            </div>

            <div className="space-y-4">
              <ToggleField
                label="Popup ativo no site"
                checked={form.ativo}
                onChange={(v) => setForm({ ...form, ativo: v })}
              />
              <Field
                label="URL da imagem"
                sizeHint={ADMIN_IMAGE_SIZES.entryPopup}
                value={form.imagem_url}
                onChange={(v) => setForm({ ...form, imagem_url: v })}
                placeholder="https://..."
              />
            </div>
          </PagePanel>
        </div>

        <div className="lg:col-span-2">
          <PagePanel className="lg:sticky lg:top-6">
            <div className="flex items-center gap-2 mb-4">
              <ImageIcon className="w-4 h-4 text-admin-muted" />
              <h3 className="text-white font-semibold">Pré-visualização</h3>
            </div>

            <EntryPopupPreview form={form} />

            <div className="mt-5 pt-4 border-t border-admin-border space-y-2">
              <SummaryRow label="Status" value={form.ativo ? 'Ativo' : 'Inativo'} />
              <SummaryRow
                label="Imagem"
                value={form.imagem_url.trim() ? 'Configurada' : 'Não definida'}
              />
            </div>
          </PagePanel>
        </div>
      </div>
    </>
  );

  return embedded ? content : <div className="max-w-5xl">{content}</div>;
}

function EntryPopupPreview({ form }: { form: EntryPopupForm }) {
  const imageUrl = form.imagem_url.trim();

  return (
    <div>
      <p className="text-gray-500 text-[11px] uppercase tracking-wide mb-2">Como aparece no site</p>
      <div className="relative rounded-lg bg-black/40 p-6 flex items-center justify-center min-h-[200px]">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Preview popup"
            className="max-w-full max-h-[280px] rounded-lg object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <p className="text-gray-500 text-sm text-center">Informe a URL da imagem para visualizar</p>
        )}
        <span className="absolute top-3 right-3 text-white/70">
          <X className="w-4 h-4" />
        </span>
      </div>
      {!form.ativo ? (
        <p className="text-admin-warning text-xs mt-2">Popup desativado — não será exibido no site.</p>
      ) : !imageUrl ? (
        <p className="text-admin-warning text-xs mt-2">Ative e informe uma imagem para exibir o popup.</p>
      ) : null}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-gray-500 text-sm">{label}</span>
      <span className="text-white text-sm text-right font-medium">{value}</span>
    </div>
  );
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2.5 text-gray-300 text-sm cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded"
      />
      {label}
    </label>
  );
}

function Field({
  label,
  hint,
  sizeHint,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  hint?: string;
  sizeHint?: AdminImageSizeSpec;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-gray-200 text-sm font-medium mb-1">{label}</label>
      {sizeHint ? <ImageSizeHint spec={sizeHint} /> : null}
      {hint ? <p className="text-gray-500 text-xs mb-2">{hint}</p> : null}
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 text-white text-sm rounded-lg bg-admin-panel border border-admin-border focus:outline-none focus:ring-2 focus:ring-admin-accent/30"
      />
    </div>
  );
}
