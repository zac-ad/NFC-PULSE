'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface HardwareCard {
  id: string;
  card_code: string;
  status: string;
  profile_id: string | null;
  tap_count: number;
  created_at: string;
}

export default function AdminDashboardClient() {
  const [cards, setCards] = useState<HardwareCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCode, setNewCode] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    document.title = 'PULSE | Fleet Command';
    fetchCards();
  }, []);

  const fetchCards = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('hardware_cards')
      .select('*')
      .order('created_at', { ascending: false });
    setCards(data || []);
    setLoading(false);
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim()) return;
    setMessage(null);
    const code = newCode.trim().toUpperCase();
    const { error } = await supabase
      .from('hardware_cards')
      .insert({ card_code: code, status: 'UNCLAIMED' });
    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: `Card ${code} registered.` });
      setNewCode('');
      fetchCards();
    }
  };

  const handleToggleStatus = async (card: HardwareCard) => {
    const next = card.status === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE';
    await supabase.from('hardware_cards').update({ status: next }).eq('id', card.id);
    setCards(prev => prev.map(c => c.id === card.id ? { ...c, status: next } : c));
  };

  const filtered = cards.filter(c =>
    c.card_code.toLowerCase().includes(search.toLowerCase())
  );

  const counts = {
    total: cards.length,
    active: cards.filter(c => c.status === 'ACTIVE').length,
    unclaimed: cards.filter(c => c.status === 'UNCLAIMED').length,
    deactivated: cards.filter(c => c.status === 'DEACTIVATED').length,
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <p className="text-[12px] font-mono text-white/25 tracking-widest">Loading fleet data...</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#f2f0eb] font-sans">
      <div className="max-w-5xl mx-auto px-6 py-12 space-y-10">

        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/[0.06] pb-8">
          <div>
            <Link href="/" className="flex items-center gap-2 font-serif text-base text-white/40 hover:text-white transition-colors mb-4">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M2 12h4l2-6 4 12 3-8 2 2h5" />
              </svg>
              PULSE
            </Link>
            <p className="font-mono text-[10px] text-white/25 tracking-widest mb-2">ADMIN</p>
            <h1 className="font-serif text-3xl text-white">Fleet Command.</h1>
            <p className="text-[13px] text-white/35 mt-1">Manage all hardware cards across the system.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            {[
              { label: 'Total', value: counts.total },
              { label: 'Active', value: counts.active },
              { label: 'Unclaimed', value: counts.unclaimed },
              { label: 'Disabled', value: counts.deactivated },
            ].map(({ label, value }) => (
              <div key={label} className="bg-[#141414] border border-white/[0.06] rounded-xl px-4 py-3">
                <p className="text-[10px] font-mono text-white/25 tracking-wider">{label}</p>
                <p className="font-serif text-xl text-white mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Add card */}
        <div className="space-y-4">
          <h2 className="font-serif text-lg text-white">Register new card</h2>
          <form onSubmit={handleAddCard} className="flex gap-3">
            <input
              type="text"
              value={newCode}
              onChange={e => setNewCode(e.target.value.toUpperCase())}
              placeholder="CARD-CODE"
              required
              className="flex-1 bg-[#141414] border border-white/[0.08] text-white rounded-xl px-4 py-3 text-[13px] font-mono placeholder:text-white/20 focus:outline-none focus:border-white/20 uppercase"
            />
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-white text-black text-[13px] font-semibold hover:bg-[#f2f0eb] transition-colors"
            >
              Register
            </button>
          </form>
          {message && (
            <p className={`text-[12px] ${message.type === 'success' ? 'text-white/60' : 'text-red-400'}`}>
              {message.text}
            </p>
          )}
        </div>

        {/* Search + table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg text-white">All cards</h2>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search card code..."
              className="bg-[#141414] border border-white/[0.08] text-white rounded-xl px-4 py-2 text-[12px] placeholder:text-white/20 focus:outline-none focus:border-white/20 w-48"
            />
          </div>

          <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
            <table className="w-full text-left text-[12px]">
              <thead className="bg-[#141414] text-white/25 font-mono text-[10px] tracking-widest border-b border-white/[0.06]">
                <tr>
                  <th className="px-5 py-3">Card Code</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Taps</th>
                  <th className="px-5 py-3">Profile</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.length > 0 ? filtered.map(card => (
                  <tr key={card.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-white">{card.card_code}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono ${
                        card.status === 'ACTIVE'      ? 'bg-white/5 text-white/70 border border-white/10' :
                        card.status === 'UNCLAIMED'   ? 'bg-white/[0.03] text-white/30 border border-white/[0.06]' :
                        'bg-red-950/30 text-red-400/70 border border-red-900/30'
                      }`}>
                        <span className={`w-1 h-1 rounded-full ${
                          card.status === 'ACTIVE' ? 'bg-white/60 animate-pulse' :
                          card.status === 'UNCLAIMED' ? 'bg-white/20' : 'bg-red-500/50'
                        }`} />
                        {card.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-white/40 font-mono">{card.tap_count || 0}</td>
                    <td className="px-5 py-4 text-white/30 font-mono text-[11px]">
                      {card.profile_id ? card.profile_id.slice(0, 8) + '…' : '—'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {card.status !== 'UNCLAIMED' && (
                        <button
                          onClick={() => handleToggleStatus(card)}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                            card.status === 'ACTIVE'
                              ? 'bg-red-950/40 text-red-400/80 hover:bg-red-950/70 border border-red-900/30'
                              : 'bg-white/5 text-white/50 hover:bg-white/10 border border-white/[0.06]'
                          }`}
                        >
                          {card.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                        </button>
                      )}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-white/20 font-mono text-[11px]">
                      No cards found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  );
}
