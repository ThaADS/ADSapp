'use client'

import { useState } from 'react'

interface TeamInvitationStepProps {
  onComplete: (invitations: TeamInvitation[]) => void
  onSkip: () => void
}

export interface TeamInvitation {
  email: string
  role: 'admin' | 'agent'
  name?: string
}

const ROLE_OPTIONS = [
  {
    value: 'admin' as const,
    label: 'Admin',
    description: 'Can manage team, settings, and all conversations',
  },
  {
    value: 'agent' as const,
    label: 'Agent',
    description: 'Can handle assigned conversations only',
  },
]

export function TeamInvitationStep({ onComplete, onSkip }: TeamInvitationStepProps) {
  const [invitations, setInvitations] = useState<TeamInvitation[]>([
    { email: '', role: 'agent', name: '' },
  ])
  const [errors, setErrors] = useState<Record<number, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const addInvitation = () => {
    if (invitations.length < 10) {
      setInvitations([...invitations, { email: '', role: 'agent', name: '' }])
    }
  }

  const removeInvitation = (index: number) => {
    if (invitations.length > 1) {
      setInvitations(invitations.filter((_, i) => i !== index))
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[index]
        return newErrors
      })
    }
  }

  const updateInvitation = (index: number, field: keyof TeamInvitation, value: string) => {
    const updated = [...invitations]
    updated[index] = { ...updated[index], [field]: value }
    setInvitations(updated)

    // Clear error when user starts typing
    if (errors[index]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[index]
        return newErrors
      })
    }
  }

  const handleSubmit = async () => {
    // Validate all non-empty emails
    const newErrors: Record<number, string> = {}
    const validInvitations: TeamInvitation[] = []

    invitations.forEach((inv, index) => {
      if (inv.email.trim()) {
        if (!validateEmail(inv.email)) {
          newErrors[index] = 'Please enter a valid email address'
        } else {
          validInvitations.push(inv)
        }
      }
    })

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    if (validInvitations.length === 0) {
      // No invitations to send, skip
      onSkip()
      return
    }

    setIsSubmitting(true)

    try {
      // Send invitations via API
      const response = await fetch('/api/team/invite-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitations: validInvitations }),
      })

      if (!response.ok) {
        throw new Error('Failed to send invitations')
      }

      onComplete(validInvitations)
    } catch (error) {
      console.error('Failed to send invitations:', error)
      // Still continue even if invitations fail - they can be resent later
      onComplete(validInvitations)
    } finally {
      setIsSubmitting(false)
    }
  }

  const filledInvitations = invitations.filter(inv => inv.email.trim()).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
          <span className="text-3xl">👥</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Invite Your Team</h2>
        <p className="mt-2 text-gray-600">
          Add team members to help manage your WhatsApp conversations
        </p>
      </div>

      {/* Invitation List */}
      <div className="space-y-4">
        {invitations.map((invitation, index) => (
          <div
            key={index}
            className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start gap-4">
              {/* Email Input */}
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  type="email"
                  value={invitation.email}
                  onChange={e => updateInvitation(index, 'email', e.target.value)}
                  placeholder="colleague@company.com"
                  className={`w-full rounded-lg border px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500 ${
                    errors[index] ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {errors[index] && (
                  <p className="mt-1 text-sm text-red-600">{errors[index]}</p>
                )}
              </div>

              {/* Name Input (Optional) */}
              <div className="w-40">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Name <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={invitation.name}
                  onChange={e => updateInvitation(index, 'name', e.target.value)}
                  placeholder="John"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Role Selector */}
              <div className="w-32">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Role
                </label>
                <select
                  value={invitation.role}
                  onChange={e => updateInvitation(index, 'role', e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                >
                  {ROLE_OPTIONS.map(role => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Remove Button */}
              <div className="flex items-end pb-1">
                <button
                  type="button"
                  onClick={() => removeInvitation(index)}
                  disabled={invitations.length === 1}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30"
                  title="Remove"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add More Button */}
      {invitations.length < 10 && (
        <button
          type="button"
          onClick={addInvitation}
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-3 text-gray-500 transition-colors hover:border-blue-400 hover:text-blue-500"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add Another Team Member
        </button>
      )}

      {/* Role Explanations */}
      <div className="rounded-lg bg-gray-50 p-4">
        <h4 className="mb-3 font-semibold text-gray-900">Role Permissions</h4>
        <div className="grid gap-3 sm:grid-cols-2">
          {ROLE_OPTIONS.map(role => (
            <div key={role.value} className="flex items-start gap-2">
              <span
                className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded text-xs font-bold ${
                  role.value === 'admin'
                    ? 'bg-purple-100 text-purple-600'
                    : 'bg-blue-100 text-blue-600'
                }`}
              >
                {role.value === 'admin' ? 'A' : 'G'}
              </span>
              <div>
                <p className="font-medium text-gray-900">{role.label}</p>
                <p className="text-sm text-gray-600">{role.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4">
        <button
          type="button"
          onClick={onSkip}
          className="text-gray-500 underline hover:text-gray-700"
        >
          Skip for now - I'll invite team members later
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {isSubmitting ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Sending...
            </>
          ) : (
            <>
              {filledInvitations > 0
                ? `Send ${filledInvitations} Invitation${filledInvitations > 1 ? 's' : ''}`
                : 'Continue'}
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </>
          )}
        </button>
      </div>

      {/* Tip */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-800">
          <strong>Tip:</strong> You can always invite more team members later from the Team
          Settings page. Invited users will receive an email with instructions to join your
          organization.
        </p>
      </div>
    </div>
  )
}
