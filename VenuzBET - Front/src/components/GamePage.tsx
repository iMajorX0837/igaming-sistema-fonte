import Header from './Header';
import Sidebar from './Sidebar';
import TopBanner from './TopBanner';
import Footer from './Footer';
import LoginModal from './LoginModal';
import RegisterModal from './RegisterModal';
import DepositModal from './DepositModal';
import LoadingScreen from './LoadingScreen';
import BackButton from './BackButton';
import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useListenOpenMobileMenu } from '../hooks/useListenOpenMobileMenu';
import { useHomeConfig } from '../hooks/useHomeConfig';
import { getSidebarInitiallyOpen } from '../utils/sidebarInitialOpen';
import { appPageContainerClass } from '../constants/homeLayout';

interface GamePageProps {
  gameName: string;
  gameProvider: string;
  gameImage: string;
  gameCode?: string;
  /** Enviado à PlayFivers no game_launch (ex.: "Original" para esportes). */
  launchProvider?: string;
  /** game_original no payload da PlayFivers (esportes exigem true). */
  gameOriginal?: boolean;
  onBack: () => void;
  /** @deprecated Alinhamento agora segue a borda do iframe. */
  headerAlign?: 'left' | 'center' | 'right' | number;
  /** Quando true, renderiza só o conteúdo do jogo (sem Header/Sidebar/TopBanner). */
  embedded?: boolean;
  /** Iframe ocupa toda a área de conteúdo (sem barra Voltar / caixa max-w-[1100px]). */
  fullscreen?: boolean;
}

interface GameLaunchResponse {
  status: number;
  msg?: string;
  launch_url?: string;
  user_code?: string;
  user_balance?: number;
  user_created?: boolean;
  name?: string;
}

const gamePlayerShellClass =
  'flex flex-col overflow-hidden rounded-lg md:rounded-xl border border-slate-800/60 shadow-2xl';

/** Altura do bloco iframe + barra de info, ancorada no viewport. */
const GAME_PLAYER_HEIGHT_FULLSCREEN = 'h-[calc(100dvh-5.75rem)] min-h-[320px]';
const GAME_PLAYER_HEIGHT_STANDARD = 'h-[80dvh] min-h-[360px] max-h-[calc(100dvh-8rem)]';

const gamePlayerStageClass = 'relative w-full flex-1 min-h-0 overflow-hidden';

function GamePlayerShell({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`${gamePlayerShellClass} ${className}`.trim()}>{children}</div>;
}

interface GameInformationBarProps {
  gameName: string;
  gameProvider: string;
  backgroundColor: string;
  className?: string;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
}

function GameInformationBar({
  gameName,
  gameProvider,
  backgroundColor,
  className = '',
  onToggleFullscreen,
  isFullscreen = false,
}: GameInformationBarProps) {
  if (isFullscreen) return null;

  return (
    <div
      className={`shrink-0 border-t border-slate-800/60 px-3 md:px-4 py-2.5 md:py-3 ${className}`}
      style={{ backgroundColor }}
    >
      <div className="flex items-center justify-between gap-3 min-w-0 w-full">
        <div className="flex flex-col gap-0.5 min-w-0 text-left">
          <p className="text-base md:text-lg font-bold text-white leading-tight truncate">{gameName}</p>
          <p className="text-xs md:text-sm font-normal text-slate-400 leading-snug truncate">{gameProvider}</p>
        </div>
        {onToggleFullscreen && (
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="shrink-0 flex items-center justify-center rounded-lg p-1.5 text-slate-300 transition-colors duration-200 hover:text-white hover:bg-slate-800/60"
            aria-label={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
            title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
          >
            <span
              className="iconify i-mingcute:fullscreen-fill"
              data-icon="mingcute:fullscreen-fill"
              aria-hidden="true"
              style={{ fontSize: '28px' }}
            />
          </button>
        )}
      </div>
    </div>
  );
}

function FullscreenExitButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute top-3 right-3 z-30 flex items-center justify-center rounded-lg bg-black/55 p-2 text-white opacity-90 transition-opacity hover:opacity-100 hover:bg-black/70"
      aria-label="Sair da tela cheia"
      title="Sair da tela cheia"
    >
      <span
        className="iconify i-mingcute:fullscreen-exit-fill"
        data-icon="mingcute:fullscreen-exit-fill"
        aria-hidden="true"
        style={{ fontSize: '28px' }}
      />
    </button>
  );
}

function GameBackRow({
  onBack,
  gameName,
  backgroundColor,
}: {
  onBack: () => void;
  gameName: string;
  backgroundColor: string;
}) {
  return (
    <div
      className="shrink-0 py-1.5 md:py-2 flex items-center justify-start min-w-0 w-full"
      style={{ backgroundColor }}
    >
      <div className="flex items-center gap-3 min-w-0 w-full">
        <BackButton compact onClick={onBack} />
        <h1 className="text-white font-bold text-base md:text-lg leading-tight truncate">{gameName}</h1>
      </div>
    </div>
  );
}

function LoginRequiredPrompt({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 md:gap-6 bg-gradient-to-b from-slate-950/40 via-slate-950/70 to-slate-950/90 backdrop-blur-lg px-4">
      <span
        className="iconify i-solar:shield-warning-bold-duotone"
        data-icon="solar:shield-warning-bold-duotone"
        aria-hidden="true"
        style={{ fontSize: '45px' }}
      />
      <p className="text-white text-lg md:text-2xl font-bold">Você precisa entrar para jogar.</p>

      <button
        onClick={onLogin}
        className="relative isolate overflow-hidden rounded-lg text-white text-sm font-semibold transition-all duration-200 hover:opacity-90 flex items-center justify-center"
        style={{
          backgroundColor: '#7B3FF2',
          width: '126px',
          height: '48px',
          boxShadow:
            '0 0 14px rgba(123, 63, 242, 0.48), 0 0 28px rgba(123, 63, 242, 0.48), inset 0 1px 0 rgba(255, 255, 255, 0.14)',
        }}
      >
        <div className="sidebar-promo-bloom-layer" aria-hidden="true">
          <span
            className="sidebar-promo-bloom sidebar-promo-bloom-1"
            style={{ backgroundColor: '#C084FC' }}
          />
          <span
            className="sidebar-promo-bloom sidebar-promo-bloom-2"
            style={{ backgroundColor: '#C084FC' }}
          />
          <span
            className="sidebar-promo-bloom sidebar-promo-bloom-3"
            style={{ backgroundColor: '#C084FC' }}
          />
        </div>
        <span className="relative z-10 flex items-center gap-2">
          <span
            className="iconify i-solar:login-3-broken"
            data-icon="solar:login-3-broken"
            aria-hidden="true"
            style={{ fontSize: '24px' }}
          />
          Entrar
        </span>
      </button>
    </div>
  );
}

function InsufficientBalanceIllustration() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="133"
      height="135"
      fill="none"
      viewBox="0 0 133 135"
      className="w-24 h-auto md:w-28 shrink-0"
      aria-hidden
    >
      <path fill="#2f878a" d="m22.312 48.875 87.624 9.21-4.604 43.811-87.625-9.21z" />
      <path fill="#3cacb0" d="m20.834 36.415 94.933 15.036-7.518 47.466-94.933-15.036z" />
      <path fill="#38e1be" d="m28.674 29.335 94.016 19.984-9.992 47.007-94.016-19.983z" />
      <path
        fill="#000"
        d="m104.433 53.627-60.831-12.93a13.14 13.14 0 0 1-10.55 6.57l-3.077 14.474a13.14 13.14 0 0 1 6.966 10.295l60.83 12.93a13.14 13.14 0 0 1 10.551-6.572l3.076-14.473a13.13 13.13 0 0 1-6.965-10.294m-4.187 35.959L32.8 75.25a9.1 9.1 0 0 0-7.01-10.796l-.465-.098 4.542-21.368.464.099a9.1 9.1 0 0 0 10.796-7.01l67.446 14.336a9.1 9.1 0 0 0 7.011 10.795l.464.099-4.542 21.367-.464-.099a9.103 9.103 0 0 0-10.796 7.01"
      />
      <path fill="#6b5a61" d="m60.013 35.996 31.339 6.661-9.992 47.008-31.339-6.661z" />
      <path
        fill="#38e1be"
        d="M82.44 65.329C80.6 73.983 73.846 79.88 67.356 78.5s-10.261-9.513-8.422-18.167c1.84-8.654 8.592-14.55 15.083-13.171s10.26 9.513 8.421 18.167"
      />
      <path
        fill="#fff"
        d="m21.445 19.023-6.007 6.007-6.008-6.007 6.008-6.007zm0-9.011a3.004 3.004 0 1 1 6.007 0 3.004 3.004 0 0 1-6.007 0m90.109 99.12 6.007-6.007 6.008 6.007-6.008 6.007zm0 9.011a3.004 3.004 0 1 1-6.008 0 3.004 3.004 0 0 1 6.008 0"
      />
      <path
        fill="#ffdb16"
        d="M122.567 29.035c0 11.06-8.965 20.024-20.024 20.024s-20.024-8.965-20.024-20.024 8.965-20.024 20.024-20.024 20.024 8.965 20.024 20.024"
      />
      <path
        fill="#000"
        d="M102.686 18.022a7.15 7.15 0 0 0-7.151 7.152v.858h4.005v-.858a3.147 3.147 0 0 1 3.146-3.147h.944a2.034 2.034 0 0 1 1.091 3.75l-.756.48a7.4 7.4 0 0 0-3.424 6.238v.545h4.005v-.545a3.39 3.39 0 0 1 1.569-2.859l.756-.481a6.038 6.038 0 0 0-3.241-11.133zm-2.145 17.02v4.005h4.005v-4.004z"
      />
    </svg>
  );
}

function InsufficientBalanceOverlay({
  onDeposit,
  onPlay,
}: {
  onDeposit: () => void;
  onPlay: () => void;
}) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 md:gap-5 bg-gradient-to-b from-slate-950/40 via-slate-950/70 to-slate-950/90 backdrop-blur-lg px-4 text-center">
      <InsufficientBalanceIllustration />
      <h2 className="text-white text-lg md:text-2xl font-bold">Depósito necessário</h2>
      <p className="text-slate-300 text-sm md:text-base max-w-md leading-relaxed">
        Parece que o seu saldo é insuficiente para jogar este jogo. Você gostaria de depositar e começar a jogar?
      </p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onDeposit}
          className="h-8 px-5 rounded-full text-white text-sm font-semibold transition-all duration-200 hover:opacity-90"
          style={{ backgroundColor: '#7B3FF2' }}
        >
          Depositar
        </button>
        <button
          type="button"
          onClick={onPlay}
          className="h-8 px-5 rounded-full text-white text-sm font-semibold transition-all duration-200 hover:opacity-90 border"
          style={{ backgroundColor: 'transparent', borderColor: '#7B3FF2' }}
        >
          Jogar
        </button>
      </div>
    </div>
  );
}

function GameLoadingPlaceholder({
  gameImage,
  className = '',
}: {
  gameImage: string;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden ${className}`.trim()}>
      <div
        className="absolute inset-0 bg-cover bg-center scale-105 blur-sm"
        style={{ backgroundImage: `url(${gameImage})` }}
      />
      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/55 backdrop-blur-[2px]">
        <LoadingScreen variant="inline" showText={false} />
      </div>
    </div>
  );
}

function GameIframe({
  gameUrl,
  gameName,
  showInsufficientBalance,
  onDeposit,
  onPlay,
  iframeClassName,
  containerClassName = '',
}: {
  gameUrl: string;
  gameName: string;
  showInsufficientBalance: boolean;
  onDeposit: () => void;
  onPlay: () => void;
  iframeClassName: string;
  containerClassName?: string;
}) {
  return (
    <div className={`game-iframe-wrapper relative overflow-hidden ${containerClassName}`.trim()}>
      <iframe
        src={gameUrl}
        className={`game-iframe scrollbar-hide overflow-hidden ${iframeClassName} ${showInsufficientBalance ? 'blur-md pointer-events-none' : ''}`.trim()}
        allow="fullscreen; autoplay; encrypted-media"
        allowFullScreen
        scrolling="no"
        title={gameName}
      />
      {showInsufficientBalance && (
        <InsufficientBalanceOverlay onDeposit={onDeposit} onPlay={onPlay} />
      )}
    </div>
  );
}

export default function GamePage({
  gameName,
  gameProvider,
  gameImage,
  gameCode,
  launchProvider,
  gameOriginal = false,
  onBack,
  embedded = false,
  fullscreen = false,
}: GamePageProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(getSidebarInitiallyOpen);
  useListenOpenMobileMenu(setIsSidebarOpen);
  const { config: homeConfig } = useHomeConfig();
  const { isAuthenticated, user } = useAuth();
  const prevGameCodeRef = useRef(gameCode);
  const playerStageRef = useRef<HTMLDivElement>(null);
  const [isPlayerFullscreen, setIsPlayerFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(() => {
    if (!gameCode || !sessionStorage.getItem(`game_url_${gameCode}`)) {
      return Boolean(gameCode);
    }
    return false;
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [saldo, setSaldo] = useState<number>(0);
  const [saldoLoaded, setSaldoLoaded] = useState(false);
  const [dismissedDepositPrompt, setDismissedDepositPrompt] = useState(false);
  const [gameUrl, setGameUrl] = useState<string | null>(() => {
    if (gameCode) {
      const stored = sessionStorage.getItem(`game_url_${gameCode}`);
      return stored || null;
    }
    return null;
  });
  // Buscar saldo do usuário
  const fetchSaldo = useCallback(async () => {
    if (isAuthenticated && user) {
      try {
        const { data, error } = await supabase
          .from('usuarios')
          .select('saldo, email')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Erro ao buscar saldo:', error);
          return null;
        }

        if (data) {
          setSaldo(parseFloat(String(data.saldo)) || 0);
          setSaldoLoaded(true);
          return data;
        }
      } catch (error) {
        console.error('Erro ao buscar saldo:', error);
      }
    } else {
      setSaldo(0);
      setSaldoLoaded(false);
    }
    return null;
  }, [isAuthenticated, user]);

  // Lançar jogo via API
  const launchGame = useCallback(async (options?: { background?: boolean }) => {
    if (!gameCode || !isAuthenticated || !user) {
      return;
    }

    const background = options?.background ?? false;
    if (!background) {
      setIsLoading(true);
    }
    setError(null);

    try {
      // Buscar saldo e dados do usuário ANTES de lançar o jogo
      const userData = await fetchSaldo();
      
      if (!userData) {
        throw new Error('Erro ao buscar dados do usuário');
      }

      // Usar o saldo atualizado diretamente da consulta
      const currentBalance = parseFloat(userData.saldo) || 0;
      
      // Usar email do usuário como identificador na Play Fiver
      const userCode = userData.email || user.email || 'venuzbet';

      // Mesmo origin: em dev o Vite repassa para PlayFiverAPI local (VITE_GAME_LAUNCH_PROXY).
      const gameLaunchUrl = import.meta.env.VITE_GAME_LAUNCH_URL?.trim() || '/api/game_launch';
      const response = await fetch(gameLaunchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentToken: '8898269e-650f-42af-bea0-d93981c545b0',
          secretKey: '8b83d392-6dae-423c-bb76-af873254a0e7',
          user_code: userCode,
          game_code: gameCode,
          ...(launchProvider ? { provider: launchProvider } : {}),
          game_original: gameOriginal,
          user_balance: currentBalance,
          user_rtp: 70,
          lang: 'pt',
        }),
      });

      if (!response.ok) {
        const errBody = (await response.json().catch(() => null)) as { msg?: string } | null;
        throw new Error(errBody?.msg || `Erro ao lançar jogo (${response.status})`);
      }

      const data: GameLaunchResponse = await response.json();

      if (data.status === 1 && data.launch_url) {
        const launchUrl = data.launch_url;
        setGameUrl((currentUrl) => {
          if (currentUrl === launchUrl) {
            return currentUrl;
          }
          if (gameCode) {
            sessionStorage.setItem(`game_url_${gameCode}`, launchUrl);
          }
          return launchUrl;
        });
      } else {
        throw new Error(data.msg || 'Erro ao lançar jogo');
      }
    } catch (err: any) {
      console.error('Erro ao lançar jogo:', err);
      if (!background) {
        setError(err.message || 'Erro ao carregar o jogo. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [gameCode, isAuthenticated, user, fetchSaldo, launchProvider, gameOriginal]);

  useEffect(() => {
    // Sempre buscar saldo atualizado quando o componente montar ou gameCode mudar
    if (isAuthenticated && user) {
      fetchSaldo();
    }
  }, [isAuthenticated, user, fetchSaldo]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const channel = supabase
      .channel('saldo-changes-game')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'usuarios',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new && 'saldo' in payload.new) {
            setSaldo(parseFloat(String(payload.new.saldo)) || 0);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (!gameCode) return;

    const previousCode = prevGameCodeRef.current;
    const switchedGame = previousCode !== gameCode;

    if (switchedGame) {
      if (previousCode) {
        sessionStorage.removeItem(`game_url_${previousCode}`);
      }
      prevGameCodeRef.current = gameCode;
      setDismissedDepositPrompt(false);
      setSaldoLoaded(false);
      const cachedUrl = sessionStorage.getItem(`game_url_${gameCode}`);
      setGameUrl(cachedUrl);
      setIsLoading(isAuthenticated && !cachedUrl);
    }

    if (isAuthenticated) {
      const cachedUrl = sessionStorage.getItem(`game_url_${gameCode}`);
      launchGame({ background: !!cachedUrl });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, gameCode]);

  useEffect(() => {
    // Garante que o Iconify escaneia os ícones após renderizar
    const timer = setTimeout(() => {
      if ((window as any).Iconify) {
        (window as any).Iconify.scan();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [isAuthenticated]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsPlayerFullscreen(document.fullscreenElement === playerStageRef.current);
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const togglePlayerFullscreen = useCallback(async () => {
    const stage = playerStageRef.current;
    if (!stage) return;

    try {
      if (document.fullscreenElement === stage) {
        await document.exitFullscreen();
      } else {
        await stage.requestFullscreen();
      }
    } catch (err) {
      console.error('Erro ao alternar tela cheia:', err);
    }
  }, []);

  const gameInfoBarProps = {
    gameName,
    gameProvider,
    backgroundColor: homeConfig.fundo,
    onToggleFullscreen: togglePlayerFullscreen,
    isFullscreen: isPlayerFullscreen,
  };

  const showInsufficientBalance = saldoLoaded && saldo <= 0 && !dismissedDepositPrompt;

  const handleDepositFromGame = () => setIsDepositOpen(true);
  const handlePlayWithoutDeposit = () => setDismissedDepositPrompt(true);

  const playerShellHeightClass = fullscreen
    ? GAME_PLAYER_HEIGHT_FULLSCREEN
    : GAME_PLAYER_HEIGHT_STANDARD;

  const gameBody = (
    <div className="flex flex-col w-full">
          {!isAuthenticated ? (
            <div className="flex flex-col w-full">
              {fullscreen ? (
                <div className="w-full shrink-0">
                  <GamePlayerShell className={`w-full shrink-0 ${playerShellHeightClass}`}>
                    <div
                      ref={playerStageRef}
                      className={`game-player-stage ${gamePlayerStageClass} bg-black`}
                    >
                      <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${gameImage})` }}
                      />
                      <LoginRequiredPrompt onLogin={() => setIsLoginOpen(true)} />
                      {isPlayerFullscreen && (
                        <FullscreenExitButton onClick={togglePlayerFullscreen} />
                      )}
                    </div>
                    <GameInformationBar {...gameInfoBarProps} />
                  </GamePlayerShell>
                </div>
              ) : (
                <div className={`shrink-0 ${appPageContainerClass} pt-2 sm:pt-2.5 md:pt-3 pb-2 sm:pb-3 md:pb-6`}>
                  <div className="w-full flex flex-col min-w-0 gap-2 md:gap-3">
                    <GameBackRow
                      onBack={onBack}
                      gameName={gameName}
                      backgroundColor={homeConfig.fundo}
                    />
                    <GamePlayerShell className={`w-full shrink-0 ${playerShellHeightClass}`}>
                      <div
                        ref={playerStageRef}
                        className={`game-player-stage ${gamePlayerStageClass} bg-black`}
                      >
                        <div
                          className="absolute inset-0 bg-cover bg-center"
                          style={{ backgroundImage: `url(${gameImage})` }}
                        />
                        <LoginRequiredPrompt onLogin={() => setIsLoginOpen(true)} />
                        {isPlayerFullscreen && (
                          <FullscreenExitButton onClick={togglePlayerFullscreen} />
                        )}
                      </div>
                      <GameInformationBar {...gameInfoBarProps} />
                    </GamePlayerShell>
                  </div>
                </div>
              )}
              <Footer containerClassName={appPageContainerClass} />
            </div>
          ) : (
            <div className="flex flex-col w-full">
              {error && !gameUrl && (
                <div className="min-h-full flex flex-col items-center justify-center gap-4 md:gap-8 bg-gradient-to-b from-slate-950/20 via-slate-950/50 to-slate-950/80 px-4">
                  <div className="w-20 h-20 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-red-500/20 to-red-600/20 border-2 border-red-500/40 flex items-center justify-center shadow-2xl backdrop-blur-sm">
                    <svg className="w-10 h-10 md:w-16 md:h-16 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  </div>
                  <div className="text-center space-y-2 md:space-y-3">
                    <p className="text-white text-lg md:text-2xl font-bold">Erro ao carregar jogo</p>
                    <p className="text-red-400 text-xs md:text-sm">{error}</p>
                  </div>
                  <button
                    onClick={() => launchGame()}
                    className="px-6 py-3 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold text-sm transition-all duration-200"
                  >
                    Tentar novamente
                  </button>
                </div>
              )}

              {!error && (gameUrl || isLoading) && (
                <>
                  {fullscreen ? (
                    <div className="w-full shrink-0">
                      <GamePlayerShell className={`w-full shrink-0 ${playerShellHeightClass}`}>
                        <div
                          ref={playerStageRef}
                          className={`game-player-stage ${gamePlayerStageClass} bg-black`}
                        >
                          {gameUrl ? (
                            <GameIframe
                              gameUrl={gameUrl}
                              gameName={gameName}
                              showInsufficientBalance={showInsufficientBalance}
                              onDeposit={handleDepositFromGame}
                              onPlay={handlePlayWithoutDeposit}
                              iframeClassName="absolute inset-0 w-full h-full border-0 block"
                              containerClassName="absolute inset-0 w-full h-full"
                            />
                          ) : (
                            <GameLoadingPlaceholder
                              gameImage={gameImage}
                              className="absolute inset-0 w-full h-full"
                            />
                          )}
                          {isLoading && (
                            <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/45 backdrop-blur-[1px] transition-opacity duration-300">
                              <LoadingScreen variant="inline" showText={false} />
                            </div>
                          )}
                          {isPlayerFullscreen && (
                            <FullscreenExitButton onClick={togglePlayerFullscreen} />
                          )}
                        </div>
                        <GameInformationBar {...gameInfoBarProps} />
                      </GamePlayerShell>
                    </div>
                  ) : (
                <div className="w-full shrink-0">
                  <div className={`${appPageContainerClass} pt-2 sm:pt-2.5 md:pt-3 pb-2 sm:pb-3 md:pb-6`}>
                    <div className="w-full flex flex-col min-w-0 gap-2 md:gap-3">
                      <GameBackRow
                        onBack={onBack}
                        gameName={gameName}
                        backgroundColor={homeConfig.fundo}
                      />
                      <GamePlayerShell className={`w-full shrink-0 ${playerShellHeightClass}`}>
                        <div
                          ref={playerStageRef}
                          className={`game-player-stage ${gamePlayerStageClass}`}
                          style={{ backgroundColor: homeConfig.fundo }}
                        >
                          {gameUrl ? (
                            <GameIframe
                              gameUrl={gameUrl}
                              gameName={gameName}
                              showInsufficientBalance={showInsufficientBalance}
                              onDeposit={handleDepositFromGame}
                              onPlay={handlePlayWithoutDeposit}
                              iframeClassName="absolute inset-0 w-full h-full border-0 block"
                              containerClassName="absolute inset-0 w-full h-full"
                            />
                          ) : (
                            <GameLoadingPlaceholder
                              gameImage={gameImage}
                              className="absolute inset-0 w-full h-full"
                            />
                          )}
                          {isLoading && (
                            <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/45 backdrop-blur-[1px] transition-opacity duration-300">
                              <LoadingScreen variant="inline" showText={false} />
                            </div>
                          )}
                          {isPlayerFullscreen && (
                            <FullscreenExitButton onClick={togglePlayerFullscreen} />
                          )}
                        </div>
                        <GameInformationBar {...gameInfoBarProps} />
                      </GamePlayerShell>
                    </div>
                  </div>
                </div>
                  )}
                </>
              )}

              {!isLoading && !error && !gameUrl && !gameCode && (
                <div className="min-h-full flex flex-col items-center justify-center gap-4 md:gap-8 bg-gradient-to-b from-slate-950/20 via-slate-950/50 to-slate-950/80 px-4">
                  <div className="w-20 h-20 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border-2 border-yellow-500/40 flex items-center justify-center shadow-2xl backdrop-blur-sm">
                    <svg className="w-10 h-10 md:w-16 md:h-16 text-yellow-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  </div>
                  <div className="text-center space-y-2 md:space-y-3">
                    <p className="text-white text-lg md:text-2xl font-bold">Jogo não disponível</p>
                    <p className="text-slate-300 text-xs md:text-sm">Este jogo não pode ser carregado no momento</p>
                  </div>
                </div>
              )}

              <Footer containerClassName={appPageContainerClass} />
            </div>
          )}
    </div>
  );

  const authModals = (
    <>
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onSwitchToRegister={() => {
          setIsLoginOpen(false);
          setIsRegisterOpen(true);
        }}
      />

      <RegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onSwitchToLogin={() => {
          setIsRegisterOpen(false);
          setIsLoginOpen(true);
        }}
        onRegisterSuccess={() => setIsDepositOpen(true)}
      />
      <DepositModal
        isOpen={isDepositOpen}
        onClose={() => {
          setIsDepositOpen(false);
          fetchSaldo();
        }}
      />
    </>
  );

  if (embedded) {
    return (
      <div
        className="flex flex-1 min-h-0 flex-col animate-page-enter overflow-y-auto"
        style={{ backgroundColor: homeConfig.fundo }}
      >
        {gameBody}
        {authModals}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col w-full h-screen overflow-hidden" style={{ backgroundColor: homeConfig.fundo }}>
      <TopBanner />
      <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar isOpen={isSidebarOpen} onCloseMobileDrawer={() => setIsSidebarOpen(false)} />
        {gameBody}
      </div>

      {authModals}
    </div>
  );
}
