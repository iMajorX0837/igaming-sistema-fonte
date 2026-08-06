export interface EntryPopupConfig {
  ativo: boolean;
  imagem_url: string;
}

export const DEFAULT_ENTRY_POPUP_CONFIG: EntryPopupConfig = {
  ativo: false,
  imagem_url: '',
};

const STORAGE_KEY = 'venuz-entry-popup-v1';

function readCache(): EntryPopupConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeEntryPopupConfig(JSON.parse(raw) as Record<string, unknown>);
  } catch {
    return null;
  }
}

export function normalizeEntryPopupConfig(row: Record<string, unknown> | null): EntryPopupConfig {
  if (!row) return DEFAULT_ENTRY_POPUP_CONFIG;

  if ('entry_popup_ativo' in row) {
    return {
      ativo: Boolean(row.entry_popup_ativo),
      imagem_url: String(row.entry_popup_imagem_url || '').trim(),
    };
  }

  return {
    ativo: row.ativo === true,
    imagem_url: String(row.imagem_url || '').trim(),
  };
}

export function getInitialEntryPopupConfig(): EntryPopupConfig {
  return readCache() ?? DEFAULT_ENTRY_POPUP_CONFIG;
}

export function persistEntryPopupConfig(config: EntryPopupConfig) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore quota / private mode
  }
}
