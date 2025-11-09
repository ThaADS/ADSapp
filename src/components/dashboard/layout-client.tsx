'use client'

import { useState } from 'react'
import { DashboardNav } from '@/components/dashboard/nav'
import { DashboardHeader } from '@/components/dashboard/header'
import type { Profile } from '@/types/database'

interface DashboardLayoutClientProps {
  profile: Profile
  children: React.ReactNode
}

export function DashboardLayoutClient({ profile, children }: DashboardLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className='min-h-screen bg-gray-50'>
      <DashboardNav profile={profile} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className='lg:pl-64'>
        <DashboardHeader profile={profile} onMenuClick={() => setSidebarOpen(true)} />
        <main className='py-8'>
          <div className='px-4 sm:px-6 lg:px-8'>{children}</div>
        </main>
      </div>
    </div>
  )
}
