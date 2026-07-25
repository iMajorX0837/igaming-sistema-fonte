import type { NavigateFunction } from 'react-router-dom';

export type CmsLinkTipo = 'href' | 'external' | null;

const UNSAFE_SCHEME = /^(javascript|data|vbscript):/i;

/** Bloqueia javascript:, data:, vbscript: e esquemas desconhecidos (M4). */
export function isSafeCmsHref(href: string): boolean {
  const trimmed = href.trim();
  if (!trimmed || UNSAFE_SCHEME.test(trimmed)) return false;
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (trimmed.startsWith('/') || !trimmed.includes(':')) return true;
  return false;
}

/** Garante rota interna absoluta a partir da raiz (evita /help/help/... ao clicar links relativos). */
export function normalizeInternalHref(href: string): string {
  const trimmed = href.trim();
  if (!trimmed || !isSafeCmsHref(trimmed)) return '/';
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    }
  }
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

export function normalizeCmsLink(href: string): { href: string | null; link_tipo: CmsLinkTipo } {
  const trimmed = href.trim();
  if (!trimmed || !isSafeCmsHref(trimmed)) return { href: null, link_tipo: null };
  if (/^https?:\/\//i.test(trimmed)) return { href: trimmed, link_tipo: 'external' };
  return { href: normalizeInternalHref(trimmed), link_tipo: 'href' };
}

export function openCmsLink(
  href: string | null | undefined,
  link_tipo: CmsLinkTipo,
  navigate: NavigateFunction
): void {
  const target = href?.trim();
  if (!target || !isSafeCmsHref(target)) return;

  if (link_tipo === 'external' || /^https?:\/\//i.test(target)) {
    window.open(target, '_blank', 'noopener,noreferrer');
    return;
  }

  navigate(normalizeInternalHref(target));
}

/** href seguro para <a> — null se inválido (use button + openCmsLink quando null). */
export function safeCmsAnchorHref(href: string | null | undefined): string | null {
  const target = href?.trim();
  if (!target || !isSafeCmsHref(target)) return null;
  if (/^https?:\/\//i.test(target)) return target;
  return normalizeInternalHref(target);
}
