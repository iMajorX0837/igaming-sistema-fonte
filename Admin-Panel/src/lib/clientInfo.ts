import { buildLogDeviceValue, LOG_DEVICE_SEPARATOR } from './logDeviceInfo';

const IP_CACHE_KEY = 'admin_client_ip';
const DEVICE_CACHE_KEY = 'admin_client_device';

export function getCachedDevice(): string {
  if (typeof window === 'undefined') return 'Desconhecido';
  try {
    const cached = sessionStorage.getItem(DEVICE_CACHE_KEY);
    if (cached && cached.includes(LOG_DEVICE_SEPARATOR)) return cached;
    const device = buildLogDeviceValue(navigator.userAgent);
    sessionStorage.setItem(DEVICE_CACHE_KEY, device);
    return device;
  } catch {
    return buildLogDeviceValue(typeof navigator !== 'undefined' ? navigator.userAgent : '');
  }
}

export function getCachedIp(): string {
  if (typeof window === 'undefined') return '';
  try {
    return sessionStorage.getItem(IP_CACHE_KEY) || '';
  } catch {
    return '';
  }
}

export async function initClientInfo(): Promise<void> {
  if (typeof window === 'undefined') return;

  getCachedDevice();

  if (getCachedIp()) return;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const response = await fetch('https://api.ipify.org?format=json', {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) return;

    const data = (await response.json()) as { ip?: string };
    if (data.ip) {
      sessionStorage.setItem(IP_CACHE_KEY, data.ip);
    }
  } catch {
    // IP opcional — logs funcionam sem ele
  }
}
