import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';
import { Copy, KeyRound, Loader2, Shield, ShieldCheck, ShieldOff } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import LoadingState from '../components/ui/LoadingState';
import PagePanel from '../components/ui/PagePanel';
import Button from '../components/ui/Button';

type SetupData = {
  qrDataUrl: string;
  otpauthUrl: string;
  secret: string;
};

export default function SegurancaPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [confirmCode, setConfirmCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [saving, setSaving] = useState(false);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.twoFactor.getStatus();
      if (error) {
        showToast(error.message || 'Erro ao carregar status do 2FA', 'error');
        return;
      }
      setEnabled(!!data?.enabled);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  const handleStartSetup = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase.auth.twoFactor.setup();
      if (error || !data) {
        showToast(error?.message || 'Erro ao iniciar configuração', 'error');
        return;
      }
      setSetupData(data as SetupData);
      setConfirmCode('');
      showToast('Escaneie o QR Code no Google Authenticator', 'success');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmSetup = async () => {
    if (confirmCode.length !== 6) {
      showToast('Digite o código de 6 dígitos', 'error');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.twoFactor.confirm(confirmCode);
      if (error) {
        showToast(error.message || 'Código inválido', 'error');
        return;
      }
      setEnabled(true);
      setSetupData(null);
      setConfirmCode('');
      showToast('2FA ativado com sucesso!', 'success');
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = async () => {
    if (!disablePassword || disableCode.length !== 6) {
      showToast('Informe sua senha e o código 2FA', 'error');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.twoFactor.disable(disablePassword, disableCode);
      if (error) {
        showToast(error.message || 'Erro ao desativar 2FA', 'error');
        return;
      }
      setEnabled(false);
      setDisablePassword('');
      setDisableCode('');
      showToast('2FA desativado', 'success');
    } finally {
      setSaving(false);
    }
  };

  const copySecret = async () => {
    if (!setupData?.secret) return;
    try {
      await navigator.clipboard.writeText(setupData.secret);
      showToast('Chave copiada!', 'success');
    } catch {
      showToast('Não foi possível copiar a chave', 'error');
    }
  };

  if (loading) {
    return <LoadingState message="Carregando segurança..." />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Segurança"
        description="Proteja sua conta de administrador com autenticação em duas etapas"
        icon={Shield}
      />

      <PagePanel>
        <div className="flex items-start gap-4">
          <div
            className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
              enabled ? 'bg-emerald-500/15 text-emerald-400' : 'bg-admin-accent/15 text-admin-accent'
            }`}
          >
            {enabled ? <ShieldCheck className="w-6 h-6" /> : <KeyRound className="w-6 h-6" />}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-white">Google Authenticator (2FA)</h3>
            <p className="text-sm text-gray-400 mt-1">
              {enabled
                ? 'Sua conta exige um código do app autenticador a cada login no painel admin.'
                : 'Adicione uma camada extra de segurança. Após ativar, será necessário um código do Google Authenticator para entrar.'}
            </p>

            <div className="mt-4">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                  enabled
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-gray-500/15 text-gray-400 border border-gray-500/30'
                }`}
              >
                {enabled ? 'Ativo' : 'Inativo'}
              </span>
            </div>
          </div>
        </div>

        {!enabled && !setupData && (
          <div className="mt-6 pt-6 border-t border-admin-border">
            <Button onClick={handleStartSetup} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              Configurar 2FA
            </Button>
          </div>
        )}

        {!enabled && setupData && (
          <div className="mt-6 pt-6 border-t border-admin-border space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex flex-col items-center">
                <p className="text-sm text-gray-400 mb-3 text-center">
                  1. Escaneie este QR Code no Google Authenticator
                </p>
                <img
                  src={setupData.qrDataUrl}
                  alt="QR Code 2FA"
                  className="rounded-lg border border-admin-border bg-white p-2"
                />
              </div>
              <div className="space-y-4">
                <p className="text-sm text-gray-400">
                  2. Ou insira manualmente esta chave:
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 rounded-lg bg-admin-bg border border-admin-border text-admin-accent text-sm font-mono break-all">
                    {setupData.secret}
                  </code>
                  <button
                    type="button"
                    onClick={copySecret}
                    className="p-2 rounded-lg border border-admin-border text-gray-400 hover:text-white hover:border-admin-accent/30 transition-colors"
                    title="Copiar chave"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-gray-400">
                  3. Digite o código de 6 dígitos gerado pelo app:
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-4 py-2.5 text-white text-center text-xl tracking-[0.4em] rounded-lg border border-admin-border bg-admin-panel focus:outline-none focus:ring-2 focus:ring-admin-accent/30 font-mono"
                  placeholder="000000"
                />
                <div className="flex gap-3">
                  <Button
                    onClick={handleConfirmSetup}
                    disabled={saving || confirmCode.length !== 6}
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Ativar 2FA
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSetupData(null);
                      setConfirmCode('');
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {enabled && (
          <div className="mt-6 pt-6 border-t border-admin-border space-y-4 max-w-md">
            <p className="text-sm text-gray-400">
              Para desativar, confirme sua senha e um código atual do Google Authenticator.
            </p>
            <input
              type="password"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              placeholder="Sua senha"
              className="w-full px-4 py-2.5 text-white rounded-lg border border-admin-border bg-admin-panel focus:outline-none focus:ring-2 focus:ring-admin-accent/30"
            />
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Código 2FA"
              className="w-full px-4 py-2.5 text-white text-center tracking-[0.4em] rounded-lg border border-admin-border bg-admin-panel focus:outline-none focus:ring-2 focus:ring-admin-accent/30 font-mono"
            />
            <Button variant="danger" onClick={handleDisable} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldOff className="w-4 h-4" />}
              Desativar 2FA
            </Button>
          </div>
        )}
      </PagePanel>
    </div>
  );
}
