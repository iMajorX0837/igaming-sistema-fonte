import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

export default function ToastComponent({ toast, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, 4000);

    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-admin-foreground" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-admin-foreground" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-admin-foreground" />;
      case 'info':
        return <Info className="w-5 h-5 text-admin-foreground" />;
      default:
        return <Info className="w-5 h-5 text-admin-foreground" />;
    }
  };

  const getBgColor = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-admin-success/12 border-admin-success/30';
      case 'error':
        return 'bg-admin-danger/12 border-admin-danger/30';
      case 'warning':
        return 'bg-admin-warning/12 border-admin-warning/30';
      case 'info':
        return 'bg-admin-info/12 border-admin-info/30';
      default:
        return 'bg-admin-panel-3 border-admin-border';
    }
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg min-w-[300px] max-w-[500px] ${getBgColor()}`}
    >
      {getIcon()}
      <p className="flex-1 text-sm text-white">{toast.message}</p>
      <button
        onClick={() => onClose(toast.id)}
        className="text-admin-muted hover:text-admin-foreground transition-colors"
      >
        <X className="w-4 h-4 text-admin-foreground" />
      </button>
    </div>
  );
}

