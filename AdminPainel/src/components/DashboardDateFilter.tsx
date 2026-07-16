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

  useEffect(() => {
    if (!calendarOpen) return;
    setDraftStart(customRange.start);
    setDraftEnd(customRange.end);
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

  const handleDayClick = (ymd: string) => {
    if (!draftStart || (draftStart && draftEnd)) {
      setDraftStart(ymd);
      setDraftEnd(null);
      return;
    }

    if (compareYmd(ymd, draftStart) < 0) {
      setDraftEnd(draftStart);
      setDraftStart(ymd);
      return;
    }

    setDraftEnd(ymd);
  };

  const isInRange = (ymd: string) => {
    if (!draftStart) return false;
    const end = draftEnd ?? draftStart;
    const start = compareYmd(draftStart, end) <= 0 ? draftStart : end;
    const finish = compareYmd(draftStart, end) <= 0 ? end : draftStart;
    return compareYmd(ymd, start) >= 0 && compareYmd(ymd, finish) <= 0;
  };

  const isRangeStart = (ymd: string) => draftStart === ymd && (!draftEnd || draftEnd === draftStart);
  const isRangeEnd = (ymd: string) => draftEnd === ymd && draftStart !== draftEnd;

  const applyCustomRange = () => {
    if (!draftStart) return;
    const end = draftEnd ?? draftStart;
    onCustomRangeApply({ start: draftStart, end });
    setCalendarOpen(false);
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
          <div
            className="absolute left-0 top-full z-30 mt-2 w-[320px] rounded-xl border border-admin-border bg-admin-panel p-4 shadow-admin"
          >
            <div className="mb-4 flex items-center justify-between">
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

                    const inRange = isInRange(ymd);
                    const isToday = ymd === today;
                    const isFuture = compareYmd(ymd, today) > 0;
                    const isStart = isRangeStart(ymd) || (draftStart === ymd && !draftEnd);
                    const isEnd = isRangeEnd(ymd);

                    return (
                      <button
                        key={ymd}
                        type="button"
                        disabled={isFuture}
                        onClick={() => handleDayClick(ymd)}
                        className={`h-9 rounded-lg text-sm transition-colors ${
                          isFuture
                            ? 'cursor-not-allowed text-gray-600'
                            : inRange
                              ? 'bg-admin-accent/12 text-admin-foreground'
                              : 'text-gray-300 hover:bg-white/5 hover:text-white'
                        } ${isStart || isEnd ? 'bg-admin-accent text-[#0d0e10] font-semibold' : ''} ${
                          isToday && !inRange ? 'ring-1 ring-admin-accent/30' : ''
                        }`}
                      >
                        {parseYmd(ymd).day}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
              <p className="text-xs text-gray-400">
                {draftStart
                  ? formatRangeLabel({ start: draftStart, end: draftEnd ?? draftStart })
                  : 'Selecione a data inicial'}
              </p>
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
        ) : null}
      </div>
    </div>
  );
}
