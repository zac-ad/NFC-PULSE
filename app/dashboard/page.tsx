'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface LinkItem {
  id?: string;
  title: string;
  url: string;
  type: 'link' | 'qr';
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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

  // Links State
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newType, setNewType] = useState<'link' | 'qr'>('link');

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch profile by email
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

    // Fetch links
    const { data: profileLinks } = await supabase
      .from('profile_links')
      .select('*')
      .eq('profile_id', profile.id)
      .order('position', { ascending: true });

    setLinks(profileLinks || []);
    setLoading(false);
  };

  // Save profile updates
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

  // Add new link/QR item
  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileId || !newTitle || !newUrl) return;

    const newLinkItem = {
      profile_id: profileId,
      title: newTitle,
      url: newUrl,
      type: newType,
      position: links.length + 1,
    };

    const { data, error } = await supabase
      .from('profile_links')
      .insert(newLinkItem)
      .select()
      .single();

    if (!error && data) {
      setLinks([...links, data]);
      setNewTitle('');
      setNewUrl('');
    }
  };

  // Delete link item
  const handleDeleteLink = async (id?: string) => {
    if (!id) return;
    const { error } = await supabase.from('profile_links').delete().eq('id', id);
    if (!error) {
      setLinks(links.filter((l) => l.id !== id));
    }
  };

  return (
    <main className="min-h-screen bg-black text-white p-4 md:p-8 flex justify-center">
      <div className="max-w-2xl w-full space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-neutral-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">PULSE Dashboard</h1>
            <p className="text-sm text-neutral-400">Manage your live NFC profile & branding</p>
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
          <form onSubmit={handleFetchProfile} autoComplete="off" className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 space-y-4">
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
            
            {/* Edit Profile Information */}
            <form onSubmit={handleSaveProfile} autoComplete="off" className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-semibold">Profile & Image Customization</h2>

              {/* Public Profile Privacy Switch */}
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

              {/* Image URL Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2 border-b border-neutral-900">
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                    Profile Photo URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/photo-..."
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    autoComplete="off"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                    Background Banner URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/photo-..."
                    value={bannerUrl}
                    onChange={(e) => setBannerUrl(e.target.value)}
                    autoComplete="off"
                    className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2.5 text-white text-xs"
                  />
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

            {/* Link Tree & Payment QR Management */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-semibold">Manage Profile Links & QRs</h2>

              <form onSubmit={handleAddLink} autoComplete="off" className="grid grid-cols-1 md:grid-cols-3 gap-3 border-b border-neutral-800 pb-4">
                <input
                  type="text"
                  placeholder="Title (e.g. GCash QR)"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  autoComplete="off"
                  className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white"
                />
                <input
                  type="text"
                  placeholder="URL / Image Link"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  autoComplete="off"
                  className="bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-white"
                />
                <div className="flex gap-2">
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as 'link' | 'qr')}
                    className="bg-neutral-900 border border-neutral-800 rounded-xl px-2 py-2 text-sm text-white"
                  >
                    <option value="link">URL</option>
                    <option value="qr">QR Modal</option>
                  </select>
                  <button
                    type="submit"
                    className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-medium rounded-xl transition-colors"
                  >
                    Add
                  </button>
                </div>
              </form>

              <div className="space-y-2">
                {links.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between bg-neutral-900 border border-neutral-800 p-3 rounded-xl text-sm"
                  >
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-xs text-neutral-500 truncate max-w-xs">{item.url}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs bg-neutral-800 text-neutral-400 px-2 py-1 rounded">
                        {item.type}
                      </span>
                      <button
                        onClick={() => handleDeleteLink(item.id)}
                        className="text-red-400 hover:text-red-300 text-xs font-semibold"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>
    </main>
  );
}