const SP_OFFSET = '-03:00';

export interface CustomDateRange {
  start: string;
  end: string;
}

export function todayYmdSP(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

export function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(y, m - 1, d + days);
  return toYmd(date);
}

export function toYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function spDayStart(ymd: string): Date {
  return new Date(`${ymd}T00:00:00${SP_OFFSET}`);
}

export function spDayEndExclusive(ymd: string): Date {
  return spDayStart(addDaysYmd(ymd, 1));
}

export function buildFilterKey(customRange: CustomDateRange): string {
  return `custom:${customRange.start}:${customRange.end}`;
}

export function getDashboardDateRange(customRange: CustomDateRange): { start: Date; end: Date } {
  return {
    start: spDayStart(customRange.start),
    end: spDayEndExclusive(customRange.end),
  };
}

export function isSingleDayRange(customRange: CustomDateRange): boolean {
  return customRange.start === customRange.end;
}

export function formatRangeLabel(customRange: CustomDateRange): string {
  const fmt = (ymd: string) =>
    new Date(`${ymd}T12:00:00`).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

  if (customRange.start === customRange.end) {
    return fmt(customRange.start);
  }
  return `${fmt(customRange.start)} – ${fmt(customRange.end)}`;
}

export function compareYmd(a: string, b: string): number {
  return a.localeCompare(b);
}

export function parseYmd(ymd: string): { year: number; month: number; day: number } {
  const [year, month, day] = ymd.split('-').map(Number);
  return { year, month, day };
}

export function ymdFromParts(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function getCalendarWeeks(year: number, month: number): (string | null)[][] {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const totalDays = daysInMonth(year, month);
  const weeks: (string | null)[][] = [];
  let week: (string | null)[] = Array(firstDay).fill(null);

  for (let day = 1; day <= totalDays; day += 1) {
    week.push(ymdFromParts(year, month, day));
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }

  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  return weeks;
}

export function defaultCustomRange(): CustomDateRange {
  const today = todayYmdSP();
  return { start: today, end: today };
}

export function formatYmdDisplay(ymd: string): string {
  const { day, month } = parseYmd(ymd);
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`;
}

export function formatYmdFullDisplay(ymd: string): string {
  const { day, month, year } = parseYmd(ymd);
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

export function daysBetweenYmd(start: string, end: string): number {
  const startMs = spDayStart(start).getTime();
  const endMs = spDayStart(end).getTime();
  return Math.max(0, Math.round((endMs - startMs) / 86_400_000));
}

export interface EvolutionChartPoint {
  label: string;
  ymd: string;
}

const EVOLUTION_LOOKBACK_DAYS = 90;
const EVOLUTION_MAX_LABELS = 10;

export function getEvolutionChartPoints(customRange: CustomDateRange): EvolutionChartPoint[] {
  const endYmd = customRange.end;
  const startYmd = isSingleDayRange(customRange)
    ? addDaysYmd(endYmd, -(EVOLUTION_LOOKBACK_DAYS - 1))
    : customRange.start;

  const totalDays = daysBetweenYmd(startYmd, endYmd) + 1;
  const labelCount = Math.min(EVOLUTION_MAX_LABELS, totalDays);

  if (labelCount <= 1) {
    return [{ label: formatYmdDisplay(endYmd), ymd: endYmd }];
  }

  const points: EvolutionChartPoint[] = [];
  for (let i = 0; i < labelCount; i += 1) {
    const offset = Math.round((i * (totalDays - 1)) / (labelCount - 1));
    const ymd = addDaysYmd(startYmd, offset);
    points.push({ label: formatYmdDisplay(ymd), ymd });
  }

  return points;
}

export function getEvolutionQueryRange(customRange: CustomDateRange): { start: Date; end: Date } {
  const points = getEvolutionChartPoints(customRange);
  return {
    start: spDayStart(points[0].ymd),
    end: spDayEndExclusive(points[points.length - 1].ymd),
  };
}

export function ymdFromDateSP(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(date);
}
