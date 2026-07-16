import { useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import { navigateToGameByName } from '../utils/navigateToGameByName';
import {
  getStoredSidebarLanguage,
  SIDEBAR_LANGUAGES,
  storeSidebarLanguage,
  type SidebarLanguage,
} from '../i18n/sidebar';
import {
  getSidebarCardLabels,
  getSidebarCardTitle,
  useSidebarPromoCards,
  type SidebarPromoCard as SidebarPromoCardConfig,
} from '../hooks/useSidebarPromoCards';
import { getSidebarMenuLabel, useSidebarMenu, type SidebarMenuItem } from '../hooks/useSidebarMenu';
import { useSidebarConfig } from '../hooks/useSidebarConfig';
import IconifyIcon from './IconifyIcon';
import {
  getSidebarMenuItemHref,
  MENU_ICON_COLOR,
  SidebarMenuItemIcon,
} from './SidebarMenuParts';

const SIDEBAR_WIDTH_EXPANDED_PX = 279;
const SIDEBAR_WIDTH_COLLAPSED_PX = 64;
export { SIDEBAR_WIDTH_EXPANDED_PX, SIDEBAR_WIDTH_COLLAPSED_PX };
const SIDEBAR_PROMO_CARD_WIDTH_PX = 239;
const SIDEBAR_PROMO_CARD_HEIGHT_PX = 50;

interface SidebarProps {
  isOpen: boolean;
  onCloseMobileDrawer?: () => void;
}

function SidebarSectionHeader({
  title,
  isExpanded,
  onToggle,
}: {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between px-3 py-2 rounded-lg"
      aria-expanded={isExpanded}
    >
      <p className="text-xs font-bold text-white tracking-wider" style={{ fontFamily: 'Montserrat, sans-serif' }}>
        {title}
      </p>
      <span
        className={`inline-flex shrink-0 text-slate-300 transition-transform duration-300 ease-in-out ${
          isExpanded ? 'rotate-0' : '-rotate-90'
        }`}
      >
        <IconifyIcon icon="iconamoon:arrow-down-2-bold" style={{ fontSize: '21px' }} />
      </span>
    </button>
  );
}

function SidebarSectionBody({
  isExpanded,
  children,
}: {
  isExpanded: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
        isExpanded ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
      style={{ gridTemplateRows: isExpanded ? '1fr' : '0fr' }}
    >
      <div className="overflow-hidden min-h-0">{children}</div>
    </div>
  );
}

function SidebarPromoCard({
  href,
  onClick,
  backgroundColor,
  bloomColor,
  outerGlow,
  textClassName = 'text-white',
  collapsed = false,
  title,
  children,
}: {
  href: string;
  onClick?: () => void;
  backgroundColor: string;
  bloomColor: string;
  outerGlow: string;
  textClassName?: string;
  collapsed?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      title={title}
      className={`relative isolate mx-auto ${textClassName} font-bold transition-all duration-200 hover:scale-[1.02] flex items-center overflow-hidden shrink-0 hover:no-underline ${
        collapsed
          ? 'w-10 h-10 justify-center rounded-lg'
          : 'rounded-md justify-between px-4'
      }`}
      style={{
        width: collapsed ? undefined : SIDEBAR_PROMO_CARD_WIDTH_PX,
        height: collapsed ? undefined : SIDEBAR_PROMO_CARD_HEIGHT_PX,
        backgroundColor,
        boxShadow: `0 0 14px ${outerGlow}, 0 0 28px ${outerGlow}, inset 0 1px 0 rgba(255, 255, 255, 0.14)`,
      }}
    >
      <div className="sidebar-promo-bloom-layer" aria-hidden="true">
        <span className="sidebar-promo-bloom sidebar-promo-bloom-1" style={{ backgroundColor: bloomColor }} />
        <span className="sidebar-promo-bloom sidebar-promo-bloom-2" style={{ backgroundColor: bloomColor }} />
        <span className="sidebar-promo-bloom sidebar-promo-bloom-3" style={{ backgroundColor: bloomColor }} />
      </div>
      <span
        className={`relative z-10 flex w-full items-center ${
          collapsed ? 'justify-center' : 'justify-between'
        }`}
      >
        {children}
      </span>
    </a>
  );
}

function SidebarPromoCardIcon({
  card,
  expanded = true,
}: {
  card: SidebarPromoCardConfig;
  expanded?: boolean;
}) {
  if (card.icon_type === 'none' || !card.icon_value) return null;

  if (card.icon_type === 'emoji') {
    return <span className={expanded ? 'text-xl' : 'text-lg'}>{card.icon_value}</span>;
  }

  if (card.icon_type === 'image') {
    return (
      <img
        src={card.icon_value}
        alt={card.icon_alt || card.nome_admin}
        className={`w-7 h-7 ${expanded ? '' : 'transition-opacity duration-200 hover:opacity-100 opacity-80'}`}
      />
    );
  }

  return (
    <span
      className={`iconify ${expanded ? '' : 'transition-opacity duration-200 hover:opacity-100 opacity-80'}`}
      data-icon={card.icon_value}
      aria-hidden="true"
      style={{
        fontSize: expanded ? '24px' : '23px',
        color: card.text_theme === 'dark' ? '#000000' : 'white',
      }}
    />
  );
}

function SidebarPromoCardContent({
  card,
  language,
}: {
  card: SidebarPromoCardConfig;
  language: SidebarLanguage;
}) {
  const labels = getSidebarCardLabels(card, language);
  const textColor = card.text_theme === 'dark' ? '#000000' : undefined;

  if (card.layout === 'double') {
    return (
      <span className="flex flex-col items-start">
        <div className="text-xs font-normal" style={textColor ? { color: textColor } : undefined}>
          {labels.line1}
        </div>
        {labels.line2 ? (
          <div className="text-sm font-black" style={textColor ? { color: textColor } : undefined}>
            {labels.line2}
          </div>
        ) : null}
      </span>
    );
  }

  return (
    <div
      className="text-sm font-black whitespace-nowrap"
      style={{ fontFamily: 'Montserrat, sans-serif', color: textColor }}
    >
      {labels.line1}
    </div>
  );
}

// Componente para ícones SVG customizados removido — menu usa CMS (iconify/imagem)

export default function Sidebar({ isOpen, onCloseMobileDrawer }: SidebarProps) {
  const [language, setLanguage] = useState<SidebarLanguage>(getStoredSidebarLanguage);
  const [sectionsExpanded, setSectionsExpanded] = useState<Record<string, boolean>>({});
  const { cards: promoCards } = useSidebarPromoCards();
  const { config: sidebarConfig } = useSidebarConfig();
  const {
    menuCategories,
    languageCategory,
    itemsByCategory,
    collapsedMenuItems,
  } = useSidebarMenu();

  const navigate = useNavigate();

  useEffect(() => {
    setSectionsExpanded((prev) => {
      const next = { ...prev };
      for (const category of menuCategories) {
        if (!(category.slug in next)) next[category.slug] = true;
      }
      if (languageCategory && !(languageCategory.slug in next)) {
        next[languageCategory.slug] = true;
      }
      return next;
    });
  }, [menuCategories, languageCategory]);

  const handleLanguageSelect = (lang: SidebarLanguage) => {
    setLanguage(lang);
    storeSidebarLanguage(lang);
  };

  const toggleSection = (sectionSlug: string) => {
    setSectionsExpanded((prev) => ({ ...prev, [sectionSlug]: !prev[sectionSlug] }));
  };

  const closeMobileDrawerIfNeeded = useCallback(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
      onCloseMobileDrawer?.();
    }
  }, [onCloseMobileDrawer]);

  const handleGameClick = useCallback(
    async (gameName: string, e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      const ok = await navigateToGameByName(gameName, navigate);
      if (ok) closeMobileDrawerIfNeeded();
    },
    [navigate, closeMobileDrawerIfNeeded],
  );

  const handleMenuItemClick = useCallback(
    async (item: SidebarMenuItem, e: React.MouseEvent<HTMLAnchorElement>) => {
      if (item.link_tipo === 'game' && item.game_name) {
        await handleGameClick(item.game_name, e);
        return;
      }

      if (item.link_tipo === 'external' && item.action_value) {
        e.preventDefault();
        window.open(item.action_value, '_blank', 'noopener,noreferrer');
        closeMobileDrawerIfNeeded();
        return;
      }

      if (item.link_tipo === 'event' && item.action_value) {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent(item.action_value));
        closeMobileDrawerIfNeeded();
      }
    },
    [handleGameClick, closeMobileDrawerIfNeeded],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if ((window as Window & { Iconify?: { scan: () => void } }).Iconify) {
        (window as Window & { Iconify?: { scan: () => void } }).Iconify?.scan();
      }
    }, isOpen ? 50 : 0);
    return () => window.clearTimeout(timer);
  }, [isOpen, language, sectionsExpanded, menuCategories, itemsByCategory]);

  return (
    <>
      {isOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-[40] bg-black/60 md:hidden"
          aria-label="Fechar menu"
          onClick={() => onCloseMobileDrawer?.()}
        />
      ) : null}
      <aside
        data-shell-sidebar
        className={`fixed md:relative inset-y-0 left-0 z-[50] md:z-50 border-r border-white/15 h-full flex-shrink-0 flex flex-col transition-[width,transform] duration-300 ease-in-out max-md:shadow-2xl ${
          isOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'
        }`}
        style={{
          backgroundColor: sidebarConfig.fundo,
          width: isOpen ? SIDEBAR_WIDTH_EXPANDED_PX : SIDEBAR_WIDTH_COLLAPSED_PX,
        }}
      >
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
      <div className={`flex flex-col h-full ${isOpen ? '' : 'hidden'}`}>
          <div className="px-3 pt-8 pb-8 border-b border-white/10">
            <div className="space-y-2">
              {promoCards.map((card) => (
                <SidebarPromoCard
                  key={card.id}
                  href={card.href}
                  onClick={closeMobileDrawerIfNeeded}
                  backgroundColor={card.background_color}
                  bloomColor={card.bloom_color}
                  outerGlow={card.outer_glow}
                  textClassName={card.text_theme === 'dark' ? 'text-slate-900' : 'text-white'}
                >
                  <SidebarPromoCardContent card={card} language={language} />
                  <SidebarPromoCardIcon card={card} expanded />
                </SidebarPromoCard>
              ))}
            </div>
          </div>

          {menuCategories.map((category, index) => (
            <nav
              key={category.id}
              className={`flex flex-col py-2 px-3 ${
                index === 0 ? 'border-b border-t border-white/10' : 'border-t border-white/10'
              }`}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('a')) closeMobileDrawerIfNeeded();
              }}
            >
              <SidebarSectionHeader
                title={getSidebarMenuLabel(category.labels, language)}
                isExpanded={sectionsExpanded[category.slug] ?? true}
                onToggle={() => toggleSection(category.slug)}
              />
              <SidebarSectionBody isExpanded={sectionsExpanded[category.slug] ?? true}>
                {(itemsByCategory[category.slug] || []).map((item) => (
                  <a
                    key={item.id}
                    href={getSidebarMenuItemHref(item)}
                    onClick={(e) => void handleMenuItemClick(item, e)}
                    className="relative flex items-center gap-3 h-10 px-3 rounded-lg hover:no-underline transition-all duration-200 group"
                  >
                    <SidebarMenuItemIcon item={item} language={language} />
                    <p
                      className={`text-sm transition-opacity duration-200 opacity-60 group-hover:opacity-100 ${
                        item.destaque ? 'font-bold' : 'font-medium'
                      }`}
                      style={{ fontFamily: 'Montserrat, sans-serif', color: MENU_ICON_COLOR }}
                    >
                      {getSidebarMenuLabel(item.labels, language)}
                    </p>
                  </a>
                ))}
              </SidebarSectionBody>
            </nav>
          ))}

          {languageCategory ? (
            <nav
              className="flex flex-col border-t border-white/10 py-2 px-3"
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('button')) closeMobileDrawerIfNeeded();
              }}
            >
              <SidebarSectionHeader
                title={getSidebarMenuLabel(languageCategory.labels, language)}
                isExpanded={sectionsExpanded[languageCategory.slug] ?? true}
                onToggle={() => toggleSection(languageCategory.slug)}
              />
              <SidebarSectionBody isExpanded={sectionsExpanded[languageCategory.slug] ?? true}>
                {SIDEBAR_LANGUAGES.map((item) => {
                  const isActive = language === item.code;
                  return (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => handleLanguageSelect(item.code)}
                      className={`relative flex w-full items-center gap-3 h-10 px-3 rounded-lg transition-all duration-200 group text-left ${
                        isActive ? 'bg-violet-600/15' : ''
                      }`}
                    >
                      {item.flag ? (
                        <span
                          className={`iconify transition-opacity duration-200 ${
                            isActive ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'
                          }`}
                          data-icon={item.flag}
                          aria-hidden="true"
                          style={{ fontSize: '20px' }}
                        />
                      ) : null}
                      <p
                        className={`text-sm font-medium transition-opacity duration-200 ${
                          isActive ? 'opacity-100 text-white' : 'opacity-60 group-hover:opacity-100'
                        }`}
                        style={{
                          fontFamily: 'Montserrat, sans-serif',
                          color: isActive ? '#fff' : MENU_ICON_COLOR,
                        }}
                      >
                        {item.name}
                      </p>
                    </button>
                  );
                })}
              </SidebarSectionBody>
            </nav>
          ) : null}
        </div>

      <div className={`flex flex-col items-center py-4 gap-4 ${isOpen ? 'hidden' : ''}`}>
          {promoCards.map((card) => (
            <SidebarPromoCard
              key={card.id}
              href={card.href}
              onClick={closeMobileDrawerIfNeeded}
              backgroundColor={card.background_color}
              bloomColor={card.bloom_color}
              outerGlow={card.outer_glow}
              textClassName={card.text_theme === 'dark' ? 'text-slate-900' : 'text-white'}
              collapsed
              title={getSidebarCardTitle(card, language)}
            >
              <SidebarPromoCardIcon card={card} expanded={false} />
            </SidebarPromoCard>
          ))}

          <div className="w-8 border-t border-slate-400/40" />

          {menuCategories.map((category, categoryIndex) => (
            <div key={category.id} className="flex flex-col items-center gap-4">
              {(itemsByCategory[category.slug] || []).map((item) => (
                <a
                  key={item.id}
                  href={getSidebarMenuItemHref(item)}
                  title={getSidebarMenuLabel(item.labels, language)}
                  onClick={(e) => void handleMenuItemClick(item, e)}
                  className="group flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-200 hover:no-underline"
                  style={{ color: 'rgba(220, 221, 222, 0.6)', backgroundColor: 'transparent' }}
                >
                  <SidebarMenuItemIcon item={item} language={language} collapsed />
                </a>
              ))}
              {categoryIndex < menuCategories.length - 1 ? (
                <div className="w-8 border-t border-slate-400/40" />
              ) : null}
            </div>
          ))}

          {languageCategory ? (
            <>
              <div className="w-8 border-t border-slate-400/40" />
              {SIDEBAR_LANGUAGES.map((item) => {
                const isActive = language === item.code;
                return (
                  <button
                    key={item.code}
                    type="button"
                    className={`group flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-200 ${
                      isActive ? 'ring-2 ring-violet-500/60' : ''
                    }`}
                    style={{
                      color: 'rgba(220, 221, 222, 0.6)',
                      backgroundColor: isActive ? sidebarConfig.idioma_ativo_fundo : sidebarConfig.item_fundo,
                    }}
                    title={item.name}
                    onClick={() => handleLanguageSelect(item.code)}
                  >
                    {item.flag ? (
                      <span
                        className={`iconify transition-opacity duration-200 ${
                          isActive ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'
                        }`}
                        data-icon={item.flag}
                        aria-hidden="true"
                        style={{ fontSize: '20px' }}
                      />
                    ) : null}
                  </button>
                );
              })}
            </>
          ) : null}
        </div>
      </div>
    </aside>
    </>
  );
}
