import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-admin-panel-3 border border-admin-border flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-admin-foreground opacity-70" />
      </div>
      <p className="text-admin-foreground-soft font-medium text-sm mb-1">{title}</p>
      {description && <p className="text-admin-muted text-sm max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
