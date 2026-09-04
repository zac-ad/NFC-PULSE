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
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-neutral-950 border border-neutral-800/50 rounded-3xl p-6 space-y-6">
          <div className="w-full h-32 bg-neutral-900 rounded-2xl animate-pulse"></div>
          <div className="flex justify-between items-end -mt-12 px-4">
             <div className="w-20 h-20 bg-neutral-800 rounded-full border-4 border-neutral-950 animate-pulse"></div>
             <div className="w-28 h-9 bg-neutral-900 rounded-xl animate-pulse"></div>
          </div>
          <div className="space-y-3 pt-4 px-4">
             <div className="h-5 bg-neutral-900 rounded-md w-3/4 animate-pulse"></div>
             <div className="h-4 bg-neutral-900 rounded-md w-1/2 animate-pulse"></div>
             <div className="h-16 bg-neutral-900 rounded-md w-full animate-pulse mt-4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile || !profile.is_active) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-neutral-950 border border-neutral-800 rounded-3xl p-8 text-center space-y-3">
          <div className="w-12 h-12 bg-red-950/80 border border-red-800 text-red-400 rounded-2xl flex items-center justify-center mx-auto text-xl">
            🔒
          </div>
          <h1 className="text-lg font-bold">Profile Locked</h1>
          <p className="text-xs text-neutral-400">
            This card is set to private by its owner or has not been activated yet.
          </p>
        </div>
      </div>
    );
  }

  const socialLinks = links.filter((l) => l.type !== 'qr');
  const qrCodes = links.filter((l) => l.type === 'qr');

  return (
    <main className="min-h-screen bg-black text-white p-4 flex justify-center font-sans selection:bg-neutral-800">
      <div className="max-w-md w-full space-y-6 my-auto py-6">
        
        <div className="bg-neutral-950 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl relative">
          <div className="h-32 bg-neutral-900 w-full relative">
            {profile.banner_url && (
              <img src={profile.banner_url} alt="Banner" className="w-full h-full object-cover" />
            )}
          </div>
          <div className="px-6 pb-6 pt-0 relative">
            <div className="-mt-12 mb-4 flex justify-between items-end">
              <div className="relative group">
                <div className="absolute inset-0 bg-amber-500/20 blur-xl rounded-full transition-opacity group-hover:opacity-100 opacity-60"></div>
                <div className="relative w-24 h-24 rounded-full border-4 border-neutral-950 overflow-hidden bg-neutral-900 shadow-2xl z-10">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-neutral-600">
                      {profile.full_name[0]}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={generateVCard}
                className="px-4 py-2 bg-white text-black font-bold text-xs rounded-xl hover:-translate-y-0.5 active:scale-95 transition-all duration-200 shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] z-10"
              >
                Save Contact
              </button>
            </div>

            <div className="space-y-1">
              <h1 className="text-xl font-bold text-white tracking-tight">{profile.full_name}</h1>
              {(profile.title || profile.company) && (
                <p className="text-xs text-amber-400 font-semibold">
                  {profile.title} {profile.company ? `at ${profile.company}` : ''}
                </p>
              )}
              {profile.bio && <p className="text-xs text-neutral-400 pt-2 leading-relaxed">{profile.bio}</p>}
            </div>
          </div>
        </div>

        {socialLinks.length > 0 && (
          <div className="space-y-2">
            {socialLinks.map((link) => (
              <a
                key={link.id}
                href={resolveDeepLink(link.url)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-4 bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 text-white rounded-2xl transition-all group shadow-sm"
              >
                <span className="font-semibold text-sm">{link.title}</span>
                <span className="text-neutral-500 group-hover:text-white transition-colors text-xs">➔</span>
              </a>
            ))}
          </div>
        )}

        {qrCodes.length > 0 && (
          <div className="bg-neutral-950 border border-neutral-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Payment Gateways</h2>
            <div className="grid grid-cols-2 gap-3">
              {qrCodes.map((qr) => (
                <div key={qr.id} className="bg-neutral-900 border border-neutral-800 p-3 rounded-2xl text-center space-y-2">
                  <img src={qr.url} alt={qr.title} className="w-full aspect-square object-cover rounded-xl bg-white p-1" />
                  <p className="text-xs font-bold text-white truncate">{qr.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <footer className="text-center pt-8 pb-6 border-t border-neutral-900 mt-8 space-y-1">
          <p className="text-xs font-bold tracking-widest text-neutral-400 uppercase">PULSE</p>
          <p className="text-[10px] text-neutral-500 tracking-wider font-medium">
            {profile.profile_type === 'PERSONAL'
              ? 'Personal Unified Live Share Experience'
              : 'Professional Unified Live Share Experience'}
          </p>
        </footer>

      </div>
    </main>
  );
}