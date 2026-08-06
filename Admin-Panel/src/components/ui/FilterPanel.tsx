import type { ReactNode } from 'react';

interface FilterPanelProps {
  children: ReactNode;
  className?: string;
}

export default function FilterPanel({ children, className = '' }: FilterPanelProps) {
  return (
    <div
      className={`rounded-xl bg-admin-panel border border-admin-border shadow-md p-4 mb-4 space-y-4 ${className}`}
    >
      {children}
    </div>
  );
}
