import { useState, useRef, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { usePlataformaConfig } from '../hooks/usePlataformaConfig';
import { useUserProfileData } from '../hooks/useUserProfileData';
import { useTranslation } from '../hooks/useTranslation';
import type { UserProfileData } from '../lib/userProfileCache';
import SiteLogo from './SiteLogo';
import Notification from './Notification';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const pixOptions = [
  { id: 'email', icon: 'email' },
  { id: 'cpf', icon: 'cpf' },
  { id: 'phone', icon: 'phone' },
] as const;

type PixTypeId = (typeof pixOptions)[number]['id'];

const MODAL_ANIM_MS = 320;

function getPixKeyForType(
  type: PixTypeId,
  profile: UserProfileData,
  fallbackEmail?: string
): string {
  switch (type) {
    case 'email':
      return profile.email || fallbackEmail || '';
    case 'cpf':
      return (profile.cpf || '').replace(/\D/g, '');
    case 'phone':
      return (profile.telefone || '').replace(/\D/g, '').replace(/^55/, '');
    default:
      return '';
  }
}

export default function WithdrawModal({ isOpen, onClose }: WithdrawModalProps) {
  const { isAuthenticated, user } = useAuth();
  const { config } = usePlataformaConfig();
  const { userData } = useUserProfileData(isOpen);
  const { t, locale } = useTranslation();
  const minWithdraw = config.saque_minimo;
  const maxWithdraw = config.saque_maximo;
  const [amount, setAmount] = useState('50');
  const [pixType, setPixType] = useState<PixTypeId>('email');
  const [pixKey, setPixKey] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [availableBalance, setAvailableBalance] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [rolloverPendente, setRolloverPendente] = useState(0);
  const [shouldMount, setShouldMount] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const prevIsOpenRef = useRef<boolean>(false);

  const resetModalUiState = useCallback(() => {
    setIsDropdownOpen(false);
    setError(null);
    setSuccess(false);
    setIsSubmitting(false);
  }, []);

  // Função para buscar saldo do usuário
  const fetchSaldo = useCallback(async () => {
    if (isAuthenticated && user) {
      try {
        const { data, error } = await supabase
          .from('usuarios')
          .select('saldo')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Erro ao buscar saldo:', error);
          setAvailableBalance(0);
          return;
        }

        if (data) {
          setAvailableBalance(data.saldo || 0);
        } else {
          setAvailableBalance(0);
        }
      } catch (error) {
        console.error('Erro ao buscar saldo:', error);
        setAvailableBalance(0);
      }
    } else {
      setAvailableBalance(0);
    }
  }, [isAuthenticated, user]);

  const fetchRollover = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setRolloverPendente(0);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('obter_rollover_usuario');
      if (error) {
        console.error('Erro ao buscar rollover:', error);
        setRolloverPendente(0);
        return;
      }

      const result = data as { ok?: boolean; rollover_pendente?: number };
      if (result?.ok) {
        setRolloverPendente(Number(result.rollover_pendente) || 0);
      } else {
        setRolloverPendente(0);
      }
    } catch (error) {
      console.error('Erro ao buscar rollover:', error);
      setRolloverPendente(0);
    }
  }, [isAuthenticated, user]);

  // Buscar saldo quando o modal abrir e o usuário estiver autenticado
  useEffect(() => {
    if (isOpen) {
      fetchSaldo();
      void fetchRollover();
      // Resetar estados apenas quando o modal for aberto após estar fechado
      if (!prevIsOpenRef.current) {
        setError(null);
        setSuccess(false);
        setAmount(String(minWithdraw));
        setPixType('email');
      }
      prevIsOpenRef.current = true;
    } else {
      prevIsOpenRef.current = false;
    }
  }, [isOpen, fetchSaldo, fetchRollover, minWithdraw]);

  useEffect(() => {
    if (!isOpen) return;
    setPixKey(getPixKeyForType(pixType, userData, user?.email));
  }, [isOpen, pixType, userData, user?.email]);

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
      resetModalUiState();
    }, MODAL_ANIM_MS);

    return () => window.clearTimeout(timer);
  }, [isOpen, shouldMount, resetModalUiState]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (iconType: string) => {
    switch (iconType) {
      case 'email':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 8l9 6 9-6M3 8v10a2 2 0 002 2h14a2 2 0 002-2V8" />
          </svg>
        );
      case 'cpf':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="9" y1="9" x2="15" y2="9" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
        );
      case 'phone':
        return (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
          </svg>
        );
      default:
        return null;
    }
  };

  if (!shouldMount) return null;

  const handleClose = () => {
    onClose();
  };

  const backdropAnimation = isClosing ? 'animate-modal-backdrop-out' : 'animate-modal-backdrop-in';
  const panelAnimation = isClosing ? 'animate-modal-panel-out' : 'animate-modal-panel-in';

  const notify = (message: string) => {
    setNotification(message);
    setError(null);
  };

  const handleIncrement = () => {
    const currentAmount = parseInt(amount, 10) || minWithdraw;
    const cap = Math.min(maxWithdraw, availableBalance || maxWithdraw);
    const next = Math.min(currentAmount + 1, cap);
    setAmount(String(next));
  };

  const handleDecrement = () => {
    const currentAmount = parseInt(amount, 10) || minWithdraw;
    if (currentAmount > minWithdraw) {
      setAmount(String(currentAmount - 1));
    }
  };

  const handleAmountBlur = () => {
    const v = parseFloat(String(amount).replace(',', '.'));
    if (!Number.isFinite(v)) return;
    const cap = Math.min(maxWithdraw, availableBalance || maxWithdraw);
    if (v > cap) {
      setAmount(String(Math.floor(cap)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!isAuthenticated || !user) {
      notify(t.depositWithdraw.authRequired);
      return;
    }

    if (availableBalance < minWithdraw) {
      notify(t.depositWithdraw.insufficientBalance);
      return;
    }

    const valorSaque = parseFloat(String(amount).trim().replace(',', '.'));

    if (!Number.isFinite(valorSaque) || valorSaque <= 0) {
      notify(t.depositWithdraw.invalidAmount);
      return;
    }

    if (valorSaque < minWithdraw) {
      notify(t.depositWithdraw.minWithdraw(minWithdraw));
      return;
    }

    if (valorSaque > maxWithdraw) {
      notify(t.depositWithdraw.maxWithdraw(maxWithdraw.toLocaleString(locale)));
      return;
    }

    if (valorSaque > availableBalance) {
      notify(t.depositWithdraw.insufficientForWithdraw);
      return;
    }

    if (rolloverPendente > 0) {
      notify(
        t.depositWithdraw.rolloverPending(rolloverPendente.toFixed(2).replace('.', ','))
      );
      return;
    }

    if (!pixKey || pixKey.trim() === '') {
      notify(t.depositWithdraw.pixKeyRequired);
      return;
    }

    setIsSubmitting(true);

    try {
      // Buscar saldo atual do banco antes de processar (evita race condition)
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('saldo')
        .eq('id', user.id)
        .maybeSingle();

      if (usuarioError) {
        throw new Error(usuarioError.message || t.depositWithdraw.balanceFetchError);
      }

      if (!usuarioData) {
        throw new Error(t.depositWithdraw.userNotFound);
      }

      const saldoAtual = parseFloat(usuarioData.saldo) || 0;

      if (valorSaque < minWithdraw) {
        throw new Error(t.depositWithdraw.minWithdraw(minWithdraw));
      }

      if (valorSaque > maxWithdraw) {
        throw new Error(t.depositWithdraw.maxWithdraw(maxWithdraw.toLocaleString(locale)));
      }

      // Validar saldo novamente com o valor atual do banco
      if (valorSaque > saldoAtual) {
        throw new Error(t.depositWithdraw.insufficientForWithdraw);
      }

      const mapPixTypeToKey = (type: PixTypeId): string => (type === 'phone' ? 'telefone' : type);

      // Débito + insert pendente na mesma transação (RPC atômica)
      const { data: rpcResult, error: rpcError } = await supabase.rpc('solicitar_saque', {
        p_valor: valorSaque,
        p_key: mapPixTypeToKey(pixType),
        p_chave: pixKey.trim(),
        p_origem: 'pix',
      });

      if (rpcError) {
        throw new Error(rpcError.message || t.depositWithdraw.withdrawProcessError);
      }

      if (!rpcResult || !rpcResult.success) {
        throw new Error(rpcResult?.error || t.depositWithdraw.withdrawProcessError);
      }

      const saldoAtualizado =
        parseFloat(rpcResult.saldo_atual) || saldoAtual - valorSaque;
      setAvailableBalance(saldoAtualizado);
      void fetchSaldo();
      onClose();

    } catch (err: any) {
      console.error('Erro ao processar saque:', err);
      setError(err.message || t.depositWithdraw.withdrawProcessError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <Notification
      isOpen={notification !== null}
      onClose={() => setNotification(null)}
      message={notification ?? ''}
    />
    <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 ${backdropAnimation}`}>
      <div className={`relative flex w-full max-w-sm max-h-[90vh] flex-col overflow-hidden rounded-xl shadow-2xl bg-[#121319] ${panelAnimation}`}>
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-10 w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center transition-all duration-200 border border-slate-600 hover:border-slate-500"
        >
          <X className="w-4 h-4 text-slate-300 hover:text-white transition-colors" />
        </button>

        <div className="relative flex w-full shrink-0 justify-center items-center py-6 bg-[#121319] rounded-t-xl">
          <SiteLogo className="h-10 w-auto max-w-[min(100%,200px)] object-contain" />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <h2 className="text-white font-bold text-lg mb-0.5">{t.depositWithdraw.withdrawTitle}</h2>
              <p className="text-slate-400 text-xs">{t.depositWithdraw.withdrawSubtitle}</p>
            </div>

            <div>
              <label className="text-white text-xs font-medium mb-1.5 block">{t.depositWithdraw.withdrawAmount}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-sm font-medium">$</span>
                <input
                  type="number"
                  min={minWithdraw}
                  max={maxWithdraw}
                  step={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onBlur={handleAmountBlur}
                  disabled={isSubmitting}
                  className="w-full h-9 pl-7 pr-16 rounded-lg bg-[#181923] border-2 border-brand text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/50 transition-all [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-50"
                />
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={handleDecrement}
                    disabled={isSubmitting}
                    className="w-6 h-6 rounded bg-brand hover:bg-brand-hover flex items-center justify-center text-white transition-all font-bold text-sm disabled:opacity-50"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={handleIncrement}
                    disabled={isSubmitting}
                    className="w-6 h-6 rounded bg-brand hover:bg-brand-hover flex items-center justify-center text-white transition-all font-bold text-sm disabled:opacity-50"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <svg className="w-4 h-4 text-slate-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4M12 8h.01" />
              </svg>
              <span className="text-slate-300">
                {t.depositWithdraw.availableForWithdraw}: <span className="text-white font-bold">R$ {availableBalance.toFixed(2)}</span>
              </span>
            </div>

            {rolloverPendente > 0 ? (
              <div className="p-3 rounded-lg bg-amber-500/15 border border-amber-500/40">
                <p className="text-amber-300 text-xs font-medium">
                  {t.depositWithdraw.rolloverPending(rolloverPendente.toFixed(2).replace('.', ','))}
                </p>
              </div>
            ) : null}

            {/* Mensagens de erro e sucesso */}
            {error && (
              <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50">
                <p className="text-red-400 text-xs font-medium">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-3 rounded-lg bg-brand/20 border border-brand/50">
                <p className="text-brand-light text-xs font-medium">
                  {t.depositWithdraw.withdrawSuccess}
                </p>
              </div>
            )}

            <div className="border-t border-slate-700/50 pt-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 text-xs mb-1.5 block">{t.depositWithdraw.pixKeyType}</label>
                  <div className="relative" ref={dropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      disabled={isSubmitting}
                      className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#181923] border-2 border-brand text-white text-xs flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-brand/50 transition-all text-left disabled:opacity-50"
                    >
                      <span>{t.depositWithdraw.pixTypes[pixType]}</span>
                      <svg className="w-3 h-3 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-light pointer-events-none">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                      </svg>
                    </div>

                    {isDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-[#181923] border-2 border-brand rounded-lg shadow-xl z-[60] overflow-hidden">
                        <div className="max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-brand scrollbar-track-slate-800 hover:scrollbar-thumb-brand/70">
                          {pixOptions.map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => {
                                setPixType(option.id);
                                setIsDropdownOpen(false);
                              }}
                              className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-brand/10 text-white text-xs transition-colors"
                            >
                              <div className="text-brand-light">
                                {getIcon(option.icon)}
                              </div>
                              <span>{t.depositWithdraw.pixTypes[option.id]}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 text-xs mb-1.5 block">{t.depositWithdraw.pixKey}</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={pixKey}
                      readOnly
                      disabled={isSubmitting}
                      placeholder={t.depositWithdraw.notRegistered}
                      className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#181923] border-2 border-brand text-white text-xs focus:outline-none focus:ring-2 focus:ring-brand/50 transition-all disabled:opacity-50 cursor-default"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-light pointer-events-none">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-yellow-400 text-[10px] leading-tight">
              {t.depositWithdraw.pixOwnership}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-10 rounded-lg bg-brand hover:bg-brand-hover disabled:bg-brand disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm transition-all duration-200 active:scale-[0.98] btn-brand-submit"
            >
              {isSubmitting ? t.depositWithdraw.processing : t.depositWithdraw.withdraw}
            </button>
          </form>
        </div>
      </div>
    </div>
    </>
  );
}
