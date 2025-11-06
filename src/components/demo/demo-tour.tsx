'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useDemo, useDemoActions } from '@/contexts/demo-context'

interface TourStep {
  id: string
  title: string
  content: string
  target: string // CSS selector for the element to highlight
  position: 'top' | 'bottom' | 'left' | 'right' | 'center'
  action?: 'click' | 'hover' | 'type' | 'wait'
  actionText?: string
  spotlightPadding?: number
}

const TOUR_STEPS: Record<string, TourStep[]> = {
  welcome: [
    {
      id: 'welcome-1',
      title: 'Welcome to ADSapp Demo! 👋',
      content:
        "Let's take a quick tour of your new WhatsApp Business inbox. This demo will show you how to manage conversations like a pro.",
      target: 'body',
      position: 'center',
    },
    {
      id: 'welcome-2',
      title: 'Conversation List',
      content:
        "Here you'll see all your WhatsApp conversations. Each conversation shows the customer name, last message, and status.",
      target: '[data-tour="conversation-list"]',
      position: 'right',
      spotlightPadding: 12,
    },
    {
      id: 'welcome-3',
      title: 'Chat Window',
      content:
        "This is where you'll read and respond to messages. The interface is designed for fast, efficient communication.",
      target: '[data-tour="chat-window"]',
      position: 'left',
      spotlightPadding: 12,
    },
    {
      id: 'welcome-4',
      title: 'Message Input',
      content:
        'Type your responses here. You can send text, emojis, images, and use templates for quick replies.',
      target: '[data-tour="message-input"]',
      position: 'top',
      action: 'click',
      actionText: 'Click here to try typing',
    },
  ],
  'inbox-overview': [
    {
      id: 'inbox-1',
      title: 'Inbox Features',
      content:
        "Your inbox is organized to help you work efficiently. Let's explore the key features.",
      target: 'body',
      position: 'center',
    },
    {
      id: 'inbox-2',
      title: 'Conversation Status',
      content:
        'Conversations are color-coded: Green for active, Yellow for pending, and Gray for resolved.',
      target: '[data-tour="conversation-status"]',
      position: 'right',
    },
    {
      id: 'inbox-3',
      title: 'Quick Actions',
      content:
        'Right-click any conversation for quick actions like assign, tag, or mark as resolved.',
      target: '[data-tour="conversation-item"]:first-child',
      position: 'right',
      action: 'hover',
      actionText: 'Hover to see actions',
    },
    {
      id: 'inbox-4',
      title: 'Search & Filter',
      content:
        'Use the search bar to quickly find conversations by customer name, phone number, or message content.',
      target: '[data-tour="search-bar"]',
      position: 'bottom',
    },
  ],
  'handle-inquiry': [
    {
      id: 'inquiry-1',
      title: 'Handling Customer Inquiries',
      content:
        "Let's respond to Sarah's order inquiry. This is a common scenario you'll handle daily.",
      target: 'body',
      position: 'center',
    },
    {
      id: 'inquiry-2',
      title: 'Select the Conversation',
      content: "Click on Sarah's conversation to view the full message thread.",
      target: '[data-tour="conversation-item"][data-customer="Sarah Johnson"]',
      position: 'right',
      action: 'click',
      actionText: 'Click to open conversation',
    },
    {
      id: 'inquiry-3',
      title: 'Read the Message',
      content:
        'Sarah is asking about her order status. Notice the urgency tag - this helps prioritize responses.',
      target: '[data-tour="message-thread"]',
      position: 'left',
    },
    {
      id: 'inquiry-4',
      title: 'Craft Your Response',
      content:
        'Type a helpful response. Be professional, friendly, and provide specific information.',
      target: '[data-tour="message-input"]',
      position: 'top',
      action: 'type',
      actionText: 'Try typing a response',
    },
  ],
  'use-templates': [
    {
      id: 'template-1',
      title: 'Message Templates',
      content: 'Templates save time by providing pre-written responses for common questions.',
      target: 'body',
      position: 'center',
    },
    {
      id: 'template-2',
      title: 'Access Templates',
      content: 'Click the template icon to see available templates for different scenarios.',
      target: '[data-tour="templates-button"]',
      position: 'top',
      action: 'click',
      actionText: 'Click to open templates',
    },
    {
      id: 'template-3',
      title: 'Choose a Template',
      content:
        "Select a template that matches the customer's inquiry. You can customize it before sending.",
      target: '[data-tour="template-list"]',
      position: 'left',
    },
    {
      id: 'template-4',
      title: 'Personalize and Send',
      content:
        'Edit the template to add personal touches, then send. Templates make responses faster and more consistent.',
      target: '[data-tour="message-input"]',
      position: 'top',
    },
  ],
}

function TourTooltip({
  step,
  onNext,
  onPrevious,
  onSkip,
  currentStepIndex,
  totalSteps,
}: {
  step: TourStep
  onNext: () => void
  onPrevious: () => void
  onSkip: () => void
  currentStepIndex: number
  totalSteps: number
}) {
  return (
    <div className='relative z-50 max-w-sm rounded-lg border border-gray-200 bg-white p-6 shadow-xl'>
      {/* Header */}
      <div className='mb-4 flex items-center justify-between'>
        <h3 className='text-lg font-semibold text-gray-900'>{step.title}</h3>
        <button
          onClick={onSkip}
          className='text-gray-400 transition-colors hover:text-gray-600'
          title='Skip tour'
        >
          <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M6 18L18 6M6 6l12 12'
            />
          </svg>
        </button>
      </div>

      {/* Content */}
      <p className='mb-6 leading-relaxed text-gray-600'>{step.content}</p>

      {/* Action hint */}
      {step.action && step.actionText && (
        <div className='mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3'>
          <div className='flex items-center space-x-2'>
            <div className='flex h-6 w-6 items-center justify-center rounded-full bg-blue-100'>
              {step.action === 'click' && (
                <svg
                  className='h-3 w-3 text-blue-600'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.121 2.122'
                  />
                </svg>
              )}
              {step.action === 'type' && (
                <svg
                  className='h-3 w-3 text-blue-600'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
                  />
                </svg>
              )}
              {step.action === 'hover' && (
                <svg
                  className='h-3 w-3 text-blue-600'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 3v11a2 2 0 002 2h6a2 2 0 002-2V7M7 7h10M9 7v4m6-4v4'
                  />
                </svg>
              )}
            </div>
            <span className='text-sm font-medium text-blue-800'>{step.actionText}</span>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className='flex items-center justify-between'>
        <div className='text-sm text-gray-500'>
          {currentStepIndex + 1} of {totalSteps}
        </div>
        <div className='flex items-center space-x-2'>
          {currentStepIndex > 0 && (
            <button
              onClick={onPrevious}
              className='px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-gray-800'
            >
              Previous
            </button>
          )}
          <button
            onClick={onNext}
            className='rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700'
          >
            {currentStepIndex === totalSteps - 1 ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>

      {/* Progress dots */}
      <div className='mt-4 flex items-center justify-center space-x-1'>
        {Array.from({ length: totalSteps }).map((_, index) => (
          <div
            key={index}
            className={`h-2 w-2 rounded-full transition-colors ${
              index === currentStepIndex ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

function TourSpotlight({ target, padding = 8 }: { target: string; padding?: number }) {
  const [position, setPosition] = useState<{
    top: number
    left: number
    width: number
    height: number
  } | null>(null)

  useEffect(() => {
    const updatePosition = () => {
      const element = document.querySelector(target)
      if (element) {
        const rect = element.getBoundingClientRect()
        setPosition({
          top: rect.top - padding,
          left: rect.left - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
        })
      }
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition)
    }
  }, [target, padding])

  if (!position) return null

  return (
    <div className='pointer-events-none fixed inset-0 z-40'>
      {/* Overlay */}
      <div className='absolute inset-0 bg-black/50' />

      {/* Spotlight hole */}
      <div
        className='absolute animate-pulse rounded-lg border-4 border-blue-400 bg-transparent shadow-lg'
        style={{
          top: position.top,
          left: position.left,
          width: position.width,
          height: position.height,
          boxShadow: `0 0 0 9999px rgba(0, 0, 0, 0.5)`,
        }}
      />
    </div>
  )
}

export function DemoTour() {
  const { state } = useDemo()
  const { hideTour, setTourStep, completeStep, nextStep } = useDemoActions()
  const [currentTourSteps, setCurrentTourSteps] = useState<TourStep[]>([])
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  })
  const tooltipRef = useRef<HTMLDivElement>(null)

  // Get current step's tour
  useEffect(() => {
    if (state.showTour && state.steps[state.currentStep]) {
      const stepId = state.steps[state.currentStep].id
      const tourSteps = TOUR_STEPS[stepId] || []
      setCurrentTourSteps(tourSteps)
    }
  }, [state.showTour, state.currentStep, state.steps])

  // Calculate tooltip position
  useEffect(() => {
    if (currentTourSteps.length > 0 && state.tourStep < currentTourSteps.length) {
      const currentStep = currentTourSteps[state.tourStep]

      if (currentStep.position === 'center') {
        setTooltipPosition({
          top: window.innerHeight / 2 - 150,
          left: window.innerWidth / 2 - 200,
        })
      } else {
        const element = document.querySelector(currentStep.target)
        if (element) {
          const rect = element.getBoundingClientRect()
          let top = 0
          let left = 0

          switch (currentStep.position) {
            case 'top':
              top = rect.top - 200
              left = rect.left + rect.width / 2 - 200
              break
            case 'bottom':
              top = rect.bottom + 20
              left = rect.left + rect.width / 2 - 200
              break
            case 'left':
              top = rect.top + rect.height / 2 - 100
              left = rect.left - 420
              break
            case 'right':
              top = rect.top + rect.height / 2 - 100
              left = rect.right + 20
              break
          }

          // Keep tooltip within viewport
          top = Math.max(20, Math.min(top, window.innerHeight - 300))
          left = Math.max(20, Math.min(left, window.innerWidth - 420))

          setTooltipPosition({ top, left })
        }
      }
    }
  }, [currentTourSteps, state.tourStep])

  if (!state.showTour || currentTourSteps.length === 0) {
    return null
  }

  const currentStep = currentTourSteps[state.tourStep]
  if (!currentStep) return null

  const handleNext = () => {
    if (state.tourStep < currentTourSteps.length - 1) {
      setTourStep(state.tourStep + 1)
    } else {
      // Tour completed for this step
      completeStep(state.steps[state.currentStep].id)
      hideTour()

      // Auto-advance to next step if enabled
      if (state.settings.autoAdvance && state.currentStep < state.steps.length - 1) {
        setTimeout(() => {
          nextStep()
        }, 1000)
      }
    }
  }

  const handlePrevious = () => {
    if (state.tourStep > 0) {
      setTourStep(state.tourStep - 1)
    }
  }

  const handleSkip = () => {
    hideTour()
  }

  return (
    <>
      {/* Spotlight */}
      {currentStep.target !== 'body' && (
        <TourSpotlight target={currentStep.target} padding={currentStep.spotlightPadding} />
      )}

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className='fixed z-50 transform transition-all duration-300 ease-out'
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
        }}
      >
        <TourTooltip
          step={currentStep}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onSkip={handleSkip}
          currentStepIndex={state.tourStep}
          totalSteps={currentTourSteps.length}
        />
      </div>

      {/* Center overlay for center position */}
      {currentStep.position === 'center' && (
        <div className='fixed inset-0 z-30 bg-black/50' onClick={handleSkip} />
      )}
    </>
  )
}

// Mini tour trigger button
export function TourTrigger() {
  const { state } = useDemo()
  const { showTour } = useDemoActions()

  if (!state.isActive || state.showTour) return null

  return (
    <button
      onClick={showTour}
      className='fixed right-6 bottom-6 z-30 rounded-full bg-blue-600 p-3 text-white shadow-lg transition-colors hover:bg-blue-700'
      title='Start guided tour'
    >
      <svg className='h-6 w-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d='M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
        />
      </svg>
    </button>
  )
}
