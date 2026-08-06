export type AppLanguage = 'pt' | 'en' | 'es';

export type CopyByLanguage<T> = Record<AppLanguage, T>;

export function pickCopy<T>(lang: AppLanguage, copy: CopyByLanguage<T>): T {
  return copy[lang] ?? copy.pt;
}

export function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? `{${key}}`));
}
