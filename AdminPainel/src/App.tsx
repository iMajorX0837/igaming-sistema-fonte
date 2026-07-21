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
import SidebarCardsPage from './pages/SidebarCardsPage';
import TodosJogosPage from './pages/TodosJogosPage';
import HomeCmsPage from './pages/HomeCmsPage';
import SiteBrandPage from './pages/SiteBrandPage';
import TopBannerPage from './pages/TopBannerPage';
import PromotionsPage from './pages/PromotionsPage';
import AdministracaoPage from './pages/AdministracaoPage';
import ConfiguracoesPage from './pages/ConfiguracoesPage';
import PaymentGatewayPage from './pages/PaymentGatewayPage';
import CuponsPage from './pages/CuponsPage';
import RoletaPage from './pages/RoletaPage';
import AviatorRtpPage from './pages/AviatorRtpPage';
import JogosPage from './pages/JogosPage';
import UsuarioDetalhesPage from './pages/UsuarioDetalhesPage';
import LogsPage from './pages/LogsPage';
import WebhooksPage from './pages/WebhooksPage';
import TrackingPage from './pages/TrackingPage';
import SegurancaPage from './pages/SegurancaPage';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';
import { AdminSiteBrandProvider } from './contexts/AdminSiteBrandContext';

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

function RedirectToHomeTab({ tab }: { tab: string }) {
  return <Navigate to={`/home-cms?tab=${tab}`} replace />;
}

function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <AdminSiteBrandProvider>
            <LoginRoute />
          </AdminSiteBrandProvider>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AdminSiteBrandProvider>
              <Layout />
            </AdminSiteBrandProvider>
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
        <Route path="home-cms" element={<HomeCmsPage />} />
        <Route path="identidade-site" element={<SiteBrandPage />} />
        <Route path="banners" element={<RedirectToHomeTab tab="carrossel" />} />
        <Route path="atalhos-home" element={<RedirectToHomeTab tab="atalhos" />} />
        <Route path="recomendados" element={<RedirectToHomeTab tab="recomendados" />} />
        <Route path="home-secoes" element={<RedirectToHomeTab tab="secoes" />} />
        <Route path="sidebar-cards" element={<SidebarCardsPage />} />
        <Route path="todos-jogos" element={<TodosJogosPage />} />
        <Route path="top-banner" element={<TopBannerPage />} />
        <Route path="promocoes" element={<PromotionsPage />} />
        <Route path="administracao" element={<AdministracaoPage />} />
        <Route path="logs" element={<LogsPage />} />
        <Route path="webhooks" element={<WebhooksPage />} />
        <Route path="tracking" element={<TrackingPage />} />
        <Route path="seguranca" element={<SegurancaPage />} />
        <Route path="configuracoes" element={<ConfiguracoesPage />} />
        <Route path="gateways" element={<PaymentGatewayPage />} />
        <Route path="misticpay" element={<Navigate to="/gateways" replace />} />
        <Route path="bspay" element={<Navigate to="/gateways" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
