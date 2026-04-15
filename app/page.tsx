'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ShoppingCart, TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import SpendChart from '@/components/SpendChart';
import MonthlySpendChart from '@/components/MonthlySpendChart';
import MostBoughtChart from '@/components/MostBoughtChart';
import ItemPriceChart from '@/components/ItemPriceChart';
import SyncButton from '@/components/SyncButton';

interface DashboardData {
  receipts: any[];
  weeklySpend: { week_start: string; total: number }[];
  topItems: { name: string; times_bought: number; total_spent: number; avg_price: number; min_price: number; max_price: number }[];
  lastSyncedAt: string | null;
  gmailConnected: boolean;
}

function formatDate(str: string) {
  return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDollar(n: number) {
  return `$${Number(n).toFixed(2)}`;
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

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [itemNames, setItemNames] = useState<string[]>([]);
  const [allItems, setAllItems] = useState<{ name: string; times_bought: number; total_spent: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [spendView, setSpendView] = useState<'weekly' | 'monthly'>('weekly');

  const load = useCallback(async () => {
    try {
      const [receiptsRes, itemsRes] = await Promise.all([
        fetch('/api/receipts'),
        fetch('/api/items'),
      ]);
      const receiptsData = await receiptsRes.json();
      const itemsData = await itemsRes.json();
      if (receiptsData.error) throw new Error(receiptsData.error);
      setData(receiptsData);
      setItemNames(itemsData.names ?? []);
      setAllItems(itemsData.allItems ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-500 text-sm">Error: {error}</p>
      </div>
    );
  }

  if (!data) return null;

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const thisMonthReceipts = data.receipts.filter(
    (r) => new Date(r.order_date) >= thisMonthStart,
  );
  const lastMonthReceipts = data.receipts.filter(
    (r) => new Date(r.order_date) >= lastMonthStart && new Date(r.order_date) < thisMonthStart,
  );

  const thisMonthTotal = thisMonthReceipts.reduce((s: number, r: any) => s + Number(r.total), 0);
  const lastMonthTotal = lastMonthReceipts.reduce((s: number, r: any) => s + Number(r.total), 0);
  const allTotals = data.receipts.map((r: any) => Number(r.total));
  const avgWeekly = allTotals.length ? allTotals.reduce((a, b) => a + b, 0) / allTotals.length : 0;
  const monthDelta = lastMonthTotal > 0
    ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
    : null;

  const priceWatch = data.topItems
    .filter((i) => i.times_bought >= 2 && Number(i.max_price) > Number(i.min_price))
    .map((i) => ({
      name: i.name,
      min: Number(i.min_price),
      max: Number(i.max_price),
      avg: Number(i.avg_price),
      swingPct: ((Number(i.max_price) - Number(i.min_price)) / Number(i.min_price)) * 100,
    }))
    .sort((a, b) => b.swingPct - a.swingPct)
    .slice(0, 8);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart size={20} className="text-green-600" />
            <h1 className="text-lg font-semibold text-gray-900">Grocery Tracker</h1>
            <span className="text-xs text-gray-400 ml-1">Heinen&apos;s</span>
          </div>
          <div className="flex items-center gap-4">
            {data.lastSyncedAt && (
              <span className="text-xs text-gray-400">
                Last synced {formatDate(data.lastSyncedAt)}
              </span>
            )}
            {data.gmailConnected ? (
              <SyncButton onSynced={load} />
            ) : (
              <Link
                href="/setup"
                className="flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700 font-medium"
              >
                <AlertCircle size={14} />
                Connect Gmail
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {data.receipts.length === 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-6 text-center">
            <p className="text-amber-700 font-medium">No receipts imported yet.</p>
            <p className="text-amber-600 text-sm mt-1">
              {data.gmailConnected
                ? 'Click "Sync Now" to import receipts from Gmail.'
                : <><Link href="/setup" className="underline">Connect Gmail</Link> to start importing receipts.</>
              }
            </p>
          </div>
        )}

        {data.receipts.length > 0 && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                label="This Month"
                value={formatDollar(thisMonthTotal)}
                sub={monthDelta !== null
                  ? `${monthDelta > 0 ? '+' : ''}${monthDelta.toFixed(0)}% vs last month`
                  : undefined}
              />
              <StatCard
                label="Last Month"
                value={formatDollar(lastMonthTotal)}
                sub={`${lastMonthReceipts.length} order${lastMonthReceipts.length !== 1 ? 's' : ''}`}
              />
              <StatCard
                label="Avg Per Order"
                value={formatDollar(avgWeekly)}
                sub={`across ${data.receipts.length} orders`}
              />
              <StatCard
                label="All Time"
                value={formatDollar(allTotals.reduce((a, b) => a + b, 0))}
                sub={`${data.receipts.length} orders`}
              />
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={16} className="text-green-600" />
                <h2 className="font-semibold text-gray-800">Spending Trends</h2>
                <div className="ml-auto flex rounded-lg border border-gray-200 overflow-hidden text-xs">
                  <button
                    onClick={() => setSpendView('weekly')}
                    className={`px-3 py-1 transition-colors ${spendView === 'weekly' ? 'bg-green-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    Weekly
                  </button>
                  <button
                    onClick={() => setSpendView('monthly')}
                    className={`px-3 py-1 transition-colors ${spendView === 'monthly' ? 'bg-green-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                  >
                    Monthly
                  </button>
                </div>
              </div>
              {spendView === 'weekly' ? (
                data.weeklySpend.length > 0
                  ? <SpendChart data={data.weeklySpend} />
                  : <p className="text-sm text-gray-400 py-8 text-center">Need more data to show trends.</p>
              ) : (
                <MonthlySpendChart receipts={data.receipts} />
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-800 mb-4">Most Bought Items</h2>
                <MostBoughtChart allItems={allItems} />
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-800 mb-4">Item Price History</h2>
                <ItemPriceChart itemNames={itemNames} />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-800 mb-4">Top Items by Spend</h2>
                <ul className="space-y-2">
                  {data.topItems.slice(0, 10).map((item: any) => (
                    <li key={item.name} className="flex items-center justify-between text-sm">
                      <div className="min-w-0">
                        <Link
                          href={`/item/${encodeURIComponent(item.name)}`}
                          className="text-gray-800 truncate block hover:text-green-600 transition-colors"
                        >
                          {item.name}
                        </Link>
                        <span className="text-gray-400 text-xs">
                          {item.times_bought}x · avg {formatDollar(item.avg_price)}
                        </span>
                      </div>
                      <span className="font-medium text-gray-700 ml-4 shrink-0">
                        {formatDollar(item.total_spent)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-800 mb-4">Price Watch</h2>
                {priceWatch.length === 0 ? (
                  <p className="text-sm text-gray-400">Not enough repeat purchases to show price changes.</p>
                ) : (
                  <ul className="space-y-2">
                    {priceWatch.map((item) => (
                      <li key={item.name} className="flex items-center justify-between text-sm">
                        <div className="min-w-0 flex-1">
                          <span className="text-gray-800 truncate block">{item.name}</span>
                          <span className="text-gray-400 text-xs">
                            ${item.min.toFixed(2)} – ${item.max.toFixed(2)} · avg ${item.avg.toFixed(2)}
                          </span>
                        </div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ml-4 shrink-0 ${
                          item.swingPct >= 25 ? 'bg-red-50 text-red-600' :
                          item.swingPct >= 10 ? 'bg-amber-50 text-amber-600' :
                          'bg-gray-50 text-gray-500'
                        }`}>
                          {item.swingPct.toFixed(0)}% range
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar size={16} className="text-green-600" />
                <h2 className="font-semibold text-gray-800">Order History</h2>
              </div>
              <div className="space-y-3">
                {data.receipts.map((receipt: any) => (
                  <details key={receipt.id} className="group border border-gray-100 rounded-lg">
                    <summary className="flex items-center justify-between px-4 py-3 cursor-pointer list-none hover:bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-800">
                          {formatDate(receipt.order_date)}
                        </span>
                        <span className="text-xs text-gray-400">
                          #{receipt.order_id} · {receipt.item_count} items
                        </span>
                      </div>
                      <span className="font-semibold text-gray-900">{formatDollar(receipt.total)}</span>
                    </summary>
                    <ul className="px-4 pb-3 pt-2 space-y-1 border-t border-gray-50">
                      {receipt.items?.map((item: any) => (
                        <li key={item.id} className="flex justify-between text-sm text-gray-600">
                          <span>
                            <Link
                              href={`/item/${encodeURIComponent(item.name)}`}
                              className="hover:text-green-600 transition-colors"
                            >
                              {item.name}
                            </Link>{' '}
                            <span className="text-gray-400">{item.quantity}{item.unit}</span>
                          </span>
                          <span>{formatDollar(item.total_price)}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
