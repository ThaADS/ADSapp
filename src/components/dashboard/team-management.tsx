'use client'

import { useState, useEffect, useCallback, memo } from 'react'
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
}

const ROLE_LABELS = {
  owner: 'Owner',
  admin: 'Admin',
  agent: 'Agent',
  super_admin: 'Super Admin',
}

function TeamManagementComponent({ profile }: TeamManagementProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [pendingInvitations, setPendingInvitations] = useState<
    PendingInvitation[]
  >([])
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

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionLoading(true)
    setError('')
    setMessage('')

    try {
      // In production, this would send an invitation email
      // For now, we'll show a success message
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

      // Refresh pending invitations
      await loadTeamData()
    } catch (err) {
      setError('Failed to send invitation')
    } finally {
      setActionLoading(false)
    }
  }

  const handleUpdateRole = async (e: React.FormEvent) => {
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
  }

  const handleRemoveMember = async () => {
    if (!selectedMember) return

    // Prevent removing yourself
    if (selectedMember.id === profile.id) {
      setError('You cannot remove yourself from the team')
      return
    }

    // Prevent removing last owner
    const ownerCount = teamMembers.filter((m) => m.role === 'owner').length
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
  }

  const handleCancelInvitation = async (invitationId: string) => {
    // In production, this would cancel the invitation
    setPendingInvitations(pendingInvitations.filter((i) => i.id !== invitationId))
    setMessage('Invitation cancelled')
  }

  const formatLastSeen = (lastSeen: string | null) => {
    if (!lastSeen) return 'Never'
    const date = new Date(lastSeen)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`
    return `${Math.floor(minutes / 1440)}d ago`
  }

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
          className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 text-sm font-medium"
        >
          <UserPlusIcon className="h-5 w-5 mr-2" />
          Invite Member
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {message && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
          <div className="text-sm text-emerald-700">{message}</div>
        </div>
      )}

      {/* Team Members Table */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
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
                        {member.id === profile.id && (
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
                      onClick={() => {
                        setSelectedMember(member)
                        setEditForm({ role: member.role })
                        setShowEditModal(true)
                      }}
                      disabled={member.id === profile.id}
                      className="text-emerald-600 hover:text-emerald-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedMember(member)
                        setShowDeleteModal(true)
                      }}
                      disabled={
                        member.id === profile.id ||
                        (member.role === 'owner' &&
                          teamMembers.filter((m) => m.role === 'owner').length <=
                            1)
                      }
                      className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
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

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Invite Team Member
                </h3>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleInviteMember} className="px-6 py-4 space-y-4">
              <div>
                <label
                  htmlFor="invite-email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Email Address
                </label>
                <input
                  type="email"
                  id="invite-email"
                  required
                  value={inviteForm.email}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, email: e.target.value })
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm px-3 py-2"
                  placeholder="colleague@example.com"
                />
              </div>

              <div>
                <label
                  htmlFor="invite-role"
                  className="block text-sm font-medium text-gray-700"
                >
                  Role
                </label>
                <select
                  id="invite-role"
                  value={inviteForm.role}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, role: e.target.value })
                  }
                  className="mt-1 block w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm px-3 py-2"
                >
                  {profile.role === 'owner' && <option value="owner">Owner</option>}
                  <option value="admin">Admin</option>
                  <option value="agent">Agent</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Permissions
                </label>
                <div className="space-y-2">
                  {Object.entries(inviteForm.customPermissions).map(
                    ([key, value]) => (
                      <label key={key} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={value}
                          onChange={(e) =>
                            setInviteForm({
                              ...inviteForm,
                              customPermissions: {
                                ...inviteForm.customPermissions,
                                [key]: e.target.checked,
                              },
                            })
                          }
                          className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {key
                            .replace(/([A-Z])/g, ' $1')
                            .replace(/^./, (str) => str.toUpperCase())}
                        </span>
                      </label>
                    )
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {showEditModal && selectedMember && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Edit Role</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleUpdateRole} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Member
                </label>
                <div className="text-sm text-gray-900">
                  {selectedMember.full_name || selectedMember.email}
                </div>
              </div>

              <div>
                <label
                  htmlFor="edit-role"
                  className="block text-sm font-medium text-gray-700"
                >
                  New Role
                </label>
                <select
                  id="edit-role"
                  value={editForm.role}
                  onChange={(e) => setEditForm({ role: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm px-3 py-2"
                >
                  {profile.role === 'owner' && <option value="owner">Owner</option>}
                  <option value="admin">Admin</option>
                  <option value="agent">Agent</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? 'Updating...' : 'Update Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedMember && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  Remove Team Member
                </h3>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="px-6 py-4">
              <p className="text-sm text-gray-500">
                Are you sure you want to remove{' '}
                <span className="font-medium text-gray-900">
                  {selectedMember.full_name || selectedMember.email}
                </span>{' '}
                from your team? This action cannot be undone.
              </p>

              <div className="flex justify-end space-x-3 pt-6">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRemoveMember}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? 'Removing...' : 'Remove Member'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export const TeamManagement = memo(TeamManagementComponent)
