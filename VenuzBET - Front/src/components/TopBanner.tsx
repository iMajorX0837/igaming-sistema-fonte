import { X } from 'lucide-react';
import { useState } from 'react';
import { useTopBannerConfig } from '../hooks/useTopBannerConfig';

const DISMISS_KEY = 'venuz-top-banner-dismissed-v1';

function readDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

function persistDismissed() {
  try {
    sessionStorage.setItem(DISMISS_KEY, '1');
  } catch {
    // ignore private mode
  }
}

export default function TopBanner() {
  const { config } = useTopBannerConfig();
  const [isDismissed, setIsDismissed] = useState(readDismissed);

  if (!config.ativo || isDismissed) return null;

  return (
    <div
      className="px-4 py-2 flex items-center justify-center gap-2 flex-shrink-0 relative z-10"
      style={{ backgroundColor: config.background_color }}
    >
      <div className="flex items-center gap-1.5">
        {config.emoji ? <span className="text-base flex-shrink-0">{config.emoji}</span> : null}
        <span className="text-sm sm:text-base font-normal text-white">{config.mensagem}</span>
        {config.botao_texto ? (
          <a
            href={config.botao_href}
            className="px-2.5 py-1 rounded-lg text-xs transition-colors duration-200 flex-shrink-0 whitespace-nowrap ml-1 hover:opacity-90"
            style={{
              backgroundColor: config.botao_cor_fundo,
              color: config.background_color,
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: 700,
            }}
          >
            {config.botao_texto}
          </a>
        ) : null}
      </div>

      {config.permitir_fechar ? (
        <button
          onClick={() => {
            setIsDismissed(true);
            persistDismissed();
          }}
          className="text-white hover:opacity-70 transition-opacity duration-200 flex-shrink-0 absolute right-3"
          aria-label="Fechar banner"
        >
          <X className="w-4 h-4" />
        </button>
      ) : null}
    </div>
  );
}
