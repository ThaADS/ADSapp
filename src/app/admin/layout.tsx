import { AdminLayoutClient } from '@/components/admin/admin-layout-client'
import { requireAuth } from '@/lib/auth'
import { SuperAdminPermissions } from '@/lib/super-admin'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth()

  // Check if user is super admin
  const permissions = new SuperAdminPermissions()
  const isSuperAdmin = await permissions.isSuperAdmin(user.id)

  if (!isSuperAdmin) {
    redirect('/dashboard')
  }

  return <AdminLayoutClient>{children}</AdminLayoutClient>
}
