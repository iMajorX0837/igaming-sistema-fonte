import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  User,
  ArrowDownCircle,
  Users,
  ArrowUpCircle,
  Trophy,
  Crown,
  Image,
  Shield,
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
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAdminSiteBrand } from '../contexts/AdminSiteBrandContext';

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

const navGroups: NavGroup[] = [
  {
    id: 'geral',
    title: 'Geral',
    items: [{ path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' }],
  },
  {
    id: 'usuarios',
    title: 'Usuários',
    items: [
      { path: '/usuarios', icon: Users, label: 'Usuários', matchPrefix: true },
      { path: '/vip', icon: Crown, label: 'VIP Níveis' },
    ],
  },
  {
    id: 'financeiro',
    title: 'Financeiro',
    items: [
      { path: '/depositos', icon: ArrowUpCircle, label: 'Depósitos' },
      { path: '/saques', icon: ArrowDownCircle, label: 'Saques' },
      { path: '/apostas', icon: Trophy, label: 'Apostas' },
    ],
  },
  {
    id: 'promocoes',
    title: 'Promoções',
    items: [{ path: '/cupons', icon: Ticket, label: 'Cupons' }],
  },
  {
    id: 'jogos',
    title: 'Jogos',
    items: [
      { path: '/jogos', icon: Gamepad2, label: 'Catálogo de Jogos' },
      { path: '/aviator-rtp', icon: Plane, label: 'Aviator RTP' },
      { path: '/todos-jogos', icon: Gamepad2, label: 'Config. Todos os Jogos' },
    ],
  },
  {
    id: 'site-layout',
    title: 'Layout do Site',
    items: [
      { path: '/identidade-site', icon: BadgeCheck, label: 'Identidade do Site' },
      { path: '/home-cms', icon: Home, label: 'Página Inicial', matchPrefix: true },
      { path: '/sidebar-cards', icon: PanelLeft, label: 'Sidebar & Layout' },
      { path: '/top-banner', icon: Megaphone, label: 'Banner Topo' },
      { path: '/promocoes', icon: Image, label: 'Banners da Página' },
      { path: '/roleta', icon: CircleDot, label: 'Roleta de Prêmios' },
    ],
  },
  {
    id: 'sistema',
    title: 'Sistema',
    items: [
      { path: '/administracao', icon: Shield, label: 'Administração' },
      { path: '/seguranca', icon: KeyRound, label: 'Segurança' },
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

export default function Layout() {
  const { user } = useAuth();
  const { logoUrl, nomeBet } = useAdminSiteBrand();
  const location = useLocation();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(loadExpandedGroups);
  const [logoBroken, setLogoBroken] = useState(false);

  useEffect(() => {
    setLogoBroken(false);
  }, [logoUrl]);

  const activeGroupId = useMemo(() => {
    const group = navGroups.find((g) =>
      g.items.some((item) => isNavItemActive(location.pathname, item))
    );
    return group?.id ?? null;
  }, [location.pathname]);

  useEffect(() => {
    if (!activeGroupId) return;
    setExpandedGroups((prev) => {
      if (prev[activeGroupId]) return prev;
      const next = { ...prev, [activeGroupId]: true };
      localStorage.setItem(NAV_EXPANDED_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, [activeGroupId]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = { ...prev, [groupId]: !prev[groupId] };
      localStorage.setItem(NAV_EXPANDED_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-admin-bg">
      <header className="fixed top-0 right-0 left-64 h-16 flex items-center justify-end px-6 z-10 bg-admin-bg/90 border-b border-admin-border backdrop-blur-[18px]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-admin-panel-3 border border-admin-border-strong rounded-lg flex items-center justify-center">
            <User className="h-4.5 w-4.5 text-admin-foreground" />
          </div>
          <div className="text-right">
            <p className="text-sm text-admin-foreground font-medium leading-tight">{user?.email?.split('@')[0]}</p>
            <p className="text-xs text-admin-muted leading-tight">Admin</p>
          </div>
        </div>
      </header>

      <aside className="fixed left-0 top-0 h-full w-64 z-20 flex flex-col bg-admin-sidebar/97 border-r border-admin-border backdrop-blur-[18px] shadow-admin">
        <div className="p-6 border-b border-admin-border flex-shrink-0">
          <Link to="/dashboard" className="block">
            {!logoBroken && logoUrl ? (
              <img
                src={logoUrl}
                alt={nomeBet}
                className="h-12 mx-auto transition-transform duration-200 hover:scale-105 cursor-pointer object-contain max-w-full"
                onError={() => setLogoBroken(true)}
              />
            ) : (
              <span className="block text-center text-white text-sm font-semibold">{nomeBet}</span>
            )}
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto mt-3 px-2 pb-6">
          {navGroups.map((group, groupIndex) => {
            const isExpanded = expandedGroups[group.id] ?? true;

            return (
              <div key={group.id} className={groupIndex > 0 ? 'mt-2' : ''}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors duration-150 text-admin-muted-2 hover:bg-admin-panel-2 hover:text-admin-foreground-soft"
                >
                  <span className="text-[11px] font-semibold uppercase tracking-widest">{group.title}</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
                  />
                </button>

                <div
                  className={`overflow-hidden transition-all duration-200 ease-in-out ${
                    isExpanded ? 'max-h-[1200px] opacity-100 mt-1' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="pl-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = isNavItemActive(location.pathname, item);
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={`flex items-center px-3 py-2 mb-0.5 rounded-lg transition-colors duration-150 group relative border ${
                            isActive
                              ? 'text-admin-foreground bg-admin-accent/10 border-admin-accent/20'
                              : 'text-[#9198a3] hover:bg-admin-panel-2 hover:text-admin-foreground border-transparent'
                          }`}
                        >
                          <Icon
                            className={`mr-3 h-4 w-4 flex-shrink-0 ${
                              isActive ? 'text-admin-foreground' : 'text-admin-muted'
                            }`}
                          />
                          <span className="font-medium text-sm">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>
      </aside>

      <main className="pt-20 ml-64 p-8 min-h-screen bg-admin-bg">
        <Outlet />
      </main>
    </div>
  );
}
