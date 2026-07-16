import { X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClass = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export default function Modal({
  open,
  onClose,
  title,
  description,
  icon: Icon,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className={`w-full ${sizeClass[size]} rounded-xl bg-admin-panel border border-admin-border shadow-admin flex flex-col max-h-[85vh] animate-scale-in`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-admin-border shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {Icon && (
              <div className="w-9 h-9 rounded-lg bg-admin-accent/12 border border-admin-accent/20 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-admin-foreground" />
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-admin-foreground font-semibold truncate">{title}</h3>
              {description && <p className="text-admin-muted text-xs mt-0.5">{description}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-admin-muted hover:text-admin-foreground hover:bg-admin-panel-3 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5 flex-1">{children}</div>

        {footer && (
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-admin-border shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
