import { ArrowLeft } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

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
    ? 'shrink-0 px-2.5 md:px-3 py-1.5 rounded-lg bg-brand hover:bg-brand-hover transition-colors duration-200 text-white font-medium flex items-center gap-1.5 text-sm'
    : 'px-4 py-2 rounded-lg bg-brand hover:bg-brand-hover transition-colors duration-200 text-white font-medium flex items-center gap-2 text-sm';

  return (
    <button
      type={type}
      className={`${baseClass} ${className}`.trim()}
      style={style}
      {...props}
    >
      <ArrowLeft className="w-4 h-4" />
      Voltar
    </button>
  );
}
