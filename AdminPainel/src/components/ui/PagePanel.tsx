import type { ReactNode } from 'react';

interface PagePanelProps {
  children: ReactNode;
  className?: string;
  padding?: boolean;
  variant?: 'default' | 'accent';
}

export default function PagePanel({
  children,
  className = '',
  padding = true,
  variant = 'default',
}: PagePanelProps) {
  const variantClass =
    variant === 'accent'
      ? 'border-admin-accent/24 ring-1 ring-admin-accent/10'
      : 'border-admin-border';

  return (
    <div
      className={`rounded-xl bg-admin-panel border shadow-admin transition-shadow hover:shadow-admin ${variantClass} ${
        padding ? 'p-5 md:p-6' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
