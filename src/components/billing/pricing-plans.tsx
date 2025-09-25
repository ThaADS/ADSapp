interface PricingPlansProps {
  plans: any
  currentPlan: string
  onUpgrade: (planId: string) => void
  isLoading: boolean
}

export function PricingPlans({ plans, currentPlan, onUpgrade, isLoading }: PricingPlansProps) {
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">Available Plans</h2>
        <p className="text-sm text-gray-500">Choose the plan that fits your needs</p>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {Object.entries(plans).map(([planId, plan]: [string, any]) => {
            const isCurrent = planId === currentPlan

            return (
              <div
                key={planId}
                className={`border rounded-lg p-6 relative ${
                  isCurrent
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {isCurrent && (
                  <span className="absolute top-0 right-0 -mt-2 -mr-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                    Current
                  </span>
                )}

                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{plan.description}</p>

                  <div className="mt-4">
                    <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                    <span className="text-gray-500">/{plan.interval}</span>
                  </div>
                </div>

                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <svg
                        className="h-5 w-5 text-green-500 mr-3 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="text-sm text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6">
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-2 px-4 border border-green-300 rounded-md text-sm font-medium text-green-700 bg-green-50 cursor-not-allowed"
                    >
                      Current Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => onUpgrade(planId)}
                      disabled={isLoading}
                      className="w-full py-2 px-4 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isLoading ? 'Loading...' : 'Upgrade'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>All plans include a 14-day free trial. Cancel anytime.</p>
          <p className="mt-1">Need a custom plan? <a href="mailto:sales@adsapp.com" className="text-green-600 hover:text-green-500">Contact us</a></p>
        </div>
      </div>
    </div>
  )
}