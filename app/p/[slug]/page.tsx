import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ProfileClient from './ProfileClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, title, company')
    .eq('slug', slug)
    .single();

  if (!profile) return { title: 'Profile Not Found | PULSE' };

  return {
    title: `${profile.full_name} | PULSE`,
    description: `${profile.title || ''} ${profile.company ? `at ${profile.company}` : ''}`.trim(),
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Fetch profile
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !profile) {
    notFound();
  }

  // Fetch associated links and payment QRs
  const { data: links } = await supabase
    .from('profile_links')
    .select('*')
    .eq('profile_id', profile.id)
    .order('position', { ascending: true });

  return <ProfileClient profile={profile} links={links || []} />;
}