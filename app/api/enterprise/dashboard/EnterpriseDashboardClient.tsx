'use client';
import { useEffect, useState } from 'react';

interface EmployeeCard {
  id: string;
  card_code: string;
  employee_name: string;
  employee_title: string;
  email: string;
  status: 'ACTIVE' | 'LOCKED' | 'UNASSIGNED';
  tap_count: number;
}

export default function EnterpriseDashboardClient({ organizationName }: { organizationName: string }) {
  const [cards, setCards] = useState<EmployeeCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCardCode, setNewCardCode] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [employeeTitle, setEmployeeTitle] = useState('');
  const [employeeEmail, setEmployeeEmail] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchFleetData = async () => {
    setLoading(true);
    const res = await fetch('/api/enterprise/cards');
    if (res.ok) {
      const { cards: data } = await res.json();
      setCards((data || []).map((c: Partial<EmployeeCard>) => ({
        id: c.id ?? '', card_code: c.card_code ?? '',
        employee_name: c.employee_name || 'Unassigned Pass',
        employee_title: c.employee_title || 'Pending Provisioning',
        email: c.email || 'None', status: c.status || 'UNASSIGNED', tap_count: c.tap_count || 0,
      })));
    }
    setLoading(false);
  };

  useEffect(() => {
    document.title = 'PULSE | Enterprise Fleet Command';
    fetchFleetData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleProvisionCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const res = await fetch('/api/enterprise/cards', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cardCode: newCardCode, employeeName, employeeTitle, employeeEmail }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setMessage({ type: 'error', text: body.error || 'Failed to provision card.' });
    } else {
      setMessage({ type: 'success', text: `Provisioned ${newCardCode.toUpperCase()} for ${employeeName}.` });
      setNewCardCode(''); setEmployeeName(''); setEmployeeTitle(''); setEmployeeEmail('');
      fetchFleetData();
    }
  };

  const handleToggleLock = async (cardId: string) => {
    const res = await fetch(`/api/enterprise/cards/${cardId}/toggle-lock`, { method: 'POST' });
    if (res.ok) {
      const { status } = await res.json();
      setCards((prev) => prev.map((c) => c.id === cardId ? { ...c, status } : c));
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center text-neutral-500 text-xs font-mono">
      Loading fleet telemetry...
    </div>
  );

  const activeCount = cards.filter((c) => c.status === 'ACTIVE').length;
  const lockedCount = cards.filter((c) => c.status === 'LOCKED').length;

  return (
    <main className="min-h-screen bg-black text-white p-4 md:p-8 font-sans flex justify-center">
      <div className="max-w-4xl w-full space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-neutral-800 pb-6 gap-4">
          <div>
            <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono uppercase tracking-wider">Enterprise Workspace</span>
            <h1 className="text-2xl font-bold tracking-tight mt-1">{organizationName} — Fleet Command</h1>
            <p className="text-xs text-neutral-400">Manage corporate hardware badges, employee allocations, and security locks.</p>
          </div>
          <div className="flex gap-3">
            <div className="bg-neutral-950 border border-neutral-800 px-4 py-2 rounded-xl text-center">
              <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-bold">Active</p>
              <p className="text-lg font-black text-emerald-400">{activeCount}</p>
            </div>
            <div className="bg-neutral-950 border border-neutral-800 px-4 py-2 rounded-xl text-center">
              <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-bold">Locked</p>
              <p className="text-lg font-black text-red-400">{lockedCount}</p>
            </div>
          </div>
        </div>

        {message && (
          <div className={`p-4 rounded-xl border text-xs ${message.type === 'success' ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300' : 'bg-red-950/50 border-red-800 text-red-300'}`}>
            {message.text}
          </div>
        )}

        <div className="bg-neutral-950 border border-neutral-800/80 rounded-3xl p-6 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-300">Provision New Employee Pass</h2>
          <form onSubmit={handleProvisionCard} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <input type="text" placeholder="Card Code (e.g. CARD-9002)" value={newCardCode} onChange={(e) => setNewCardCode(e.target.value.toUpperCase())} required className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-white uppercase font-mono" />
            <input type="text" placeholder="Employee Full Name" value={employeeName} onChange={(e) => setEmployeeName(e.target.value)} required className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-white" />
            <input type="text" placeholder="Job Title" value={employeeTitle} onChange={(e) => setEmployeeTitle(e.target.value)} required className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-white" />
            <input type="email" placeholder="Corporate Email" value={employeeEmail} onChange={(e) => setEmployeeEmail(e.target.value)} required className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-white" />
            <div className="md:col-span-2 lg:col-span-4 pt-2">
              <button type="submit" className="w-full py-3 bg-white text-black font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-neutral-200 transition-all">
                Assign & Activate Corporate Pass ⚡
              </button>
            </div>
          </form>
        </div>

        <div className="bg-neutral-950 border border-neutral-800/80 rounded-3xl overflow-hidden">
          <div className="p-6 border-b border-neutral-900 flex justify-between items-center">
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-300">Fleet Roster</h2>
            <span className="text-[11px] font-mono text-neutral-500">{cards.length} Total Passes</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-900/50 text-neutral-400 font-mono uppercase text-[10px] tracking-wider border-b border-neutral-900">
                <tr>
                  <th className="p-4">Pass ID</th><th className="p-4">Employee</th>
                  <th className="p-4">Role</th><th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900">
                {cards.length > 0 ? cards.map((card) => (
                  <tr key={card.id} className="hover:bg-neutral-900/30 transition-colors">
                    <td className="p-4 font-mono font-bold text-neutral-300">{card.card_code}</td>
                    <td className="p-4"><p className="font-bold text-white">{card.employee_name}</p><p className="text-[11px] text-neutral-500">{card.email}</p></td>
                    <td className="p-4 text-neutral-400">{card.employee_title}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold ${card.status === 'ACTIVE' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : card.status === 'LOCKED' ? 'bg-red-950 text-red-400 border border-red-800' : 'bg-neutral-900 text-neutral-400 border border-neutral-800'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${card.status === 'ACTIVE' ? 'bg-emerald-400 animate-pulse' : 'bg-neutral-500'}`} />
                        {card.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => handleToggleLock(card.id)} className={`px-3 py-1.5 rounded-lg font-semibold text-[11px] transition-all ${card.status === 'ACTIVE' ? 'bg-red-950/60 border border-red-800/80 text-red-300 hover:bg-red-900' : 'bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 hover:bg-emerald-900'}`}>
                        {card.status === 'ACTIVE' ? 'Lock Pass' : 'Unlock Pass'}
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="p-8 text-center text-neutral-500">No corporate passes registered yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
