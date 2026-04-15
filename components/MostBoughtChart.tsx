'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Trash2 } from 'lucide-react';

interface AllItem {
  name: string;
  times_bought: number;
  total_spent: string | number;
}

interface Category {
  id: number;
  name: string;
  keywords: string;
}

interface ChartEntry {
  name: string;
  fullName: string;
  count: number;
  spent: number;
}

interface Props {
  allItems: AllItem[];
}

function truncate(s: string, max = 22) {
  return s.length > max ? s.slice(0, max - 1) + '\u2026' : s;
}

function groupByCategories(allItems: AllItem[], categories: Category[]): ChartEntry[] {
  const grouped: Record<string, { name: string; count: number; spent: number }> = {};

  for (const item of allItems) {
    let catName: string | null = null;
    for (const cat of categories) {
      const kws = cat.keywords
        .split(',')
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean);
      if (kws.length > 0 && kws.some((kw) => item.name.toLowerCase().includes(kw))) {
        catName = cat.name;
        break;
      }
    }
    const key = catName ?? item.name;
    if (!grouped[key]) grouped[key] = { name: key, count: 0, spent: 0 };
    grouped[key].count += item.times_bought;
    grouped[key].spent += Number(item.total_spent);
  }

  return Object.values(grouped)
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)
    .map((g) => ({ name: truncate(g.name), fullName: g.name, count: g.count, spent: parseFloat(g.spent.toFixed(2)) }));
}

export default function MostBoughtChart({ allItems }: Props) {
  const [view, setView] = useState<'items' | 'categories'>('items');
  const [categories, setCategories] = useState<Category[]>([]);
  const [showManager, setShowManager] = useState(false);
  const [newName, setNewName] = useState('');
  const [newKeywords, setNewKeywords] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []));
  }, []);

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), keywords: newKeywords }),
    });
    const data = await res.json();
    setCategories((prev) => [
      ...prev.filter((c) => c.name !== data.category.name),
      data.category,
    ].sort((a, b) => a.name.localeCompare(b.name)));
    setNewName('');
    setNewKeywords('');
    setSaving(false);
  }

  async function deleteCategory(id: number) {
    await fetch(`/api/categories?id=${id}`, { method: 'DELETE' });
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  const chartData: ChartEntry[] =
    view === 'items'
      ? [...allItems]
          .sort((a, b) => b.times_bought - a.times_bought)
          .slice(0, 10)
          .map((i) => ({
            name: truncate(i.name),
            fullName: i.name,
            count: i.times_bought,
            spent: Number(i.total_spent),
          }))
      : groupByCategories(allItems, categories);

  const chartHeight = Math.max(240, chartData.length * 36);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
          <button
            onClick={() => setView('items')}
            className={`px-3 py-1 transition-colors ${view === 'items' ? 'bg-green-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            All Items
          </button>
          <button
            onClick={() => setView('categories')}
            className={`px-3 py-1 transition-colors ${view === 'categories' ? 'bg-green-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            By Category
          </button>
        </div>
        {view === 'categories' && (
          <button
            onClick={() => setShowManager((v) => !v)}
            className="ml-auto text-xs text-green-600 hover:text-green-700 font-medium"
          >
            {showManager ? 'Hide manager' : 'Manage categories'}
          </button>
        )}
      </div>

      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: '#374151' }}
            width={144}
          />
          <Tooltip
            formatter={(value: any, _: any, entry: any) => [
              `${value}x · $${entry.payload.spent.toFixed(2)} total`,
              entry.payload.fullName,
            ]}
          />
          <Bar dataKey="count" fill="#16a34a" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>

      {view === 'categories' && showManager && (
        <div className="border border-gray-100 rounded-lg p-4 space-y-3 bg-gray-50">
          <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
            Categories
          </p>

          {categories.length === 0 && (
            <p className="text-xs text-gray-400">No categories yet. Add one below.</p>
          )}

          <ul className="space-y-2">
            {categories.map((cat) => (
              <li key={cat.id} className="flex items-start gap-2 text-sm">
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-gray-800">{cat.name}</span>
                  {cat.keywords && (
                    <span className="text-gray-400 ml-2 text-xs">
                      keywords: {cat.keywords}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => deleteCategory(cat.id)}
                  className="text-gray-300 hover:text-red-400 transition-colors shrink-0 mt-0.5"
                >
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>

          <form onSubmit={addCategory} className="flex gap-2 pt-1">
            <input
              type="text"
              placeholder="Category name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="border border-gray-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-green-500 w-32"
            />
            <input
              type="text"
              placeholder="Keywords, comma-separated"
              value={newKeywords}
              onChange={(e) => setNewKeywords(e.target.value)}
              className="border border-gray-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-green-500 flex-1"
            />
            <button
              type="submit"
              disabled={saving || !newName.trim()}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-medium px-3 py-1 rounded-md transition-colors"
            >
              {saving ? '…' : 'Add'}
            </button>
          </form>
          <p className="text-xs text-gray-400">
            Items whose names contain any keyword are grouped under that category.
          </p>
        </div>
      )}
    </div>
  );
}
