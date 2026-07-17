import { useState, useEffect, useCallback } from 'react';
import LoadingScreen from './LoadingScreen';
import { useNavigate, useParams } from 'react-router-dom';
import Footer from './Footer';
import AppPageScaffold from './AppPageScaffold';
import BackButton from './BackButton';
import SearchInput from './SearchInput';
import { fetchProvidersCached, fetchGamesForProviderCached, isPlayFiverEnabledProvider } from '../api/playfiversCache';
import { normalizeProviderSlug } from '../utils/resolveGameBySlug';
import { useHomeConfig } from '../hooks/useHomeConfig';
import {
  PROPRIETARY_GAMES,
  PROPRIETARY_PROVIDER,
  PROPRIETARY_PROVIDER_ID,
} from '../lib/proprietaryCatalog';
import {
  ensurePlatformGameSettingsLoaded,
  isPlatformGameEnabled,
  isPlatformProviderEnabled,
} from '../lib/platformGames';

interface ApiGame {
  name: string;
  image_url: string;
  status: boolean;
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
  game_code: string;
}

const createSlug = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const getProviderSlug = (providerName: string): string => {
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

export default function ProviderGamesPage() {
  const navigate = useNavigate();
  const { providerSlug } = useParams<{ providerSlug: string }>();
  const { config: homeConfig } = useHomeConfig();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [games, setGames] = useState<Game[]>([]);
  const [provider, setProvider] = useState<ApiProvider | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const gamesPerPage = 18;

  const fetchProviderAndGames = useCallback(async () => {
    if (!providerSlug) return;

    const normalizedProviderSlug = normalizeProviderSlug(providerSlug);

    setIsLoading(true);
    setError(null);

    try {
      if (normalizedProviderSlug === PROPRIETARY_PROVIDER.slug) {
        const settings = await ensurePlatformGameSettingsLoaded();

        if (!isPlatformProviderEnabled(PROPRIETARY_PROVIDER_ID, settings)) {
          throw new Error('Provedor não encontrado');
        }

        setProvider({
          id: PROPRIETARY_PROVIDER_ID,
          name: PROPRIETARY_PROVIDER.name,
          image_url: PROPRIETARY_PROVIDER.image_url,
          wallet: { name: 'VenuzBET' },
          status: 1,
        });

        setGames(
          PROPRIETARY_GAMES.filter((game) =>
            isPlatformGameEnabled(PROPRIETARY_PROVIDER_ID, game.game_code, settings)
          ).map((game) => ({
            name: game.nome,
            provider: PROPRIETARY_PROVIDER.name,
            image: game.image_url,
            game_code: game.game_code,
          }))
        );
        return;
      }

      const providersData: ApiProvidersResponse = await fetchProvidersCached();

      if (providersData.status !== 1 || !providersData.data) {
        throw new Error('Provedor não encontrado');
      }

      const filteredProviders = providersData.data.filter(isPlayFiverEnabledProvider);

      let foundProvider: ApiProvider | null = null;

      const providerId = parseInt(normalizedProviderSlug);
      if (!isNaN(providerId)) {
        foundProvider = filteredProviders.find((p) => p.id === providerId) || null;
      }

      if (!foundProvider) {
        foundProvider =
          filteredProviders.find((p) => getProviderSlug(p.name) === normalizedProviderSlug) || null;
      }

      if (!foundProvider) {
        throw new Error('Provedor não encontrado');
      }

      setProvider(foundProvider);

      const gamesData: ApiResponse = await fetchGamesForProviderCached(foundProvider.id);

      if (gamesData.status === 1 && gamesData.data) {
        const mappedGames: Game[] = gamesData.data
          .filter((game) => game.status === true)
          .map((game) => ({
            name: game.name,
            provider: game.provider.name,
            image: game.image_url,
            game_code: game.game_code,
          }));

        setGames(mappedGames);
      } else {
        setGames([]);
      }
    } catch (err: unknown) {
      console.error('Erro ao buscar jogos do provedor:', err);
      setError(err instanceof Error ? err.message : 'Erro ao carregar jogos. Tente novamente.');
      setGames([]);
    } finally {
      setIsLoading(false);
    }
  }, [providerSlug]);

  useEffect(() => {
    void fetchProviderAndGames();
    setCurrentPage(1);
  }, [fetchProviderAndGames]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredGames = games.filter(
    (game) =>
      game.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      game.provider.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredGames.length / gamesPerPage);
  const visibleCount = currentPage * gamesPerPage;
  const currentGames = filteredGames.slice(0, visibleCount);
  const hasMoreGames = currentGames.length < filteredGames.length;

  const handleBack = () => {
    navigate('/providers');
  };

  return (
    <AppPageScaffold>
      <div className="flex flex-col min-h-full" style={{ backgroundColor: homeConfig.fundo }}>
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4 mb-6 min-h-[40px] min-w-0">
            <BackButton compact onClick={handleBack} />
            <h1 className="flex items-center flex-nowrap min-w-0 text-white text-2xl font-bold">
              <span className="whitespace-nowrap shrink-0">Jogos de</span>
              <span className="text-brand-light whitespace-nowrap overflow-hidden ml-1">
                {provider ? provider.name : 'Carregando...'}
              </span>
            </h1>
          </div>

          <div className="mb-6 w-full">
            <SearchInput
              placeholder="Pesquisar jogos"
              value={searchTerm}
              onChange={setSearchTerm}
            />
          </div>

          {isLoading && games.length === 0 && (
            <LoadingScreen title="Carregando jogos..." variant="page" />
          )}

          {error && !isLoading && games.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-red-400 text-lg mb-4">{error}</p>
              <button
                onClick={() => fetchProviderAndGames()}
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-brand to-brand-hover hover:from-brand-hover hover:to-brand-hover text-white font-bold text-sm transition-all duration-200"
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
                    const gameProviderSlug = getProviderSlug(game.provider);
                    const gameSlug = createSlug(game.name);
                    const gameUrl = `/${gameProviderSlug}/${gameSlug}`;

                    return (
                      <button
                        key={`${game.name}-${index}`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          sessionStorage.setItem('previousPath', window.location.pathname);
                          sessionStorage.setItem(
                            'gameData',
                            JSON.stringify({
                              name: game.name,
                              provider: game.provider,
                              image: game.image,
                              game_code: game.game_code,
                              path: gameUrl,
                            })
                          );
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
                              (e.target as HTMLImageElement).src =
                                'https://via.placeholder.com/300x400/1e293b/64748b?text=Game';
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                            <button
                              type="button"
                              className="font-bold text-xs px-3 py-1.5 rounded border flex items-center gap-1 hover:brightness-110 transition-all"
                              style={{
                                backgroundColor: 'var(--brand-primary)',
                                borderColor: 'var(--brand-primary-light)',
                                color: '#000000',
                              }}
                            >
                              <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor">
                                <path d="M8 5v14l11-7z" />
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

        <Footer />
      </div>
    </AppPageScaffold>
  );
}
