import type { LucideIcon } from 'lucide-react';
import type { InputHTMLAttributes, ReactNode } from 'react';

interface FormFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  hint?: string;
  icon?: LucideIcon;
  required?: boolean;
  error?: string;
  onChange?: (value: string) => void;
  children?: ReactNode;
}

export default function FormField({
  label,
  hint,
  icon: Icon,
  required,
  error,
  onChange,
  children,
  className = '',
  ...inputProps
}: FormFieldProps) {
  return (
    <div>
      <label className="flex items-center gap-2 text-admin-foreground-soft text-sm font-medium mb-1.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-admin-foreground" />}
        {label}
        {required && <span className="text-admin-danger">*</span>}
      </label>
      {hint && <p className="text-admin-muted text-xs mb-2">{hint}</p>}
      {children ?? (
        <input
          {...inputProps}
          onChange={(e) => onChange?.(e.target.value)}
          className={`w-full px-4 py-2.5 text-admin-foreground text-sm rounded-lg bg-admin-panel border border-admin-border focus:outline-none focus:ring-2 focus:ring-admin-accent/30 transition-colors ${className}`}
        />
      )}
      {error && <p className="text-admin-danger text-xs mt-1">{error}</p>}
    </div>
  );
}
