import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface NotificationProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  icon?: React.ReactNode;
  duration?: number;
}

export default function Notification({
  isOpen,
  onClose,
  message,
  icon,
  duration = 5000,
}: NotificationProps) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen || duration <= 0) return;
    const timer = window.setTimeout(() => {
      onCloseRef.current();
    }, duration);
    return () => clearTimeout(timer);
  }, [isOpen, duration]);

  if (!isOpen) return null;

  const defaultIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" aria-hidden="true" fill="currentColor" className="w-4 h-4 text-[#DFDFDF] flex-shrink-0">
      <path d="M6,-0c-3.308,-0 -6,2.692 -6,6c-0,3.308 2.692,6 6,6c3.308,-0 6,-2.692 6,-6c-0,-3.308 -2.692,-6 -6,-6Zm-0,9.228c-0.316,0 -0.577,-0.26 -0.577,-0.577c0,-0.316 0.261,-0.577 0.577,-0.577c0.316,0 0.577,0.261 0.577,0.577c-0,0.317 -0.261,0.577 -0.577,0.577Zm0.627,-5.802l-0.166,3.519c-0,0.253 -0.208,0.462 -0.462,0.462c-0.253,-0 -0.461,-0.209 -0.461,-0.462l-0.166,-3.518l0,-0.001c-0,-0.009 -0,-0.018 -0,-0.027c-0,-0.344 0.283,-0.627 0.627,-0.627c0.344,0 0.627,0.283 0.627,0.627c-0,0.009 -0,0.018 -0.001,0.027l0.002,-0Z"></path>
    </svg>
  );

  return (
    <div className="fixed top-4 right-4 z-[110] transition-all duration-300 ease-out">
      <div className="relative bg-[#1C1D20] rounded-lg shadow-2xl p-4 min-w-[300px] max-w-md backdrop-blur-sm">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center transition-all duration-200"
        >
          <X className="w-3 h-3 text-slate-300 hover:text-white transition-colors" />
        </button>
        <div className="pr-6 flex items-center gap-2">
          {icon || defaultIcon}
          <h3 className="text-[#DFDFDF] font-bold text-sm">{message}</h3>
        </div>
      </div>
    </div>
  );
}

