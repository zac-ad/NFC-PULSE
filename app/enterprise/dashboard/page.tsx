// app/enterprise/dashboard/page.tsx
// Server component — verifies org session before rendering the secure client.
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyOrgSessionCookieValue, COOKIE_NAME } from '@/lib/orgSession';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import EnterpriseDashboardClient from './EnterpriseDashboardClient';

export default async function EnterpriseDashboard() {
  const cookieStore = await cookies();
  const orgId = verifyOrgSessionCookieValue(cookieStore.get(COOKIE_NAME)?.value);

  if (!orgId) {
    redirect('/enterprise/login');
  }

  // Fetch org name server-side so the client never receives raw org data
  const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('name')
    .eq('id', orgId)
    .maybeSingle();

  return <EnterpriseDashboardClient organizationName={org?.name ?? 'Enterprise'} />;
}
