import { useMemo } from 'react';
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatYmdFullDisplay } from '../lib/dashboardDateRange';

export interface CadastrosChartPoint {
  label: string;
  ymd: string;
  cadastros: number;
  depositos: number;
  totalCadastros: number;
  totalDepositos: number;
}

interface CadastrosEvolutionChartProps {
  points: CadastrosChartPoint[];
  loading?: boolean;
  formatNumber: (value: number) => string;
  formatCurrency: (value: number) => string;
}

interface TooltipPayloadItem {
  dataKey?: string;
  value?: number;
  color?: string;
  name?: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
  points: CadastrosChartPoint[];
  formatNumber: (value: number) => string;
  formatCurrency: (value: number) => string;
}

function formatCompactCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}M`;
  }
  if (value >= 1_000) {
    return `R$ ${(value / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`;
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);
}

function ChartTooltip({
  active,
  payload,
  label,
  points,
  formatNumber,
  formatCurrency,
}: ChartTooltipProps) {
  if (!active || !payload?.length || !label) return null;

  const point = points.find((item) => item.label === label);
  if (!point) return null;

  return (
    <div className="rounded-lg border border-admin-border bg-admin-panel px-4 py-3 shadow-admin">
      <p className="text-admin-foreground font-semibold text-sm mb-2">
        {formatYmdFullDisplay(point.ymd)}
      </p>
      <div className="space-y-1.5 text-xs">
        <p className="flex items-center justify-between gap-6">
          <span className="text-admin-muted">Cadastros do dia</span>
          <span className="text-admin-accent font-medium">{formatNumber(point.cadastros)}</span>
        </p>
        <p className="flex items-center justify-between gap-6">
          <span className="text-admin-muted">Depósitos do dia</span>
          <span className="text-admin-info font-medium">{formatCurrency(point.depositos)}</span>
        </p>
        <div className="border-t border-admin-border/60 pt-1.5 mt-1.5 space-y-1.5">
          <p className="flex items-center justify-between gap-6">
            <span className="text-admin-muted">Total no mês</span>
            <span className="text-admin-foreground font-medium">
              {formatNumber(point.totalCadastros)}
            </span>
          </p>
          <p className="flex items-center justify-between gap-6">
            <span className="text-admin-muted">Depósitos no mês</span>
            <span className="text-admin-foreground font-medium">
              {formatCurrency(point.totalDepositos)}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CadastrosEvolutionChart({
  points,
  loading = false,
  formatNumber,
  formatCurrency,
}: CadastrosEvolutionChartProps) {
  const summary = useMemo(() => {
    if (points.length === 0) {
      return { cadastros: 0, depositos: 0 };
    }

    return points.reduce(
      (acc, point) => ({
        cadastros: acc.cadastros + point.cadastros,
        depositos: acc.depositos + point.depositos,
      }),
      { cadastros: 0, depositos: 0 }
    );
  }, [points]);

  if (loading) {
    return (
      <div className="financial-chart-body">
        <div className="flex items-center justify-center h-[320px]">
          <p className="text-admin-muted text-sm">Carregando gráfico...</p>
        </div>
      </div>
    );
  }

  if (points.length === 0) {
    return (
      <div className="financial-chart-body">
        <div className="flex items-center justify-center h-[320px]">
          <p className="text-admin-muted text-sm">Nenhum dado disponível para o mês atual</p>
        </div>
      </div>
    );
  }

  return (
    <div className="financial-chart-body">
      <div className="financial-chart-summary">
        <div className="flex flex-wrap items-end gap-6">
          <div>
            <strong className="block text-[21px] font-semibold tracking-tight text-admin-accent">
              {formatNumber(summary.cadastros)}
            </strong>
            <span className="block mt-1 text-[11px] text-admin-muted">Cadastros no mês</span>
          </div>
          <div>
            <strong className="block text-[21px] font-semibold tracking-tight text-admin-info">
              {formatCurrency(summary.depositos)}
            </strong>
            <span className="block mt-1 text-[11px] text-admin-muted">Depósitos no mês</span>
          </div>
        </div>
      </div>

      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} margin={{ top: 8, right: 4, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="cadastrosBarGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e7e9ee" stopOpacity={1} />
                <stop offset="100%" stopColor="#8f949d" stopOpacity={0.85} />
              </linearGradient>
              <linearGradient id="depositosAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6d8fd4" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#6d8fd4" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="4 4" stroke="#22262c" vertical={false} />

            <XAxis
              dataKey="label"
              tick={{ fill: '#8b919a', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              dy={8}
              interval={points.length > 15 ? Math.ceil(points.length / 10) - 1 : 0}
            />

            <YAxis
              yAxisId="cadastros"
              tick={{ fill: '#8b919a', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              width={36}
            />

            <YAxis
              yAxisId="depositos"
              orientation="right"
              tick={{ fill: '#8b919a', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatCompactCurrency}
              width={56}
            />

            <Tooltip
              cursor={{ fill: 'rgba(231, 233, 238, 0.04)' }}
              content={
                <ChartTooltip
                  points={points}
                  formatNumber={formatNumber}
                  formatCurrency={formatCurrency}
                />
              }
            />

            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              iconSize={7}
              wrapperStyle={{ fontSize: 11, color: '#8b919a', paddingBottom: 12 }}
              formatter={(value) => (
                <span className="text-admin-muted text-[11px] ml-1">{value}</span>
              )}
            />

            <Bar
              yAxisId="cadastros"
              dataKey="cadastros"
              name="Cadastros"
              fill="url(#cadastrosBarGradient)"
              radius={[4, 4, 1, 1]}
              maxBarSize={28}
            />

            <Area
              yAxisId="depositos"
              type="monotone"
              dataKey="depositos"
              name="Depósitos"
              stroke="#6d8fd4"
              strokeWidth={2}
              fill="url(#depositosAreaGradient)"
              dot={{ r: 3, fill: '#6d8fd4', stroke: '#14161a', strokeWidth: 2 }}
              activeDot={{ r: 5, fill: '#6d8fd4', stroke: '#14161a', strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
