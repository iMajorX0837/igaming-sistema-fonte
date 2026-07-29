import type { CopyByLanguage } from './types';
import type { CupomErrorCode } from '../lib/cupons';

export type CouponCopy = {
  title: string;
  subtitle: string;
  placeholder: string;
  validate: string;
  validating: string;
  activate: string;
  activating: string;
  validatedSuccess: string;
  loginRequired: string;
  requiresDeposit: string;
  validateError: string;
  activateError: string;
  validPreviewBalance: (bonus: string) => string;
  validPreviewSpins: (spins: string) => string;
  activatedBalance: (bonus: string) => string;
  activatedSpins: (spins: string) => string;
  spinsGrantFailed: string;
  errors: Record<CupomErrorCode, string>;
  minDeposit: (amount: string) => string;
  requiresDepositMin: (amount: string) => string;
  invalidFallback: string;
  formatSpins: (count: number, game?: string) => string;
};

const PT_ERRORS: Record<CupomErrorCode, string> = {
  not_authenticated: 'Faça login para usar cupons.',
  empty_code: 'Informe o código do cupom.',
  invalid_coupon: 'Cupom inválido ou expirado!',
  usage_limit_reached: 'Este cupom atingiu o limite total de uso.',
  user_limit_reached: 'Você já utilizou este cupom.',
  min_deposit_not_met: 'O valor do depósito não atinge o mínimo exigido pelo cupom.',
  requires_deposit: 'Este cupom deve ser usado durante um depósito.',
  zero_bonus: 'Este cupom não gera bônus.',
  deposit_not_found: 'Depósito não encontrado.',
  deposit_not_approved: 'O depósito ainda não foi aprovado.',
  forbidden: 'Operação não permitida.',
  invalid_spin_coupon_type: 'Cupom de rodadas inválido.',
  missing_game: 'Cupom de rodadas sem jogo configurado.',
  game_not_allowed: 'Jogo não permitido para cupons de rodadas.',
  invalid_spin_count: 'Quantidade de giros inválida.',
};

const EN_ERRORS: Record<CupomErrorCode, string> = {
  not_authenticated: 'Sign in to use coupons.',
  empty_code: 'Enter the coupon code.',
  invalid_coupon: 'Invalid or expired coupon!',
  usage_limit_reached: 'This coupon has reached its total usage limit.',
  user_limit_reached: 'You have already used this coupon.',
  min_deposit_not_met: 'Deposit amount does not meet the coupon minimum.',
  requires_deposit: 'This coupon must be used during a deposit.',
  zero_bonus: 'This coupon does not generate bonus.',
  deposit_not_found: 'Deposit not found.',
  deposit_not_approved: 'Deposit has not been approved yet.',
  forbidden: 'Operation not allowed.',
  invalid_spin_coupon_type: 'Invalid free spins coupon.',
  missing_game: 'Free spins coupon has no game configured.',
  game_not_allowed: 'Game not allowed for free spins coupons.',
  invalid_spin_count: 'Invalid spin count.',
};

const ES_ERRORS: Record<CupomErrorCode, string> = {
  not_authenticated: 'Inicia sesión para usar cupones.',
  empty_code: 'Ingresa el código del cupón.',
  invalid_coupon: '¡Cupón inválido o expirado!',
  usage_limit_reached: 'Este cupón alcanzó el límite total de uso.',
  user_limit_reached: 'Ya utilizaste este cupón.',
  min_deposit_not_met: 'El valor del depósito no alcanza el mínimo exigido.',
  requires_deposit: 'Este cupón debe usarse durante un depósito.',
  zero_bonus: 'Este cupón no genera bono.',
  deposit_not_found: 'Depósito no encontrado.',
  deposit_not_approved: 'El depósito aún no fue aprobado.',
  forbidden: 'Operación no permitida.',
  invalid_spin_coupon_type: 'Cupón de giros inválido.',
  missing_game: 'Cupón de giros sin juego configurado.',
  game_not_allowed: 'Juego no permitido para cupones de giros.',
  invalid_spin_count: 'Cantidad de giros inválida.',
};

export const COUPON_COPY: CopyByLanguage<CouponCopy> = {
  pt: {
    title: 'Cupom',
    subtitle: 'Ative um cupom na sua conta',
    placeholder: 'Insira o código do cupom',
    validate: 'Validar',
    validating: 'Validando...',
    activate: 'Ativar cupom',
    activating: 'Ativando...',
    validatedSuccess: 'Cupom validado com sucesso!',
    loginRequired: 'Faça login para usar cupons.',
    requiresDeposit: 'Este cupom deve ser usado durante um depósito.',
    validateError: 'Erro ao validar cupom. Tente novamente.',
    activateError: 'Erro ao ativar cupom. Tente novamente.',
    validPreviewBalance: (bonus) => `Cupom válido! Bônus de ${bonus}.`,
    validPreviewSpins: (spins) => `Cupom válido! ${spins}.`,
    activatedBalance: (bonus) => `Cupom ativado! ${bonus} creditados no seu saldo.`,
    activatedSpins: (spins) => `Cupom ativado! ${spins} disponíveis.`,
    spinsGrantFailed:
      'Cupom ativado, mas não foi possível enviar as rodadas grátis à PlayFivers.',
    errors: PT_ERRORS,
    minDeposit: (amount) => `Depósito mínimo de R$ ${amount} para este cupom.`,
    requiresDepositMin: (amount) => `Este cupom requer depósito mínimo de R$ ${amount}.`,
    invalidFallback: 'Cupom inválido ou expirado!',
    formatSpins: (count, game) => {
      const giros = `${count} giros`;
      return game ? `${giros} em ${game}` : giros;
    },
  },
  en: {
    title: 'Coupon',
    subtitle: 'Activate a coupon on your account',
    placeholder: 'Enter coupon code',
    validate: 'Validate',
    validating: 'Validating...',
    activate: 'Activate coupon',
    activating: 'Activating...',
    validatedSuccess: 'Coupon validated successfully!',
    loginRequired: 'Sign in to use coupons.',
    requiresDeposit: 'This coupon must be used during a deposit.',
    validateError: 'Error validating coupon. Please try again.',
    activateError: 'Error activating coupon. Please try again.',
    validPreviewBalance: (bonus) => `Valid coupon! Bonus of ${bonus}.`,
    validPreviewSpins: (spins) => `Valid coupon! ${spins}.`,
    activatedBalance: (bonus) => `Coupon activated! ${bonus} credited to your balance.`,
    activatedSpins: (spins) => `Coupon activated! ${spins} available.`,
    spinsGrantFailed:
      'Coupon activated, but free spins could not be sent to PlayFivers.',
    errors: EN_ERRORS,
    minDeposit: (amount) => `Minimum deposit of R$ ${amount} for this coupon.`,
    requiresDepositMin: (amount) => `This coupon requires a minimum deposit of R$ ${amount}.`,
    invalidFallback: 'Invalid or expired coupon!',
    formatSpins: (count, game) => {
      const spins = `${count} spins`;
      return game ? `${spins} on ${game}` : spins;
    },
  },
  es: {
    title: 'Cupón',
    subtitle: 'Activa un cupón en tu cuenta',
    placeholder: 'Ingresa el código del cupón',
    validate: 'Validar',
    validating: 'Validando...',
    activate: 'Activar cupón',
    activating: 'Activando...',
    validatedSuccess: '¡Cupón validado con éxito!',
    loginRequired: 'Inicia sesión para usar cupones.',
    requiresDeposit: 'Este cupón debe usarse durante un depósito.',
    validateError: 'Error al validar cupón. Inténtalo de nuevo.',
    activateError: 'Error al activar cupón. Inténtalo de nuevo.',
    validPreviewBalance: (bonus) => `¡Cupón válido! Bono de ${bonus}.`,
    validPreviewSpins: (spins) => `¡Cupón válido! ${spins}.`,
    activatedBalance: (bonus) => `¡Cupón activado! ${bonus} acreditados en tu saldo.`,
    activatedSpins: (spins) => `¡Cupón activado! ${spins} disponibles.`,
    spinsGrantFailed:
      'Cupón activado, pero no fue posible enviar los giros gratis a PlayFivers.',
    errors: ES_ERRORS,
    minDeposit: (amount) => `Depósito mínimo de R$ ${amount} para este cupón.`,
    requiresDepositMin: (amount) => `Este cupón requiere depósito mínimo de R$ ${amount}.`,
    invalidFallback: '¡Cupón inválido o expirado!',
    formatSpins: (count, game) => {
      const giros = `${count} giros`;
      return game ? `${giros} en ${game}` : giros;
    },
  },
};
