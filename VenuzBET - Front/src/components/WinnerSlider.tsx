import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { GameInfo } from '../App';
import { useHomeConfig } from '../hooks/useHomeConfig';
import { useTranslation } from '../hooks/useTranslation';
import {
  fetchProvidersCached,
  fetchGamesForProviderCached,
  isPlayFiverEnabledProvider,
} from '../api/playfiversCache';
import IconifyIcon from './IconifyIcon';
import LoadingScreen from './LoadingScreen';
import { GAME_IMAGE_FALLBACK_SM } from '../lib/gameImageFallback';

export interface WinnerPoolGame {
  name: string;
  provider: string;
  image: string;
  game_code: string;
}

interface WinnerSliderProps {
  onGameSelect: (game: GameInfo) => void;
  /** Jogos já carregados das seções da home — evita buscar todos os provedores na API. */
  poolGames?: WinnerPoolGame[];
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

const FALLBACK_PROVIDER_LIMIT = 3;
const WINNER_COUNT = 8;

function WinnerSectionTitle() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2 mb-4">
      <IconifyIcon icon="twemoji:trophy" style={{ fontSize: '24px', color: '#FFD700' }} />
      <h4 className="text-white font-bold text-lg md:text-xl tracking-tight">
        {t.home.lastWinnersToday}
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

const generateRandomName = (): string => {
  const prefixes = ['aev', 'Edu', 'Lar', 'Nat', 'Otá', 'Pat', 'iam', 'Man', 'Joã', 'Mar', 'Ped', 'Ana', 'Luc', 'Car', 'Ric'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  return `${prefix}***`;
};

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

const generateRandomMinutes = (): number => Math.floor(Math.random() * 30) + 1;

function pickRandomGames(games: WinnerPoolGame[], count: number): WinnerPoolGame[] {
  if (games.length === 0) return [];
  const shuffled = [...games].sort(() => 0.5 - Math.random());
  if (shuffled.length >= count) return shuffled.slice(0, count);
  const picked: WinnerPoolGame[] = [];
  while (picked.length < count) {
    picked.push(shuffled[picked.length % shuffled.length]);
  }
  return picked;
}

async function fetchFallbackPoolGames(): Promise<WinnerPoolGame[]> {
  const providersData = await fetchProvidersCached();
  if (providersData.status !== 1 || !providersData.data) return [];

  const providers = providersData.data
    .filter(isPlayFiverEnabledProvider)
    .slice(0, FALLBACK_PROVIDER_LIMIT);

  const gamesResults = await Promise.all(
    providers.map(async (prov) => {
      try {
        const apiData = await fetchGamesForProviderCached(prov.id);
        if (apiData.status !== 1 || !apiData.data) return [];
        return apiData.data
          .filter((game) => game.status === true)
          .map((game) => ({
            name: game.name,
            provider: game.provider.name,
            image: game.image_url,
            game_code: game.game_code,
          }));
      } catch {
        return [];
      }
    }),
  );

  return gamesResults.flat();
}

function buildWinners(games: WinnerPoolGame[], minutesAgo: (n: number) => string): Winner[] {
  return pickRandomGames(games, WINNER_COUNT).map((game) => ({
    name: generateRandomName(),
    amount: generateRandomAmount(),
    time: minutesAgo(generateRandomMinutes()),
    game: game.name,
    image: game.image,
    game_code: game.game_code,
    provider: game.provider,
  }));
}

export default function WinnerSlider({ onGameSelect, poolGames = [] }: WinnerSliderProps) {
  const { config: homeConfig } = useHomeConfig();
  const { t } = useTranslation();
  const [winners, setWinners] = useState<Winner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const sliderRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);

  const loadWinners = useCallback(async () => {
    setIsLoading(true);

    try {
      let sourceGames = poolGames;
      if (sourceGames.length === 0) {
        sourceGames = await fetchFallbackPoolGames();
      }

      setWinners(buildWinners(sourceGames, t.home.minutesAgo));
    } catch (err) {
      console.error('Erro ao montar ganhadores:', err);
      setWinners([]);
    } finally {
      setIsLoading(false);
    }
  }, [poolGames, t.home]);

  useEffect(() => {
    void loadWinners();
  }, [loadWinners]);

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
          <LoadingScreen title={t.common.loadingWinners} variant="compact" />
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
            <p className="text-sm text-slate-400">{t.common.noWinners}</p>
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
                  (e.target as HTMLImageElement).src = GAME_IMAGE_FALLBACK_SM;
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
