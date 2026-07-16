import { useState } from 'react';
import { X, Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useHomeConfig } from '../hooks/useHomeConfig';
import { useAuthModalsConfig } from '../contexts/SiteConfigContext';
import { DEFAULT_AUTH_MODAL_IMAGE } from '../lib/siteConfigCache';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToRegister: () => void;
}

function modalInputStyle(fundo: string) {
  return {
    backgroundColor: fundo,
    border: '1px solid rgba(255, 255, 255, 0.12)',
  };
}

export default function LoginModal({ isOpen, onClose, onSwitchToRegister }: LoginModalProps) {
  const { login } = useAuth();
  const { config: homeConfig } = useHomeConfig();
  const { config: authModalsConfig } = useAuthModalsConfig();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  if (!isOpen) return null;

  const loginImageUrl = authModalsConfig.login_imagem_url || DEFAULT_AUTH_MODAL_IMAGE;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(formData.email, formData.password);
      setFormData({ email: '', password: '' });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchRegister = () => {
    onClose();
    onSwitchToRegister();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-[420px] rounded-2xl shadow-2xl overflow-hidden" style={{ backgroundColor: homeConfig.fundo }}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-7 h-7 rounded-md bg-gray-800/80 hover:bg-gray-700 flex items-center justify-center transition-all duration-200 backdrop-blur-sm"
        >
          <X className="w-4 h-4 text-gray-400 hover:text-gray-200 transition-colors" />
        </button>

        <div className="relative flex w-full justify-center items-center overflow-hidden" style={{ backgroundColor: homeConfig.fundo }}>
          <img
            src={loginImageUrl}
            alt="Login"
            className="w-full h-auto object-contain"
          />
        </div>

        <div className="px-6 py-5">
          <form onSubmit={handleSubmit} className="space-y-3">
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
                className="w-full h-10 pl-10 pr-4 rounded-lg text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-600/20 transition-all"
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
                className="w-full h-10 pl-10 pr-10 rounded-lg text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-600/20 transition-all"
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

            <div className="text-right">
              <button type="button" className="text-xs text-violet-400 font-bold hover:underline">
                Esqueci a senha
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-lg bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white font-bold text-sm transition-all duration-200 shadow-lg shadow-violet-600/20 hover:shadow-xl hover:shadow-violet-600/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Entrando...' : 'ENTRAR'}
            </button>

            <div className="text-center py-2">
              <p className="text-xs text-slate-400 mb-2">Ou entre com</p>
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

            <div className="text-center pt-2">
              <p className="text-xs text-white font-bold mt-3">
                Ainda não tem uma conta?
              </p>
              <button type="button" onClick={handleSwitchRegister} className="text-violet-400 font-bold text-xs hover:underline mt-2">
                Criar uma conta grátis
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
