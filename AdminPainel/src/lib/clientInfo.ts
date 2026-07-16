const IP_CACHE_KEY = 'admin_client_ip';
const DEVICE_CACHE_KEY = 'admin_client_device';

function parseDevice(ua: string): string {
  if (!ua) return 'Desconhecido';
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua)) return 'iPad';
  if (/Android/i.test(ua)) return 'Android';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Mac OS X|Macintosh/i.test(ua)) return 'macOS';
  if (/Linux/i.test(ua)) return 'Linux';
  return ua.length > 80 ? `${ua.slice(0, 77)}...` : ua;
}

export function getCachedDevice(): string {
  if (typeof window === 'undefined') return 'Desconhecido';
  try {
    const cached = sessionStorage.getItem(DEVICE_CACHE_KEY);
    if (cached) return cached;
    const device = parseDevice(navigator.userAgent);
    sessionStorage.setItem(DEVICE_CACHE_KEY, device);
    return device;
  } catch {
    return parseDevice(typeof navigator !== 'undefined' ? navigator.userAgent : '');
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
