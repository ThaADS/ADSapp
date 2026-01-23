'use client'

import { useState, useEffect } from 'react'
import {
  ShieldCheckIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  ArrowsRightLeftIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'

interface DeletionRequest {
  id: string
  request_type: string
  status: string
  created_at: string
  processed_at?: string
  reason?: string
}

interface ExportInfo {
  supported_formats: string[]
  max_file_size_bytes: number
  expiry_days: number
  export_includes: string[]
  legal_basis: string
  response_time: string
}

interface PortabilityInfo {
  gdpr_article: string
  description: string
  format: string
  included_data: string[]
  excluded_data: string[]
  usage: string
  expiry: string
  legal_basis: string
  response_time: string
}

export default function PrivacyCenterPage() {
  // Export state
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'pdf'>('json')
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const [exportSuccess, setExportSuccess] = useState(false)
  const [exportInfo, setExportInfo] = useState<ExportInfo | null>(null)

  // Deletion state
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([])
  const [deletionLoading, setDeletionLoading] = useState(true)
  const [showDeletionModal, setShowDeletionModal] = useState(false)
  const [deletionType, setDeletionType] = useState<string>('user_account')
  const [deletionReason, setDeletionReason] = useState('')
  const [deletionSubmitting, setDeletionSubmitting] = useState(false)
  const [deletionError, setDeletionError] = useState('')

  // Portability state
  const [portabilityInfo, setPortabilityInfo] = useState<PortabilityInfo | null>(null)
  const [portabilityLoading, setPortabilityLoading] = useState(false)
  const [portabilityError, setPortabilityError] = useState('')

  useEffect(() => {
    fetchExportInfo()
    fetchDeletionRequests()
    fetchPortabilityInfo()
  }, [])

  const fetchExportInfo = async () => {
    try {
      const response = await fetch('/api/gdpr/data-export')
      if (response.ok) {
        const data = await response.json()
        setExportInfo(data)
      }
    } catch (error) {
      console.error('Failed to fetch export info:', error)
    }
  }

  const fetchDeletionRequests = async () => {
    try {
      setDeletionLoading(true)
      const response = await fetch('/api/gdpr/data-deletion')
      if (response.ok) {
        const data = await response.json()
        setDeletionRequests(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch deletion requests:', error)
    } finally {
      setDeletionLoading(false)
    }
  }

  const fetchPortabilityInfo = async () => {
    try {
      const response = await fetch('/api/gdpr/data-portability')
      if (response.ok) {
        const data = await response.json()
        setPortabilityInfo(data)
      }
    } catch (error) {
      console.error('Failed to fetch portability info:', error)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    setExportError('')
    setExportSuccess(false)

    try {
      const response = await fetch('/api/gdpr/data-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: exportFormat }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Export failed')
      }

      const result = await response.json()

      // Create downloadable file
      const blob = new Blob(
        [exportFormat === 'json' ? JSON.stringify(result.data.data, null, 2) : result.data.data],
        {
          type:
            exportFormat === 'json'
              ? 'application/json'
              : exportFormat === 'csv'
              ? 'text/csv'
              : 'application/pdf',
        }
      )

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `my-data-export.${exportFormat}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setExportSuccess(true)
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  const handleRequestDeletion = async () => {
    setDeletionSubmitting(true)
    setDeletionError('')

    try {
      const response = await fetch('/api/gdpr/data-deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request_type: deletionType,
          reason: deletionReason,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Deletion request failed')
      }

      setShowDeletionModal(false)
      setDeletionReason('')
      await fetchDeletionRequests()
    } catch (error) {
      setDeletionError(error instanceof Error ? error.message : 'Request failed')
    } finally {
      setDeletionSubmitting(false)
    }
  }

  const handlePortabilityExport = async () => {
    setPortabilityLoading(true)
    setPortabilityError('')

    try {
      const response = await fetch('/api/gdpr/data-portability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ include_all: true }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Portability export failed')
      }

      const result = await response.json()

      // Download as JSON
      const blob = new Blob([JSON.stringify(result.data, null, 2)], {
        type: 'application/json',
      })

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'my-portable-data.json'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      setPortabilityError(error instanceof Error ? error.message : 'Export failed')
    } finally {
      setPortabilityLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className='inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700'>
            <ClockIcon className='h-3 w-3' />
            Pending
          </span>
        )
      case 'verified':
        return (
          <span className='inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700'>
            <CheckCircleIcon className='h-3 w-3' />
            Verified
          </span>
        )
      case 'processed':
        return (
          <span className='inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700'>
            <CheckCircleIcon className='h-3 w-3' />
            Processed
          </span>
        )
      case 'rejected':
        return (
          <span className='inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700'>
            <XCircleIcon className='h-3 w-3' />
            Rejected
          </span>
        )
      default:
        return (
          <span className='inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700'>
            {status}
          </span>
        )
    }
  }

  return (
    <div className='space-y-6'>
      {/* Page Header */}
      <div>
        <h1 className='text-2xl font-bold text-gray-900'>Privacy Center</h1>
        <p className='mt-1 text-sm text-gray-500'>
          Manage your data and privacy settings in accordance with GDPR regulations.
        </p>
      </div>

      {/* Your Rights Info */}
      <div className='rounded-lg border border-blue-200 bg-blue-50 p-4'>
        <div className='flex items-start gap-3'>
          <InformationCircleIcon className='h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5' />
          <div>
            <h3 className='text-sm font-medium text-blue-900'>Your Privacy Rights (GDPR)</h3>
            <p className='mt-1 text-sm text-blue-700'>
              Under GDPR, you have the right to access your data (Article 15), request data portability
              (Article 20), and request erasure of your data (Article 17). Use the options below to
              exercise these rights.
            </p>
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
        {/* Data Export Card */}
        <div className='rounded-lg border border-gray-200 bg-white shadow-sm'>
          <div className='p-6'>
            <div className='flex items-center gap-3 mb-4'>
              <div className='flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100'>
                <ArrowDownTrayIcon className='h-5 w-5 text-emerald-600' />
              </div>
              <div>
                <h2 className='text-lg font-semibold text-gray-900'>Export Your Data</h2>
                <p className='text-sm text-gray-500'>GDPR Article 15 - Right to Access</p>
              </div>
            </div>

            <p className='text-sm text-gray-600 mb-4'>
              Download a copy of all your personal data stored in our system.
            </p>

            {exportInfo && (
              <div className='mb-4 rounded-lg bg-gray-50 p-3 text-xs text-gray-600'>
                <p className='mb-1'>
                  <strong>Includes:</strong> {exportInfo.export_includes.join(', ')}
                </p>
                <p>
                  <strong>Max file size:</strong>{' '}
                  {Math.round(exportInfo.max_file_size_bytes / (1024 * 1024))} MB
                </p>
              </div>
            )}

            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>Export Format</label>
                <div className='flex gap-2'>
                  {['json', 'csv', 'pdf'].map(format => (
                    <button
                      key={format}
                      onClick={() => setExportFormat(format as any)}
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        exportFormat === format
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {format.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {exportError && (
                <div className='rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700'>
                  {exportError}
                </div>
              )}

              {exportSuccess && (
                <div className='rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700'>
                  Export successful! Your download should start automatically.
                </div>
              )}

              <button
                onClick={handleExport}
                disabled={exporting}
                className='w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50'
              >
                {exporting ? 'Exporting...' : 'Download My Data'}
              </button>
            </div>
          </div>
        </div>

        {/* Data Portability Card */}
        <div className='rounded-lg border border-gray-200 bg-white shadow-sm'>
          <div className='p-6'>
            <div className='flex items-center gap-3 mb-4'>
              <div className='flex h-10 w-10 items-center justify-center rounded-full bg-blue-100'>
                <ArrowsRightLeftIcon className='h-5 w-5 text-blue-600' />
              </div>
              <div>
                <h2 className='text-lg font-semibold text-gray-900'>Data Portability</h2>
                <p className='text-sm text-gray-500'>GDPR Article 20</p>
              </div>
            </div>

            <p className='text-sm text-gray-600 mb-4'>
              Get your data in a machine-readable format that can be transferred to another service.
            </p>

            {portabilityInfo && (
              <div className='mb-4 rounded-lg bg-gray-50 p-3 text-xs text-gray-600 space-y-1'>
                <p>
                  <strong>Format:</strong> {portabilityInfo.format}
                </p>
                <p>
                  <strong>Includes:</strong> {portabilityInfo.included_data.join(', ')}
                </p>
                <p>
                  <strong>Valid for:</strong> {portabilityInfo.expiry}
                </p>
              </div>
            )}

            {portabilityError && (
              <div className='mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700'>
                {portabilityError}
              </div>
            )}

            <button
              onClick={handlePortabilityExport}
              disabled={portabilityLoading}
              className='w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50'
            >
              {portabilityLoading ? 'Generating...' : 'Get Portable Data Package'}
            </button>
          </div>
        </div>
      </div>

      {/* Data Deletion Section */}
      <div className='rounded-lg border border-gray-200 bg-white shadow-sm'>
        <div className='p-6'>
          <div className='flex items-center justify-between mb-4'>
            <div className='flex items-center gap-3'>
              <div className='flex h-10 w-10 items-center justify-center rounded-full bg-red-100'>
                <TrashIcon className='h-5 w-5 text-red-600' />
              </div>
              <div>
                <h2 className='text-lg font-semibold text-gray-900'>Delete Your Data</h2>
                <p className='text-sm text-gray-500'>GDPR Article 17 - Right to Erasure</p>
              </div>
            </div>
            <button
              onClick={() => setShowDeletionModal(true)}
              className='rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50'
            >
              Request Deletion
            </button>
          </div>

          <p className='text-sm text-gray-600 mb-6'>
            Request deletion of your personal data. Note: Some data may be retained for legal
            compliance purposes.
          </p>

          {/* Deletion Requests List */}
          <div>
            <h3 className='text-sm font-medium text-gray-900 mb-3'>Your Deletion Requests</h3>
            {deletionLoading ? (
              <div className='flex items-center justify-center py-8'>
                <div className='h-5 w-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent'></div>
                <span className='ml-2 text-sm text-gray-500'>Loading...</span>
              </div>
            ) : deletionRequests.length === 0 ? (
              <p className='text-sm text-gray-500 py-4'>No deletion requests found.</p>
            ) : (
              <div className='space-y-3'>
                {deletionRequests.map(request => (
                  <div
                    key={request.id}
                    className='flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4'
                  >
                    <div>
                      <p className='text-sm font-medium text-gray-900'>
                        {request.request_type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </p>
                      <p className='text-xs text-gray-500'>
                        Requested: {new Date(request.created_at).toLocaleDateString()}
                        {request.reason && ` - ${request.reason}`}
                      </p>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Privacy Policy Links */}
      <div className='rounded-lg border border-gray-200 bg-white p-6 shadow-sm'>
        <h2 className='text-lg font-semibold text-gray-900 mb-4'>Legal Documents</h2>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
          <a
            href='/legal/privacy-policy'
            className='flex items-center justify-between rounded-lg border border-gray-200 p-4 hover:bg-gray-50'
          >
            <span className='text-sm font-medium text-gray-900'>Privacy Policy</span>
            <ShieldCheckIcon className='h-5 w-5 text-gray-400' />
          </a>
          <a
            href='/legal/terms-of-service'
            className='flex items-center justify-between rounded-lg border border-gray-200 p-4 hover:bg-gray-50'
          >
            <span className='text-sm font-medium text-gray-900'>Terms of Service</span>
            <ShieldCheckIcon className='h-5 w-5 text-gray-400' />
          </a>
          <a
            href='/legal/data-processing'
            className='flex items-center justify-between rounded-lg border border-gray-200 p-4 hover:bg-gray-50'
          >
            <span className='text-sm font-medium text-gray-900'>Data Processing Agreement</span>
            <ShieldCheckIcon className='h-5 w-5 text-gray-400' />
          </a>
        </div>
      </div>

      {/* Deletion Modal */}
      {showDeletionModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
          <div className='w-full max-w-md rounded-lg bg-white p-6 shadow-xl'>
            <div className='flex items-center gap-3 mb-4'>
              <div className='flex h-10 w-10 items-center justify-center rounded-full bg-red-100'>
                <ExclamationTriangleIcon className='h-6 w-6 text-red-600' />
              </div>
              <h3 className='text-lg font-semibold text-gray-900'>Request Data Deletion</h3>
            </div>

            <div className='mb-4 rounded-lg bg-amber-50 border border-amber-200 p-3'>
              <p className='text-sm text-amber-800'>
                <strong>Warning:</strong> This action cannot be undone. Your data will be permanently
                deleted after verification.
              </p>
            </div>

            <div className='space-y-4 mb-6'>
              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  What do you want to delete?
                </label>
                <select
                  value={deletionType}
                  onChange={e => setDeletionType(e.target.value)}
                  className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm'
                >
                  <option value='user_account'>My User Account</option>
                  <option value='all_personal_data'>All My Personal Data</option>
                  <option value='contact_data'>Specific Contact Data</option>
                  <option value='conversation_data'>Specific Conversation Data</option>
                </select>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Reason (optional)
                </label>
                <textarea
                  value={deletionReason}
                  onChange={e => setDeletionReason(e.target.value)}
                  placeholder='Tell us why you want to delete your data...'
                  className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm'
                  rows={3}
                />
              </div>
            </div>

            {deletionError && (
              <div className='mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700'>
                {deletionError}
              </div>
            )}

            <div className='flex justify-end gap-3'>
              <button
                onClick={() => {
                  setShowDeletionModal(false)
                  setDeletionError('')
                  setDeletionReason('')
                }}
                className='rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50'
              >
                Cancel
              </button>
              <button
                onClick={handleRequestDeletion}
                disabled={deletionSubmitting}
                className='rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50'
              >
                {deletionSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
