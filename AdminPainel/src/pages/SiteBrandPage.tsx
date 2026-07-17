import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import PageHeader from '../components/PageHeader';
import LoadingState from '../components/ui/LoadingState';
import PagePanel from '../components/ui/PagePanel';
import Button from '../components/ui/Button';
import { AlertTriangle, BadgeCheck, Globe, Image as ImageIcon, Link2, Type } from 'lucide-react';

interface SiteBrandForm {
  logo_url: string;
  nome_bet: string;
  site_titulo: string;
  site_dominio: string;
}

const defaultForm: SiteBrandForm = {
  logo_url: '/assets/logo.png',
  nome_bet: 'RoyalBet',
  site_titulo: 'RoyalBet | Apostas Online com Saques Rápidos',
  site_dominio: 'royall.bet',
};

function normalizeSiteDominioInput(value: string): string {
  return value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
}

function isValidSiteDominio(value: string): boolean {
  return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/.test(value);
}

export default function SiteBrandPage() {
  const { showToast } = useToast();
  const [form, setForm] = useState<SiteBrandForm>(defaultForm);
  const [headerFundo, setHeaderFundo] = useState('#121319');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('site_config')
        .select('header_logo_url, nome_bet, site_titulo, site_dominio, header_fundo')
        .eq('id', 1)
        .maybeSingle();

      if (error) {
        showToast('Erro ao carregar identidade do site. Execute site_config.sql.', 'error');
        return;
      }

      if (data) {
        setForm({
          logo_url: String(data.header_logo_url || defaultForm.logo_url),
          nome_bet: String(data.nome_bet || defaultForm.nome_bet).trim() || defaultForm.nome_bet,
          site_titulo:
            String(data.site_titulo || defaultForm.site_titulo).trim() || defaultForm.site_titulo,
          site_dominio:
            normalizeSiteDominioInput(String(data.site_dominio || defaultForm.site_dominio)) ||
            defaultForm.site_dominio,
        });
        setHeaderFundo(String(data.header_fundo || '#121319'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadConfig();
  }, []);

  const saveConfig = async () => {
    if (!form.logo_url.trim()) {
      showToast('Informe a URL da logo.', 'error');
      return;
    }

    const nomeBet = form.nome_bet.trim();
    if (nomeBet.length < 2) {
      showToast('Informe o nome da bet (mínimo 2 caracteres).', 'error');
      return;
    }

    const siteTitulo = form.site_titulo.trim();
    if (siteTitulo.length < 3) {
      showToast('Informe o título do site (mínimo 3 caracteres).', 'error');
      return;
    }

    const siteDominio = normalizeSiteDominioInput(form.site_dominio);
    if (!siteDominio) {
      showToast('Informe o domínio do site.', 'error');
      return;
    }
    if (!isValidSiteDominio(siteDominio)) {
      showToast('Informe um domínio válido (ex.: royall.bet).', 'error');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('site_config').upsert({
        id: 1,
        header_logo_url: form.logo_url.trim(),
        nome_bet: nomeBet,
        site_titulo: siteTitulo,
        site_dominio: siteDominio,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        showToast('Erro ao salvar identidade do site.', 'error');
        return;
      }

      showToast('Identidade do site salva!', 'success');
    } catch {
      showToast('Erro ao salvar identidade do site.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState message="Carregando identidade do site..." />;
  }

  const originaisLabel = `${form.nome_bet.trim() || 'RoyalBet'} Originais`;
  const dominioPreview = normalizeSiteDominioInput(form.site_dominio) || 'royall.bet';

  return (
    <div className="max-w-4xl">
      <PageHeader
        icon={BadgeCheck}
        title="Identidade do Site"
        description="Configure logo, nome da bet e título exibidos no site, navegador e páginas legais."
        actions={
          <Button onClick={saveConfig} loading={saving}>
            Salvar identidade
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 space-y-5">
          <PagePanel>
            <div className="flex items-center gap-2 mb-4">
              <Type className="w-4 h-4 text-admin-muted" />
              <h3 className="text-white font-semibold">Nome e título</h3>
            </div>

            <div className="space-y-4">
              <Field
                label="Nome da bet"
                hint="Usado em páginas legais, textos do site e rótulo dos jogos originais."
                value={form.nome_bet}
                onChange={(v) => setForm({ ...form, nome_bet: v })}
                placeholder="RoyalBet"
                maxLength={50}
              />
              <Field
                label="Título do site"
                hint="Texto da aba do navegador e SEO. Ex.: RoyalBet | Apostas Online com Saques Rápidos"
                value={form.site_titulo}
                onChange={(v) => setForm({ ...form, site_titulo: v })}
                placeholder="RoyalBet | Apostas Online com Saques Rápidos"
                maxLength={120}
              />
            </div>
          </PagePanel>

          <PagePanel>
            <div className="flex items-center gap-2 mb-4">
              <Link2 className="w-4 h-4 text-admin-muted" />
              <h3 className="text-white font-semibold">Domínio do site</h3>
            </div>

            <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-amber-200 text-sm font-medium">Não altere sem orientação</p>
                <p className="text-amber-100/80 text-xs mt-1 leading-relaxed">
                  Este domínio é usado nos links de indicação do site. Mudanças incorretas quebram
                  convites, campanhas e rastreamento de afiliados.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <Field
                label="Domínio principal"
                hint="Informe apenas o domínio, sem https://. Ex.: royall.bet"
                value={form.site_dominio}
                onChange={(v) => setForm({ ...form, site_dominio: v })}
                placeholder="royall.bet"
                maxLength={120}
              />

              <div className="rounded-lg border border-admin-border bg-admin-panel px-4 py-3">
                <p className="text-gray-500 text-xs mb-1">Exemplo de link de indicação</p>
                <p className="text-admin-accent text-sm font-mono break-all">
                  https://{dominioPreview}?c=CODIGO_DO_USUARIO
                </p>
              </div>
            </div>
          </PagePanel>

          <PagePanel>
            <div className="flex items-center gap-2 mb-4">
              <ImageIcon className="w-4 h-4 text-admin-muted" />
              <h3 className="text-white font-semibold">Logo</h3>
            </div>

            <Field
              label="URL da logo"
              hint="Exibida no header, footer e modais. URL completa ou caminho relativo (ex: /assets/logo.png)."
              value={form.logo_url}
              onChange={(v) => setForm({ ...form, logo_url: v })}
              placeholder="https://exemplo.com/logo.png ou /assets/logo.png"
            />

            {form.logo_url.trim() ? (
              <div className="mt-4 p-4 rounded-lg border border-admin-border bg-admin-panel">
                <p className="text-gray-400 text-xs mb-3">Pré-visualização da logo</p>
                <img
                  src={form.logo_url}
                  alt={form.nome_bet}
                  className="h-14 w-auto max-w-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            ) : null}
          </PagePanel>
        </div>

        <div className="lg:col-span-2 space-y-5">
          <PagePanel>
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-4 h-4 text-admin-muted" />
              <h3 className="text-white font-semibold">Pré-visualização</h3>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-gray-500 text-[11px] uppercase tracking-wide mb-2">Aba do navegador</p>
                <div className="rounded-lg border border-admin-border bg-[#1e1f24] px-3 py-2 flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500/80 shrink-0" />
                  <span className="w-3 h-3 rounded-full bg-yellow-500/80 shrink-0" />
                  <span className="w-3 h-3 rounded-full bg-green-500/80 shrink-0" />
                  <span className="ml-2 text-gray-300 text-xs truncate flex-1">
                    {form.site_titulo.trim() || 'Título do site'}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-gray-500 text-[11px] uppercase tracking-wide mb-2">Header do site</p>
                <div
                  className="rounded-lg border border-white/10 px-4 py-3 flex items-center"
                  style={{ backgroundColor: headerFundo }}
                >
                  {form.logo_url.trim() ? (
                    <img
                      src={form.logo_url}
                      alt={form.nome_bet}
                      className="h-10 w-auto max-w-[180px] object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="text-white text-sm font-semibold">{form.nome_bet || 'Nome da bet'}</span>
                  )}
                </div>
                <p className="text-gray-500 text-xs mt-2">
                  Cor de fundo do header editável em Sidebar & Layout → Header.
                </p>
              </div>

              <div>
                <p className="text-gray-500 text-[11px] uppercase tracking-wide mb-2">Onde o nome aparece</p>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li className="rounded-md bg-admin-panel border border-admin-border px-3 py-2">
                    Link de indicação: <span className="text-white">https://{dominioPreview}?c=...</span>
                  </li>
                  <li className="rounded-md bg-admin-panel border border-admin-border px-3 py-2">
                    Páginas legais: <span className="text-white">{form.nome_bet || '—'}</span>
                  </li>
                  <li className="rounded-md bg-admin-panel border border-admin-border px-3 py-2">
                    Jogos originais: <span className="text-white">{originaisLabel}</span>
                  </li>
                  <li className="rounded-md bg-admin-panel border border-admin-border px-3 py-2">
                    Alt da logo: <span className="text-white">{form.nome_bet || '—'}</span>
                  </li>
                </ul>
              </div>
            </div>
          </PagePanel>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
  placeholder,
  maxLength,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <div>
      <label className="block text-gray-200 text-sm font-medium mb-1">{label}</label>
      {hint ? <p className="text-gray-500 text-xs mb-2">{hint}</p> : null}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full px-4 py-2.5 text-white text-sm rounded-lg bg-admin-panel border border-admin-border focus:outline-none focus:ring-2 focus:ring-admin-accent/30"
      />
    </div>
  );
}
