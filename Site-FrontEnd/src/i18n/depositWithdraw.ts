import type { CopyByLanguage } from './types';

export type DepositWithdrawCopy = {
  depositTitle: string;
  depositAlt: string;
  depositAmount: string;
  addCoupon: string;
  couponPlaceholder: string;
  validate: string;
  validating: string;
  deposit: string;
  generatingPix: string;
  makePayment: string;
  scanQrCode: string;
  qrCodeAlt: string;
  paymentTimeRemaining: string;
  paymentConfirmed: string;
  copyPix: string;
  copied: string;
  copyFailed: string;
  loginToDeposit: string;
  integerAmountRequired: (min: number) => string;
  minDeposit: (min: number) => string;
  maxDeposit: (max: string) => string;
  pixGenerateError: string;
  depositApproved: string;
  addBalanceSubtitle: string;
  couponValidBonus: (bonus: string) => string;
  depositValueForCoupon: string;
  couponValidateError: string;
  invalidCoupon: string;
  withdrawTitle: string;
  withdrawSubtitle: string;
  withdrawAmount: string;
  availableForWithdraw: string;
  pixKeyType: string;
  pixKey: string;
  notRegistered: string;
  withdraw: string;
  processing: string;
  authRequired: string;
  insufficientBalance: string;
  invalidAmount: string;
  minWithdraw: (min: number) => string;
  maxWithdraw: (max: string) => string;
  insufficientForWithdraw: string;
  rolloverPending: (amount: string) => string;
  pixKeyRequired: string;
  userNotFound: string;
  balanceFetchError: string;
  withdrawProcessError: string;
  withdrawSuccess: string;
  pixOwnership: string;
  pixTypes: {
    email: string;
    cpf: string;
    phone: string;
  };
};

export const DEPOSIT_WITHDRAW_COPY: CopyByLanguage<DepositWithdrawCopy> = {
  pt: {
    depositTitle: 'Depósito',
    depositAlt: 'Depósito',
    depositAmount: 'Valor a ser depositado',
    addCoupon: 'Adicionar cupom',
    couponPlaceholder: 'Cupom de desconto (opcional)',
    validate: 'Validar',
    validating: 'Validando...',
    deposit: 'Depositar',
    generatingPix: 'Gerando PIX...',
    makePayment: 'Realizar pagamento',
    scanQrCode: 'Aponte a câmera do seu celular para o QRCode',
    qrCodeAlt: 'QR Code PIX',
    paymentTimeRemaining: 'O tempo para pagar acaba em:',
    paymentConfirmed: 'Pagamento confirmado',
    copyPix: 'Copiar copia e cola',
    copied: 'Copiado!',
    copyFailed: 'Não foi possível copiar. Copie manualmente o código abaixo.',
    loginToDeposit: 'Faça login para depositar.',
    integerAmountRequired: (min) => `Informe um valor inteiro em reais (mínimo R$ ${min},00).`,
    minDeposit: (min) => `Informe um valor mínimo de R$ ${min},00.`,
    maxDeposit: (max) => `O valor máximo para depósito é R$ ${max},00.`,
    pixGenerateError: 'Erro ao gerar o PIX. Tente novamente.',
    depositApproved: 'Seu depósito foi aprovado e o saldo foi atualizado.',
    addBalanceSubtitle: 'Adicione saldo à sua conta',
    couponValidBonus: (bonus) =>
      `Cupom válido! Bônus de ${bonus} será creditado após o pagamento.`,
    depositValueForCoupon: 'Informe o valor do depósito para validar este cupom.',
    couponValidateError: 'Erro ao validar cupom. Tente novamente.',
    invalidCoupon: 'Cupom inválido ou expirado!',
    withdrawTitle: 'Saques',
    withdrawSubtitle: 'Escolha o valor que deseja sacar da sua conta',
    withdrawAmount: 'Valor a sacar',
    availableForWithdraw: 'Disponível para saque',
    pixKeyType: 'Tipo de chave PIX',
    pixKey: 'Chave PIX',
    notRegistered: 'Não cadastrado na conta',
    withdraw: 'Sacar',
    processing: 'Processando...',
    authRequired: 'Você precisa estar autenticado para realizar um saque',
    insufficientBalance: 'Saldo insuficiente para realizar um saque.',
    invalidAmount: 'Por favor, insira um valor válido',
    minWithdraw: (min) => `O valor mínimo para saque é R$ ${min},00.`,
    maxWithdraw: (max) => `O valor máximo para saque é R$ ${max},00.`,
    insufficientForWithdraw: 'Saldo insuficiente para realizar este saque',
    rolloverPending: (amount) =>
      `Rollover pendente: aposte mais R$ ${amount} antes de sacar.`,
    pixKeyRequired: 'Por favor, informe a chave PIX',
    userNotFound: 'Usuário não encontrado',
    balanceFetchError: 'Erro ao buscar saldo atual',
    withdrawProcessError: 'Erro ao processar saque. Tente novamente.',
    withdrawSuccess: 'Saque solicitado com sucesso! O valor será processado em breve.',
    pixOwnership: 'A chave PIX deve pertencer ao titular da conta.',
    pixTypes: { email: 'Email', cpf: 'CPF', phone: 'Telefone' },
  },
  en: {
    depositTitle: 'Deposit',
    depositAlt: 'Deposit',
    depositAmount: 'Amount to deposit',
    addCoupon: 'Add coupon',
    couponPlaceholder: 'Discount coupon (optional)',
    validate: 'Validate',
    validating: 'Validating...',
    deposit: 'Deposit',
    generatingPix: 'Generating PIX...',
    makePayment: 'Make payment',
    scanQrCode: 'Point your phone camera at the QR Code',
    qrCodeAlt: 'PIX QR Code',
    paymentTimeRemaining: 'Time to pay ends in:',
    paymentConfirmed: 'Payment confirmed',
    copyPix: 'Copy PIX code',
    copied: 'Copied!',
    copyFailed: 'Could not copy. Copy the code below manually.',
    loginToDeposit: 'Sign in to deposit.',
    integerAmountRequired: (min) => `Enter a whole amount in reais (minimum R$ ${min}.00).`,
    minDeposit: (min) => `Enter a minimum amount of R$ ${min}.00.`,
    maxDeposit: (max) => `Maximum deposit amount is R$ ${max}.00.`,
    pixGenerateError: 'Error generating PIX. Please try again.',
    depositApproved: 'Your deposit was approved and your balance was updated.',
    addBalanceSubtitle: 'Add balance to your account',
    couponValidBonus: (bonus) =>
      `Valid coupon! Bonus of ${bonus} will be credited after payment.`,
    depositValueForCoupon: 'Enter the deposit amount to validate this coupon.',
    couponValidateError: 'Error validating coupon. Please try again.',
    invalidCoupon: 'Invalid or expired coupon!',
    withdrawTitle: 'Withdrawals',
    withdrawSubtitle: 'Choose the amount you want to withdraw from your account',
    withdrawAmount: 'Amount to withdraw',
    availableForWithdraw: 'Available for withdrawal',
    pixKeyType: 'PIX key type',
    pixKey: 'PIX key',
    notRegistered: 'Not registered on account',
    withdraw: 'Withdraw',
    processing: 'Processing...',
    authRequired: 'You must be signed in to make a withdrawal',
    insufficientBalance: 'Insufficient balance to make a withdrawal.',
    invalidAmount: 'Please enter a valid amount',
    minWithdraw: (min) => `Minimum withdrawal amount is R$ ${min}.00.`,
    maxWithdraw: (max) => `Maximum withdrawal amount is R$ ${max}.00.`,
    insufficientForWithdraw: 'Insufficient balance for this withdrawal',
    rolloverPending: (amount) =>
      `Pending rollover: bet R$ ${amount} more before withdrawing.`,
    pixKeyRequired: 'Please enter your PIX key',
    userNotFound: 'User not found',
    balanceFetchError: 'Error fetching current balance',
    withdrawProcessError: 'Error processing withdrawal. Please try again.',
    withdrawSuccess: 'Withdrawal requested successfully! The amount will be processed shortly.',
    pixOwnership: 'The PIX key must belong to the account holder.',
    pixTypes: { email: 'Email', cpf: 'CPF', phone: 'Phone' },
  },
  es: {
    depositTitle: 'Depósito',
    depositAlt: 'Depósito',
    depositAmount: 'Valor a depositar',
    addCoupon: 'Agregar cupón',
    couponPlaceholder: 'Cupón de descuento (opcional)',
    validate: 'Validar',
    validating: 'Validando...',
    deposit: 'Depositar',
    generatingPix: 'Generando PIX...',
    makePayment: 'Realizar pago',
    scanQrCode: 'Apunta la cámara de tu celular al código QR',
    qrCodeAlt: 'Código QR PIX',
    paymentTimeRemaining: 'El tiempo para pagar termina en:',
    paymentConfirmed: 'Pago confirmado',
    copyPix: 'Copiar código PIX',
    copied: '¡Copiado!',
    copyFailed: 'No fue posible copiar. Copia el código manualmente.',
    loginToDeposit: 'Inicia sesión para depositar.',
    integerAmountRequired: (min) => `Ingresa un valor entero en reales (mínimo R$ ${min},00).`,
    minDeposit: (min) => `Ingresa un valor mínimo de R$ ${min},00.`,
    maxDeposit: (max) => `El valor máximo para depósito es R$ ${max},00.`,
    pixGenerateError: 'Error al generar PIX. Inténtalo de nuevo.',
    depositApproved: 'Tu depósito fue aprobado y el saldo fue actualizado.',
    addBalanceSubtitle: 'Agrega saldo a tu cuenta',
    couponValidBonus: (bonus) =>
      `¡Cupón válido! Bono de ${bonus} será acreditado después del pago.`,
    depositValueForCoupon: 'Ingresa el valor del depósito para validar este cupón.',
    couponValidateError: 'Error al validar cupón. Inténtalo de nuevo.',
    invalidCoupon: '¡Cupón inválido o expirado!',
    withdrawTitle: 'Retiros',
    withdrawSubtitle: 'Elige el valor que deseas retirar de tu cuenta',
    withdrawAmount: 'Valor a retirar',
    availableForWithdraw: 'Disponible para retiro',
    pixKeyType: 'Tipo de clave PIX',
    pixKey: 'Clave PIX',
    notRegistered: 'No registrado en la cuenta',
    withdraw: 'Retirar',
    processing: 'Procesando...',
    authRequired: 'Debes iniciar sesión para realizar un retiro',
    insufficientBalance: 'Saldo insuficiente para realizar un retiro.',
    invalidAmount: 'Por favor, ingresa un valor válido',
    minWithdraw: (min) => `El valor mínimo para retiro es R$ ${min},00.`,
    maxWithdraw: (max) => `El valor máximo para retiro es R$ ${max},00.`,
    insufficientForWithdraw: 'Saldo insuficiente para este retiro',
    rolloverPending: (amount) =>
      `Rollover pendiente: apuesta R$ ${amount} más antes de retirar.`,
    pixKeyRequired: 'Por favor, ingresa la clave PIX',
    userNotFound: 'Usuario no encontrado',
    balanceFetchError: 'Error al buscar saldo actual',
    withdrawProcessError: 'Error al procesar retiro. Inténtalo de nuevo.',
    withdrawSuccess: '¡Retiro solicitado con éxito! El valor será procesado en breve.',
    pixOwnership: 'La clave PIX debe pertenecer al titular de la cuenta.',
    pixTypes: { email: 'Email', cpf: 'CPF', phone: 'Teléfono' },
  },
};
