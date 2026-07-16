import type { CSSProperties } from 'react';
import SiteLogo from './SiteLogo';

type LoadingScreenVariant = 'fullscreen' | 'page' | 'inline' | 'compact';

interface LoadingScreenProps {
  title?: string;
  subtitle?: string;
  showText?: boolean;
  variant?: LoadingScreenVariant;
  className?: string;
  style?: CSSProperties;
}

const variantStyles: Record<
  LoadingScreenVariant,
  { wrapper: string; logo: string; title: string; subtitle: string }
> = {
  fullscreen: {
    wrapper: 'min-h-full flex flex-col items-center justify-center gap-4 md:gap-8 px-4',
    logo: 'h-12 md:h-16 w-auto max-w-[min(100%,220px)]',
    title: 'text-white text-lg md:text-2xl font-bold',
    subtitle: 'text-slate-300 text-xs md:text-sm',
  },
  page: {
    wrapper: 'py-20 flex flex-col items-center justify-center gap-4 px-4',
    logo: 'h-10 md:h-12 w-auto max-w-[min(100%,200px)]',
    title: 'text-slate-400 text-lg font-semibold',
    subtitle: 'text-slate-500 text-sm',
  },
  inline: {
    wrapper: 'py-12 flex flex-col items-center gap-3',
    logo: 'h-8 w-auto max-w-[min(100%,160px)]',
    title: 'text-slate-400 text-sm font-medium',
    subtitle: 'text-slate-500 text-xs',
  },
  compact: {
    wrapper: 'py-6 sm:py-8 flex flex-col items-center gap-2',
    logo: 'h-7 w-auto max-w-[min(100%,140px)]',
    title: 'text-sm text-slate-400 font-medium',
    subtitle: 'text-xs text-slate-500',
  },
};

export default function LoadingScreen({
  title = 'Carregando...',
  subtitle,
  showText = true,
  variant = 'page',
  className = '',
  style,
}: LoadingScreenProps) {
  const styles = variantStyles[variant];

  return (
    <div className={`${styles.wrapper} ${className}`.trim()} style={style}>
      <SiteLogo className={`object-contain ${styles.logo}`} />
      {showText ? (
        <div className="text-center space-y-1 md:space-y-2">
          <p className={styles.title}>{title}</p>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
