import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import PageHeader from '../components/PageHeader';
import LoadingState from '../components/ui/LoadingState';
import PagePanel from '../components/ui/PagePanel';
import Button from '../components/ui/Button';
import StatusBadge from '../components/ui/StatusBadge';
import { Megaphone, MousePointerClick, Power, Settings2, Type, X } from 'lucide-react';

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

  const toggleAtivo = async () => {
    setSaving(true);
    try {
      const next = !form.ativo;
      const { error } = await supabase.from('site_config').upsert({
        id: 1,
        top_banner_ativo: next,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        showToast('Erro ao atualizar status do banner.', 'error');
        return;
      }

      setForm((current) => ({ ...current, ativo: next }));
      showToast(next ? 'Banner ativado.' : 'Banner desativado.', 'success');
    } finally {
      setSaving(false);
    }
  };

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
    <div className="max-w-5xl">
      <PageHeader
        icon={Megaphone}
        title="Banner Topo"
        description="Configure o banner roxo exibido acima do header em todas as páginas do site."
        actions={
          <Button onClick={saveConfig} loading={saving}>
            Salvar banner
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 space-y-5">
          <PagePanel>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-admin-muted" />
                <h3 className="text-white font-semibold">Status</h3>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge variant={form.ativo ? 'success' : 'neutral'}>
                  {form.ativo ? 'Ativo' : 'Inativo'}
                </StatusBadge>
                <Button
                  variant="ghost"
                  icon={Power}
                  onClick={() => void toggleAtivo()}
                  disabled={saving}
                  className="!px-3 !py-1.5 !text-xs"
                >
                  {form.ativo ? 'Desativar' : 'Ativar'}
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <ToggleField
                label="Permitir fechar (botão X)"
                checked={form.permitir_fechar}
                onChange={(v) => setForm({ ...form, permitir_fechar: v })}
              />
            </div>
          </PagePanel>

          <PagePanel>
            <div className="flex items-center gap-2 mb-4">
              <Type className="w-4 h-4 text-admin-muted" />
              <h3 className="text-white font-semibold">Conteúdo</h3>
            </div>

            <div className="space-y-4">
              <ColorField
                label="Cor de fundo"
                value={form.background_color}
                onChange={(v) => setForm({ ...form, background_color: v })}
              />
              <Field
                label="Emoji"
                hint="Ícone exibido antes da mensagem. Deixe vazio para ocultar."
                value={form.emoji}
                onChange={(v) => setForm({ ...form, emoji: v })}
                placeholder="📲"
              />
              <Field
                label="Mensagem"
                hint="Texto principal do banner, visível em desktop e mobile."
                value={form.mensagem}
                onChange={(v) => setForm({ ...form, mensagem: v })}
                placeholder="Faça o download do nosso aplicativo..."
              />
            </div>
          </PagePanel>

          <PagePanel>
            <div className="flex items-center gap-2 mb-4">
              <MousePointerClick className="w-4 h-4 text-admin-muted" />
              <h3 className="text-white font-semibold">Botão de ação</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field
                label="Texto do botão"
                value={form.botao_texto}
                onChange={(v) => setForm({ ...form, botao_texto: v })}
                placeholder="Download"
              />
              <Field
                label="Link do botão"
                hint="Rota interna ou URL completa."
                value={form.botao_href}
                onChange={(v) => setForm({ ...form, botao_href: v })}
                placeholder="/help/mobile"
              />
              <ColorField
                label="Cor de fundo do botão"
                value={form.botao_cor_fundo}
                onChange={(v) => setForm({ ...form, botao_cor_fundo: v })}
                className="md:col-span-2"
              />
            </div>
          </PagePanel>
        </div>

        <div className="lg:col-span-2">
          <PagePanel className="lg:sticky lg:top-6">
            <div className="flex items-center gap-2 mb-4">
              <Megaphone className="w-4 h-4 text-admin-muted" />
              <h3 className="text-white font-semibold">Pré-visualização</h3>
            </div>

            <BannerPreview form={form} />

            <div className="mt-5 pt-4 border-t border-admin-border space-y-2">
              <SummaryRow label="Status" value={form.ativo ? 'Ativo' : 'Inativo'} />
              <SummaryRow label="Fechar" value={form.permitir_fechar ? 'Permitido' : 'Bloqueado'} />
              <SummaryRow label="Link" value={form.botao_href.trim() || '/help/mobile'} />
              <SummaryRow label="Cor de fundo" value={form.background_color} mono />
            </div>
          </PagePanel>
        </div>
      </div>
    </div>
  );
}

function BannerPreview({ form }: { form: TopBannerForm }) {
  return (
    <div>
      <p className="text-gray-500 text-[11px] uppercase tracking-wide mb-2">Como aparece no site</p>
      <div
        className="px-4 py-2.5 flex items-center justify-center gap-2 rounded-lg relative min-h-[44px]"
        style={{ backgroundColor: form.background_color }}
      >
        <div className="flex items-center gap-1.5 flex-wrap justify-center pr-6">
          {form.emoji ? <span className="text-base leading-none">{form.emoji}</span> : null}
          <span className="text-sm text-white text-center">{form.mensagem || 'Mensagem do banner'}</span>
          {form.botao_texto ? (
            <span
              className="px-2.5 py-1 rounded-lg text-xs whitespace-nowrap"
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
        {form.permitir_fechar ? (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70">
            <X className="w-4 h-4" />
          </span>
        ) : null}
      </div>
      {!form.ativo ? (
        <p className="text-admin-warning text-xs mt-2">Banner desativado — não será exibido no site.</p>
      ) : null}
    </div>
  );
}

function SummaryRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-gray-500 text-sm">{label}</span>
      <span className={`text-white text-sm text-right ${mono ? 'font-mono text-xs' : 'font-medium'}`}>
        {value}
      </span>
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
  value,
  onChange,
  placeholder,
  className = '',
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-gray-200 text-sm font-medium mb-1">{label}</label>
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

function ColorField({
  label,
  value,
  onChange,
  className = '',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="text-gray-200 text-sm font-medium mb-1 block">{label}</label>
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
