import sql from '@/lib/db';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ItemDetailChart from '@/components/ItemDetailChart';

interface Purchase {
  name: string;
  quantity: string;
  unit: string;
  total_price: string;
  unit_price: string;
  order_date: string;
  order_id: string;
}

function formatDate(str: string) {
  return new Date(str).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function formatDollar(n: number) {
  return `$${n.toFixed(2)}`;
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default async function ItemPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const itemName = decodeURIComponent(name);

  const history: Purchase[] = await sql`
    SELECT
      li.name,
      li.quantity::text,
      li.unit,
      li.total_price::text,
      li.unit_price::text,
      r.order_date::text,
      r.order_id
    FROM line_items li
    JOIN receipts r ON r.id = li.receipt_id
    WHERE li.name ILIKE ${itemName}
    ORDER BY r.order_date ASC
  `;

  if (history.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 font-medium">No purchase history for &quot;{itemName}&quot;</p>
          <Link href="/" className="text-green-600 text-sm mt-2 inline-block hover:underline">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const isWeightItem = history[0].unit === 'lb';
  // Use unit_price for weight items ($/lb), total_price for count items
  const prices = history.map((h) =>
    Number(isWeightItem ? h.unit_price : h.total_price),
  );

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const totalSpent = history.reduce((s, h) => s + Number(h.total_price), 0);
  const firstPrice = prices[0];
  const latestPrice = prices[prices.length - 1];
  const priceTrend = firstPrice > 0
    ? ((latestPrice - firstPrice) / firstPrice) * 100
    : 0;

  const minIdx = prices.indexOf(minPrice);
  const maxIdx = prices.indexOf(maxPrice);

  const chartPoints = history.map((h) => ({
    date: formatDate(h.order_date),
    price: Number(isWeightItem ? h.unit_price : h.total_price),
    qty: `${Number(h.quantity)}${h.unit}`,
    totalPrice: Number(h.total_price),
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="font-semibold text-gray-900">{itemName}</h1>
            <p className="text-xs text-gray-400">
              {history.length} purchase{history.length !== 1 ? 's' : ''}
              {isWeightItem ? ' · prices shown per lb' : ''}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard label="Times Bought" value={String(history.length)} />
          <StatCard label="Total Spent" value={formatDollar(totalSpent)} />
          <StatCard
            label={isWeightItem ? 'Avg Price/lb' : 'Avg Price'}
            value={formatDollar(avgPrice)}
          />
          <StatCard
            label="Lowest"
            value={formatDollar(minPrice)}
            sub={formatDate(history[minIdx].order_date)}
          />
          <StatCard
            label="Highest"
            value={formatDollar(maxPrice)}
            sub={formatDate(history[maxIdx].order_date)}
          />
          <StatCard
            label="Latest"
            value={formatDollar(latestPrice)}
            sub={
              priceTrend === 0
                ? 'No change from first'
                : `${priceTrend > 0 ? '+' : ''}${priceTrend.toFixed(1)}% vs first purchase`
            }
          />
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-800 mb-1">
            Price History
            {isWeightItem && (
              <span className="text-xs font-normal text-gray-400 ml-2">per lb</span>
            )}
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            avg {formatDollar(avgPrice)}{isWeightItem ? '/lb' : ''}
          </p>
          <ItemDetailChart
            data={chartPoints}
            avgPrice={avgPrice}
            isWeightItem={isWeightItem}
          />
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-800 mb-4">All Purchases</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                  <th className="pb-2 pr-4 font-medium">Date</th>
                  <th className="pb-2 pr-4 font-medium">Qty</th>
                  <th className="pb-2 pr-4 font-medium">Total</th>
                  {isWeightItem && (
                    <th className="pb-2 pr-4 font-medium">Per lb</th>
                  )}
                  <th className="pb-2 font-medium text-right">Order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[...history].reverse().map((h, i) => {
                  const cmpPrice = Number(isWeightItem ? h.unit_price : h.total_price);
                  const isLow = cmpPrice === minPrice;
                  const isHigh = cmpPrice === maxPrice;
                  return (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="py-2 pr-4 text-gray-800 whitespace-nowrap">
                        {formatDate(h.order_date)}
                      </td>
                      <td className="py-2 pr-4 text-gray-600">
                        {Number(h.quantity)}{h.unit}
                      </td>
                      <td className="py-2 pr-4 text-gray-800">
                        {formatDollar(Number(h.total_price))}
                      </td>
                      {isWeightItem && (
                        <td className="py-2 pr-4">
                          <span className={`font-medium ${
                            isLow ? 'text-green-600' :
                            isHigh ? 'text-red-500' :
                            'text-gray-700'
                          }`}>
                            {formatDollar(Number(h.unit_price))}/lb
                          </span>
                        </td>
                      )}
                      <td className="py-2 text-right text-gray-400 text-xs whitespace-nowrap">
                        #{h.order_id}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
