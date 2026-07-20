import { useEffect, type Dispatch, type SetStateAction } from 'react';

/** Alterna o menu lateral no mobile quando o botão Menu da barra inferior dispara o evento. */
export function useListenOpenMobileMenu(setOpen: Dispatch<SetStateAction<boolean>>) {
  useEffect(() => {
    const onToggle = () => setOpen((open) => !open);
    document.addEventListener('openMobileMenu', onToggle);
    return () => document.removeEventListener('openMobileMenu', onToggle);
  }, [setOpen]);
}
