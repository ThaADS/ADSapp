'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Simple SVG icons until we can install @heroicons/react
const DashboardIcon = () => (
  <svg className='h-6 w-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={2}
      d='M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2v0'
    />
  </svg>
)

const InboxIcon = () => (
  <svg className='h-6 w-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={2}
      d='M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4'
    />
  </svg>
)

const ChatIcon = () => (
  <svg className='h-6 w-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={2}
      d='M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'
    />
  </svg>
)

const UsersIcon = () => (
  <svg className='h-6 w-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={2}
      d='M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a4 4 0 11-8 0 4 4 0 018 0z'
    />
  </svg>
)

const DocumentIcon = () => (
  <svg className='h-6 w-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={2}
      d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
    />
  </svg>
)

const BoltIcon = () => (
  <svg className='h-6 w-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={2}
      d='M13 10V3L4 14h7v7l9-11h-7z'
    />
  </svg>
)

const PhoneIcon = () => (
  <svg className='h-6 w-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={2}
      d='M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z'
    />
  </svg>
)

const SettingsIcon = () => (
  <svg className='h-6 w-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={2}
      d='M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'
    />
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={2}
      d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
    />
  </svg>
)

const HelpIcon = () => (
  <svg className='h-6 w-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={2}
      d='M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    />
  </svg>
)

const WorkflowIcon = () => (
  <svg className='h-6 w-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={2}
      d='M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 17a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2zM14 17a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1v-2z'
    />
  </svg>
)

const BroadcastIcon = () => (
  <svg className='h-6 w-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={2}
      d='M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z'
    />
  </svg>
)

const DripIcon = () => (
  <svg className='h-6 w-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={2}
      d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
    />
  </svg>
)

const AnalyticsIcon = () => (
  <svg className='h-6 w-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={2}
      d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
    />
  </svg>
)

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: DashboardIcon },
  { name: 'Inbox', href: '/dashboard/inbox', icon: InboxIcon },
  { name: 'Contacts', href: '/dashboard/contacts', icon: UsersIcon },
  { name: 'Templates', href: '/dashboard/templates', icon: DocumentIcon },
  { name: 'Workflows', href: '/dashboard/workflows', icon: WorkflowIcon },
  { name: 'Broadcast', href: '/dashboard/broadcast', icon: BroadcastIcon },
  { name: 'Drip Campaigns', href: '/dashboard/drip-campaigns', icon: DripIcon },
  { name: 'Analytics', href: '/dashboard/analytics/advanced', icon: AnalyticsIcon },
  { name: 'Automation', href: '/dashboard/automation', icon: BoltIcon },
  { name: 'WhatsApp', href: '/dashboard/whatsapp', icon: PhoneIcon },
  { name: 'Settings', href: '/dashboard/settings', icon: SettingsIcon },
  { name: 'Help', href: '/dashboard/help', icon: HelpIcon },
]

const CloseIcon = () => (
  <svg className='h-6 w-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={2}
      d='M6 18L18 6M6 6l12 12'
    />
  </svg>
)

interface DashboardNavProps {
  profile: any // TODO: Type this properly
  isOpen?: boolean
  onClose?: () => void
}

export function DashboardNav({ profile, isOpen = false, onClose }: DashboardNavProps) {
  const pathname = usePathname()

  // Shared sidebar content component
  const SidebarContent = () => (
    <div className='flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6 pb-4'>
      <div className='flex h-16 shrink-0 items-center justify-between'>
        <div className='text-xl font-bold text-emerald-600'>ADSapp</div>
        {/* Close button only visible on mobile */}
        {onClose && (
          <button
            onClick={onClose}
            className='lg:hidden rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500'
            aria-label='Sluit menu'
          >
            <CloseIcon />
          </button>
        )}
      </div>

      <div className='text-sm'>
        <div className='font-semibold text-gray-900'>{profile.organization?.name}</div>
        <div className='text-gray-500'>{profile.full_name}</div>
        <div className='text-xs text-gray-400'>{profile.role}</div>
      </div>

      <nav className='flex flex-1 flex-col'>
        <ul role='list' className='flex flex-1 flex-col gap-y-7'>
          <li>
            <ul role='list' className='-mx-2 space-y-1'>
              {navigation.map(item => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href))

                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      prefetch={true}
                      onClick={onClose}
                      className={`group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-700'
                      } `}
                    >
                      <item.icon />
                      {item.name}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </li>
        </ul>
      </nav>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar - Always visible on large screens */}
      <div className='hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col'>
        <SidebarContent />
      </div>

      {/* Mobile Sidebar - Slides in from left */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className='fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity duration-300'
            onClick={onClose}
            aria-hidden='true'
          />

          {/* Sidebar */}
          <div
            className={`fixed inset-y-0 left-0 z-50 w-64 lg:hidden transition-transform duration-300 ease-in-out ${
              isOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <SidebarContent />
          </div>
        </>
      )}
    </>
  )
}
