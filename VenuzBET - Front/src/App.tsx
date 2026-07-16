import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import MainContent from './components/MainContent';
import GamePage from './components/GamePage';
import AllGamesPage from './components/AllGamesPage';
import SlotsPage from './components/SlotsPage';
import TermsPage from './components/TermsPage';
import BettingTermsPage from './components/BettingTermsPage';
import PrivacyPolicyPage from './components/PrivacyPolicyPage';
import KYCPolicyPage from './components/KYCPolicyPage';
import ResponsibleGamingPage from './components/ResponsibleGamingPage';
import AMLPolicyPage from './components/AMLPolicyPage';
import PromotionsPage from './components/PromotionsPage';
import PromotionDetailPage from './components/PromotionDetailPage';
import MobileAppPage from './components/MobileAppPage';
import ReferralPage from './components/ReferralPage';
import ProfilePage from './components/ProfilePage';
import WalletPage from './components/WalletPage';
import ProvidersPage from './components/ProvidersPage';
import ProviderGamesPage from './components/ProviderGamesPage';
import OriginalsPage from './components/OriginalsPage';
import EsportsPage from './components/EsportsPage';
import AppShellLayout from './components/AppShellLayout';
import AppPageScaffold from './components/AppPageScaffold';
import VipLevelsPage from './components/VipLevelsPage';
import CouponModal from './components/CouponModal';
import NotFoundPage from './components/NotFoundPage';
import MobileBottomNav from './components/MobileBottomNav';
import LoadingScreen from './components/LoadingScreen';
import PrizeWheel from './components/PrizeWheel';
import { resolveGameBySlug } from './utils/resolveGameBySlug';
import { captureTrackingParams } from './lib/trackingParams';

export interface GameInfo {
  name: string;
  provider: string;
  image: string;
  game_code?: string;
}

interface StoredGameData extends GameInfo {
  path?: string;
}

// Componente para rota dinâmica de jogos
function GameRoute() {
  const navigate = useNavigate();
  const { providerSlug, gameSlug } = useParams();
  const [gameData, setGameData] = useState<GameInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchGameFromApi = async () => {
      if (!providerSlug || !gameSlug) {
        setIsLoading(false);
        navigate('/');
        return;
      }

      try {
        const currentPath = `/${providerSlug}/${gameSlug}`;

        // Só reutiliza sessionStorage se for exatamente esta rota (evita jogo errado de sessão anterior)
        const gameDataStr = sessionStorage.getItem('gameData');
        if (gameDataStr) {
          try {
            const parsed: StoredGameData = JSON.parse(gameDataStr);
            if (parsed.path === currentPath) {
              setGameData({
                name: parsed.name,
                provider: parsed.provider,
                image: parsed.image,
                game_code: parsed.game_code,
              });
              setIsLoading(false);
              return;
            }
          } catch (e) {
            console.error('Erro ao parsear gameData:', e);
          }
        }

        const resolved = await resolveGameBySlug(gameSlug, providerSlug);
        if (!resolved) {
          throw new Error('Jogo não encontrado');
        }

        const resolvedGame: GameInfo = {
          name: resolved.name,
          provider: resolved.provider,
          image: resolved.image,
          game_code: resolved.game_code,
        };

        sessionStorage.setItem(
          'gameData',
          JSON.stringify({ ...resolvedGame, path: currentPath })
        );

        setGameData(resolvedGame);
        setIsLoading(false);
      } catch (err: any) {
        console.error('Erro ao buscar jogo:', err);
        setError(err.message || 'Erro ao carregar o jogo');
        setIsLoading(false);
        // Redirecionar para home após 2 segundos
        setTimeout(() => {
          navigate('/');
        }, 2000);
      }
    };

    fetchGameFromApi();
  }, [providerSlug, gameSlug, navigate]);
  
  if (isLoading) {
    return (
      <AppPageScaffold>
        <LoadingScreen title="Carregando jogo..." variant="page" />
      </AppPageScaffold>
    );
  }

  if (error) {
    return (
      <AppPageScaffold>
        <div className="py-20 flex flex-col items-center justify-center gap-4 px-4">
          <div className="text-red-400 text-lg">{error}</div>
          <div className="text-slate-400 text-sm">Redirecionando...</div>
        </div>
      </AppPageScaffold>
    );
  }
  
  if (gameData) {
    return (
      <GamePage
        embedded
        gameName={gameData.name}
        gameProvider={gameData.provider}
        gameImage={gameData.image}
        gameCode={gameData.game_code}
        onBack={() => {
          const previousPath = sessionStorage.getItem('previousPath') || '/';
          navigate(previousPath);
        }}
      />
    );
  }
  
  return null;
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedGame, setSelectedGame] = useState<GameInfo | null>(null);
  const [isCouponOpen, setIsCouponOpen] = useState(false);

  useEffect(() => {
    captureTrackingParams();
  }, [location.search]);

  const pathSegments = location.pathname.split('/').filter(Boolean);
  const looksLikeGamePlayerRoute =
    pathSegments.length === 2 &&
    pathSegments[0] !== 'help' &&
    pathSegments[0] !== 'provider';

  const isEsportsPage = location.pathname === '/esportes';
  const showMobileBottomNav = !selectedGame && !looksLikeGamePlayerRoute && !isEsportsPage;

  const handleGameSelect = (game: GameInfo) => {
    // Salvar a rota atual antes de navegar
    sessionStorage.setItem('previousPath', window.location.pathname);
    setSelectedGame(game);
    navigate('/');
  };

  useEffect(() => {
    const handleOpenCouponModal = () => {
      setIsCouponOpen(true);
    };

    document.addEventListener('openCouponModal', handleOpenCouponModal);
    return () => document.removeEventListener('openCouponModal', handleOpenCouponModal);
  }, []);

  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      let target = e.target as HTMLElement;

      while (target && target !== document.body) {
        if (target.tagName === 'A') {
          const href = (target as HTMLAnchorElement).href;
          const url = new URL(href);
          const pathname = url.pathname;
          
          // Se for uma rota interna, usa navigate
          if (url.origin === window.location.origin) {
            e.preventDefault();
            navigate(pathname);
            return;
          }
        }
        target = target.parentElement as HTMLElement;
      }
    };

    document.addEventListener('click', handleLinkClick);
    return () => document.removeEventListener('click', handleLinkClick);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-300 font-sans">
      <CouponModal isOpen={isCouponOpen} onClose={() => setIsCouponOpen(false)} />
      <PrizeWheel />
      <MobileBottomNav visible={showMobileBottomNav} />
      <Routes>
        <Route
          element={
            <AppShellLayout
              isCouponOpen={isCouponOpen}
              onCouponOpen={() => setIsCouponOpen(true)}
              onCouponClose={() => setIsCouponOpen(false)}
            />
          }
        >
          <Route path="/help/terms" element={<TermsPage onBack={() => navigate('/')} />} />
          <Route path="/help/betting-terms" element={<BettingTermsPage onBack={() => navigate('/')} />} />
          <Route path="/help/privacy" element={<PrivacyPolicyPage onBack={() => navigate('/')} />} />
          <Route path="/help/kyc" element={<KYCPolicyPage onBack={() => navigate('/')} />} />
          <Route path="/help/responsible-gaming" element={<ResponsibleGamingPage onBack={() => navigate('/')} />} />
          <Route path="/help/aml" element={<AMLPolicyPage onBack={() => navigate('/')} />} />
          <Route path="/games" element={<AllGamesPage onGameSelect={handleGameSelect} />} />
          <Route path="/slots" element={<SlotsPage onGameSelect={handleGameSelect} />} />
          <Route path="/originals" element={<OriginalsPage onBack={() => navigate('/')} onGameSelect={handleGameSelect} />} />
          <Route path="/help/promotions" element={<PromotionsPage onBack={() => navigate('/')} />} />
          <Route path="/help/promotions/:promotionId" element={<PromotionDetailPage />} />
          <Route path="/help/mobile" element={<MobileAppPage onBack={() => navigate('/')} />} />
          <Route path="/help/referral" element={<ReferralPage />} />
          <Route path="/help/vip" element={<VipLevelsPage />} />
          <Route path="/profile" element={<ProfilePage onBack={() => navigate('/')} />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/providers" element={<ProvidersPage />} />
          <Route path="/provider/:providerSlug" element={<ProviderGamesPage />} />
          <Route path="/esportes" element={<EsportsPage />} />
          <Route
            path="/"
            element={
              selectedGame ? (
                <GamePage
                  embedded
                  gameName={selectedGame.name}
                  gameProvider={selectedGame.provider}
                  gameImage={selectedGame.image}
                  gameCode={selectedGame.game_code}
                  onBack={() => {
                    setSelectedGame(null);
                    const previousPath = sessionStorage.getItem('previousPath') || '/';
                    navigate(previousPath);
                  }}
                />
              ) : (
                <div className="flex-1 overflow-y-auto min-h-0">
                  <MainContent onGameSelect={handleGameSelect} />
                </div>
              )
            }
          />
          <Route path="/:providerSlug/:gameSlug" element={<GameRoute />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </div>
  );
}

function App() {
  return <AppContent />;
}

export default App;
