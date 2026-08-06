import { normalizeInternalHref } from './cmsLink';
import { normalizeWhatsappUrl } from './siteConfigCache';

export const LIVE_SUPPORT_PATH = '/help/support';

export function isLiveSupportHref(href: string): boolean {
  const trimmed = href.trim();
  if (!trimmed) return false;
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      return new URL(trimmed).pathname === LIVE_SUPPORT_PATH;
    } catch {
      return false;
    }
  }
  return normalizeInternalHref(trimmed) === LIVE_SUPPORT_PATH;
}

/** Abre o WhatsApp configurado no admin (mesmo do Footer). Retorna true se abriu. */
export function openLiveSupportWhatsapp(whatsappUrl: string): boolean {
  const href = normalizeWhatsappUrl(whatsappUrl);
  if (!href) return false;
  window.open(href, '_blank', 'noopener,noreferrer');
  return true;
}
