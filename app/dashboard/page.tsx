'use client';

import { useState } from 'react';
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

export default function DashboardPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);

  const [searchEmail, setSearchEmail] = useState('');
  const [profileId, setProfileId] = useState<string | null>(null);

  // Profile Form State
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

  // Analytics State
  const [tapCount, setTapCount] = useState<number>(0);
  const [recentTaps, setRecentTaps] = useState<TapEvent[]>([]);

  // Items State
  const [items, setItems] = useState<LinkItem[]>([]);

  // Form Inputs for Links & QRs
  const [linkTitle, setLinkTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [qrTitle, setQrTitle] = useState('');
  const [qrImageUrl, setQrImageUrl] = useState('');

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleFileUpload = async (file: File, type: 'avatar' | 'banner' | 'qr') => {
    try {
      if (type === 'avatar') setUploadingAvatar(true);
      if (type === 'banner') setUploadingBanner(true);
      if (type === 'qr') setUploadingQr(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${profileId || 'user'}-${type}-${Date.now()}.${fileExt}`;

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

  const handleFetchProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', searchEmail)
      .single();

    if (error || !profile) {
      setMessage({ type: 'error', text: 'Profile not found with that email address.' });
      setLoading(false);
      return;
    }

    setProfileId(profile.id);
    setFullName(profile.full_name || '');
    setTitle(profile.title || '');
    setCompany(profile.company || '');
    setBio(profile.bio || '');
    setPhone(profile.phone || '');
    setEmail(profile.email || '');
    setSlug(profile.slug || '');
    setAvatarUrl(profile.avatar_url || '');
    setBannerUrl(profile.banner_url || '');
    setIsActive(profile.is_active ?? true);

    // Fetch Links
    const { data: profileItems } = await supabase
      .from('profile_links')
      .select('*')
      .eq('profile_id', profile.id)
      .order('position', { ascending: true });

    setItems(profileItems || []);

    // Fetch Tap Analytics
    const { data: tapsData, count } = await supabase
      .from('card_taps')
      .select('*', { count: 'exact' })
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: false });

    setTapCount(count || 0);
    setRecentTaps(tapsData?.slice(0, 5) || []);

    setLoading(false);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileId) return;

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
      .eq('id', profileId);

    if (error) {
      setMessage({ type: 'error', text: 'Failed to update profile details.' });
    } else {
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    }
    setSaving(false);
  };

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileId || !linkTitle || !linkUrl) return;

    const newLinkItem = {
      profile_id: profileId,
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
    if (!profileId || !qrTitle || !qrImageUrl) return;

    const newQrItem = {
      profile_id: profileId,
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
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">PULSE Dashboard</h1>
            <p className="text-sm text-neutral-400">Manage your live NFC profile & telemetry</p>
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

        {/* Profile Lookup */}
        {!profileId ? (
          <form onSubmit={handleFetchProfile} autoComplete="off" className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 space-y-4 shadow-xl">
            <h2 className="text-lg font-semibold">Access Your Dashboard</h2>
            <div>
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                Enter Profile Email
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
              disabled={loading}
              className="w-full py-3 bg-white text-black font-semibold rounded-xl hover:bg-neutral-200 transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading Profile...' : 'Load Profile'}
            </button>
          </form>
        ) : (
          <div className="space-y-6">
            
            {/* Analytics Telemetry Section */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex justify-between items-center border-b border-neutral-900 pb-3">
                <h2 className="text-lg font-semibold">Tap Analytics</h2>
                <span className="text-xs font-mono bg-emerald-950 text-emerald-400 border border-emerald-800 px-2.5 py-1 rounded-full font-semibold">
                  LIVE TELEMETRY
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                  <p className="text-xs text-neutral-400 font-medium uppercase tracking-wider">Total Physical Taps</p>
                  <p className="text-3xl font-black text-white mt-1">{tapCount}</p>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                  <p className="text-xs text-neutral-400 font-medium uppercase tracking-wider">Latest Tap Event</p>
                  <p className="text-sm font-semibold text-neutral-200 mt-2">
                    {recentTaps.length > 0
                      ? new Date(recentTaps[0].created_at).toLocaleString()
                      : 'No tap events recorded yet'}
                  </p>
                </div>
              </div>

              {recentTaps.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Recent Physical Interactions</p>
                  <div className="space-y-1.5">
                    {recentTaps.map((tap) => (
                      <div key={tap.id} className="flex justify-between items-center bg-neutral-900/50 border border-neutral-800/80 px-3 py-2 rounded-lg text-xs">
                        <span className="text-neutral-300 font-mono">⚡ Hardware NFC Tap</span>
                        <span className="text-neutral-500">{new Date(tap.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Customization Form */}
            <form onSubmit={handleSaveProfile} autoComplete="off" className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <h2 className="text-lg font-semibold">Profile Customization</h2>

              <div className="flex items-center justify-between p-4 bg-neutral-900 border border-neutral-800 rounded-xl mb-4">
                <div>
                  <p className="text-sm font-semibold text-white">Public Profile Status</p>
                  <p className="text-xs text-neutral-400">
                    {isActive ? `Your profile is live at /p/${slug}` : 'Your profile is locked and hidden'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors ${
                    isActive
                      ? 'bg-emerald-950 border border-emerald-800 text-emerald-400'
                      : 'bg-red-950 border border-red-800 text-red-400'
                  }`}
                >
                  {isActive ? 'ACTIVE' : 'PRIVATE'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-neutral-900">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    Profile Photo
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileUpload(e.target.files[0], 'avatar');
                    }}
                    disabled={uploadingAvatar}
                    className="block w-full text-xs text-neutral-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-neutral-800 file:text-white hover:file:bg-neutral-700 cursor-pointer"
                  />
                  {avatarUrl && (
                    <div className="flex items-center gap-3 pt-1">
                      <img src={avatarUrl} alt="Avatar Preview" className="w-10 h-10 rounded-full object-cover border border-neutral-700" />
                      <span className="text-xs text-emerald-400 font-medium">Photo Attached</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    Background Banner
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileUpload(e.target.files[0], 'banner');
                    }}
                    disabled={uploadingBanner}
                    className="block w-full text-xs text-neutral-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-neutral-800 file:text-white hover:file:bg-neutral-700 cursor-pointer"
                  />
                  {bannerUrl && (
                    <div className="flex items-center gap-3 pt-1">
                      <img src={bannerUrl} alt="Banner Preview" className="w-14 h-9 rounded-lg object-cover border border-neutral-700" />
                      <span className="text-xs text-emerald-400 font-medium">Banner Attached</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoComplete="off"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                    Profile Slug
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    autoComplete="off"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    autoComplete="off"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                    Company
                  </label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    autoComplete="off"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="off"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="off"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                  Bio
                </label>
                <textarea
                  value={bio}
                  rows={3}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-white"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-white text-black font-semibold rounded-xl hover:bg-neutral-200 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </form>

            {/* Links & Payment QRs */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <h2 className="text-lg font-semibold">Manage Profile Links</h2>

              <form onSubmit={handleAddLink} autoComplete="off" className="flex flex-col md:flex-row gap-3 border-b border-neutral-800 pb-4">
                <input
                  type="text"
                  placeholder="Title (e.g. Facebook)"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  autoComplete="off"
                  className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white flex-1"
                />
                <input
                  type="text"
                  placeholder="URL (e.g. https://facebook.com/...)"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  autoComplete="off"
                  className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white flex-1"
                />
                <button
                  type="submit"
                  className="bg-white hover:bg-neutral-200 text-black text-sm font-semibold px-5 py-2 rounded-xl transition-colors"
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
                        <p className="font-medium">{item.title}</p>
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
                  <p className="text-xs text-neutral-500 text-center py-2">No links added yet.</p>
                )}
              </div>
            </div>

            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <h2 className="text-lg font-semibold">Manage Payment QR Codes</h2>

              <form onSubmit={handleAddQr} autoComplete="off" className="space-y-3 border-b border-neutral-800 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="QR Title (e.g. GCash QR)"
                    value={qrTitle}
                    onChange={(e) => setQrTitle(e.target.value)}
                    autoComplete="off"
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
                    autoComplete="off"
                    className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white flex-1"
                  />
                  <button
                    type="submit"
                    disabled={!qrTitle || !qrImageUrl}
                    className="bg-white hover:bg-neutral-200 text-black text-sm font-semibold px-5 py-2 rounded-xl transition-colors disabled:opacity-40"
                  >
                    Add QR Code
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
                        <img src={item.url} alt={item.title} className="w-10 h-10 object-cover rounded-lg border border-neutral-700 bg-white" />
                        <div>
                          <p className="font-medium">{item.title}</p>
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
                  <p className="text-xs text-neutral-500 text-center py-2">No QR codes added yet.</p>
                )}
              </div>
            </div>

          </div>
        )}

      </div>
    </main>
  );
}