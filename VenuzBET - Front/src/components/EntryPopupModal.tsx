import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useEntryPopupConfig } from '../hooks/useEntryPopupConfig';

const DISMISS_KEY = 'venuz-entry-popup-dismissed-v1';
const MODAL_ANIM_MS = 320;

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

export default function EntryPopupModal() {
  const { config, loading } = useEntryPopupConfig();
  const [isDismissed, setIsDismissed] = useState(readDismissed);
  const [shouldMount, setShouldMount] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const canShow = !loading && config.ativo && config.imagem_url.length > 0 && !isDismissed;

  useEffect(() => {
    if (canShow) {
      setShouldMount(true);
      setIsClosing(false);
    }
  }, [canShow]);

  const handleClose = () => {
    setIsDismissed(true);
    persistDismissed();
    setIsClosing(true);

    window.setTimeout(() => {
      setShouldMount(false);
      setIsClosing(false);
    }, MODAL_ANIM_MS);
  };

  if (!shouldMount) return null;

  const backdropAnimation = isClosing ? 'animate-modal-backdrop-out' : 'animate-modal-backdrop-in';
  const panelAnimation = isClosing ? 'animate-modal-panel-out' : 'animate-modal-panel-in';

  return (
    <div
      className={`fixed inset-0 z-[95] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 ${backdropAnimation}`}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Promoção"
    >
      <div
        className={`relative max-w-[min(90vw,480px)] w-full ${panelAnimation}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative overflow-hidden rounded-xl">
          <img
            src={config.imagem_url}
            alt="Promoção"
            className="w-full h-auto object-contain max-h-[80vh]"
            loading="eager"
          />
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center text-white transition-opacity hover:opacity-70"
            aria-label="Fechar popup"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
