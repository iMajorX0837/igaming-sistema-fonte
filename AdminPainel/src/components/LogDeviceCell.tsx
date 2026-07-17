import { Globe } from 'lucide-react';
import {
  getBrowserKey,
  getDeviceLucideIcon,
  parseLogDispositivo,
} from '../lib/logDeviceInfo';

function BrowserBrandIcon({ browser }: { browser: string }) {
  const key = getBrowserKey(browser);

  if (key === 'Chrome') {
    return (
      <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="#4285F4" />
        <circle cx="12" cy="12" r="4.2" fill="#fff" />
        <path d="M12 7.8a4.2 4.2 0 0 1 3.64 2.1H19.1A7.8 7.8 0 0 0 12 4.2V7.8Z" fill="#EA4335" />
        <path d="M8.5 14.1a4.2 4.2 0 0 1 0-4.2L5.9 8.3A7.8 7.8 0 0 0 4.2 12c0 1.3.31 2.53.86 3.62L8.5 14.1Z" fill="#FBBC04" />
        <path d="M12 16.8a4.2 4.2 0 0 1-3.64-2.1H4.9A7.8 7.8 0 0 0 12 19.8v-3.6Z" fill="#34A853" />
      </svg>
    );
  }

  if (key === 'Firefox') {
    return (
      <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="#FF7139" />
        <path
          d="M12 5.5c3.2 0 5.9 2.1 6.8 5-1.2-.8-2.7-1.2-4.2-1-2.4.3-4.4 2.1-5 4.5-.4 1.6 0 3.2 1 4.4-2.5-1.2-4.1-3.8-3.7-6.7.5-3.1 3.1-5.2 6.1-5.2Z"
          fill="#FFBD4F"
        />
      </svg>
    );
  }

  if (key === 'Safari') {
    return (
      <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="#0A84FF" />
        <polygon points="12,6 15.5,15.5 12,12.5 8.5,15.5" fill="#fff" />
        <polygon points="12,6 15.5,15.5 12,12.5" fill="#FF3B30" />
      </svg>
    );
  }

  if (key === 'Edge') {
    return (
      <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="#0078D7" />
        <path d="M16.5 8.5c-1.8-1.2-4-1.1-5.7.2-2 1.6-2.3 4.5-.7 6.5 1.2 1.5 3.2 2 4.9 1.4 1.2-.4 2.2-1.3 2.8-2.5-1.9.3-3.7-.4-4.8-1.8-.9-1.2-.8-2.9.2-4 1-1.1 2.6-1.4 3.8-.6.5.3.9.7 1.2 1.2-.3-1.4.2-2.8 1.3-3.7Z" fill="#50E6FF" />
      </svg>
    );
  }

  if (key === 'Opera') {
    return (
      <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="#FF1B2D" />
        <ellipse cx="12" cy="12" rx="3.2" ry="7.2" fill="#fff" />
      </svg>
    );
  }

  return <Globe className="w-4 h-4 shrink-0 text-admin-muted" aria-hidden="true" />;
}

export default function LogDeviceCell({ dispositivo }: { dispositivo: string | null }) {
  const parsed = parseLogDispositivo(dispositivo);
  if (!parsed) {
    return <span className="text-gray-500">—</span>;
  }

  const DeviceIcon = getDeviceLucideIcon(parsed.device);

  return (
    <div className="flex flex-col gap-1.5 min-w-[120px]">
      <div className="flex items-center gap-2 text-gray-300" title={`Navegador: ${parsed.browser}`}>
        <BrowserBrandIcon browser={parsed.browser} />
        <span className="text-xs font-medium">{parsed.browser}</span>
      </div>
      <div className="flex items-center gap-2 text-gray-400" title={`Dispositivo: ${parsed.device}`}>
        <DeviceIcon className="w-4 h-4 shrink-0 text-admin-muted" aria-hidden="true" />
        <span className="text-xs">{parsed.device}</span>
      </div>
    </div>
  );
}
