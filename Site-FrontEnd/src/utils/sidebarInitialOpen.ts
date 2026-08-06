/** Desktop: sidebar aberta; mobile: fechada até o usuário abrir (evita cobrir a tela). */
export function getSidebarInitiallyOpen(): boolean {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(min-width: 768px)').matches;
}
