'use client'

import { useState, useCallback, memo } from 'react'
import { useRouter } from 'next/navigation'
import { CommandPalette } from '@/components/search/command-palette'

// ⚡ PERFORMANCE: Memoized icons
const MenuIcon = memo(() => (
  <svg className='h-6 w-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={2}
      d='M4 6h16M4 12h16M4 18h16'
    />
  </svg>
))
MenuIcon.displayName = 'MenuIcon'

const BellIcon = memo(() => (
  <svg className='h-6 w-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
    <path
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={2}
      d='M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9'
    />
  </svg>
))
BellIcon.displayName = 'BellIcon'

interface DashboardHeaderProps {
  profile: {
    id: string
    full_name: string | null
    email: string | null
    organization_id: string | null
    role: 'owner' | 'admin' | 'agent' | null
  }
  organizationId?: string
  onMenuClick?: () => void
}

function DashboardHeaderInner({ profile, organizationId, onMenuClick }: DashboardHeaderProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const router = useRouter()

  // ⚡ PERFORMANCE: Memoize callbacks
  const toggleUserMenu = useCallback(() => setUserMenuOpen(prev => !prev), [])

  const handleSignOut = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/signout', {
        method: 'POST',
      })

      if (response.ok) {
        // Redirect to homepage
        router.push('/')
        router.refresh()
      }
    } catch (error) {
      console.error('Signout error:', error)
    }
  }, [router])

  return (
    <div className='sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8'>
      <button
        type='button'
        onClick={onMenuClick}
        className='-m-2.5 p-2.5 text-gray-700 hover:text-gray-900 lg:hidden'
      >
        <span className='sr-only'>Open sidebar</span>
        <MenuIcon />
      </button>

      {/* Separator */}
      <div className='h-6 w-px bg-gray-900/10 lg:hidden' aria-hidden='true' />

      <div className='flex flex-1 gap-x-4 self-stretch lg:gap-x-6'>
        <div className='flex items-center gap-x-4 lg:gap-x-6'>
          {/* Global Search Command Palette */}
          {organizationId && <CommandPalette organizationId={organizationId} />}
        </div>

        <div className='flex items-center gap-x-4 lg:gap-x-6'>
          <button type='button' className='-m-2.5 p-2.5 text-gray-400 hover:text-gray-500'>
            <span className='sr-only'>View notifications</span>
            <BellIcon />
          </button>

          {/* Profile dropdown */}
          <div className='relative'>
            <button
              type='button'
              className='-m-1.5 flex items-center p-1.5'
              onClick={toggleUserMenu}
            >
              <span className='sr-only'>Open user menu</span>
              <div className='flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500'>
                <span className='text-sm font-medium text-white'>
                  {profile.full_name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <span className='hidden lg:flex lg:items-center'>
                <span className='ml-4 text-sm leading-6 font-semibold text-gray-900'>
                  {profile.full_name}
                </span>
                <svg className='ml-2 h-5 w-5 text-gray-400' viewBox='0 0 20 20' fill='currentColor'>
                  <path
                    fillRule='evenodd'
                    d='M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z'
                    clipRule='evenodd'
                  />
                </svg>
              </span>
            </button>

            {userMenuOpen && (
              <div className='absolute right-0 z-10 mt-2.5 w-32 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 focus:outline-none'>
                <a
                  href='/dashboard/settings/profile'
                  className='block px-3 py-1 text-sm leading-6 text-gray-900 hover:bg-gray-50'
                >
                  Profile
                </a>
                <button
                  onClick={handleSignOut}
                  className='block w-full px-3 py-1 text-left text-sm leading-6 text-gray-900 hover:bg-gray-50'
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ⚡ PERFORMANCE: Memoize header component
export const DashboardHeader = memo(DashboardHeaderInner)
DashboardHeader.displayName = 'DashboardHeader'
