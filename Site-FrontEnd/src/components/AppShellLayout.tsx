import { Outlet, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import TopBanner from './TopBanner';
import Header from './Header';
import Sidebar from './Sidebar';
import { useListenOpenMobileMenu } from '../hooks/useListenOpenMobileMenu';
import { getSidebarInitiallyOpen } from '../utils/sidebarInitialOpen';

interface AppShellLayoutProps {
  isCouponOpen?: boolean;
  onCouponOpen?: () => void;
  onCouponClose?: () => void;
}

export default function AppShellLayout({
  isCouponOpen,
  onCouponOpen,
  onCouponClose,
}: AppShellLayoutProps) {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(() =>
    location.pathname === '/esportes' ? false : getSidebarInitiallyOpen()
  );
  useListenOpenMobileMenu(setIsSidebarOpen);

  useEffect(() => {
    if (location.pathname === '/esportes') {
      setIsSidebarOpen(false);
    }
  }, [location.pathname]);

  return (
    <div className="flex flex-col w-full h-screen overflow-hidden">
      <div data-shell-header className="relative z-[60] flex-shrink-0">
        <TopBanner />
        <Header
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isSidebarOpen={isSidebarOpen}
          isCouponOpen={isCouponOpen}
          onCouponOpen={onCouponOpen}
          onCouponClose={onCouponClose}
        />
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        <Sidebar
          isOpen={isSidebarOpen}
          onCloseMobileDrawer={() => setIsSidebarOpen(false)}
        />

        <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
