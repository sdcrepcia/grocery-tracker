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
  price?: number;
  qty: string;
  totalPrice: number;
  trend?: number;
  isForecast?: boolean;
}

interface Props {
  data: ChartPoint[];
  avgPrice: number;
  isWeightItem: boolean;
}

function CustomDot(props: any) {
  const { cx, cy, payload } = props;
  if (!payload.isForecast) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      fill="white"
      stroke="#f59e0b"
      strokeWidth={2}
    />
  );
}

function CustomTooltip({ active, payload, label, isWeightItem }: any) {
  if (!active || !payload?.length) return null;

  const priceEntry = payload.find((p: any) => p.dataKey === 'price');
  const trendEntry = payload.find((p: any) => p.dataKey === 'trend');
  const point = payload[0]?.payload as ChartPoint;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2 text-xs">
      <p className="font-medium text-gray-700 mb-1">{label}</p>
      {priceEntry && priceEntry.value != null && (
        <p className="text-green-700">
          {`$${Number(priceEntry.value).toFixed(2)}${isWeightItem ? '/lb' : ''}`}
          {point.qty ? ` (${point.qty})` : ''}
        </p>
      )}
      {trendEntry && trendEntry.value != null && (
        <p className="text-amber-600">
          {point.isForecast ? 'Forecast' : 'Trend'}: ${Number(trendEntry.value).toFixed(2)}
          {isWeightItem ? '/lb' : ''}
        </p>
      )}
    </div>
  );
}

export default function ItemDetailChart({ data, avgPrice, isWeightItem }: Props) {
  const hasTrend = data.some((d) => d.trend != null);

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
        <Tooltip content={<CustomTooltip isWeightItem={isWeightItem} />} />
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
          connectNulls={false}
        />
        {hasTrend && (
          <Line
            type="monotone"
            dataKey="trend"
            stroke="#f59e0b"
            strokeWidth={1.5}
            strokeDasharray="5 5"
            dot={<CustomDot />}
            activeDot={false}
            connectNulls={true}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
