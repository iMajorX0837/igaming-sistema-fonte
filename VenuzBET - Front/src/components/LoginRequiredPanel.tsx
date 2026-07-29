import IconifyIcon from './IconifyIcon';
import { useTranslation } from '../hooks/useTranslation';

interface LoginRequiredPanelProps {
  message: string;
  onLogin: () => void;
  buttonLabel?: string;
}

export default function LoginRequiredPanel({
  message,
  onLogin,
  buttonLabel,
}: LoginRequiredPanelProps) {
  const { t } = useTranslation();

  return (
    <div className="relative min-h-[320px] md:min-h-[420px] flex flex-col items-center justify-center gap-4 md:gap-6 px-4 py-12">
      <IconifyIcon icon="solar:shield-warning-bold-duotone" style={{ fontSize: '45px' }} />
      <p className="text-white text-lg md:text-2xl font-bold text-center px-2">{message}</p>

      <button
        type="button"
        onClick={onLogin}
        className="relative isolate overflow-hidden rounded-lg text-white text-sm font-semibold transition-all duration-200 hover:opacity-90 flex items-center justify-center"
        style={{
          backgroundColor: 'var(--brand-primary)',
          minWidth: '156px',
          height: '48px',
          paddingInline: '18px',
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
        <span className="relative z-10 flex items-center gap-2">
          <IconifyIcon icon="solar:login-3-broken" style={{ fontSize: '24px' }} />
          {buttonLabel ?? t.profile.loginNow}
        </span>
      </button>
    </div>
  );
}
