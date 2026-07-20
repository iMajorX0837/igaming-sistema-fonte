import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Eye, EyeOff, CreditCard, Mail, Smartphone, Lock, AlertTriangle, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useHomeConfig } from '../hooks/useHomeConfig';
import { useAuthModalsConfig } from '../contexts/SiteConfigContext';
import { DEFAULT_AUTH_MODAL_IMAGE } from '../lib/siteConfigCache';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin?: () => void;
  /** Chamado ap?s cadastro conclu?do com sucesso (ex.: abrir modal de dep?sito). */
  onRegisterSuccess?: () => void;
}

function modalInputStyle(fundo: string): React.CSSProperties {
  return {
    backgroundColor: fundo,
    border: '1px solid rgba(255, 255, 255, 0.12)',
    ['--input-autofill-bg' as string]: fundo,
  };
}

interface CpfHubResponse {
  success: boolean;
  data?: {
    cpf: string;
    name: string;
    day: number;
    month: number;
    year: number;
  };
}

function maskFullName(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (word.length <= 2) return word;
      if (word.length === 3) return `${word.slice(0, 2)}*`;
      const minStars = word.length >= 6 ? 4 : 2;
      const stars = Math.max(word.length - 3, minStars);
      return `${word.slice(0, 3)}${'*'.repeat(stars)}`;
    })
    .join(' ');
}

function maskBirthLine(day: number, year: number): string {
  const d = String(day).padStart(2, '0');
  const yPrefix = String(year).slice(0, 2);
  return `${d}/**/${yPrefix}**`;
}

export default function RegisterModal({ isOpen, onClose, onSwitchToLogin, onRegisterSuccess }: RegisterModalProps) {
  const { register } = useAuth();
  const { config: homeConfig } = useHomeConfig();
  const { config: authModalsConfig } = useAuthModalsConfig();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    cpf: '',
    email: '',
    phone: '',
    password: '',
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [cpfVerified, setCpfVerified] = useState(false);
  const [cpfLookupLoading, setCpfLookupLoading] = useState(false);
  const [cpfLookupError, setCpfLookupError] = useState('');
  const [maskedNameLine, setMaskedNameLine] = useState('');
  const [maskedBirthLine, setMaskedBirthLine] = useState('');
  const cpfDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLookupCpfRef = useRef<string>('');
  const verifiedFullNameRef = useRef<string>('');
  const cpfVerifiedRef = useRef(false);
  const runCpfLookupRef = useRef<(digits: string) => Promise<void>>(async () => {});

  useEffect(() => {
    cpfVerifiedRef.current = cpfVerified;
  }, [cpfVerified]);

  // Capturar c?digo de indica??o da URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('c');
    if (code) {
      setReferralCode(code);
      // Salvar no localStorage para persistir mesmo ap?s navega??o
      localStorage.setItem('referral_code', code);
    } else {
      // Tentar recuperar do localStorage se n?o estiver na URL
      const storedCode = localStorage.getItem('referral_code');
      if (storedCode) {
        setReferralCode(storedCode);
      }
    }
  }, []);

  const resetCpfVerification = useCallback(() => {
    setCpfVerified(false);
    setMaskedNameLine('');
    setMaskedBirthLine('');
    setCpfLookupError('');
    lastLookupCpfRef.current = '';
    verifiedFullNameRef.current = '';
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetCpfVerification();
      setCpfLookupLoading(false);
      if (cpfDebounceRef.current) {
        clearTimeout(cpfDebounceRef.current);
        cpfDebounceRef.current = null;
      }
    }
  }, [isOpen, resetCpfVerification]);

  const fetchCpfData = useCallback(async (cpfDigits: string): Promise<CpfHubResponse> => {
    const response = await fetch(`/api/cpfhub/cpf/${cpfDigits}`);
    return (await response.json()) as CpfHubResponse;
  }, []);

  const runCpfLookup = useCallback(
    async (cpfDigits: string) => {
      if (cpfDigits.length !== 11) return;
      if (lastLookupCpfRef.current === cpfDigits && cpfVerifiedRef.current) return;

      setCpfLookupLoading(true);
      setCpfLookupError('');
      try {
        const data = await fetchCpfData(cpfDigits);
        if (data.success && data.data?.name) {
          verifiedFullNameRef.current = data.data.name.trim();
          setMaskedNameLine(maskFullName(data.data.name));
          setMaskedBirthLine(maskBirthLine(data.data.day, data.data.year));
          setCpfVerified(true);
          lastLookupCpfRef.current = cpfDigits;
        } else {
          lastLookupCpfRef.current = '';
          verifiedFullNameRef.current = '';
          setCpfVerified(false);
          setMaskedNameLine('');
          setMaskedBirthLine('');
          setCpfLookupError('CPF n?o encontrado ou inv?lido.');
        }
      } catch {
        lastLookupCpfRef.current = '';
        verifiedFullNameRef.current = '';
        setCpfVerified(false);
        setMaskedNameLine('');
        setMaskedBirthLine('');
        setCpfLookupError('N?o foi poss?vel validar o CPF. Tente novamente.');
      } finally {
        setCpfLookupLoading(false);
      }
    },
    [fetchCpfData]
  );

  runCpfLookupRef.current = runCpfLookup;

  useEffect(() => {
    const digits = formData.cpf.replace(/\D/g, '');

    if (digits.length !== 11) {
      if (cpfDebounceRef.current) {
        clearTimeout(cpfDebounceRef.current);
        cpfDebounceRef.current = null;
      }
      resetCpfVerification();
      return;
    }

    if (cpfDebounceRef.current) clearTimeout(cpfDebounceRef.current);
    cpfDebounceRef.current = setTimeout(() => {
      void runCpfLookupRef.current(digits);
    }, 350);

    return () => {
      if (cpfDebounceRef.current) {
        clearTimeout(cpfDebounceRef.current);
        cpfDebounceRef.current = null;
      }
    };
  }, [formData.cpf, resetCpfVerification]);

  if (!isOpen) return null;

  const formatCPF = (value: string) => {
    // Remove tudo que n?o ? d?gito
    const numbers = value.replace(/\D/g, '');
    
    // Aplica a formata??o
    if (numbers.length <= 3) {
      return numbers;
    } else if (numbers.length <= 6) {
      return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    } else if (numbers.length <= 9) {
      return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    } else {
      return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
    }
  };

  const formatPhone = (value: string) => {
    // Remove tudo que n?o ? d?gito
    const numbers = value.replace(/\D/g, '');
    
    // Aplica a formata??o
    if (numbers.length <= 2) {
      return numbers.length > 0 ? `(${numbers}` : '';
    } else if (numbers.length <= 7) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    } else if (numbers.length <= 10) {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    } else {
      return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;
    
    // Aplica formata??o espec?fica para cada campo
    if (name === 'cpf') {
      formattedValue = formatCPF(value);
    } else if (name === 'phone') {
      formattedValue = formatPhone(value);
    }
    
    setFormData(prev => ({ ...prev, [name]: formattedValue }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!termsAccepted) {
      setError('Voc? deve aceitar os termos e condi??es');
      return;
    }

    const cpfClean = formData.cpf.replace(/\D/g, '');
    if (!cpfVerified || cpfClean !== lastLookupCpfRef.current) {
      setError('Valide seu CPF antes de continuar.');
      return;
    }

    setLoading(true);

    try {
      // Remove formata??o antes de enviar (apenas n?meros)
      const phoneClean = formData.phone.replace(/\D/g, '');
      
      await register(
        cpfClean,
        formData.email,
        phoneClean,
        formData.password,
        referralCode || undefined,
        verifiedFullNameRef.current
      );
      setFormData({ cpf: '', email: '', phone: '', password: '' });
      resetCpfVerification();
      setTermsAccepted(false);
      // Limpar c?digo de indica??o ap?s registro bem-sucedido
      localStorage.removeItem('referral_code');
      setReferralCode(null);
      onClose();
      onRegisterSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseClick = () => {
    setShowConfirmation(true);
  };

  const handleConfirmClose = () => {
    setShowConfirmation(false);
    onClose();
  };

  const handleCancelClose = () => {
    setShowConfirmation(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div
        className="relative flex w-full max-w-[420px] md:max-w-[500px] flex-col overflow-hidden rounded-2xl shadow-2xl max-md:max-h-[calc(100vh-2rem)] md:h-[735px] md:w-[500px]"
        style={{
          backgroundColor: homeConfig.fundo,
          maxWidth: 'calc(100vw - 2rem)',
          maxHeight: 'calc(100vh - 2rem)',
        }}
      >
        <button
          onClick={handleCloseClick}
          className="absolute top-4 right-4 z-10 w-7 h-7 rounded-md bg-gray-800/80 hover:bg-gray-700 flex items-center justify-center transition-all duration-200 backdrop-blur-sm"
        >
          <X className="w-4 h-4 text-gray-400 hover:text-gray-200 transition-colors" />
        </button>

        {showConfirmation && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/85 rounded-2xl backdrop-blur-md">
            <div className="text-center space-y-4 px-6">
              <div className="flex justify-center">
                <AlertTriangle className="w-16 h-16 text-amber-400" />
              </div>
              <h3 className="text-lg font-bold text-white">
                Tem certeza que deseja cancelar seu registro?
              </h3>
              <p className="text-sm text-slate-300">
                Cadastre-se agora para concorrer a b?nus exclusivos e rodadas gr?tis imperd?veis!
              </p>
              <div className="flex flex-col gap-2 pt-4">
                <button
                  onClick={handleCancelClose}
                  className="w-full h-10 rounded-lg bg-gradient-to-r from-brand to-brand-hover hover:from-brand-hover hover:to-brand-hover text-white font-bold text-sm transition-all duration-200 shadow-lg shadow-brand/20 hover:shadow-xl hover:shadow-brand/30 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  Continuar <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={handleConfirmClose}
                  className="w-full h-8 text-slate-400 font-medium text-xs transition-all duration-200 flex items-center justify-center gap-1 hover:text-slate-100"
                >
                  <X className="w-3 h-3" /> Sim quero cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        <div
          className="relative flex w-full shrink-0 justify-center items-center overflow-hidden md:h-[200px]"
          style={{ backgroundColor: homeConfig.fundo }}
        >
          <img
            src={authModalsConfig.register_imagem_url || DEFAULT_AUTH_MODAL_IMAGE}
            alt="Registro"
            className="w-full h-auto object-contain md:h-full md:object-cover md:object-center"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <form onSubmit={handleSubmit} className="space-y-2.5">
            {cpfVerified ? (
              <div
                className="w-full rounded-md px-3 py-1.5 text-sm pointer-events-none select-none"
                style={modalInputStyle(homeConfig.fundo)}
              >
                <p className="text-white font-medium leading-tight m-0">{maskedNameLine}</p>
                <p className="text-xs leading-tight tabular-nums m-0 text-slate-400">
                  <span className="font-bold text-brand-light">{formData.cpf}</span>
                  <span> | {maskedBirthLine}</span>
                </p>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white">
                  <CreditCard className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  name="cpf"
                  placeholder="000.000.000-00"
                  value={formData.cpf}
                  onChange={handleChange}
                  maxLength={14}
                  disabled={cpfLookupLoading}
                  className={`w-full h-10 pl-10 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all disabled:opacity-60 input-autofill-reset ${cpfLookupLoading ? 'pr-24' : 'pr-4'}`}
                  style={modalInputStyle(homeConfig.fundo)}
                />
                {cpfLookupLoading && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-brand-light pointer-events-none">
                    Consultando?
                  </span>
                )}
              </div>
            )}
            {cpfLookupError && !cpfVerified && (
              <div className="space-y-2">
                <p className="text-xs text-red-400">{cpfLookupError}</p>
                {formData.cpf.replace(/\D/g, '').length === 11 && (
                  <button
                    type="button"
                    disabled={cpfLookupLoading}
                    onClick={() => void runCpfLookup(formData.cpf.replace(/\D/g, ''))}
                    className="text-xs font-bold text-brand-light hover:text-brand-light disabled:opacity-40"
                  >
                    Tentar novamente
                  </button>
                )}
              </div>
            )}

            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white">
                <Mail className="w-5 h-5" />
              </div>
              <input
                type="email"
                name="email"
                placeholder="E-mail"
                value={formData.email}
                onChange={handleChange}
                className="w-full h-10 pl-10 pr-4 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all input-autofill-reset"
                style={modalInputStyle(homeConfig.fundo)}
              />
            </div>

            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white">
                <Smartphone className="w-5 h-5" />
              </div>
              <input
                type="tel"
                name="phone"
                placeholder="(11) 1 1111-1111"
                value={formData.phone}
                onChange={handleChange}
                maxLength={15}
                className="w-full h-10 pl-10 pr-4 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all input-autofill-reset"
                style={modalInputStyle(homeConfig.fundo)}
              />
            </div>

            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Digite sua senha"
                value={formData.password}
                onChange={handleChange}
                className="w-full h-10 pl-10 pr-10 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all input-autofill-reset"
                style={modalInputStyle(homeConfig.fundo)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-white/80 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 text-red-400 text-xs">
                {error}
              </div>
            )}

            <div className="flex items-start gap-2 py-1">
              <input
                type="checkbox"
                id="terms"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="w-4 h-4 rounded bg-slate-900 accent-brand cursor-pointer mt-0.5 flex-shrink-0"
              />
              <label htmlFor="terms" className="text-xs text-slate-300 leading-tight cursor-pointer">
                Confirmo que <span className="font-bold text-brand-light">tenho mais de 18 anos</span> e aceito os{' '}
                <a href="/help/terms" className="text-brand-light font-bold hover:underline">Termos de Condi??es</a> e a{' '}
                <a href="/help/privacy" className="text-brand-light font-bold hover:underline">Pol?tica de Privacidade</a>.
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-lg text-white font-bold text-sm transition-opacity duration-200 disabled:opacity-50 disabled:cursor-not-allowed btn-brand-submit"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              {loading ? 'Criando conta...' : 'CADASTRE-SE'}
            </button>

            <div className="text-center pt-1">
              <p className="text-xs text-slate-400 mb-2">Ou cadastre-se com</p>
              <div className="flex gap-2 justify-center">
                <button
                  type="button"
                  className="flex items-center justify-center px-4 h-9 rounded-lg bg-transparent transition-all"
                >
                  <svg width="65" height="18" viewBox="0 0 65 18" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-auto">
                    <g clipPath="url(#clip0_137_141)">
                      <path d="M3.60894 0L0.403809 3.21429V14.7857H4.24996V18L7.45509 14.7857H10.0192L15.7884 9V0H3.60894ZM14.5064 8.35714L11.9423 10.9286H9.37817L7.13458 13.1786V10.9286H4.24996V1.28571H14.5064V8.35714Z" fill="white"></path>
                      <path d="M12.5833 3.53571H11.3013V7.39285H12.5833V3.53571Z" fill="white"></path>
                      <path d="M9.05744 3.53571H7.77539V7.39285H9.05744V3.53571Z" fill="white"></path>
                    </g>
                    <g clipPath="url(#clip1_137_141)">
                      <path fillRule="evenodd" clipRule="evenodd" d="M62.9093 6.82736L61.22 5.13806H58.0817V2.9653H55.4262V12.8622H58.0817V7.79279H60.2538V12.8622H62.9093V6.82736ZM54.4613 5.13806H50.3579L48.6682 6.82736V11.1721L50.3579 12.8622H54.4613V10.2072H51.323V7.79279H54.4613V5.13806ZM47.7027 5.13806H45.5307V2.9653H42.8751V11.1721L44.5648 12.8622H47.7027V10.2072H45.5307V7.79279H47.7027V5.13806ZM41.9096 2.9653H39.2548V4.17263H41.9096V2.9653ZM41.9096 5.13806H39.2548V12.8621H41.9096V5.13806ZM38.2893 5.13806H35.6342V10.2072H34.669V5.13806H32.0138V10.2072H31.0487V5.13806H28.3931V12.8622H36.6L38.2893 11.1721V5.13806ZM27.4276 5.13806H25.2555V2.9653H22.6004V11.1721L24.29 12.8622H27.4276V10.2072H25.2555V7.79279H27.4276V5.13806ZM63.8741 6.34453V13.5859L60.2538 16H57.8402V14.7927L56.1506 16H53.9786V14.7927L52.7721 16H48.91L47.7027 14.7927L47.4611 16H44.0824L42.7007 14.7927L42.6233 16H38.7937L38.6582 14.7927L37.6216 16H31.7721L30.5651 15.5172V16H27.4276L23.8069 13.827L21.6348 11.6556V2H26.2211L28.3931 4.17263H38.2893V2H46.4958V4.17263H48.6682V5.37923L49.8755 4.17263H52.2887L54.4613 2H59.0472V4.17263H61.7024L63.8741 6.34453Z" fill="white" />
                    </g>
                    <defs>
                      <clipPath id="clip0_137_141">
                        <rect width="15.3846" height="18" fill="white" transform="translate(0.25)"></rect>
                      </clipPath>
                      <clipPath id="clip1_137_141">
                        <rect width="44.1539" height="18" fill="white" transform="translate(19.6348)"></rect>
                      </clipPath>
                    </defs>
                  </svg>
                </button>
                <button
                  type="button"
                  className="flex items-center justify-center px-4 h-9 rounded-lg bg-transparent transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="55" height="20" viewBox="0 0 55 20" fill="none" className="h-4 w-auto">
                    <g clipPath="url(#clip0_137_154)">
                      <path d="M23.6927 10.2364C23.6927 12.7951 21.6911 14.6806 19.2345 14.6806C16.778 14.6806 14.7764 12.7951 14.7764 10.2364C14.7764 7.65969 16.778 5.79227 19.2345 5.79227C21.6911 5.79227 23.6927 7.65969 23.6927 10.2364ZM21.7411 10.2364C21.7411 8.63749 20.581 7.54348 19.2345 7.54348C17.8881 7.54348 16.7279 8.63749 16.7279 10.2364C16.7279 11.8193 17.8881 12.9294 19.2345 12.9294C20.581 12.9294 21.7411 11.8173 21.7411 10.2364Z" fill="white"></path>
                      <path d="M33.3104 10.2364C33.3104 12.7951 31.3087 14.6806 28.8522 14.6806C26.3957 14.6806 24.394 12.7951 24.394 10.2364C24.394 7.6617 26.3957 5.79227 28.8522 5.79227C31.3087 5.79227 33.3104 7.65969 33.3104 10.2364ZM31.3588 10.2364C31.3588 8.63749 30.1987 7.54348 28.8522 7.54348C27.5058 7.54348 26.3456 8.63749 26.3456 10.2364C26.3456 11.8193 27.5058 12.9294 28.8522 12.9294C30.1987 12.9294 31.3588 11.8173 31.3588 10.2364Z" fill="white"></path>
                      <path d="M42.527 6.06076V14.0394C42.527 17.3214 40.5914 18.6619 38.3032 18.6619C36.1493 18.6619 34.8529 17.2212 34.364 16.0431L36.0631 15.3358C36.3657 16.0591 37.107 16.9127 38.3012 16.9127C39.7659 16.9127 40.6736 16.009 40.6736 14.3079V13.6687H40.6054C40.1686 14.2077 39.3271 14.6786 38.2651 14.6786C36.0431 14.6786 34.0073 12.743 34.0073 10.2525C34.0073 7.74385 36.0431 5.79227 38.2651 5.79227C39.3251 5.79227 40.1666 6.26313 40.6054 6.78609H40.6736V6.06276H42.527V6.06076ZM40.8118 10.2525C40.8118 8.68758 39.7679 7.54348 38.4395 7.54348C37.093 7.54348 35.9649 8.68758 35.9649 10.2525C35.9649 11.8013 37.093 12.9294 38.4395 12.9294C39.7679 12.9294 40.8118 11.8013 40.8118 10.2525Z" fill="white"></path>
                      <path d="M45.5827 1.38419V14.4081H43.6792V1.38419H45.5827Z" fill="white"></path>
                      <path d="M53.0004 11.6991L54.5152 12.7089C54.0263 13.4323 52.8482 14.6786 50.8124 14.6786C48.2878 14.6786 46.4023 12.727 46.4023 10.2344C46.4023 7.59156 48.3038 5.79025 50.594 5.79025C52.9003 5.79025 54.0283 7.62562 54.397 8.61744L54.5994 9.12237L48.6585 11.5829C49.1133 12.4745 49.8206 12.9294 50.8124 12.9294C51.8063 12.9294 52.4955 12.4405 53.0004 11.6991ZM48.3379 10.1002L52.3092 8.45114C52.0908 7.89612 51.4336 7.50941 50.6602 7.50941C49.6683 7.50941 48.2878 8.38501 48.3379 10.1002Z" fill="white"></path>
                      <path d="M7.57111 9.08031V7.19485H13.9248C13.9869 7.52345 14.0189 7.91217 14.0189 8.33294C14.0189 9.74753 13.6322 11.4967 12.3859 12.743C11.1737 14.0053 9.62488 14.6786 7.57311 14.6786C3.77013 14.6786 0.572266 11.5809 0.572266 7.77792C0.572266 3.97494 3.77013 0.877258 7.57311 0.877258C9.67697 0.877258 11.1757 1.70277 12.3018 2.77875L10.9713 4.10919C10.1639 3.3518 9.06986 2.76272 7.57111 2.76272C4.79401 2.76272 2.62203 5.00082 2.62203 7.77792C2.62203 10.555 4.79401 12.7931 7.57111 12.7931C9.37241 12.7931 10.3983 12.0698 11.0555 11.4126C11.5885 10.8796 11.9391 10.1182 12.0774 9.07831L7.57111 9.08031Z" fill="white"></path>
                    </g>
                    <defs>
                      <clipPath id="clip0_137_154">
                        <rect width="54.5" height="18.4338" fill="white" transform="translate(0.5 0.783081)"></rect>
                      </clipPath>
                    </defs>
                  </svg>
                </button>
              </div>
            </div>

            <div className="text-center pt-1 pb-1">
              <p className="text-xs text-white font-bold mt-2">
                J? possui uma conta?
              </p>
              <button 
                type="button" 
                onClick={() => {
                  onClose();
                  onSwitchToLogin?.();
                }}
                className="text-brand-light font-bold text-xs underline mt-2 hover:opacity-90"
              >
                Fa?a login aqui
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
