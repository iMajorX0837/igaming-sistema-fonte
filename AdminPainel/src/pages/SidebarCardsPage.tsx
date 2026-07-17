import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import PageHeader from '../components/PageHeader';
import LoadingState from '../components/ui/LoadingState';
import PagePanel from '../components/ui/PagePanel';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import {
  PanelLeft,
  Palette,
  LayoutTemplate,
  Image as ImageIcon,
  PanelBottom,
  Monitor,
  FolderTree,
  Settings2,
} from 'lucide-react';
import SidebarMenuAdmin from './sidebar/SidebarMenuAdmin';
import SidebarCardsAdmin from './sidebar/SidebarCardsAdmin';

type TabKey = 'aparencia' | 'menu' | 'cards';
type ConfigModal = 'sidebar' | 'header' | 'footer' | 'auth' | null;

interface SidebarBackgroundConfig {
  fundo: string;
  item_fundo: string;
  idioma_ativo_fundo: string;
}

interface FooterBackgroundConfig {
  fundo: string;
}

interface HeaderBackgroundConfig {
  fundo: string;
}

interface AuthModalsImagesConfig {
  login_imagem_url: string;
  register_imagem_url: string;
}

const DEFAULT_AUTH_MODAL_IMAGE =
  'https://i.ibb.co/YgXq6QP/Gemini-Generated-Image-39fib539fib539fi.png';

const defaultSidebarBackground: SidebarBackgroundConfig = {
  fundo: '#121319',
  item_fundo: '#181923',
  idioma_ativo_fundo: '#2a1f45',
};

const defaultFooterBackground: FooterBackgroundConfig = {
  fundo: '#121319',
};

const defaultHeaderBackground: HeaderBackgroundConfig = {
  fundo: '#121319',
};

const defaultAuthModalsImages: AuthModalsImagesConfig = {
  login_imagem_url: DEFAULT_AUTH_MODAL_IMAGE,
  register_imagem_url: DEFAULT_AUTH_MODAL_IMAGE,
};

const TABS: { key: TabKey; label: string; icon: typeof Palette; description: string }[] = [
  { key: 'aparencia', label: 'Aparência', icon: Palette, description: 'Cores da sidebar, header, footer e modais de auth.' },
  { key: 'menu', label: 'Menu', icon: FolderTree, description: 'Seções e botões da sidebar, organizados por grupo.' },
  { key: 'cards', label: 'Cards', icon: LayoutTemplate, description: 'Banners promocionais roxos no topo da sidebar.' },
];

export default function SidebarCardsPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>('aparencia');
  const [configModal, setConfigModal] = useState<ConfigModal>(null);
  const [sidebarBackground, setSidebarBackground] = useState<SidebarBackgroundConfig>(defaultSidebarBackground);
  const [footerBackground, setFooterBackground] = useState<FooterBackgroundConfig>(defaultFooterBackground);
  const [headerBackground, setHeaderBackground] = useState<HeaderBackgroundConfig>(defaultHeaderBackground);
  const [authModalsImages, setAuthModalsImages] = useState<AuthModalsImagesConfig>(defaultAuthModalsImages);
  const [configLoading, setConfigLoading] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);
  const [footerSaving, setFooterSaving] = useState(false);
  const [headerSaving, setHeaderSaving] = useState(false);
  const [authModalsSaving, setAuthModalsSaving] = useState(false);

  const loadSiteColors = async () => {
    try {
      setConfigLoading(true);
      const { data, error } = await supabase
        .from('site_config')
        .select(
          'sidebar_fundo, sidebar_item_fundo, sidebar_idioma_ativo_fundo, footer_fundo, header_fundo, login_modal_imagem_url, register_modal_imagem_url',
        )
        .eq('id', 1)
        .maybeSingle();

      if (error) {
        showToast('Erro ao carregar cores do site. Execute site_config.sql.', 'error');
        return;
      }

      if (data) {
        setSidebarBackground({
          fundo: String(data.sidebar_fundo || defaultSidebarBackground.fundo),
          item_fundo: String(data.sidebar_item_fundo || defaultSidebarBackground.item_fundo),
          idioma_ativo_fundo: String(data.sidebar_idioma_ativo_fundo || defaultSidebarBackground.idioma_ativo_fundo),
        });
        setFooterBackground({
          fundo: String(data.footer_fundo || defaultFooterBackground.fundo),
        });
        setHeaderBackground({
          fundo: String(data.header_fundo || defaultHeaderBackground.fundo),
        });
        setAuthModalsImages({
          login_imagem_url: String(data.login_modal_imagem_url || defaultAuthModalsImages.login_imagem_url),
          register_imagem_url: String(data.register_modal_imagem_url || defaultAuthModalsImages.register_imagem_url),
        });
      }
    } finally {
      setConfigLoading(false);
    }
  };

  useEffect(() => {
    void loadSiteColors();
  }, []);

  const saveSidebarBackground = async () => {
    setConfigSaving(true);
    try {
      const { error: upsertError } = await supabase.from('site_config').upsert({
        id: 1,
        sidebar_fundo: sidebarBackground.fundo.trim(),
        sidebar_item_fundo: sidebarBackground.item_fundo.trim(),
        sidebar_idioma_ativo_fundo: sidebarBackground.idioma_ativo_fundo.trim(),
        updated_at: new Date().toISOString(),
      });
      if (upsertError) {
        showToast('Erro ao salvar cores da sidebar.', 'error');
        return;
      }
      showToast('Cores da sidebar salvas!', 'success');
      setConfigModal(null);
    } catch {
      showToast('Erro ao salvar cores da sidebar.', 'error');
    } finally {
      setConfigSaving(false);
    }
  };

  const saveFooterBackground = async () => {
    setFooterSaving(true);
    try {
      const { error: upsertError } = await supabase.from('site_config').upsert({
        id: 1,
        footer_fundo: footerBackground.fundo.trim(),
        updated_at: new Date().toISOString(),
      });
      if (upsertError) {
        showToast('Erro ao salvar cor do footer.', 'error');
        return;
      }
      showToast('Cor do footer salva!', 'success');
      setConfigModal(null);
    } catch {
      showToast('Erro ao salvar cor do footer.', 'error');
    } finally {
      setFooterSaving(false);
    }
  };

  const saveHeaderBackground = async () => {
    setHeaderSaving(true);
    try {
      const { error: upsertError } = await supabase.from('site_config').upsert({
        id: 1,
        header_fundo: headerBackground.fundo.trim(),
        updated_at: new Date().toISOString(),
      });
      if (upsertError) {
        showToast('Erro ao salvar cor do header.', 'error');
        return;
      }
      showToast('Cor do header salva!', 'success');
      setConfigModal(null);
    } catch {
      showToast('Erro ao salvar cor do header.', 'error');
    } finally {
      setHeaderSaving(false);
    }
  };

  const saveAuthModalsImages = async () => {
    if (!authModalsImages.login_imagem_url.trim() || !authModalsImages.register_imagem_url.trim()) {
      showToast('Informe as URLs das imagens de login e cadastro.', 'error');
      return;
    }

    setAuthModalsSaving(true);
    try {
      const { error: upsertError } = await supabase.from('site_config').upsert({
        id: 1,
        login_modal_imagem_url: authModalsImages.login_imagem_url.trim(),
        register_modal_imagem_url: authModalsImages.register_imagem_url.trim(),
        updated_at: new Date().toISOString(),
      });
      if (upsertError) {
        showToast('Erro ao salvar imagens dos modais. Execute site_config.sql.', 'error');
        return;
      }
      showToast('Imagens dos modais salvas!', 'success');
      setConfigModal(null);
    } catch {
      showToast('Erro ao salvar imagens dos modais.', 'error');
    } finally {
      setAuthModalsSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        icon={PanelLeft}
        title="Sidebar & Layout"
        description="Organize a aparência do site, o menu da sidebar e os cards promocionais."
      />

      <PagePanel padding={false} className="overflow-hidden">
        <div className="flex border-b border-admin-border overflow-x-auto px-4 gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px ${
                  isActive
                    ? 'text-white border-white'
                    : 'text-gray-500 border-transparent hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-5 md:p-6">
          {activeTab !== 'menu' && activeTab !== 'cards' && (
            <p className="text-gray-400 text-sm mb-5">
              {TABS.find((t) => t.key === activeTab)?.description}
            </p>
          )}

          {activeTab === 'aparencia' &&
            (configLoading ? (
              <LoadingState inline message="Carregando configurações..." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ConfigSummaryCard
                  icon={PanelLeft}
                  title="Sidebar"
                  description="Fundo, itens recolhidos e idioma ativo."
                  onConfigure={() => setConfigModal('sidebar')}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <ColorSwatch color={sidebarBackground.fundo} label="Fundo" />
                    <ColorSwatch color={sidebarBackground.item_fundo} label="Itens" />
                    <ColorSwatch color={sidebarBackground.idioma_ativo_fundo} label="Idioma" />
                  </div>
                </ConfigSummaryCard>

                <ConfigSummaryCard
                  icon={Monitor}
                  title="Header"
                  description="Cor de fundo do topo do site."
                  onConfigure={() => setConfigModal('header')}
                >
                  <ColorSwatch color={headerBackground.fundo} label="Fundo" />
                </ConfigSummaryCard>

                <ConfigSummaryCard
                  icon={PanelBottom}
                  title="Footer"
                  description="Cor de fundo do rodapé em todas as páginas."
                  onConfigure={() => setConfigModal('footer')}
                >
                  <ColorSwatch color={footerBackground.fundo} label="Fundo" />
                </ConfigSummaryCard>

                <ConfigSummaryCard
                  icon={ImageIcon}
                  title="Modais de auth"
                  description="Imagens dos modais de login e cadastro."
                  onConfigure={() => setConfigModal('auth')}
                >
                  <div className="flex gap-3">
                    <AuthThumb url={authModalsImages.login_imagem_url} label="Login" />
                    <AuthThumb url={authModalsImages.register_imagem_url} label="Cadastro" />
                  </div>
                </ConfigSummaryCard>
              </div>
            ))}

          {activeTab === 'menu' && <SidebarMenuAdmin />}
          {activeTab === 'cards' && <SidebarCardsAdmin />}
        </div>
      </PagePanel>

      <Modal
        open={configModal === 'sidebar'}
        onClose={() => setConfigModal(null)}
        title="Cores da Sidebar"
        description="Personalize o fundo principal e os botões quando a sidebar está recolhida."
        icon={PanelLeft}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfigModal(null)} disabled={configSaving}>
              Cancelar
            </Button>
            <Button onClick={saveSidebarBackground} loading={configSaving}>
              Salvar cores
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ColorField
              label="Fundo da sidebar"
              value={sidebarBackground.fundo}
              onChange={(v) => setSidebarBackground({ ...sidebarBackground, fundo: v })}
            />
            <ColorField
              label="Fundo dos itens (recolhida)"
              value={sidebarBackground.item_fundo}
              onChange={(v) => setSidebarBackground({ ...sidebarBackground, item_fundo: v })}
            />
            <ColorField
              label="Idioma ativo (recolhida)"
              value={sidebarBackground.idioma_ativo_fundo}
              onChange={(v) => setSidebarBackground({ ...sidebarBackground, idioma_ativo_fundo: v })}
            />
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-2">Pré-visualização</p>
            <div
              className="w-full max-w-xs h-28 rounded-lg border border-white/10 overflow-hidden"
              style={{ backgroundColor: sidebarBackground.fundo }}
            >
              <div className="p-3 space-y-2">
                <div className="h-6 rounded" style={{ backgroundColor: sidebarBackground.item_fundo }} />
                <div className="h-6 rounded" style={{ backgroundColor: sidebarBackground.item_fundo }} />
                <div className="h-6 rounded" style={{ backgroundColor: sidebarBackground.idioma_ativo_fundo }} />
              </div>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={configModal === 'header'}
        onClose={() => setConfigModal(null)}
        title="Cor do Header"
        description="Cor de fundo do topo do site, abas inativas e menu da conta."
        icon={Monitor}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfigModal(null)} disabled={headerSaving}>
              Cancelar
            </Button>
            <Button onClick={saveHeaderBackground} loading={headerSaving}>
              Salvar cor
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <ColorField
            label="Fundo do header"
            value={headerBackground.fundo}
            onChange={(v) => setHeaderBackground({ fundo: v })}
          />
          <div>
            <p className="text-gray-400 text-xs mb-2">Pré-visualização</p>
            <div
              className="w-full h-16 rounded-lg border border-white/10"
              style={{ backgroundColor: headerBackground.fundo }}
            />
          </div>
          <p className="text-gray-500 text-xs">
            Logo, nome e título do site são editados em Identidade do Site.
          </p>
        </div>
      </Modal>

      <Modal
        open={configModal === 'footer'}
        onClose={() => setConfigModal(null)}
        title="Cor do Footer"
        description="Cor de fundo do rodapé em todas as páginas do site."
        icon={PanelBottom}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfigModal(null)} disabled={footerSaving}>
              Cancelar
            </Button>
            <Button onClick={saveFooterBackground} loading={footerSaving}>
              Salvar footer
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <ColorField
            label="Fundo do footer"
            value={footerBackground.fundo}
            onChange={(v) => setFooterBackground({ fundo: v })}
          />
          <div>
            <p className="text-gray-400 text-xs mb-2">Pré-visualização</p>
            <div
              className="w-full h-16 rounded-lg border border-white/10"
              style={{ backgroundColor: footerBackground.fundo }}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={configModal === 'auth'}
        onClose={() => setConfigModal(null)}
        title="Imagens dos modais"
        description="Imagens exibidas no topo dos modais de login e cadastro."
        icon={ImageIcon}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfigModal(null)} disabled={authModalsSaving}>
              Cancelar
            </Button>
            <Button onClick={saveAuthModalsImages} loading={authModalsSaving}>
              Salvar imagens
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <label className="block text-gray-200 text-sm font-medium mb-1">Imagem do modal de Login</label>
            <input
              type="url"
              value={authModalsImages.login_imagem_url}
              onChange={(e) =>
                setAuthModalsImages({ ...authModalsImages, login_imagem_url: e.target.value })
              }
              className="w-full px-4 py-2.5 text-white text-sm rounded-lg bg-admin-panel border border-admin-border focus:outline-none focus:ring-2 focus:ring-admin-accent/30"
              placeholder="https://exemplo.com/login.png"
            />
            {authModalsImages.login_imagem_url.trim() ? (
              <div className="mt-3 p-3 rounded-lg border border-white/10 bg-black/20">
                <img
                  src={authModalsImages.login_imagem_url}
                  alt="Prévia login"
                  className="w-full max-w-sm h-auto object-contain rounded-md"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            ) : null}
          </div>
          <div>
            <label className="block text-gray-200 text-sm font-medium mb-1">Imagem do modal de Cadastro</label>
            <input
              type="url"
              value={authModalsImages.register_imagem_url}
              onChange={(e) =>
                setAuthModalsImages({ ...authModalsImages, register_imagem_url: e.target.value })
              }
              className="w-full px-4 py-2.5 text-white text-sm rounded-lg bg-admin-panel border border-admin-border focus:outline-none focus:ring-2 focus:ring-admin-accent/30"
              placeholder="https://exemplo.com/cadastro.png"
            />
            {authModalsImages.register_imagem_url.trim() ? (
              <div className="mt-3 p-3 rounded-lg border border-white/10 bg-black/20">
                <img
                  src={authModalsImages.register_imagem_url}
                  alt="Prévia cadastro"
                  className="w-full max-w-sm h-auto object-contain rounded-md"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            ) : null}
          </div>
        </div>
      </Modal>
    </div>
  );
}

function ConfigSummaryCard({
  icon: Icon,
  title,
  description,
  onConfigure,
  children,
}: {
  icon: typeof Settings2;
  title: string;
  description: string;
  onConfigure: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-admin-border bg-admin-panel-2/50 p-4 md:p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-admin-accent/12 border border-admin-accent/20 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-admin-foreground" />
          </div>
          <div className="min-w-0">
            <h3 className="text-white font-semibold">{title}</h3>
            <p className="text-gray-400 text-sm mt-0.5">{description}</p>
          </div>
        </div>
        <Button variant="secondary" icon={Settings2} onClick={onConfigure} className="!px-3 !py-1.5 !text-xs shrink-0">
          Configurar
        </Button>
      </div>
      <div className="pt-3 border-t border-admin-border">{children}</div>
    </div>
  );
}

function ColorSwatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="w-7 h-7 rounded-md border border-white/10 shrink-0"
        style={{ backgroundColor: color }}
        title={color}
      />
      <div className="min-w-0">
        <p className="text-gray-500 text-[11px] leading-none mb-0.5">{label}</p>
        <p className="text-gray-300 text-xs font-mono truncate">{color}</p>
      </div>
    </div>
  );
}

function AuthThumb({ url, label }: { url: string; label: string }) {
  return (
    <div className="flex-1 min-w-0">
      <p className="text-gray-500 text-[11px] mb-1.5">{label}</p>
      <div className="h-14 rounded-md border border-white/10 bg-black/20 overflow-hidden flex items-center justify-center">
        {url.trim() ? (
          <img
            src={url}
            alt={label}
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <span className="text-gray-600 text-xs">Sem imagem</span>
        )}
      </div>
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
          value={value.startsWith('#') ? value : '#6212A5'}
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
