'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';

interface Props {
  onSynced: () => void;
}

export default function SyncButton({ onSynced }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);

  async function sync() {
    setLoading(true);
    setResult(null);
    const res = await fetch('/api/sync', { method: 'POST' });
    const data = await res.json();
    setResult(data);
    setLoading(false);
    if (data.imported > 0) onSynced();
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={sync}
        disabled={loading}
        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        {loading ? 'Syncing...' : 'Sync Now'}
      </button>
      {result && (
        <span className="text-sm text-gray-500">
          {result.imported > 0
            ? `Imported ${result.imported} new receipt${result.imported !== 1 ? 's' : ''}`
            : 'Already up to date'}
        </span>
      )}
    </div>
  );
}
