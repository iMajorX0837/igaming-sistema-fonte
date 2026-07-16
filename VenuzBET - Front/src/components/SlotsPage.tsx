import { useState, useEffect, useCallback } from 'react';
import { Gamepad2, Grid3x3 } from 'lucide-react';
import LoadingScreen from './LoadingScreen';
import { useNavigate } from 'react-router-dom';
import Footer from './Footer';
import AppPageScaffold from './AppPageScaffold';
import BackButton from './BackButton';
import SearchInput from './SearchInput';
import FilterDropdown from './FilterDropdown';
import { GameInfo } from '../App';
import { fetchGamesForProviderCached } from '../api/playfiversCache';
import { useHomeConfig } from '../hooks/useHomeConfig';
import { appPageContainerClass } from '../constants/homeLayout';

interface SlotsPageProps {
  onGameSelect: (game: GameInfo) => void;
}

interface ApiGame {
  name: string;
  image_url: string;
  rounds_free?: boolean;
  status: boolean;
  original?: boolean;
  game_code: string;
  provider: {
    name: string;
  };
}

interface ApiResponse {
  status: number;
  data: ApiGame[];
  msg: string;
}

interface Game {
  name: string;
  provider: string;
  image: string;
  category: string;
  game_code: string;
}

const providers = [
  { id: 'all', name: 'Todos', count: 1447, apiId: null },
  { id: 'venuzbet', name: 'RoyalBet Originais', count: 3, apiId: null },
  { id: 'pgsoft', name: 'PG Soft', count: 147, apiId: 1 },
  { id: 'pragmatic', name: 'Pragmatic Play', count: 312, apiId: null },
  { id: 'pragmaticlive', name: 'Pragmatic Live', count: 69, apiId: null },
  { id: 'netent', name: 'NetEnt', count: 156, apiId: null },
  { id: 'evolution', name: 'Evolution Gaming', count: 139, apiId: null },
  { id: 'redtiger', name: 'Red Tiger', count: 298, apiId: null },
  { id: 'playson', name: 'Playson', count: 8, apiId: null },
  { id: 'habanero', name: 'Habanero', count: 108, apiId: null },
  { id: 'spribe', name: 'Spribe', count: 9, apiId: null },
  { id: 'evoplay', name: 'Evoplay', count: 49, apiId: null },
  { id: 'bgaming', name: 'BGaming', count: 1, apiId: null },
  { id: 'ezugi', name: 'Ezugi', count: 87, apiId: null },
  { id: 'cgames', name: 'C Games', count: 10, apiId: null },
];

// Mapeamento de nomes de providers da API para categorias
const getCategoryFromProvider = (providerName: string, gameName?: string): string => {
  const providerLower = providerName.toLowerCase();
  const gameNameLower = gameName?.toLowerCase() || '';
  
  // Crash games
  if (providerLower.includes('spribe') || 
      gameNameLower.includes('aviator') || 
      gameNameLower.includes('mines') ||
      gameNameLower.includes('space man') ||
      gameNameLower.includes('crash')) {
    return 'crash';
  }
  
  // Live casino
  if (providerLower.includes('evolution') || 
      providerLower.includes('pragmatic live') ||
      providerLower.includes('ezugi')) {
    return 'live';
  }
  
  // Table games
  if (gameNameLower.includes('blackjack') || 
      gameNameLower.includes('roulette') ||
      gameNameLower.includes('baccarat') ||
      gameNameLower.includes('poker')) {
    return 'table';
  }
  
  // Por padrão, a maioria dos jogos são slots
  return 'slots';
};

const categories = [
  { id: 'all', name: 'Todos' },
  { id: 'slots', name: 'Slots' },
  { id: 'live', name: 'Cassino Ao Vivo' },
  { id: 'table', name: 'Jogos de Mesa' },
  { id: 'crash', name: 'Crash Games' },
];

// Função para criar slug de URL (normalizar para URL-friendly)
const createSlug = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]+/g, '-') // Substitui caracteres não alfanuméricos por hífen
    .replace(/^-+|-+$/g, ''); // Remove hífens do início e fim
};

// Função para obter o slug do provider baseado no nome
const getProviderSlug = (providerName: string): string => {
  // Mapear nomes conhecidos para slugs
  const providerMap: { [key: string]: string } = {
    'PG Soft': 'pgsoft',
    'Pragmatic Play': 'pragmatic',
    'Pragmatic Live': 'pragmaticlive',
    'NetEnt': 'netent',
    'Evolution Gaming': 'evolution',
    'Red Tiger': 'redtiger',
    'Playson': 'playson',
    'Habanero': 'habanero',
    'Spribe': 'spribe',
    'Evoplay': 'evoplay',
    'BGaming': 'bgaming',
    'Ezugi': 'ezugi',
    'C Games': 'cgames',
  };
  
  return providerMap[providerName] || createSlug(providerName);
};

export default function SlotsPage({ onGameSelect: _onGameSelect }: SlotsPageProps) {
  const navigate = useNavigate();
  const { config: homeConfig } = useHomeConfig();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('slots');
  const [currentPage, setCurrentPage] = useState(1);
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const gamesPerPage = 18;

  const fetchAllGames = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const providersWithApiId = providers.filter((p) => p.apiId !== null);
      const allGamesData: Game[] = [];

      for (const prov of providersWithApiId) {
        try {
          const apiData: ApiResponse = await fetchGamesForProviderCached(prov.apiId!);

          if (apiData.status === 1 && apiData.data) {
            const mappedGames: Game[] = apiData.data
              .filter((game) => game.status === true)
              .map((game) => ({
                name: game.name,
                provider: game.provider.name,
                image: game.image_url,
                category: getCategoryFromProvider(game.provider.name, game.name),
                game_code: game.game_code,
              }))
              .filter((game) => game.category === 'slots');

            allGamesData.push(...mappedGames);
          }
        } catch (err) {
          console.error(`Erro ao buscar jogos do provider ${prov.name}:`, err);
        }
      }

      setAllGames(allGamesData);
    } catch (err) {
      console.error('Erro ao buscar jogos:', err);
      setError('Erro ao carregar jogos. Tente novamente.');
      setAllGames([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAllGames();
  }, [fetchAllGames]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedProvider, selectedCategory]);

  const filteredGames = allGames.filter(game => {
    const matchesSearch = game.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         game.provider.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Normalizar comparação de provider
    let matchesProvider = true;
    if (selectedProvider !== 'all') {
      const selectedProviderObj = providers.find(p => p.id === selectedProvider);
      if (selectedProviderObj) {
        // Normalizar nomes para comparação (remover espaços, converter para maiúsculas)
        const gameProviderNormalized = game.provider.replace(/\s+/g, '').toUpperCase();
        const selectedProviderNormalized = selectedProviderObj.name.replace(/\s+/g, '').toUpperCase();
        
        // Comparar diretamente ou verificar se contém
        matchesProvider = gameProviderNormalized === selectedProviderNormalized ||
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

  const selectedProviderName = providers.find(p => p.id === selectedProvider)?.name || 'Todos';
  const selectedCategoryName = categories.find(c => c.id === selectedCategory)?.name || 'Todos';

  return (
    <AppPageScaffold>
      <div className={`flex flex-col min-h-full ${appPageContainerClass}`} style={{ backgroundColor: homeConfig.fundo }}>
          <div className="flex-1 py-4 sm:py-6">
            <div className="flex items-center gap-4 mb-6 min-h-[40px] min-w-0">
              <div
                className={`transition-all duration-300 ease-out overflow-hidden shrink-0 ${
                  selectedProvider !== 'all' ? 'max-w-[120px] opacity-100' : 'max-w-0 opacity-0'
                }`}
              >
                <BackButton compact onClick={() => setSelectedProvider('all')} />
              </div>
              <h1 className="flex items-center flex-nowrap min-w-0 text-white text-2xl font-bold">
                <span className="whitespace-nowrap shrink-0">Jogos de slots</span>
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
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
              />
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

            {isLoading && allGames.length === 0 && (
              <LoadingScreen title="Carregando jogos..." variant="page" />
            )}

            {error && !isLoading && allGames.length === 0 && (
              <div className="py-20 text-center">
                <p className="text-red-400 text-lg mb-4">{error}</p>
                <button
                  onClick={() => fetchAllGames()}
                  className="px-6 py-3 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold text-sm transition-all duration-200"
                >
                  Tentar novamente
                </button>
              </div>
            )}

            {!isLoading && !error && (
              <div className="min-h-[360px]">
                {currentGames.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mb-8 transition-opacity duration-200 ease-in-out">
                    {currentGames.map((game, index) => {
                      const providerSlug = getProviderSlug(game.provider);
                      const gameSlug = createSlug(game.name);
                      const gameUrl = `/${providerSlug}/${gameSlug}`;

                      return (
                        <button
                          key={`${game.name}-${index}`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            sessionStorage.setItem('previousPath', window.location.pathname);
                            sessionStorage.setItem('gameData', JSON.stringify({
                              name: game.name,
                              provider: game.provider,
                              image: game.image,
                              game_code: game.game_code
                            }));
                            navigate(gameUrl);
                          }}
                          className="group relative overflow-hidden rounded-lg bg-slate-800/30 hover:bg-slate-700/50 transition-all duration-200 shadow-lg"
                        >
                          <div className="aspect-[3/4] relative">
                            <img
                              src={game.image}
                              alt={game.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x400/1e293b/64748b?text=Game';
                              }}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                              <button
                                type="button"
                                className="font-bold text-xs px-3 py-1.5 rounded border flex items-center gap-1 hover:brightness-110 transition-all"
                                style={{ backgroundColor: '#7B3FF2', borderColor: '#9B5FF2', color: '#000000' }}
                              >
                                <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor">
                                  <path d="M8 5v14l11-7z"/>
                                </svg>
                                JOGAR
                              </button>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center justify-center min-h-[360px]">
                    <p className="text-slate-400 text-lg">Não possui jogos ativos.</p>
                  </div>
                )}
              </div>
            )}

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

          <Footer containerClassName="w-full" />
      </div>
    </AppPageScaffold>
  );
}
