import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  ArrowDownCircle,
  Users,
  ArrowUpCircle,
  Trophy,
  Crown,
  Image,
  Shield,
  CreditCard,
  Settings,
  ScrollText,
  Webhook,
  Crosshair,
  KeyRound,
  PanelLeft,
  Gamepad2,
  Megaphone,
  CircleDot,
  Plane,
  Ticket,
  ChevronDown,
  Home,
  BadgeCheck,
  LogOut,
  LayoutGrid,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAdminSiteBrand } from '../contexts/AdminSiteBrandContext';
import Button from './ui/Button';

interface NavItem {
  path: string;
  icon: LucideIcon;
  label: string;
  matchPrefix?: boolean;
}

interface NavGroup {
  id: string;
  title: string;
  items: NavItem[];
}

const NAV_EXPANDED_STORAGE_KEY = 'admin-nav-expanded-groups';

const dashboardLink: NavItem = {
  path: '/dashboard',
  icon: LayoutDashboard,
  label: 'Dashboard',
};

const navGroups: NavGroup[] = [
  {
    id: 'usuarios',
    title: 'Usuários',
    items: [
      { path: '/usuarios', icon: Users, label: 'Lista de usuários', matchPrefix: true },
      { path: '/vip', icon: Crown, label: 'Níveis VIP' },
    ],
  },
  {
    id: 'financeiro',
    title: 'Financeiro',
    items: [
      { path: '/depositos', icon: ArrowUpCircle, label: 'Depósitos' },
      { path: '/saques', icon: ArrowDownCircle, label: 'Saques' },
      { path: '/apostas', icon: Trophy, label: 'Apostas' },
      { path: '/gateways', icon: CreditCard, label: 'Gateways PIX' },
    ],
  },
  {
    id: 'promocoes',
    title: 'Promoções',
    items: [
      { path: '/cupons', icon: Ticket, label: 'Cupons' },
      { path: '/roleta', icon: CircleDot, label: 'Roleta de prêmios' },
    ],
  },
  {
    id: 'jogos',
    title: 'Jogos',
    items: [
      { path: '/jogos', icon: Gamepad2, label: 'Catálogo' },
      { path: '/aviator-rtp', icon: Plane, label: 'Aviator RTP' },
      { path: '/todos-jogos', icon: LayoutGrid, label: 'Configuração Geral' },
    ],
  },
  {
    id: 'site',
    title: 'Site & CMS',
    items: [
      { path: '/identidade-site', icon: BadgeCheck, label: 'Identidade' },
      { path: '/home-cms', icon: Home, label: 'Página inicial', matchPrefix: true },
      { path: '/sidebar-cards', icon: PanelLeft, label: 'Sidebar & Layout' },
      { path: '/top-banner', icon: Megaphone, label: 'Banner topo' },
      { path: '/promocoes', icon: Image, label: 'Banners promoções' },
    ],
  },
  {
    id: 'sistema',
    title: 'Sistema',
    items: [
      { path: '/administracao', icon: Shield, label: 'Administração' },
      { path: '/seguranca', icon: KeyRound, label: 'Segurança (2FA)' },
      { path: '/webhooks', icon: Webhook, label: 'Webhooks' },
      { path: '/tracking', icon: Crosshair, label: 'Tracking' },
      { path: '/logs', icon: ScrollText, label: 'Logs' },
      { path: '/configuracoes', icon: Settings, label: 'Configurações' },
    ],
  },
];

const defaultExpandedGroups = Object.fromEntries(navGroups.map((group) => [group.id, true]));

function isNavItemActive(pathname: string, item: NavItem) {
  if (item.matchPrefix) {
    return pathname === item.path || pathname.startsWith(`${item.path}/`);
  }
  return pathname === item.path;
}

function loadExpandedGroups(): Record<string, boolean> {
  if (typeof window === 'undefined') return defaultExpandedGroups;
  try {
    const stored = localStorage.getItem(NAV_EXPANDED_STORAGE_KEY);
    if (!stored) return defaultExpandedGroups;
    const parsed = JSON.parse(stored) as Record<string, boolean>;
    return { ...defaultExpandedGroups, ...parsed };
  } catch {
    return defaultExpandedGroups;
  }
}

function resolveCurrentNav(pathname: string): { group: NavGroup | null; item: NavItem } | null {
  if (isNavItemActive(pathname, dashboardLink)) {
    return { group: null, item: dashboardLink };
  }
  for (const group of navGroups) {
    for (const item of group.items) {
      if (isNavItemActive(pathname, item)) {
        return { group, item };
      }
    }
  }
  return null;
}

function NavLinkItem({ item, isActive }: { item: NavItem; isActive: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.path}
      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors duration-150 border ${
        isActive
          ? 'text-admin-foreground bg-admin-accent/10 border-admin-accent/25 shadow-[inset_3px_0_0_0_rgba(231,233,238,0.85)]'
          : 'text-admin-muted hover:bg-admin-panel-2 hover:text-admin-foreground-soft border-transparent'
      }`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-admin-foreground' : 'text-admin-muted'}`} />
      <span className="font-medium text-[13px] leading-snug truncate">{item.label}</span>
    </Link>
  );
}

function userDisplayName(email: string | undefined): string {
  if (!email) return 'Admin';
  const local = email.split('@')[0]?.trim();
  if (!local) return 'Admin';
  return local.replace(/[._-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function userInitial(email: string | undefined): string {
  const name = userDisplayName(email);
  return name.charAt(0).toUpperCase() || 'A';
}

export default function Layout() {
  const { user, logout, requires2FASetup, twoFactorReady } = useAuth();
  const navigate = useNavigate();
  const { logoUrl, nomeBet } = useAdminSiteBrand();
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(loadExpandedGroups);
  const [logoBroken, setLogoBroken] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const showRestrictedNav = twoFactorReady && requires2FASetup;

  useEffect(() => {
    setLogoBroken(false);
  }, [logoUrl]);

  const activeGroupId = useMemo(() => {
    if (isNavItemActive(location.pathname, dashboardLink)) return null;
    const group = navGroups.find((g) =>
      g.items.some((item) => isNavItemActive(location.pathname, item))
    );
    return group?.id ?? null;
  }, [location.pathname]);

  const currentNav = useMemo(() => resolveCurrentNav(location.pathname), [location.pathname]);
  const CurrentIcon = currentNav?.item.icon ?? LayoutDashboard;
  const displayName = userDisplayName(user?.email);
  const initial = userInitial(user?.email);

  const effectiveExpandedGroups = useMemo(() => {
    if (!activeGroupId || expandedGroups[activeGroupId]) {
      return expandedGroups;
    }
    return { ...expandedGroups, [activeGroupId]: true };
  }, [expandedGroups, activeGroupId]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = { ...prev, [groupId]: !prev[groupId] };
      localStorage.setItem(NAV_EXPANDED_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('[Layout] Erro ao fazer logout:', error);
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-admin-bg">
      <header className="fixed top-0 right-0 left-64 z-10 h-14 border-b border-admin-border bg-admin-panel/75 backdrop-blur-xl">
        <div className="h-full px-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-admin-accent/10 border border-admin-accent/20 flex items-center justify-center shrink-0">
              <CurrentIcon className="w-4 h-4 text-admin-foreground" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.14em] text-admin-muted font-semibold truncate leading-none mb-1">
                {currentNav?.group?.title ?? (currentNav ? 'Visão geral' : 'Painel')}
                {currentNav && nomeBet ? (
                  <>
                    <span className="mx-1.5 text-admin-border-strong">·</span>
                    <span className="text-admin-muted-2 normal-case tracking-normal font-medium">{nomeBet}</span>
                  </>
                ) : null}
              </p>
              <h1 className="text-sm font-semibold text-admin-foreground truncate leading-tight">
                {currentNav?.item.label ?? 'Administração'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-2.5 h-9 pl-1.5 pr-3 rounded-full border border-admin-border bg-admin-panel-2/90">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-white/10 to-white/[0.02] border border-admin-border-strong flex items-center justify-center">
                <span className="text-[11px] font-bold text-admin-foreground">{initial}</span>
              </div>
              <div className="text-left min-w-0">
                <p className="text-xs font-medium text-admin-foreground leading-tight max-w-[148px] truncate">
                  {displayName}
                </p>
                <p className="text-[10px] text-admin-muted leading-tight">Administrador</p>
              </div>
            </div>

            <div className="h-6 w-px bg-admin-border hidden sm:block" aria-hidden />

            <Button
              type="button"
              variant="ghost"
              icon={LogOut}
              loading={loggingOut}
              onClick={() => void handleLogout()}
              className="h-9 px-3 text-admin-muted hover:text-admin-foreground"
              title="Sair"
            >
              <span className="hidden md:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      <aside className="fixed left-0 top-0 h-full w-64 z-20 flex flex-col bg-admin-sidebar/97 border-r border-admin-border backdrop-blur-[18px] shadow-admin">
        <div className="h-14 px-5 border-b border-admin-border flex-shrink-0 flex items-center justify-center">
          <Link to="/dashboard" className="block max-w-full">
            {!logoBroken && logoUrl ? (
              <img
                src={logoUrl}
                alt={nomeBet}
                className="h-8 mx-auto transition-opacity duration-200 hover:opacity-90 cursor-pointer object-contain max-w-full"
                onError={() => setLogoBroken(true)}
              />
            ) : (
              <span className="block text-center text-admin-foreground text-sm font-semibold tracking-tight truncate">
                {nomeBet}
              </span>
            )}
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-2.5 pb-4 pt-2 admin-sidebar-scroll">
          {!showRestrictedNav && (
            <div className="mb-3">
              <NavLinkItem
                item={dashboardLink}
                isActive={isNavItemActive(location.pathname, dashboardLink)}
              />
            </div>
          )}

          {showRestrictedNav ? (
            <div className="mt-3 pt-3 border-t border-admin-border/80 px-2">
              <p className="text-[11px] text-admin-warning leading-relaxed">
                Configure o 2FA para liberar o restante do painel.
              </p>
              <div className="mt-2">
                <NavLinkItem
                  item={{ path: '/seguranca', icon: KeyRound, label: 'Segurança (2FA)' }}
                  isActive={location.pathname === '/seguranca'}
                />
              </div>
            </div>
          ) : (
            navGroups.map((group, groupIndex) => {
              const isExpanded = effectiveExpandedGroups[group.id] ?? true;
              const groupActive = group.items.some((item) => isNavItemActive(location.pathname, item));

              return (
                <div
                  key={group.id}
                  className={groupIndex === 0 ? 'pt-1 border-t border-admin-border/80' : 'mt-1 pt-3 border-t border-admin-border/60'}
                >
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className={`w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md transition-colors duration-150 ${
                      groupActive
                        ? 'text-admin-foreground-soft'
                        : 'text-admin-muted hover:text-admin-foreground-soft'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em]">{group.title}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 shrink-0 text-admin-muted ${
                        isExpanded ? 'rotate-0' : '-rotate-90'
                      }`}
                    />
                  </button>

                  {isExpanded && (
                    <div className="mt-1.5 space-y-0.5">
                      {group.items.map((item) => (
                        <NavLinkItem
                          key={item.path}
                          item={item}
                          isActive={isNavItemActive(location.pathname, item)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </nav>
      </aside>

      <main className="pt-[4.25rem] ml-64 p-8 min-h-screen bg-admin-bg">
        <Outlet />
      </main>
    </div>
  );
}
