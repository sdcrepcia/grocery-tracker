'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';

interface ChartPoint {
  date: string;
  price: number;
  qty: string;
  totalPrice: number;
}

interface Props {
  data: ChartPoint[];
  avgPrice: number;
  isWeightItem: boolean;
}

export default function ItemDetailChart({ data, avgPrice, isWeightItem }: Props) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} />
        <YAxis
          tickFormatter={(v) => `$${v}`}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          width={46}
          domain={['auto', 'auto']}
        />
        <Tooltip
          formatter={(value: any, _: any, entry: any) => [
            `$${Number(value).toFixed(2)}${isWeightItem ? '/lb' : ''} (${entry.payload.qty})`,
            'Price',
          ]}
        />
        <ReferenceLine
          y={avgPrice}
          stroke="#d1d5db"
          strokeDasharray="4 4"
          label={{
            value: `avg $${avgPrice.toFixed(2)}`,
            position: 'insideTopRight',
            fontSize: 10,
            fill: '#9ca3af',
          }}
        />
        <Line
          type="monotone"
          dataKey="price"
          stroke="#16a34a"
          strokeWidth={2}
          dot={{ r: 4, fill: '#16a34a' }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
