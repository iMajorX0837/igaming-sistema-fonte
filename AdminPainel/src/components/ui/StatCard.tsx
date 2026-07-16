import type { LucideIcon } from 'lucide-react';

type StatTone = 'neutral' | 'good' | 'warn' | 'accent' | 'danger';

interface StatCardProps {
  title?: string;
  label?: string;
  value: string;
  secondaryValue?: string;
  subtitle?: string;
  sub?: string;
  icon?: LucideIcon;
  color?: string;
  tone?: StatTone;
  loading?: boolean;
  small?: boolean;
  compact?: boolean;
  className?: string;
  onClick?: () => void;
}

const toneColors: Record<StatTone, string> = {
  neutral: 'text-admin-foreground',
  good: 'text-admin-success',
  warn: 'text-admin-warning',
  accent: 'text-admin-accent',
  danger: 'text-admin-danger',
};

export default function StatCard({
  title,
  label,
  value,
  secondaryValue,
  subtitle,
  sub,
  icon: Icon,
  color,
  tone = 'neutral',
  loading = false,
  small = false,
  compact = false,
  className,
  onClick,
}: StatCardProps) {
  const displayTitle = title ?? label ?? '';
  const displaySubtitle = subtitle ?? sub;
  const valueColor = color ? 'text-admin-foreground' : toneColors[tone];
  const iconColor = tone === 'danger' ? 'text-admin-danger' : 'text-admin-foreground';

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`group relative overflow-hidden rounded-xl border shadow-admin transition-all duration-200 hover:-translate-y-0.5 ${
        compact ? 'flex items-center px-4' : 'px-5 py-4'
      } ${onClick ? 'cursor-pointer' : ''} ${className ?? 'bg-admin-panel border-admin-border hover:border-admin-border-strong'}`}
    >
      {compact && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-red-500/3 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      )}
      {compact ? (
        loading ? (
          <div className="relative z-10 flex w-full items-center gap-3 animate-pulse">
            <div className="h-6 w-6 shrink-0 rounded bg-admin-panel-3" />
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
              <div className="flex items-center justify-between gap-4">
                <div className="h-7 w-8 rounded bg-admin-panel-3" />
                <div className="h-7 w-24 rounded bg-admin-panel-3" />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="h-3 w-28 rounded bg-admin-panel-2" />
                <div className="h-3 w-16 rounded bg-admin-panel-2" />
              </div>
            </div>
          </div>
        ) : (
          <div className="relative z-10 flex w-full items-center gap-3">
            {Icon && <Icon className={`h-6 w-6 shrink-0 ${iconColor}`} />}
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
              <div className="flex items-baseline justify-between gap-4">
                <p className={`font-bold leading-none ${valueColor} text-[18px]`}>{value}</p>
                {secondaryValue && (
                  <p className={`font-bold leading-none ${valueColor} text-[18px]`}>{secondaryValue}</p>
                )}
              </div>
              <div className="flex items-center justify-between gap-4">
                <h3 className="truncate text-xs font-medium text-admin-muted">{displayTitle}</h3>
                {displaySubtitle && (
                  <p className="shrink-0 text-xs text-admin-muted">{displaySubtitle}</p>
                )}
              </div>
            </div>
          </div>
        )
      ) : (
        <>
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-admin-muted text-sm font-medium">{displayTitle}</h3>
        {Icon && (
          <Icon
            className={`w-5 h-5 shrink-0 transition-transform duration-200 group-hover:scale-110 ${iconColor}`}
          />
        )}
      </div>
      {loading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-7 w-24 rounded bg-admin-panel-3" />
          {displaySubtitle && <div className="h-3 w-32 rounded bg-admin-panel-2" />}
        </div>
      ) : (
        <>
          <p className={`font-bold leading-tight ${valueColor} ${small ? 'text-lg' : 'text-xl'}`}>
            {value}
          </p>
          {displaySubtitle && <p className="text-admin-muted text-xs mt-1">{displaySubtitle}</p>}
        </>
      )}
        </>
      )}
    </div>
  );
}
