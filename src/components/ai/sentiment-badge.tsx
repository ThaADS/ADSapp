'use client'

import { Smile, Meh, Frown, AlertTriangle, AlertCircle, TrendingUp } from 'lucide-react'

export type SentimentType = 'positive' | 'neutral' | 'negative' | 'mixed'
export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical'

interface SentimentBadgeProps {
  sentiment?: SentimentType | null
  urgency?: UrgencyLevel | null
  score?: number | null
  compact?: boolean
  showIcon?: boolean
  showText?: boolean
}

export default function SentimentBadge({
  sentiment,
  urgency,
  score,
  compact = false,
  showIcon = true,
  showText = true,
}: SentimentBadgeProps) {
  if (!sentiment && !urgency) return null

  const getSentimentConfig = (sent: SentimentType) => {
    switch (sent) {
      case 'positive':
        return {
          icon: Smile,
          label: 'Positive',
          emoji: '😊',
          color: 'bg-green-100 text-green-800 border-green-200',
          dotColor: 'bg-green-500',
        }
      case 'negative':
        return {
          icon: Frown,
          label: 'Negative',
          emoji: '😞',
          color: 'bg-red-100 text-red-800 border-red-200',
          dotColor: 'bg-red-500',
        }
      case 'mixed':
        return {
          icon: Meh,
          label: 'Mixed',
          emoji: '😐',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          dotColor: 'bg-yellow-500',
        }
      default: // neutral
        return {
          icon: Meh,
          label: 'Neutral',
          emoji: '😐',
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          dotColor: 'bg-gray-500',
        }
    }
  }

  const getUrgencyConfig = (urg: UrgencyLevel) => {
    switch (urg) {
      case 'critical':
        return {
          icon: AlertCircle,
          label: 'Critical',
          emoji: '🚨',
          color: 'bg-red-100 text-red-900 border-red-300',
          dotColor: 'bg-red-600',
          pulse: true,
        }
      case 'high':
        return {
          icon: AlertTriangle,
          label: 'High',
          emoji: '⚠️',
          color: 'bg-orange-100 text-orange-800 border-orange-200',
          dotColor: 'bg-orange-500',
          pulse: false,
        }
      case 'medium':
        return {
          icon: TrendingUp,
          label: 'Medium',
          emoji: '📊',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          dotColor: 'bg-yellow-500',
          pulse: false,
        }
      default: // low
        return {
          icon: TrendingUp,
          label: 'Low',
          emoji: '📉',
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          dotColor: 'bg-blue-500',
          pulse: false,
        }
    }
  }

  return (
    <div className='flex items-center space-x-1'>
      {/* Sentiment Badge */}
      {sentiment && (
        <div
          className={`inline-flex items-center space-x-1 rounded-full border px-2 ${compact ? 'py-0.5' : 'py-1'} ${getSentimentConfig(sentiment).color}`}
          title={`Sentiment: ${getSentimentConfig(sentiment).label}${score !== null && score !== undefined ? ` (${(score * 100).toFixed(0)}%)` : ''}`}
        >
          {showIcon && (
            <span className={compact ? 'text-xs' : 'text-sm'}>
              {getSentimentConfig(sentiment).emoji}
            </span>
          )}
          {showText && (
            <span className={`font-medium ${compact ? 'text-xs' : 'text-xs'}`}>
              {getSentimentConfig(sentiment).label}
            </span>
          )}
        </div>
      )}

      {/* Urgency Badge */}
      {urgency && (
        <div
          className={`inline-flex items-center space-x-1 rounded-full border px-2 ${compact ? 'py-0.5' : 'py-1'} ${getUrgencyConfig(urgency).color}`}
          title={`Urgency: ${getUrgencyConfig(urgency).label}`}
        >
          {showIcon && (
            <div className='relative'>
              {getUrgencyConfig(urgency).pulse && (
                <span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75'></span>
              )}
              <span className={compact ? 'text-xs' : 'text-sm'}>
                {getUrgencyConfig(urgency).emoji}
              </span>
            </div>
          )}
          {showText && (
            <span className={`font-medium ${compact ? 'text-xs' : 'text-xs'}`}>
              {getUrgencyConfig(urgency).label}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

interface SentimentIndicatorProps {
  score: number // -1.0 to 1.0
  size?: 'sm' | 'md' | 'lg'
}

export function SentimentIndicator({ score, size = 'md' }: SentimentIndicatorProps) {
  const getColor = () => {
    if (score > 0.3) return 'bg-green-500'
    if (score > 0) return 'bg-green-300'
    if (score > -0.3) return 'bg-gray-400'
    if (score > -0.7) return 'bg-red-300'
    return 'bg-red-500'
  }

  const getLabel = () => {
    if (score > 0.3) return 'Very Positive'
    if (score > 0) return 'Positive'
    if (score > -0.3) return 'Neutral'
    if (score > -0.7) return 'Negative'
    return 'Very Negative'
  }

  const sizeClasses = {
    sm: 'h-1.5 w-24',
    md: 'h-2 w-32',
    lg: 'h-3 w-40',
  }

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  }

  // Convert score from -1 to 1 to percentage (0-100%)
  const percentage = ((score + 1) / 2) * 100

  return (
    <div className='inline-flex items-center space-x-2'>
      <div className={`relative overflow-hidden rounded-full bg-gray-200 ${sizeClasses[size]}`}>
        <div
          className={`absolute top-0 left-0 h-full transition-all duration-500 ${getColor()}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <span className={`font-medium text-gray-700 ${textSizeClasses[size]}`}>{getLabel()}</span>
      <span className={`text-gray-500 ${textSizeClasses[size]}`}>({(score * 100).toFixed(0)})</span>
    </div>
  )
}
