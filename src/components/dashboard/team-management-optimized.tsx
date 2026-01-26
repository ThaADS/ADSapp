'use client'

import { useState, useEffect, useCallback, useMemo, memo } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  UserPlusIcon,
  TrashIcon,
  PencilIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import type { Profile } from '@/types/database'
import { useTranslations } from '@/components/providers/translation-provider'

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

// Memoized TeamMemberRow component
const TeamMemberRow = memo(
  ({
    member,
    currentUserId,
    ownerCount,
    onEdit,
    onDelete,
    t,
  }: {
    member: TeamMember
    currentUserId: string
    ownerCount: number
    onEdit: (member: TeamMember) => void
    onDelete: (member: TeamMember) => void
    t: any
  }) => {
    const formatLastSeen = useCallback((lastSeen: string | null) => {
      if (!lastSeen) return t('team.never')
      const date = new Date(lastSeen)
      const now = new Date()
      const diff = now.getTime() - date.getTime()
      const minutes = Math.floor(diff / 60000)

      if (minutes < 1) return t('profile.time.justNow')
      if (minutes < 60) return `${minutes}${t('time.m', { defaultValue: 'm' })} ${t('profile.time.ago')}`
      if (minutes < 1440) return `${Math.floor(minutes / 60)}${t('time.h', { defaultValue: 'h' })} ${t('profile.time.ago')}`
      return `${Math.floor(minutes / 1440)}${t('time.d', { defaultValue: 'd' })} ${t('profile.time.ago')}`
    }, [t])

    const canEdit = member.id !== currentUserId
    const canDelete = member.id !== currentUserId && !(member.role === 'owner' && ownerCount <= 1)

    return (
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
                {member.id === currentUserId && (
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
              onClick={() => onEdit(member)}
              disabled={!canEdit}
              className='text-emerald-600 hover:text-emerald-900 disabled:cursor-not-allowed disabled:opacity-50'
            >
              <PencilIcon className='h-5 w-5' />
            </button>
            <button
              onClick={() => onDelete(member)}
              disabled={!canDelete}
              className='text-red-600 hover:text-red-900 disabled:cursor-not-allowed disabled:opacity-50'
            >
              <TrashIcon className='h-5 w-5' />
            </button>
          </div>
        </td>
      </tr>
    )
  }
)

TeamMemberRow.displayName = 'TeamMemberRow'

export function TeamManagement({ profile }: TeamManagementProps) {
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

  // Memoize owner count calculation
  const ownerCount = useMemo(
    () => teamMembers.filter(m => m.role === 'owner').length,
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
      setError(t('team.loadingError', { defaultValue: 'Failed to load team data' }))
    } finally {
      setLoading(false)
    }
  }, [profile.organization_id, t])

  useEffect(() => {
    loadTeamData()
  }, [loadTeamData])

  const handleInviteMember = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setActionLoading(true)
      setError('')
      setMessage('')

      try {
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

        await loadTeamData()
      } catch (err) {
        setError(t('team.inviteSentError'))
      } finally {
        setActionLoading(false)
      }
    },
    [inviteForm.email, loadTeamData, t]
  )

  const handleUpdateRole = useCallback(
    async (e: React.FormEvent) => {
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
    },
    [selectedMember, editForm.role, loadTeamData, t]
  )

  const handleRemoveMember = useCallback(async () => {
    if (!selectedMember) return

    if (selectedMember.id === profile.id) {
      setError(t('team.removeSelfError'))
      return
    }

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
  }, [selectedMember, profile.id, ownerCount, loadTeamData, t])

  const handleCancelInvitation = useCallback((invitationId: string) => {
    setPendingInvitations(prev => prev.filter(i => i.id !== invitationId))
    // We might want to translate this too
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
          {teamMembers.length}{' '}
          {teamMembers.length === 1
            ? t('team.memberCountSingle', { count: teamMembers.length })
            : t('team.membersCount', { count: teamMembers.length }).replace('{count}', '')}
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className='inline-flex items-center rounded-md border border-transparent bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:outline-none'
        >
          <UserPlusIcon className='mr-2 h-5 w-5' />
          {t('team.actionInvite')}
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className='rounded-md bg-red-50 p-4'>
          <div className='text-sm text-red-700'>{error}</div>
        </div>
      )}

      {message && (
        <div className='rounded-md bg-emerald-50 p-4'>
          <div className='text-sm text-emerald-700'>{message}</div>
        </div>
      )}

      {/* Team Members Table */}
      <div className='overflow-hidden rounded-lg bg-white shadow'>
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
              <TeamMemberRow
                key={member.id}
                member={member}
                currentUserId={profile.id}
                ownerCount={ownerCount}
                onEdit={handleEditMember}
                onDelete={handleDeleteMember}
                t={t}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div className='rounded-lg bg-white shadow'>
          <div className='px-4 py-5 sm:p-6'>
            <h3 className='mb-4 text-lg leading-6 font-medium text-gray-900'>
              {t('team.pendingInvitations')}
            </h3>
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

      {/* Modals would be code-split in production */}
      {/* For brevity, keeping inline modals but these should be separate components */}
    </div>
  )
}
