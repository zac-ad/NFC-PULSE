'use client';

import { useState } from 'react';

interface Profile {
  id: string;
  full_name: string;
  title?: string;
  company?: string;
  bio?: string;
  phone?: string;
  email?: string;
  avatar_url?: string;
  banner_url?: string;
  is_verified?: boolean;
}

interface LinkItem {
  id: string;
  title: string;
  url: string;
  type: 'link' | 'qr';
  icon_name?: string;
}

export default function ProfileClient({
  profile,
  links,
}: {
  profile: Profile;
  links: LinkItem[];
}) {
  const [activeQrUrl, setActiveQrUrl] = useState<string | null>(null);

  // Generate and download standard .vcf file
  const handleDownloadVCard = () => {
    const vcardData = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${profile.full_name}`,
      profile.company ? `ORG:${profile.company}` : '',
      profile.title ? `TITLE:${profile.title}` : '',
      profile.phone ? `TEL;TYPE=CELL:${profile.phone}` : '',
      profile.email ? `EMAIL:${profile.email}` : '',
      'END:VCARD',
    ]
      .filter(Boolean)
      .join('\n');

    const blob = new Blob([vcardData], { type: 'text/vcard;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${profile.full_name.replace(/\s+/g, '_')}.vcf`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <main className="min-h-screen bg-black text-white flex justify-center selection:bg-neutral-800">
      <div className="w-full max-w-md bg-neutral-950 border-x border-neutral-800 min-h-screen relative flex flex-col">
        
        {/* Banner Cover */}
        <div className="h-40 w-full bg-neutral-900 relative overflow-hidden">
          {profile.banner_url ? (
            <img
              src={profile.banner_url}
              alt="Cover Banner"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-tr from-neutral-900 to-neutral-800" />
          )}
        </div>

        {/* Avatar Header */}
        <div className="px-6 relative -mt-16 flex justify-between items-end">
          <div className="relative">
            <div className="w-28 h-28 rounded-full border-4 border-neutral-950 bg-neutral-800 overflow-hidden shadow-2xl">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-neutral-400">
                  {profile.full_name.charAt(0)}
                </div>
              )}
            </div>
            {profile.is_verified && (
              <span className="absolute bottom-1 right-1 bg-blue-500 text-white p-1 rounded-full text-xs">
                ✓
              </span>
            )}
          </div>
        </div>

        {/* Profile Info */}
        <div className="px-6 mt-4 space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">{profile.full_name}</h1>
          {profile.title && (
            <p className="text-neutral-400 text-sm font-medium">
              {profile.title} {profile.company && `at ${profile.company}`}
            </p>
          )}
          {profile.bio && (
            <p className="text-neutral-300 text-sm pt-2 leading-relaxed">{profile.bio}</p>
          )}
        </div>

        {/* Primary Action Button */}
        <div className="px-6 mt-6">
          <button
            onClick={handleDownloadVCard}
            className="w-full py-3 bg-white text-black font-semibold rounded-xl hover:bg-neutral-200 transition-colors duration-150 flex items-center justify-center gap-2 shadow-lg"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Save Contact
          </button>
        </div>

        {/* Link Tree Stack */}
        <div className="px-6 mt-6 space-y-3 flex-1 pb-12">
          {links.map((link) => (
            <div key={link.id}>
              {link.type === 'qr' ? (
                <button
                  onClick={() => setActiveQrUrl(link.url)}
                  className="w-full py-3.5 px-4 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-neutral-700 transition-all flex items-center justify-between text-left group"
                >
                  <span className="font-medium text-sm text-neutral-200 group-hover:text-white">
                    {link.title}
                  </span>
                  <span className="text-xs bg-neutral-800 text-neutral-400 px-2.5 py-1 rounded-md">
                    View QR
                  </span>
                </button>
              ) : (
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 px-4 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-neutral-700 transition-all flex items-center justify-between group"
                >
                  <span className="font-medium text-sm text-neutral-200 group-hover:text-white">
                    {link.title}
                  </span>
                  <span className="text-neutral-500 group-hover:text-white transition-colors">
                    ↗
                  </span>
                </a>
              )}
            </div>
          ))}
        </div>

        {/* Footer Brand */}
        <div className="py-6 text-center text-xs text-neutral-600 border-t border-neutral-900">
          Powered by <span className="font-bold tracking-widest text-neutral-400">PULSE</span>
        </div>

        {/* Payment / QR Modal */}
        {activeQrUrl && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-xs w-full flex flex-col items-center relative shadow-2xl">
              <button
                onClick={() => setActiveQrUrl(null)}
                className="absolute top-4 right-4 text-neutral-400 hover:text-white"
              >
                ✕
              </button>
              <h3 className="text-lg font-bold text-white mb-4">Scan QR Code</h3>
              <div className="bg-white p-3 rounded-xl">
                <img
                  src={activeQrUrl}
                  alt="Payment QR"
                  className="w-48 h-48 object-contain"
                />
              </div>
              <button
                onClick={() => setActiveQrUrl(null)}
                className="mt-6 w-full py-2 bg-neutral-800 text-sm font-medium text-neutral-300 rounded-lg hover:bg-neutral-700"
              >
                Close
              </button>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}