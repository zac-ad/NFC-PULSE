'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface CardItem {
  id: string;
  card_code: string;
  status: 'UNCLAIMED' | 'ACTIVE' | 'DEACTIVATED';
  profile_id?: string;
  created_at: string;
  profiles?: { full_name: string; email: string; slug: string } | null;
}

interface TapLog {
  id: string;
  card_code: string;
  created_at: string;
  ip_address?: string;
  user_agent?: string;
}

export default function AdminPage() {
  const [cards, setCards] = useState<CardItem[]>([]);
  const [taps, setTaps] = useState<TapLog[]>([]);
  const [loading, setLoading] = useState(true);

  // New Card Form State
  const [newCardCode, setNewCardCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);

    // 1. Fetch hardware cards with linked profile info
    const { data: cardsData } = await supabase
      .from('hardware_cards')
      .select('*, profiles(full_name, email, slug)')
      .order('created_at', { ascending: false });

    // 2. Fetch tap telemetry
    const { data: tapsData } = await supabase
      .from('card_taps')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    setCards(cardsData || []);
    setTaps(tapsData || []);
    setLoading(false);
  };

  // Provision new hardware card code
  const handleProvisionCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardCode) return;
    setIsSubmitting(true);
    setMsg(null);

    const { error } = await supabase.from('hardware_cards').insert({
      card_code: newCardCode.trim().toUpperCase(),
      status: 'UNCLAIMED',
    });

    if (error) {
      setMsg({ type: 'error', text: error.message || 'Failed to provision card.' });
    } else {
      setMsg({ type: 'success', text: `Card ${newCardCode.toUpperCase()} successfully provisioned!` });
      setNewCardCode('');
      fetchAdminData();
    }
    setIsSubmitting(false);
  };

  // Toggle Card Status (ACTIVE <-> DEACTIVATED)
  const handleToggleStatus = async (cardCode: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'DEACTIVATED' ? 'ACTIVE' : 'DEACTIVATED';

    const { error } = await supabase
      .from('hardware_cards')
      .update({ status: nextStatus })
      .eq('card_code', cardCode);

    if (!error) {
      fetchAdminData();
    }
  };

  return (
    <main className="min-h-screen bg-black text-white p-4 md:p-8 flex justify-center">
      <div className="max-w-5xl w-full space-y-8">
        
        {/* Header & Fleet Stats */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-neutral-800 pb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Fleet Command</h1>
            <p className="text-neutral-400 text-sm mt-1">
              PULSE Hardware Provisioning & Telemetry Analytics
            </p>
          </div>

          <div className="flex gap-4">
            <div className="bg-neutral-950 border border-neutral-800 px-4 py-2.5 rounded-xl text-center">
              <p className="text-xs text-neutral-500 uppercase font-semibold">Total Cards</p>
              <p className="text-xl font-bold text-white">{cards.length}</p>
            </div>
            <div className="bg-neutral-950 border border-neutral-800 px-4 py-2.5 rounded-xl text-center">
              <p className="text-xs text-neutral-500 uppercase font-semibold">Active</p>
              <p className="text-xl font-bold text-emerald-400">
                {cards.filter((c) => c.status === 'ACTIVE').length}
              </p>
            </div>
            <div className="bg-neutral-950 border border-neutral-800 px-4 py-2.5 rounded-xl text-center">
              <p className="text-xs text-neutral-500 uppercase font-semibold">Unclaimed</p>
              <p className="text-xl font-bold text-amber-400">
                {cards.filter((c) => c.status === 'UNCLAIMED').length}
              </p>
            </div>
          </div>
        </div>

        {msg && (
          <div
            className={`p-4 rounded-xl border text-sm ${
              msg.type === 'success'
                ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
                : 'bg-red-950/50 border-red-800 text-red-300'
            }`}
          >
            {msg.text}
          </div>
        )}

        {/* Card Provisioning Portal */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">Provision New Hardware Card</h2>
          <form onSubmit={handleProvisionCard} className="flex gap-3">
            <input
              type="text"
              placeholder="Hardware Code (e.g. CARD-9002)"
              value={newCardCode}
              onChange={(e) => setNewCardCode(e.target.value)}
              className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-neutral-600"
              required
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-white text-black font-semibold text-sm rounded-xl hover:bg-neutral-200 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Provisioning...' : 'Add Hardware Pass'}
            </button>
          </form>
        </div>

        {/* Hardware Fleet Inventory Table */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 overflow-hidden">
          <h2 className="text-lg font-semibold mb-4">Hardware Inventory</h2>
          {loading ? (
            <p className="text-neutral-500 text-sm py-4">Loading inventory...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-500 uppercase text-xs">
                    <th className="pb-3 font-semibold">Card Code</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold">Assigned Profile</th>
                    <th className="pb-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900">
                  {cards.map((card) => (
                    <tr key={card.id}>
                      <td className="py-3 font-mono text-white font-medium">{card.card_code}</td>
                      <td className="py-3">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            card.status === 'ACTIVE'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                              : card.status === 'UNCLAIMED'
                              ? 'bg-amber-950 text-amber-400 border border-amber-800/50'
                              : 'bg-red-950 text-red-400 border border-red-800/50'
                          }`}
                        >
                          {card.status}
                        </span>
                      </td>
                      <td className="py-3 text-neutral-400">
                        {card.profiles ? (
                          <span>
                            {card.profiles.full_name} ({card.profiles.email})
                          </span>
                        ) : (
                          <span className="text-neutral-600 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3">
                        {card.status !== 'UNCLAIMED' && (
                          <button
                            onClick={() => handleToggleStatus(card.card_code, card.status)}
                            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                              card.status === 'DEACTIVATED'
                                ? 'border-emerald-800 text-emerald-400 hover:bg-emerald-950'
                                : 'border-red-800 text-red-400 hover:bg-red-950'
                            }`}
                          >
                            {card.status === 'DEACTIVATED' ? 'Reactivate' : 'Deactivate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Real-time Telemetry Feed */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Tap Telemetry</h2>
          <div className="space-y-3">
            {taps.map((tap) => (
              <div
                key={tap.id}
                className="flex items-center justify-between bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-xs"
              >
                <div>
                  <span className="font-mono text-white font-bold mr-3">{tap.card_code}</span>
                  <span className="text-neutral-500">{tap.ip_address || '127.0.0.1'}</span>
                </div>
                <div className="text-neutral-500">
                  {new Date(tap.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </main>
  );
}