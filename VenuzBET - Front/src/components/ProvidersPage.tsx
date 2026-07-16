import { useState, useEffect, useCallback } from 'react';
import LoadingScreen from './LoadingScreen';
import { useNavigate } from 'react-router-dom';
import Footer from './Footer';
import BackButton from './BackButton';
import AppPageScaffold from './AppPageScaffold';
import { fetchProvidersCached, fetchGamesForProviderCached, isPlayFiverSlotsProvider } from '../api/playfiversCache';
import { useHomeConfig } from '../hooks/useHomeConfig';
import { appPageContainerClass } from '../constants/homeLayout';

interface ApiProvider {
  id: number;
  name: string;
  image_url: string;
  wallet: {
    name: string;
  };
  status: number;
}

interface ApiResponse {
  status: number;
  data: ApiProvider[];
  msg: string;
}

interface Provider {
  id: string;
  name: string;
  games: number;
  image: string;
  apiId: number;
}

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

export default function ProvidersPage() {
  const navigate = useNavigate();
  const { config: homeConfig } = useHomeConfig();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProviders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const apiData: ApiResponse = await fetchProvidersCached();
      
      if (apiData.status === 1 && apiData.data) {
        const filteredProviders = apiData.data.filter(isPlayFiverSlotsProvider);
        
        // Mapear para o formato esperado
        const mappedProviders: Provider[] = filteredProviders.map(provider => ({
          id: provider.id.toString(),
          name: provider.name,
          games: 0, // Será atualizado depois
          image: provider.image_url,
          apiId: provider.id,
        }));
        
        // Buscar contagem de jogos para cada provedor em paralelo
        const countPromises = filteredProviders.map(async (provider) => {
          try {
            const gamesData = await fetchGamesForProviderCached(provider.id);
            if (gamesData.status === 1 && gamesData.data) {
              return {
                id: provider.id,
                count: gamesData.data.filter((game: any) => game.status === true).length,
              };
            }
          } catch (err) {
            console.error(`Erro ao buscar jogos do provider ${provider.name}:`, err);
          }
          return { id: provider.id, count: 0 };
        });
        
        const countResults = await Promise.all(countPromises);
        const counts: Record<number, number> = {};
        countResults.forEach(result => {
          counts[result.id] = result.count;
        });
        
        // Atualizar providers com as contagens
        const providersWithCounts = mappedProviders.map(provider => ({
          ...provider,
          games: counts[provider.apiId] || 0,
        }));
        
        setProviders(providersWithCounts);
      } else {
        setProviders([]);
      }
    } catch (err) {
      console.error('Erro ao buscar provedores:', err);
      setError('Erro ao carregar provedores. Tente novamente.');
      setProviders([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  return (
    <AppPageScaffold>
      <div className={`flex flex-col min-h-full ${appPageContainerClass}`} style={{ backgroundColor: homeConfig.fundo }}>
          <div className="flex-1 py-4 sm:py-6">
            <div className="flex items-center gap-4 mb-8 min-h-[40px] min-w-0">
              <BackButton compact onClick={() => navigate('/')} />
              <h1 className="text-white text-2xl font-bold">Todos os provedores</h1>
            </div>

            {isLoading && (
              <LoadingScreen title="Carregando provedores..." variant="page" />
            )}

            {error && !isLoading && (
              <div className="py-20 text-center">
                <p className="text-red-400 text-lg mb-4">{error}</p>
                <button
                  onClick={fetchProviders}
                  className="px-6 py-3 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold text-sm transition-all duration-200"
                >
                  Tentar novamente
                </button>
              </div>
            )}

            {!isLoading && !error && (
              <>
                <div className="flex flex-wrap gap-4 mb-8">
                  {providers.map((provider) => {
                    const providerSlug = getProviderSlug(provider.name);
                    const providerUrl = `/provider/${providerSlug}`;
                    
                    return (
                    <button
                      key={provider.id}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // Salvar dados do provedor no sessionStorage
                        sessionStorage.setItem('providerData', JSON.stringify({
                          id: provider.apiId,
                          name: provider.name,
                          image: provider.image
                        }));
                        navigate(providerUrl);
                      }}
                      className="relative group shrink-0 rounded-md overflow-hidden transition-all duration-200 shadow-lg hover:scale-105 cursor-pointer"
                      style={{ width: 168, height: 100, backgroundColor: '#0D1237' }}
                    >
                      <div className="absolute top-2 right-2 z-10">
                        <div className="rounded-full px-2 py-0.5">
                          <span className="text-white text-xs font-bold">{provider.games}</span>
                        </div>
                      </div>

                      <div
                        className="absolute w-[80%] h-[70%] left-[10%] top-[15%] bg-center bg-contain bg-no-repeat opacity-60 group-hover:opacity-100 transition-opacity duration-200"
                        style={{ backgroundImage: `url(${provider.image})` }}
                        role="img"
                        aria-label={provider.name}
                      />
                    </button>
                    );
                  })}
                </div>

                {providers.length === 0 && (
                  <div className="py-20 text-center">
                    <p className="text-slate-400 text-lg">Nenhum provedor encontrado</p>
                  </div>
                )}
              </>
            )}

            <div className="min-h-[20vh]" />
          </div>

          <Footer containerClassName="w-full" />
      </div>
    </AppPageScaffold>
  );
}
