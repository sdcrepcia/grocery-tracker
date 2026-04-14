'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface PricePoint {
  order_date: string;
  total_price: number;
  unit_price: number;
  quantity: number;
  unit: string;
}

interface Props {
  itemNames: string[];
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`;
}

export default function ItemPriceChart({ itemNames }: Props) {
  const [selected, setSelected] = useState('');
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = query.length > 1
    ? itemNames.filter((n) => n.toLowerCase().includes(query.toLowerCase())).slice(0, 10)
    : [];

  async function loadItem(name: string) {
    setSelected(name);
    setQuery(name);
    setLoading(true);
    const res = await fetch(`/api/items?name=${encodeURIComponent(name)}`);
    const data = await res.json();
    setHistory(data.history ?? []);
    setLoading(false);
  }

  const chartData = history.map((h) => ({
    date: formatDate(h.order_date),
    price: Number(h.total_price),
    qty: `${h.quantity}${h.unit}`,
  }));

  const isWeightItem = history[0]?.unit === 'lb';

  return (
    <div className="space-y-3">
      <div className="relative">
        <input
          type="text"
          placeholder="Search item (e.g. Beef Strip Steak)"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelected(''); }}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        {filtered.length > 0 && (
          <ul className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg mt-1 shadow-lg max-h-48 overflow-auto">
            {filtered.map((name) => (
              <li
                key={name}
                className="px-3 py-2 text-sm cursor-pointer hover:bg-green-50"
                onClick={() => loadItem(name)}
              >
                {name}
              </li>
            ))}
          </ul>
        )}
      </div>

      {loading && <p className="text-sm text-gray-500">Loading...</p>}

      {!loading && selected && history.length === 0 && (
        <p className="text-sm text-gray-500">No history found for "{selected}".</p>
      )}

      {!loading && history.length > 0 && (
        <>
          <p className="text-xs text-gray-500">
            {selected} — {history.length} purchase{history.length !== 1 ? 's' : ''}
            {isWeightItem ? ' (price per purchase, weight varies)' : ''}
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis
                tickFormatter={(v) => `$${v}`}
                tick={{ fontSize: 11, fill: '#6b7280' }}
                width={46}
              />
              <Tooltip
                formatter={(value, _name, entry: any) => [
                  `$${Number(value ?? 0).toFixed(2)} (${entry?.payload?.qty ?? ''})`,
                  'Price',
                ]}
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
        </>
      )}
    </div>
  );
}
