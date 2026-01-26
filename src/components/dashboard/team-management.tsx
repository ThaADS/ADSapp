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
import { useTranslations } from '@/components/providers/translation-provider'
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
  const t = useTranslations('settings')
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
      setError(t('team.loadError'))
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
      setMessage(t('team.invitationSent', { email: inviteForm.email }))
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
      setError(t('team.inviteSentError'))
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

      setMessage(t('team.roleUpdated'))
      setShowEditModal(false)
      setSelectedMember(null)
      await loadTeamData()
    } catch (err) {
      setError(t('team.updateRoleError'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleRemoveMember = async () => {
    if (!selectedMember) return

    // Prevent removing yourself
    if (selectedMember.id === profile.id) {
      setError(t('team.removeSelfError'))
      return
    }

    // Prevent removing last owner
    const ownerCount = teamMembers.filter(m => m.role === 'owner').length
    if (selectedMember.role === 'owner' && ownerCount <= 1) {
      setError(t('team.lastOwnerError'))
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

      setMessage(t('team.memberRemoved'))
      setShowDeleteModal(false)
      setSelectedMember(null)
      await loadTeamData()
    } catch (err) {
      setError(t('team.removeMemberError'))
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    // In production, this would cancel the invitation
    setPendingInvitations(pendingInvitations.filter(i => i.id !== invitationId))
    setMessage(t('team.invitationCancelled'))
  }

  const formatLastSeen = (lastSeen: string | null) => {
    if (!lastSeen) return t('team.never')
    const date = new Date(lastSeen)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)

    if (minutes < 1) return t('profile.time.justNow')
    if (minutes < 60) return `${minutes}${t('dashboard.time.m')} ${t('dashboard.activity.ago')}`
    if (minutes < 1440) return `${Math.floor(minutes / 60)}${t('dashboard.time.h')} ${t('dashboard.activity.ago')}`
    return `${Math.floor(minutes / 1440)}${t('dashboard.time.d')} ${t('dashboard.activity.ago')}`
  }

  if (loading) {
    return (
      <div className='flex h-64 items-center justify-center'>
        <div className='text-gray-500'>{t('team.loading')}</div>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Header Actions */}
      <div className='flex items-center justify-between'>
        <div className='text-sm text-gray-600'>
          {teamMembers.length === 1 ? t('team.memberCountSingle', { count: 1 }) : t('team.membersCount', { count: teamMembers.length })}
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className='inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:outline-none'
        >
          <UserPlusIcon className='mr-2 h-5 w-5' />
          {t('team.actionInvite')}
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className='rounded-lg border border-red-200 bg-red-50 p-4'>
          <div className='text-sm text-red-700'>{error}</div>
        </div>
      )}

      {message && (
        <div className='rounded-lg border border-emerald-200 bg-emerald-50 p-4'>
          <div className='text-sm text-emerald-700'>{message}</div>
        </div>
      )}

      {/* Team Members Table */}
      <div className='overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm'>
        <table className='min-w-full divide-y divide-gray-200'>
          <thead className='bg-gray-50'>
            <tr>
              <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase'>
                {t('team.table.member')}
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase'>
                {t('team.table.role')}
              </th>
              <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase'>
                {t('team.table.lastSeen')}
              </th>
              <th className='px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase'>
                {t('team.table.actions')}
              </th>
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-200 bg-white'>
            {teamMembers.map(member => (
              <tr key={member.id} className='hover:bg-gray-50'>
                <td className='px-6 py-4 whitespace-nowrap'>
                  <div className='flex items-center'>
                    <div className='h-10 w-10 flex-shrink-0'>
                      {member.avatar_url ? (
                        <img className='h-10 w-10 rounded-full' src={member.avatar_url} alt='' />
                      ) : (
                        <div className='flex h-10 w-10 items-center justify-center rounded-full bg-gray-300'>
                          <span className='text-sm font-medium text-gray-600'>
                            {member.full_name?.[0] || member.email[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className='ml-4'>
                      <div className='text-sm font-medium text-gray-900'>
                        {member.full_name || t('team.noNameSet')}
                        {member.id === profile.id && (
                          <span className='ml-2 text-xs text-gray-500'>({t('team.you')})</span>
                        )}
                      </div>
                      <div className='text-sm text-gray-500'>{member.email}</div>
                    </div>
                  </div>
                </td>
                <td className='px-6 py-4 whitespace-nowrap'>
                  <span
                    className={`inline-flex rounded-full px-2 text-xs leading-5 font-semibold ${ROLE_COLORS[member.role]
                      }`}
                  >
                    {t(`team.roles.${member.role}` as any)}
                  </span>
                </td>
                <td className='px-6 py-4 text-sm whitespace-nowrap text-gray-500'>
                  <div className='flex items-center'>
                    <ClockIcon className='mr-1 h-4 w-4 text-gray-400' />
                    {formatLastSeen(member.last_seen_at)}
                  </div>
                </td>
                <td className='px-6 py-4 text-right text-sm font-medium whitespace-nowrap'>
                  <div className='flex justify-end space-x-2'>
                    <button
                      onClick={() => {
                        setSelectedMember(member)
                        setEditForm({ role: member.role })
                        setShowEditModal(true)
                      }}
                      disabled={member.id === profile.id}
                      className='text-emerald-600 hover:text-emerald-900 disabled:cursor-not-allowed disabled:opacity-50'
                      title={t('team.editRole')}
                    >
                      <PencilIcon className='h-5 w-5' />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedMember(member)
                        setShowDeleteModal(true)
                      }}
                      disabled={
                        member.id === profile.id ||
                        (member.role === 'owner' &&
                          teamMembers.filter(m => m.role === 'owner').length <= 1)
                      }
                      className='text-red-600 hover:text-red-900 disabled:cursor-not-allowed disabled:opacity-50'
                      title={t('team.removeMember')}
                    >
                      <TrashIcon className='h-5 w-5' />
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
        <div className='rounded-lg border border-gray-200 bg-white shadow-sm'>
          <div className='p-6'>
            <h3 className='mb-4 text-lg font-semibold text-gray-900'>{t('team.pendingInvitations')}</h3>
            <div className='space-y-3'>
              {pendingInvitations.map(invitation => (
                <div
                  key={invitation.id}
                  className='flex items-center justify-between border-b border-gray-200 py-3 last:border-b-0'
                >
                  <div className='flex-1'>
                    <div className='text-sm font-medium text-gray-900'>{invitation.email}</div>
                    <div className='text-xs text-gray-500'>
                      {t('team.table.role')}: {t(`team.roles.${invitation.role}` as any)} • {t('team.expiresInDays', {
                        days: Math.ceil(
                          (new Date(invitation.expires_at).getTime() - Date.now()) /
                          (1000 * 60 * 60 * 24)
                        )
                      })}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCancelInvitation(invitation.id)}
                    className='text-red-600 hover:text-red-900'
                  >
                    {t('team.cancel')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className='bg-opacity-75 fixed inset-0 z-50 flex items-center justify-center bg-gray-500/50 backdrop-blur-sm'>
          <div className='mx-4 w-full max-w-md rounded-lg bg-white shadow-xl'>
            <div className='border-b border-gray-200 px-6 py-4'>
              <div className='flex items-center justify-between'>
                <h3 className='text-lg font-medium text-gray-900'>{t('team.actionInvite')}</h3>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className='text-gray-400 hover:text-gray-500'
                >
                  <XMarkIcon className='h-6 w-6' />
                </button>
              </div>
            </div>

            <form onSubmit={handleInviteMember} className='space-y-4 px-6 py-4'>
              <div>
                <label htmlFor='invite-email' className='block text-sm font-medium text-gray-700'>
                  {t('profile.email')}
                </label>
                <input
                  type='email'
                  id='invite-email'
                  required
                  value={inviteForm.email}
                  onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className='mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 sm:text-sm'
                  placeholder='colleague@example.com'
                />
              </div>

              <div>
                <label htmlFor='invite-role' className='block text-sm font-medium text-gray-700'>
                  {t('team.table.role')}
                </label>
                <select
                  id='invite-role'
                  value={inviteForm.role}
                  onChange={e => setInviteForm({ ...inviteForm, role: e.target.value })}
                  className='mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 sm:text-sm'
                >
                  {profile.role === 'owner' && <option value='owner'>{t('team.roles.owner')}</option>}
                  <option value='admin'>{t('team.roles.admin')}</option>
                  <option value='agent'>{t('team.roles.agent')}</option>
                </select>
              </div>

              <div>
                <label className='mb-2 block text-sm font-medium text-gray-700'>
                  Custom Permissions
                </label>
                <div className='space-y-2'>
                  {Object.entries(inviteForm.customPermissions).map(([key, value]) => (
                    <label key={key} className='flex items-center'>
                      <input
                        type='checkbox'
                        checked={value}
                        onChange={e =>
                          setInviteForm({
                            ...inviteForm,
                            customPermissions: {
                              ...inviteForm.customPermissions,
                              [key]: e.target.checked,
                            },
                          })
                        }
                        className='h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500'
                      />
                      <span className='ml-2 text-sm text-gray-700'>
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className='flex justify-end space-x-3 pt-4'>
                <button
                  type='button'
                  onClick={() => setShowInviteModal(false)}
                  className='rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:outline-none'
                >
                  {t('team.cancel')}
                </button>
                <button
                  type='submit'
                  disabled={actionLoading}
                  className='rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50'
                >
                  {actionLoading ? t('team.sending') : t('team.sendInvitation')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {showEditModal && selectedMember && (
        <div className='bg-opacity-75 fixed inset-0 z-50 flex items-center justify-center bg-gray-500/50 backdrop-blur-sm'>
          <div className='mx-4 w-full max-w-md rounded-lg bg-white shadow-xl'>
            <div className='border-b border-gray-200 px-6 py-4'>
              <div className='flex items-center justify-between'>
                <h3 className='text-lg font-medium text-gray-900'>{t('team.editRole')}</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className='text-gray-400 hover:text-gray-500'
                >
                  <XMarkIcon className='h-6 w-6' />
                </button>
              </div>
            </div>

            <form onSubmit={handleUpdateRole} className='space-y-4 px-6 py-4'>
              <div>
                <label className='mb-2 block text-sm font-medium text-gray-700'>{t('team.table.member')}</label>
                <div className='text-sm text-gray-900'>
                  {selectedMember.full_name || selectedMember.email}
                </div>
              </div>

              <div>
                <label htmlFor='edit-role' className='block text-sm font-medium text-gray-700'>
                  {t('team.newRole')}
                </label>
                <select
                  id='edit-role'
                  value={editForm.role}
                  onChange={e => setEditForm({ role: e.target.value })}
                  className='mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500 sm:text-sm'
                >
                  {profile.role === 'owner' && <option value='owner'>{t('team.roles.owner')}</option>}
                  <option value='admin'>{t('team.roles.admin')}</option>
                  <option value='agent'>{t('team.roles.agent')}</option>
                </select>
              </div>

              <div className='flex justify-end space-x-3 pt-4'>
                <button
                  type='button'
                  onClick={() => setShowEditModal(false)}
                  className='rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:outline-none'
                >
                  {t('team.cancel')}
                </button>
                <button
                  type='submit'
                  disabled={actionLoading}
                  className='rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50'
                >
                  {actionLoading ? t('team.updating') : t('team.updateRole')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedMember && (
        <div className='bg-opacity-75 fixed inset-0 z-50 flex items-center justify-center bg-gray-500/50 backdrop-blur-sm'>
          <div className='mx-4 w-full max-w-md rounded-lg bg-white shadow-xl'>
            <div className='border-b border-gray-200 px-6 py-4'>
              <div className='flex items-center justify-between'>
                <h3 className='text-lg font-medium text-gray-900'>{t('team.removeMember')}</h3>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className='text-gray-400 hover:text-gray-500'
                >
                  <XMarkIcon className='h-6 w-6' />
                </button>
              </div>
            </div>

            <div className='px-6 py-4'>
              <p className='text-sm text-gray-500'>
                {t('team.confirmRemove', { name: selectedMember.full_name || selectedMember.email })}
              </p>

              <div className='flex justify-end space-x-3 pt-6'>
                <button
                  type='button'
                  onClick={() => setShowDeleteModal(false)}
                  className='rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:outline-none'
                >
                  {t('team.cancel')}
                </button>
                <button
                  onClick={handleRemoveMember}
                  disabled={actionLoading}
                  className='rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50'
                >
                  {actionLoading ? t('team.removing') : t('team.removeMember')}
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
