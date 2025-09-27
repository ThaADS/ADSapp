'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getUserProfile } from '@/lib/auth'
import { BellIcon, ChevronDownIcon } from '@heroicons/react/24/outline'

export function AdminHeader() {
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      const response = await fetch('/api/auth/signout', {
        method: 'POST',
      })
      if (response.ok) {
        router.push('/auth/signin')
      }
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <Link href="/admin" className="text-xl font-bold text-gray-900">
            WhatsApp Inbox Pro - Admin
          </Link>
        </div>

        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <button className="p-2 text-gray-500 hover:text-gray-700 relative">
            <BellIcon className="h-6 w-6" />
            <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white"></span>
          </button>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center space-x-2 p-2 text-gray-700 hover:text-gray-900 rounded-md"
            >
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-white">SA</span>
              </div>
              <ChevronDownIcon className="h-4 w-4" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                <div className="py-1">
                  <Link
                    href="/dashboard"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Regular Dashboard
                  </Link>
                  <Link
                    href="/admin/profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Admin Profile
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}