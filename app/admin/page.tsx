'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface HardwareCard {
  id: string;
  card_code: string;
  status: 'UNCLAIMED' | 'ACTIVE' | 'DEACTIVATED';
  profile_id: string | null;
  profiles?: {
    full_name: string;
    email: string;
  } | null;
}

export default function AdminFleetCommand() {
  const [cards, setCards] = useState<HardwareCard[]>([]);
  const [newCardCode, setNewCardCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchCards = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('hardware_cards')
      .select('*, profiles(full_name, email)')
      .order('card_code', { ascending: true });

    if (!error && data) {
      setCards(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardCode.trim()) return;

    const formattedCode = newCardCode.trim().toUpperCase();
    setMessage(null);

    const { error } = await supabase
      .from('hardware_cards')
      .insert({ card_code: formattedCode, status: 'UNCLAIMED' });

    if (error) {
      setMessage({ type: 'error', text: 'Failed to add card. Code might already exist.' });
    } else {
      setMessage({ type: 'success', text: `Card ${formattedCode} provisioned successfully!` });
      setNewCardCode('');
      fetchCards();
    }
  };

  const handleUpdateStatus = async (cardId: string, newStatus: 'ACTIVE' | 'DEACTIVATED') => {
    setMessage(null);
    const { error } = await supabase
      .from('hardware_cards')
      .update({ status: newStatus })
      .eq('id', cardId);

    if (error) {
      setMessage({ type: 'error', text: 'Failed to update card status.' });
    } else {
      fetchCards();
    }
  };

  const handleUnclaimCard = async (cardId: string, cardCode: string) => {
    if (!confirm(`Are you sure you want to unclaim ${cardCode}? This will detach the assigned profile.`)) {
      return;
    }

    setMessage(null);
    const { error } = await supabase
      .from('hardware_cards')
      .update({ status: 'UNCLAIMED', profile_id: null })
      .eq('id', cardId);

    if (error) {
      setMessage({ type: 'error', text: 'Failed to unclaim card.' });
    } else {
      setMessage({ type: 'success', text: `Card ${cardCode} is now UNCLAIMED and ready for activation.` });
      fetchCards();
    }
  };

  const totalCards = cards.length;
  const activeCards = cards.filter((c) => c.status === 'ACTIVE').length;
  const unclaimedCards = cards.filter((c) => c.status === 'UNCLAIMED').length;

  return (
    <main className="min-h-screen bg-black text-white p-4 md:p-8 flex justify-center font-sans">
      <div className="max-w-4xl w-full space-y-6">
        
        {/* Header Analytics */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-neutral-800 pb-5 gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Fleet Command</h1>
            <p className="text-sm text-neutral-400">PULSE Hardware Provisioning & Telemetry Analytics</p>
          </div>
          <div className="flex items-center gap-3 bg-neutral-950 border border-neutral-800 rounded-2xl p-2 px-4">
            <div className="text-center px-3 border-r border-neutral-800">
              <p className="text-[10px] text-neutral-500 font-bold uppercase">Total Cards</p>
              <p className="text-lg font-black text-white">{totalCards}</p>
            </div>
            <div className="text-center px-3 border-r border-neutral-800">
              <p className="text-[10px] text-neutral-500 font-bold uppercase">Active</p>
              <p className="text-lg font-black text-emerald-400">{activeCards}</p>
            </div>
            <div className="text-center px-3">
              <p className="text-[10px] text-neutral-500 font-bold uppercase">Unclaimed</p>
              <p className="text-lg font-black text-amber-400">{unclaimedCards}</p>
            </div>
          </div>
        </div>

        {message && (
          <div
            className={`p-4 rounded-xl border text-sm ${
              message.type === 'success'
                ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
                : 'bg-red-950/50 border-red-800 text-red-300'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Provision Card Form */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <h2 className="text-lg font-semibold text-white">Provision New Hardware Card</h2>
          <form onSubmit={handleAddCard} className="flex gap-3">
            <input
              type="text"
              placeholder="Hardware Code (e.g. CARD-9002)"
              value={newCardCode}
              onChange={(e) => setNewCardCode(e.target.value)}
              required
              className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neutral-600 text-sm"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-white text-black font-semibold text-sm rounded-xl hover:bg-neutral-200 transition-colors"
            >
              Add Hardware Pass
            </button>
          </form>
        </div>

        {/* Hardware Inventory Table */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <h2 className="text-lg font-semibold text-white">Hardware Inventory</h2>

          {loading ? (
            <p className="text-xs text-neutral-500 animate-pulse">Loading inventory...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-neutral-300">
                <thead className="text-[10px] text-neutral-500 uppercase tracking-wider border-b border-neutral-800">
                  <tr>
                    <th className="py-3 px-2">Card Code</th>
                    <th className="py-3 px-2">Status</th>
                    <th className="py-3 px-2">Assigned Profile</th>
                    <th className="py-3 px-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900">
                  {cards.map((card) => (
                    <tr key={card.id} className="hover:bg-neutral-900/50 transition-colors">
                      <td className="py-3.5 px-2 font-mono font-bold text-white">{card.card_code}</td>
                      <td className="py-3.5 px-2">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            card.status === 'ACTIVE'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/80'
                              : card.status === 'DEACTIVATED'
                              ? 'bg-red-950 text-red-400 border border-red-800/80'
                              : 'bg-amber-950 text-amber-400 border border-amber-800/80'
                          }`}
                        >
                          {card.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-2 text-neutral-400">
                        {card.profiles ? (
                          <span>
                            <strong className="text-white font-medium">{card.profiles.full_name}</strong> ({card.profiles.email})
                          </span>
                        ) : (
                          <span className="italic text-neutral-600">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3.5 px-2 text-right space-x-2">
                        {card.status === 'DEACTIVATED' && (
                          <button
                            onClick={() => handleUpdateStatus(card.id, 'ACTIVE')}
                            className="px-3 py-1.5 bg-emerald-950/60 border border-emerald-800 hover:bg-emerald-900 text-emerald-400 font-semibold rounded-lg transition-colors text-[11px]"
                          >
                            Reactivate
                          </button>
                        )}
                        {card.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleUpdateStatus(card.id, 'DEACTIVATED')}
                            className="px-3 py-1.5 bg-red-950/60 border border-red-800 hover:bg-red-900 text-red-400 font-semibold rounded-lg transition-colors text-[11px]"
                          >
                            Deactivate
                          </button>
                        )}
                        {card.status !== 'UNCLAIMED' && (
                          <button
                            onClick={() => handleUnclaimCard(card.id, card.card_code)}
                            className="px-3 py-1.5 bg-neutral-900 border border-neutral-700 hover:bg-neutral-800 text-neutral-300 font-semibold rounded-lg transition-colors text-[11px]"
                          >
                            Unclaim
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

      </div>
    </main>
  );
}