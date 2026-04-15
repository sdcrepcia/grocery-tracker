'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';

interface Props {
  onSynced: () => void;
}

export default function SyncButton({ onSynced }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[]; emailsFound: number } | null>(null);

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
        <div className="text-sm text-gray-500">
          {result.imported > 0
            ? `Imported ${result.imported} new receipt${result.imported !== 1 ? 's' : ''}`
            : result.emailsFound === 0
              ? 'No matching emails found'
              : `Found ${result.emailsFound} email${result.emailsFound !== 1 ? 's' : ''}, imported 0`}
          {result.errors.length > 0 && (
            <ul className="mt-1 text-red-500 text-xs">
              {result.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
