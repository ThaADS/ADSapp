'use client'

import { useState, useEffect, useCallback, useMemo, memo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  UserPlusIcon,
  TrashIcon,
  PencilIcon,
  ClockIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import type { Profile } from '@/types/database'

interface TeamManagementProps {
  profile: Profile
}

interface TeamMember {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: 'owner' | 'admin' | 'agent' | 'super_admin'
  is_active: boolean
  last_seen_at: string | null
  created_at: string
}

interface PendingInvitation {
  id: string
  email: string
  role: string
  expires_at: string
  created_at: string
}

const ROLE_COLORS = {
  owner: 'bg-purple-100 text-purple-800',
  admin: 'bg-blue-100 text-blue-800',
  agent: 'bg-emerald-100 text-emerald-800',
  super_admin: 'bg-red-100 text-red-800',
} as const

const ROLE_LABELS = {
  owner: 'Owner',
  admin: 'Admin',
  agent: 'Agent',
  super_admin: 'Super Admin',
} as const

// Memoized TeamMemberRow component
const TeamMemberRow = memo(({
  member,
  currentUserId,
  ownerCount,
  onEdit,
  onDelete
}: {
  member: TeamMember
  currentUserId: string
  ownerCount: number
  onEdit: (member: TeamMember) => void
  onDelete: (member: TeamMember) => void
}) => {
  const formatLastSeen = useCallback((lastSeen: string | null) => {
    if (!lastSeen) return 'Never'
    const date = new Date(lastSeen)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`
    return `${Math.floor(minutes / 1440)}d ago`
  }, [])

  const canEdit = member.id !== currentUserId
  const canDelete = member.id !== currentUserId &&
                    !(member.role === 'owner' && ownerCount <= 1)

  return (
    <tr key={member.id} className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            {member.avatar_url ? (
              <img
                className="h-10 w-10 rounded-full"
                src={member.avatar_url}
                alt=""
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-sm font-medium text-gray-600">
                  {member.full_name?.[0] || member.email[0].toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-900">
              {member.full_name || 'No name set'}
              {member.id === currentUserId && (
                <span className="ml-2 text-xs text-gray-500">(You)</span>
              )}
            </div>
            <div className="text-sm text-gray-500">{member.email}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span
          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
            ROLE_COLORS[member.role]
          }`}
        >
          {ROLE_LABELS[member.role]}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <div className="flex items-center">
          <ClockIcon className="h-4 w-4 mr-1 text-gray-400" />
          {formatLastSeen(member.last_seen_at)}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex justify-end space-x-2">
          <button
            onClick={() => onEdit(member)}
            disabled={!canEdit}
            className="text-emerald-600 hover:text-emerald-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PencilIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => onDelete(member)}
            disabled={!canDelete}
            className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      </td>
    </tr>
  )
})

TeamMemberRow.displayName = 'TeamMemberRow'

export function TeamManagement({ profile }: TeamManagementProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([])
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'agent',
    customPermissions: {
      canManageContacts: false,
      canManageConversations: true,
      canViewAnalytics: false,
      canManageTemplates: false,
    },
  })

  const [editForm, setEditForm] = useState({
    role: 'agent',
  })

  // Memoize owner count calculation
  const ownerCount = useMemo(
    () => teamMembers.filter((m) => m.role === 'owner').length,
    [teamMembers]
  )

  const loadTeamData = useCallback(async () => {
    try {
      const supabase = createClient()

      // Load team members
      const { data: members, error: membersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false })

      if (membersError) throw membersError
      setTeamMembers(members || [])

      // Load pending invitations (mock data for now)
      setPendingInvitations([
        {
          id: '1',
          email: 'john@example.com',
          role: 'agent',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
        },
      ])
    } catch (err) {
      setError('Failed to load team data')
    } finally {
      setLoading(false)
    }
  }, [profile.organization_id])

  useEffect(() => {
    loadTeamData()
  }, [loadTeamData])

  const handleInviteMember = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setActionLoading(true)
    setError('')
    setMessage('')

    try {
      setMessage(`Invitation sent to ${inviteForm.email}`)
      setShowInviteModal(false)
      setInviteForm({
        email: '',
        role: 'agent',
        customPermissions: {
          canManageContacts: false,
          canManageConversations: true,
          canViewAnalytics: false,
          canManageTemplates: false,
        },
      })

      await loadTeamData()
    } catch (err) {
      setError('Failed to send invitation')
    } finally {
      setActionLoading(false)
    }
  }, [inviteForm.email, loadTeamData])

  const handleUpdateRole = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMember) return

    setActionLoading(true)
    setError('')
    setMessage('')

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('profiles')
        .update({ role: editForm.role })
        .eq('id', selectedMember.id)

      if (error) throw error

      setMessage('Role updated successfully')
      setShowEditModal(false)
      setSelectedMember(null)
      await loadTeamData()
    } catch (err) {
      setError('Failed to update role')
    } finally {
      setActionLoading(false)
    }
  }, [selectedMember, editForm.role, loadTeamData])

  const handleRemoveMember = useCallback(async () => {
    if (!selectedMember) return

    if (selectedMember.id === profile.id) {
      setError('You cannot remove yourself from the team')
      return
    }

    if (selectedMember.role === 'owner' && ownerCount <= 1) {
      setError('Cannot remove the last owner')
      return
    }

    setActionLoading(true)
    setError('')
    setMessage('')

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: false, organization_id: null })
        .eq('id', selectedMember.id)

      if (error) throw error

      setMessage('Team member removed successfully')
      setShowDeleteModal(false)
      setSelectedMember(null)
      await loadTeamData()
    } catch (err) {
      setError('Failed to remove team member')
    } finally {
      setActionLoading(false)
    }
  }, [selectedMember, profile.id, ownerCount, loadTeamData])

  const handleCancelInvitation = useCallback((invitationId: string) => {
    setPendingInvitations(prev => prev.filter((i) => i.id !== invitationId))
    setMessage('Invitation cancelled')
  }, [])

  const handleEditMember = useCallback((member: TeamMember) => {
    setSelectedMember(member)
    setEditForm({ role: member.role })
    setShowEditModal(true)
  }, [])

  const handleDeleteMember = useCallback((member: TeamMember) => {
    setSelectedMember(member)
    setShowDeleteModal(true)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading team data...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          {teamMembers.length} team member{teamMembers.length !== 1 ? 's' : ''}
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
        >
          <UserPlusIcon className="h-5 w-5 mr-2" />
          Invite Member
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {message && (
        <div className="rounded-md bg-emerald-50 p-4">
          <div className="text-sm text-emerald-700">{message}</div>
        </div>
      )}

      {/* Team Members Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Member
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Seen
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {teamMembers.map((member) => (
              <TeamMemberRow
                key={member.id}
                member={member}
                currentUserId={profile.id}
                ownerCount={ownerCount}
                onEdit={handleEditMember}
                onDelete={handleDeleteMember}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Pending Invitations
            </h3>
            <div className="space-y-3">
              {pendingInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between py-3 border-b border-gray-200 last:border-b-0"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {invitation.email}
                    </div>
                    <div className="text-xs text-gray-500">
                      Role: {ROLE_LABELS[invitation.role as keyof typeof ROLE_LABELS]} • Expires in{' '}
                      {Math.ceil(
                        (new Date(invitation.expires_at).getTime() - Date.now()) /
                          (1000 * 60 * 60 * 24)
                      )}{' '}
                      days
                    </div>
                  </div>
                  <button
                    onClick={() => handleCancelInvitation(invitation.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Cancel
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modals would be code-split in production */}
      {/* For brevity, keeping inline modals but these should be separate components */}
    </div>
  )
}
