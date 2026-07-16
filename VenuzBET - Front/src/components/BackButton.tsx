import { ArrowLeft } from 'lucide-react';
import type { ButtonHTMLAttributes, CSSProperties } from 'react';
import { VOLTAR_BUTTON_BG } from '../constants/uiColors';

interface BackButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  compact?: boolean;
}

export default function BackButton({
  compact = false,
  className = '',
  style,
  type = 'button',
  ...props
}: BackButtonProps) {
  const baseClass = compact
    ? 'shrink-0 px-2.5 md:px-3 py-1.5 rounded-lg transition-colors duration-200 text-slate-300 hover:text-white font-medium flex items-center gap-1.5 text-sm'
    : 'px-4 py-2 rounded-lg transition-colors duration-200 text-slate-300 hover:text-white font-medium flex items-center gap-2 text-sm';

  return (
    <button
      type={type}
      className={`${baseClass} ${className}`.trim()}
      style={{ backgroundColor: VOLTAR_BUTTON_BG, ...style } as CSSProperties}
      {...props}
    >
      <ArrowLeft className="w-4 h-4" />
      Voltar
    </button>
  );
}
