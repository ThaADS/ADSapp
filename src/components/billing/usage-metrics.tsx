interface UsageMetricsProps {
  usage: {
    users: {
      current: number
      limit: number
      unlimited: boolean
    }
    contacts: {
      current: number
      limit: number
      unlimited: boolean
    }
    messages: {
      current: number
      limit: number
      unlimited: boolean
    }
  }
  plan: any
}

export function UsageMetrics({ usage, plan }: UsageMetricsProps) {
  const getUsagePercentage = (current: number, limit: number, unlimited: boolean) => {
    if (unlimited) return 0
    return Math.min((current / limit) * 100, 100)
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 75) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const formatLimit = (limit: number, unlimited: boolean) => {
    return unlimited ? 'Unlimited' : limit.toLocaleString()
  }

  const metrics = [
    {
      name: 'Team Members',
      current: usage.users.current,
      limit: usage.users.limit,
      unlimited: usage.users.unlimited,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      name: 'Contacts',
      current: usage.contacts.current,
      limit: usage.contacts.limit,
      unlimited: usage.contacts.unlimited,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      name: 'Messages (This Month)',
      current: usage.messages.current,
      limit: usage.messages.limit,
      unlimited: usage.messages.unlimited,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">Usage This Month</h2>
        <p className="text-sm text-gray-500">Track your current usage against plan limits</p>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {metrics.map((metric) => {
            const percentage = getUsagePercentage(metric.current, metric.limit, metric.unlimited)
            const isNearLimit = percentage >= 75 && !metric.unlimited

            return (
              <div
                key={metric.name}
                className={`p-4 border rounded-lg ${
                  isNearLimit ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center">
                  <div className={`p-2 rounded-md ${isNearLimit ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600'}`}>
                    {metric.icon}
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-gray-900">{metric.name}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {metric.current.toLocaleString()}
                      <span className="text-sm text-gray-500 font-normal">
                        {!metric.unlimited && ` / ${formatLimit(metric.limit, metric.unlimited)}`}
                      </span>
                    </p>
                  </div>
                </div>

                {!metric.unlimited && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                      <span>Usage</span>
                      <span>{percentage.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getUsageColor(percentage)}`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {metric.unlimited && (
                  <div className="mt-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Unlimited
                    </span>
                  </div>
                )}

                {isNearLimit && (
                  <div className="mt-3 p-2 bg-yellow-100 rounded-md">
                    <p className="text-xs text-yellow-800">
                      You're approaching your limit. Consider upgrading your plan.
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}