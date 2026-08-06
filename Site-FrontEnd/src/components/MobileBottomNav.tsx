import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { navigateToGameByName } from '../utils/navigateToGameByName';
import { useHomeConfig } from '../hooks/useHomeConfig';
import { useTranslation } from '../hooks/useTranslation';

interface MobileBottomNavProps {
  visible: boolean;
}

const ICONS = {
  menu: '/assets/menu/menu.svg',
  sport: '/assets/menu/sport.svg',
  casino: '/assets/menu/casino.svg',
  live: '/assets/menu/live.svg',
  aviator: '/assets/menu/rocket.svg',
} as const;

const navIconClass = 'h-5 w-5 shrink-0 opacity-90 object-contain';

export default function MobileBottomNav({ visible }: MobileBottomNavProps) {
  const { config: homeConfig } = useHomeConfig();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [aviatorLoading, setAviatorLoading] = useState(false);
  const aviatorBusyRef = useRef(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const fn = () => setIsMobile(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  const show = visible && isMobile;

  useEffect(() => {
    const root = document.getElementById('root');
    if (!root || !show) return;
    const pad = 'calc(5.5rem + env(safe-area-inset-bottom, 0px))';
    const prev = root.style.paddingBottom;
    root.style.paddingBottom = pad;
    return () => {
      root.style.paddingBottom = prev;
    };
  }, [show]);

  const toggleMenu = () => document.dispatchEvent(new CustomEvent('openMobileMenu'));

  const isEsporte = location.pathname === '/esportes';
  const isCasino = location.pathname === '/';
  const isLive = location.pathname.startsWith('/provider/pragmaticlive');

  const go = useCallback(
    (path: string) => {
      navigate(path);
    },
    [navigate]
  );

  const onAviator = useCallback(async () => {
    if (aviatorBusyRef.current) return;
    aviatorBusyRef.current = true;
    setAviatorLoading(true);
    try {
      await navigateToGameByName('Aviator', navigate);
    } finally {
      aviatorBusyRef.current = false;
      setAviatorLoading(false);
    }
  }, [navigate]);

  if (!show) return null;

  const itemBase =
    'flex flex-1 flex-col items-center justify-end gap-0.5 min-w-0 pt-1 pb-2 rounded-xl transition-colors duration-200';
  const labelClass = 'text-[10px] font-bold leading-tight text-center truncate w-full px-0.5';
  const inactive = 'text-[#DCDDDE]/70';
  const active = 'text-white';

  return (
    <nav
      data-mobile-nav
      className="fixed bottom-0 left-0 right-0 z-[55] md:hidden pointer-events-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label={t.navigation.mainNavAria}
    >
      <div className="pointer-events-auto mx-2 mb-2 flex items-end justify-between gap-0.5 rounded-2xl px-1 shadow-[0_-4px_24px_rgba(0,0,0,0.35)]" style={{ backgroundColor: homeConfig.fundo }}>
        <button type="button" onClick={toggleMenu} className={`${itemBase} ${inactive}`} aria-label={t.navigation.openCloseMenu}>
          <img src={ICONS.menu} alt="" className={navIconClass} width={20} height={20} />
          <span className={`${labelClass} font-semibold`} style={{ fontFamily: 'Montserrat, sans-serif' }}>
            {t.navigation.menu}
          </span>
        </button>

        <button
          type="button"
          onClick={() => go('/esportes')}
          className={`${itemBase} ${isEsporte ? active : inactive}`}
          aria-current={isEsporte ? 'page' : undefined}
        >
          <img src={ICONS.sport} alt="" className={navIconClass} width={20} height={20} />
          <span className={labelClass} style={{ fontFamily: 'Montserrat, sans-serif' }}>
            {t.navigation.sports}
          </span>
        </button>

        <button
          type="button"
          onClick={() => go('/')}
          className="-mt-6 mb-0.5 flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-full shadow-lg transition-transform active:scale-95"
          style={{
            backgroundColor: 'var(--brand-primary)',
            boxShadow: '0 4px 20px rgb(var(--brand-primary-rgb) / 0.45)',
          }}
          aria-current={isCasino ? 'page' : undefined}
          aria-label={t.navigation.casinoHome}
        >
          <img src={ICONS.casino} alt="" className="h-[22px] w-[22px] shrink-0 object-contain" width={22} height={22} />
          <span
            className="mt-0.5 text-[10px] font-black tracking-wide text-white"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            {t.navigation.casino}
          </span>
        </button>

        <button
          type="button"
          onClick={() => go('/provider/pragmaticlive')}
          className={`${itemBase} ${isLive ? active : inactive}`}
          aria-current={isLive ? 'page' : undefined}
        >
          <img src={ICONS.live} alt="" className={navIconClass} width={20} height={20} />
          <span className={labelClass} style={{ fontFamily: 'Montserrat, sans-serif' }}>
            {t.navigation.live}
          </span>
        </button>

        <button
          type="button"
          onClick={onAviator}
          disabled={aviatorLoading}
          className={`${itemBase} ${inactive} disabled:opacity-50`}
          aria-label={t.navigation.aviatorOpen}
        >
          <img src={ICONS.aviator} alt="" className={navIconClass} width={20} height={20} />
          <span className={labelClass} style={{ fontFamily: 'Montserrat, sans-serif' }}>
            {aviatorLoading ? '…' : t.navigation.aviator}
          </span>
        </button>
      </div>
    </nav>
  );
}
