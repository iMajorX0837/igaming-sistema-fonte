import { useState, useEffect, useMemo } from 'react';
import { Gamepad2, Grid3x3 } from 'lucide-react';
import Footer from './Footer';
import AppPageScaffold from './AppPageScaffold';
import BackButton from './BackButton';
import SearchInput from './SearchInput';
import FilterDropdown from './FilterDropdown';
import { GameInfo } from '../App';
import { useHomeConfig } from '../hooks/useHomeConfig';
import { useSiteBrand } from '../hooks/useSiteBrand';
import { getOriginaisLabel } from '../lib/siteBrand';

interface OriginalsPageProps {
  onBack: () => void;
  onGameSelect: (game: GameInfo) => void;
}

const originalGameDefs = [
  { name: 'Crash', image: 'https://i.ibb.co/8n08ZyVs/Chat-GPT-Image-3-de-nov-de-2025-20-44-01.png', category: 'crash' },
  { name: 'Double', image: 'https://i.ibb.co/fzksfGFj/Chat-GPT-Image-3-de-nov-de-2025-20-44-08.png', category: 'slots' },
  { name: 'Mines', image: 'https://i.ibb.co/8gGgt9GJ/Chat-GPT-Image-3-de-nov-de-2025-20-44-14.png', category: 'crash' },
];

const baseProviders = [
  { id: 'all', count: 3 },
  { id: 'venuzbet', count: 3 },
  { id: 'pgsoft', name: 'PG Soft', count: 0 },
  { id: 'pragmatic', name: 'Pragmatic Play', count: 0 },
  { id: 'pragmaticlive', name: 'Pragmatic Live', count: 0 },
  { id: 'netent', name: 'NetEnt', count: 0 },
  { id: 'evolution', name: 'Evolution Gaming', count: 0 },
  { id: 'redtiger', name: 'Red Tiger', count: 0 },
  { id: 'playson', name: 'Playson', count: 0 },
  { id: 'habanero', name: 'Habanero', count: 0 },
  { id: 'spribe', name: 'Spribe', count: 0 },
  { id: 'evoplay', name: 'Evoplay', count: 0 },
  { id: 'bgaming', name: 'BGaming', count: 0 },
  { id: 'ezugi', name: 'Ezugi', count: 0 },
  { id: 'cgames', name: 'C Games', count: 0 },
];

const categories = [
  { id: 'all', name: 'Todos' },
  { id: 'crash', name: 'Crash Games' },
  { id: 'slots', name: 'Slots' },
];

export default function OriginalsPage({ onBack, onGameSelect: _onGameSelect }: OriginalsPageProps) {
  const { config: homeConfig } = useHomeConfig();
  const { nomeBet } = useSiteBrand();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const gamesPerPage = 18;

  const originalGames = useMemo(
    () => originalGameDefs.map((game) => ({ ...game, provider: nomeBet })),
    [nomeBet],
  );

  const providers = useMemo(
    () =>
      baseProviders.map((provider) => {
        if (provider.id === 'all') return { ...provider, name: 'Todos' };
        if (provider.id === 'venuzbet') return { ...provider, name: nomeBet };
        return { id: provider.id, name: provider.name!, count: provider.count };
      }),
    [nomeBet],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedProvider, selectedCategory]);

  const filteredGames = originalGames.filter((game) => {
    const matchesSearch =
      game.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      game.provider.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesProvider = true;
    if (selectedProvider !== 'all') {
      const selectedProviderObj = providers.find((p) => p.id === selectedProvider);
      if (selectedProviderObj) {
        const gameProviderNormalized = game.provider.replace(/\s+/g, '').toUpperCase();
        const selectedProviderNormalized = selectedProviderObj.name.replace(/\s+/g, '').toUpperCase();
        matchesProvider =
          gameProviderNormalized === selectedProviderNormalized ||
          gameProviderNormalized.includes(selectedProviderNormalized) ||
          selectedProviderNormalized.includes(gameProviderNormalized);
      }
    }

    const matchesCategory = selectedCategory === 'all' || game.category === selectedCategory;

    return matchesSearch && matchesProvider && matchesCategory;
  });

  const totalPages = Math.ceil(filteredGames.length / gamesPerPage);
  const visibleCount = currentPage * gamesPerPage;
  const currentGames = filteredGames.slice(0, visibleCount);
  const hasMoreGames = currentGames.length < filteredGames.length;

  const selectedProviderName = providers.find((p) => p.id === selectedProvider)?.name || 'Todos';
  const selectedCategoryName = categories.find((c) => c.id === selectedCategory)?.name || 'Todos';

  return (
    <AppPageScaffold>
      <div className="flex flex-col min-h-full" style={{ backgroundColor: homeConfig.fundo }}>
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4 mb-6 min-h-[40px] min-w-0">
            <BackButton
              compact
              onClick={() => {
                if (selectedProvider !== 'all') {
                  setSelectedProvider('all');
                } else {
                  onBack();
                }
              }}
            />
            <h1 className="flex items-center flex-nowrap min-w-0 text-white text-2xl font-bold">
              <span className="whitespace-nowrap shrink-0">{getOriginaisLabel(nomeBet)}</span>
              <span
                className={`text-violet-400 whitespace-nowrap overflow-hidden transition-all duration-300 ease-out ${
                  selectedProvider !== 'all' ? 'max-w-[500px] opacity-100' : 'max-w-0 opacity-0'
                }`}
              >
                {` - ${selectedProviderName}`}
              </span>
            </h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_220px_220px] gap-4 mb-6 w-full items-center">
            <SearchInput value={searchTerm} onChange={setSearchTerm} />
            <FilterDropdown
              icon={Gamepad2}
              items={providers.map((provider) => ({ id: provider.id, label: provider.name }))}
              onSelect={setSelectedProvider}
              selectedLabel={selectedProviderName}
            />
            <FilterDropdown
              icon={Grid3x3}
              items={categories.map((category) => ({ id: category.id, label: category.name }))}
              onSelect={setSelectedCategory}
              selectedLabel={selectedCategoryName}
            />
          </div>

          <div className="min-h-[360px]">
            {currentGames.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mb-8 transition-opacity duration-200 ease-in-out">
                {currentGames.map((game, index) => (
                  <div
                    key={index}
                    className="relative group overflow-hidden rounded-lg shadow-lg border-2 border-violet-600/30 hover:border-violet-600/60 transition-all duration-200"
                  >
                    <div className="aspect-[3/4] relative">
                      <img
                        src={game.image}
                        alt={game.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                        <button
                          type="button"
                          className="font-bold text-xs px-3 py-1.5 rounded border flex items-center gap-1 hover:brightness-110 transition-all"
                          style={{ backgroundColor: '#7B3FF2', borderColor: '#9B5FF2', color: '#000000' }}
                        >
                          <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                          JOGAR
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center min-h-[360px]">
                <p className="text-slate-400 text-lg">Não possui jogos ativos.</p>
              </div>
            )}
          </div>

          {hasMoreGames && (
            <div className="flex flex-col items-center gap-4 mb-8">
              <p className="text-slate-400 text-sm">
                Mostrando {currentGames.length} de {filteredGames.length} jogos
              </p>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold text-sm transition-all duration-200 shadow-lg"
              >
                Carregar mais
              </button>
            </div>
          )}

          <div className="min-h-[20vh]" />
        </div>

        <Footer />
      </div>
    </AppPageScaffold>
  );
}
