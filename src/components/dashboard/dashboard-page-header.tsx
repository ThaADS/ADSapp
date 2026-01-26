'use client'

import { memo } from 'react'
import { useTranslations } from '@/components/providers/translation-provider'

interface DashboardPageHeaderProps {
  userName: string
}

function DashboardPageHeaderInner({ userName }: DashboardPageHeaderProps) {
  const t = useTranslations('dashboard')

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return t('greeting.morning')
    if (hour < 18) return t('greeting.afternoon')
    return t('greeting.evening')
  }

  return (
    <div className='flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl'>
          {getGreeting()}, {userName || t('greeting.user')}
        </h1>
        <p className='mt-1 text-sm text-gray-500'>{t('overview.subtitle')}</p>
      </div>
    </div>
  )
}

export const DashboardPageHeader = memo(DashboardPageHeaderInner)
DashboardPageHeader.displayName = 'DashboardPageHeader'
