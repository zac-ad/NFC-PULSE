'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface LinkItem {
  id?: string;
  title: string;
  url: string;
  type: 'link' | 'qr';
}

interface TapEvent {
  id: string;
  created_at: string;
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

export default function DashboardPage() {
  const [loading, setLoading] = useState(false);
  const [sendingMagicLink, setSendingMagicLink] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);

  const [searchEmail, setSearchEmail] = useState('');
  const [userAccount, setUserAccount] = useState<any>(null);
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [activeTab, setActiveTab] = useState<'PROFESSIONAL' | 'PERSONAL'>('PROFESSIONAL');

  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [slug, setSlug] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [isActive, setIsActive] = useState<boolean>(true);

  const [assignedCardCode, setAssignedCardCode] = useState<string | null>(null);
  const [tapCount, setTapCount] = useState<number>(0);
  const [recentTaps, setRecentTaps] = useState<TapEvent[]>([]);

  const [items, setItems] = useState<LinkItem[]>([]);
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [qrTitle, setQrTitle] = useState('');
  const [qrImageUrl, setQrImageUrl] = useState('');

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    document.title = 'PULSE | Dashboard';
    checkSessionAndLoad();
  }, []);

  const checkSessionAndLoad = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.email) {
      loadAccountAndProfiles(session.user.email);
    }
  };

  const loadAccountAndProfiles = async (targetEmail: string) => {
    setLoading(true);
    setMessage(null);

    const cleanEmail = targetEmail.trim().toLowerCase();

    let { data: account } = await supabase
      .from('accounts')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (!account) {
      const { data: newAccount, error: createAccountError } = await supabase
        .from('accounts')
        .upsert({ email: cleanEmail }, { onConflict: 'email' })
        .select()
        .maybeSingle();

      if (createAccountError || !newAccount) {
        setMessage({
          type: 'error',
          text: `Unable to resolve account: ${createAccountError?.message || 'Database error'}`,
        });
        setLoading(false);
        return;
      }
      account = newAccount;
    }

    setUserAccount(account);

    let { data: fetchedProfiles } = await supabase
      .from('profiles')
      .select('*')
      .or(`account_id.eq.${account.id},email.ilike.${cleanEmail}`);

    if (fetchedProfiles && fetchedProfiles.length > 0) {
      const unlinkedProfiles = fetchedProfiles.filter((p) => !p.account_id);
      if (unlinkedProfiles.length > 0) {
        await supabase
          .from('profiles')
          .update({ account_id: account.id })
          .eq('email', cleanEmail);
      }
    } else {
      const { data: defaultProf } = await supabase
        .from('profiles')
        .insert({
          account_id: account.id,
          email: cleanEmail,
          full_name: 'Isaac Salasiban',
          slug: `isaac-${Date.now().toString().slice(-4)}`,
          profile_type: 'PROFESSIONAL',
        })
        .select()
        .single();

      fetchedProfiles = defaultProf ? [defaultProf] : [];
    }

    setProfiles(fetchedProfiles);

    const targetProf = fetchedProfiles.find((p) => p.profile_type === activeTab) || fetchedProfiles[0];
    if (targetProf) {
      selectProfileToEdit(targetProf);
    }

    setLoading(false);
  };

  const selectProfileToEdit = async (prof: ProfileData) => {
    setCurrentProfileId(prof.id);
    setActiveTab(prof.profile_type);
    setFullName(prof.full_name || '');
    setTitle(prof.title || '');
    setCompany(prof.company || '');
    setBio(prof.bio || '');
    setPhone(prof.phone || '');
    setEmail(prof.email || prof.email);
    setSlug(prof.slug || '');
    setAvatarUrl(prof.avatar_url || '');
    setBannerUrl(prof.banner_url || '');
    setIsActive(prof.is_active ?? true);

    document.title = `PULSE | Dashboard - ${prof.full_name || prof.profile_type}`;

    const { data: profileItems } = await supabase
      .from('profile_links')
      .select('*')
      .eq('profile_id', prof.id)
      .order('position', { ascending: true });

    setItems(profileItems || []);

    const { data: cardData } = await supabase
      .from('hardware_cards')
      .select('card_code')
      .eq('profile_id', prof.id)
      .single();

    setAssignedCardCode(cardData?.card_code || null);

    const { data: tapsData, count } = await supabase
      .from('card_taps')
      .select('*', { count: 'exact' })
      .eq('profile_id', prof.id)
      .order('created_at', { ascending: false });

    setTapCount(count || 0);
    setRecentTaps(tapsData?.slice(0, 5) || []);
  };

  const handleTabSwitch = (type: 'PROFESSIONAL' | 'PERSONAL') => {
    setActiveTab(type);
    const existingProf = profiles.find((p) => p.profile_type === type);

    if (existingProf) {
      selectProfileToEdit(existingProf);
    } else if (userAccount) {
      createMissingProfile(type);
    }
  };

  const createMissingProfile = async (type: 'PROFESSIONAL' | 'PERSONAL') => {
    setLoading(true);
    const defaultSlug = `${userAccount.email.split('@')[0]}-${type.toLowerCase()}`;

    const { data: newProf, error } = await supabase
      .from('profiles')
      .insert({
        account_id: userAccount.id,
        email: userAccount.email,
        full_name: fullName || 'Isaac Salasiban',
        slug: defaultSlug,
        profile_type: type,
      })
      .select()
      .single();

    if (!error && newProf) {
      const updatedList = [...profiles, newProf];
      setProfiles(updatedList);
      selectProfileToEdit(newProf);
      setMessage({ type: 'success', text: `Created new ${type} profile!` });
    }
    setLoading(false);
  };

  const handleToggleActiveStatus = async () => {
    if (!currentProfileId) return;
    const newStatus = !isActive;
    setIsActive(newStatus);

    const { error } = await supabase
      .from('profiles')
      .update({ is_active: newStatus })
      .eq('id', currentProfileId);

    if (error) {
      setIsActive(!newStatus);
      setMessage({ type: 'error', text: 'Failed to update privacy status.' });
    } else {
      setMessage({
        type: 'success',
        text: `${activeTab} profile is now ${newStatus ? 'PUBLIC & LIVE' : 'PRIVATE & LOCKED'}.`,
      });
      setProfiles((prev) =>
        prev.map((p) => (p.id === currentProfileId ? { ...p, is_active: newStatus } : p))
      );
    }
  };

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchEmail) return;

    setSendingMagicLink(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithOtp({
      email: searchEmail,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : undefined,
      },
    });

    if (error) {
      await loadAccountAndProfiles(searchEmail);
    } else {
      setMessage({
        type: 'success',
        text: `Magic Login Link sent to ${searchEmail}! Check your inbox.`,
      });
    }
    setSendingMagicLink(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUserAccount(null);
    setCurrentProfileId(null);
    setMessage({ type: 'success', text: 'Signed out successfully.' });
  };

  const handleFileUpload = async (file: File, type: 'avatar' | 'banner' | 'qr') => {
    try {
      if (type === 'avatar') setUploadingAvatar(true);
      if (type === 'banner') setUploadingBanner(true);
      if (type === 'qr') setUploadingQr(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${currentProfileId || 'user'}-${type}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-media')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('profile-media')
        .getPublicUrl(fileName);

      if (type === 'avatar') setAvatarUrl(data.publicUrl);
      if (type === 'banner') setBannerUrl(data.publicUrl);
      if (type === 'qr') setQrImageUrl(data.publicUrl);

      setMessage({ type: 'success', text: 'File uploaded successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Image upload failed.' });
    } finally {
      setUploadingAvatar(false);
      setUploadingBanner(false);
      setUploadingQr(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProfileId) return;

    setSaving(true);
    setMessage(null);

    const { error } = await supabase
      .from('profiles')
      .update({
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
      })
      .eq('id', currentProfileId);

    if (error) {
      setMessage({ type: 'error', text: 'Failed to update profile details.' });
    } else {
      setMessage({ type: 'success', text: `${activeTab} profile updated successfully!` });
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === currentProfileId
            ? { ...p, full_name: fullName, slug, title, company, bio, phone, email, avatar_url: avatarUrl, banner_url: bannerUrl, is_active: isActive }
            : p
        )
      );
    }
    setSaving(false);
  };

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProfileId || !linkTitle || !linkUrl) return;

    const newLinkItem = {
      profile_id: currentProfileId,
      title: linkTitle,
      url: linkUrl,
      type: 'link',
      position: items.length + 1,
    };

    const { data, error } = await supabase
      .from('profile_links')
      .insert(newLinkItem)
      .select()
      .single();

    if (!error && data) {
      setItems([...items, data]);
      setLinkTitle('');
      setLinkUrl('');
    }
  };

  const handleAddQr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProfileId || !qrTitle || !qrImageUrl) return;

    const newQrItem = {
      profile_id: currentProfileId,
      title: qrTitle,
      url: qrImageUrl,
      type: 'qr',
      position: items.length + 1,
    };

    const { data, error } = await supabase
      .from('profile_links')
      .insert(newQrItem)
      .select()
      .single();

    if (!error && data) {
      setItems([...items, data]);
      setQrTitle('');
      setQrImageUrl('');
    }
  };

  const handleDeleteItem = async (id?: string) => {
    if (!id) return;
    const { error } = await supabase.from('profile_links').delete().eq('id', id);
    if (!error) {
      setItems(items.filter((l) => l.id !== id));
    }
  };

  const socialLinks = items.filter((i) => i.type !== 'qr');
  const qrCodes = items.filter((i) => i.type === 'qr');

  return (
    <main className="min-h-screen bg-black text-white p-4 md:p-8 flex justify-center font-sans">
      <div className="max-w-2xl w-full space-y-6">
        
        <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">PULSE Command</h1>
            <p className="text-xs text-amber-400 font-medium tracking-wide">
              {activeTab === 'PROFESSIONAL'
                ? 'Professional Unified Live Share Experience'
                : 'Personal Unified Live Share Experience'}
            </p>
          </div>
          {userAccount && (
            <button
              onClick={handleSignOut}
              className="px-3.5 py-1.5 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-xs font-semibold rounded-lg transition-colors text-neutral-300"
            >
              Sign Out
            </button>
          )}
        </div>

        {message && (
          <div
            className={`p-4 rounded-xl border text-xs leading-relaxed ${
              message.type === 'success'
                ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300'
                : 'bg-red-950/50 border-red-800 text-red-300'
            }`}
          >
            {message.text}
          </div>
        )}

        {!userAccount ? (
          <form onSubmit={handleSendMagicLink} autoComplete="off" className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <h2 className="text-lg font-semibold">Access Account Dashboard</h2>
            <p className="text-xs text-neutral-400">Enter your registered email address to access your Work & Personal profiles.</p>
            <div>
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                Account Email
              </label>
              <input
                type="email"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                placeholder="you@domain.com"
                required
                autoComplete="off"
                className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-neutral-600"
              />
            </div>
            <button
              type="submit"
              disabled={sendingMagicLink || loading}
              className="w-full py-3 bg-white text-black font-semibold rounded-xl hover:bg-neutral-200 transition-colors disabled:opacity-50"
            >
              {sendingMagicLink ? 'Sending Link...' : 'Open Multi-Identity Dashboard'}
            </button>
          </form>
        ) : (
          <div className="space-y-6">

            <div className="grid grid-cols-2 gap-2 bg-neutral-950 p-1.5 border border-neutral-800 rounded-2xl shadow-lg">
              <button
                onClick={() => handleTabSwitch('PROFESSIONAL')}
                className={`py-3 rounded-xl font-bold text-xs tracking-wider transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'PROFESSIONAL'
                    ? 'bg-white text-black shadow-lg'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                💼 Professional Card
              </button>
              <button
                onClick={() => handleTabSwitch('PERSONAL')}
                className={`py-3 rounded-xl font-bold text-xs tracking-wider transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'PERSONAL'
                    ? 'bg-white text-black shadow-lg'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
                }`}
              >
                🌴 Personal Card
              </button>
            </div>

            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 flex items-center justify-between shadow-xl">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
                  <p className="text-sm font-bold text-white">
                    {isActive ? 'Public & Active' : 'Private & Locked'}
                  </p>
                </div>
                <p className="text-xs text-neutral-400">
                  {isActive
                    ? `Tapping this ${activeTab.toLowerCase()} card opens /p/${slug}`
                    : `Tapping this card displays a "Profile Private" locked screen.`}
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleActiveStatus}
                className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all ${
                  isActive
                    ? 'bg-neutral-900 border-neutral-700 text-neutral-300 hover:bg-neutral-800'
                    : 'bg-red-950 border-red-800 text-red-400 hover:bg-red-900'
                }`}
              >
                {isActive ? 'Set Private' : 'Make Public'}
              </button>
            </div>

            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 flex items-center justify-between text-xs shadow-md">
              <div className="space-y-0.5">
                <p className="text-neutral-400 font-medium">Assigned Hardware Pass</p>
                <p className="font-mono font-bold text-white text-sm">
                  {assignedCardCode || 'No card paired yet'}
                </p>
              </div>
              <a
                href={`/activate?code=`}
                className="px-3 py-1.5 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 font-medium rounded-lg"
              >
                {assignedCardCode ? 'Pair Another Pass' : 'Pair Card'}
              </a>
            </div>

            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex justify-between items-center border-b border-neutral-900 pb-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-300">{activeTab} Card Telemetry</h2>
                <span className="text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800 px-2.5 py-1 rounded-full font-semibold">
                  LIVE STREAM
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Physical Taps ({activeTab})</p>
                  <p className="text-3xl font-black text-white mt-1">{tapCount}</p>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Latest Tap Event</p>
                  <p className="text-xs font-semibold text-neutral-200 mt-2">
                    {recentTaps.length > 0
                      ? new Date(recentTaps[0].created_at).toLocaleString()
                      : 'No taps logged yet'}
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} autoComplete="off" className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-neutral-900 pb-3">
                <h2 className="text-base font-bold text-white">{activeTab} Identity Details</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-neutral-900">
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    Avatar Image
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileUpload(e.target.files[0], 'avatar');
                    }}
                    disabled={uploadingAvatar}
                    className="block w-full text-xs text-neutral-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-neutral-800 file:text-white cursor-pointer"
                  />
                  {avatarUrl && (
                    <div className="flex items-center gap-3 pt-1">
                      <img src={avatarUrl} alt="Avatar Preview" className="w-9 h-9 rounded-full object-cover border border-neutral-700" />
                      <span className="text-xs text-emerald-400 font-medium">Avatar Attached</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                    Header Banner
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileUpload(e.target.files[0], 'banner');
                    }}
                    disabled={uploadingBanner}
                    className="block w-full text-xs text-neutral-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-neutral-800 file:text-white cursor-pointer"
                  />
                  {bannerUrl && (
                    <div className="flex items-center gap-3 pt-1">
                      <img src={bannerUrl} alt="Banner Preview" className="w-14 h-8 rounded-lg object-cover border border-neutral-700" />
                      <span className="text-xs text-emerald-400 font-medium">Banner Attached</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    URL Slug (/p/{slug})
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    {activeTab === 'PROFESSIONAL' ? 'Job Title' : 'Nickname / Persona'}
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    {activeTab === 'PROFESSIONAL' ? 'Company' : 'Affiliation / Hobbies'}
                  </label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">
                  Bio / Overview
                </label>
                <textarea
                  value={bio}
                  rows={2}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3.5 bg-white text-black font-bold text-xs uppercase tracking-wider rounded-xl hover:-translate-y-0.5 active:scale-95 transition-all duration-200 shadow-lg disabled:opacity-50"
              >
                {saving ? 'Saving Profile...' : `Save ${activeTab} Card Changes`}
              </button>
            </form>

            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <h2 className="text-base font-bold text-white">{activeTab} Social Links</h2>

              <form onSubmit={handleAddLink} autoComplete="off" className="flex flex-col md:flex-row gap-3 border-b border-neutral-800 pb-4">
                <input
                  type="text"
                  placeholder="Link Title (e.g. LinkedIn)"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white flex-1"
                />
                <input
                  type="text"
                  placeholder="URL (e.g. https://linkedin.com/...)"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white flex-1"
                />
                <button
                  type="submit"
                  className="bg-white hover:bg-neutral-200 text-black text-xs font-bold px-5 py-2 rounded-xl transition-colors"
                >
                  Add Link
                </button>
              </form>

              <div className="space-y-2">
                {socialLinks.length > 0 ? (
                  socialLinks.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-sm"
                    >
                      <div>
                        <p className="font-semibold text-white">{item.title}</p>
                        <p className="text-xs text-neutral-500 truncate max-w-xs">{item.url}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-red-400 hover:text-red-300 text-xs font-semibold px-2 py-1"
                      >
                        Delete
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-neutral-500 text-center py-2">No links added to {activeTab} profile yet.</p>
                )}
              </div>
            </div>

            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <h2 className="text-base font-bold text-white">{activeTab} Payment QRs</h2>

              <form onSubmit={handleAddQr} autoComplete="off" className="space-y-3 border-b border-neutral-800 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Title (e.g. GCash / Maya)"
                    value={qrTitle}
                    onChange={(e) => setQrTitle(e.target.value)}
                    className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileUpload(e.target.files[0], 'qr');
                    }}
                    disabled={uploadingQr}
                    className="block w-full text-xs text-neutral-400 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-neutral-800 file:text-white cursor-pointer"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Or paste QR Image URL directly..."
                    value={qrImageUrl}
                    onChange={(e) => setQrImageUrl(e.target.value)}
                    className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white flex-1"
                  />
                  <button
                    type="submit"
                    disabled={!qrTitle || !qrImageUrl}
                    className="bg-white hover:bg-neutral-200 text-black text-xs font-bold px-5 py-2 rounded-xl transition-colors disabled:opacity-40"
                  >
                    Add QR
                  </button>
                </div>
              </form>

              <div className="space-y-2">
                {qrCodes.length > 0 ? (
                  qrCodes.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <img src={item.url} alt={item.title} className="w-9 h-9 object-cover rounded-lg border border-neutral-700 bg-white" />
                        <div>
                          <p className="font-semibold text-white">{item.title}</p>
                          <p className="text-xs text-neutral-500 truncate max-w-xs">{item.url}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-red-400 hover:text-red-300 text-xs font-semibold px-2 py-1"
                      >
                        Delete
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-neutral-500 text-center py-2">No payment QRs added yet.</p>
                )}
              </div>
            </div>

          </div>
        )}

      </div>
    </main>
  );
}