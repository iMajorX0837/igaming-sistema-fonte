/** Formata número como moeda BRL (ex.: 1000 → "R$ 1.000,00"), igual ao Header do site. */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

/** Valor exibido no input (sem prefixo R$ — o campo já mostra o símbolo). */
export function formatBRLInputValue(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

/** Converte texto do input (1.000,00 ou 1000,50) em número. */
export function parseBRLInput(raw: string): number {
  const trimmed = raw.trim();
  if (!trimmed) return NaN;

  const normalized = trimmed.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
}

/**
 * Máscara centavos enquanto digita: "100000" → "1.000,00"
 * Mesmo padrão visual do saldo no Header (pt-BR).
 */
export function maskBRLInput(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  const cents = Number(digits);
  if (!Number.isFinite(cents)) return '';
  return formatBRLInputValue(cents / 100);
}
