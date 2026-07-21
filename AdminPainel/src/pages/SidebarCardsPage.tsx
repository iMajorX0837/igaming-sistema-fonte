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
import { ADMIN_IMAGE_SIZES } from '../lib/adminImageSizes';
import ImageSizeHint from '../components/ui/ImageSizeHint';

import { resolveBrandColors, DEFAULT_BRAND_PRIMARY, DEFAULT_BRAND_HOVER } from '../lib/brandColors';

type TabKey = 'aparencia' | 'menu' | 'cards';
type ConfigModal = 'sidebar' | 'header' | 'footer' | 'auth' | 'brand' | null;

interface BrandColorsForm {
  primary: string;
  hover: string;
}

interface SidebarBackgroundConfig {
  fundo: string;
  item_fundo: string;
  idioma_ativo_fundo: string;
}

interface FooterSiteConfig {
  fundo: string;
  instagram_ativo: boolean;
  instagram_url: string;
  telegram_ativo: boolean;
  telegram_url: string;
  whatsapp_ativo: boolean;
  whatsapp_url: string;
}

interface HeaderBackgroundConfig {
  fundo: string;
}

interface AuthModalsImagesConfig {
  login_imagem_url: string;
  register_imagem_url: string;
  deposit_imagem_url: string;
}

const DEFAULT_AUTH_MODAL_IMAGE =
  'https://i.ibb.co/YgXq6QP/Gemini-Generated-Image-39fib539fib539fi.png';

const defaultSidebarBackground: SidebarBackgroundConfig = {
  fundo: '#121319',
  item_fundo: '#181923',
  idioma_ativo_fundo: '#2a1f45',
};

const defaultFooterSiteConfig: FooterSiteConfig = {
  fundo: '#121319',
  instagram_ativo: true,
  instagram_url: 'https://instagram.com/royalbet_oficial',
  telegram_ativo: true,
  telegram_url: 'https://t.me/royalbet_oficial',
  whatsapp_ativo: false,
  whatsapp_url: '',
};

const defaultHeaderBackground: HeaderBackgroundConfig = {
  fundo: '#121319',
};

const defaultAuthModalsImages: AuthModalsImagesConfig = {
  login_imagem_url: DEFAULT_AUTH_MODAL_IMAGE,
  register_imagem_url: DEFAULT_AUTH_MODAL_IMAGE,
  deposit_imagem_url: '',
};

const defaultBrandColors: BrandColorsForm = {
  primary: DEFAULT_BRAND_PRIMARY,
  hover: DEFAULT_BRAND_HOVER,
};

const TABS: { key: TabKey; label: string; icon: typeof Palette; description: string }[] = [
  { key: 'aparencia', label: 'Aparência', icon: Palette, description: 'Cores da sidebar, header, footer, destaque da marca e imagens dos modais.' },
  { key: 'menu', label: 'Menu', icon: FolderTree, description: 'Seções e botões da sidebar, organizados por grupo.' },
  { key: 'cards', label: 'Cards', icon: LayoutTemplate, description: 'Banners promocionais roxos no topo da sidebar.' },
];

export default function SidebarCardsPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>('aparencia');
  const [configModal, setConfigModal] = useState<ConfigModal>(null);
  const [sidebarBackground, setSidebarBackground] = useState<SidebarBackgroundConfig>(defaultSidebarBackground);
  const [footerConfig, setFooterConfig] = useState<FooterSiteConfig>(defaultFooterSiteConfig);
  const [headerBackground, setHeaderBackground] = useState<HeaderBackgroundConfig>(defaultHeaderBackground);
  const [authModalsImages, setAuthModalsImages] = useState<AuthModalsImagesConfig>(defaultAuthModalsImages);
  const [brandColors, setBrandColors] = useState<BrandColorsForm>(defaultBrandColors);
  const [configLoading, setConfigLoading] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);
  const [footerSaving, setFooterSaving] = useState(false);
  const [headerSaving, setHeaderSaving] = useState(false);
  const [authModalsSaving, setAuthModalsSaving] = useState(false);
  const [brandSaving, setBrandSaving] = useState(false);

  const loadSiteColors = async () => {
    try {
      setConfigLoading(true);
      const { data, error } = await supabase
        .from('site_config')
        .select(
          'sidebar_fundo, sidebar_item_fundo, sidebar_idioma_ativo_fundo, footer_fundo, footer_instagram_ativo, footer_instagram_url, footer_telegram_ativo, footer_telegram_url, footer_whatsapp_ativo, footer_whatsapp_url, header_fundo, login_modal_imagem_url, register_modal_imagem_url, deposit_modal_imagem_url, brand_cor_primaria, brand_cor_hover',
        )
        .eq('id', 1)
        .maybeSingle();

      if (error) {
        showToast('Erro ao carregar cores do site. Execute deploy/supabase_nova_casa.sql no Supabase.', 'error');
        return;
      }

      if (data) {
        setSidebarBackground({
          fundo: String(data.sidebar_fundo || defaultSidebarBackground.fundo),
          item_fundo: String(data.sidebar_item_fundo || defaultSidebarBackground.item_fundo),
          idioma_ativo_fundo: String(data.sidebar_idioma_ativo_fundo || defaultSidebarBackground.idioma_ativo_fundo),
        });
        setFooterConfig({
          fundo: String(data.footer_fundo || defaultFooterSiteConfig.fundo),
          instagram_ativo: data.footer_instagram_ativo ?? defaultFooterSiteConfig.instagram_ativo,
          instagram_url: String(data.footer_instagram_url || defaultFooterSiteConfig.instagram_url),
          telegram_ativo: data.footer_telegram_ativo ?? defaultFooterSiteConfig.telegram_ativo,
          telegram_url: String(data.footer_telegram_url || defaultFooterSiteConfig.telegram_url),
          whatsapp_ativo: data.footer_whatsapp_ativo ?? defaultFooterSiteConfig.whatsapp_ativo,
          whatsapp_url: String(data.footer_whatsapp_url || ''),
        });
        setHeaderBackground({
          fundo: String(data.header_fundo || defaultHeaderBackground.fundo),
        });
        setAuthModalsImages({
          login_imagem_url: String(data.login_modal_imagem_url || defaultAuthModalsImages.login_imagem_url),
          register_imagem_url: String(data.register_modal_imagem_url || defaultAuthModalsImages.register_imagem_url),
          deposit_imagem_url: String(data.deposit_modal_imagem_url || ''),
        });
        const resolved = resolveBrandColors(
          data.brand_cor_primaria ? String(data.brand_cor_primaria) : null,
          data.brand_cor_hover ? String(data.brand_cor_hover) : null,
        );
        setBrandColors({
          primary: resolved.primary,
          hover: resolved.hover,
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

  const saveFooterConfig = async () => {
    const socialFields: Array<{ label: string; ativo: boolean; url: string }> = [
      { label: 'Instagram', ativo: footerConfig.instagram_ativo, url: footerConfig.instagram_url },
      { label: 'Telegram', ativo: footerConfig.telegram_ativo, url: footerConfig.telegram_url },
      { label: 'WhatsApp', ativo: footerConfig.whatsapp_ativo, url: footerConfig.whatsapp_url },
    ];

    for (const social of socialFields) {
      if (social.ativo && !social.url.trim()) {
        showToast(`Informe a URL do ${social.label} ou desative o ícone.`, 'error');
        return;
      }
    }

    setFooterSaving(true);
    try {
      const { error: upsertError } = await supabase.from('site_config').upsert({
        id: 1,
        footer_fundo: footerConfig.fundo.trim(),
        footer_instagram_ativo: footerConfig.instagram_ativo,
        footer_instagram_url: footerConfig.instagram_url.trim(),
        footer_telegram_ativo: footerConfig.telegram_ativo,
        footer_telegram_url: footerConfig.telegram_url.trim(),
        footer_whatsapp_ativo: footerConfig.whatsapp_ativo,
        footer_whatsapp_url: footerConfig.whatsapp_url.trim(),
        updated_at: new Date().toISOString(),
      });
      if (upsertError) {
        showToast('Erro ao salvar configurações do footer.', 'error');
        return;
      }
      showToast('Configurações do footer salvas!', 'success');
      setConfigModal(null);
    } catch {
      showToast('Erro ao salvar configurações do footer.', 'error');
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
        deposit_modal_imagem_url: authModalsImages.deposit_imagem_url.trim() || null,
        updated_at: new Date().toISOString(),
      });
      if (upsertError) {
        showToast('Erro ao salvar imagens dos modais. Execute deploy/supabase_nova_casa.sql no Supabase.', 'error');
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

  const saveBrandColors = async () => {
    setBrandSaving(true);
    try {
      const resolved = resolveBrandColors(brandColors.primary, brandColors.hover);
      const { error: upsertError } = await supabase.from('site_config').upsert({
        id: 1,
        brand_cor_primaria: resolved.primary,
        brand_cor_hover: resolved.hover,
        updated_at: new Date().toISOString(),
      });
      if (upsertError) {
        showToast('Erro ao salvar cores de destaque. Execute deploy/supabase_nova_casa.sql no Supabase.', 'error');
        return;
      }
      setBrandColors({ primary: resolved.primary, hover: resolved.hover });
      showToast('Cores de destaque salvas!', 'success');
      setConfigModal(null);
    } catch {
      showToast('Erro ao salvar cores de destaque.', 'error');
    } finally {
      setBrandSaving(false);
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
                  description="Cor de fundo e redes sociais do rodapé."
                  onConfigure={() => setConfigModal('footer')}
                >
                  <div className="space-y-2">
                    <ColorSwatch color={footerConfig.fundo} label="Fundo" />
                    <p className="text-gray-500 text-xs">
                      Redes ativas:{' '}
                      {[
                        footerConfig.instagram_ativo ? 'Instagram' : null,
                        footerConfig.telegram_ativo ? 'Telegram' : null,
                        footerConfig.whatsapp_ativo ? 'WhatsApp' : null,
                      ]
                        .filter(Boolean)
                        .join(', ') || 'Nenhuma'}
                    </p>
                  </div>
                </ConfigSummaryCard>

                <ConfigSummaryCard
                  icon={Palette}
                  title="Cor de destaque"
                  description="Botões Depositar, bordas, links e elementos roxos do site."
                  onConfigure={() => setConfigModal('brand')}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <ColorSwatch color={brandColors.primary} label="Principal" />
                    <ColorSwatch color={brandColors.hover} label="Hover" />
                  </div>
                </ConfigSummaryCard>

                <ConfigSummaryCard
                  icon={ImageIcon}
                  title="Modais"
                  description="Imagens dos modais de login, cadastro e depósito."
                  onConfigure={() => setConfigModal('auth')}
                >
                  <div className="flex gap-3 flex-wrap">
                    <AuthThumb url={authModalsImages.login_imagem_url} label="Login" />
                    <AuthThumb url={authModalsImages.register_imagem_url} label="Cadastro" />
                    <AuthThumb
                      url={authModalsImages.deposit_imagem_url || authModalsImages.login_imagem_url}
                      label="Depósito"
                    />
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
        title="Footer"
        description="Cor de fundo e links de redes sociais exibidos no rodapé do site."
        icon={PanelBottom}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfigModal(null)} disabled={footerSaving}>
              Cancelar
            </Button>
            <Button onClick={saveFooterConfig} loading={footerSaving}>
              Salvar footer
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <ColorField
            label="Fundo do footer"
            value={footerConfig.fundo}
            onChange={(v) => setFooterConfig({ ...footerConfig, fundo: v })}
          />
          <div>
            <p className="text-gray-400 text-xs mb-2">Pré-visualização da cor</p>
            <div
              className="w-full h-16 rounded-lg border border-white/10"
              style={{ backgroundColor: footerConfig.fundo }}
            />
          </div>

          <div className="border-t border-admin-border pt-4 space-y-4">
            <p className="text-white text-sm font-semibold">Redes sociais</p>
            <FooterSocialField
              label="Instagram"
              ativo={footerConfig.instagram_ativo}
              url={footerConfig.instagram_url}
              placeholder="https://instagram.com/sua_bet"
              onChangeAtivo={(ativo) => setFooterConfig({ ...footerConfig, instagram_ativo: ativo })}
              onChangeUrl={(url) => setFooterConfig({ ...footerConfig, instagram_url: url })}
            />
            <FooterSocialField
              label="Telegram"
              ativo={footerConfig.telegram_ativo}
              url={footerConfig.telegram_url}
              placeholder="https://t.me/sua_bet"
              onChangeAtivo={(ativo) => setFooterConfig({ ...footerConfig, telegram_ativo: ativo })}
              onChangeUrl={(url) => setFooterConfig({ ...footerConfig, telegram_url: url })}
            />
            <FooterSocialField
              label="WhatsApp"
              ativo={footerConfig.whatsapp_ativo}
              url={footerConfig.whatsapp_url}
              placeholder="https://wa.me/5511999999999 ou 5511999999999"
              onChangeAtivo={(ativo) => setFooterConfig({ ...footerConfig, whatsapp_ativo: ativo })}
              onChangeUrl={(url) => setFooterConfig({ ...footerConfig, whatsapp_url: url })}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={configModal === 'brand'}
        onClose={() => setConfigModal(null)}
        title="Cor de destaque da marca"
        description="Usada em botões (Depositar, JOGAR), bordas de inputs, links e destaques visuais."
        icon={Palette}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfigModal(null)} disabled={brandSaving}>
              Cancelar
            </Button>
            <Button onClick={saveBrandColors} loading={brandSaving}>
              Salvar cores
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ColorField
              label="Cor principal"
              value={brandColors.primary}
              onChange={(v) => setBrandColors({ ...brandColors, primary: v })}
            />
            <ColorField
              label="Cor hover"
              value={brandColors.hover}
              onChange={(v) => setBrandColors({ ...brandColors, hover: v })}
            />
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-2">Pré-visualização</p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                className="h-10 px-5 rounded-lg text-white font-bold text-sm"
                style={{ backgroundColor: brandColors.primary }}
              >
                Depositar
              </button>
              <button
                type="button"
                className="h-10 px-5 rounded-lg text-white font-bold text-sm"
                style={{ backgroundColor: brandColors.hover }}
              >
                Hover
              </button>
              <span
                className="h-10 px-4 rounded-lg border-2 flex items-center text-sm text-gray-300"
                style={{ borderColor: brandColors.primary }}
              >
                Borda
              </span>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={configModal === 'auth'}
        onClose={() => setConfigModal(null)}
        title="Imagens dos modais"
        description="Imagens exibidas no topo dos modais de login, cadastro e depósito."
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
            <ImageSizeHint spec={ADMIN_IMAGE_SIZES.loginModal} />
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
            <ImageSizeHint spec={ADMIN_IMAGE_SIZES.registerModal} />
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
          <div>
            <label className="block text-gray-200 text-sm font-medium mb-1">Imagem do modal de Depósito</label>
            <ImageSizeHint spec={ADMIN_IMAGE_SIZES.depositModal} />
            <input
              type="url"
              value={authModalsImages.deposit_imagem_url}
              onChange={(e) =>
                setAuthModalsImages({ ...authModalsImages, deposit_imagem_url: e.target.value })
              }
              className="w-full px-4 py-2.5 text-white text-sm rounded-lg bg-admin-panel border border-admin-border focus:outline-none focus:ring-2 focus:ring-admin-accent/30"
              placeholder="https://exemplo.com/deposito.png"
            />
            {authModalsImages.deposit_imagem_url.trim() ? (
              <div className="mt-3 p-3 rounded-lg border border-white/10 bg-black/20">
                <img
                  src={authModalsImages.deposit_imagem_url}
                  alt="Prévia depósito"
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

function FooterSocialField({
  label,
  ativo,
  url,
  placeholder,
  onChangeAtivo,
  onChangeUrl,
}: {
  label: string;
  ativo: boolean;
  url: string;
  placeholder: string;
  onChangeAtivo: (ativo: boolean) => void;
  onChangeUrl: (url: string) => void;
}) {
  return (
    <div className="rounded-lg border border-admin-border bg-admin-panel p-4 space-y-3">
      <label className="flex items-center justify-between gap-3">
        <span className="text-gray-200 text-sm font-medium">{label}</span>
        <span className="flex items-center gap-2 text-xs text-gray-400">
          <input
            type="checkbox"
            checked={ativo}
            onChange={(e) => onChangeAtivo(e.target.checked)}
            className="rounded border-admin-border bg-admin-panel-2 text-admin-accent focus:ring-admin-accent/30"
          />
          Exibir no footer
        </span>
      </label>
      <input
        type="url"
        value={url}
        onChange={(e) => onChangeUrl(e.target.value)}
        disabled={!ativo}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 text-white text-sm rounded-lg bg-admin-panel-2 border border-admin-border focus:outline-none focus:ring-2 focus:ring-admin-accent/30 disabled:opacity-50"
      />
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
