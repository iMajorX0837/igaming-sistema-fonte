import { Ruler } from 'lucide-react';
import type { AdminImageSizeSpec } from '../../lib/adminImageSizes';

interface ImageSizeHintProps {
  spec: AdminImageSizeSpec;
  className?: string;
}

export default function ImageSizeHint({ spec, className = '' }: ImageSizeHintProps) {
  return (
    <div
      className={`mb-2 flex gap-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 ${className}`}
    >
      <Ruler className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" aria-hidden />
      <div className="min-w-0">
        <p className="text-xs text-amber-100">
          Tamanho recomendado:{' '}
          <span className="text-sm font-bold tracking-wide text-white">{spec.size}</span>
        </p>
        {spec.detail ? (
          <p className="mt-1 text-xs leading-relaxed text-amber-100/80">{spec.detail}</p>
        ) : null}
      </div>
    </div>
  );
}
