import {
  createMisticPayTransaction,
  checkMisticPayTransaction,
  createMisticPayWithdraw,
  mapPixKeyTypeToMisticPay,
  getMisticPayWebhookSecret,
} from '../misticpay.js';
import {
  createBspayTransaction,
  checkBspayTransaction,
  createBspayWithdraw,
  mapPixKeyTypeToBspay,
  getBspayWebhookSecret,
  validateBspayWebhookSignature,
} from '../bspay.js';
import {
  createVeopagTransaction,
  checkVeopagTransaction,
  createVeopagWithdraw,
  mapPixKeyTypeToVeopag,
  getVeopagWebhookSecret,
  validateVeopagWebhookSignature,
} from '../veopag.js';
import { getPaymentGatewayConfigService } from './paymentGatewayConfig.js';

async function getDepositGateway() {
  return getPaymentGatewayConfigService().getDepositGateway();
}

async function getWithdrawGateway() {
  return getPaymentGatewayConfigService().getWithdrawGateway();
}

/**
 * @param {{
 *   amount: number;
 *   payerName: string;
 *   payerDocument: string;
 *   payerEmail?: string;
 *   transactionId: string;
 *   description: string;
 *   postbackUrl?: string;
 * }} params
 */
export async function createPixTransaction(params) {
  const gateway = await getDepositGateway();

  if (gateway === 'bspay') {
    return createBspayTransaction(params);
  }

  if (gateway === 'veopag') {
    if (!params.payerEmail?.trim()) {
      throw new Error('E-mail do pagador é obrigatório para depósito via VeoPag.');
    }
    return createVeopagTransaction({
      ...params,
      payerEmail: params.payerEmail,
    });
  }

  return createMisticPayTransaction(params);
}

/** @param {string | number} transactionId */
export async function checkPixTransaction(transactionId) {
  const gateway = await getDepositGateway();

  if (gateway === 'bspay') {
    return checkBspayTransaction(transactionId);
  }

  if (gateway === 'veopag') {
    return checkVeopagTransaction(transactionId);
  }

  return checkMisticPayTransaction(transactionId);
}

/**
 * @param {{
 *   amount: number;
 *   pixKey: string;
 *   pixKeyType: string;
 *   description: string;
 *   externalId?: string;
 *   receiverName?: string;
 *   receiverDocument?: string;
 *   projectWebhook?: string;
 *   postbackUrl?: string;
 * }} params
 */
export async function createPixWithdraw(params) {
  const gateway = await getWithdrawGateway();

  if (gateway === 'bspay') {
    if (!params.externalId) {
      throw new Error('externalId é obrigatório para saque BSPay.');
    }

    return createBspayWithdraw({
      amount: params.amount,
      pixKey: params.pixKey,
      pixKeyType: params.pixKeyType,
      description: params.description,
      externalId: params.externalId,
      postbackUrl: params.postbackUrl ?? params.projectWebhook,
    });
  }

  if (gateway === 'veopag') {
    if (!params.externalId) {
      throw new Error('externalId é obrigatório para saque VeoPag.');
    }

    return createVeopagWithdraw({
      amount: params.amount,
      pixKey: params.pixKey,
      pixKeyType: params.pixKeyType,
      description: params.description,
      externalId: params.externalId,
      receiverName: params.receiverName,
      receiverDocument: params.receiverDocument,
      postbackUrl: params.postbackUrl ?? params.projectWebhook,
    });
  }

  return createMisticPayWithdraw({
    amount: params.amount,
    pixKey: params.pixKey,
    pixKeyType: params.pixKeyType,
    description: params.description,
    projectWebhook: params.projectWebhook ?? params.postbackUrl,
  });
}

/** @param {string | null | undefined} dbKey */
export function mapPixKeyType(dbKey) {
  return mapPixKeyTypeToMisticPay(dbKey);
}

export async function getDepositPaymentGateway() {
  return getDepositGateway();
}

export async function getWithdrawPaymentGateway() {
  return getWithdrawGateway();
}

/** @deprecated Use getWithdrawPaymentGateway para saques ou getDepositPaymentGateway para depósitos */
export async function getActivePaymentGateway() {
  return getWithdrawGateway();
}

export async function getWithdrawWebhookSecret() {
  const gateway = await getWithdrawGateway();
  if (gateway === 'bspay') {
    return getBspayWebhookSecret();
  }
  if (gateway === 'veopag') {
    return getVeopagWebhookSecret();
  }
  return getMisticPayWebhookSecret();
}

export {
  validateBspayWebhookSignature,
  validateVeopagWebhookSignature,
  mapPixKeyTypeToBspay,
  mapPixKeyTypeToVeopag,
  getVeopagWebhookSecret,
  getBspayWebhookSecret,
  getMisticPayWebhookSecret,
};
