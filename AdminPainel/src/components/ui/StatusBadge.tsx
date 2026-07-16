type StatusVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface StatusBadgeProps {
  children: React.ReactNode;
  variant?: StatusVariant;
  className?: string;
}

const variantClasses: Record<StatusVariant, string> = {
  success: 'bg-admin-success/12 text-admin-success border-admin-success/20',
  warning: 'bg-admin-warning/12 text-admin-warning border-admin-warning/20',
  error: 'bg-admin-danger/12 text-admin-danger border-admin-danger/20',
  info: 'bg-admin-info/12 text-admin-info border-admin-info/20',
  neutral: 'bg-admin-panel-3 text-admin-foreground-soft border-admin-border',
};

export default function StatusBadge({
  children,
  variant = 'neutral',
  className = '',
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border capitalize ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
