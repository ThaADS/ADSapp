/**
 * OAuth Consent Page
 *
 * Displays authorization request details and allows user to approve or deny.
 */

'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import type { OAuthScope } from '@/types/oauth'

interface ConsentState {
  clientName: string
  scopes: OAuthScope[]
  clientId: string
  redirectUri: string
  state: string
  codeChallenge?: string
  codeChallengeMethod?: string
}

const SCOPE_DESCRIPTIONS: Record<OAuthScope, string> = {
  'messages:read': 'Read your messages and conversations',
  'messages:write': 'Send messages on your behalf',
  'contacts:read': 'View your contacts',
  'contacts:write': 'Create and update contacts',
  'webhooks:manage': 'Subscribe to real-time event notifications',
}

export default function OAuthConsentPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [consent, setConsent] = useState<ConsentState | null>(null)

  useEffect(() => {
    const clientName = searchParams.get('client_name')
    const scopeParam = searchParams.get('scope')
    const clientId = searchParams.get('client_id')
    const redirectUri = searchParams.get('redirect_uri')
    const state = searchParams.get('state')
    const codeChallenge = searchParams.get('code_challenge')
    const codeChallengeMethod = searchParams.get('code_challenge_method')

    if (!clientName || !scopeParam || !clientId || !redirectUri || !state) {
      setError('Invalid authorization request')
      return
    }

    setConsent({
      clientName,
      scopes: scopeParam.split(' ') as OAuthScope[],
      clientId,
      redirectUri,
      state,
      codeChallenge: codeChallenge || undefined,
      codeChallengeMethod: codeChallengeMethod || undefined,
    })
  }, [searchParams])

  const handleAuthorize = async () => {
    if (!consent) return

    setLoading(true)
    setError(null)

    try {
      // Call callback endpoint to generate authorization code
      const response = await fetch('/api/integrations/zapier/authorize/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: consent.clientId,
          redirectUri: consent.redirectUri,
          scopes: consent.scopes,
          state: consent.state,
          codeChallenge: consent.codeChallenge,
          codeChallengeMethod: consent.codeChallengeMethod,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Authorization failed')
      }

      // Redirect to client with authorization code
      const redirectUrl = new URL(consent.redirectUri)
      redirectUrl.searchParams.set('code', data.code)
      redirectUrl.searchParams.set('state', consent.state)

      window.location.href = redirectUrl.toString()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authorization failed')
      setLoading(false)
    }
  }

  const handleDeny = () => {
    if (!consent) return

    // Redirect to client with error
    const redirectUrl = new URL(consent.redirectUri)
    redirectUrl.searchParams.set('error', 'access_denied')
    redirectUrl.searchParams.set('error_description', 'User denied authorization')
    redirectUrl.searchParams.set('state', consent.state)

    window.location.href = redirectUrl.toString()
  }

  if (!consent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
          <div className="text-center">
            <div className="text-red-600 text-lg font-semibold">
              {error || 'Loading...'}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Authorize Application</h1>
          <p className="mt-2 text-gray-600">
            <span className="font-semibold">{consent.clientName}</span> wants to access
            your ADSapp account
          </p>
        </div>

        <div className="mb-6">
          <h2 className="mb-3 text-sm font-semibold text-gray-700 uppercase">
            Permissions Requested
          </h2>
          <ul className="space-y-2">
            {consent.scopes.map((scope) => (
              <li key={scope} className="flex items-start">
                <svg
                  className="mt-0.5 h-5 w-5 text-blue-600 flex-shrink-0"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="ml-3 text-gray-700">
                  {SCOPE_DESCRIPTIONS[scope] || scope}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleDeny}
            disabled={loading}
            className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Deny
          </button>
          <button
            onClick={handleAuthorize}
            disabled={loading}
            className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Authorizing...' : 'Authorize'}
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          By authorizing, you allow {consent.clientName} to access your data according to
          their privacy policy.
        </p>
      </div>
    </div>
  )
}
