import Notification, { type NotificationType } from './Notification';

export type ToastType = NotificationType;

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
  return (
    <Notification
      isOpen
      message={toast.message}
      type={toast.type}
      duration={5000}
      onClose={() => onClose(toast.id)}
    />
  );
}
