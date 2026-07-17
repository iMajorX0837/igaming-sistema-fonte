import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useHomeConfig } from '../hooks/useHomeConfig';
import Notification from './Notification';
import SiteLogo from './SiteLogo';
import { useAuth } from '../contexts/AuthContext';
import {
  ativarCupom,
  formatCupomBonus,
  formatCupomGiros,
  getCupomErrorMessage,
  validarCupom,
} from '../lib/cupons';

const MODAL_ANIM_MS = 320;

interface CouponModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CouponModal({ isOpen, onClose }: CouponModalProps) {
  const { isAuthenticated } = useAuth();
  const { config: homeConfig } = useHomeConfig();
  const [couponCode, setCouponCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [activating, setActivating] = useState(false);
  const [validated, setValidated] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [shouldMount, setShouldMount] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);

  const resetState = () => {
    setCouponCode('');
    setValidating(false);
    setActivating(false);
    setValidated(false);
    setNotification(null);
  };

  useEffect(() => {
    if (!isOpen) return;
    resetState();
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setShouldMount(true);
      setIsClosing(false);
      return;
    }

    if (!shouldMount) return;

    setIsClosing(true);
    const timer = window.setTimeout(() => {
      setShouldMount(false);
      setIsClosing(false);
      resetState();
    }, MODAL_ANIM_MS);

    return () => window.clearTimeout(timer);
  }, [isOpen, shouldMount]);

  const handleClose = () => {
    onClose();
  };

  const handleValidate = async () => {
    if (!couponCode.trim() || validating || activating) return;

    if (!isAuthenticated) {
      setNotification({ message: 'Faça login para usar cupons.', type: 'error' });
      return;
    }

    setValidating(true);
    setValidated(false);

    try {
      const result = await validarCupom(couponCode);

      if (!result.ok) {
        setNotification({
          message: getCupomErrorMessage(result.error, result.deposito_minimo),
          type: 'error',
        });
        return;
      }

      if (result.requer_deposito) {
        setNotification({
          message: result.mensagem ?? 'Este cupom deve ser usado durante um depósito.',
          type: 'error',
        });
        return;
      }

      setValidated(true);
      const preview =
        result.tipo_bonus === 'giros_gratis'
          ? `Cupom válido! ${formatCupomGiros(result.quantidade_giros ?? 0, result.jogo_nome)}.`
          : `Cupom válido! Bônus de ${formatCupomBonus(result.bonus_calculado ?? 0)}.`;
      setNotification({
        message: preview,
        type: 'success',
      });
    } catch {
      setNotification({ message: 'Erro ao validar cupom. Tente novamente.', type: 'error' });
    } finally {
      setValidating(false);
    }
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!couponCode.trim() || activating || validating) return;

    if (!isAuthenticated) {
      setNotification({ message: 'Faça login para usar cupons.', type: 'error' });
      return;
    }

    setActivating(true);

    try {
      const result = await ativarCupom(couponCode);

      if (!result.ok) {
        setNotification({
          message: getCupomErrorMessage(result.error),
          type: 'error',
        });
        return;
      }

      const successMessage =
        result.tipo_bonus === 'giros_gratis'
          ? `Cupom ativado! ${formatCupomGiros(result.quantidade_giros ?? 0, result.jogo_nome)} disponíveis.`
          : `Cupom ativado! ${formatCupomBonus(result.valor_bonus ?? 0)} creditados no seu saldo.`;

      setNotification({
        message: successMessage,
        type: 'success',
      });
      setCouponCode('');
      setValidated(false);

      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch {
      setNotification({ message: 'Erro ao ativar cupom. Tente novamente.', type: 'error' });
    } finally {
      setActivating(false);
    }
  };

  if (!shouldMount) return null;

  const backdropAnimation = isClosing ? 'animate-modal-backdrop-out' : 'animate-modal-backdrop-in';
  const panelAnimation = isClosing ? 'animate-modal-panel-out' : 'animate-modal-panel-in';

  return (
    <>
      {notification && (
        <Notification
          isOpen={true}
          onClose={() => setNotification(null)}
          message={notification.message}
          duration={4000}
        />
      )}

      <div
        className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 ${backdropAnimation}`}
        onClick={handleClose}
      >
        <div
          className={`relative flex h-[328px] w-[500px] max-w-[calc(100vw-2rem)] shrink-0 flex-col overflow-hidden rounded-xl shadow-2xl ${panelAnimation}`}
          style={{ backgroundColor: homeConfig.fundo }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center transition-all duration-200"
          >
            <X className="h-4 w-4 text-slate-300 transition-colors hover:text-white" />
          </button>

          <div className="flex h-[80px] w-full shrink-0 items-center justify-center">
            <SiteLogo alt="Cupom" className="h-12 object-contain" />
          </div>

          <div className="flex min-h-0 flex-1 flex-col px-6 pb-6">
            <form onSubmit={handleActivate} className="flex h-full min-h-0 flex-col gap-3">
              <div className="shrink-0">
                <h2 className="text-[20px] font-bold text-white">Cupom</h2>
                <p className="mt-0.5 text-[14px] text-slate-400">Ative um cupom na sua conta</p>
              </div>

              <div className="shrink-0">
                <div className="relative mx-auto h-[49px] w-[452px] max-w-full">
                  <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
                    <span
                      className="iconify i-streamline:discount-percent-coupon-solid"
                      data-icon="streamline:discount-percent-coupon-solid"
                      aria-hidden="true"
                      style={{ fontSize: '20px', color: '#ffffff' }}
                    />
                  </div>
                  <input
                    type="text"
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value.toUpperCase());
                      setValidated(false);
                    }}
                    placeholder="Insira o código do cupom"
                    className="h-[49px] w-full rounded-lg border-2 border-brand pl-10 pr-24 text-sm text-white placeholder-slate-500 transition-all focus:outline-none focus:ring-2 focus:ring-brand/50"
                    style={{ backgroundColor: homeConfig.fundo }}
                  />
                  <button
                    type="button"
                    onClick={handleValidate}
                    className="absolute right-1.5 top-1/2 flex h-[31px] w-[75px] -translate-y-1/2 items-center justify-center rounded-md bg-brand text-xs font-bold text-white transition-all duration-200 hover:bg-brand-hover"
                  >
                    {validating ? 'Validando...' : 'Validar'}
                  </button>
                </div>
                {validated && (
                  <p className="mt-1.5 text-xs font-medium text-green-400">Cupom validado com sucesso!</p>
                )}
                <div className="mt-3 h-px bg-white/10" />
              </div>

              <button
                type="submit"
                className="relative isolate mt-auto flex h-[52px] w-full items-center justify-center overflow-hidden rounded-lg text-sm font-bold text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
                style={{
                  backgroundColor: 'var(--brand-primary)',
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
                  {activating ? 'Ativando...' : 'Ativar cupom'}
                </span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
