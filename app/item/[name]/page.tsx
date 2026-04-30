import sql from '@/lib/db';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react';
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

function linearRegression(points: { x: number; y: number }[]) {
  const n = points.length;
  if (n < 2) return null;

  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumXX = points.reduce((s, p) => s + p.x * p.x, 0);

  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return null;

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  const yMean = sumY / n;
  const ssTot = points.reduce((s, p) => s + (p.y - yMean) ** 2, 0);
  const ssRes = points.reduce((s, p) => s + (p.y - (slope * p.x + intercept)) ** 2, 0);
  const r2 = ssTot < 0.0001 ? 1 : Math.max(0, 1 - ssRes / ssTot);

  return { slope, intercept, r2 };
}

export default async function ItemPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const itemName = decodeURIComponent(name);

  const history = await sql`
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
  ` as Purchase[];

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

  // Linear regression for price forecasting
  const firstTimestamp = new Date(history[0].order_date).getTime();
  const regressionPoints = history.map((h) => ({
    x: (new Date(h.order_date).getTime() - firstTimestamp) / 86400000,
    y: Number(isWeightItem ? h.unit_price : h.total_price),
  }));

  const regression = history.length >= 3 ? linearRegression(regressionPoints) : null;
  const trendPerMonth = regression ? regression.slope * 30 : 0;

  const confidence = !regression ? 'none'
    : regression.r2 > 0.65 && history.length >= 5 ? 'high'
    : regression.r2 > 0.3 && history.length >= 3 ? 'medium'
    : 'low';

  const nowOffset = (Date.now() - firstTimestamp) / 86400000;
  const est30 = regression
    ? Math.max(0, regression.slope * (nowOffset + 30) + regression.intercept)
    : null;
  const est60 = regression
    ? Math.max(0, regression.slope * (nowOffset + 60) + regression.intercept)
    : null;

  // Build chart data: historical points with trend value, then forecast points
  const chartPoints = history.map((h, i) => ({
    date: formatDate(h.order_date),
    price: Number(isWeightItem ? h.unit_price : h.total_price) as number | undefined,
    qty: `${Number(h.quantity)}${h.unit}`,
    totalPrice: Number(h.total_price),
    trend: regression
      ? parseFloat((regression.slope * regressionPoints[i].x + regression.intercept).toFixed(2))
      : undefined,
    isForecast: false,
  }));

  if (regression && est30 !== null && est60 !== null) {
    chartPoints.push(
      {
        date: '+30 days',
        price: undefined,
        qty: '',
        totalPrice: 0,
        trend: parseFloat(est30.toFixed(2)),
        isForecast: true,
      },
      {
        date: '+60 days',
        price: undefined,
        qty: '',
        totalPrice: 0,
        trend: parseFloat(est60.toFixed(2)),
        isForecast: true,
      },
    );
  }

  const confidenceConfig = {
    high:   { label: 'High',   color: 'text-green-600',  bg: 'bg-green-50'  },
    medium: { label: 'Medium', color: 'text-amber-600',  bg: 'bg-amber-50'  },
    low:    { label: 'Low',    color: 'text-gray-500',   bg: 'bg-gray-100'  },
    none:   { label: '—',      color: 'text-gray-400',   bg: 'bg-gray-50'   },
  }[confidence];

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

        {regression && est30 !== null && (
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Price Forecast</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Monthly Trend</p>
                <div className="flex items-center gap-1.5">
                  {Math.abs(trendPerMonth) < 0.01 ? (
                    <Minus size={16} className="text-gray-400" />
                  ) : trendPerMonth > 0 ? (
                    <TrendingUp size={16} className="text-red-500" />
                  ) : (
                    <TrendingDown size={16} className="text-green-600" />
                  )}
                  <span className={`text-xl font-bold ${
                    Math.abs(trendPerMonth) < 0.01 ? 'text-gray-500' :
                    trendPerMonth > 0 ? 'text-red-500' : 'text-green-600'
                  }`}>
                    {trendPerMonth > 0 ? '+' : ''}{formatDollar(trendPerMonth)}/mo
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Est. in 30 Days</p>
                <p className="text-xl font-bold text-gray-900">{formatDollar(est30)}</p>
                {est60 !== null && (
                  <p className="text-xs text-gray-400 mt-0.5">60 days: {formatDollar(est60)}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Confidence</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${confidenceConfig.bg} ${confidenceConfig.color}`}>
                  {confidenceConfig.label}
                </span>
                <p className="text-xs text-gray-400 mt-1">{history.length} purchases · R²={regression.r2.toFixed(2)}</p>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-4 border-t border-gray-50 pt-3">
              Linear trend from {history.length} purchases. Low confidence = high price volatility, not necessarily a bad predictor of direction.
            </p>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold text-gray-800">
              Price History
              {isWeightItem && (
                <span className="text-xs font-normal text-gray-400 ml-2">per lb</span>
              )}
            </h2>
            {regression && (
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-6 h-0.5 bg-green-600 rounded" />
                  Actual
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-6 h-0.5 bg-amber-400 rounded" style={{ borderTop: '2px dashed #fbbf24', height: 0 }} />
                  Trend
                </span>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 mb-4">avg {formatDollar(avgPrice)}{isWeightItem ? '/lb' : ''}</p>
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
