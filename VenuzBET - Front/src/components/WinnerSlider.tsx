import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { GameInfo } from '../App';
import { useHomeConfig } from '../hooks/useHomeConfig';
import { fetchProvidersCached, fetchGamesForProviderCached, isPlayFiverEnabledProvider } from '../api/playfiversCache';
import IconifyIcon from './IconifyIcon';
import LoadingScreen from './LoadingScreen';

interface WinnerSliderProps {
  onGameSelect: (game: GameInfo) => void;
}

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

interface Winner {
  name: string;
  amount: string;
  time: string;
  game: string;
  image: string;
  game_code: string;
  provider: string;
}

function WinnerSectionTitle() {
  return (
    <div className="flex items-center gap-2 mb-4">
      <IconifyIcon icon="twemoji:trophy" style={{ fontSize: '24px', color: '#FFD700' }} />
      <h4 className="text-white font-bold text-lg md:text-xl tracking-tight">
        Últimos Ganhadores de Hoje
      </h4>
    </div>
  );
}

function WinnerBarShell({ children, backgroundColor }: { children: ReactNode; backgroundColor: string }) {
  return (
    <div
      className="relative overflow-hidden rounded-xl py-2"
      style={{ backgroundColor }}
    >
      {children}
    </div>
  );
}

// Função para gerar nomes aleatórios
const generateRandomName = (): string => {
  const prefixes = ['aev', 'Edu', 'Lar', 'Nat', 'Otá', 'Pat', 'iam', 'Man', 'Joã', 'Mar', 'Ped', 'Ana', 'Luc', 'Car', 'Ric'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const stars = '***';
  return `${prefix}${stars}`;
};

// Função para gerar valores aleatórios
const generateRandomAmount = (): string => {
  const min = 500;
  const max = 15000;
  const amount = Math.random() * (max - min) + min;
  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `+${formatted}`;
};

// Função para gerar tempos aleatórios
const generateRandomTime = (): string => {
  const minutes = Math.floor(Math.random() * 30) + 1;
  return `Há ${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`;
};

export default function WinnerSlider({ onGameSelect }: WinnerSliderProps) {
  const { config: homeConfig } = useHomeConfig();
  const [winners, setWinners] = useState<Winner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const sliderRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);

  const fetchGames = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const providersData: ApiProvidersResponse = await fetchProvidersCached();
      
      if (providersData.status !== 1 || !providersData.data) {
        setWinners([]);
        setIsLoading(false);
        return;
      }
      
      const filteredProviders = providersData.data.filter(isPlayFiverEnabledProvider);
      
      // Buscar jogos de todos os provedores em paralelo
      const gamesPromises = filteredProviders.map(async (prov) => {
        try {
          const apiData: ApiResponse = await fetchGamesForProviderCached(prov.id);
          
          if (apiData.status === 1 && apiData.data) {
            return apiData.data
              .filter(game => game.status === true) // Apenas jogos ativos
              .map(game => ({
                name: game.name,
                provider: game.provider.name,
                image: game.image_url,
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
      const allGames = gamesResults.flat();
      
      // Selecionar aleatoriamente 8 jogos
      const shuffled = allGames.sort(() => 0.5 - Math.random());
      const selectedGames = shuffled.slice(0, 8);
      
      // Criar ganhadores com dados aleatórios
      const generatedWinners: Winner[] = selectedGames.map(game => ({
        name: generateRandomName(),
        amount: generateRandomAmount(),
        time: generateRandomTime(),
        game: game.name,
        image: game.image,
        game_code: game.game_code,
        provider: game.provider,
      }));
      
      setWinners(generatedWinners);
    } catch (err: any) {
      console.error('Erro ao buscar jogos:', err);
      setWinners([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider || winners.length === 0) return;

    let scrollAmount = 0;
    const scrollSpeed = 0.3;
    const maxScroll = slider.scrollWidth / 2;

    const scroll = () => {
      scrollAmount += scrollSpeed;
      if (scrollAmount >= maxScroll) {
        scrollAmount = 0;
      }
      slider.scrollLeft = scrollAmount;
      animationRef.current = requestAnimationFrame(scroll);
    };

    animationRef.current = requestAnimationFrame(scroll);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [winners]);

  const handleWinnerClick = (winner: Winner) => {
    onGameSelect({
      name: winner.game,
      provider: winner.provider,
      image: winner.image,
      game_code: winner.game_code,
    });
  };

  if (isLoading) {
    return (
      <div>
        <WinnerSectionTitle />
        <WinnerBarShell backgroundColor={homeConfig.fundo}>
          <LoadingScreen title="Carregando ganhadores..." variant="compact" />
        </WinnerBarShell>
      </div>
    );
  }

  if (winners.length === 0) {
    return (
      <div>
        <WinnerSectionTitle />
        <WinnerBarShell backgroundColor={homeConfig.fundo}>
          <div className="flex items-center justify-center py-6 sm:py-8">
            <p className="text-sm text-slate-400">Nenhum ganhador encontrado</p>
          </div>
        </WinnerBarShell>
      </div>
    );
  }

  return (
    <div>
      <WinnerSectionTitle />
      <WinnerBarShell backgroundColor={homeConfig.fundo}>
      <div
        ref={sliderRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 will-change-transform"
        style={{ scrollBehavior: 'auto' }}
      >
        {[...winners, ...winners].map((winner, index) => (
          <div
            key={`${winner.game_code}-${index}`}
            onClick={() => handleWinnerClick(winner)}
            className="flex w-[230px] shrink-0 cursor-pointer items-center gap-3 rounded-xl border border-white/15 px-3 py-2 shadow-lg transition-all duration-200 hover:brightness-110 hover:border-brand/45"
            style={{ backgroundColor: homeConfig.fundo }}
          >
            <img
              src={winner.image}
              alt={winner.game}
              className="h-16 w-16 shrink-0 rounded-lg object-cover shadow-md"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/64x64?text=Game';
              }}
            />
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
              <span className="truncate text-sm font-bold text-white">{winner.name}</span>
              <span className="truncate text-sm font-bold" style={{ color: '#00FFAE' }}>
                {winner.amount}
              </span>
              <span className="truncate text-xs text-slate-400">{winner.time}</span>
            </div>
          </div>
        ))}
      </div>
    </WinnerBarShell>
    </div>
  );
}
