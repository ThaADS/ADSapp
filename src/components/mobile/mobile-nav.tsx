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
  ChartBarIcon,
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
      <div className='fixed top-4 left-4 z-50 lg:hidden'>
        <button
          type='button'
          className='rounded-md bg-white p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:ring-2 focus:ring-green-500 focus:outline-none focus:ring-inset'
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className='sr-only'>Open main menu</span>
          {isOpen ? (
            <XMarkIcon className='block h-6 w-6' aria-hidden='true' />
          ) : (
            <Bars3Icon className='block h-6 w-6' aria-hidden='true' />
          )}
        </button>
      </div>

      {/* Mobile menu overlay */}
      {isOpen && (
        <div className='fixed inset-0 z-40 flex lg:hidden'>
          <div
            className='bg-opacity-75 fixed inset-0 bg-gray-600'
            onClick={() => setIsOpen(false)}
          />

          <div className='relative flex w-full max-w-xs flex-1 flex-col bg-white'>
            <div className='h-0 flex-1 overflow-y-auto pt-5 pb-4'>
              <div className='flex flex-shrink-0 items-center px-4'>
                <div className='text-xl font-bold text-green-600'>ADSapp</div>
              </div>

              <div className='mt-8 px-4'>
                <div className='text-sm'>
                  <div className='font-semibold text-gray-900'>{profile.organization?.name}</div>
                  <div className='text-gray-500'>{profile.full_name}</div>
                  <div className='text-xs text-gray-400'>{profile.role}</div>
                </div>
              </div>

              <nav className='mt-8 space-y-1 px-2'>
                {navigation.map(item => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`group flex items-center rounded-md px-2 py-2 text-base font-medium ${
                        isActive
                          ? 'bg-green-100 text-green-900'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      } `}
                      onClick={() => setIsOpen(false)}
                    >
                      <item.icon
                        className={`mr-4 h-6 w-6 flex-shrink-0 ${isActive ? 'text-green-500' : 'text-gray-400 group-hover:text-gray-500'} `}
                        aria-hidden='true'
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
