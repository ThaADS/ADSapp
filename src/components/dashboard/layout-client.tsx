'use client'

import { useState, useCallback, useMemo, memo } from 'react'
import { DashboardNav } from '@/components/dashboard/nav'
import { DashboardHeader } from '@/components/dashboard/header'
import { MobileBottomNav } from '@/components/ui/responsive/mobile-nav'
import type { Profile } from '@/types/database'

interface DashboardLayoutClientProps {
  profile: Profile
  children: React.ReactNode
}

// ⚡ PERFORMANCE: Memoized icons - defined outside component to prevent recreation
const DashboardIcon = memo(() => (
  <svg className='h-6 w-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2v0' />
  </svg>
))
DashboardIcon.displayName = 'DashboardIcon'

const InboxIcon = memo(() => (
  <svg className='h-6 w-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4' />
  </svg>
))
InboxIcon.displayName = 'InboxIcon'

const UsersIcon = memo(() => (
  <svg className='h-6 w-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a4 4 0 11-8 0 4 4 0 018 0z' />
  </svg>
))
UsersIcon.displayName = 'UsersIcon'

const SettingsIcon = memo(() => (
  <svg className='h-6 w-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' />
    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 12a3 3 0 11-6 0 3 3 0 016 0z' />
  </svg>
))
SettingsIcon.displayName = 'SettingsIcon'

function DashboardLayoutClientInner({ profile, children }: DashboardLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // ⚡ PERFORMANCE: Memoize nav items to prevent recreation on every render
  const mobileNavItems = useMemo(() => [
    { name: 'Dashboard', href: '/dashboard', icon: <DashboardIcon /> },
    { name: 'Inbox', href: '/dashboard/inbox', icon: <InboxIcon /> },
    { name: 'Contacts', href: '/dashboard/contacts', icon: <UsersIcon /> },
    { name: 'Settings', href: '/dashboard/settings', icon: <SettingsIcon /> },
  ], [])

  // ⚡ PERFORMANCE: Memoize callbacks to prevent child re-renders
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])
  const openSidebar = useCallback(() => setSidebarOpen(true), [])

  return (
    <div className='min-h-screen bg-gray-50'>
      <DashboardNav profile={profile} isOpen={sidebarOpen} onClose={closeSidebar} />
      <div className='lg:pl-64'>
        <DashboardHeader profile={profile} organizationId={profile.organization_id} onMenuClick={openSidebar} />
        <main className='py-4 sm:py-8 pb-20 md:pb-8'>
          <div className='px-4 sm:px-6 lg:px-8'>{children}</div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav items={mobileNavItems} />
    </div>
  )
}

// ⚡ PERFORMANCE: Memoize the entire layout component
export const DashboardLayoutClient = memo(DashboardLayoutClientInner)
DashboardLayoutClient.displayName = 'DashboardLayoutClient'
