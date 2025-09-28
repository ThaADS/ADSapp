'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bars3Icon,
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  UsersIcon,
  DocumentTextIcon,
  CogIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'

interface MobileNavProps {
  profile: any
}

export function MobileNav({ profile }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  const navigation = [
    { name: 'Inbox', href: '/dashboard/inbox', icon: ChatBubbleLeftRightIcon },
    { name: 'Contacts', href: '/dashboard/contacts', icon: UsersIcon },
    { name: 'Templates', href: '/dashboard/templates', icon: DocumentTextIcon },
    { name: 'Automation', href: '/dashboard/automation', icon: CogIcon },
    { name: 'Analytics', href: '/dashboard/analytics', icon: ChartBarIcon },
  ]

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          type="button"
          className="bg-white p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-500"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="sr-only">Open main menu</span>
          {isOpen ? (
            <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
          ) : (
            <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Mobile menu overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setIsOpen(false)} />
          
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
            <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
              <div className="flex-shrink-0 flex items-center px-4">
                <div className="text-xl font-bold text-green-600">ADSapp</div>
              </div>
              
              <div className="mt-8 px-4">
                <div className="text-sm">
                  <div className="font-semibold text-gray-900">{profile.organization?.name}</div>
                  <div className="text-gray-500">{profile.full_name}</div>
                  <div className="text-xs text-gray-400">{profile.role}</div>
                </div>
              </div>

              <nav className="mt-8 px-2 space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`
                        group flex items-center px-2 py-2 text-base font-medium rounded-md
                        ${isActive
                          ? 'bg-green-100 text-green-900'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }
                      `}
                      onClick={() => setIsOpen(false)}
                    >
                      <item.icon
                        className={`
                          mr-4 flex-shrink-0 h-6 w-6
                          ${isActive ? 'text-green-500' : 'text-gray-400 group-hover:text-gray-500'}
                        `}
                        aria-hidden="true"
                      />
                      {item.name}
                    </Link>
                  )
                })}
              </nav>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
