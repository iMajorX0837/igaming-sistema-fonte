import type { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actions?: React.ReactNode;
}

export default function PageHeader({ icon: Icon, title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 animate-slide-up">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-admin-panel-3 border border-admin-border-strong flex items-center justify-center">
              <Icon className="w-5 h-5 text-admin-foreground" />
            </div>
            <h2 className="text-xl font-semibold text-admin-foreground">{title}</h2>
          </div>
          <p className="text-admin-muted text-sm pl-[52px]">{description}</p>
        </div>
        {actions ? <div className="shrink-0 self-start">{actions}</div> : null}
      </div>
    </div>
  );
}
