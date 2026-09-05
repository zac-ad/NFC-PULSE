'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Profile {
  id: string;
  full_name: string;
  title: string;
  company: string;
  bio: string;
  email: string;
  slug: string;
  is_active: boolean;
}

interface LinkItem {
  id: string;
  title: string;
  url: string;
  type: 'link' | 'qr';
}

export default function ProfessionalDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');

  useEffect(() => {
    fetchProfessionalData();
  }, []);

  const fetchProfessionalData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const userEmail = session?.user?.email;

    if (!userEmail) {
      setLoading(false);
      return;
    }

    const { data: profData } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', userEmail)
      .eq('profile_type', 'PROFESSIONAL')
      .maybeSingle();

    if (profData) {
      setProfile(profData);
      const { data: linkData } = await supabase
        .from('profile_links')
        .select('*')
        .eq('profile_id', profData.id)
        .order('position', { ascending: true });

      setLinks(linkData || []);
    }
    setLoading(false);
  };

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !newTitle || !newUrl) return;

    const { data, error } = await supabase
      .from('profile_links')
      .insert({
        profile_id: profile.id,
        title: newTitle,
        url: newUrl,
        type: 'link',
        position: links.length,
      })
      .select()
      .single();

    if (!error && data) {
      setLinks([...links, data]);
      setNewTitle('');
      setNewUrl('');
    }
  };

  const handleDeleteLink = async (id: string) => {
    const { error } = await supabase.from('profile_links').delete().eq('id', id);
    if (!error) {
      setLinks(links.filter((l) => l.id !== id));
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center text-xs">Loading Professional Dashboard...</div>;
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-neutral-950 border border-neutral-800 rounded-3xl p-6 text-center space-y-3">
          <h1 className="text-sm font-bold">Unauthorized Access</h1>
          <p className="text-xs text-neutral-400">No active professional profile found for this session.</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-10 font-sans selection:bg-neutral-800">
      <div className="max-w-xl mx-auto space-y-6">
        
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div>
            <span className="text-[10px] font-bold tracking-widest text-sky-400 uppercase">PROFESSIONAL PORTAL</span>
            <h1 className="text-xl font-bold tracking-tight">{profile.full_name}</h1>
          </div>
          <a
            href={`/p/${profile.slug}`}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-xs font-semibold rounded-xl transition-all"
          >
            View Live Card ↗
          </a>
        </div>

        {/* Add Link Module */}
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-6 space-y-4 shadow-xl">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-300">Add Professional Link</h2>
          <form onSubmit={handleAddLink} className="space-y-3">
            <input
              type="text"
              placeholder="Platform Name (e.g. LinkedIn, Portfolio)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              required
              className="w-full px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-neutral-600"
            />
            <input
              type="text"
              placeholder="URL (e.g. linkedin.com/in/username)"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              required
              className="w-full px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:border-neutral-600"
            />
            <button
              type="submit"
              className="w-full py-3 bg-white text-black font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-neutral-200 transition-all active:scale-[0.98]"
            >
              Add Link
            </button>
          </form>
        </div>

        {/* Links Manager */}
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-6 space-y-4 shadow-xl">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-300">Active Links ({links.length})</h2>
          {links.length === 0 ? (
            <p className="text-xs text-neutral-500 text-center py-4">No links added yet.</p>
          ) : (
            <div className="space-y-2">
              {links.map((link) => (
                <div key={link.id} className="flex items-center justify-between p-3.5 bg-neutral-900/60 border border-neutral-800 rounded-xl">
                  <div>
                    <p className="text-xs font-bold text-white">{link.title}</p>
                    <p className="text-[11px] text-neutral-400 truncate max-w-xs">{link.url}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteLink(link.id)}
                    className="text-neutral-500 hover:text-red-400 text-xs font-semibold px-2 py-1 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}