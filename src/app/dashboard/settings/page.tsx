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
  Settings as SettingsIcon,
} from 'lucide-react'
import { getTranslations } from '@/lib/i18n/server'

interface SettingCardProps {
  href: string
  icon: React.ReactNode
  title: string
  description: string
  available?: boolean
  badge?: string
}

function SettingCard({
  href,
  icon,
  title,
  description,
  available = true,
  badge,
}: SettingCardProps) {
  const card = (
    <div
      className={`rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 ${available ? 'cursor-pointer hover:border-emerald-300 hover:shadow-md' : 'cursor-not-allowed opacity-60'} `}
    >
      <div className='flex items-start justify-between'>
        <div className='flex items-start space-x-4'>
          <div
            className={`rounded-lg p-3 ${available ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'} `}
          >
            {icon}
          </div>
          <div className='flex-1'>
            <h3 className='mb-1 text-lg font-semibold text-gray-900'>{title}</h3>
            <p className='text-sm text-gray-600'>{description}</p>
            {badge && (
              <span className={`mt-2 inline-block rounded px-2 py-1 text-xs font-medium ${!available ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                {badge}
              </span>
            )}
          </div>
        </div>
        {available && <ChevronRight className='h-5 w-5 flex-shrink-0 text-gray-400' />}
      </div>
    </div>
  )

  if (available) {
    return <Link href={href}>{card}</Link>
  }

  return card
}

// ⚡ PERFORMANCE: Cache page for faster tab switches
export const revalidate = 300

export default async function SettingsPage() {
  const profile = await requireOrganization()
  const isOwnerOrAdmin = profile.role === 'owner' || profile.role === 'admin'
  const { t } = await getTranslations('settings')

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div>
        <h1 className='text-2xl font-bold text-gray-900'>{t('title')}</h1>
        <p className='mt-1 text-sm text-gray-600'>{t('subtitle')}</p>
      </div>

      {/* Personal Settings */}
      <div>
        <h2 className='mb-3 text-sm font-semibold tracking-wider text-gray-500 uppercase'>
          {t('sections.personal')}
        </h2>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
          <SettingCard
            href='/dashboard/settings/profile'
            icon={<User className='h-6 w-6' />}
            title={t('cards.profile.title')}
            description={t('cards.profile.description')}
          />

          <SettingCard
            href='/dashboard/settings/notifications'
            icon={<Bell className='h-6 w-6' />}
            title={t('cards.notifications.title')}
            description={t('cards.notifications.description')}
            available={false}
            badge={t('badges.comingSoon')}
          />
        </div>
      </div>

      {/* Organization Settings */}
      {isOwnerOrAdmin && (
        <div>
          <h2 className='mb-3 text-sm font-semibold tracking-wider text-gray-500 uppercase'>
            {t('sections.organization')}
          </h2>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
            <SettingCard
              href='/dashboard/settings/organization'
              icon={<Building2 className='h-6 w-6' />}
              title={t('cards.organization.title')}
              description={t('cards.organization.description')}
              badge={t('badges.ownerAdminOnly')}
              available={true}
            />

            <SettingCard
              href='/dashboard/settings/team'
              icon={<Users className='h-6 w-6' />}
              title={t('cards.team.title')}
              description={t('cards.team.description')}
              badge={t('badges.ownerAdminOnly')}
              available={true}
            />
          </div>
        </div>
      )}

      {/* Billing & Integrations */}
      <div>
        <h2 className='mb-3 text-sm font-semibold tracking-wider text-gray-500 uppercase'>
          {t('sections.billing')}
        </h2>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {profile.role === 'owner' && (
            <SettingCard
              href='/dashboard/settings/billing'
              icon={<CreditCard className='h-6 w-6' />}
              title={t('cards.billing.title')}
              description={t('cards.billing.description')}
              badge={t('badges.ownerOnly')}
            />
          )}

          <SettingCard
            href='/dashboard/settings/integrations'
            icon={<Plug className='h-6 w-6' />}
            title={t('cards.integrations.title')}
            description={t('cards.integrations.description')}
            available={true}
          />
        </div>
      </div>

      {/* Help Section */}
      <div className='rounded-lg border border-emerald-200 bg-emerald-50 p-6'>
        <div className='flex items-start space-x-3'>
          <div className='rounded-lg bg-emerald-100 p-2'>
            <SettingsIcon className='h-5 w-5 text-emerald-600' />
          </div>
          <div className='flex-1'>
            <h3 className='mb-1 text-sm font-semibold text-emerald-900'>{t('help.title')}</h3>
            <p className='mb-3 text-sm text-emerald-700'>{t('help.description')}</p>
            <div className='flex space-x-3'>
              <button className='text-sm font-medium text-emerald-700 hover:text-emerald-800'>
                {t('help.viewDocs')}
              </button>
              <span className='text-emerald-300'>•</span>
              <button className='text-sm font-medium text-emerald-700 hover:text-emerald-800'>
                {t('help.contactSupport')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
