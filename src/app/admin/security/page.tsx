// @ts-nocheck - Database types need regeneration
import { requireAuth, getUserProfile } from '@/lib/auth';
import { redirect } from 'next/navigation';
import SecurityDashboard from '@/components/admin/security-dashboard';

export const dynamic = 'force-dynamic';

export default async function SecurityPage() {
  // Ensure user is authenticated
  await requireAuth();

  // Get user profile to check super admin status
  const profile = await getUserProfile();

  // If not super admin, redirect to appropriate page
  if (!profile?.is_super_admin) {
    if (profile?.organization_id) {
      redirect('/dashboard');
    } else {
      redirect('/onboarding');
    }
  }

  return <SecurityDashboard />;
}
