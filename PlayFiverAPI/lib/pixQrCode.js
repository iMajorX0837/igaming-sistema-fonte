import QRCode from 'qrcode';

/**
 * Extrai campos comuns de QR PIX de respostas de gateways diferentes.
 * @param {Record<string, unknown>} payload
 */
export function extractPixPaymentFields(payload) {
  const data =
    typeof payload?.data === 'object' && payload.data !== null ? payload.data : payload;
  const paymentInfo =
    (typeof data?.payment_info === 'object' && data.payment_info !== null
      ? data.payment_info
      : null) ??
    (typeof data?.qrCodeResponse === 'object' && data.qrCodeResponse !== null
      ? data.qrCodeResponse
      : null) ??
    data;

  const copyPaste = String(
    paymentInfo?.qrcode ??
      paymentInfo?.copyPaste ??
      paymentInfo?.copy_paste ??
      data?.qrcode ??
      data?.copyPaste ??
      data?.copy_paste ??
      ''
  ).trim();

  let qrCodeBase64 =
    paymentInfo?.qrCodeBase64 ??
    paymentInfo?.qrcodeBase64 ??
    paymentInfo?.qrcode_base64 ??
    paymentInfo?.qr_code_base64 ??
    data?.qrCodeBase64 ??
    data?.qrcode_base64;

  const qrcodeUrl =
    paymentInfo?.qrcodeUrl ??
    paymentInfo?.qrcode_url ??
    data?.qrcodeUrl ??
    data?.qrcode_url;

  if (typeof qrCodeBase64 === 'string' && qrCodeBase64 && !qrCodeBase64.startsWith('data:')) {
    qrCodeBase64 = `data:image/png;base64,${qrCodeBase64}`;
  }

  return {
    copyPaste: copyPaste || undefined,
    qrCodeBase64: typeof qrCodeBase64 === 'string' ? qrCodeBase64 : undefined,
    qrcodeUrl: typeof qrcodeUrl === 'string' ? qrcodeUrl : undefined,
  };
}

/**
 * Gera imagem PNG (data URL) a partir do EMV quando o gateway não envia QR pronto.
 * @param {{
 *   copyPaste?: string;
 *   qrCodeBase64?: string;
 *   qrcodeUrl?: string;
 *   externalTransactionId?: string;
 * }} result
 */
export async function enrichPixQrImage(result) {
  if (!result || result.qrCodeBase64 || result.qrcodeUrl) {
    return result;
  }

  const emv = result.copyPaste?.trim();
  if (!emv) {
    return result;
  }

  try {
    const dataUrl = await QRCode.toDataURL(emv, {
      margin: 1,
      width: 280,
      errorCorrectionLevel: 'M',
    });
    return { ...result, qrCodeBase64: dataUrl };
  } catch (err) {
    console.warn('[PIX QR] Falha ao gerar imagem do EMV:', err?.message || err);
    return result;
  }
}
