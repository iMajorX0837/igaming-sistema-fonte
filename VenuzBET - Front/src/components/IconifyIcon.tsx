import { useEffect, useRef } from 'react';

interface IconifyIconProps {
  icon: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function IconifyIcon({ icon, className = '', style }: IconifyIconProps) {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let mounted = true;

    const host = document.createElement('span');
    host.className = 'iconify';
    host.setAttribute('data-icon', icon);
    host.setAttribute('aria-hidden', 'true');
    container.appendChild(host);

    const timer = window.setTimeout(() => {
      if (!mounted) return;
      (window as Window & { Iconify?: { scan: (node?: ParentNode) => void } }).Iconify?.scan(host);
    }, 0);

    return () => {
      mounted = false;
      window.clearTimeout(timer);
      if (host.parentNode === container) {
        container.removeChild(host);
      }
    };
  }, [icon]);

  return (
    <span
      ref={containerRef}
      className={className}
      aria-hidden="true"
      style={style}
    />
  );
}
