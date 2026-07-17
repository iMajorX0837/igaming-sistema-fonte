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
import { fetchProvidersCached, fetchGamesForProviderCached, isPlayFiverEnabledProvider } from '../api/playfiversCache';
import { useAllGamesPageConfig } from '../hooks/useAllGamesPageConfig';
import { useHomeConfig } from '../hooks/useHomeConfig';
import { appPageContainerClass } from '../constants/homeLayout';

interface AllGamesPageProps {
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

interface ApiProvider {
  id: number;
  name: string;
  image_url: string;
  wallet: {
    name: string;
  };
  status: number;
}

interface ApiProvidersResponse {
  status: number;
  data: ApiProvider[];
  msg: string;
}

interface Game {
  name: string;
  provider: string;
  image: string;
  category: string;
  game_code: string;
}

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

// Função para criar slug de URL (normalizar para URL-friendly)
const createSlug = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9]+/g, '-') // Substitui caracteres não alfanuméricos por hífen
    .replace(/^-+|-+$/g, ''); // Remove hífens do início e fim
};

export default function AllGamesPage({ onGameSelect: _onGameSelect }: AllGamesPageProps) {
  const navigate = useNavigate();
  const { pageConfig, providers, categories } = useAllGamesPageConfig();
  const { config: homeConfig } = useHomeConfig();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const gamesPerPage = pageConfig.jogos_por_pagina;
  const isInitialLoading = isLoading && allGames.length === 0;

  const getProviderSlug = useCallback((providerName: string): string => {
    const normalizedName = providerName.replace(/\s+/g, '').toUpperCase();
    const found = providers.find(
      (provider) => provider.nome.replace(/\s+/g, '').toUpperCase() === normalizedName
    );
    return found?.slug || createSlug(providerName);
  }, [providers]);

  const fetchAllGames = useCallback(async () => {
    if (providers.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const providersData: ApiProvidersResponse = await fetchProvidersCached();

      if (providersData.status !== 1 || !providersData.data) {
        setAllGames([]);
        return;
      }

      const filteredProviders = providersData.data.filter(isPlayFiverEnabledProvider);

      const gamesPromises = filteredProviders.map(async (prov) => {
        try {
          const apiData: ApiResponse = await fetchGamesForProviderCached(prov.id);

          if (apiData.status === 1 && apiData.data) {
            return apiData.data
              .filter((game) => game.status === true)
              .map((game) => ({
                name: game.name,
                provider: game.provider.name,
                image: game.image_url,
                category: getCategoryFromProvider(game.provider.name, game.name),
                game_code: game.game_code,
              }));
          }
          return [];
        } catch (err) {
          console.error(`Erro ao buscar jogos do provider ${prov.name}:`, err);
          return [];
        }
      });

      const gamesResults = await Promise.all(gamesPromises);
      setAllGames(gamesResults.flat());
    } catch (err) {
      console.error('Erro ao buscar jogos:', err);
      setError('Erro ao carregar jogos. Tente novamente.');
      setAllGames([]);
    } finally {
      setIsLoading(false);
    }
  }, [providers]);

  useEffect(() => {
    void fetchAllGames();
  }, [fetchAllGames]);

  useEffect(() => {
    if (providers.length === 0) return;
    const hasSelected = providers.some((provider) => provider.slug === selectedProvider);
    if (!hasSelected) {
      setSelectedProvider(providers[0].slug);
    }
  }, [providers, selectedProvider]);

  useEffect(() => {
    if (categories.length === 0) return;
    const hasSelected = categories.some((category) => category.slug === selectedCategory);
    if (!hasSelected) {
      setSelectedCategory(categories[0].slug);
    }
  }, [categories, selectedCategory]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedProvider, selectedCategory]);

  const filteredGames = allGames.filter(game => {
    const matchesSearch = game.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         game.provider.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Normalizar comparação de provider
    let matchesProvider = true;
    if (selectedProvider !== 'all') {
      const selectedProviderObj = providers.find(p => p.slug === selectedProvider);
      if (selectedProviderObj) {
        const gameProviderNormalized = game.provider.replace(/\s+/g, '').toUpperCase();
        const selectedProviderNormalized = selectedProviderObj.nome.replace(/\s+/g, '').toUpperCase();
        
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

  const selectedProviderName = providers.find(p => p.slug === selectedProvider)?.nome || 'Todos';
  const selectedCategoryName = categories.find(c => c.slug === selectedCategory)?.nome || 'Todos';

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
                <span className="whitespace-nowrap shrink-0">{pageConfig.titulo}</span>
                <span
                  className={`text-brand-light whitespace-nowrap overflow-hidden transition-all duration-300 ease-out ${
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
                items={providers.map((provider) => ({ id: provider.slug, label: provider.nome }))}
                onSelect={setSelectedProvider}
                selectedLabel={selectedProviderName}
              />
              <FilterDropdown
                icon={Grid3x3}
                items={categories.map((category) => ({ id: category.slug, label: category.nome }))}
                onSelect={setSelectedCategory}
                selectedLabel={selectedCategoryName}
              />
            </div>

            {isInitialLoading && (
              <LoadingScreen title="Carregando jogos..." variant="page" />
            )}

            {error && !isLoading && allGames.length === 0 && (
              <div className="py-20 text-center">
                <p className="text-red-400 text-lg mb-4">{error}</p>
                <button
                  onClick={() => fetchAllGames()}
                  className="px-6 py-3 rounded-lg bg-gradient-to-r from-brand to-brand-hover hover:from-brand-hover hover:to-brand-hover text-white font-bold text-sm transition-all duration-200"
                >
                  Tentar novamente
                </button>
              </div>
            )}

            {(allGames.length > 0 || (!isLoading && !error)) && (
              <div className="min-h-[360px]">
                {currentGames.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 mb-8">
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
                                style={{ backgroundColor: 'var(--brand-primary)', borderColor: 'var(--brand-primary-light)', color: '#000000' }}
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
                  className="px-6 py-3 rounded-lg bg-gradient-to-r from-brand to-brand-hover hover:from-brand-hover hover:to-brand-hover text-white font-bold text-sm transition-all duration-200 shadow-lg"
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
