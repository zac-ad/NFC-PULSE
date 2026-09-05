// app/admin/analytics/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface TapLog {
  id: string;
  city: string;
  region: string;
  country: string;
  ip_address: string;
  created_at: string;
  hardware_cards: {
    card_code: string;
  } | null;
  profiles: {
    full_name: string;
    slug: string;
  } | null;
}

export default function AdminAnalyticsPage() {
  const [taps, setTaps] = useState<TapLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTaps();
  }, []);

  const fetchTaps = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('card_taps')
      .select(`
        id,
        city,
        region,
        country,
        ip_address,
        created_at,
        hardware_cards ( card_code ),
        profiles ( full_name, slug )
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setTaps(data as any);
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-10 font-sans selection:bg-neutral-800">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">PULSE | Fleet Analytics & Geo-Trace</h1>
            <p className="text-xs text-neutral-400 mt-1">Real-time telemetry and approximate physical location logs.</p>
          </div>
          <button
            onClick={fetchTaps}
            className="px-4 py-2 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-xs font-semibold rounded-xl transition-all active:scale-95"
          >
            Refresh Logs
          </button>
        </div>

        {/* Metrics Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-5 shadow-lg">
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Total Recorded Taps</p>
            <p className="text-2xl font-bold mt-2">{taps.length}</p>
          </div>
          <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-5 shadow-lg">
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Unique Locations</p>
            <p className="text-2xl font-bold mt-2">
              {new Set(taps.map(t => `${t.city}, ${t.region}`)).size}
            </p>
          </div>
          <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-5 shadow-lg">
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Active Status</p>
            <p className="text-2xl font-bold text-emerald-400 mt-2 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Feed
            </p>
          </div>
        </div>

        {/* Tap Logs Table */}
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
          <div className="p-4 border-b border-neutral-900">
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-300">Recent Tap Traces</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-neutral-500">Loading telemetry logs...</div>
          ) : taps.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-500">
              No tap telemetry recorded yet. Test your card via <code className="text-neutral-300">/api/tap/[code]</code>.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-neutral-900 text-neutral-500 font-semibold uppercase tracking-wider bg-neutral-900/30">
                    <th className="p-4">Card Code</th>
                    <th className="p-4">Profile Target</th>
                    <th className="p-4">Location (Geo-Tag)</th>
                    <th className="p-4">IP Address</th>
                    <th className="p-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900">
                  {taps.map((tap) => (
                    <tr key={tap.id} className="hover:bg-neutral-900/40 transition-colors">
                      <td className="p-4 font-mono font-bold text-neutral-200">
                        {tap.hardware_cards?.card_code || 'Unknown Card'}
                      </td>
                      <td className="p-4 font-medium text-neutral-300">
                        {tap.profiles?.full_name ? (
                          <a href={`/p/${tap.profiles.slug}`} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">
                            {tap.profiles.full_name}
                          </a>
                        ) : (
                          'Unassigned'
                        )}
                      </td>
                      <td className="p-4 text-neutral-200 font-semibold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                        {tap.city}, {tap.region} ({tap.country})
                      </td>
                      <td className="p-4 font-mono text-neutral-400">
                        {tap.ip_address}
                      </td>
                      <td className="p-4 text-neutral-400">
                        {new Date(tap.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}