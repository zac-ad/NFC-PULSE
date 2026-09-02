import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default async function ProfilePage({ params }: { params: { slug: string } }) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('slug', params.slug)
    .single();

  if (!profile) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <p className="text-neutral-400">Profile not found.</p>
      </main>
    );
  }

  // Check if profile is disabled by the user
  if (profile.is_active === false) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-neutral-950 border border-neutral-800 rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-12 h-12 bg-neutral-900 text-neutral-400 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
            🔒
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Profile Private</h1>
          <p className="text-neutral-400 text-sm leading-relaxed mb-6">
            This digital business card has been temporarily set to private by the owner.
          </p>
          <Link
            href="/"
            className="inline-block w-full py-3 bg-neutral-900 border border-neutral-800 text-sm text-neutral-300 rounded-xl hover:bg-neutral-800 transition-colors"
          >
            Return Home
          </Link>
        </div>
      </main>
    );
  }

  // Fetch active links
  const { data: links } = await supabase
    .from('profile_links')
    .select('*')
    .eq('profile_id', profile.id)
    .order('position', { ascending: true });

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-neutral-950 border border-neutral-800 rounded-2xl p-6 text-center space-y-6">
        <div className="w-20 h-20 bg-neutral-800 rounded-full mx-auto flex items-center justify-center text-2xl font-bold">
          {profile.full_name?.charAt(0) || 'P'}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{profile.full_name}</h1>
          <p className="text-neutral-400 text-sm">{profile.title} {profile.company && `at ${profile.company}`}</p>
          {profile.bio && <p className="text-neutral-500 text-xs mt-2">{profile.bio}</p>}
        </div>

        <a
          href={`data:text/vcard;charset=utf-8,BEGIN:VCARD%0AVERSION:3.0%0AN:${profile.full_name}%0AEMAIL:${profile.email}%0AEND:VCARD`}
          download={`${profile.slug}.vcf`}
          className="w-full py-3 bg-white text-black font-semibold rounded-xl block hover:bg-neutral-200 transition-colors"
        >
          Save Contact
        </a>

        <div className="space-y-3 pt-4 border-t border-neutral-900">
          {links?.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="block w-full p-3 bg-neutral-900 border border-neutral-800 rounded-xl text-sm font-medium hover:bg-neutral-800 transition-colors"
            >
              {link.title}
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}