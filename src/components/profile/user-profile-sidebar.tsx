'use client'

import { useEffect, useState } from 'react'
import { X, Mail, Shield, User, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface UserProfile {
  id: string
  full_name: string | null
  email: string
  avatar_url: string | null
  role: string
  created_at: string
}

interface UserProfileSidebarProps {
  userId: string | null
  onClose: () => void
}

/**
 * Sidebar panel showing user profile details
 * Opens when clicking on a mention in notes
 */
export function UserProfileSidebar({ userId, onClose }: UserProfileSidebarProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) {
      setProfile(null)
      setError(null)
      return
    }

    async function fetchProfile() {
      setLoading(true)
      setError(null)

      try {
        const supabase = createClient()

        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url, role, created_at')
          .eq('id', userId)
          .single()

        if (fetchError) {
          console.error('Error fetching profile:', fetchError)
          setError('Could not load profile')
          setProfile(null)
        } else {
          setProfile(data)
        }
      } catch (err) {
        console.error('Error fetching profile:', err)
        setError('An error occurred')
        setProfile(null)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [userId])

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (userId) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => document.removeEventListener('keydown', handleEscape)
  }, [userId, onClose])

  if (!userId) return null

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-NL', {
      year: 'numeric',
      month: 'long',
    })
  }

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'owner':
        return 'text-purple-600 bg-purple-100'
      case 'admin':
        return 'text-blue-600 bg-blue-100'
      case 'agent':
        return 'text-green-600 bg-green-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <div
        className="fixed inset-y-0 right-0 w-80 bg-white shadow-xl z-50 flex flex-col"
        role="dialog"
        aria-label="User profile"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="font-semibold text-gray-900">Team Member</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close profile"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-gray-500">
              <User className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>{error}</p>
            </div>
          ) : profile ? (
            <div className="space-y-6">
              {/* Avatar and name */}
              <div className="text-center">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name || 'User'}
                    className="h-24 w-24 rounded-full mx-auto object-cover border-4 border-gray-100"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-emerald-100 mx-auto flex items-center justify-center border-4 border-gray-100">
                    <User className="h-12 w-12 text-emerald-600" />
                  </div>
                )}
                <h3 className="mt-4 text-xl font-semibold text-gray-900">
                  {profile.full_name || 'No name set'}
                </h3>
                <span
                  className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium capitalize ${getRoleColor(profile.role)}`}
                >
                  {profile.role}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Mail className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm text-gray-900 truncate">{profile.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Shield className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-500">Role</p>
                    <p className="text-sm text-gray-900 capitalize">{profile.role}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-gray-500">Member since</p>
                    <p className="text-sm text-gray-900">{formatDate(profile.created_at)}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <User className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>User not found</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default UserProfileSidebar
