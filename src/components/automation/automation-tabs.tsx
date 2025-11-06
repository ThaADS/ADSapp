'use client'

/**
 * Automation Tabs - Navigation for Automation Features
 * Provides tabbed interface for Workflow Builder, Capacity Dashboard, and Escalation Manager
 */

import { useState } from 'react'
import { Squares2X2Icon, UsersIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import WorkflowBuilder from './workflow-builder'
import CapacityDashboard from './capacity-dashboard'

interface AutomationTabsProps {
  organizationId: string
}

type TabId = 'workflows' | 'capacity' | 'escalations'

interface Tab {
  id: TabId
  name: string
  icon: typeof Squares2X2Icon
  description: string
}

const tabs: Tab[] = [
  {
    id: 'workflows',
    name: 'Workflow Builder',
    icon: Squares2X2Icon,
    description: 'Visual drag-and-drop automation builder',
  },
  {
    id: 'capacity',
    name: 'Agent Capacity',
    icon: UsersIcon,
    description: 'Real-time agent monitoring and load balancing',
  },
  {
    id: 'escalations',
    name: 'Escalation Rules',
    icon: ExclamationTriangleIcon,
    description: 'Manage escalation policies and SLA monitoring',
  },
]

export default function AutomationTabs({ organizationId }: AutomationTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('workflows')

  return (
    <div className='space-y-6'>
      {/* Tab Navigation */}
      <div className='border-b border-gray-200'>
        <nav className='-mb-px flex space-x-8' aria-label='Automation Tabs'>
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group inline-flex items-center border-b-2 px-1 py-4 text-sm font-medium ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                } `}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon
                  className={`mr-2 -ml-0.5 h-5 w-5 ${isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'} `}
                  aria-hidden='true'
                />
                <span>{tab.name}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Description */}
      <div className='rounded-lg border border-blue-200 bg-blue-50 p-4'>
        <p className='text-sm text-blue-800'>{tabs.find(t => t.id === activeTab)?.description}</p>
      </div>

      {/* Tab Content */}
      <div className='mt-6'>
        {activeTab === 'workflows' && <WorkflowBuilder organizationId={organizationId} />}

        {activeTab === 'capacity' && <CapacityDashboard organizationId={organizationId} />}

        {activeTab === 'escalations' && (
          <div className='rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm'>
            <ExclamationTriangleIcon className='mx-auto mb-4 h-16 w-16 text-gray-400' />
            <h3 className='mb-2 text-lg font-medium text-gray-900'>Escalation Rules Manager</h3>
            <p className='mb-4 text-sm text-gray-600'>
              Define escalation policies based on response time, priority, and agent availability
            </p>
            <div className='inline-flex items-center rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700'>
              🚧 Coming Soon - SLA Monitoring & Escalation Policies
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
