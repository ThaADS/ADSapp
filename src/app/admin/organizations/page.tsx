import { OrganizationsManager } from '@/components/admin/organizations-manager';
import { requireAuth, getUserProfile } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AdminOrganizationsPage() {
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

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Organizations</h2>
        <p className="mt-1 text-sm text-gray-600">
          Manage all tenant organizations on the platform
        </p>
      </div>
      <OrganizationsManager />
    </div>
  );
}
