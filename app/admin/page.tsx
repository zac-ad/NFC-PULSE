// app/admin/page.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyAdminSession } from '@/lib/adminAuth';
import AdminDashboardClient from './AdminDashboardClient';

export default async function MasterAdminPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('admin_session');

  if (!sessionCookie || !verifyAdminSession(sessionCookie.value)) {
    redirect('/admin/login');
  }

  return <AdminDashboardClient />;
}