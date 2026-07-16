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
import {
  PanelLeft,
  Palette,
  LayoutTemplate,
  Image as ImageIcon,
  PanelBottom,
  Monitor,
  Plus,
  Pencil,
  Trash2,
  Power,
  FolderTree,
  Settings2,
} from 'lucide-react';
import SidebarMenuAdmin from './sidebar/SidebarMenuAdmin';

type TextTheme = 'light' | 'dark';
type CardLayout = 'single' | 'double';
type IconType = 'emoji' | 'image' | 'iconify' | 'none';
type TabKey = 'aparencia' | 'menu' | 'cards';
type ConfigModal = 'sidebar' | 'header' | 'footer' | 'auth' | null;

interface CardLabelSet {
  line1: string;
  line2: string;
}

interface CardLabels {
  pt: CardLabelSet;
  en: CardLabelSet;
  es: CardLabelSet;
}

interface SidebarPromoCardRow {
  id: string;
  nome_admin: string;
  href: string;
  ordem: number;
  ativo: boolean;
  background_color: string;
  bloom_color: string;
  outer_glow: string;
  text_theme: TextTheme;
  layout: CardLayout;
  icon_type: IconType;
  icon_value: string | null;
  icon_alt: string | null;
  labels: CardLabels;
}

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
  logo_url: string;
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
  logo_url: '/assets/logo.png',
};

const defaultAuthModalsImages: AuthModalsImagesConfig = {
  login_imagem_url: DEFAULT_AUTH_MODAL_IMAGE,
  register_imagem_url: DEFAULT_AUTH_MODAL_IMAGE,
};

const LABEL_PLACEHOLDERS: Record<'pt' | 'en' | 'es', { line1: string; line2: string }> = {
  pt: { line1: 'Indique um amigo e', line2: 'GANHE R$ 15 GRÁTIS' },
  en: { line1: 'Refer a friend and', line2: 'GET R$ 15 FREE' },
  es: { line1: 'Invita a un amigo y', line2: 'GANA R$ 15 GRÁTIS' },
};

const TABS: { key: TabKey; label: string; icon: typeof Palette; description: string }[] = [
  { key: 'aparencia', label: 'Aparência', icon: Palette, description: 'Cores, logo e imagens do site' },
  { key: 'menu', label: 'Menu', icon: FolderTree, description: 'Categorias e itens da sidebar' },
  { key: 'cards', label: 'Cards', icon: LayoutTemplate, description: 'Cards promocionais do topo' },
];

const emptyLabels = (): CardLabels => ({
  pt: { line1: '', line2: '' },
  en: { line1: '', line2: '' },
  es: { line1: '', line2: '' },
});

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.replace('#', '').trim();
  if (normalized.length === 3) {
    return {
      r: parseInt(normalized[0] + normalized[0], 16),
      g: parseInt(normalized[1] + normalized[1], 16),
      b: parseInt(normalized[2] + normalized[2], 16),
    };
  }
  if (normalized.length === 6) {
    return {
      r: parseInt(normalized.slice(0, 2), 16),
      g: parseInt(normalized.slice(2, 4), 16),
      b: parseInt(normalized.slice(4, 6), 16),
    };
  }
  return null;
}

function outerGlowFromBloomColor(bloomColor: string, opacity = 0.48): string {
  const rgb = hexToRgb(bloomColor);
  if (!rgb || Number.isNaN(rgb.r) || Number.isNaN(rgb.g) || Number.isNaN(rgb.b)) {
    return `rgba(192, 132, 252, ${opacity})`;
  }
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
}

const emptyForm = {
  nome_admin: '',
  href: '/help/',
  ordem: 1,
  ativo: true,
  background_color: '#6212A5',
  bloom_color: '#C084FC',
  outer_glow: outerGlowFromBloomColor('#C084FC'),
  text_theme: 'light' as TextTheme,
  layout: 'single' as CardLayout,
  icon_type: 'none' as IconType,
  icon_value: '',
  icon_alt: '',
  labels: emptyLabels(),
};

function normalizeLabels(raw: unknown): CardLabels {
  const fallback = emptyLabels();
  if (!raw || typeof raw !== 'object') return fallback;
  const data = raw as Partial<Record<'pt' | 'en' | 'es', Partial<CardLabelSet>>>;
  const pick = (lang: 'pt' | 'en' | 'es'): CardLabelSet => ({
    line1: data[lang]?.line1 || '',
    line2: data[lang]?.line2 || '',
  });
  return { pt: pick('pt'), en: pick('en'), es: pick('es') };
}

function rowToForm(card: SidebarPromoCardRow) {
  return {
    nome_admin: card.nome_admin,
    href: card.href,
    ordem: card.ordem,
    ativo: card.ativo,
    background_color: card.background_color,
    bloom_color: card.bloom_color,
    outer_glow: outerGlowFromBloomColor(card.bloom_color),
    text_theme: card.text_theme,
    layout: card.layout,
    icon_type: card.icon_type,
    icon_value: card.icon_value || '',
    icon_alt: card.icon_alt || '',
    labels: card.labels,
  };
}

const CMS_SECAO = 'sidebar_card';

function buildPayload(form: typeof emptyForm) {
  return {
    secao: CMS_SECAO,
    nome_admin: form.nome_admin.trim(),
    href: form.href.trim(),
    ordem: form.ordem,
    ativo: form.ativo,
    background_color: form.background_color.trim(),
    bloom_color: form.bloom_color.trim(),
    outer_glow: outerGlowFromBloomColor(form.bloom_color.trim()),
    text_theme: form.text_theme,
    layout: form.layout,
    icon_type: form.icon_type,
    icon_value: form.icon_type === 'none' ? null : form.icon_value.trim() || null,
    icon_alt: form.icon_alt.trim() || null,
    labels: {
      pt: {
        line1: form.labels.pt.line1.trim(),
        line2: form.layout === 'double' ? form.labels.pt.line2.trim() || null : null,
      },
      en: {
        line1: form.labels.en.line1.trim(),
        line2: form.layout === 'double' ? form.labels.en.line2.trim() || null : null,
      },
      es: {
        line1: form.labels.es.line1.trim(),
        line2: form.layout === 'double' ? form.labels.es.line2.trim() || null : null,
      },
    },
    updated_at: new Date().toISOString(),
  };
}

function validateForm(form: typeof emptyForm, showToast: (msg: string, type: 'error' | 'success') => void) {
  if (!form.nome_admin.trim()) {
    showToast('Informe o nome interno do card.', 'error');
    return false;
  }
  if (!form.href.trim()) {
    showToast('Informe a rota do card.', 'error');
    return false;
  }
  if (!form.labels.pt.line1.trim()) {
    showToast('Informe o texto em português (linha 1).', 'error');
    return false;
  }
  if (form.layout === 'double' && !form.labels.pt.line2.trim()) {
    showToast('Informe a linha 2 em português para layout duplo.', 'error');
    return false;
  }
  if (form.icon_type !== 'none' && !form.icon_value.trim()) {
    showToast('Informe o valor do ícone.', 'error');
    return false;
  }
  return true;
}

export default function SidebarCardsPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>('aparencia');
  const [cards, setCards] = useState<SidebarPromoCardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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
          'sidebar_fundo, sidebar_item_fundo, sidebar_idioma_ativo_fundo, footer_fundo, header_fundo, header_logo_url, login_modal_imagem_url, register_modal_imagem_url',
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
          logo_url: String(data.header_logo_url || defaultHeaderBackground.logo_url),
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

  const saveSidebarBackground = async () => {
    setConfigSaving(true);
    try {
      const payload = {
        id: 1,
        sidebar_fundo: sidebarBackground.fundo.trim(),
        sidebar_item_fundo: sidebarBackground.item_fundo.trim(),
        sidebar_idioma_ativo_fundo: sidebarBackground.idioma_ativo_fundo.trim(),
        updated_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabase.from('site_config').upsert(payload);
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
      const payload = {
        id: 1,
        footer_fundo: footerBackground.fundo.trim(),
        updated_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabase.from('site_config').upsert(payload);
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
    if (!headerBackground.logo_url.trim()) {
      showToast('Informe a URL da logo.', 'error');
      return;
    }

    setHeaderSaving(true);
    try {
      const payload = {
        id: 1,
        header_fundo: headerBackground.fundo.trim(),
        header_logo_url: headerBackground.logo_url.trim(),
        updated_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabase.from('site_config').upsert(payload);
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
      const payload = {
        id: 1,
        login_modal_imagem_url: authModalsImages.login_imagem_url.trim(),
        register_modal_imagem_url: authModalsImages.register_imagem_url.trim(),
        updated_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabase.from('site_config').upsert(payload);
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

  const loadCards = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('cms_items')
        .select('*')
        .eq('secao', CMS_SECAO)
        .order('ordem', { ascending: true });

      if (fetchError) {
        setError('Erro ao carregar cards. Execute cms_items.sql no Supabase.');
        return;
      }

      setCards(
        ((data || []) as Record<string, unknown>[]).map((row) => ({
          id: String(row.id),
          nome_admin: String(row.nome_admin || ''),
          href: String(row.href || ''),
          ordem: Number(row.ordem) || 0,
          ativo: Boolean(row.ativo),
          background_color: String(row.background_color || '#6212A5'),
          bloom_color: String(row.bloom_color || '#C084FC'),
          outer_glow: String(row.outer_glow || 'rgba(98, 18, 165, 0.48)'),
          text_theme: row.text_theme === 'dark' ? 'dark' : 'light',
          layout: row.layout === 'double' ? 'double' : 'single',
          icon_type:
            row.icon_type === 'emoji' || row.icon_type === 'image' || row.icon_type === 'iconify'
              ? row.icon_type
              : 'none',
          icon_value: row.icon_value ? String(row.icon_value) : null,
          icon_alt: row.icon_alt ? String(row.icon_alt) : null,
          labels: normalizeLabels(row.labels),
        }))
      );
    } catch {
      setError('Erro ao carregar cards da sidebar.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSiteColors();
    void loadCards();
  }, []);

  const startEdit = (card: SidebarPromoCardRow) => {
    setIsCreating(false);
    setDeletingId(null);
    setEditingId(card.id);
    setEditForm(rowToForm(card));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(emptyForm);
  };

  const startCreate = () => {
    setEditingId(null);
    setDeletingId(null);
    setIsCreating(true);
    const nextOrder = cards.length > 0 ? Math.max(...cards.map((c) => c.ordem)) + 1 : 1;
    setCreateForm({ ...emptyForm, ordem: nextOrder });
  };

  const cancelCreate = () => {
    setIsCreating(false);
    setCreateForm(emptyForm);
  };

  const saveEdit = async () => {
    if (!editingId || !validateForm(editForm, showToast)) return;
    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('cms_items')
        .update(buildPayload(editForm))
        .eq('id', editingId)
        .eq('secao', CMS_SECAO);

      if (updateError) {
        showToast('Erro ao salvar card.', 'error');
        return;
      }

      showToast('Card atualizado!', 'success');
      cancelEdit();
      await loadCards();
    } catch {
      showToast('Erro ao salvar card.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveCreate = async () => {
    if (!validateForm(createForm, showToast)) return;
    setSaving(true);
    try {
      const { error: insertError } = await supabase.from('cms_items').insert(buildPayload(createForm));
      if (insertError) {
        showToast('Erro ao criar card.', 'error');
        return;
      }

      showToast('Card criado!', 'success');
      cancelCreate();
      await loadCards();
    } catch {
      showToast('Erro ao criar card.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const removeCard = async () => {
    if (!deletingId) return;
    setSaving(true);
    try {
      const { error: deleteError } = await supabase
        .from('cms_items')
        .delete()
        .eq('id', deletingId)
        .eq('secao', CMS_SECAO);
      if (deleteError) {
        showToast('Erro ao excluir card.', 'error');
        return;
      }
      showToast('Card excluído.', 'success');
      setDeletingId(null);
      await loadCards();
    } catch {
      showToast('Erro ao excluir card.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleAtivo = async (card: SidebarPromoCardRow) => {
    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('cms_items')
        .update({ ativo: !card.ativo, updated_at: new Date().toISOString() })
        .eq('id', card.id)
        .eq('secao', CMS_SECAO);

      if (updateError) {
        showToast('Erro ao alterar status.', 'error');
        return;
      }

      showToast(card.ativo ? 'Card desativado.' : 'Card ativado.', 'success');
      await loadCards();
    } catch {
      showToast('Erro ao alterar status.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCardsReorder = async (reordered: SidebarPromoCardRow[]) => {
    const withOrder = applySequentialOrder(reordered);
    setCards(withOrder);
    try {
      await persistTableOrder(
        'cms_items',
        withOrder.map((card) => card.id),
      );
      showToast('Ordem dos cards atualizada!', 'success');
    } catch {
      showToast('Erro ao salvar ordem dos cards.', 'error');
      await loadCards();
    }
  };

  const cardToDelete = cards.find((c) => c.id === deletingId);

  return (
    <div>
      <PageHeader
        icon={PanelLeft}
        title="Sidebar & Layout"
        description="Organize a aparência do site, o menu da sidebar e os cards promocionais."
        actions={
          activeTab === 'cards' ? (
            <Button icon={Plus} onClick={startCreate} disabled={isCreating || saving}>
              Novo card
            </Button>
          ) : undefined
        }
      />

      <PagePanel padding={false} className="overflow-hidden">
        <div className="flex border-b border-admin-border overflow-x-auto px-4 gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
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
          {activeTab !== 'menu' && (
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
                  description="Logo e cor de fundo do topo do site."
                  onConfigure={() => setConfigModal('header')}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ColorSwatch color={headerBackground.fundo} label="Fundo" />
                    <div className="min-w-0 flex-1">
                      <p className="text-gray-500 text-[11px] uppercase tracking-wide mb-1">Logo</p>
                      <p className="text-gray-300 text-xs truncate">{headerBackground.logo_url}</p>
                    </div>
                  </div>
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

          {activeTab === 'cards' &&
            (loading ? (
              <LoadingState inline message="Carregando cards..." />
            ) : error ? (
              <p className="text-admin-danger">{error}</p>
            ) : cards.length === 0 ? (
              <EmptyState
                icon={LayoutTemplate}
                title="Nenhum card cadastrado."
                description="Clique em Novo card para começar."
              />
            ) : (
              <SortableOrderList
                items={cards}
                onReorder={handleCardsReorder}
                disabled={editingId !== null || isCreating || saving || deletingId !== null}
                className="space-y-3"
                renderItem={(card) => (
                  <div className="rounded-xl border border-admin-border bg-admin-panel-2/50 p-4">
                    <div className="flex flex-col lg:flex-row gap-4 items-start">
                      <CardPreview form={rowToForm(card)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="text-white font-semibold">{card.nome_admin}</h3>
                          <StatusBadge variant={card.ativo ? 'success' : 'neutral'}>
                            {card.ativo ? 'Ativo' : 'Inativo'}
                          </StatusBadge>
                          <span className="text-gray-500 text-xs">Ordem {card.ordem}</span>
                          <span className="text-gray-500 text-xs">
                            {card.layout === 'double' ? '2 linhas' : '1 linha'}
                          </span>
                        </div>
                        <p className="text-gray-400 text-xs mb-1">Rota: {card.href}</p>
                        <p className="text-gray-500 text-xs">
                          {card.layout === 'double' && card.labels.pt.line2 ? (
                            <span className="flex flex-col leading-tight">
                              <span>{card.labels.pt.line1}</span>
                              <span className="font-semibold text-gray-400">{card.labels.pt.line2}</span>
                            </span>
                          ) : (
                            card.labels.pt.line1
                          )}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 lg:flex-col lg:items-stretch shrink-0">
                        <Button
                          variant="secondary"
                          icon={Pencil}
                          onClick={() => startEdit(card)}
                          disabled={saving}
                          className="!px-3 !py-1.5 !text-xs"
                        >
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          icon={Power}
                          onClick={() => toggleAtivo(card)}
                          disabled={saving}
                          className="!px-3 !py-1.5 !text-xs"
                        >
                          {card.ativo ? 'Desativar' : 'Ativar'}
                        </Button>
                        <Button
                          variant="danger"
                          icon={Trash2}
                          onClick={() => setDeletingId(card.id)}
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
            ))}
        </div>
      </PagePanel>

      {/* Config modals — Aparência */}
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
        title="Configurações do Header"
        description="Logo e cor de fundo do topo, abas inativas e menu da conta."
        icon={Monitor}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfigModal(null)} disabled={headerSaving}>
              Cancelar
            </Button>
            <Button onClick={saveHeaderBackground} loading={headerSaving}>
              Salvar header
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <label className="block text-gray-200 text-sm font-medium mb-1">URL da Logo</label>
            <p className="text-gray-500 text-xs mb-2">
              Exibida no header, footer e modais. URL completa ou caminho relativo (ex: /assets/logo.png).
            </p>
            <input
              type="url"
              value={headerBackground.logo_url}
              onChange={(e) => setHeaderBackground({ ...headerBackground, logo_url: e.target.value })}
              className="w-full px-4 py-2.5 text-white text-sm rounded-lg bg-admin-panel border border-admin-border focus:outline-none focus:ring-2 focus:ring-admin-accent/30"
              placeholder="https://exemplo.com/logo.png"
            />
          </div>
          <ColorField
            label="Fundo do header"
            value={headerBackground.fundo}
            onChange={(v) => setHeaderBackground({ ...headerBackground, fundo: v })}
          />
          {headerBackground.logo_url.trim() ? (
            <div>
              <p className="text-gray-400 text-xs mb-2">Pré-visualização</p>
              <div
                className="p-4 rounded-lg border border-white/10"
                style={{ backgroundColor: headerBackground.fundo }}
              >
                <img
                  src={headerBackground.logo_url}
                  alt="Prévia da logo"
                  className="h-12 w-auto max-w-[220px] object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            </div>
          ) : null}
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

      {/* Card create / edit / delete */}
      <Modal
        open={isCreating}
        onClose={cancelCreate}
        title="Novo card da sidebar"
        description="Configure um card promocional do topo da sidebar."
        icon={PanelLeft}
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={cancelCreate} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={saveCreate} loading={saving}>
              Criar card
            </Button>
          </>
        }
      >
        <CardEditor form={createForm} setForm={setCreateForm} saving={saving} />
      </Modal>

      <Modal
        open={editingId !== null}
        onClose={cancelEdit}
        title={editForm.nome_admin ? `Editar: ${editForm.nome_admin}` : 'Editar card'}
        description="Atualize o conteúdo, cores e textos do card promocional."
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
        <CardEditor form={editForm} setForm={setEditForm} saving={saving} />
      </Modal>

      <Modal
        open={deletingId !== null}
        onClose={() => setDeletingId(null)}
        title="Excluir card"
        description="Esta ação não pode ser desfeita."
        icon={Trash2}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeletingId(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={removeCard} loading={saving}>
              Excluir
            </Button>
          </>
        }
      >
        <p className="text-gray-300 text-sm">
          Deseja excluir o card{' '}
          <span className="text-white font-medium">{cardToDelete?.nome_admin || 'selecionado'}</span> da
          sidebar?
        </p>
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

function CardPreview({ form }: { form: typeof emptyForm }) {
  const textClass = form.text_theme === 'dark' ? 'text-slate-900' : 'text-white';
  const outerGlow = outerGlowFromBloomColor(form.bloom_color);
  return (
    <div
      className={`relative isolate rounded-md ${textClass} font-bold flex items-center justify-between px-4 overflow-hidden shrink-0`}
      style={{
        width: 239,
        height: 50,
        backgroundColor: form.background_color,
        boxShadow: `0 0 14px ${outerGlow}, 0 0 28px ${outerGlow}`,
      }}
    >
      <div className="absolute inset-0 pointer-events-none opacity-70" aria-hidden="true">
        <span
          className="absolute -left-4 top-1/2 h-14 w-20 -translate-y-1/2 rounded-full blur-2xl"
          style={{ backgroundColor: form.bloom_color }}
        />
        <span
          className="absolute -right-4 -top-3 h-16 w-20 rounded-full blur-3xl"
          style={{ backgroundColor: form.bloom_color }}
        />
      </div>
      <span className="relative z-10 flex flex-col items-start leading-tight">
        <span className={`${form.layout === 'double' ? 'text-[10px] font-normal' : 'text-xs font-black'}`}>
          {form.labels.pt.line1 || 'Linha 1'}
        </span>
        {form.layout === 'double' && (
          <span className="text-xs font-black">{form.labels.pt.line2 || 'Linha 2'}</span>
        )}
      </span>
      <span className="relative z-10">
        {form.icon_type === 'emoji' && <span className="text-lg">{form.icon_value || '✨'}</span>}
        {form.icon_type === 'image' && form.icon_value && (
          <img src={form.icon_value} alt="" className="w-6 h-6 object-contain" />
        )}
        {form.icon_type === 'iconify' && form.icon_value && (
          <span className="iconify" data-icon={form.icon_value} style={{ fontSize: '20px' }} />
        )}
      </span>
    </div>
  );
}

function CardEditor({
  form,
  setForm,
  saving,
}: {
  form: typeof emptyForm;
  setForm: React.Dispatch<React.SetStateAction<typeof emptyForm>>;
  saving: boolean;
}) {
  const updateLabel = (lang: 'pt' | 'en' | 'es', field: 'line1' | 'line2', value: string) => {
    setForm((prev) => ({
      ...prev,
      labels: {
        ...prev.labels,
        [lang]: { ...prev.labels[lang], [field]: value },
      },
    }));
  };

  return (
    <div className={saving ? 'opacity-70 pointer-events-none' : ''}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SectionLabel className="md:col-span-2">Identificação</SectionLabel>
        <Field label="Nome interno (admin)" value={form.nome_admin} onChange={(v) => setForm({ ...form, nome_admin: v })} />
        <Field label="Rota (href)" value={form.href} onChange={(v) => setForm({ ...form, href: v })} placeholder="/help/mobile" />
        <Field label="Ordem" type="number" value={String(form.ordem)} onChange={(v) => setForm({ ...form, ordem: Number(v) })} />
        <SelectField
          label="Layout"
          value={form.layout}
          onChange={(v) => setForm({ ...form, layout: v as CardLayout })}
          options={[
            { value: 'single', label: 'Uma linha' },
            { value: 'double', label: 'Duas linhas' },
          ]}
        />
        {form.layout === 'double' && (
          <p className="md:col-span-2 text-gray-500 text-xs -mt-2">
            Linha 1 fica em cima (texto menor). Linha 2 fica embaixo em destaque (negrito).
          </p>
        )}

        <SectionLabel className="md:col-span-2 mt-2">Aparência</SectionLabel>
        <ColorField label="Cor de fundo" value={form.background_color} onChange={(v) => setForm({ ...form, background_color: v })} />
        <ColorField
          label="Cor do bloom"
          value={form.bloom_color}
          onChange={(v) =>
            setForm((prev) => ({
              ...prev,
              bloom_color: v,
              outer_glow: outerGlowFromBloomColor(v),
            }))
          }
        />
        <div className="md:col-span-2">
          <p className="text-gray-300 text-sm mb-1">Outer glow</p>
          <p className="text-gray-500 text-xs px-3 py-2 rounded bg-admin-panel border border-admin-border-strong">
            Gerado automaticamente: {outerGlowFromBloomColor(form.bloom_color)}
          </p>
        </div>
        <SelectField
          label="Tema do texto"
          value={form.text_theme}
          onChange={(v) => setForm({ ...form, text_theme: v as TextTheme })}
          options={[
            { value: 'light', label: 'Claro (branco)' },
            { value: 'dark', label: 'Escuro (preto)' },
          ]}
        />
        <SelectField
          label="Tipo de ícone"
          value={form.icon_type}
          onChange={(v) => setForm({ ...form, icon_type: v as IconType })}
          options={[
            { value: 'none', label: 'Nenhum' },
            { value: 'emoji', label: 'Emoji' },
            { value: 'image', label: 'Imagem (URL)' },
            { value: 'iconify', label: 'Iconify' },
          ]}
        />
        {form.icon_type !== 'none' && (
          <Field
            label={form.icon_type === 'emoji' ? 'Emoji' : form.icon_type === 'iconify' ? 'Ícone Iconify' : 'URL da imagem'}
            value={form.icon_value}
            onChange={(v) => setForm({ ...form, icon_value: v })}
            className="md:col-span-2"
            placeholder={form.icon_type === 'iconify' ? 'ph:headset-duotone' : form.icon_type === 'emoji' ? '🎁' : 'https://...'}
          />
        )}
        {form.icon_type === 'image' && (
          <Field label="Alt da imagem" value={form.icon_alt} onChange={(v) => setForm({ ...form, icon_alt: v })} />
        )}
        <div className="md:col-span-2 flex items-center gap-2">
          <input
            id="card-ativo"
            type="checkbox"
            checked={form.ativo}
            onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
            className="rounded"
          />
          <label htmlFor="card-ativo" className="text-gray-300 text-sm">
            Ativo
          </label>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <SectionLabel>Textos por idioma</SectionLabel>
        {(['pt', 'en', 'es'] as const).map((lang) => (
          <div key={lang} className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-lg bg-admin-panel border border-admin-border">
            <p className="md:col-span-2 text-gray-400 text-xs uppercase tracking-wide">{lang}</p>
            <Field
              label={form.layout === 'double' ? 'Linha 1 (superior)' : 'Texto'}
              value={form.labels[lang].line1}
              onChange={(v) => updateLabel(lang, 'line1', v)}
              placeholder={LABEL_PLACEHOLDERS[lang].line1}
            />
            {form.layout === 'double' && (
              <Field
                label="Linha 2 (destaque)"
                value={form.labels[lang].line2}
                onChange={(v) => updateLabel(lang, 'line2', v)}
                placeholder={LABEL_PLACEHOLDERS[lang].line2}
              />
            )}
          </div>
        ))}
      </div>

      <div className="mt-4">
        <p className="text-gray-400 text-xs mb-2">Pré-visualização</p>
        <CardPreview form={form} />
      </div>
    </div>
  );
}

function SectionLabel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h4 className={`text-gray-200 text-sm font-medium ${className}`}>{children}</h4>
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

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="text-gray-300 text-sm mb-1 block">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 rounded bg-admin-panel border border-admin-border-strong text-white text-sm"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
