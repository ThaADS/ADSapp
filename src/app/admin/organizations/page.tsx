import { OrganizationsManager } from '@/components/admin/organizations-manager';

export default function AdminOrganizationsPage() {
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
