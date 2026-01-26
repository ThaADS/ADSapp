'use client'

/**
 * Draft Suggestions Component
 * Display AI-generated response suggestions in the inbox
 */

import { useState } from 'react'
import { useTranslations } from '@/components/providers/translation-provider'
import type { DraftSuggestion } from '@/lib/ai/types'

interface DraftSuggestionsProps {
  conversationId: string
  onSelectDraft: (content: string) => void
  onClose: () => void
}

export function DraftSuggestions({
  conversationId,
  onSelectDraft,
  onClose,
}: DraftSuggestionsProps) {
  const t = useTranslations('inbox')
  const [suggestions, setSuggestions] = useState<DraftSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [improvingIndex, setImprovingIndex] = useState<number | null>(null)
  const [improvementFeedback, setImprovementFeedback] = useState('')

  const generateSuggestions = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/ai/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          count: 3,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate suggestions')
      }

      setSuggestions(data.suggestions)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate suggestions')
      console.error('Generate suggestions error:', err)
    } finally {
      setLoading(false)
    }
  }

  const improveDraft = async (draft: string, feedback: string) => {
    try {
      const response = await fetch('/api/ai/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          action: 'improve',
          existingDraft: draft,
          feedback,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to improve draft')
      }

      // Replace the draft with improved version
      onSelectDraft(data.improvedDraft)
      setImprovingIndex(null)
      setImprovementFeedback('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to improve draft')
      console.error('Improve draft error:', err)
    }
  }

  // Auto-generate on mount
  useState(() => {
    generateSuggestions()
  })

  const getToneColor = (tone?: string) => {
    switch (tone) {
      case 'professional':
        return 'bg-blue-100 text-blue-800'
      case 'friendly':
        return 'bg-green-100 text-green-800'
      case 'empathetic':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getToneLabel = (tone?: string) => {
    switch (tone) {
      case 'professional':
        return t('drafts.tone.professional')
      case 'friendly':
        return t('drafts.tone.friendly')
      case 'empathetic':
        return t('drafts.tone.empathetic')
      default:
        return tone
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className='mx-auto max-w-4xl rounded-lg border border-gray-200 bg-white p-6 shadow-lg'>
      {/* Header */}
      <div className='mb-4 flex items-center justify-between'>
        <div>
          <h3 className='text-lg font-semibold text-gray-900'>{t('drafts.title')}</h3>
          <p className='text-sm text-gray-600'>{t('drafts.subtitle')}</p>
        </div>
        <button
          type='button'
          onClick={onClose}
          className='text-gray-400 hover:text-gray-600'
          aria-label={t('drafts.close')}
        >
          <svg className='h-6 w-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M6 18L18 6M6 6l12 12'
            />
          </svg>
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className='mb-4 rounded-md border border-red-200 bg-red-50 p-3'>
          <p className='text-sm text-red-800'>{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className='flex flex-col items-center justify-center py-12'>
          <div className='mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600'></div>
          <p className='text-sm text-gray-600'>{t('drafts.generating')}</p>
        </div>
      )}

      {/* Suggestions List */}
      {!loading && suggestions.length > 0 && (
        <div className='space-y-4'>
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className='rounded-lg border border-gray-200 p-4 transition-colors hover:border-blue-300'
            >
              {/* Suggestion Header */}
              <div className='mb-3 flex items-center justify-between'>
                <div className='flex items-center space-x-2'>
                  {suggestion.tone && (
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getToneColor(suggestion.tone)}`}
                    >
                      {getToneLabel(suggestion.tone)}
                    </span>
                  )}
                  <span
                    className={`text-xs font-medium ${getConfidenceColor(suggestion.confidence)}`}
                  >
                    {t('drafts.confidence', { percent: Math.round(suggestion.confidence * 100) })}
                  </span>
                </div>
                <div className='flex space-x-2'>
                  <button
                    type='button'
                    onClick={() => setImprovingIndex(improvingIndex === index ? null : index)}
                    className='text-sm text-gray-600 hover:text-gray-900'
                    title={t('drafts.improve')}
                  >
                    <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
                      />
                    </svg>
                  </button>
                  <button
                    type='button'
                    onClick={() => onSelectDraft(suggestion.content)}
                    className='text-sm font-medium text-blue-600 hover:text-blue-800'
                  >
                    {t('drafts.use')}
                  </button>
                </div>
              </div>

              {/* Suggestion Content */}
              <p className='mb-2 whitespace-pre-wrap text-gray-800'>{suggestion.content}</p>

              {/* Reasoning */}
              {suggestion.reasoning && (
                <details className='text-xs text-gray-600'>
                  <summary className='cursor-pointer hover:text-gray-800'>
                    {t('drafts.whySuggestion')}
                  </summary>
                  <p className='mt-2 border-l-2 border-gray-200 pl-4'>{suggestion.reasoning}</p>
                </details>
              )}

              {/* Improvement Panel */}
              {improvingIndex === index && (
                <div className='mt-4 rounded-md bg-gray-50 p-3'>
                  <label className='mb-2 block text-sm font-medium text-gray-700'>
                    {t('drafts.howToImprove')}
                  </label>
                  <textarea
                    value={improvementFeedback}
                    onChange={e => setImprovementFeedback(e.target.value)}
                    placeholder={t('drafts.improvePlaceholder')}
                    rows={2}
                    className='block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500'
                  />
                  <div className='mt-2 flex justify-end space-x-2'>
                    <button
                      type='button'
                      onClick={() => {
                        setImprovingIndex(null)
                        setImprovementFeedback('')
                      }}
                      className='px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900'
                    >
                      {t('drafts.cancel')}
                    </button>
                    <button
                      type='button'
                      onClick={() => improveDraft(suggestion.content, improvementFeedback)}
                      disabled={!improvementFeedback.trim()}
                      className='rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300'
                    >
                      {t('drafts.improve')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && suggestions.length === 0 && !error && (
        <div className='py-12 text-center'>
          <svg
            className='mx-auto h-12 w-12 text-gray-400'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z'
            />
          </svg>
          <h3 className='mt-2 text-sm font-medium text-gray-900'>{t('drafts.noSuggestions')}</h3>
          <p className='mt-1 text-sm text-gray-500'>
            {t('drafts.couldNotGenerate')}
          </p>
          <button
            type='button'
            onClick={generateSuggestions}
            className='mt-4 inline-flex items-center rounded-md border border-transparent bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none'
          >
            {t('drafts.tryAgain')}
          </button>
        </div>
      )}

      {/* Action Buttons */}
      {!loading && suggestions.length > 0 && (
        <div className='mt-6 flex justify-between'>
          <button
            type='button'
            onClick={generateSuggestions}
            disabled={loading}
            className='inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none'
          >
            <svg className='mr-2 h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
              />
            </svg>
            {t('drafts.newSuggestions')}
          </button>
        </div>
      )}
    </div>
  )
}
