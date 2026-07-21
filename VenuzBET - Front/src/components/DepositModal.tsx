import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import Notification from './Notification';
import { useAuth } from '../contexts/AuthContext';
import {
  checkMisticPayTransaction,
  createMisticPayTransaction,
  type MisticPayTransactionResult,
} from '../lib/misticpay';
import { generatePixQrDataUrl, resolvePixQrImageSrc } from '../lib/pixQrImage';
import { dispatchVipProfileUpdated, formatBRL, type DepositVipResult } from '../lib/vip';
import { usePlataformaConfig } from '../hooks/usePlataformaConfig';
import { useHomeConfig } from '../hooks/useHomeConfig';
import { useAuthModalsConfig } from '../contexts/SiteConfigContext';
import SiteLogo from './SiteLogo';
import {
  formatCupomBonus,
  getCupomErrorMessage,
  validarCupom,
  type ValidarCupomResult,
} from '../lib/cupons';

const PIX_CHECK_INTERVAL_MS = 10_000;
const PIX_PAYMENT_TIMEOUT_MS = 30 * 60 * 1000;
const MODAL_ANIM_MS = 320;

type PixSession = {
  result: MisticPayTransactionResult;
  depositoId: string | null;
  checkTransactionId: string;
  amount: number;
  expiresAt: number;
};

function formatPixCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function parseReaisInt(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, '').replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) return null;
  return n;
}

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DepositModal({ isOpen, onClose }: DepositModalProps) {
  const { isAuthenticated, user } = useAuth();
  const { config } = usePlataformaConfig();
  const { config: homeConfig } = useHomeConfig();
  const { config: authModalsConfig } = useAuthModalsConfig();
  const depositImageUrl = authModalsConfig.deposit_imagem_url.trim();
  const minDeposit = config.deposito_minimo;
  const maxDeposit = config.deposito_maximo;
  const [amount, setAmount] = useState('20');
  const [couponCode, setCouponCode] = useState('');
  const [showCouponInput, setShowCouponInput] = useState(false);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [validatedCoupon, setValidatedCoupon] = useState<ValidarCupomResult | null>(null);
  const [showInvalidCouponPopup, setShowInvalidCouponPopup] = useState(false);
  const [couponPopupMessage, setCouponPopupMessage] = useState('');
  const [limitNotification, setLimitNotification] = useState<string | null>(null);
  const [couponBonusInfo, setCouponBonusInfo] = useState<{ codigo: string; valor: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pixSession, setPixSession] = useState<PixSession | null>(null);
  const [pixPaid, setPixPaid] = useState(false);
  const [vipUpgradeInfo, setVipUpgradeInfo] = useState<DepositVipResult | null>(null);
  const [pixCheckError, setPixCheckError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pixTimeLeftMs, setPixTimeLeftMs] = useState(0);
  const [qrSrc, setQrSrc] = useState<string | null>(null);
  const [shouldMount, setShouldMount] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);

  const resetPixState = useCallback(() => {
    setPixSession(null);
    setPixPaid(false);
    setVipUpgradeInfo(null);
    setPixCheckError(null);
    setError(null);
    setCopied(false);
    setIsSubmitting(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    resetPixState();
    setAmount(String(minDeposit));
    setCouponCode('');
    setShowCouponInput(false);
    setValidatedCoupon(null);
    setCouponBonusInfo(null);
  }, [isOpen, resetPixState, minDeposit]);

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
      resetPixState();
    }, MODAL_ANIM_MS);

    return () => window.clearTimeout(timer);
  }, [isOpen, shouldMount, resetPixState]);

  useEffect(() => {
    if (!isOpen || !pixSession || pixPaid) return;

    let cancelled = false;
    let completed = false;

    const runCheck = async () => {
      if (cancelled || completed) return;
      try {
        const checkResult = await checkMisticPayTransaction(pixSession.checkTransactionId, {
          depositoId: pixSession.depositoId,
          cupom_codigo: validatedCoupon?.ok ? couponCode.trim() : null,
        });
        if (cancelled || completed) return;

        const state = checkResult.transactionState.toUpperCase();
        if (state === 'PENDENTE') return;

        if (state === 'COMPLETO' || checkResult.paid) {
          completed = true;

          if (checkResult.confirmError) {
            setPixCheckError(checkResult.confirmError);
          } else {
            dispatchVipProfileUpdated();
          }

          if (checkResult.vip?.subiu_nivel) {
            setVipUpgradeInfo(checkResult.vip as DepositVipResult);
          }

          if (checkResult.cupomBonus) {
            setCouponBonusInfo({
              codigo: checkResult.cupomBonus.codigo,
              valor: checkResult.cupomBonus.valor,
            });
          }

          setPixPaid(true);
        }
      } catch (e) {
        if (cancelled) return;
        console.error('checkMisticPayTransaction:', e);
      }
    };

    void runCheck();
    const intervalId = window.setInterval(runCheck, PIX_CHECK_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [isOpen, pixSession, pixPaid]);

  useEffect(() => {
    if (!isOpen || !pixSession || pixPaid) {
      setPixTimeLeftMs(0);
      return;
    }

    const tick = () => {
      setPixTimeLeftMs(Math.max(0, pixSession.expiresAt - Date.now()));
    };

    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [isOpen, pixSession, pixPaid]);

  useEffect(() => {
    if (!pixSession?.result) {
      setQrSrc(null);
      return;
    }

    const fromApi = resolvePixQrImageSrc(pixSession.result);
    if (fromApi) {
      setQrSrc(fromApi);
      return;
    }

    let cancelled = false;
    void generatePixQrDataUrl(pixSession.result.copyPaste).then((generated) => {
      if (!cancelled) {
        setQrSrc(generated);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [pixSession?.result]);

  if (!shouldMount) return null;

  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) return;

    const valor = parseReaisInt(amount);
    setValidatingCoupon(true);
    setValidatedCoupon(null);

    try {
      const result = await validarCupom(couponCode, valor ?? undefined);

      if (!result.ok) {
        setCouponPopupMessage(getCupomErrorMessage(result.error, result.deposito_minimo));
        setShowInvalidCouponPopup(true);
        return;
      }

      if (result.requer_deposito && (valor == null || valor <= 0)) {
        setCouponPopupMessage('Informe o valor do depósito para validar este cupom.');
        setShowInvalidCouponPopup(true);
        return;
      }

      setValidatedCoupon(result);
      setCouponPopupMessage(
        `Cupom válido! Bônus de ${formatCupomBonus(result.bonus_calculado ?? 0)} será creditado após o pagamento.`
      );
      setShowInvalidCouponPopup(true);
    } catch {
      setCouponPopupMessage('Erro ao validar cupom. Tente novamente.');
      setShowInvalidCouponPopup(true);
    } finally {
      setValidatingCoupon(false);
    }
  };

  const presetAmounts = [
    { value: 20, label: 'R$ 20,00' },
    { value: 50, label: 'R$ 50,00' },
    { value: 100, label: 'R$ 100,00' },
    { value: 250, label: 'R$ 250,00' },
    { value: 500, label: 'R$ 500,00' },
    { value: 1000, label: 'R$ 1.000,00' },
  ];

  const handleIncrement = () => {
    const currentAmount = parseReaisInt(amount) ?? minDeposit;
    const next = Math.min(currentAmount + 1, maxDeposit);
    setAmount(String(next));
  };

  const handleDecrement = () => {
    const currentAmount = parseReaisInt(amount) ?? minDeposit;
    if (currentAmount > minDeposit) {
      setAmount(String(currentAmount - 1));
    }
  };

  const handleAmountBlur = () => {
    const v = parseReaisInt(amount);
    if (v == null) return;
    if (v < minDeposit) {
      setAmount(String(minDeposit));
    } else if (v > maxDeposit) {
      setAmount(String(maxDeposit));
    }
  };

  const handlePresetAmount = (value: number) => {
    setAmount(String(value));
  };

  const handleCopyPix = async () => {
    if (!pixSession?.result.copyPaste) return;
    try {
      await navigator.clipboard.writeText(pixSession.result.copyPaste);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Não foi possível copiar. Copie manualmente o código abaixo.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isAuthenticated || !user) {
      setError('Faça login para depositar.');
      return;
    }

    const valor = parseReaisInt(amount);
    if (valor === null) {
      setLimitNotification(`Informe um valor inteiro em reais (mínimo R$ ${minDeposit},00).`);
      return;
    }
    if (valor < minDeposit) {
      setLimitNotification(`Informe um valor mínimo de R$ ${minDeposit},00.`);
      return;
    }
    if (valor > maxDeposit) {
      setLimitNotification(`O valor máximo para depósito é R$ ${maxDeposit.toLocaleString('pt-BR')},00.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createMisticPayTransaction({
        amount: valor,
        cupom_codigo: validatedCoupon?.ok ? couponCode.trim().toUpperCase() : null,
      });

      const checkTransactionId = result.checkTransactionId ?? result.externalTransactionId ?? '';
      setPixSession({
        result,
        depositoId: result.depositoId ?? null,
        checkTransactionId,
        amount: result.amount ?? valor,
        expiresAt: Date.now() + PIX_PAYMENT_TIMEOUT_MS,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar o PIX. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const pixResult = pixSession?.result;

  const pixPaymentProgressPct = pixSession
    ? Math.min(100, Math.max(0, (pixTimeLeftMs / PIX_PAYMENT_TIMEOUT_MS) * 100))
    : 0;


  const handleClose = () => {
    onClose();
  };

  const backdropAnimation = isClosing ? 'animate-modal-backdrop-out' : 'animate-modal-backdrop-in';
  const panelAnimation = isClosing ? 'animate-modal-panel-out' : 'animate-modal-panel-in';

  return (
    <>
      <Notification
        isOpen={showInvalidCouponPopup}
        onClose={() => setShowInvalidCouponPopup(false)}
        message={couponPopupMessage || 'Cupom inválido ou expirado!'}
      />
      <Notification
        isOpen={limitNotification !== null}
        onClose={() => setLimitNotification(null)}
        message={limitNotification ?? ''}
      />
      <div
        className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 ${backdropAnimation}`}
      >
        <div
          className={`relative flex w-[500px] max-w-[calc(100vw-2rem)] max-h-[90vh] flex-col overflow-hidden rounded-xl shadow-2xl ${panelAnimation}`}
          style={{ backgroundColor: homeConfig.fundo }}
        >
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-3 right-3 z-10 w-7 h-7 flex items-center justify-center transition-all duration-200"
        >
          <X className="w-4 h-4 text-slate-300 hover:text-white transition-colors" />
        </button>

        <div
          className="relative flex w-full shrink-0 justify-center items-center overflow-hidden"
          style={{ backgroundColor: homeConfig.fundo }}
        >
          {depositImageUrl ? (
            <img
              src={depositImageUrl}
              alt="Depósito"
              className="w-full h-auto object-contain"
            />
          ) : (
            <div className="w-full px-4 py-3 flex justify-center">
              <SiteLogo className="h-12 w-auto max-w-full object-contain" />
            </div>
          )}
        </div>

        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-6 pt-4 pb-5">
          {pixPaid ? (
            <div className="space-y-4 text-center">
              <p className="text-4xl" aria-hidden>
                ✓
              </p>
              <div>
                <h2 className="text-white font-bold text-lg mb-0.5">Pagamento confirmado</h2>
                <p className="text-slate-400 text-xs">
                  {pixCheckError
                    ? pixCheckError
                    : 'Seu depósito foi aprovado e o saldo foi atualizado.'}
                </p>
                {couponBonusInfo && (
                  <div className="mt-3 rounded-lg border border-green-500/40 bg-green-500/10 p-3 text-left">
                    <p className="text-green-300 text-sm font-bold">
                      Cupom {couponBonusInfo.codigo} aplicado!
                    </p>
                    <p className="text-slate-300 text-xs mt-1">
                      Bônus: {formatCupomBonus(couponBonusInfo.valor)}
                    </p>
                  </div>
                )}
                {vipUpgradeInfo?.subiu_nivel && (
                  <div className="mt-3 rounded-lg border border-brand/40 bg-brand/10 p-3 text-left">
                    <p className="text-brand-light text-sm font-bold">
                      Parabéns! Você subiu para {vipUpgradeInfo.vip_nome}!
                    </p>
                    {(vipUpgradeInfo.bonus_upgrade ?? 0) > 0 && (
                      <p className="text-slate-300 text-xs mt-1">
                        Bônus de upgrade: {formatBRL(vipUpgradeInfo.bonus_upgrade ?? 0)}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  resetPixState();
                }}
                className="w-full h-10 rounded-lg bg-brand hover:bg-brand-hover text-white font-bold text-sm transition-all"
              >
                Concluir
              </button>
            </div>
          ) : pixResult ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-white font-bold text-lg mb-0.5">Realizar pagamento</h2>
                <p className="text-slate-400 text-xs">Aponte a câmera do seu celular para o QRCode</p>
              </div>
              {qrSrc ? (
                <div className="flex justify-center">
                  <div className="bg-white inline-block">
                    <img src={qrSrc} alt="QR Code PIX" className="max-h-52 w-auto object-contain block" />
                  </div>
                </div>
              ) : null}
              <div
                className="rounded-lg border border-dashed border-brand px-4 py-4 space-y-3 text-center"
                style={{ backgroundColor: homeConfig.fundo }}
              >
                <p className="text-white font-bold text-xl">
                  {formatBRL(pixSession?.amount ?? parseReaisInt(amount) ?? 0)}
                </p>
                {pixResult.copyPaste ? (
                  <>
                    <p className="text-slate-300 text-xs font-mono truncate px-1">{pixResult.copyPaste}</p>
                    <button
                      type="button"
                      onClick={handleCopyPix}
                      className="w-full h-10 rounded-lg bg-brand hover:bg-brand-hover text-white font-bold text-sm transition-all"
                    >
                      {copied ? 'Copiado!' : 'Copiar copia e cola'}
                    </button>
                  </>
                ) : null}
                <p className="text-slate-400 text-xs">
                  O tempo para pagar acaba em:{' '}
                  <span className="text-white font-semibold tabular-nums">
                    {formatPixCountdown(pixTimeLeftMs)}
                  </span>
                </p>
                <div className="h-1.5 w-full rounded-full bg-slate-600/50 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand transition-[width] duration-1000 linear"
                    style={{ width: `${pixPaymentProgressPct}%` }}
                  />
                </div>
              </div>
              <div className="owner-alert">
                <span
                  className="iconify i-material-symbols:brightness-alert-outline"
                  aria-hidden="true"
                  style={{ fontSize: '48px' }}
                />
                <span>
                  Apenas depósitos de contas bancárias cujo CPF corresponda ao do titular serão aceitos.
                </span>
              </div>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <h2 className="text-white font-bold text-lg mb-0.5">Depósito</h2>
              <p className="text-white text-xs font-bold">Adicione saldo à sua conta</p>
            </div>

            {error ? (
              <p className="text-red-400 text-xs rounded-lg bg-red-950/40 border border-red-800/50 px-3 py-2">
                {error}
              </p>
            ) : null}

            <div>
              <label className="text-white text-xs font-medium mb-1.5 block">Valor a ser depositado</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-sm font-medium">R$</span>
                  <input
                    type="number"
                    min={minDeposit}
                    max={maxDeposit}
                    step={1}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    onBlur={handleAmountBlur}
                    disabled={isSubmitting}
                    className="w-full h-9 pl-10 pr-3 rounded-lg border-2 border-brand text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/50 transition-all [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-50"
                    style={{ backgroundColor: homeConfig.fundo }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleIncrement}
                  disabled={isSubmitting}
                  className="w-9 h-9 rounded-lg bg-brand hover:bg-brand-hover flex items-center justify-center text-white transition-all font-bold text-lg disabled:opacity-50"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={handleDecrement}
                  disabled={isSubmitting}
                  className="w-9 h-9 rounded-lg bg-brand hover:bg-brand-hover flex items-center justify-center text-white transition-all font-bold text-lg disabled:opacity-50"
                >
                  −
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 overflow-hidden">
              {presetAmounts.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => handlePresetAmount(item.value)}
                  disabled={isSubmitting}
                  className="relative h-9 rounded-lg bg-brand/10 hover:bg-brand/20 border-0 text-brand font-bold text-xs transition-all flex items-center justify-center disabled:opacity-50"
                >
                  {item.label}
                  <span className="absolute -top-1 -right-1 bg-yellow-400 text-slate-900 text-[7px] font-black px-1 py-0 rounded-sm">HOT</span>
                </button>
              ))}
            </div>

            <div className="h-px w-full bg-slate-600/60" />

            {!showCouponInput ? (
              <button
                type="button"
                onClick={() => setShowCouponInput(true)}
                disabled={isSubmitting}
                className="btn-coupon flex w-full items-center gap-2 py-1 text-white hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span
                  className="iconify i-streamline:discount-percent-coupon-solid"
                  data-icon="streamline:discount-percent-coupon-solid"
                  aria-hidden="true"
                  style={{ fontSize: '24px' }}
                />
                <p className="text-sm font-medium">Adicionar cupom</p>
              </button>
            ) : (
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-light pointer-events-none">
                <span
                  className="iconify i-streamline:discount-percent-coupon-solid"
                  data-icon="streamline:discount-percent-coupon-solid"
                  aria-hidden="true"
                  style={{ fontSize: '16px' }}
                />
              </div>
              <input
                type="text"
                value={couponCode}
                onChange={(e) => {
                  setCouponCode(e.target.value.toUpperCase());
                  setValidatedCoupon(null);
                }}
                placeholder="Cupom de desconto (opcional)"
                disabled={isSubmitting}
                autoFocus
                className="w-full h-9 pl-9 pr-20 rounded-lg border-2 border-brand text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand/50 transition-all disabled:opacity-50"
                style={{ backgroundColor: homeConfig.fundo }}
              />
              <button
                type="button"
                onClick={handleValidateCoupon}
                disabled={!couponCode || validatingCoupon || isSubmitting}
                className="absolute right-1 top-1/2 -translate-y-1/2 px-2.5 h-7 rounded-md bg-brand hover:bg-brand-hover disabled:bg-brand/50 disabled:cursor-not-allowed text-white font-bold text-xs transition-all duration-200"
              >
                {validatingCoupon ? 'Validando...' : 'Validar'}
              </button>
            </div>
            )}
            {validatedCoupon?.ok && (
              <p className="text-xs text-green-400 font-medium">
                Cupom validado — bônus de {formatCupomBonus(validatedCoupon.bonus_calculado ?? 0)} após pagamento.
              </p>
            )}

            <div className="h-px w-full bg-slate-600/60" />

            <button
              type="submit"
              disabled={isSubmitting}
              className="h-[52px] w-full rounded-lg bg-brand hover:bg-brand-hover disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm transition-all duration-200 active:scale-[0.98] btn-brand-submit"
            >
              {isSubmitting ? 'Gerando PIX...' : 'Depositar'}
            </button>
          </form>
          )}
        </div>
        </div>
      </div>
    </>
  );
}
