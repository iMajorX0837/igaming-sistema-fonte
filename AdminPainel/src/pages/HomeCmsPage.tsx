import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import PagePanel from '../components/ui/PagePanel';
import { Home, Image, Zap, Star, LayoutGrid } from 'lucide-react';
import BannersPage from './BannersPage';
import HomeQuickNavPage from './HomeQuickNavPage';
import RecommendedBannersPage from './RecommendedBannersPage';
import HomeSectionsPage from './HomeSectionsPage';

type HomeTab = 'carrossel' | 'atalhos' | 'recomendados' | 'secoes';

const TABS: { key: HomeTab; label: string; icon: typeof Image; description: string }[] = [
  {
    key: 'carrossel',
    label: 'Carrossel',
    icon: Image,
    description: 'Banners do slider principal no topo da home.',
  },
  {
    key: 'atalhos',
    label: 'Atalhos',
    icon: Zap,
    description: 'Cards de acesso rápido exibidos abaixo do carrossel.',
  },
  {
    key: 'recomendados',
    label: 'Recomendados',
    icon: Star,
    description: 'Banners da seção Recomendados na home.',
  },
  {
    key: 'secoes',
    label: 'Seções & Cor',
    icon: LayoutGrid,
    description: 'Ordem das seções e cor de fundo da página inicial.',
  },
];

const VALID_TABS = new Set<string>(TABS.map((t) => t.key));

function parseTab(value: string | null): HomeTab {
  if (value && VALID_TABS.has(value)) return value as HomeTab;
  return 'carrossel';
}

export default function HomeCmsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = useMemo(() => parseTab(searchParams.get('tab')), [searchParams]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && !VALID_TABS.has(tab)) {
      setSearchParams({ tab: 'carrossel' }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const setActiveTab = (tab: HomeTab) => {
    setSearchParams({ tab }, { replace: true });
  };

  const activeMeta = TABS.find((t) => t.key === activeTab)!;

  return (
    <div>
      <PageHeader
        icon={Home}
        title="Página Inicial"
        description="Gerencie todo o conteúdo visual da home: carrossel, atalhos, recomendados e estrutura das seções."
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
          <p className="text-gray-400 text-sm mb-5">{activeMeta.description}</p>

          {activeTab === 'carrossel' && <BannersPage embedded />}
          {activeTab === 'atalhos' && <HomeQuickNavPage embedded />}
          {activeTab === 'recomendados' && <RecommendedBannersPage embedded />}
          {activeTab === 'secoes' && <HomeSectionsPage embedded />}
        </div>
      </PagePanel>
    </div>
  );
}
