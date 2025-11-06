'use client'

import React, { useState } from 'react'
import { useDemo, useDemoActions } from '@/contexts/demo-context'

interface DemoResetButtonProps {
  variant?: 'primary' | 'secondary' | 'minimal'
  size?: 'sm' | 'md' | 'lg'
  showConfirmation?: boolean
  onResetComplete?: () => void
  className?: string
}

function ConfirmationModal({
  isOpen,
  onConfirm,
  onCancel,
  isResetting,
}: {
  isOpen: boolean
  onConfirm: () => void
  onCancel: () => void
  isResetting: boolean
}) {
  if (!isOpen) return null

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
      <div className='w-full max-w-md rounded-xl bg-white p-6 shadow-2xl'>
        {/* Header */}
        <div className='mb-4 flex items-center'>
          <div className='mr-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100'>
            <svg
              className='h-6 w-6 text-red-600'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
              />
            </svg>
          </div>
          <div>
            <h3 className='text-lg font-semibold text-gray-900'>Reset Demo?</h3>
            <p className='text-sm text-gray-600'>This action cannot be undone</p>
          </div>
        </div>

        {/* Content */}
        <div className='mb-6'>
          <p className='mb-4 text-gray-700'>Are you sure you want to reset the demo? This will:</p>
          <ul className='space-y-2 text-sm text-gray-600'>
            <li className='flex items-center'>
              <svg
                className='mr-2 h-4 w-4 text-red-500'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M6 18L18 6M6 6l12 12'
                />
              </svg>
              Clear all progress and completed steps
            </li>
            <li className='flex items-center'>
              <svg
                className='mr-2 h-4 w-4 text-red-500'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M6 18L18 6M6 6l12 12'
                />
              </svg>
              Reset all conversations to their initial state
            </li>
            <li className='flex items-center'>
              <svg
                className='mr-2 h-4 w-4 text-red-500'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M6 18L18 6M6 6l12 12'
                />
              </svg>
              Restart analytics tracking
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className='flex space-x-3'>
          <button
            onClick={onCancel}
            disabled={isResetting}
            className='flex-1 rounded-lg bg-gray-100 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50'
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isResetting}
            className='flex flex-1 items-center justify-center rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50'
          >
            {isResetting ? (
              <>
                <svg
                  className='mr-2 h-4 w-4 animate-spin'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
                  />
                </svg>
                Resetting...
              </>
            ) : (
              'Reset Demo'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export function DemoResetButton({
  variant = 'secondary',
  size = 'md',
  showConfirmation = true,
  onResetComplete,
  className = '',
}: DemoResetButtonProps) {
  const { state } = useDemo()
  const { resetDemo } = useDemoActions()
  const [showModal, setShowModal] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  if (!state.isActive) return null

  const handleReset = async () => {
    if (showConfirmation) {
      setShowModal(true)
    } else {
      await performReset()
    }
  }

  const performReset = async () => {
    setIsResetting(true)
    try {
      // Call API to reset demo on server
      const response = await fetch('/api/demo/reset/current', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scenario: state.scenario,
          preserveScenario: true,
        }),
      })

      if (response.ok) {
        resetDemo()
        onResetComplete?.()
        setShowModal(false)
      } else {
        console.error('Failed to reset demo on server')
        // Still reset locally
        resetDemo()
        onResetComplete?.()
        setShowModal(false)
      }
    } catch (error) {
      console.error('Error resetting demo:', error)
      // Still reset locally
      resetDemo()
      onResetComplete?.()
      setShowModal(false)
    } finally {
      setIsResetting(false)
    }
  }

  const getButtonClasses = () => {
    const baseClasses =
      'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

    // Size classes
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
    }

    // Variant classes
    const variantClasses = {
      primary: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
      secondary:
        'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-500',
      minimal: 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 focus:ring-gray-500',
    }

    return `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`
  }

  const getIconSize = () => {
    return size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'
  }

  return (
    <>
      <button
        onClick={handleReset}
        disabled={isResetting}
        className={getButtonClasses()}
        title='Reset demo to initial state'
        aria-label='Reset demo'
      >
        <svg
          className={`${getIconSize()} ${size !== 'sm' ? 'mr-2' : ''}`}
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
          />
        </svg>
        {size !== 'sm' && (isResetting ? 'Resetting...' : 'Reset Demo')}
      </button>

      <ConfirmationModal
        isOpen={showModal}
        onConfirm={performReset}
        onCancel={() => setShowModal(false)}
        isResetting={isResetting}
      />
    </>
  )
}

// Quick reset button for floating UI
export function QuickResetButton() {
  const { resetDemo } = useDemoActions()

  return (
    <button
      onClick={resetDemo}
      className='rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800'
      title='Quick reset (no confirmation)'
      aria-label='Quick reset demo'
    >
      <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
        />
      </svg>
    </button>
  )
}

// Reset button with progress info
export function ProgressResetButton() {
  const { state } = useDemo()
  const completedSteps = state.steps.filter(step => step.completed).length

  return (
    <div className='rounded-lg border border-gray-200 bg-white p-4'>
      <div className='mb-3 flex items-center justify-between'>
        <div>
          <h3 className='text-sm font-medium text-gray-900'>Demo Progress</h3>
          <p className='text-xs text-gray-600'>
            {completedSteps} of {state.steps.length} steps completed
          </p>
        </div>
        <div className='text-2xl font-bold text-green-600'>{Math.round(state.progress)}%</div>
      </div>

      <div className='mb-4 h-2 w-full rounded-full bg-gray-200'>
        <div
          className='h-2 rounded-full bg-green-600 transition-all duration-300'
          style={{ width: `${state.progress}%` }}
        />
      </div>

      <DemoResetButton
        variant='secondary'
        size='sm'
        className='w-full'
        onResetComplete={() => {
          // Optional: Show success message or perform additional actions
          console.log('Demo reset completed')
        }}
      />
    </div>
  )
}
