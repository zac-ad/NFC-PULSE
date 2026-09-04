'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface LinkItem {
  id: string;
  title: string;
  url: string;
  type: 'link' | 'qr';
}

interface ProfileData {
  id: string;
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

const resolveDeepLink = (urlStr: string) => {
  if (!urlStr) return '#';
  const cleanUrl = urlStr.trim();

  if (cleanUrl.includes('instagram.com/')) {
    const handle = cleanUrl.split('instagram.com/')[1]?.split('/')[0]?.replace('@', '');
    if (handle) return `instagram://user?username=${handle}`;
  }

  if (cleanUrl.includes('linkedin.com/in/')) {
    const handle = cleanUrl.split('linkedin.com/in/')[1]?.split('/')[0];
    if (handle) return `linkedin://profile/${handle}`;
  }

  if (cleanUrl.includes('wa.me/') || cleanUrl.includes('api.whatsapp.com/')) {
    const number = cleanUrl.split('/').pop()?.replace(/[^0-9]/g, '');
    if (number) return `whatsapp://send?phone=${number}`;
  }

  if (cleanUrl.includes('twitter.com/') || cleanUrl.includes('x.com/')) {
    const handle = cleanUrl.split(/\/(twitter|x)\.com\//)[2]?.split('/')[0];
    if (handle) return `twitter://user?screen_name=${handle}`;
  }

  if (cleanUrl.includes('facebook.com/')) {
    return `fb://facewebmodal/f?href=${encodeURIComponent(cleanUrl)}`;
  }

  return cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`;
};

export default function PublicProfilePage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openQrId, setOpenQrId] = useState<string | null>(null);

  useEffect(() => {
    if (slug) fetchProfileData();
  }, [slug]);

  const fetchProfileData = async () => {
    setLoading(true);
    const { data: profData } = await supabase
      .from('profiles')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (profData) {
      setProfile(profData);
      document.title = `PULSE | ${profData.full_name}`;

      const { data: linkData } = await supabase
        .from('profile_links')
        .select('*')
        .eq('profile_id', profData.id)
        .order('position', { ascending: true });

      setLinks(linkData || []);
    }
    setLoading(false);
  };

  const generateVCard = () => {
    if (!profile) return;
    const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${profile.full_name}
TITLE:${profile.title || ''}
ORG:${profile.company || ''}
TEL:${profile.phone || ''}
EMAIL:${profile.email || ''}
NOTE:${profile.bio || ''}
END:VCARD`;

    const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${profile.slug}.vcf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-neutral-500 text-xs font-mono">
        Loading identity...
      </div>
    );
  }

  if (!profile || !profile.is_active) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-neutral-950 border border-neutral-800 rounded-3xl p-8 text-center space-y-3">
          <div className="w-12 h-12 bg-neutral-900 border border-neutral-800 text-red-400 rounded-2xl flex items-center justify-center mx-auto text-xl">
            🔒
          </div>
          <h1 className="text-lg font-bold">Profile Locked</h1>
          <p className="text-xs text-neutral-400">
            This card is currently set to private.
          </p>
        </div>
      </div>
    );
  }

  const socialLinks = links.filter((l) => l.type !== 'qr');
  const qrCodes = links.filter((l) => l.type === 'qr');

  return (
    <main className="min-h-screen bg-black text-white p-4 flex justify-center font-sans selection:bg-neutral-800">
      <div className="max-w-md w-full space-y-5 my-auto py-4">

        {/* Banner & Floating Avatar Card */}
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-3xl overflow-hidden shadow-2xl relative text-center">
          <div className="h-32 bg-neutral-900 w-full relative">
            {profile.banner_url && (
              <img src={profile.banner_url} alt="Banner" className="w-full h-full object-cover" />
            )}
          </div>

          <div className="px-6 pb-6 pt-0 relative flex flex-col items-center">
            {/* Centered Avatar */}
            <div className="-mt-12 mb-3 w-24 h-24 rounded-full border-4 border-neutral-950 overflow-hidden bg-neutral-900 shadow-xl">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-neutral-600">
                  {profile.full_name[0]}
                </div>
              )}
            </div>

            {/* Verified Name & Badge */}
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1.5">
                <h1 className="text-xl font-bold text-white tracking-tight">{profile.full_name}</h1>
                <span className="w-4 h-4 bg-sky-500 text-black text-[10px] font-bold rounded-full flex items-center justify-center">
                  ✓
                </span>
              </div>
              {(profile.title || profile.company) && (
                <p className="text-xs text-neutral-400 font-medium">
                  {profile.title} {profile.company ? `at ${profile.company}` : ''}
                </p>
              )}
              {profile.bio && <p className="text-xs text-neutral-400 pt-1 leading-relaxed max-w-xs mx-auto">{profile.bio}</p>}
            </div>

            {/* Quick Action Circle Buttons (Call, SMS, Email) */}
            <div className="flex items-center justify-center gap-4 mt-5">
              {profile.phone && (
                <a
                  href={`tel:${profile.phone}`}
                  title="Call"
                  className="w-11 h-11 rounded-full bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 flex items-center justify-center text-white transition-all shadow-md active:scale-95"
                >
                  📞
                </a>
              )}
              {profile.phone && (
                <a
                  href={`sms:${profile.phone}`}
                  title="Send Message"
                  className="w-11 h-11 rounded-full bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 flex items-center justify-center text-white transition-all shadow-md active:scale-95"
                >
                  💬
                </a>
              )}
              {profile.email && (
                <a
                  href={`mailto:${profile.email}`}
                  title="Send Email"
                  className="w-11 h-11 rounded-full bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 flex items-center justify-center text-white transition-all shadow-md active:scale-95"
                >
                  ✉️
                </a>
              )}
            </div>

            {/* Primary Action Button (Save to Contacts) */}
            <div className="w-full mt-4">
              <button
                onClick={generateVCard}
                className="w-full py-3 bg-white text-black font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-neutral-200 transition-all shadow-lg flex items-center justify-center gap-2 active:scale-98"
              >
                📥 Save to Contacts
              </button>
            </div>
          </div>
        </div>

        {/* Links Section */}
        {socialLinks.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider px-1">Links</p>
            <div className="space-y-2">
              {socialLinks.map((link) => (
                <a
                  key={link.id}
                  href={resolveDeepLink(link.url)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-3.5 bg-neutral-950 hover:bg-neutral-900 border border-neutral-800/80 rounded-2xl transition-all group"
                >
                  <span className="font-semibold text-sm text-neutral-200 group-hover:text-white">{link.title}</span>
                  <span className="text-neutral-500 group-hover:text-white transition-colors text-xs font-bold">›</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Collapsible QR Codes Section */}
        {qrCodes.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider px-1">QR Codes</p>
            <div className="space-y-2">
              {qrCodes.map((qr) => {
                const isOpen = openQrId === qr.id;
                return (
                  <div key={qr.id} className="bg-neutral-950 border border-neutral-800/80 rounded-2xl overflow-hidden transition-all">
                    <button
                      onClick={() => setOpenQrId(isOpen ? null : qr.id)}
                      className="w-full flex items-center justify-between p-3.5 text-left text-sm font-semibold text-neutral-200 hover:bg-neutral-900 transition-colors"
                    >
                      <span>{qr.title}</span>
                      <span className="text-neutral-500 text-xs">{isOpen ? '▲' : '▼'}</span>
                    </button>
                    {isOpen && (
                      <div className="p-4 border-t border-neutral-900 bg-neutral-900/50 flex flex-col items-center gap-2">
                        <img src={qr.url} alt={qr.title} className="w-48 h-48 object-cover rounded-xl bg-white p-2 shadow-lg" />
                        <p className="text-xs text-neutral-400 font-medium">{qr.title}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* PULSE Minimal Footer */}
        <footer className="text-center pt-4">
          <button className="px-4 py-1.5 bg-neutral-950 border border-neutral-800 hover:bg-neutral-900 text-neutral-400 text-[11px] font-medium rounded-full transition-colors">
            Get Your Own Card ›
          </button>
          <p className="text-[10px] font-bold tracking-widest text-neutral-600 uppercase mt-3">POWERED BY PULSE</p>
        </footer>

      </div>
    </main>
  );
}