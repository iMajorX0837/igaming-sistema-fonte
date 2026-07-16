import { Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  icon?: LucideIcon;
  children: ReactNode;
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-admin-accent hover:bg-admin-accent-hover text-[#0d0e10] font-semibold',
  secondary: 'bg-admin-panel-2 hover:bg-admin-panel-3 text-admin-foreground-soft hover:text-admin-foreground border border-admin-border',
  danger: 'bg-admin-danger/15 hover:bg-admin-danger/25 text-admin-danger border border-admin-danger/30',
  ghost: 'bg-admin-panel hover:bg-admin-panel-2 text-admin-foreground-soft hover:text-admin-foreground border border-admin-border',
};

const iconVariants: Record<ButtonVariant, string> = {
  primary: 'text-[#0d0e10]',
  secondary: 'text-admin-foreground',
  danger: 'text-admin-foreground',
  ghost: 'text-admin-foreground',
};

export default function Button({
  variant = 'primary',
  loading = false,
  icon: Icon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className={`w-4 h-4 animate-spin ${iconVariants[variant]}`} />
      ) : Icon ? (
        <Icon className={`w-4 h-4 ${iconVariants[variant]}`} />
      ) : null}
      {children}
    </button>
  );
}
