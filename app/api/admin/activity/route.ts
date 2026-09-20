// app/api/admin/activity/route.ts
// Auth: requireAdmin() — GET skips Origin check (read-only)
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/requireAdmin';

export async function GET(request: Request) {
  const check = await requireAdmin(request, { skipOriginCheck: true });
  if (!check.ok) return check.response;

  const { data, error } = await supabaseAdmin
    .from('admin_actions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('[admin/activity GET]', error.message);
    return NextResponse.json({ error: 'Could not load activity.' }, { status: 500 });
  }
  return NextResponse.json({ actions: data });
}
