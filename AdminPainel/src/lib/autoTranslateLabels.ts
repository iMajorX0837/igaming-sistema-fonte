import { DEFAULT_SIDEBAR_COPY } from '../constants/sidebarCopy';

export type SidebarLanguage = 'pt' | 'en' | 'es';

export interface LabelSet {
  line1: string;
  line2: string;
}

export interface Labels {
  pt: LabelSet;
  en: LabelSet;
  es: LabelSet;
}

const translationCache = new Map<string, { en: string; es: string }>();

function normalizeLookupKey(value: string) {
  return value.trim().toLowerCase();
}

function buildKnownTranslations(): Map<string, { en: string; es: string }> {
  const map = new Map<string, { en: string; es: string }>();

  const keys = Object.keys(DEFAULT_SIDEBAR_COPY.pt) as (keyof typeof DEFAULT_SIDEBAR_COPY.pt)[];
  for (const key of keys) {
    const pt = DEFAULT_SIDEBAR_COPY.pt[key].trim();
    const en = DEFAULT_SIDEBAR_COPY.en[key].trim();
    const es = DEFAULT_SIDEBAR_COPY.es[key].trim();
    if (!pt) continue;
    map.set(normalizeLookupKey(pt), { en, es });
  }

  return map;
}

const KNOWN_TRANSLATIONS = buildKnownTranslations();

function isValidTranslation(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const upper = trimmed.toUpperCase();
  if (upper.includes('MYMEMORY')) return false;
  if (upper.includes('INVALID')) return false;
  if (upper.includes('PLEASE SELECT')) return false;
  return true;
}

async function translateOne(text: string, target: 'en' | 'es'): Promise<string> {
  const langpair = target === 'en' ? 'pt|en' : 'pt|es';
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langpair}`;

  const response = await fetch(url);
  if (!response.ok) return text;

  const data = (await response.json()) as {
    responseData?: { translatedText?: string };
  };

  const translated = data.responseData?.translatedText?.trim();
  if (!translated || !isValidTranslation(translated)) return text;
  return translated;
}

export async function translateFromPortuguese(text: string): Promise<{ en: string; es: string }> {
  const pt = text.trim();
  if (!pt) return { en: '', es: '' };

  const cached = translationCache.get(pt);
  if (cached) return cached;

  const known = KNOWN_TRANSLATIONS.get(normalizeLookupKey(pt));
  if (known) {
    translationCache.set(pt, known);
    return known;
  }

  try {
    const [en, es] = await Promise.all([translateOne(pt, 'en'), translateOne(pt, 'es')]);
    const result = { en, es };
    translationCache.set(pt, result);
    return result;
  } catch {
    return { en: pt, es: pt };
  }
}

export async function buildLabelsFromPortuguese(ptLine1: string): Promise<Labels> {
  return buildCardLabelsFromPortuguese(ptLine1);
}

export async function buildCardLabelsFromPortuguese(
  ptLine1: string,
  ptLine2 = '',
): Promise<Labels> {
  const line1 = ptLine1.trim();
  const line2 = ptLine2.trim();

  const [line1Trans, line2Trans] = await Promise.all([
    translateFromPortuguese(line1),
    line2 ? translateFromPortuguese(line2) : Promise.resolve({ en: '', es: '' }),
  ]);

  return {
    pt: { line1, line2 },
    en: { line1: line1Trans.en, line2: line2Trans.en },
    es: { line1: line1Trans.es, line2: line2Trans.es },
  };
}

export function emptyLabels(): Labels {
  return {
    pt: { line1: '', line2: '' },
    en: { line1: '', line2: '' },
    es: { line1: '', line2: '' },
  };
}
