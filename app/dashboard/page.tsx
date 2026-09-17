'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { createSupabaseBrowserClient } from '@/lib/supabaseBrowser';
import Link from 'next/link';
import { parseDevice } from '@/lib/parseDevice';

// Module-level singleton — created once, reused across renders, so the
// auth listener set up below doesn't get torn down and recreated on
// every re-render of the dashboard.
const supabaseAuth = createSupabaseBrowserClient();

interface LinkItem {
  id?: string;
  title: string;
  url: string;
  type: 'link' | 'qr';
}

interface TapEvent {
  id: string;
  created_at: string;
  city?: string;
  country?: string;
  user_agent?: string;
}

interface ProfileData {
  id: string;
  account_id: string;
  full_name: string;
  title: string;
  company: string;
  bio: string;
  phone: string;
  email: string;
  slug: string;
  avatar_url: string;
  banner_url: string;
  is_active: boolean;
  profile_type: 'PROFESSIONAL' | 'PERSONAL';
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-mono text-white/25 tracking-widest uppercase">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-3 text-[14px] text-white placeholder:text-white/20 focus:outline-none focus:border-white/20";

// ── Helper: get session token for API calls ───────────────────
async function getToken(): Promise<string | null> {
  const { data: { session } } = await supabaseAuth.auth.getSession();
  return session?.access_token || null;
}

async function apiCall(url: string, method: string, body?: object) {
  const token = await getToken();
  if (!token) return { error: 'Not authenticated' };
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const presetParam = (searchParams.get('preset')?.toUpperCase() as 'PROFESSIONAL' | 'PERSONAL') || 'PROFESSIONAL';

  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingQr, setUploadingQr]         = useState(false);

  const [userAccount, setUserAccount]     = useState<{id: string; email: string} | null>(null);
  const [profiles, setProfiles]           = useState<ProfileData[]>([]);
  const [activeTab, setActiveTab]         = useState<'PROFESSIONAL' | 'PERSONAL'>(presetParam);

  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [fullName, setFullName]   = useState('');
  const [title, setTitle]         = useState('');
  const [company, setCompany]     = useState('');
  const [bio, setBio]             = useState('');
  const [phone, setPhone]         = useState('');
  const [email, setEmail]         = useState('');
  const [slug, setSlug]           = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [isActive, setIsActive]   = useState(true);

  const [assignedCardCode, setAssignedCardCode] = useState<string | null>(null);
  const [tapCount, setTapCount]   = useState(0);
  const [recentTaps, setRecentTaps] = useState<TapEvent[]>([]);

  const [items, setItems]         = useState<LinkItem[]>([]);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl]     = useState('');
  const [qrTitle, setQrTitle]     = useState('');
  const [qrImageUrl, setQrImageUrl] = useState('');

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Load profiles via server API ─────────────────────────────
  const selectProfileToEdit = async (prof: ProfileData) => {
    setCurrentProfileId(prof.id);
    setActiveTab(prof.profile_type);
    setFullName(prof.full_name || '');
    setTitle(prof.title || '');
    setCompany(prof.company || '');
    setBio(prof.bio || '');
    setPhone(prof.phone || '');
    setEmail(prof.email || '');
    setSlug(prof.slug || '');
    setAvatarUrl(prof.avatar_url || '');
    setBannerUrl(prof.banner_url || '');
    setIsActive(prof.is_active ?? true);

    // Links — direct read, public data, RLS allows it
    const { data: profileItems } = await supabase
      .from('profile_links')
      .select('*')
      .eq('profile_id', prof.id)
      .order('position', { ascending: true });
    setItems(profileItems || []);

    // Card
    const { data: cardData } = await supabase
      .from('hardware_cards')
      .select('card_code, tap_count')
      .eq('profile_id', prof.id)
      .maybeSingle();
    setAssignedCardCode(cardData?.card_code || null);
    setTapCount(cardData?.tap_count || 0);

    // Recent taps
    const { data: tapsData } = await supabase
      .from('card_taps')
      .select('id, created_at, city, country, user_agent')
      .eq('profile_id', prof.id)
      .order('created_at', { ascending: false })
      .limit(5);
    setRecentTaps(tapsData || []);
  };

  const loadProfiles = useCallback(async () => {
    const token = await getToken();
    if (!token) { setLoading(false); return; }

    const res = await fetch('/api/profile', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const json = await res.json();

    if (json.account) setUserAccount(json.account);

    const fetchedProfiles: ProfileData[] = json.profiles || [];
    setProfiles(fetchedProfiles);

    const target = fetchedProfiles.find(p => p.profile_type === presetParam) || fetchedProfiles[0];
    if (target) await selectProfileToEdit(target);

    setLoading(false);
  }, [presetParam]);

  useEffect(() => {
    document.title = 'PULSE | Dashboard';

    supabaseAuth.auth.getSession().then(({ data: { session } }) => {
      if (session) { loadProfiles(); }
      else { setLoading(false); }
    });

    const { data: { subscription } } = supabaseAuth.auth.onAuthStateChange((_event, session) => {
      if (session) { loadProfiles(); }
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTabSwitch = async (type: 'PROFESSIONAL' | 'PERSONAL') => {
    setActiveTab(type);
    const existing = profiles.find(p => p.profile_type === type);
    if (existing) { await selectProfileToEdit(existing); }
  };

  // ── Private/Public toggle — via server API ───────────────────
  const handleToggleActive = async () => {
    if (!currentProfileId) return;
    const next = !isActive;
    setIsActive(next); // optimistic
    const result = await apiCall('/api/profile', 'PATCH', {
      profileId: currentProfileId,
      is_active: next,
    });
    if (result.error) {
      setIsActive(!next); // revert
      setMessage({ type: 'error', text: `Failed: ${result.error}` });
    } else {
      setMessage({ type: 'success', text: `Profile is now ${next ? 'public' : 'private'}.` });
      setProfiles(prev => prev.map(p =>
        p.id === currentProfileId ? { ...p, is_active: next } : p
      ));
    }
  };

  const handleSignOut = async () => {
    await supabaseAuth.auth.signOut();
    setUserAccount(null);
    setCurrentProfileId(null);
    setProfiles([]);
  };

  // ── File upload ───────────────────────────────────────────────
  const handleFileUpload = async (file: File, type: 'avatar' | 'banner' | 'qr') => {
    if (type === 'avatar') setUploadingAvatar(true);
    if (type === 'banner') setUploadingBanner(true);
    if (type === 'qr') setUploadingQr(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${currentProfileId || 'user'}-${type}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('profile-media').upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('profile-media').getPublicUrl(fileName);
      if (type === 'avatar') setAvatarUrl(data.publicUrl);
      if (type === 'banner') setBannerUrl(data.publicUrl);
      if (type === 'qr') setQrImageUrl(data.publicUrl);
      setMessage({ type: 'success', text: 'File uploaded.' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed.';
      setMessage({ type: 'error', text: msg });
    } finally {
      setUploadingAvatar(false);
      setUploadingBanner(false);
      setUploadingQr(false);
    }
  };

  // ── Save identity — via server API ────────────────────────────
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProfileId) return;
    setSaving(true);
    setMessage(null);
    const result = await apiCall('/api/profile', 'PATCH', {
      profileId: currentProfileId,
      full_name: fullName,
      title,
      company,
      bio,
      phone,
      email,
      slug,
      avatar_url: avatarUrl,
      banner_url: bannerUrl,
      is_active: isActive,
    });
    if (result.error) {
      setMessage({ type: 'error', text: `Save failed: ${result.error}` });
    } else {
      setMessage({ type: 'success', text: 'Profile saved. Live card updated.' });
      setProfiles(prev => prev.map(p =>
        p.id === currentProfileId
          ? { ...p, full_name: fullName, slug, title, company, bio, phone, email, avatar_url: avatarUrl, banner_url: bannerUrl, is_active: isActive }
          : p
      ));
    }
    setSaving(false);
  };

  // ── Add social link — via server API ─────────────────────────
  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProfileId || !linkTitle || !linkUrl) return;
    const result = await apiCall('/api/links', 'POST', {
      profile_id: currentProfileId,
      title: linkTitle,
      url: linkUrl,
      type: 'link',
      position: items.length + 1,
    });
    if (result.error) {
      setMessage({ type: 'error', text: `Failed to add link: ${result.error}` });
    } else if (result.link) {
      setItems(prev => [...prev, result.link]);
      setLinkTitle(''); setLinkUrl('');
      setMessage({ type: 'success', text: 'Link added.' });
    }
  };

  // ── Add QR — via server API ───────────────────────────────────
  const handleAddQr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProfileId || !qrTitle || !qrImageUrl) return;
    const result = await apiCall('/api/links', 'POST', {
      profile_id: currentProfileId,
      title: qrTitle,
      url: qrImageUrl,
      type: 'qr',
      position: items.length + 1,
    });
    if (result.error) {
      setMessage({ type: 'error', text: `Failed to add QR: ${result.error}` });
    } else if (result.link) {
      setItems(prev => [...prev, result.link]);
      setQrTitle(''); setQrImageUrl('');
      setMessage({ type: 'success', text: 'QR code added.' });
    }
  };

  // ── Delete link — via server API ──────────────────────────────
  const handleDeleteItem = async (id?: string) => {
    if (!id || !currentProfileId) return;
    const result = await apiCall('/api/links', 'DELETE', {
      linkId: id,
      profileId: currentProfileId,
    });
    if (!result.error) setItems(prev => prev.filter(l => l.id !== id));
  };

  const socialLinks = items.filter(i => i.type !== 'qr');
  const qrCodes     = items.filter(i => i.type === 'qr');

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <p className="text-[12px] font-mono text-white/25 tracking-widest">Loading your identity...</p>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-[#f2f0eb] font-sans pb-20">
      <div className="max-w-2xl mx-auto px-5 pt-10 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between pb-6 border-b border-white/[0.06]">
          <div>
            <Link href="/" className="flex items-center gap-2 font-serif text-sm text-white/35 hover:text-white transition-colors mb-3">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M2 12h4l2-6 4 12 3-8 2 2h5" />
              </svg>
              PULSE
            </Link>
            <h1 className="font-serif text-2xl text-white">Your identity.</h1>
            {userAccount && (
              <p className="text-[12px] text-white/25 mt-1 font-mono">{userAccount.email}</p>
            )}
          </div>
          {userAccount && (
            <button onClick={handleSignOut} className="text-[12px] text-white/25 hover:text-white/50 transition-colors mt-1">
              Sign out
            </button>
          )}
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

        {!userAccount ? (
          <div className="py-16 text-center space-y-4">
            <p className="font-serif text-xl text-white">You&rsquo;re not signed in.</p>
            <p className="text-[14px] text-white/40">Use your magic link or sign in through your portal.</p>
            <div className="flex items-center justify-center gap-4 pt-4">
              <Link href="/portal/professional/login"
                className="text-[13px] px-5 py-2.5 rounded-full bg-white text-black font-medium hover:bg-[#f2f0eb] transition-colors">
                Professional portal
              </Link>
              <Link href="/portal/personal/login"
                className="text-[13px] px-5 py-2.5 rounded-full bg-[#f2f0eb] text-black font-medium hover:bg-white transition-colors">
                Personal portal
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-5">

            {/* Tab switcher */}
            <div className="grid grid-cols-2 gap-2 bg-[#141414] p-1.5 border border-white/[0.06] rounded-2xl">
              {(['PROFESSIONAL', 'PERSONAL'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => handleTabSwitch(type)}
                  className={`py-3 rounded-xl text-[13px] font-medium transition-all ${
                    activeTab === type ? 'bg-white text-black' : 'text-white/35 hover:text-white'
                  }`}
                >
                  {type === 'PROFESSIONAL' ? 'Professional' : 'Personal'}
                </button>
              ))}
            </div>

            {/* Privacy toggle */}
            <div className="bg-[#141414] border border-white/[0.06] rounded-2xl p-5 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-white/60 animate-pulse' : 'bg-red-500/60'}`} />
                  <p className="text-[14px] text-white font-medium">{isActive ? 'Public' : 'Private'}</p>
                </div>
                <p className="text-[12px] text-white/30">
                  {isActive ? `Live at /p/${slug}` : 'Card shows a locked screen when tapped'}
                </p>
              </div>
              <button
                onClick={handleToggleActive}
                className={`px-4 py-2 rounded-xl text-[12px] font-medium border transition-colors ${
                  isActive
                    ? 'bg-white/[0.04] border-white/10 text-white/50 hover:text-white'
                    : 'bg-white text-black border-transparent'
                }`}
              >
                {isActive ? 'Set private' : 'Make public'}
              </button>
            </div>

            {/* Card + telemetry */}
            <div className="bg-[#141414] border border-white/[0.06] rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-mono text-white/25 tracking-widest mb-1">HARDWARE CARD</p>
                  <p className="font-mono text-sm text-white">{assignedCardCode || 'No card paired'}</p>
                </div>
                <Link href="/activate"
                  className="text-[12px] text-white/35 hover:text-white transition-colors border-b border-white/15 pb-px">
                  {assignedCardCode ? 'Pair another' : 'Pair card'}
                </Link>
              </div>

              <div className="border-t border-white/[0.06] pt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-mono text-white/25 tracking-widest mb-1">TOTAL TAPS</p>
                  <p className="font-serif text-3xl text-white">{tapCount}</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono text-white/25 tracking-widest mb-2">RECENT TAPS</p>
                  {recentTaps.length > 0 ? (
                    <div className="space-y-1">
                      {recentTaps.map(tap => (
                        <div key={tap.id} className="flex items-center justify-between gap-2">
                          <div>
                            <span className="text-[11px] text-white/40 block">
                              {tap.city && tap.country ? `${tap.city}, ${tap.country}` : 'Unknown location'}
                            </span>
                            <span className="text-[10px] text-white/20 font-mono">
                              {parseDevice(tap.user_agent)}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-white/20 whitespace-nowrap">
                            {new Date(tap.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[12px] text-white/20">No taps yet</p>
                  )}
                </div>
              </div>
            </div>

            {/* Identity details */}
            <form onSubmit={handleSaveProfile} className="bg-[#141414] border border-white/[0.06] rounded-2xl p-5 space-y-5">
              <h2 className="font-serif text-lg text-white">Identity details</h2>

              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-white/[0.06]">
                <Field label="Avatar">
                  <input type="file" accept="image/*"
                    disabled={uploadingAvatar}
                    onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'avatar')}
                    className="block w-full text-[12px] text-white/35 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-medium file:bg-white/10 file:text-white/70 cursor-pointer"
                  />
                  {avatarUrl && <img src={avatarUrl} alt="Avatar" className="w-8 h-8 rounded-full object-cover border border-white/10 mt-1" />}
                </Field>
                <Field label="Banner">
                  <input type="file" accept="image/*"
                    disabled={uploadingBanner}
                    onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'banner')}
                    className="block w-full text-[12px] text-white/35 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-medium file:bg-white/10 file:text-white/70 cursor-pointer"
                  />
                  {bannerUrl && <img src={bannerUrl} alt="Banner" className="w-14 h-8 rounded-lg object-cover border border-white/10 mt-1" />}
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Display name">
                  <input value={fullName} onChange={e => setFullName(e.target.value)} className={inputCls} />
                </Field>
                <Field label={`URL slug (/p/${slug || '...'})`}>
                  <input value={slug} onChange={e => setSlug(e.target.value)} className={inputCls} />
                </Field>
                <Field label={activeTab === 'PROFESSIONAL' ? 'Job title' : 'Persona'}>
                  <input value={title} onChange={e => setTitle(e.target.value)} className={inputCls} />
                </Field>
                <Field label={activeTab === 'PROFESSIONAL' ? 'Company' : 'Affiliation'}>
                  <input value={company} onChange={e => setCompany(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Phone">
                  <input value={phone} onChange={e => setPhone(e.target.value)} className={inputCls} />
                </Field>
                <Field label="Email">
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputCls} />
                </Field>
              </div>

              <Field label="Bio">
                <textarea value={bio} rows={3} onChange={e => setBio(e.target.value)} className={inputCls} />
              </Field>

              <button type="submit" disabled={saving}
                className="w-full py-3.5 rounded-xl bg-white text-black text-[13px] font-semibold hover:bg-[#f2f0eb] transition-colors disabled:opacity-40">
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </form>

            {/* Social links */}
            <div className="bg-[#141414] border border-white/[0.06] rounded-2xl p-5 space-y-4">
              <h2 className="font-serif text-lg text-white">Social links</h2>
              <form onSubmit={handleAddLink} className="flex flex-col sm:flex-row gap-3">
                <input
                  placeholder="Title (e.g. LinkedIn)"
                  value={linkTitle} onChange={e => setLinkTitle(e.target.value)}
                  className="flex-1 bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-2.5 text-[13px] text-white placeholder:text-white/20 focus:outline-none focus:border-white/20"
                />
                <input
                  placeholder="URL"
                  value={linkUrl} onChange={e => setLinkUrl(e.target.value)}
                  className="flex-1 bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-2.5 text-[13px] text-white placeholder:text-white/20 focus:outline-none focus:border-white/20"
                />
                <button type="submit"
                  className="px-5 py-2.5 rounded-xl bg-white text-black text-[13px] font-medium hover:bg-[#f2f0eb] transition-colors whitespace-nowrap">
                  Add
                </button>
              </form>

              <div className="space-y-2">
                {socialLinks.length > 0 ? socialLinks.map(item => (
                  <div key={item.id} className="flex items-center justify-between bg-[#1a1a1a] border border-white/[0.06] rounded-xl px-4 py-3">
                    <div>
                      <p className="text-[13px] text-white">{item.title}</p>
                      <p className="text-[11px] text-white/30 truncate max-w-xs">{item.url}</p>
                    </div>
                    <button onClick={() => handleDeleteItem(item.id)}
                      aria-label={`Remove link: ${item.title}`}
                      className="text-[12px] text-white/25 hover:text-red-400 transition-colors pl-4">
                      Remove
                    </button>
                  </div>
                )) : (
                  <p className="text-[12px] text-white/20 text-center py-3">No links yet.</p>
                )}
              </div>
            </div>

            {/* Payment QRs */}
            <div className="bg-[#141414] border border-white/[0.06] rounded-2xl p-5 space-y-4">
              <h2 className="font-serif text-lg text-white">Payment QR codes</h2>
              <form onSubmit={handleAddQr} className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    placeholder="Title (e.g. GCash)"
                    value={qrTitle} onChange={e => setQrTitle(e.target.value)}
                    className="flex-1 bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-2.5 text-[13px] text-white placeholder:text-white/20 focus:outline-none focus:border-white/20"
                  />
                  <input type="file" accept="image/*"
                    disabled={uploadingQr}
                    onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], 'qr')}
                    className="flex-1 text-[12px] text-white/35 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-medium file:bg-white/10 file:text-white/70 cursor-pointer"
                  />
                </div>
                <div className="flex gap-3">
                  <input
                    placeholder="Or paste QR image URL directly"
                    value={qrImageUrl} onChange={e => setQrImageUrl(e.target.value)}
                    className="flex-1 bg-[#1a1a1a] border border-white/[0.08] rounded-xl px-4 py-2.5 text-[13px] text-white placeholder:text-white/20 focus:outline-none focus:border-white/20"
                  />
                  <button type="submit" disabled={!qrTitle || !qrImageUrl}
                    className="px-5 py-2.5 rounded-xl bg-white text-black text-[13px] font-medium hover:bg-[#f2f0eb] transition-colors disabled:opacity-40 whitespace-nowrap">
                    Add QR
                  </button>
                </div>
              </form>

              <div className="space-y-2">
                {qrCodes.length > 0 ? qrCodes.map(item => (
                  <div key={item.id} className="flex items-center justify-between bg-[#1a1a1a] border border-white/[0.06] rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img src={item.url} alt={item.title} className="w-9 h-9 rounded-lg object-cover bg-white border border-white/10" />
                      <p className="text-[13px] text-white">{item.title}</p>
                    </div>
                    <button onClick={() => handleDeleteItem(item.id)}
                      aria-label={`Remove QR code: ${item.title}`}
                      className="text-[12px] text-white/25 hover:text-red-400 transition-colors pl-4">
                      Remove
                    </button>
                  </div>
                )) : (
                  <p className="text-[12px] text-white/20 text-center py-3">No QR codes yet.</p>
                )}
              </div>
            </div>

            {slug && (
              <div className="text-center pt-2 pb-4">
                <a href={`/p/${slug}`} target="_blank" rel="noreferrer"
                  className="text-[13px] text-white/35 hover:text-white transition-colors border-b border-white/15 pb-px">
                  View your live card →
                </a>
              </div>
            )}

          </div>
        )}
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <p className="text-[12px] font-mono text-white/25 tracking-widest">Loading...</p>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
