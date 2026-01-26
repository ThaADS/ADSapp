import { AdminLayoutClient } from '@/components/admin/admin-layout-client'
import { requireAuth } from '@/lib/auth'
import { SuperAdminPermissions } from '@/lib/super-admin'
import { redirect } from 'next/navigation'
import { TranslationProvider } from '@/components/providers/translation-provider'
import { getServerLocale } from '@/lib/i18n/server'
import { getDictionary } from '@/lib/i18n/dictionaries'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth()

  // Check if user is super admin
  const permissions = new SuperAdminPermissions()
  const isSuperAdmin = await permissions.isSuperAdmin(user.id)

  if (!isSuperAdmin) {
    redirect('/dashboard')
  }

  // Load translations for the current locale
  const locale = await getServerLocale()
  const translations = await getDictionary(locale)

  return (
    <TranslationProvider locale={locale} translations={translations}>
      <AdminLayoutClient>{children}</AdminLayoutClient>
    </TranslationProvider>
  )
}
