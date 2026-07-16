import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useEffect, useRef } from 'react';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SaquesPage from './pages/SaquesPage';
import UsuariosPage from './pages/UsuariosPage';
import DepositosPage from './pages/DepositosPage';
import ApostasPage from './pages/ApostasPage';
import VipNiveisPage from './pages/VipNiveisPage';
import BannersPage from './pages/BannersPage';
import SidebarCardsPage from './pages/SidebarCardsPage';
import TodosJogosPage from './pages/TodosJogosPage';
import HomeSectionsPage from './pages/HomeSectionsPage';
import TopBannerPage from './pages/TopBannerPage';
import PromotionsPage from './pages/PromotionsPage';
import RecommendedBannersPage from './pages/RecommendedBannersPage';
import HomeQuickNavPage from './pages/HomeQuickNavPage';
import AdministracaoPage from './pages/AdministracaoPage';
import ConfiguracoesPage from './pages/ConfiguracoesPage';
import CuponsPage from './pages/CuponsPage';
import RoletaPage from './pages/RoletaPage';
import AviatorRtpPage from './pages/AviatorRtpPage';
import JogosPage from './pages/JogosPage';
import UsuarioDetalhesPage from './pages/UsuarioDetalhesPage';
import LogsPage from './pages/LogsPage';
import WebhooksPage from './pages/WebhooksPage';
import SegurancaPage from './pages/SegurancaPage';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin, loading, loadingCargo, user } = useAuth();

  const isInitialAuth = loading || (loadingCargo && !user);
  const waitingForCargo = isAuthenticated && !user?.cargo && loadingCargo;

  if (isInitialAuth || waitingForCargo) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!user?.cargo || !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function LoginRoute() {
  const { isAuthenticated, loading, user } = useAuth();
  const navigate = useNavigate();
  const redirectAttempted = useRef(false);

  useEffect(() => {
    if (loading) return;

    if (isAuthenticated && !redirectAttempted.current) {
      redirectAttempted.current = true;
      requestAnimationFrame(() => {
        navigate('/dashboard', { replace: true });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, loading]);

  if (loading || (isAuthenticated && !user?.cargo)) {
    return <LoadingSpinner />;
  }

  if (isAuthenticated) {
    return <LoadingSpinner />;
  }

  return <LoginPage />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="usuarios" element={<UsuariosPage />} />
        <Route path="usuarios/:userId" element={<UsuarioDetalhesPage />} />
        <Route path="depositos" element={<DepositosPage />} />
        <Route path="saques" element={<SaquesPage />} />
        <Route path="apostas" element={<ApostasPage />} />
        <Route path="vip" element={<VipNiveisPage />} />
        <Route path="cupons" element={<CuponsPage />} />
        <Route path="roleta" element={<RoletaPage />} />
        <Route path="aviator-rtp" element={<AviatorRtpPage />} />
        <Route path="jogos" element={<JogosPage />} />
        <Route path="provedores" element={<Navigate to="/jogos" replace />} />
        <Route path="banners" element={<BannersPage />} />
        <Route path="sidebar-cards" element={<SidebarCardsPage />} />
        <Route path="todos-jogos" element={<TodosJogosPage />} />
        <Route path="home-secoes" element={<HomeSectionsPage />} />
        <Route path="top-banner" element={<TopBannerPage />} />
        <Route path="promocoes" element={<PromotionsPage />} />
        <Route path="recomendados" element={<RecommendedBannersPage />} />
        <Route path="atalhos-home" element={<HomeQuickNavPage />} />
        <Route path="administracao" element={<AdministracaoPage />} />
        <Route path="logs" element={<LogsPage />} />
        <Route path="webhooks" element={<WebhooksPage />} />
        <Route path="seguranca" element={<SegurancaPage />} />
        <Route path="configuracoes" element={<ConfiguracoesPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;






