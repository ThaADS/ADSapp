'use client'

/**
 * Sentiment Indicator Component
 * Display conversation sentiment and urgency visually
 */

import { useState, useEffect } from 'react'
import type { SentimentAnalysis } from '@/lib/ai/types'
import { useTranslations } from '@/components/providers/translation-provider'

interface SentimentIndicatorProps {
  conversationId: string
  compact?: boolean
  showDetails?: boolean
  autoAnalyze?: boolean
}

export function SentimentIndicator({
  conversationId,
  compact = false,
  showDetails = true,
  autoAnalyze = false,
}: SentimentIndicatorProps) {
  const t = useTranslations('inbox')
  const [analysis, setAnalysis] = useState<SentimentAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (autoAnalyze) {
      analyzeSentiment()
    }
  }, [conversationId, autoAnalyze])

  const analyzeSentiment = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/ai/sentiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze sentiment')
      }

      setAnalysis(data.analysis)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze sentiment')
      console.error('Sentiment analysis error:', err)
    } finally {
      setLoading(false)
    }
  }

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return (
          <svg className='h-5 w-5' fill='currentColor' viewBox='0 0 20 20'>
            <path
              fillRule='evenodd'
              d='M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-.464 5.535a1 1 0 10-1.415-1.414 3 3 0 01-4.242 0 1 1 0 00-1.415 1.414 5 5 0 007.072 0z'
              clipRule='evenodd'
            />
          </svg>
        )
      case 'negative':
        return (
          <svg className='h-5 w-5' fill='currentColor' viewBox='0 0 20 20'>
            <path
              fillRule='evenodd'
              d='M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-7.536 5.879a1 1 0 001.415 0 3 3 0 014.242 0 1 1 0 001.415-1.415 5 5 0 00-7.072 0 1 1 0 000 1.415z'
              clipRule='evenodd'
            />
          </svg>
        )
      case 'neutral':
        return (
          <svg className='h-5 w-5' fill='currentColor' viewBox='0 0 20 20'>
            <path
              fillRule='evenodd'
              d='M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-5 5a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z'
              clipRule='evenodd'
            />
          </svg>
        )
      case 'mixed':
        return (
          <svg className='h-5 w-5' fill='currentColor' viewBox='0 0 20 20'>
            <path
              fillRule='evenodd'
              d='M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z'
              clipRule='evenodd'
            />
          </svg>
        )
      default:
        return null
    }
  }

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'negative':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'neutral':
        return 'text-gray-600 bg-gray-50 border-gray-200'
      case 'mixed':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getUrgencyBadge = (urgency: string) => {
    const colors = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800',
    }

    const urgencyKey = urgency as 'low' | 'medium' | 'high' | 'critical'
    const label = t(`sentiment.urgency.${urgencyKey}`)

    return (
      <span
        className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${colors[urgencyKey] || colors.low}`}
      >
        {label}
      </span>
    )
  }

  const getSentimentLabel = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return t('sentiment.positive')
      case 'negative':
        return t('sentiment.negative')
      case 'neutral':
        return t('sentiment.neutral')
      case 'mixed':
        return t('sentiment.mixed')
      default:
        return sentiment
    }
  }

  if (loading) {
    return (
      <div className='flex items-center space-x-2 text-gray-500'>
        <div className='h-4 w-4 animate-spin rounded-full border-b-2 border-gray-600'></div>
        <span className='text-sm'>{t('sentiment.analyzing')}</span>
      </div>
    )
  }

  if (error) {
    return <div className='text-sm text-red-600'>{t('sentiment.analysisFailed')}</div>
  }

  if (!analysis && !autoAnalyze) {
    return (
      <button
        type='button'
        onClick={analyzeSentiment}
        className='text-sm text-blue-600 underline hover:text-blue-800'
      >
        {t('sentiment.analyze')}
      </button>
    )
  }

  if (!analysis) {
    return null
  }

  // Compact mode - small badge
  if (compact) {
    return (
      <div
        className={`inline-flex items-center space-x-1 rounded-full border px-2 py-1 ${getSentimentColor(analysis.sentiment)}`}
      >
        {getSentimentIcon(analysis.sentiment)}
        <span className='text-xs font-medium'>{getSentimentLabel(analysis.sentiment)}</span>
      </div>
    )
  }

  // Full mode with details
  return (
    <div className='space-y-3'>
      {/* Sentiment Badge */}
      <div className='flex items-center justify-between'>
        <div
          className={`inline-flex items-center space-x-2 rounded-lg border px-3 py-2 ${getSentimentColor(analysis.sentiment)}`}
        >
          {getSentimentIcon(analysis.sentiment)}
          <div>
            <div className='text-sm font-medium'>{getSentimentLabel(analysis.sentiment)}</div>
            <div className='text-xs opacity-75'>
              {t('sentiment.score', { score: analysis.score.toFixed(2), confidence: Math.round(analysis.confidence * 100) })}
            </div>
          </div>
        </div>

        {/* Urgency */}
        <div>{getUrgencyBadge(analysis.urgency)}</div>
      </div>

      {/* Details */}
      {showDetails && (
        <>
          {/* Score Bar */}
          <div className='space-y-1'>
            <div className='flex justify-between text-xs text-gray-600'>
              <span>{t('sentiment.negativeLabel')}</span>
              <span>{t('sentiment.neutralLabel')}</span>
              <span>{t('sentiment.positiveLabel')}</span>
            </div>
            <div className='relative h-2 overflow-hidden rounded-full bg-gray-200'>
              <div
                className='absolute h-full bg-gradient-to-r from-red-500 via-gray-400 to-green-500'
                style={{ width: '100%' }}
              />
              <div
                className='absolute h-full w-1 border-2 border-gray-800 bg-white'
                style={{
                  left: `${((analysis.score + 1) / 2) * 100}%`,
                  transform: 'translateX(-50%)',
                }}
              />
            </div>
          </div>

          {/* Topics */}
          {analysis.topics && analysis.topics.length > 0 && (
            <div>
              <div className='mb-1 text-xs font-medium text-gray-700'>{t('sentiment.topics')}</div>
              <div className='flex flex-wrap gap-1'>
                {analysis.topics.map((topic, i) => (
                  <span
                    key={i}
                    className='inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700'
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Reasoning */}
          {analysis.reasoning && (
            <details className='text-xs text-gray-600'>
              <summary className='cursor-pointer font-medium hover:text-gray-800'>
                {t('sentiment.analysisDetails')}
              </summary>
              <p className='mt-2 rounded border border-gray-200 bg-gray-50 p-2'>
                {analysis.reasoning}
              </p>
            </details>
          )}
        </>
      )}
    </div>
  )
}
