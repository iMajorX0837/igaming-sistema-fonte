import { useEffect } from 'react';

/** Abre o menu lateral no mobile quando o botão Menu da barra inferior dispara o evento. */
export function useListenOpenMobileMenu(setOpen: (open: boolean) => void) {
  useEffect(() => {
    const onOpen = () => setOpen(true);
    document.addEventListener('openMobileMenu', onOpen);
    return () => document.removeEventListener('openMobileMenu', onOpen);
  }, [setOpen]);
}
