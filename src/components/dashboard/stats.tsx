import { useTranslations } from '@/components/providers/translation-provider'

interface DashboardStatsProps {
  stats: {
    totalConversations: number
    todayMessages: number
    totalContacts: number
    openConversations: number
  }
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  const t = useTranslations('dashboard')

  const statItems = [
    {
      name: t('stats.totalConversations'),
      value: stats.totalConversations,
      icon: (
        <svg className='h-6 w-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'
          />
        </svg>
      ),
      color: 'text-blue-600 bg-blue-100',
    },
    {
      name: t('stats.messagesToday'),
      value: stats.todayMessages,
      icon: (
        <svg className='h-6 w-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z'
          />
        </svg>
      ),
      color: 'text-emerald-600 bg-emerald-100',
    },
    {
      name: t('stats.totalContacts'),
      value: stats.totalContacts,
      icon: (
        <svg className='h-6 w-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a4 4 0 11-8 0 4 4 0 018 0z'
          />
        </svg>
      ),
      color: 'text-purple-600 bg-purple-100',
    },
    {
      name: t('stats.openConversations'),
      value: stats.openConversations,
      icon: (
        <svg className='h-6 w-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4'
          />
        </svg>
      ),
      color: 'text-orange-600 bg-orange-100',
    },
  ]

  return (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4'>
      {statItems.map(item => (
        <div key={item.name} className='overflow-hidden rounded-lg bg-white shadow-sm border border-gray-200 hover:shadow-md transition-shadow'>
          <div className='p-4 sm:p-5'>
            <div className='flex items-center'>
              <div className='flex-shrink-0'>
                <div className={`rounded-lg p-2.5 sm:p-3 ${item.color}`}>{item.icon}</div>
              </div>
              <div className='ml-4 sm:ml-5 w-0 flex-1'>
                <dl>
                  <dt className='truncate text-xs sm:text-sm font-medium text-gray-600 uppercase tracking-wide'>{item.name}</dt>
                  <dd>
                    <div className='text-xl sm:text-2xl font-bold text-gray-900 mt-1'>
                      {item.value.toLocaleString()}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
