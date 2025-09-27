/**
 * Enhanced Super Admin Layout
 * Protected layout for super admin pages with comprehensive navigation and security
 */

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { AdminNav } from '@/components/admin/admin-nav';
import { AdminHeader } from '@/components/admin/admin-header';

export const metadata = {
  title: 'Super Admin Dashboard - ADSapp',
  description: 'Super Admin interface for managing the multi-tenant WhatsApp Business Inbox SaaS platform',
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient(cookies());

  // Check authentication
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/auth/signin?message=Authentication required');
  }

  // Check if user is super admin
  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      is_super_admin,
      full_name,
      email,
      super_admin_permissions,
      organization_id,
      organizations(name, slug)
    `)
    .eq('id', user.id)
    .single();

  if (!profile?.is_super_admin) {
    redirect('/dashboard?message=Super admin access required');
  }

  const adminUser = {
    id: user.id,
    email: user.email || '',
    fullName: profile.full_name || '',
    permissions: profile.super_admin_permissions || [],
    organizationId: profile.organization_id,
    organization: profile.organizations,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin Header */}
      <AdminHeader user={adminUser} />

      <div className="flex">
        {/* Admin Sidebar Navigation */}
        <AdminNav />

        {/* Main Content */}
        <main className="flex-1 lg:pl-64">
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Menu Overlay */}
      <div id="mobile-menu-overlay" className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 lg:hidden hidden">
        {/* Mobile menu will be handled by the AdminNav component */}
      </div>
    </div>
  );
}