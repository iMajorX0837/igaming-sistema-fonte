import { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  compareYmd,
  formatRangeLabel,
  getCalendarWeeks,
  parseYmd,
  todayYmdSP,
  type CustomDateRange,
} from '../lib/dashboardDateRange';

interface DashboardDateFilterProps {
  customRange: CustomDateRange;
  onCustomRangeApply: (range: CustomDateRange) => void;
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

function normalizeRange(start: string, end: string): CustomDateRange {
  if (compareYmd(start, end) <= 0) {
    return { start, end };
  }
  return { start: end, end: start };
}

type DayRole = 'none' | 'single' | 'start' | 'middle' | 'end';

export default function DashboardDateFilter({
  customRange,
  onCustomRangeApply,
}: DashboardDateFilterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const today = todayYmdSP();
  const initial = parseYmd(today);

  const [viewYear, setViewYear] = useState(initial.year);
  const [viewMonth, setViewMonth] = useState(initial.month);
  const [draftStart, setDraftStart] = useState<string | null>(customRange.start);
  const [draftEnd, setDraftEnd] = useState<string | null>(customRange.end);
  const [hoverYmd, setHoverYmd] = useState<string | null>(null);

  useEffect(() => {
    if (!calendarOpen) return;
    setDraftStart(customRange.start);
    setDraftEnd(customRange.end);
    setHoverYmd(null);
    const parsed = parseYmd(customRange.start);
    setViewYear(parsed.year);
    setViewMonth(parsed.month);
  }, [calendarOpen, customRange]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setCalendarOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const weeks = getCalendarWeeks(viewYear, viewMonth);

  const shiftMonth = (delta: number) => {
    let month = viewMonth + delta;
    let year = viewYear;

    if (month < 1) {
      month = 12;
      year -= 1;
    } else if (month > 12) {
      month = 1;
      year += 1;
    }

    setViewMonth(month);
    setViewYear(year);
  };

  const applyRange = (start: string, end: string) => {
    const range = normalizeRange(start, end);
    onCustomRangeApply(range);
    setDraftStart(range.start);
    setDraftEnd(range.end);
    setHoverYmd(null);
    setCalendarOpen(false);
  };

  const handleDayClick = (ymd: string) => {
    if (!draftStart || (draftStart && draftEnd)) {
      setDraftStart(ymd);
      setDraftEnd(null);
      setHoverYmd(null);
      return;
    }

    applyRange(draftStart, ymd);
  };

  const getSelectionBounds = (): { start: string; end: string } | null => {
    if (!draftStart) return null;

    if (draftEnd) {
      return normalizeRange(draftStart, draftEnd);
    }

    if (hoverYmd) {
      return normalizeRange(draftStart, hoverYmd);
    }

    return { start: draftStart, end: draftStart };
  };

  const isInRange = (ymd: string) => {
    const bounds = getSelectionBounds();
    if (!bounds) return false;
    return compareYmd(ymd, bounds.start) >= 0 && compareYmd(ymd, bounds.end) <= 0;
  };

  const getDayRole = (ymd: string): DayRole => {
    const bounds = getSelectionBounds();
    if (!bounds || !isInRange(ymd)) return 'none';
    if (bounds.start === bounds.end) return 'single';
    if (ymd === bounds.start) return 'start';
    if (ymd === bounds.end) return 'end';
    return 'middle';
  };

  const getDayClassName = (ymd: string, isFuture: boolean, isToday: boolean) => {
    if (isFuture) {
      return 'cursor-not-allowed text-gray-600';
    }

    const role = getDayRole(ymd);
    const base = 'h-9 w-full text-sm transition-colors';

    switch (role) {
      case 'single':
        return `${base} rounded-lg bg-admin-accent font-semibold text-[#0d0e10]`;
      case 'start':
        return `${base} rounded-l-lg bg-admin-accent font-semibold text-[#0d0e10]`;
      case 'end':
        return `${base} rounded-r-lg bg-admin-accent font-semibold text-[#0d0e10]`;
      case 'middle':
        return `${base} bg-admin-accent/14 text-admin-foreground`;
      default:
        return `${base} rounded-lg text-gray-300 hover:bg-white/5 hover:text-white ${
          isToday ? 'ring-1 ring-admin-accent/30' : ''
        }`;
    }
  };

  const selectionHint = () => {
    if (!draftStart) {
      return 'Clique no dia inicial';
    }
    if (!draftEnd) {
      return `Início: ${formatRangeLabel({ start: draftStart, end: draftStart })} — clique no dia final`;
    }
    return formatRangeLabel({ start: draftStart, end: draftEnd });
  };

  const applyCustomRange = () => {
    if (!draftStart) return;
    applyRange(draftStart, draftEnd ?? draftStart);
  };

  const resetToToday = () => {
    applyRange(today, today);
  };

  return (
    <div ref={containerRef} className="mb-6">
      <div className="relative inline-block">
        <button
          type="button"
          onClick={() => setCalendarOpen((open) => !open)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-admin-accent text-[#0d0e10] transition-colors hover:bg-admin-accent-hover"
        >
          <Calendar className="h-4 w-4" />
          {formatRangeLabel(customRange)}
        </button>

        {calendarOpen ? (
          <div className="absolute left-0 top-full z-30 mt-2 w-[320px] rounded-xl border border-admin-border bg-admin-panel p-4 shadow-admin">
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                className="rounded-lg p-2 text-gray-300 hover:bg-white/5 hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <p className="text-sm font-semibold text-white">
                {MONTHS[viewMonth - 1]} {viewYear}
              </p>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                className="rounded-lg p-2 text-gray-300 hover:bg-white/5 hover:text-white"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <p className="mb-3 text-[11px] text-admin-muted">
              Selecione um intervalo: 1º clique no dia inicial, 2º clique no dia final
            </p>

            <div className="mb-2 grid grid-cols-7 gap-1">
              {WEEKDAYS.map((day) => (
                <div key={day} className="py-1 text-center text-[11px] font-medium text-gray-500">
                  {day}
                </div>
              ))}
            </div>

            <div className="space-y-1">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="grid grid-cols-7 gap-1">
                  {week.map((ymd, dayIndex) => {
                    if (!ymd) {
                      return <div key={`empty-${weekIndex}-${dayIndex}`} className="h-9" />;
                    }

                    const isToday = ymd === today;
                    const isFuture = compareYmd(ymd, today) > 0;

                    return (
                      <button
                        key={ymd}
                        type="button"
                        disabled={isFuture}
                        onClick={() => handleDayClick(ymd)}
                        onMouseEnter={() => {
                          if (!isFuture && draftStart && !draftEnd) {
                            setHoverYmd(ymd);
                          }
                        }}
                        onMouseLeave={() => setHoverYmd(null)}
                        className={getDayClassName(ymd, isFuture, isToday)}
                      >
                        {parseYmd(ymd).day}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
              <p className="min-w-0 text-xs text-gray-400">{selectionHint()}</p>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={resetToToday}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-admin-muted transition-colors hover:bg-white/5 hover:text-white"
                >
                  Hoje
                </button>
                <button
                  type="button"
                  onClick={applyCustomRange}
                  disabled={!draftStart}
                  className="rounded-lg bg-admin-accent px-3 py-1.5 text-sm font-semibold text-[#0d0e10] transition-colors hover:bg-admin-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
