import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { verifyOrgSessionCookieValue, COOKIE_NAME } from '@/lib/orgSession';
import EnterpriseDashboardClient from './EnterpriseDashboardClient';

export default async function EnterpriseDashboardPage() {
  const cookieStore = await cookies();
  const orgId = verifyOrgSessionCookieValue(cookieStore.get(COOKIE_NAME)?.value);
  if (!orgId) redirect('/enterprise/login');
  const { data: org } = await supabaseAdmin
    .from('organizations').select('id, name').eq('id', orgId).maybeSingle();
  if (!org) redirect('/enterprise/login');
  return <EnterpriseDashboardClient organizationName={org.name} />;
}
