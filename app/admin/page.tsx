import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyAdminSession } from '@/lib/adminAuth';
import AdminDashboardClient from './AdminDashboardClient';

export default async function AdminPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session');
  if (!session || !verifyAdminSession(session.value)) {
    redirect('/admin/login');
  }
  return <AdminDashboardClient />;
}
