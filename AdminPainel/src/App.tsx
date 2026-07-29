import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
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

function resolvePostLoginPath(from: unknown): string {
  if (typeof from !== 'string' || !from.startsWith('/') || from.startsWith('//')) {
    return '/dashboard';
  }
  if (from === '/login' || from === '/') {
    return '/dashboard';
  }
  return from;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { isAuthenticated, isAdmin, authReady, loading, loadingCargo, cargoVerified, user } = useAuth();

  if (!authReady || loading || loadingCargo || (user !== null && !cargoVerified)) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated || !isAdmin) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to="/login" replace state={{ from: returnTo }} />;
  }

  return <>{children}</>;
}

function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <AdminSiteBrandProvider>
        <Layout />
      </AdminSiteBrandProvider>
    </ProtectedRoute>
  );
}

function LoginRoute() {
  const { isAuthenticated, isAdmin, authReady, loading, loadingCargo, cargoVerified } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectAttempted = useRef(false);
  const postLoginPath = resolvePostLoginPath((location.state as { from?: string } | null)?.from);

  useEffect(() => {
    if (!authReady || loading || loadingCargo || !cargoVerified) return;

    if (isAuthenticated && isAdmin && !redirectAttempted.current) {
      redirectAttempted.current = true;
      requestAnimationFrame(() => {
        navigate(postLoginPath, { replace: true });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, isAdmin, authReady, loading, loadingCargo, cargoVerified, postLoginPath]);

  if (!authReady || loading || loadingCargo || (isAuthenticated && !cargoVerified)) {
    return <LoadingSpinner />;
  }

  if (isAuthenticated && isAdmin) {
    return <LoadingSpinner />;
  }

  return (
    <AdminSiteBrandProvider>
      <LoginPage redirectTo={postLoginPath} />
    </AdminSiteBrandProvider>
  );
}

function RedirectToHomeTab({ tab }: { tab: string }) {
  return <Navigate to={`/home-cms?tab=${tab}`} replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/usuarios" element={<UsuariosPage />} />
        <Route path="/usuarios/:userId" element={<UsuarioDetalhesPage />} />
        <Route path="/depositos" element={<DepositosPage />} />
        <Route path="/saques" element={<SaquesPage />} />
        <Route path="/apostas" element={<ApostasPage />} />
        <Route path="/vip" element={<VipNiveisPage />} />
        <Route path="/cupons" element={<CuponsPage />} />
        <Route path="/roleta" element={<RoletaPage />} />
        <Route path="/aviator-rtp" element={<AviatorRtpPage />} />
        <Route path="/jogos" element={<JogosPage />} />
        <Route path="/provedores" element={<Navigate to="/jogos" replace />} />
        <Route path="/home-cms" element={<HomeCmsPage />} />
        <Route path="/identidade-site" element={<SiteBrandPage />} />
        <Route path="/banners" element={<RedirectToHomeTab tab="carrossel" />} />
        <Route path="/atalhos-home" element={<RedirectToHomeTab tab="atalhos" />} />
        <Route path="/recomendados" element={<RedirectToHomeTab tab="recomendados" />} />
        <Route path="/home-secoes" element={<RedirectToHomeTab tab="secoes" />} />
        <Route path="/sidebar-cards" element={<SidebarCardsPage />} />
        <Route path="/todos-jogos" element={<TodosJogosPage />} />
        <Route path="/top-banner" element={<TopBannerPage />} />
        <Route path="/promocoes" element={<PromotionsPage />} />
        <Route path="/administracao" element={<AdministracaoPage />} />
        <Route path="/logs" element={<LogsPage />} />
        <Route path="/webhooks" element={<WebhooksPage />} />
        <Route path="/tracking" element={<TrackingPage />} />
        <Route path="/seguranca" element={<SegurancaPage />} />
        <Route path="/configuracoes" element={<ConfiguracoesPage />} />
        <Route path="/gateways" element={<PaymentGatewayPage />} />
        <Route path="/misticpay" element={<Navigate to="/gateways" replace />} />
        <Route path="/bspay" element={<Navigate to="/gateways" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
