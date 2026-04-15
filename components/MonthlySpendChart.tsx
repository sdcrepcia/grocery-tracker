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

interface Props {
  receipts: { order_date: string; total: string | number }[];
}

export default function MonthlySpendChart({ receipts }: Props) {
  const map: Record<string, { label: string; total: number; orders: number }> = {};

  for (const r of receipts) {
    const d = new Date(r.order_date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    if (!map[key]) map[key] = { label, total: 0, orders: 0 };
    map[key].total += Number(r.total);
    map[key].orders++;
  }

  const data = Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => ({
      label: v.label,
      total: parseFloat(v.total.toFixed(2)),
      orders: v.orders,
    }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6b7280' }} />
        <YAxis
          tickFormatter={(v) => `$${v}`}
          tick={{ fontSize: 12, fill: '#6b7280' }}
          width={52}
        />
        <Tooltip
          formatter={(value: any, _: any, entry: any) => [
            `$${Number(value).toFixed(2)} · ${entry.payload.orders} order${entry.payload.orders !== 1 ? 's' : ''}`,
            'Total',
          ]}
        />
        <Bar dataKey="total" fill="#16a34a" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
