import { useEffect, useState } from 'react';

export const MODAL_ANIM_MS = 320;

export function useModalAnimation(isOpen: boolean, onAfterClose?: () => void) {
  const [shouldMount, setShouldMount] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);

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
      onAfterClose?.();
    }, MODAL_ANIM_MS);

    return () => window.clearTimeout(timer);
  }, [isOpen, shouldMount, onAfterClose]);

  const backdropAnimation = isClosing ? 'animate-modal-backdrop-out' : 'animate-modal-backdrop-in';
  const panelAnimation = isClosing ? 'animate-modal-panel-out' : 'animate-modal-panel-in';

  return { shouldMount, isClosing, backdropAnimation, panelAnimation };
}
