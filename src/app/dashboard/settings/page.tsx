import { requireOrganization } from '@/lib/auth'
import Link from 'next/link'
import {
  User,
  CreditCard,
  Building2,
  Users,
  Plug,
  Bell,
  ChevronRight,
  Settings as SettingsIcon
} from 'lucide-react'

interface SettingCardProps {
  href: string
  icon: React.ReactNode
  title: string
  description: string
  available?: boolean
  roleRequired?: string[]
}

function SettingCard({ href, icon, title, description, available = true, roleRequired }: SettingCardProps) {
  const card = (
    <div className={`
      bg-white rounded-lg shadow-sm border border-gray-200 p-6
      transition-all duration-200
      ${available ? 'hover:shadow-md hover:border-emerald-300 cursor-pointer' : 'opacity-60 cursor-not-allowed'}
    `}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <div className={`
            p-3 rounded-lg
            ${available ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}
          `}>
            {icon}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {title}
            </h3>
            <p className="text-sm text-gray-600">
              {description}
            </p>
            {!available && (
              <span className="inline-block mt-2 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded">
                Coming Soon
              </span>
            )}
            {roleRequired && (
              <span className="inline-block mt-2 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                {roleRequired.join(' / ')} only
              </span>
            )}
          </div>
        </div>
        {available && (
          <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
        )}
      </div>
    </div>
  )

  if (available) {
    return <Link href={href}>{card}</Link>
  }

  return card
}

export default async function SettingsPage() {
  const profile = await requireOrganization()
  const isOwnerOrAdmin = profile.role === 'owner' || profile.role === 'admin'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage your account, organization, and application preferences.
        </p>
      </div>

      {/* Personal Settings */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Personal Settings
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SettingCard
            href="/dashboard/settings/profile"
            icon={<User className="w-6 h-6" />}
            title="Profile"
            description="Manage your personal information, avatar, and account details."
          />

          <SettingCard
            href="/dashboard/settings/notifications"
            icon={<Bell className="w-6 h-6" />}
            title="Notifications"
            description="Configure email and in-app notification preferences."
            available={false}
          />
        </div>
      </div>

      {/* Organization Settings */}
      {isOwnerOrAdmin && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Organization Settings
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SettingCard
              href="/dashboard/settings/organization"
              icon={<Building2 className="w-6 h-6" />}
              title="Organization"
              description="Manage organization details, branding, and general settings."
              roleRequired={['Owner', 'Admin']}
              available={false}
            />

            <SettingCard
              href="/dashboard/settings/team"
              icon={<Users className="w-6 h-6" />}
              title="Team Management"
              description="Invite team members, manage roles, and set permissions."
              roleRequired={['Owner', 'Admin']}
              available={false}
            />
          </div>
        </div>
      )}

      {/* Billing & Integrations */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Billing & Integrations
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profile.role === 'owner' && (
            <SettingCard
              href="/dashboard/settings/billing"
              icon={<CreditCard className="w-6 h-6" />}
              title="Billing"
              description="Manage your subscription, payment methods, and invoices."
              roleRequired={['Owner']}
            />
          )}

          <SettingCard
            href="/dashboard/settings/integrations"
            icon={<Plug className="w-6 h-6" />}
            title="Integrations"
            description="Connect third-party apps and manage API integrations."
            available={false}
          />
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <SettingsIcon className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-emerald-900 mb-1">
              Need Help?
            </h3>
            <p className="text-sm text-emerald-700 mb-3">
              Can't find what you're looking for? Check our documentation or contact support.
            </p>
            <div className="flex space-x-3">
              <button className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
                View Documentation
              </button>
              <span className="text-emerald-300">•</span>
              <button className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
                Contact Support
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}