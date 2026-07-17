import { useState, useEffect, useCallback, type CSSProperties } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import RegisterModal from './RegisterModal';
import LoginModal from './LoginModal';
import DepositModal from './DepositModal';
import { useAuth } from '../contexts/AuthContext';
import { useHeaderConfig } from '../hooks/useHeaderConfig';
import { useVipProfile } from '../hooks/useVipProfile';
import SiteLogo from './SiteLogo';
import IconifyIcon from './IconifyIcon';
import { SIDEBAR_WIDTH_COLLAPSED_PX, SIDEBAR_WIDTH_EXPANDED_PX } from './Sidebar';
import { supabase } from '../lib/supabase';
import { getVipImageUrl } from '../lib/vip';
import { appPageContainerClass } from '../constants/homeLayout';

const accountMenuItemClass =
  'flex items-center gap-3 px-4 py-1.5 text-sm text-[#CBD5E1] transition-colors duration-200 hover:text-white hover:no-underline';

const accountMenuButtonClass =
  'flex items-center gap-3 px-4 py-1.5 text-sm w-full text-left text-[#CBD5E1] transition-colors duration-200 hover:text-white';

const headerNavTabClass =
  'h-9 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5 hover:opacity-90';

const headerNavTabTextStyle: CSSProperties = {
  fontFamily: 'Montserrat, sans-serif',
  fontStyle: 'normal',
  fontWeight: 800,
  color: 'rgb(255, 255, 255)',
  fontSize: '13px',
  lineHeight: 'normal',
};

interface HeaderProps {
  onToggleSidebar: () => void;
  isSidebarOpen?: boolean;
  isCouponOpen?: boolean;
  onCouponOpen?: () => void;
  onCouponClose?: () => void;
  authButtonsMarginLeft?: number;
}

export default function Header({ onToggleSidebar, isSidebarOpen = true, isCouponOpen: externalIsCouponOpen, onCouponOpen: externalOnCouponOpen, onCouponClose: externalOnCouponClose, authButtonsMarginLeft = 129 }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const { config: headerConfig } = useHeaderConfig();
  const { profile: vipProfile, niveis } = useVipProfile();
  const vipImage = vipProfile.vip_imagem || getVipImageUrl(vipProfile.vip_grupo);
  const proximoNivel = niveis.find((n) => n.nivel === vipProfile.proximo_nivel);
  const proximoNome = vipProfile.proximo_nome ?? proximoNivel?.nome ?? null;
  const proximoImage =
    proximoNivel?.imagem_url ||
    (proximoNivel ? getVipImageUrl(proximoNivel.grupo) : null);
  const proximoCor = proximoNivel?.cor || 'rgb(255, 146, 17)';
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [saldo, setSaldo] = useState<number>(0);
  
  const isEsportesPage = location.pathname === '/esportes';
  const sidebarOffsetPx = isSidebarOpen ? SIDEBAR_WIDTH_EXPANDED_PX : SIDEBAR_WIDTH_COLLAPSED_PX;

  const handleOpenCoupon = () => {
    if (externalOnCouponOpen) {
      externalOnCouponOpen();
    } else {
      // Fallback: dispara evento como o Sidebar faz
      document.dispatchEvent(new CustomEvent('openCouponModal'));
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  useEffect(() => {
    // Garante que o Iconify escaneia os ícones após renderizar
    const timer = setTimeout(() => {
      if ((window as any).Iconify) {
        (window as any).Iconify.scan();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [isAuthenticated]);

  // Função para buscar saldo do usuário
  const fetchSaldo = useCallback(async () => {
    if (isAuthenticated && user) {
      try {
        const { data, error } = await supabase
          .from('usuarios')
          .select('saldo')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Erro ao buscar saldo:', error);
          return;
        }

        if (data) {
          setSaldo(data.saldo || 0);
        }
      } catch (error) {
        console.error('Erro ao buscar saldo:', error);
      }
    } else {
      setSaldo(0);
    }
  }, [isAuthenticated, user]);

  // Buscar saldo quando o usuário está autenticado
  useEffect(() => {
    fetchSaldo();
  }, [fetchSaldo]);

  // Listener para mudanças no saldo em tempo real
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const channel = supabase
      .channel('saldo-changes')
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
            setSaldo(payload.new.saldo as number);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, user]);

  // Formatar saldo para exibição
  const formatSaldo = (valor: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(valor);
  };

  useEffect(() => {
    // Fecha o menu ao clicar fora dele
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isAccountMenuOpen && !target.closest('.account-menu-container')) {
        setIsAccountMenuOpen(false);
      }
    };

    if (isAccountMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAccountMenuOpen]);

  return (
    <>
      <div className="w-full flex-shrink-0 border-b border-white/10 relative z-[60]" style={{ backgroundColor: headerConfig.fundo }}>
      <header className="flex items-center h-[72px] w-full max-w-[1919px] mx-auto relative">
          <div className="hidden md:flex items-center gap-2 absolute left-4 top-1/2 -translate-y-1/2 z-10">
              <a
                href="/"
                className={headerNavTabClass}
                style={{
                  ...headerNavTabTextStyle,
                  backgroundColor: !isEsportesPage ? 'var(--brand-primary)' : headerConfig.fundo,
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 16 16" fill="none" className="w-4 h-4">
                  <path d="M5.79675 2.48571C6.38695 2.14459 7.14355 2.34703 7.48524 2.93794L11.1906 9.35576C11.5301 9.94818 11.3282 10.7026 10.738 11.0443L6.45795 13.5138C5.86775 13.8554 5.11337 13.6535 4.77167 13.0633L1.0656 6.64441C0.724486 6.052 0.926927 5.29761 1.51783 4.95592L5.79675 2.48571ZM4.09051 8.47269C3.93741 9.04735 4.27911 9.62201 4.85599 9.79508C5.43287 9.95039 6.00532 9.6087 6.17838 9.03182L6.23163 8.83435C6.23385 8.82769 6.23607 8.81882 6.23829 8.80994L6.63323 9.49111L6.36476 9.64642C6.2161 9.73073 6.16729 9.91933 6.2516 10.068C6.33813 10.2166 6.52673 10.2655 6.67317 10.1811L7.74262 9.56433C7.89128 9.47779 7.94231 9.2892 7.85578 9.14054C7.77147 8.9941 7.58287 8.94307 7.43421 9.02738L7.16796 9.1827L6.77301 8.50153C6.78189 8.50375 6.79076 8.50597 6.79964 8.50819L6.99489 8.55922C7.57178 8.71453 8.16419 8.37284 8.3195 7.79596C8.4726 7.21908 8.13091 6.62666 7.55402 6.47135L5.25093 5.86118C5.0224 5.79462 4.76946 5.94106 4.70289 6.18734L4.09051 8.47269Z" fill="currentColor"></path>
                  <path opacity="0.4" d="M8.09116 13.3916L11.0932 11.6587C12.0228 11.1218 12.3423 9.93251 11.8054 9.00063L8.77011 3.74545C8.81005 3.74167 8.84777 3.7399 8.88771 3.7399H13.8578C14.5434 3.7399 15.1003 4.29615 15.1003 4.98242V12.4375C15.1003 13.1231 14.5434 13.68 13.8578 13.68H8.88771C8.58595 13.68 8.30639 13.5713 8.09116 13.3916ZM13.7646 5.33076C13.454 5.06895 12.9991 5.11998 12.724 5.40176L12.6175 5.51936L12.5065 5.40176C12.2292 5.11998 11.7699 5.06895 11.4704 5.33076C11.122 5.6303 11.1043 6.16059 11.4149 6.48231L12.491 7.5917C12.5576 7.6627 12.6729 7.6627 12.7462 7.5917L13.8134 6.48231C14.124 6.16059 14.1085 5.6303 13.7646 5.33076Z" fill="currentColor"></path>
                </svg>
                Cassino
              </a>
              <a
                href="/esportes"
                className={headerNavTabClass}
                style={{
                  ...headerNavTabTextStyle,
                  backgroundColor: isEsportesPage ? 'var(--brand-primary)' : headerConfig.fundo,
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 13 14" fill="none" className="w-4 h-4">
                  <path d="M8.85349 1.72079L8.531 0.96874C7.84295 0.722987 7.12339 0.599976 6.40359 0.599976C5.68354 0.599976 4.96324 0.722864 4.27519 0.968494L3.95468 1.72079L6.40408 3.07794L8.85349 1.72079ZM2.23837 2.96691L1.4233 3.03929C0.566868 4.1409 0.102097 5.49608 0.102097 6.89187L0.102099 6.90196C0.102099 6.96828 0.103377 7.03438 0.105427 7.10045L0.719625 7.63612L2.76777 5.72411L2.23837 2.96691ZM7.95004 8.87133L8.8978 5.95174L6.38193 4.14484L3.91037 5.95174L4.866 8.87133H7.95004ZM12.7061 6.89212C12.7061 5.49632 12.2408 4.13992 11.3836 3.03953L10.5791 2.96716L10.04 5.72526L12.0884 7.63728L12.7019 7.10087C12.6839 7.00289 12.7061 6.95366 12.7061 6.89212ZM1.37653 9.6517L1.1946 10.4508C2.01879 11.6597 3.23684 12.5449 4.641 12.9543L5.34505 12.5361L4.15875 9.99314L1.37653 9.6517ZM8.64917 9.99141L7.46287 12.5344L8.16618 12.9529C9.57058 12.5427 10.7879 11.6575 11.6126 10.4493L11.4309 9.65022L8.64917 9.99141Z" fill="currentColor"></path>
                  <path opacity="0.4" d="M12.7008 7.09883C12.6653 8.2967 12.2868 9.45888 11.6108 10.4492L11.4291 9.65015L8.64736 9.99134L7.46106 12.5343L8.15575 12.9488C7.57774 13.1158 6.98225 13.1999 6.38701 13.1999C5.80211 13.1999 5.21745 13.1187 4.64953 12.9547L5.34447 12.5347L4.15817 9.99179L1.37644 9.6501L1.19452 10.4492C0.518777 9.45981 0.140904 8.29739 0.105209 7.09878L0.719407 7.63445L2.76755 5.72244L2.23804 2.96685L1.42296 3.03922C2.15459 2.09663 3.13804 1.38076 4.25886 0.974336L4.26775 0.980943L3.95434 1.72073L6.40375 3.07787L8.85315 1.72073L8.53067 0.968674C9.65863 1.37436 10.6477 2.0922 11.3838 3.03922L10.5788 2.96709L10.0397 5.7252L12.0881 7.63721L12.7008 7.09883ZM8.89746 5.95167L6.38159 4.14478L3.91003 5.95167L4.86567 8.87126H7.94971L8.89746 5.95167Z" fill="currentColor"></path>
                </svg>
                Esportes
              </a>
            </div>

          <div
            className="hidden md:block shrink-0 transition-[width] duration-300"
            style={{ width: sidebarOffsetPx }}
            aria-hidden="true"
          />

          <div className={`flex flex-1 min-w-0 h-full items-center ${appPageContainerClass}`}>
          <div className="w-full flex items-center justify-between gap-3 max-md:gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={onToggleSidebar}
                className="hidden md:flex items-center justify-center w-12 h-12 rounded-lg shrink-0"
                aria-label={isSidebarOpen ? 'Recolher menu lateral' : 'Expandir menu lateral'}
              >
                <IconifyIcon
                  icon="material-symbols:menu-open-rounded"
                  className="text-slate-300 transition-transform duration-300"
                  style={{
                    fontSize: '32px',
                    transform: isSidebarOpen ? 'rotate(0deg)' : 'rotate(180deg)',
                  }}
                />
              </button>
              <div className="flex items-center gap-2">
                <a href="/" className="flex items-center">
                  <SiteLogo className="h-[40px] w-[145px] object-contain" />
                </a>
                <a
                  href="/help/promotions"
                  className="flex items-center justify-center transition-opacity hover:opacity-90"
                  aria-label="Promoções"
                >
                  <span
                    className="iconify i-noto:wrapped-gift"
                    data-icon="noto:wrapped-gift"
                    aria-hidden="true"
                    style={{ fontSize: '22px' }}
                  />
                </a>
              </div>
            </div>

            {/* Direita: Saldo | Botão Depositar | Conta */}
            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
            {isAuthenticated && user ? (
              <>
                <div className="flex items-center gap-1.5 rounded-lg px-1.5 py-0.5">
                  <div className="cursor-pointer text-white">
                    <span 
                      className="iconify" 
                      data-icon="fa6-solid:coins" 
                      aria-hidden="true" 
                      style={{ fontSize: '18px', color: '#FFFFFF' }}
                    ></span>
                  </div>
                  <p className="text-white font-bold text-sm">{formatSaldo(saldo)}</p>
                  <div className="relative ml-1">
                    <div className="pix rounded-full flex items-center justify-center gap-0.5 px-1 py-0.5 absolute -top-3 left-1/2 transform -translate-x-1/2 z-10" style={{ backgroundColor: '#FFD700', color: '#000000' }}>
                      <span className="iconify i-ic:baseline-pix" data-icon="ic:baseline-pix" aria-hidden="true" style={{ fontSize: '8px', color: '#000000' }}></span> <span style={{ color: '#000000', fontSize: '9px', fontWeight: '600' }}>PIX</span>
                    </div>
                    <button 
                      onClick={() => setIsDepositOpen(true)} 
                      className="h-7 w-7 rounded-lg flex items-center justify-center btn-brand-submit" 
                    style={{ 
                      color: '#FFFFFF', 
                      backgroundColor: 'var(--brand-primary)',
                      outline: 'none', 
                      border: 'none',
                      WebkitTapHighlightColor: 'transparent',
                      transition: 'none'
                    }}
                    onMouseDown={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--brand-primary)';
                    }}
                    onMouseUp={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--brand-primary)';
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--brand-primary)';
                      e.currentTarget.style.outline = 'none';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--brand-primary)';
                    }}
                  >
                    <span className="iconify" data-icon="ic:baseline-add" aria-hidden="true" style={{ fontSize: '16px' }}></span>
                  </button>
                  </div>
                </div>

                <div className="relative account-menu-container">
                  <button 
                    type="button"
                    onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                    className="flex items-center gap-1.5 md:gap-2 h-9 px-2 md:px-3 rounded-lg transition-all duration-200" 
                    style={{ backgroundColor: 'transparent' }}
                    aria-label={`Menu da conta — ${user.name}`}
                    aria-expanded={isAccountMenuOpen}
                  >
                    <img 
                      src={vipImage}
                      alt={vipProfile.vip_nome}
                      className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                    />
                    <div className="hidden md:block text-left min-w-0">
                      <p className="text-white font-semibold text-xs leading-tight truncate">{user.name}</p>
                      <p className="text-slate-400 text-[10px] leading-tight truncate">{user.email.split('@')[0]}</p>
                    </div>
                    <svg className={`w-3 h-3 text-slate-400 flex-shrink-0 transition-transform duration-200 ${isAccountMenuOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  <div className={`absolute right-0 top-full mt-2 w-56 border border-white/10 rounded-lg shadow-xl transition-all duration-200 z-[100] ${isAccountMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`} style={{ backgroundColor: headerConfig.fundo }}>
                    <div className="p-4 pb-3" style={{ backgroundColor: headerConfig.fundo }}>
                      <div className="flex items-center gap-3">
                        <img 
                          src={vipImage}
                          alt={vipProfile.vip_nome}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <p className="text-white font-bold text-sm">{user.name}</p>
                      </div>
                    </div>
                    {proximoNome ? (
                      <div className="px-4 pb-3 flex items-center gap-1.5 w-full">
                        <span className="text-xs text-white font-bold shrink-0">Próximo:</span>
                        {proximoImage && (
                          <img
                            src={proximoImage}
                            alt={proximoNome}
                            className="w-5 h-5 rounded-full object-cover shrink-0"
                          />
                        )}
                        <span className="text-xs text-white font-bold shrink-0">- </span>
                        <span className="text-xs shrink-0" style={{ color: proximoCor }}>
                          {proximoNome}
                        </span>
                        <span className="text-white text-base ml-auto shrink-0 leading-none" aria-hidden="true">
                          &gt;
                        </span>
                      </div>
                    ) : (
                      <div className="px-4 pb-3">
                        <p className="text-xs text-white font-bold">Nível máximo VIP</p>
                      </div>
                    )}
                    <div className="py-1">
                      <a href="/profile" onClick={() => setIsAccountMenuOpen(false)} className={accountMenuItemClass}>
                        <span className="iconify" data-icon="solar:user-bold-duotone" aria-hidden="true" style={{ fontSize: '20px' }}></span>
                        <span>Minha conta</span>
                      </a>
                      <a href="/wallet" onClick={() => setIsAccountMenuOpen(false)} className={accountMenuItemClass}>
                        <span className="iconify" data-icon="solar:wallet-bold-duotone" aria-hidden="true" style={{ fontSize: '20px' }}></span>
                        <span>Carteira</span>
                      </a>
                      <a href="/help/vip" onClick={() => setIsAccountMenuOpen(false)} className={accountMenuItemClass}>
                        <span className="iconify" data-icon="solar:crown-bold-duotone" aria-hidden="true" style={{ fontSize: '20px' }}></span>
                        <span>Níveis VIP</span>
                      </a>
                      <button onClick={() => { handleOpenCoupon(); setIsAccountMenuOpen(false); }} className={accountMenuButtonClass}>
                        <span className="iconify" data-icon="streamline:discount-percent-coupon-solid" aria-hidden="true" style={{ fontSize: '20px' }}></span>
                        <span>Ativar cupom</span>
                      </button>
                      <a href="/help/referral" onClick={() => setIsAccountMenuOpen(false)} className={accountMenuItemClass}>
                        <span className="iconify" data-icon="solar:users-group-two-rounded-bold-duotone" aria-hidden="true" style={{ fontSize: '20px' }}></span>
                        <span>Indicações</span>
                      </a>
                      <a href="/help/promotions" onClick={() => setIsAccountMenuOpen(false)} className={accountMenuItemClass}>
                        <span className="iconify" data-icon="ph:gift-duotone" aria-hidden="true" style={{ fontSize: '20px' }}></span>
                        <span>Promoções</span>
                      </a>
                      <a href="/help/mobile" onClick={() => setIsAccountMenuOpen(false)} className={accountMenuItemClass}>
                        <svg className="w-5 h-5 shrink-0" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                          <path d="M105.4 246.6c-12.49-12.5-12.49-32.75 0-45.25c12.5-12.5 32.76-12.5 45.25 0L224 274.8V32c0-17.67 14.33-32 32-32c17.67 0 32 14.33 32 32v242.8l73.38-73.38c12.49-12.5 32.75-12.5 45.25 0c12.49 12.5 12.49 32.75 0 45.25l-128 128C272.4 380.9 264.2 384 256 384s-16.38-3.125-22.62-9.375L105.4 246.6z" fill="currentColor" />
                          <path d="M480 352h-133.5l-45.25 45.25C289.2 409.3 273.1 416 256 416s-33.16-6.656-45.25-18.75L165.5 352H32c-17.67 0-32 14.33-32 32v96c0 17.67 14.33 32 32 32h448c17.67 0 32-14.33 32-32v-96C512 366.3 497.7 352 480 352zM432 456c-13.2 0-24-10.8-24-24c0-13.2 10.8-24 24-24s24 10.8 24 24C456 445.2 445.2 456 432 456z" fill="currentColor" opacity="0.4" />
                        </svg>
                        <span>App Download</span>
                      </a>
                      <a href="/help/support" onClick={() => setIsAccountMenuOpen(false)} className={accountMenuItemClass}>
                        <svg className="w-5 h-5 shrink-0" viewBox="0 0 640 512" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                          <path d="M640 191.1v191.1c0 35.25-28.75 63.1-64 63.1h-32v54.24c0 7.998-9.125 12.62-15.5 7.873l-82.75-62.12L319.1 447.1C284.7 447.1 256 419.2 256 383.1v-31.98l96-.002c52.88 0 96-43.12 96-95.99V128h128C611.3 128 640 156.7 640 191.1z" fill="currentColor" />
                          <path d="M352 0H64C28.75 0 0 28.75 0 63.1V256C0 291.2 28.75 320 64 320l32 .0098v54.25c0 7.998 9.125 12.62 15.5 7.875l82.75-62.12L352 319.9c35.25 .125 64-28.68 64-63.92V63.1C416 28.75 387.3 0 352 0z" fill="currentColor" opacity="0.4" />
                        </svg>
                        <span>Suporte Ao Vivo</span>
                      </a>
                      <div className="border-t border-white/10 my-1.5"></div>
                      <button
                        onClick={() => { handleLogout(); setIsAccountMenuOpen(false); }}
                        className="flex items-center gap-3 px-4 py-1.5 text-sm w-full text-left"
                        style={{ color: '#F87171', backgroundColor: 'transparent' }}
                      >
                        <span className="iconify" data-icon="majesticons:door-exit" aria-hidden="true" style={{ fontSize: '20px' }}></span>
                        <span>Sair</span>
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 md:gap-3 ml-auto">
                <button
                  onClick={() => setIsLoginOpen(true)}
                  className="h-7 md:h-8 px-3 md:px-5 rounded-full text-white text-xs md:text-sm font-semibold transition-all duration-200 hover:opacity-90 whitespace-nowrap"
                  style={{ backgroundColor: 'transparent' }}
                >
                  Entrar
                </button>
                <button
                  onClick={() => setIsRegisterOpen(true)}
                  className="relative isolate overflow-hidden rounded-lg text-white text-xs md:text-sm font-semibold transition-all duration-200 hover:opacity-90 whitespace-nowrap flex items-center justify-center"
                  style={{
                    backgroundColor: 'var(--brand-primary)',
                    width: '121px',
                    height: '40px',
                    boxShadow:
                      '0 0 14px rgb(var(--brand-primary-rgb) / 0.48), 0 0 28px rgb(var(--brand-primary-rgb) / 0.48), inset 0 1px 0 rgba(255, 255, 255, 0.14)',
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
                  <span className="relative z-10">
                    <span className="hidden md:inline">Cadastre-se</span>
                    <span className="md:hidden">Cadastrar</span>
                  </span>
                </button>
              </div>
            )}
            </div>
          </div>
          </div>
      </header>
      </div>

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
          // Recarregar saldo após fechar o modal de depósito
          fetchSaldo();
        }} 
      />
    </>
  );
}
