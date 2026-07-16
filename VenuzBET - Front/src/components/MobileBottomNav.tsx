import { useCallback, useEffect, useRef, useState } from 'react';
import { Menu, Trophy, Dices, Radio } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { navigateToGameByName } from '../utils/navigateToGameByName';

interface MobileBottomNavProps {
  visible: boolean;
}

export default function MobileBottomNav({ visible }: MobileBottomNavProps) {
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

  const openMenu = () => document.dispatchEvent(new CustomEvent('openMobileMenu'));

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
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden pointer-events-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Navegação principal"
    >
      <div className="pointer-events-auto mx-2 mb-2 flex items-end justify-between gap-0.5 rounded-2xl border px-1 shadow-[0_-4px_24px_rgba(0,0,0,0.35)]" style={{ backgroundColor: '#121319', borderColor: '#7B3FF2' }}>
        <button type="button" onClick={openMenu} className={`${itemBase} ${inactive}`} aria-label="Abrir menu">
          <Menu className="h-5 w-5 shrink-0 opacity-80" strokeWidth={2.25} />
          <span className={`${labelClass} font-semibold`} style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Menu
          </span>
        </button>

        <button
          type="button"
          onClick={() => go('/esportes')}
          className={`${itemBase} ${isEsporte ? active : inactive}`}
          aria-current={isEsporte ? 'page' : undefined}
        >
          <Trophy className={`h-5 w-5 shrink-0 ${isEsporte ? 'text-[#7B3FF2]' : 'opacity-80'}`} strokeWidth={2} />
          <span className={labelClass} style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Esporte
          </span>
        </button>

        <button
          type="button"
          onClick={() => go('/')}
          className="-mt-5 mb-0.5 flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full border-2 shadow-lg transition-transform active:scale-95"
          style={{
            backgroundColor: '#7B3FF2',
            borderColor: '#9F6FFF',
            boxShadow: '0 4px 20px rgba(123, 63, 242, 0.45)',
          }}
          aria-current={isCasino ? 'page' : undefined}
          aria-label="Cassino — início"
        >
          <Dices className="h-6 w-6 text-white" strokeWidth={2} />
          <span
            className="mt-0.5 text-[9px] font-black tracking-wide text-white"
            style={{ fontFamily: 'Montserrat, sans-serif' }}
          >
            CASSINO
          </span>
        </button>

        <button
          type="button"
          onClick={() => go('/provider/pragmaticlive')}
          className={`${itemBase} ${isLive ? active : inactive}`}
          aria-current={isLive ? 'page' : undefined}
        >
          <Radio className={`h-5 w-5 shrink-0 ${isLive ? 'text-[#7B3FF2]' : 'opacity-80'}`} strokeWidth={2} />
          <span className={labelClass} style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Ao Vivo
          </span>
        </button>

        <button
          type="button"
          onClick={onAviator}
          disabled={aviatorLoading}
          className={`${itemBase} ${inactive} disabled:opacity-50`}
          aria-label="Abrir Aviator"
        >
          <img
            src="https://royal-images.s3.us-east-1.amazonaws.com/default/menu/aviator.svg"
            alt=""
            className="h-5 w-5 shrink-0 opacity-90"
            width={20}
            height={20}
          />
          <span className={labelClass} style={{ fontFamily: 'Montserrat, sans-serif' }}>
            {aviatorLoading ? '…' : 'Aviator'}
          </span>
        </button>
      </div>
    </nav>
  );
}
