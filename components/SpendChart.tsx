'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface WeeklySpend {
  week_start: string;
  total: number;
}

interface Props {
  data: WeeklySpend[];
}

function formatWeek(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatDollar(value: number) {
  return `$${Number(value).toFixed(2)}`;
}

export default function SpendChart({ data }: Props) {
  const chartData = data.map((w) => ({
    week: formatWeek(w.week_start),
    total: Number(w.total),
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="week" tick={{ fontSize: 12, fill: '#6b7280' }} />
        <YAxis
          tickFormatter={(v) => `$${v}`}
          tick={{ fontSize: 12, fill: '#6b7280' }}
          width={50}
        />
        <Tooltip formatter={(value) => [formatDollar(Number(value ?? 0)), 'Total']} />
        <Bar dataKey="total" fill="#16a34a" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
