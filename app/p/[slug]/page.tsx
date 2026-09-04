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

const renderPlatformIcon = (title: string, url: string) => {
  const c = `${title} ${url}`.toLowerCase();

  if (c.includes('instagram')) {
    return (
      <svg className="w-5 h-5 text-neutral-400 group-hover:text-white transition-colors fill-current" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    );
  }

  if (c.includes('linkedin')) {
    return (
      <svg className="w-5 h-5 text-neutral-400 group-hover:text-white transition-colors fill-current" viewBox="0 0 24 24">
        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
      </svg>
    );
  }

  if (c.includes('tiktok')) {
    return (
      <svg className="w-5 h-5 text-neutral-400 group-hover:text-white transition-colors fill-current" viewBox="0 0 24 24">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.98-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.28-2.85.91-5.74 3.08-7.59 1.83-1.58 4.31-2.23 6.69-1.73v4.13c-1.22-.38-2.59-.22-3.67.43-1.08.64-1.81 1.8-1.92 3.05-.15 1.48.51 2.97 1.75 3.78 1.25.82 2.9 .89 4.2.18 1.05-.56 1.73-1.68 1.81-2.87.05-3.83.02-7.66.03-11.49z"/>
      </svg>
    );
  }

  if (c.includes('youtube')) {
    return (
      <svg className="w-5 h-5 text-neutral-400 group-hover:text-white transition-colors fill-current" viewBox="0 0 24 24">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    );
  }

  if (c.includes('whatsapp')) {
    return (
      <svg className="w-5 h-5 text-neutral-400 group-hover:text-white transition-colors fill-current" viewBox="0 0 24 24">
        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.285-.143-1.688-.833-1.948-.928-.26-.095-.45-.143-.639.143-.19.285-.737.928-.903 1.118-.166.19-.333.214-.618.071-.285-.143-1.204-.444-2.293-1.415-.848-.756-1.42-1.689-1.586-1.974-.166-.285-.018-.439.125-.581.129-.128.285-.333.428-.5.143-.167.19-.285.285-.476.095-.19.048-.357-.024-.5-.071-.143-.639-1.541-.876-2.11-.231-.555-.466-.48-.639-.488-.165-.008-.356-.008-.547-.008s-.5.071-.761.357c-.261.285-.998.975-.998 2.38 0 1.404 1.022 2.76 1.165 2.951.143.19 2.012 3.073 4.875 4.31.681.294 1.213.47 1.627.601.684.217 1.307.186 1.8.113.55-.082 1.688-.69 1.926-1.356.237-.666.237-1.237.166-1.356-.07-.119-.26-.19-.545-.333z"/>
      </svg>
    );
  }

  if (c.includes('twitter') || c.includes('x.com')) {
    return (
      <svg className="w-5 h-5 text-neutral-400 group-hover:text-white transition-colors fill-current" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    );
  }

  if (c.includes('github')) {
    return (
      <svg className="w-5 h-5 text-neutral-400 group-hover:text-white transition-colors fill-current" viewBox="0 0 24 24">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
      </svg>
    );
  }

  return (
    <svg className="w-5 h-5 text-neutral-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
};

export default function PublicProfilePage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openQrId, setOpenQrId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

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

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `PULSE | ${profile?.full_name}`,
          text: `Connect with ${profile?.full_name} on PULSE`,
          url: window.location.href,
        });
      } catch {}
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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
        <div className="w-full max-w-md bg-neutral-950 border border-neutral-800/60 rounded-3xl p-6 space-y-6">
          <div className="w-full h-[140px] bg-neutral-900 rounded-2xl animate-pulse" />
          <div className="flex justify-center -mt-14">
            <div className="w-24 h-24 bg-neutral-800 rounded-full border-4 border-black animate-pulse" />
          </div>
          <div className="space-y-3 text-center">
            <div className="h-5 bg-neutral-900 rounded-md w-1/2 mx-auto animate-pulse" />
            <div className="h-4 bg-neutral-900 rounded-md w-1/3 mx-auto animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile || !profile.is_active) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-neutral-950/90 border border-neutral-800/80 rounded-3xl p-8 text-center space-y-3 shadow-2xl backdrop-blur-xl">
          <div className="w-12 h-12 bg-neutral-900 border border-neutral-800 text-red-400 rounded-2xl flex items-center justify-center mx-auto text-xl">
            🔒
          </div>
          <h1 className="text-lg font-bold text-white">Profile Locked</h1>
          <p className="text-xs text-neutral-400">
            This card is currently set to private by its owner.
          </p>
        </div>
      </div>
    );
  }

  const socialLinks = links.filter((l) => l.type !== 'qr');
  const qrCodes = links.filter((l) => l.type === 'qr');

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-neutral-900 via-black to-black text-white p-4 flex justify-center font-sans selection:bg-neutral-800">
      <div className="max-w-md w-full space-y-5 my-auto py-4">

        {/* Hero Matte-Black Card */}
        <div className="bg-neutral-950/90 border border-neutral-800/80 rounded-3xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl relative text-center">
          
          {/* Header Share Button */}
          <button
            onClick={handleShare}
            className="absolute top-3.5 right-3.5 z-20 w-9 h-9 bg-black/60 backdrop-blur-md border border-white/10 hover:border-white/30 rounded-full flex items-center justify-center text-white transition-all active:scale-90"
            title="Share Profile"
          >
            {copied ? (
              <span className="text-[10px] font-bold text-emerald-400">✓</span>
            ) : (
              <svg className="w-4 h-4 fill-current text-neutral-200" viewBox="0 0 24 24">
                <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92z"/>
              </svg>
            )}
          </button>

          {/* Banner Container */}
          <div className="h-[140px] bg-neutral-900 w-full relative overflow-hidden">
            {profile.banner_url && (
              <img
                src={profile.banner_url}
                alt="Banner"
                className="w-full h-full object-cover scale-105 transition-transform duration-500 hover:scale-110"
              />
            )}
          </div>

          <div className="px-6 pb-6 pt-0 relative flex flex-col items-center">
            {/* Avatar Ring */}
            <div className="-mt-14 mb-3 w-24 h-24 rounded-full border-4 border-neutral-950 overflow-hidden bg-neutral-900 shadow-2xl relative group">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-neutral-500">
                  {profile.full_name[0]}
                </div>
              )}
            </div>

            {/* Name & Title */}
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1.5">
                <h1 className="text-xl font-bold text-white tracking-tight">{profile.full_name}</h1>
                <span className="w-4 h-4 bg-sky-500 text-black rounded-full flex items-center justify-center shadow-sm">
                  <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 20 20">
                    <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                  </svg>
                </span>
              </div>
              {(profile.title || profile.company) && (
                <p className="text-xs text-neutral-400 font-medium">
                  {profile.title} {profile.company ? `at ${profile.company}` : ''}
                </p>
              )}
              {profile.bio && (
                <p className="text-xs text-neutral-400 pt-1 leading-relaxed max-w-xs mx-auto">
                  {profile.bio}
                </p>
              )}
            </div>

            {/* Quick Actions (Call, Message, Mail) */}
            <div className="flex items-center justify-center gap-3.5 mt-5">
              {profile.phone && (
                <a
                  href={`tel:${profile.phone}`}
                  title="Call"
                  className="w-11 h-11 rounded-full bg-neutral-900/90 border border-neutral-800 hover:bg-neutral-800 flex items-center justify-center text-white transition-all shadow-md active:scale-95 hover:border-neutral-700"
                >
                  <svg className="w-4 h-4 fill-current text-neutral-300" viewBox="0 0 24 24">
                    <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.27c1.21.49 2.53.76 3.88.76a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.35.27 2.67.76 3.88a1 1 0 01-.27 1.11l-2.37 2.4z" />
                  </svg>
                </a>
              )}
              {profile.phone && (
                <a
                  href={`sms:${profile.phone}`}
                  title="Send Message"
                  className="w-11 h-11 rounded-full bg-neutral-900/90 border border-neutral-800 hover:bg-neutral-800 flex items-center justify-center text-white transition-all shadow-md active:scale-95 hover:border-neutral-700"
                >
                  <svg className="w-4 h-4 fill-current text-neutral-300" viewBox="0 0 24 24">
                    <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" />
                  </svg>
                </a>
              )}
              {profile.email && (
                <a
                  href={`mailto:${profile.email}`}
                  title="Send Email"
                  className="w-11 h-11 rounded-full bg-neutral-900/90 border border-neutral-800 hover:bg-neutral-800 flex items-center justify-center text-white transition-all shadow-md active:scale-95 hover:border-neutral-700"
                >
                  <svg className="w-4 h-4 fill-current text-neutral-300" viewBox="0 0 24 24">
                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                  </svg>
                </a>
              )}
            </div>

            {/* Main Action Button */}
            <div className="w-full mt-4">
              <button
                onClick={generateVCard}
                className="w-full py-3.5 bg-white text-black font-bold text-xs uppercase tracking-wider rounded-2xl hover:bg-neutral-200 transition-all shadow-xl flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                </svg>
                Save to Contacts
              </button>
            </div>
          </div>
        </div>

        {/* Links List */}
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
                  className="flex items-center justify-between p-3.5 bg-neutral-950/80 hover:bg-neutral-900/90 border border-neutral-800/80 hover:border-neutral-700 rounded-2xl transition-all group shadow-sm backdrop-blur-md"
                >
                  <div className="flex items-center gap-3">
                    {renderPlatformIcon(link.title, link.url)}
                    <span className="font-semibold text-sm text-neutral-200 group-hover:text-white transition-colors">
                      {link.title}
                    </span>
                  </div>
                  <svg className="w-4 h-4 text-neutral-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Payment QR Accordions */}
        {qrCodes.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider px-1">Payment Gateways</p>
            <div className="space-y-2">
              {qrCodes.map((qr) => {
                const isOpen = openQrId === qr.id;
                return (
                  <div key={qr.id} className="bg-neutral-950/80 border border-neutral-800/80 rounded-2xl overflow-hidden transition-all shadow-sm backdrop-blur-md">
                    <button
                      onClick={() => setOpenQrId(isOpen ? null : qr.id)}
                      className="w-full flex items-center justify-between p-3.5 text-left text-sm font-semibold text-neutral-200 hover:bg-neutral-900/80 transition-colors"
                    >
                      <span>{qr.title}</span>
                      <svg className={`w-4 h-4 text-neutral-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isOpen && (
                      <div className="p-4 border-t border-neutral-900 bg-neutral-900/40 flex flex-col items-center gap-2">
                        <img src={qr.url} alt={qr.title} className="w-48 h-48 object-cover rounded-xl bg-white p-2 shadow-2xl" />
                        <p className="text-xs text-neutral-400 font-medium">{qr.title}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="text-center pt-4 pb-2 space-y-3">
          <a
            href="/activate"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-950/90 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900 text-neutral-300 text-[11px] font-semibold rounded-full transition-all shadow-sm active:scale-95 backdrop-blur-md"
          >
            <span>Get Your Own Card</span>
            <svg className="w-3 h-3 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
            </svg>
          </a>
          <p className="text-[10px] font-bold tracking-widest text-neutral-600 uppercase">
            POWERED BY PULSE
          </p>
        </footer>

      </div>
    </main>
  );
}