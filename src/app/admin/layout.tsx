import { requireAuth } from '@/lib/auth';
import { SuperAdminPermissions } from '@/lib/super-admin';
import { redirect } from 'next/navigation';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();
  
  // Check if user is super admin
  const permissions = new SuperAdminPermissions();
  const isSuperAdmin = await permissions.isSuperAdmin(user.id);
  
  if (!isSuperAdmin) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">Super Admin</span>
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-semibold">SA</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <nav className="bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <a href="/admin" className="text-white px-3 py-4 text-sm font-medium hover:text-gray-300">
              Dashboard
            </a>
            <a href="/admin/organizations" className="text-gray-300 px-3 py-4 text-sm font-medium hover:text-white">
              Organizations
            </a>
            <a href="/admin/users" className="text-gray-300 px-3 py-4 text-sm font-medium hover:text-white">
              Users
            </a>
            <a href="/admin/billing" className="text-gray-300 px-3 py-4 text-sm font-medium hover:text-white">
              Billing
            </a>
            <a href="/admin/settings" className="text-gray-300 px-3 py-4 text-sm font-medium hover:text-white">
              Settings
            </a>
          </div>
        </div>
      </nav>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
