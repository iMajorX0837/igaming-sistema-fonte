import QRCode from 'qrcode';

export type PixQrFields = {
  copyPaste?: string;
  qrCodeBase64?: string;
  qrcodeUrl?: string;
};

/** Resolve imagem do QR a partir dos campos retornados pela API. */
export function resolvePixQrImageSrc(result: PixQrFields | null | undefined): string | null {
  if (!result) return null;

  if (result.qrCodeBase64) {
    return result.qrCodeBase64.startsWith('data:')
      ? result.qrCodeBase64
      : `data:image/png;base64,${result.qrCodeBase64}`;
  }

  if (result.qrcodeUrl) {
    return result.qrcodeUrl;
  }

  return null;
}

/** Gera data URL do QR a partir do EMV (copia e cola) quando a API não envia imagem. */
export async function generatePixQrDataUrl(copyPaste: string): Promise<string | null> {
  const emv = copyPaste.trim();
  if (!emv) return null;

  try {
    return await QRCode.toDataURL(emv, {
      margin: 1,
      width: 280,
      errorCorrectionLevel: 'M',
    });
  } catch {
    return null;
  }
}
