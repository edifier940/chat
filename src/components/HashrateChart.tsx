import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { HashPoint } from '../api';
import { formatClock, formatHashrate } from '../format';

interface HashrateChartProps {
  data: HashPoint[];
  height?: number;
  color?: string;
  gradientId?: string;
}

interface TipPayload {
  payload: HashPoint;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: TipPayload[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__value">{formatHashrate(point.hs)}</div>
      <div className="chart-tooltip__time">{new Date(point.ts).toLocaleString('ru-RU')}</div>
    </div>
  );
}

export function HashrateChart({
  data,
  height = 260,
  color = '#ff7a45',
  gradientId = 'hashGradient',
}: HashrateChartProps) {
  if (data.length === 0) {
    return <div className="chart-empty">Нет данных для графика</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.45} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis
          dataKey="ts"
          tickFormatter={(ts) => formatClock(ts)}
          stroke="rgba(255,255,255,0.35)"
          fontSize={11}
          minTickGap={48}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={(hs) => formatHashrate(hs)}
          stroke="rgba(255,255,255,0.35)"
          fontSize={11}
          width={64}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<ChartTooltip />} />
        <Area
          type="monotone"
          dataKey="hs"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
