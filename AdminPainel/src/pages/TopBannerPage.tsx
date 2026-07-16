import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import PageHeader from '../components/PageHeader';
import LoadingState from '../components/ui/LoadingState';
import PagePanel from '../components/ui/PagePanel';
import { Megaphone } from 'lucide-react';

interface TopBannerForm {
  ativo: boolean;
  background_color: string;
  emoji: string;
  mensagem: string;
  botao_texto: string;
  botao_href: string;
  botao_cor_fundo: string;
  permitir_fechar: boolean;
}

const defaultForm: TopBannerForm = {
  ativo: true,
  background_color: '#7B3FF2',
  emoji: '📲',
  mensagem: 'Faça o download do nosso aplicativo para uma experiência ainda melhor!',
  botao_texto: 'Download',
  botao_href: '/help/mobile',
  botao_cor_fundo: '#FFFFFF',
  permitir_fechar: true,
};

export default function TopBannerPage() {
  const { showToast } = useToast();
  const [form, setForm] = useState<TopBannerForm>(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('site_config')
        .select(
          'top_banner_ativo, top_banner_background_color, top_banner_emoji, top_banner_mensagem, top_banner_botao_texto, top_banner_botao_href, top_banner_botao_cor_fundo, top_banner_botao_cor_texto, top_banner_permitir_fechar',
        )
        .eq('id', 1)
        .maybeSingle();

      if (error) {
        showToast('Execute site_config.sql no Supabase.', 'error');
        return;
      }

      if (data) {
        setForm({
          ativo: Boolean(data.top_banner_ativo),
          background_color: String(data.top_banner_background_color || defaultForm.background_color),
          emoji: String(data.top_banner_emoji ?? defaultForm.emoji),
          mensagem: String(data.top_banner_mensagem || defaultForm.mensagem),
          botao_texto: String(data.top_banner_botao_texto || defaultForm.botao_texto),
          botao_href: String(data.top_banner_botao_href || defaultForm.botao_href),
          botao_cor_fundo: String(data.top_banner_botao_cor_fundo || defaultForm.botao_cor_fundo),
          permitir_fechar: data.top_banner_permitir_fechar !== false,
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
    if (!form.mensagem.trim()) {
      showToast('Informe a mensagem do banner.', 'error');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('site_config').upsert({
        id: 1,
        top_banner_ativo: form.ativo,
        top_banner_background_color: form.background_color.trim(),
        top_banner_emoji: form.emoji,
        top_banner_mensagem: form.mensagem.trim(),
        top_banner_botao_texto: form.botao_texto.trim(),
        top_banner_botao_href: form.botao_href.trim() || '/help/mobile',
        top_banner_botao_cor_fundo: form.botao_cor_fundo.trim(),
        top_banner_botao_cor_texto: form.background_color.trim(),
        top_banner_permitir_fechar: form.permitir_fechar,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        showToast('Erro ao salvar banner.', 'error');
        return;
      }

      showToast('Banner superior salvo!', 'success');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState message="Carregando banner..." />;
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        icon={Megaphone}
        title="Banner Topo"
        description="Configure o banner roxo no topo de todas as páginas do site."
      />

      <PagePanel className="space-y-4">
        <label className="flex items-center gap-2 text-gray-300 text-sm">
          <input
            type="checkbox"
            checked={form.ativo}
            onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
            className="rounded"
          />
          Banner ativo
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ColorField label="Cor de fundo" value={form.background_color} onChange={(v) => setForm({ ...form, background_color: v })} />
          <Field label="Emoji" value={form.emoji} onChange={(v) => setForm({ ...form, emoji: v })} placeholder="📲" />
          <Field
            label="Mensagem"
            value={form.mensagem}
            onChange={(v) => setForm({ ...form, mensagem: v })}
            className="md:col-span-2"
          />
          <Field label="Texto do botão" value={form.botao_texto} onChange={(v) => setForm({ ...form, botao_texto: v })} />
          <Field label="Link do botão" value={form.botao_href} onChange={(v) => setForm({ ...form, botao_href: v })} placeholder="/help/mobile" />
          <ColorField label="Cor do botão" value={form.botao_cor_fundo} onChange={(v) => setForm({ ...form, botao_cor_fundo: v })} />
        </div>

        <label className="flex items-center gap-2 text-gray-300 text-sm">
          <input
            type="checkbox"
            checked={form.permitir_fechar}
            onChange={(e) => setForm({ ...form, permitir_fechar: e.target.checked })}
            className="rounded"
          />
          Permitir fechar (botão X)
        </label>

        <div>
          <p className="text-gray-400 text-xs mb-2">Pré-visualização</p>
          <div
            className="px-4 py-2 flex items-center justify-center gap-2 rounded-lg relative"
            style={{ backgroundColor: form.background_color }}
          >
            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              {form.emoji ? <span className="text-base">{form.emoji}</span> : null}
              <span className="text-sm text-white">{form.mensagem}</span>
              {form.botao_texto ? (
                <span
                  className="px-2.5 py-1 rounded-lg text-xs"
                  style={{
                    backgroundColor: form.botao_cor_fundo,
                    color: form.background_color,
                    fontFamily: 'Montserrat, sans-serif',
                    fontWeight: 700,
                  }}
                >
                  {form.botao_texto}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <button
          onClick={saveConfig}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-admin-accent hover:bg-admin-accent-hover text-[#0d0e10] text-sm font-medium disabled:opacity-50"
        >
          {saving ? 'Salvando...' : 'Salvar banner'}
        </button>
      </PagePanel>
    </div>
  );
}

function Field({
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
      <input
        type="text"
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
          value={value.startsWith('#') ? value : '#7B3FF2'}
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
