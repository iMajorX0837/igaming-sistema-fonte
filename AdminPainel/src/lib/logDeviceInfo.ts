import type { LucideIcon } from 'lucide-react';
import { Globe, Laptop, Monitor, Smartphone, Tablet } from 'lucide-react';

export const LOG_DEVICE_SEPARATOR = '::';

export interface ParsedLogDevice {
  browser: string;
  device: string;
}

export function parseBrowser(ua: string): string {
  if (!ua) return 'Desconhecido';
  if (/Edg\//i.test(ua)) return 'Edge';
  if (/OPR\//i.test(ua) || /Opera/i.test(ua)) return 'Opera';
  if (/Firefox\//i.test(ua)) return 'Firefox';
  if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) return 'Chrome';
  if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return 'Safari';
  return 'Outro';
}

export function parseDeviceFromUserAgent(ua: string): string {
  if (!ua) return 'Desconhecido';
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua)) return 'iPad';
  if (/Android/i.test(ua)) return 'Android';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Mac OS X|Macintosh/i.test(ua)) return 'macOS';
  if (/Linux/i.test(ua)) return 'Linux';
  return ua.length > 80 ? `${ua.slice(0, 77)}...` : ua;
}

export function buildLogDeviceValue(ua: string): string {
  return `${parseBrowser(ua)}${LOG_DEVICE_SEPARATOR}${parseDeviceFromUserAgent(ua)}`;
}

export function parseLogDispositivo(value: string | null | undefined): ParsedLogDevice | null {
  if (!value?.trim()) return null;

  if (value.includes(LOG_DEVICE_SEPARATOR)) {
    const [browser, device] = value.split(LOG_DEVICE_SEPARATOR);
    return {
      browser: browser?.trim() || 'Desconhecido',
      device: device?.trim() || 'Desconhecido',
    };
  }

  return {
    browser: 'Desconhecido',
    device: value.trim(),
  };
}

export function getDeviceLucideIcon(device: string): LucideIcon {
  if (/iPhone|Android/i.test(device)) return Smartphone;
  if (/iPad/i.test(device)) return Tablet;
  if (/macOS|Mac/i.test(device)) return Laptop;
  return Monitor;
}

export type BrowserKey = 'Chrome' | 'Firefox' | 'Safari' | 'Edge' | 'Opera' | 'Outro' | 'Desconhecido';

export function getBrowserKey(browser: string): BrowserKey {
  if (browser === 'Chrome') return 'Chrome';
  if (browser === 'Firefox') return 'Firefox';
  if (browser === 'Safari') return 'Safari';
  if (browser === 'Edge') return 'Edge';
  if (browser === 'Opera') return 'Opera';
  if (browser === 'Desconhecido') return 'Desconhecido';
  return 'Outro';
}
