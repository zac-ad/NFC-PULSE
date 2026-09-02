'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function ProfilePage({ params }: PageProps) {
  const resolvedParams = use(params);
  const targetSlug = resolvedParams.slug?.trim();

  const [profile, setProfile] = useState<any>(null);
  const [links, setLinks] = useState<any[]>([]);
  const [qrLinks, setQrLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedQrId, setExpandedQrId] = useState<string | null>(null);

  useEffect(() => {
    if (!targetSlug) return;

    async function loadProfileData() {
      setLoading(true);
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .ilike('slug', targetSlug)
        .single();

      if (prof) {
        setProfile(prof);

        const { data: allLinks } = await supabase
          .from('profile_links')
          .select('*')
          .eq('profile_id', prof.id)
          .order('position', { ascending: true });

        if (allLinks) {
          setLinks(allLinks.filter((l) => l.type !== 'qr'));
          setQrLinks(allLinks.filter((l) => l.type === 'qr'));
        }
      }
      setLoading(false);
    }

    loadProfileData();
  }, [targetSlug]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#edf2f7] flex items-center justify-center p-4">
        <p className="text-slate-500 font-medium text-sm animate-pulse">Loading profile...</p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-[#edf2f7] flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-slate-600 font-semibold mb-2">Profile not found.</p>
          <Link href="/" className="text-xs text-slate-500 underline">Return Home</Link>
        </div>
      </main>
    );
  }

  if (profile.is_active === false) {
    return (
      <main className="min-h-screen bg-[#edf2f7] flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white rounded-3xl p-8 text-center shadow-lg border border-slate-100">
          <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
            🔒
          </div>
          <h1 className="text-lg font-bold text-slate-800 mb-2">Profile Private</h1>
          <p className="text-slate-500 text-xs leading-relaxed mb-6">
            This digital card has been set to private by the owner.
          </p>
          <Link
            href="/"
            className="inline-block w-full py-3 bg-slate-900 text-xs text-white rounded-2xl font-medium shadow-sm hover:bg-slate-800 transition-colors"
          >
            Return Home
          </Link>
        </div>
      </main>
    );
  }

  const vcardData = `BEGIN:VCARD%0AVERSION:3.0%0AN:${encodeURIComponent(profile.full_name || '')}%0AORG:${encodeURIComponent(profile.company || '')}%0ATITLE:${encodeURIComponent(profile.title || '')}%0ATEL:${encodeURIComponent(profile.phone || '')}%0AEMAIL:${encodeURIComponent(profile.email || '')}%0AEND:VCARD`;

  return (
    <main className="min-h-screen bg-[#edf2f7] text-slate-900 flex justify-center py-6 px-4 font-sans">
      <div className="w-full max-w-sm space-y-5">
        
        {/* Top Banner & Avatar Header */}
        <div className="relative">
          <div className="w-full h-44 bg-[#181a1d] rounded-3xl overflow-hidden shadow-sm">
            {profile.banner_url ? (
              <img
                src={profile.banner_url}
                alt="Banner"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-600 font-bold text-3xl opacity-30">
                {profile.company || 'PULSE'}
              </div>
            )}
          </div>

          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
            <div className="w-28 h-28 rounded-full border-4 border-[#edf2f7] bg-slate-800 overflow-hidden shadow-md flex items-center justify-center text-white text-3xl font-bold">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{profile.full_name?.charAt(0) || 'P'}</span>
              )}
            </div>
          </div>
        </div>

        {/* Profile Info & Action Icons */}
        <div className="pt-12 text-center space-y-4">
          <div className="flex items-center justify-center gap-1.5">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {profile.full_name}
            </h1>
            <svg className="w-5 h-5 text-sky-500 fill-current" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          </div>

          {/* Quick Contact Buttons */}
          <div className="flex items-center justify-center gap-3">
            <a
              href={`tel:${profile.phone || ''}`}
              className="w-11 h-11 bg-[#1c1f23] text-white rounded-full flex items-center justify-center hover:bg-slate-800 transition-colors shadow-sm"
              title="Call Phone"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
              </svg>
            </a>
            <a
              href={`sms:${profile.phone || ''}`}
              className="w-11 h-11 bg-[#1c1f23] text-white rounded-full flex items-center justify-center hover:bg-slate-800 transition-colors shadow-sm"
              title="Send Message"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" />
              </svg>
            </a>
            <a
              href={`mailto:${profile.email || ''}`}
              className="w-11 h-11 bg-[#1c1f23] text-white rounded-full flex items-center justify-center hover:bg-slate-800 transition-colors shadow-sm"
              title="Send Email"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
              </svg>
            </a>
          </div>

          {/* Save Contact Bar */}
          <div className="flex items-center gap-2 pt-1">
            <a
              href={`data:text/vcard;charset=utf-8,${vcardData}`}
              download={`${profile.slug}.vcf`}
              className="flex-1 py-3.5 bg-[#1c1f23] text-white font-semibold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-sm hover:bg-slate-800 transition-colors"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
              </svg>
              Save to Contacts
            </a>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: profile.full_name, url: window.location.href });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Link copied to clipboard!');
                }
              }}
              className="w-12 h-12 bg-[#1c1f23] text-white rounded-2xl flex items-center justify-center hover:bg-slate-800 transition-colors shadow-sm"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Links Section */}
        <div className="space-y-3 pt-2">
          <div className="inline-block px-3 py-1 bg-[#dbe4ed] text-slate-600 text-xs font-semibold rounded-lg">
            Links
          </div>

          <div className="space-y-2.5">
            {links.length > 0 ? (
              links.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-4 bg-[#e2eaf2] hover:bg-[#d8e3ef] text-slate-800 rounded-2xl transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-slate-700 font-bold text-xs">
                      {link.title.charAt(0)}
                    </span>
                    <span className="text-sm font-semibold text-slate-800">
                      {link.title}
                    </span>
                  </div>
                  <svg className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              ))
            ) : (
              <div className="p-4 bg-[#e2eaf2] rounded-2xl text-center text-slate-400 text-xs">
                No social links added yet.
              </div>
            )}
          </div>
        </div>

        {/* QR Codes Section */}
        <div className="space-y-3 pt-2">
          <div className="inline-block px-3 py-1 bg-[#dbe4ed] text-slate-600 text-xs font-semibold rounded-lg">
            QR Codes
          </div>

          <div className="space-y-2.5">
            {qrLinks.length > 0 ? (
              qrLinks.map((qr) => {
                const isExpanded = expandedQrId === qr.id;
                return (
                  <div key={qr.id} className="bg-[#e2eaf2] rounded-2xl overflow-hidden transition-all">
                    <button
                      type="button"
                      onClick={() => setExpandedQrId(isExpanded ? null : qr.id)}
                      className="w-full flex items-center justify-between p-4 text-left font-semibold text-slate-800 text-sm"
                    >
                      <span>{qr.title}</span>
                      <svg className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-5 text-center flex flex-col items-center">
                        <div className="bg-white p-3 rounded-2xl border border-slate-200 inline-block mb-2">
                          <img src={qr.url} alt={qr.title} className="w-48 h-48 object-contain rounded-lg" />
                        </div>
                        <p className="text-xs text-slate-500">Scan code to send payment</p>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="bg-[#e2eaf2] rounded-2xl overflow-hidden transition-all">
                <button
                  type="button"
                  onClick={() => setExpandedQrId(expandedQrId === 'default' ? null : 'default')}
                  className="w-full flex items-center justify-between p-4 text-left font-semibold text-slate-800 text-sm"
                >
                  <span>GCASH QR</span>
                  <svg className={`w-4 h-4 text-slate-500 transition-transform ${expandedQrId === 'default' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {expandedQrId === 'default' && (
                  <div className="px-4 pb-5 text-center flex flex-col items-center">
                    <div className="bg-white p-3 rounded-2xl border border-slate-200 inline-block mb-2">
                      <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=GCash-${profile.phone || 'PULSE'}`} alt="GCash QR" className="w-48 h-48 object-contain rounded-lg" />
                    </div>
                    <p className="text-xs text-slate-500">Scan code to pay via GCash</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6 pb-4 text-center space-y-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-white/80 hover:bg-white text-slate-600 text-xs font-semibold rounded-full border border-slate-200/60 transition-all"
          >
            Get Your Own Card ›
          </Link>
          <p className="text-[11px] text-slate-400 font-medium tracking-wide">
            Powered by <span className="font-bold text-slate-500">P U L S E</span>
          </p>
        </div>

      </div>
    </main>
  );
}