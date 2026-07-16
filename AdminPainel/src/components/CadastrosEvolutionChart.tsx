import { useMemo, useState } from 'react';
import { formatYmdFullDisplay } from '../lib/dashboardDateRange';

export interface CadastrosChartPoint {
  label: string;
  ymd: string;
  cadastros: number;
  totalAcumulado: number;
  barHeight: number;
  lineY: number;
}

interface CadastrosEvolutionChartProps {
  points: CadastrosChartPoint[];
  loading?: boolean;
  formatNumber: (value: number) => string;
}

interface ChartCoord {
  x: number;
  y: number;
}

function getChartCoords(points: CadastrosChartPoint[]): ChartCoord[] {
  return points.map((point, index) => ({
    x: ((index + 0.5) / points.length) * 100,
    y: 100 - point.lineY,
  }));
}

function buildSmoothWavePath(coords: ChartCoord[]): string {
  if (coords.length === 0) return '';
  if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`;

  const slopes: number[] = [];
  for (let i = 0; i < coords.length - 1; i += 1) {
    const dx = coords[i + 1].x - coords[i].x;
    const dy = coords[i + 1].y - coords[i].y;
    slopes.push(dx === 0 ? 0 : dy / dx);
  }

  const tangents = [slopes[0]];
  for (let i = 1; i < coords.length - 1; i += 1) {
    const s0 = slopes[i - 1];
    const s1 = slopes[i];
    if (s0 * s1 <= 0) {
      tangents.push(0);
    } else {
      tangents.push((s0 + s1) / 2);
    }
  }
  tangents.push(slopes[slopes.length - 1]);

  let path = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i += 1) {
    const p0 = coords[i];
    const p1 = coords[i + 1];
    const dx = (p1.x - p0.x) / 3;
    const cp1x = p0.x + dx;
    const cp1y = p0.y + dx * tangents[i];
    const cp2x = p1.x - dx;
    const cp2y = p1.y - dx * tangents[i + 1];
    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
  }

  return path;
}

export default function CadastrosEvolutionChart({  points,
  loading = false,
  formatNumber,
}: CadastrosEvolutionChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const summaryTotal = points.length > 0 ? points[points.length - 1].totalAcumulado : 0;

  const coords = useMemo(() => getChartCoords(points), [points]);
  const smoothPath = useMemo(() => buildSmoothWavePath(coords), [coords]);
  const areaPath = useMemo(() => {
    if (!smoothPath || coords.length === 0) return '';
    const last = coords[coords.length - 1];
    const first = coords[0];
    return `${smoothPath} L ${last.x} 100 L ${first.x} 100 Z`;
  }, [smoothPath, coords]);
  if (loading) {
    return (
      <div className="financial-chart-body">
        <div className="flex items-center justify-center h-[280px]">
          <p className="text-admin-muted text-sm">Carregando gráfico...</p>
        </div>
      </div>
    );
  }

  if (points.length === 0) {
    return (
      <div className="financial-chart-body">
        <div className="flex items-center justify-center h-[280px]">
          <p className="text-admin-muted text-sm">Nenhum dado disponível para o período selecionado</p>
        </div>
      </div>
    );
  }

  const hovered = hoveredIndex !== null ? points[hoveredIndex] : null;

  return (
    <div className="financial-chart-body">
      <div className="financial-chart-summary">
        <div>
          <strong className="block text-[21px] font-semibold tracking-tight text-admin-foreground">
            {formatNumber(summaryTotal)}
          </strong>
          <span className="block mt-1 text-[11px] text-admin-muted">Total acumulado de usuários</span>
        </div>

        <div className="flex gap-3 text-[11px] text-admin-muted">
          <span className="inline-flex items-center gap-1.5">
            <i className="financial-legend-dot financial-legend-dot-deposit" />
            Cadastros diários
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="financial-legend-dot financial-legend-dot-withdraw" />
            Total acumulado
          </span>
        </div>
      </div>

      <div className="relative">
        {hovered && (
          <div className="absolute left-1/2 top-2 z-20 -translate-x-1/2 rounded-lg border border-admin-border bg-admin-panel px-4 py-3 shadow-admin pointer-events-none">
            <p className="text-admin-foreground font-semibold text-sm mb-1">
              {formatYmdFullDisplay(hovered.ymd)}
            </p>
            <p className="text-admin-muted text-xs">
              Cadastros do dia:{' '}
              <span className="text-admin-foreground font-medium">{formatNumber(hovered.cadastros)}</span>
            </p>
            <p className="text-admin-muted text-xs">
              Total acumulado:{' '}
              <span className="text-admin-foreground font-medium">
                {formatNumber(hovered.totalAcumulado)}
              </span>
            </p>
          </div>
        )}

        <div
          className="financial-chart-area"
          style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}
        >
          <div className="financial-chart-gridline" style={{ top: '20%' }} />
          <div className="financial-chart-gridline" style={{ top: '44%' }} />
          <div className="financial-chart-gridline" style={{ top: '68%' }} />

          <svg
            className="absolute inset-0 z-[3] h-full w-full pointer-events-none overflow-visible"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <path
              d={areaPath}
              fill="var(--admin-success)"
              fillOpacity="0.08"
              stroke="none"
            />
            <path
              d={smoothPath}
              fill="none"
              stroke="var(--admin-success)"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          {points.map((point, index) => (
            <div
              key={`dot-${point.ymd}`}
              className="absolute z-[4] h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-admin-panel bg-admin-success pointer-events-none"
              style={{
                left: `${((index + 0.5) / points.length) * 100}%`,
                bottom: `${point.lineY}%`,
              }}
            />
          ))}

          {points.map((point, index) => (            <div
              key={point.ymd}
              className="financial-bars"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div
                className="financial-bar financial-bar-deposit w-[14px]"
                style={{ height: `${point.barHeight}%` }}
              />
            </div>
          ))}
        </div>
      </div>

      <div
        className="financial-chart-labels"
        style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}
      >
        {points.map((point) => (
          <span key={point.ymd}>{point.label}</span>
        ))}
      </div>
    </div>
  );
}
