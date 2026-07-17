import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'credentials' | '2fa'>('credentials');
  const [challengeToken, setChallengeToken] = useState('');
  const { login, verify2FA } = useAuth();
  const navigate = useNavigate();

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.requires2FA && result.challengeToken) {
        setChallengeToken(result.challengeToken);
        setStep('2fa');
        setTotpCode('');
        return;
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await verify2FA(challengeToken, totpCode.trim());
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Código inválido');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToCredentials = () => {
    setStep('credentials');
    setChallengeToken('');
    setTotpCode('');
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-admin-bg via-admin-sidebar to-admin-bg px-4">
      <div className="rounded-xl border border-admin-border shadow-admin bg-admin-panel p-8 w-full max-w-md ring-1 ring-admin-accent/10 animate-scale-in">
        <div className="text-center mb-8">
          <img
            src="https://royal-images.s3.us-east-1.amazonaws.com/royalbetsolutions-com-images/images/1757715806714.png"
            alt="RoyalBET Logo"
            className="mx-auto max-w-full h-auto"
          />
        </div>

        {step === '2fa' && (
          <div className="mb-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-admin-accent/15 text-admin-accent mb-3">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-semibold text-white">Verificação em duas etapas</h2>
            <p className="text-sm text-gray-400 mt-1">
              Digite o código de 6 dígitos do Google Authenticator
            </p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-admin-danger/12 border border-admin-danger/30 text-admin-danger rounded-lg text-sm">
            {error}
          </div>
        )}

        {step === 'credentials' ? (
          <form onSubmit={handleCredentialsSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-admin-muted h-5 w-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-white rounded-lg border border-admin-border bg-admin-panel focus:outline-none focus:ring-2 focus:ring-admin-accent/30 focus:border-admin-accent/24 placeholder-gray-500 input-autofill-reset"
                  placeholder="admin@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-admin-muted h-5 w-5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-white rounded-lg border border-admin-border bg-admin-panel focus:outline-none focus:ring-2 focus:ring-admin-accent/30 focus:border-admin-accent/24 placeholder-gray-500 input-autofill-reset"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-admin-accent text-[#0d0e10] py-2.5 rounded-lg font-medium hover:bg-admin-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-black/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handle2FASubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Código de verificação
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-3 text-white text-center text-2xl tracking-[0.5em] rounded-lg border border-admin-border bg-admin-panel focus:outline-none focus:ring-2 focus:ring-admin-accent/30 focus:border-admin-accent/24 placeholder-gray-500 font-mono input-autofill-reset"
                placeholder="000000"
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading || totpCode.length !== 6}
              className="w-full flex items-center justify-center gap-2 bg-admin-accent text-[#0d0e10] py-2.5 rounded-lg font-medium hover:bg-admin-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-black/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                'Verificar e entrar'
              )}
            </button>

            <button
              type="button"
              onClick={handleBackToCredentials}
              className="w-full flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
