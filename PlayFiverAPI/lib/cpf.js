/**
 * Normaliza CPF para apenas dígitos.
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeCpf(value) {
  return String(value ?? '').replace(/\D/g, '');
}

/**
 * Formata CPF 000.000.000-00 (entrada já normalizada com 11 dígitos).
 * @param {string} digits
 * @returns {string}
 */
export function formatCpf(digits) {
  const cpf = normalizeCpf(digits);
  if (cpf.length !== 11) return cpf;
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9, 11)}`;
}

/**
 * Valida CPF pelo algoritmo dos dígitos verificadores.
 * @param {unknown} value
 * @returns {boolean}
 */
export function isValidCpf(value) {
  const cpf = normalizeCpf(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const calcDigit = (base, factorStart) => {
    let sum = 0;
    for (let i = 0; i < base.length; i += 1) {
      sum += Number(base[i]) * (factorStart - i);
    }
    const mod = (sum * 10) % 11;
    return mod === 10 ? 0 : mod;
  };

  const d1 = calcDigit(cpf.slice(0, 9), 10);
  const d2 = calcDigit(cpf.slice(0, 10), 11);
  return d1 === Number(cpf[9]) && d2 === Number(cpf[10]);
}
