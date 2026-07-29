import type { CopyByLanguage } from './types';

export type WalletCopy = {
  title: string;
  availableBalance: string;
  bonusBalance: string;
  cashback: string;
  withdraw: string;
  deposit: string;
  convert: string;
  converting: string;
  tabs: {
    transactions: string;
    deposits: string;
    withdrawals: string;
    coupons: string;
    bonus: string;
    freeSpins: string;
  };
  columns: {
    id: string;
    game: string;
    bet: string;
    return: string;
    status: string;
    bonus: string;
    date: string;
    value: string;
    coupon: string;
    remaining: string;
    total: string;
    type: string;
    description: string;
    action: string;
  };
  status: {
    approved: string;
    rejected: string;
    pending: string;
    processing: string;
    failed: string;
    realBalance: string;
    win: string;
    conversion: string;
  };
  empty: {
    transactions: string;
    deposits: string;
    withdrawals: string;
    coupons: string;
    freeSpins: string;
    bonus: string;
  };
  bonusConverted: string;
  bonusConvertError: string;
  bonusConvertFailed: string;
  loginToPlay: string;
  gameNotFound: string;
  openGameError: string;
  freeSpinsDesc: string;
  convertedToBalance: string;
  loginRequired: string;
  toggleBonus: string;
  toggleBalance: string;
  balanceHighlight: string;
  toggleCooldown: string;
};

export const WALLET_COPY: CopyByLanguage<WalletCopy> = {
  pt: {
    title: 'Carteira',
    availableBalance: 'Saldo disponível',
    bonusBalance: 'Bônus disponível',
    cashback: 'Cashback',
    withdraw: 'Sacar',
    deposit: 'Depositar',
    convert: 'Converter',
    converting: 'Convertendo...',
    tabs: {
      transactions: 'Transações',
      deposits: 'Depósitos',
      withdrawals: 'Saques',
      coupons: 'Cupons',
      bonus: 'Bônus',
      freeSpins: 'Rodadas Grátis',
    },
    columns: {
      id: 'Identificador',
      game: 'Jogo',
      bet: 'Aposta',
      return: 'Retorno',
      status: 'Status',
      bonus: 'Bônus',
      date: 'Data',
      value: 'Valor',
      coupon: 'Cupom',
      remaining: 'Restantes',
      total: 'Total',
      type: 'Tipo',
      description: 'Descrição',
      action: 'Ação',
    },
    status: {
      approved: 'Aprovado',
      rejected: 'Rejeitado',
      pending: 'Pendente',
      processing: 'Processando',
      failed: 'Falhou',
      realBalance: 'Saldo Real',
      win: 'Ganho',
      conversion: 'Conversão',
    },
    empty: {
      transactions: 'Nenhuma transação encontrada',
      deposits: 'Nenhum depósito encontrado',
      withdrawals: 'Nenhum saque encontrado',
      coupons: 'Nenhum cupom encontrado',
      freeSpins: 'Nenhuma rodada grátis encontrada',
      bonus: 'Nenhum bônus encontrado',
    },
    bonusConverted: 'Bônus convertido com sucesso!',
    bonusConvertError: 'Erro ao converter bônus. Tente novamente.',
    bonusConvertFailed: 'Não foi possível converter o bônus.',
    loginToPlay: 'Faça login para jogar.',
    gameNotFound: 'Jogo não encontrado na API PlayFivers.',
    openGameError: 'Erro ao abrir o jogo. Tente novamente.',
    freeSpinsDesc: 'Rodadas grátis',
    convertedToBalance: 'Convertido para saldo disponível',
    loginRequired: 'Faça login para acessar sua carteira.',
    toggleBonus: 'Alternar para bônus',
    toggleBalance: 'Alternar para saldo',
    balanceHighlight: 'Saldo disponível (R$) em destaque',
    toggleCooldown: 'Aguarde {seconds}s para alternar novamente',
  },
  en: {
    title: 'Wallet',
    availableBalance: 'Available balance',
    bonusBalance: 'Available bonus',
    cashback: 'Cashback',
    withdraw: 'Withdraw',
    deposit: 'Deposit',
    convert: 'Convert',
    converting: 'Converting...',
    tabs: {
      transactions: 'Transactions',
      deposits: 'Deposits',
      withdrawals: 'Withdrawals',
      coupons: 'Coupons',
      bonus: 'Bonus',
      freeSpins: 'Free Spins',
    },
    columns: {
      id: 'ID',
      game: 'Game',
      bet: 'Bet',
      return: 'Return',
      status: 'Status',
      bonus: 'Bonus',
      date: 'Date',
      value: 'Amount',
      coupon: 'Coupon',
      remaining: 'Remaining',
      total: 'Total',
      type: 'Type',
      description: 'Description',
      action: 'Action',
    },
    status: {
      approved: 'Approved',
      rejected: 'Rejected',
      pending: 'Pending',
      processing: 'Processing',
      failed: 'Failed',
      realBalance: 'Real Balance',
      win: 'Win',
      conversion: 'Conversion',
    },
    empty: {
      transactions: 'No transactions found',
      deposits: 'No deposits found',
      withdrawals: 'No withdrawals found',
      coupons: 'No coupons found',
      freeSpins: 'No free spins found',
      bonus: 'No bonus found',
    },
    bonusConverted: 'Bonus converted successfully!',
    bonusConvertError: 'Error converting bonus. Please try again.',
    bonusConvertFailed: 'Could not convert bonus.',
    loginToPlay: 'Sign in to play.',
    gameNotFound: 'Game not found in PlayFivers API.',
    openGameError: 'Error opening game. Please try again.',
    freeSpinsDesc: 'Free spins',
    convertedToBalance: 'Converted to available balance',
    loginRequired: 'Sign in to access your wallet.',
    toggleBonus: 'Switch to bonus',
    toggleBalance: 'Switch to balance',
    balanceHighlight: 'Available balance (R$) highlighted',
    toggleCooldown: 'Wait {seconds}s to switch again',
  },
  es: {
    title: 'Cartera',
    availableBalance: 'Saldo disponible',
    bonusBalance: 'Bono disponible',
    cashback: 'Cashback',
    withdraw: 'Retirar',
    deposit: 'Depositar',
    convert: 'Convertir',
    converting: 'Convirtiendo...',
    tabs: {
      transactions: 'Transacciones',
      deposits: 'Depósitos',
      withdrawals: 'Retiros',
      coupons: 'Cupones',
      bonus: 'Bono',
      freeSpins: 'Giros Gratis',
    },
    columns: {
      id: 'Identificador',
      game: 'Juego',
      bet: 'Apuesta',
      return: 'Retorno',
      status: 'Estado',
      bonus: 'Bono',
      date: 'Fecha',
      value: 'Valor',
      coupon: 'Cupón',
      remaining: 'Restantes',
      total: 'Total',
      type: 'Tipo',
      description: 'Descripción',
      action: 'Acción',
    },
    status: {
      approved: 'Aprobado',
      rejected: 'Rechazado',
      pending: 'Pendiente',
      processing: 'Procesando',
      failed: 'Falló',
      realBalance: 'Saldo Real',
      win: 'Ganancia',
      conversion: 'Conversión',
    },
    empty: {
      transactions: 'Ninguna transacción encontrada',
      deposits: 'Ningún depósito encontrado',
      withdrawals: 'Ningún retiro encontrado',
      coupons: 'Ningún cupón encontrado',
      freeSpins: 'Ningún giro gratis encontrado',
      bonus: 'Ningún bono encontrado',
    },
    bonusConverted: '¡Bono convertido con éxito!',
    bonusConvertError: 'Error al convertir bono. Inténtalo de nuevo.',
    bonusConvertFailed: 'No fue posible convertir el bono.',
    loginToPlay: 'Inicia sesión para jugar.',
    gameNotFound: 'Juego no encontrado en la API PlayFivers.',
    openGameError: 'Error al abrir el juego. Inténtalo de nuevo.',
    freeSpinsDesc: 'Giros gratis',
    convertedToBalance: 'Convertido a saldo disponible',
    loginRequired: 'Inicia sesión para acceder a tu cartera.',
    toggleBonus: 'Cambiar a bono',
    toggleBalance: 'Cambiar a saldo',
    balanceHighlight: 'Saldo disponible (R$) destacado',
    toggleCooldown: 'Espera {seconds}s para cambiar de nuevo',
  },
};
