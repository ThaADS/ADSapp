'use client'

import { useState } from 'react'
import {
  FileText,
  Loader2,
  X,
  CheckCircle2,
  Circle,
  MessageSquare,
  Clock,
  TrendingUp,
} from 'lucide-react'

interface ConversationSummary {
  summary: string
  keyPoints: string[]
  nextSteps: string[]
  resolvedIssues: string[]
  openQuestions: string[]
  duration: number
  messageCount: number
}

interface ConversationSummaryProps {
  conversationId: string
  organizationId: string
  contactName: string
  isOpen: boolean
  onClose: () => void
}

export default function ConversationSummary({
  conversationId,
  organizationId,
  contactName,
  isOpen,
  onClose,
}: ConversationSummaryProps) {
  const [summary, setSummary] = useState<ConversationSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateSummary = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          organizationId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate summary')
      }

      const data = await response.json()
      setSummary(data.summary)
    } catch (err) {
      console.error('Summary generation error:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate summary')
    } finally {
      setLoading(false)
    }
  }

  // Auto-generate summary when modal opens
  useState(() => {
    if (isOpen && !summary && !loading) {
      generateSummary()
    }
  })

  if (!isOpen) return null

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  return (
    <div className='bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4'>
      <div className='max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-xl'>
        {/* Header */}
        <div className='flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-blue-50 px-6 py-4'>
          <div className='flex items-center space-x-3'>
            <div className='rounded-full bg-emerald-100 p-2'>
              <FileText className='h-5 w-5 text-emerald-600' />
            </div>
            <div>
              <h2 className='text-lg font-semibold text-gray-900'>Conversation Summary</h2>
              <p className='text-sm text-gray-600'>with {contactName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className='rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        {/* Content */}
        <div className='max-h-[calc(90vh-120px)] overflow-y-auto p-6'>
          {loading && (
            <div className='flex flex-col items-center justify-center py-12'>
              <Loader2 className='mb-4 h-12 w-12 animate-spin text-emerald-600' />
              <p className='text-sm text-gray-600'>Analyzing conversation...</p>
              <p className='mt-2 text-xs text-gray-500'>
                AI is reading through all messages to create a comprehensive summary
              </p>
            </div>
          )}

          {error && (
            <div className='rounded-lg border border-red-200 bg-red-50 p-4'>
              <p className='text-sm font-medium text-red-800'>Error generating summary</p>
              <p className='mt-1 text-sm text-red-600'>{error}</p>
              <button
                onClick={generateSummary}
                className='mt-3 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700'
              >
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && summary && (
            <div className='space-y-6'>
              {/* Stats Row */}
              <div className='grid grid-cols-3 gap-4'>
                <div className='rounded-lg bg-blue-50 p-4'>
                  <div className='flex items-center space-x-2'>
                    <MessageSquare className='h-5 w-5 text-blue-600' />
                    <div>
                      <p className='text-2xl font-bold text-blue-900'>{summary.messageCount}</p>
                      <p className='text-xs text-blue-700'>Messages</p>
                    </div>
                  </div>
                </div>
                <div className='rounded-lg bg-purple-50 p-4'>
                  <div className='flex items-center space-x-2'>
                    <Clock className='h-5 w-5 text-purple-600' />
                    <div>
                      <p className='text-2xl font-bold text-purple-900'>
                        {formatDuration(summary.duration)}
                      </p>
                      <p className='text-xs text-purple-700'>Duration</p>
                    </div>
                  </div>
                </div>
                <div className='rounded-lg bg-emerald-50 p-4'>
                  <div className='flex items-center space-x-2'>
                    <TrendingUp className='h-5 w-5 text-emerald-600' />
                    <div>
                      <p className='text-2xl font-bold text-emerald-900'>
                        {summary.keyPoints.length}
                      </p>
                      <p className='text-xs text-emerald-700'>Key Points</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Summary */}
              <div className='rounded-lg border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-5'>
                <h3 className='mb-3 flex items-center text-sm font-semibold text-gray-900'>
                  <span className='mr-2'>📋</span>
                  Executive Summary
                </h3>
                <p className='text-sm leading-relaxed text-gray-700'>{summary.summary}</p>
              </div>

              {/* Key Points */}
              {summary.keyPoints.length > 0 && (
                <div className='rounded-lg border border-blue-200 bg-blue-50 p-5'>
                  <h3 className='mb-3 flex items-center text-sm font-semibold text-blue-900'>
                    <span className='mr-2'>💡</span>
                    Key Points
                  </h3>
                  <ul className='space-y-2'>
                    {summary.keyPoints.map((point, index) => (
                      <li key={index} className='flex items-start space-x-2 text-sm text-blue-800'>
                        <CheckCircle2 className='mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600' />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Resolved Issues */}
              {summary.resolvedIssues.length > 0 && (
                <div className='rounded-lg border border-green-200 bg-green-50 p-5'>
                  <h3 className='mb-3 flex items-center text-sm font-semibold text-green-900'>
                    <span className='mr-2'>✅</span>
                    Resolved Issues
                  </h3>
                  <ul className='space-y-2'>
                    {summary.resolvedIssues.map((issue, index) => (
                      <li key={index} className='flex items-start space-x-2 text-sm text-green-800'>
                        <CheckCircle2 className='mt-0.5 h-4 w-4 flex-shrink-0 text-green-600' />
                        <span>{issue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Next Steps */}
              {summary.nextSteps.length > 0 && (
                <div className='rounded-lg border border-purple-200 bg-purple-50 p-5'>
                  <h3 className='mb-3 flex items-center text-sm font-semibold text-purple-900'>
                    <span className='mr-2'>🎯</span>
                    Next Steps
                  </h3>
                  <ul className='space-y-2'>
                    {summary.nextSteps.map((step, index) => (
                      <li
                        key={index}
                        className='flex items-start space-x-2 text-sm text-purple-800'
                      >
                        <Circle className='mt-0.5 h-4 w-4 flex-shrink-0 text-purple-600' />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Open Questions */}
              {summary.openQuestions.length > 0 && (
                <div className='rounded-lg border border-amber-200 bg-amber-50 p-5'>
                  <h3 className='mb-3 flex items-center text-sm font-semibold text-amber-900'>
                    <span className='mr-2'>❓</span>
                    Open Questions
                  </h3>
                  <ul className='space-y-2'>
                    {summary.openQuestions.map((question, index) => (
                      <li key={index} className='flex items-start space-x-2 text-sm text-amber-800'>
                        <Circle className='mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600' />
                        <span>{question}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Pro Tip */}
              <div className='rounded-lg border border-emerald-200 bg-emerald-50 p-4'>
                <p className='text-xs text-emerald-800'>
                  <strong>💡 Pro Tip:</strong> This summary is perfect for team handoffs! Share it
                  with colleagues taking over this conversation for seamless continuity.
                </p>
              </div>
            </div>
          )}

          {!loading && !error && !summary && (
            <div className='rounded-lg bg-gray-50 py-12 text-center'>
              <FileText className='mx-auto mb-4 h-16 w-16 text-gray-300' />
              <p className='mb-2 text-sm font-medium text-gray-900'>No summary yet</p>
              <p className='mb-4 text-xs text-gray-600'>
                Generate an AI-powered summary of this conversation
              </p>
              <button
                onClick={generateSummary}
                className='rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700'
              >
                Generate Summary
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className='border-t border-gray-200 bg-gray-50 px-6 py-4'>
          <div className='flex items-center justify-between'>
            <p className='text-xs text-gray-500'>
              Summary powered by AI • Conversation ID: {conversationId.slice(0, 8)}...
            </p>
            <button
              onClick={onClose}
              className='rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300'
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
