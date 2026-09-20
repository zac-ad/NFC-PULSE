'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface HardwareCard {
  id: string;
  card_code: string;
  status: string;
  profile_id: string | null;
  tap_count: number;
  created_at: string;
  profiles?: { full_name?: string; email?: string; slug?: string; account_id?: string } | null;
}

interface ConfirmModal {
  type: 'disable' | 'enable' | 'release' | 'delete-user';
  card: HardwareCard;
  label: string;
  description: string;
  confirmLabel: string;
  danger: boolean;
}

async function adminFetch(url: string, method: string, body: object) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res;
}

export default function AdminDashboardClient() {
  const [cards, setCards]     = useState<HardwareCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCode, setNewCode] = useState('');
  const [search, setSearch]   = useState('');
  const [tab, setTab]         = useState<'cards' | 'users' | 'activity'>('cards');
  const [actions, setActions] = useState<{ id: string; action: string; card_code: string | null; detail: string | null; created_at: string }[]>([]);
  const [confirm, setConfirm] = useState<ConfirmModal | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [working, setWorking] = useState(false);

  const fetchCards = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/cards');
    if (res.ok) {
      const { cards: data } = await res.json();
      setCards(data || []);
    }
    setLoading(false);
  };

  const fetchActions = async () => {
    const res = await fetch('/api/admin/activity');
    if (res.ok) {
      const { actions: data } = await res.json();
      setActions(data || []);
    }
  };


  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  };

  useEffect(() => {
    document.title = 'PULSE | Fleet Command';
    fetchCards();
    fetchActions();
  }, []);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || working) return;
    setWorking(true);
    setMessage(null);
    const code = newCode.trim().toUpperCase();
    const res = await adminFetch('/api/admin/cards', 'POST', { card_code: code });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      showMessage('error', body.error || 'Failed to register card.');
    } else {
      showMessage('success', `Card ${code} registered.`);
      setNewCode('');
      fetchCards();
      fetchActions();
    }
    setWorking(false);
  };

  const handleConfirm = async () => {
    if (!confirm || working) return;
    setWorking(true);
    const { type, card } = confirm;

    if (type === 'delete-user') {
      const res = await adminFetch('/api/admin/users', 'DELETE', {
        account_id: card.profiles?.account_id,
        card_code: card.card_code,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        showMessage('error', body.error || 'Failed to delete user.');
      } else {
        showMessage('success', `User deleted. ${card.card_code} is now transferable.`);
        fetchCards();
        fetchActions();
      }
    } else {
      const actionMap = { disable: 'disable', enable: 'enable', release: 'release' } as const;
      const res = await adminFetch('/api/admin/cards', 'PATCH', {
        card_id: card.id,
        action: actionMap[type as 'disable' | 'enable' | 'release'],
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        showMessage('error', body.error || 'Action failed.');
      } else {
        const msg =
          type === 'disable' ? `${card.card_code} disabled.` :
          type === 'enable'  ? `${card.card_code} enabled.` :
          `${card.card_code} released — now transferable.`;
        showMessage('success', msg);
        fetchCards();
        fetchActions();
      }
    }

    setConfirm(null);
    setWorking(false);
  };

  const openDisable = (card: HardwareCard) => setConfirm({
    type: 'disable', card,
    label: 'Disable card',
    description: `${card.card_code} will stop responding immediately. Anyone who taps it will see the deactivated screen.`,
    confirmLabel: 'Yes, disable',
    danger: true,
  });

  const openEnable = (card: HardwareCard) => setConfirm({
    type: 'enable', card,
    label: 'Enable card',
    description: `${card.card_code} will become active again and route to its linked profile.`,
    confirmLabel: 'Yes, enable',
    danger: false,
  });

  const openRelease = (card: HardwareCard) => setConfirm({
    type: 'release', card,
    label: 'Release card',
    description: `This will unlink ${card.card_code} from its current user and reset it to UNCLAIMED. The card becomes transferable to a new user. The user account is not deleted.`,
    confirmLabel: 'Yes, release card',
    danger: true,
  });

  const openDeleteUser = (card: HardwareCard) => setConfirm({
    type: 'delete-user', card,
    label: 'Delete user',
    description: `This permanently deletes ${card.profiles?.full_name || 'this user'}'s account and profile. ${card.card_code} will be reset to UNCLAIMED and become transferable. This cannot be undone.`,
    confirmLabel: 'Yes, delete user',
    danger: true,
  });

  const filtered = cards.filter(c => {
    const q = search.toLowerCase();
    return (
      c.card_code.toLowerCase().includes(q) ||
      c.profiles?.full_name?.toLowerCase().includes(q) ||
      c.profiles?.email?.toLowerCase().includes(q) ||
      c.profiles?.slug?.toLowerCase().includes(q)
    );
  });

  const users = cards
    .filter(c => c.profiles?.email)
    .map(c => ({ ...c.profiles!, card_code: c.card_code, card_id: c.id, status: c.status, tap_count: c.tap_count, card: c }));

  const counts = {
    total: cards.length,
    active: cards.filter(c => c.status === 'ACTIVE').length,
    unclaimed: cards.filter(c => c.status === 'UNCLAIMED').length,
    deactivated: cards.filter(c => c.status === 'DEACTIVATED').length,
  };

  const inputCls = 'bg-[#141414] border border-white/[0.08] text-white rounded-xl px-4 py-3 text-[13px] placeholder:text-white/20 focus:outline-none focus:border-white/20';

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <p className="text-[12px] font-mono text-white/25 tracking-widest">Loading fleet data...</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#f2f0eb] font-sans">

      {/* Confirm modal */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6">
          <div className="bg-[#141414] border border-white/10 rounded-2xl p-7 max-w-sm w-full space-y-5">
            <div>
              <p className="font-mono text-[10px] text-white/25 tracking-widest mb-2 uppercase">
                {confirm.label}
              </p>
              <h2 className="font-serif text-xl text-white">{confirm.label}?</h2>
              <p className="text-[13px] text-white/40 mt-2 leading-relaxed">{confirm.description}</p>
              {confirm.card.profiles?.full_name && confirm.type !== 'delete-user' && (
                <p className="text-[12px] font-mono text-white/30 mt-2">
                  Linked to: {confirm.card.profiles.full_name}
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirm(null)}
                disabled={working}
                className="flex-1 py-3 rounded-xl border border-white/[0.08] text-white/50 text-[13px] hover:text-white transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={working}
                className={`flex-1 py-3 rounded-xl text-[13px] font-semibold transition-colors disabled:opacity-50 ${
                  confirm.danger
                    ? 'bg-red-500/90 text-white hover:bg-red-500'
                    : 'bg-white text-black hover:bg-[#f2f0eb]'
                }`}
              >
                {working ? 'Working…' : confirm.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-6 py-12 space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/[0.06] pb-8">
          <div>
            <Link href="/" className="flex items-center gap-2 font-serif text-sm text-white/35 hover:text-white transition-colors mb-4">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M2 12h4l2-6 4 12 3-8 2 2h5" />
              </svg>
              PULSE
            </Link>
            <p className="font-mono text-[10px] text-white/25 tracking-widest mb-2">ADMIN</p>
            <h1 className="font-serif text-3xl text-white">Fleet Command.</h1>
            <p className="text-[13px] text-white/35 mt-1">Manage all hardware cards and users.</p>
          <button
            onClick={handleLogout}
            className="mt-4 text-[11px] font-mono text-white/20 hover:text-red-400/70 transition-colors tracking-widest"
          >
            SIGN OUT →
          </button>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            {[
              { label: 'Total',     value: counts.total },
              { label: 'Active',    value: counts.active },
              { label: 'Unclaimed', value: counts.unclaimed },
              { label: 'Disabled',  value: counts.deactivated },
            ].map(({ label, value }) => (
              <div key={label} className="bg-[#141414] border border-white/[0.06] rounded-xl px-4 py-3">
                <p className="text-[10px] font-mono text-white/25 tracking-wider">{label}</p>
                <p className="font-serif text-xl text-white mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`px-4 py-3 rounded-xl text-[13px] border ${
            message.type === 'success'
              ? 'bg-white/[0.04] border-white/10 text-white/70'
              : 'bg-red-950/30 border-red-900/50 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        {/* Register card */}
        <div className="space-y-3">
          <h2 className="font-serif text-lg text-white">Register new card</h2>
          <form onSubmit={handleAddCard} className="flex gap-3">
            <input
              type="text" value={newCode} aria-label="Card code"
              onChange={e => setNewCode(e.target.value.toUpperCase())}
              placeholder="CARD-CODE" required
              className={`flex-1 ${inputCls} font-mono uppercase`}
            />
            <button type="submit" disabled={working}
              className="px-6 py-3 rounded-xl bg-white text-black text-[13px] font-semibold hover:bg-[#f2f0eb] transition-colors disabled:opacity-50">
              {working ? 'Registering…' : 'Register'}
            </button>
          </form>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1 bg-[#141414] border border-white/[0.06] rounded-xl p-1">
            {(['cards', 'users', 'activity'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-5 py-2 rounded-lg text-[13px] font-medium transition-colors capitalize ${
                  tab === t ? 'bg-white text-black' : 'text-white/35 hover:text-white'
                }`}>
                {t === 'cards' ? `Cards (${counts.total})` : t === 'users' ? `Users (${users.length})` : 'Activity'}
              </button>
            ))}
          </div>
          {tab !== 'activity' && (
            <input
              type="search" value={search} aria-label="Search"
              onChange={e => setSearch(e.target.value)}
              placeholder={tab === 'cards' ? 'Search card, name, email…' : 'Search name or email…'}
              className="bg-[#141414] border border-white/[0.08] text-white rounded-xl px-4 py-2 text-[12px] placeholder:text-white/20 focus:outline-none focus:border-white/20 w-56"
            />
          )}
        </div>

        {/* Cards table */}
        {tab === 'cards' && (
          <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
            <table className="w-full text-left text-[12px]">
              <thead className="bg-[#141414] text-white/25 font-mono text-[10px] tracking-widest border-b border-white/[0.06]">
                <tr>
                  <th className="px-5 py-3">Card</th>
                  <th className="px-5 py-3">Owner</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Taps</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.length > 0 ? filtered.map(card => (
                  <tr key={card.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-white">{card.card_code}</td>
                    <td className="px-5 py-4">
                      {card.profiles?.full_name ? (
                        <div>
                          <p className="text-white/80">{card.profiles.full_name}</p>
                          <p className="text-white/30 text-[11px]">{card.profiles.email}</p>
                        </div>
                      ) : (
                        <span className="text-white/20">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono ${
                        card.status === 'ACTIVE'      ? 'bg-white/5 text-white/70 border border-white/10' :
                        card.status === 'UNCLAIMED'   ? 'bg-white/[0.03] text-white/30 border border-white/[0.06]' :
                        'bg-red-950/30 text-red-400/70 border border-red-900/30'
                      }`}>
                        <span className={`w-1 h-1 rounded-full ${
                          card.status === 'ACTIVE'    ? 'bg-white/60 animate-pulse' :
                          card.status === 'UNCLAIMED' ? 'bg-white/20' : 'bg-red-500/50'
                        }`} />
                        {card.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-white/40 font-mono">{card.tap_count || 0}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        {card.status === 'ACTIVE' && (
                          <>
                            <button onClick={() => openRelease(card)}
                              className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-amber-950/40 text-amber-400/80 hover:bg-amber-950/70 border border-amber-900/30 transition-colors">
                              Release
                            </button>
                            <button onClick={() => openDisable(card)}
                              className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-red-950/40 text-red-400/80 hover:bg-red-950/70 border border-red-900/30 transition-colors">
                              Disable
                            </button>
                          </>
                        )}
                        {card.status === 'DEACTIVATED' && (
                          <button onClick={() => openEnable(card)}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-white/5 text-white/50 hover:bg-white/10 border border-white/[0.06] transition-colors">
                            Enable
                          </button>
                        )}
                      </div>
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
        )}

        {/* Users table */}
        {tab === 'users' && (
          <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
            <table className="w-full text-left text-[12px]">
              <thead className="bg-[#141414] text-white/25 font-mono text-[10px] tracking-widest border-b border-white/[0.06]">
                <tr>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Card</th>
                  <th className="px-5 py-3">Taps</th>
                  <th className="px-5 py-3">Live profile</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {users
                  .filter(u => {
                    const q = search.toLowerCase();
                    return u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
                  })
                  .map((u, i) => (
                    <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-4 text-white/80">{u.full_name || '—'}</td>
                      <td className="px-5 py-4 text-white/50 font-mono text-[11px]">{u.email}</td>
                      <td className="px-5 py-4 font-mono text-white/60">{u.card_code}</td>
                      <td className="px-5 py-4 text-white/40 font-mono">{u.tap_count || 0}</td>
                      <td className="px-5 py-4">
                        {u.slug ? (
                          <a href={`/p/${u.slug}`} target="_blank" rel="noopener noreferrer"
                            className="text-white/35 hover:text-white transition-colors border-b border-white/15 pb-px text-[11px]">
                            /p/{u.slug}
                          </a>
                        ) : <span className="text-white/20">—</span>}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button onClick={() => openDeleteUser(u.card)}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-red-950/40 text-red-400/80 hover:bg-red-950/70 border border-red-900/30 transition-colors">
                          Delete user
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Activity log */}
        {tab === 'activity' && (
          <div className="rounded-2xl border border-white/[0.06] overflow-hidden">
            <table className="w-full text-left text-[12px]">
              <thead className="bg-[#141414] text-white/25 font-mono text-[10px] tracking-widest border-b border-white/[0.06]">
                <tr>
                  <th className="px-5 py-3">Action</th>
                  <th className="px-5 py-3">Card</th>
                  <th className="px-5 py-3">Detail</th>
                  <th className="px-5 py-3 text-right">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {actions.length > 0 ? actions.map(a => (
                  <tr key={a.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono ${
                        a.action === 'DISABLE_CARD'  ? 'bg-red-950/30 text-red-400/70 border border-red-900/30' :
                        a.action === 'DELETE_USER'   ? 'bg-red-950/30 text-red-400/70 border border-red-900/30' :
                        a.action === 'RELEASE_CARD'  ? 'bg-amber-950/30 text-amber-400/70 border border-amber-900/30' :
                        a.action === 'ENABLE_CARD'   ? 'bg-white/5 text-white/70 border border-white/10' :
                        'bg-white/[0.03] text-white/40 border border-white/[0.06]'
                      }`}>
                        {a.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono font-bold text-white">{a.card_code || '—'}</td>
                    <td className="px-5 py-4 text-white/40">{a.detail || '—'}</td>
                    <td className="px-5 py-4 text-right text-white/30 font-mono text-[11px]">
                      {new Date(a.created_at).toLocaleString()}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-white/20 font-mono text-[11px]">
                      No admin actions logged yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </main>
  );
}
