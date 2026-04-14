'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ShoppingCart, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import Link from 'next/link';

function SetupContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const [authUrl, setAuthUrl] = useState('');

  useEffect(() => {
    fetch('/api/auth/url')
      .then((r) => r.json())
      .then((d) => setAuthUrl(d.url));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm max-w-md w-full p-8">
        <div className="flex items-center gap-2 mb-6">
          <ShoppingCart size={20} className="text-green-600" />
          <h1 className="text-lg font-semibold text-gray-900">Grocery Tracker Setup</h1>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg p-3 mb-6 text-sm text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Authorization failed</p>
              <p className="text-red-600 mt-0.5">
                {error === 'no_refresh_token'
                  ? 'No refresh token received. Revoke access in your Google account and try again.'
                  : `Error: ${error}`}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4 text-sm text-gray-600 mb-8">
          <p>
            Connect your Gmail account so Grocery Tracker can automatically find and import your
            Heinen&apos;s receipts.
          </p>
          <ul className="space-y-2">
            {[
              'Read-only access to Gmail',
              'Only reads emails matching "Your Order is Ready for Pickup"',
              'Your data stays in your own database',
            ].map((point) => (
              <li key={point} className="flex items-start gap-2">
                <CheckCircle size={14} className="text-green-500 mt-0.5 shrink-0" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <a
          href={authUrl || '#'}
          className="flex items-center justify-center gap-2 w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50"
          style={{ pointerEvents: authUrl ? 'auto' : 'none', opacity: authUrl ? 1 : 0.5 }}
        >
          <ExternalLink size={15} />
          Connect Gmail Account
        </a>

        <p className="text-xs text-gray-400 text-center mt-4">
          You&apos;ll be redirected to Google to authorize. Only Gmail read access is requested.
        </p>

        <div className="mt-6 pt-6 border-t border-gray-100 text-center">
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">
            ← Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SetupPage() {
  return (
    <Suspense fallback={null}>
      <SetupContent />
    </Suspense>
  );
}
