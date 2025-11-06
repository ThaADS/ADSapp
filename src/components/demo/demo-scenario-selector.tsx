'use client'

import React, { useState } from 'react'
import { useDemo, useDemoActions, DemoScenario, DEMO_SCENARIOS } from '@/contexts/demo-context'

interface ScenarioSelectorProps {
  variant?: 'grid' | 'list' | 'dropdown' | 'compact'
  onSelect?: (scenario: DemoScenario) => void
  showDescriptions?: boolean
  allowChange?: boolean
  className?: string
}

interface ScenarioCardProps {
  scenario: DemoScenario
  info: (typeof DEMO_SCENARIOS)[DemoScenario]
  isSelected: boolean
  isActive: boolean
  onSelect: (scenario: DemoScenario) => void
  showDescription?: boolean
  disabled?: boolean
}

function ScenarioCard({
  scenario,
  info,
  isSelected,
  isActive,
  onSelect,
  showDescription = true,
  disabled = false,
}: ScenarioCardProps) {
  return (
    <div
      className={`relative cursor-pointer rounded-xl border-2 p-6 transition-all duration-200 ${
        isSelected
          ? 'border-green-500 bg-green-50 shadow-md'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
      onClick={() => !disabled && onSelect(scenario)}
    >
      {/* Selected indicator */}
      {isSelected && (
        <div className='absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-green-600'>
          <svg className='h-4 w-4 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
          </svg>
        </div>
      )}

      {/* Active indicator */}
      {isActive && (
        <div className='absolute top-4 right-4'>
          <div className='flex items-center space-x-1 rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800'>
            <div className='h-2 w-2 animate-pulse rounded-full bg-blue-600' />
            <span>Active</span>
          </div>
        </div>
      )}

      {/* Icon */}
      <div className='mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 text-3xl'>
        {info.icon}
      </div>

      {/* Content */}
      <div>
        <h3 className='mb-2 text-lg font-semibold text-gray-900'>{info.name}</h3>
        {showDescription && (
          <p className='mb-4 text-sm leading-relaxed text-gray-600'>{info.description}</p>
        )}

        {/* Stats */}
        <div className='flex items-center justify-between text-xs text-gray-500'>
          <span>{info.steps.length} steps</span>
          <span>{info.conversations.length} conversations</span>
        </div>
      </div>
    </div>
  )
}

function DropdownSelector({
  currentScenario,
  onSelect,
  disabled = false,
}: {
  currentScenario: DemoScenario
  onSelect: (scenario: DemoScenario) => void
  disabled?: boolean
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className='relative'>
      <button
        type='button'
        className={`w-full cursor-default rounded-lg border border-gray-300 bg-white px-4 py-3 text-left focus:border-transparent focus:ring-2 focus:ring-green-500 focus:outline-none ${
          disabled ? 'cursor-not-allowed opacity-50' : 'hover:border-gray-400'
        }`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-3'>
            <span className='text-xl'>{DEMO_SCENARIOS[currentScenario].icon}</span>
            <div>
              <div className='font-medium text-gray-900'>
                {DEMO_SCENARIOS[currentScenario].name}
              </div>
              <div className='truncate text-sm text-gray-600'>
                {DEMO_SCENARIOS[currentScenario].description}
              </div>
            </div>
          </div>
          <svg
            className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180 transform' : ''}`}
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className='ring-opacity-5 absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 text-base shadow-lg ring-1 ring-black focus:outline-none'>
          {Object.entries(DEMO_SCENARIOS).map(([key, info]) => {
            const scenario = key as DemoScenario
            const isSelected = scenario === currentScenario

            return (
              <div
                key={scenario}
                className={`relative cursor-pointer px-4 py-3 select-none hover:bg-gray-50 ${
                  isSelected ? 'bg-green-50 text-green-900' : 'text-gray-900'
                }`}
                onClick={() => {
                  onSelect(scenario)
                  setIsOpen(false)
                }}
              >
                <div className='flex items-center space-x-3'>
                  <span className='text-lg'>{info.icon}</span>
                  <div className='flex-1'>
                    <div className='font-medium'>{info.name}</div>
                    <div className='text-sm text-gray-600'>{info.description}</div>
                  </div>
                  {isSelected && (
                    <svg
                      className='h-5 w-5 text-green-600'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M5 13l4 4L19 7'
                      />
                    </svg>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function DemoScenarioSelector({
  variant = 'grid',
  onSelect,
  showDescriptions = true,
  allowChange = true,
  className = '',
}: ScenarioSelectorProps) {
  const { state } = useDemo()
  const { setScenario, startDemo } = useDemoActions()

  const handleSelect = (scenario: DemoScenario) => {
    if (!allowChange && state.isActive) return

    if (state.isActive) {
      setScenario(scenario)
    } else {
      startDemo(scenario)
    }

    onSelect?.(scenario)
  }

  const scenarios = Object.entries(DEMO_SCENARIOS) as [
    DemoScenario,
    (typeof DEMO_SCENARIOS)[DemoScenario],
  ][]

  // Dropdown variant
  if (variant === 'dropdown') {
    return (
      <div className={`w-full max-w-md ${className}`}>
        <label className='mb-2 block text-sm font-medium text-gray-700'>Choose Demo Scenario</label>
        <DropdownSelector
          currentScenario={state.scenario}
          onSelect={handleSelect}
          disabled={state.isActive && !allowChange}
        />
      </div>
    )
  }

  // List variant
  if (variant === 'list') {
    return (
      <div className={`space-y-3 ${className}`}>
        <h3 className='mb-4 text-lg font-semibold text-gray-900'>Choose Your Demo Scenario</h3>
        {scenarios.map(([scenario, info]) => (
          <div
            key={scenario}
            className={`flex cursor-pointer items-center rounded-lg border-2 p-4 transition-all duration-200 ${
              state.scenario === scenario
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            } ${state.isActive && !allowChange ? 'cursor-not-allowed opacity-50' : ''}`}
            onClick={() => handleSelect(scenario)}
          >
            <div className='mr-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 text-xl'>
              {info.icon}
            </div>
            <div className='flex-1'>
              <h4 className='font-semibold text-gray-900'>{info.name}</h4>
              {showDescriptions && <p className='mt-1 text-sm text-gray-600'>{info.description}</p>}
              <div className='mt-2 flex items-center space-x-4 text-xs text-gray-500'>
                <span>{info.steps.length} steps</span>
                <span>{info.conversations.length} conversations</span>
              </div>
            </div>
            {state.scenario === scenario && (
              <div className='ml-4'>
                <svg
                  className='h-6 w-6 text-green-600'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M5 13l4 4L19 7'
                  />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <div className={`flex space-x-2 ${className}`}>
        {scenarios.map(([scenario, info]) => (
          <button
            key={scenario}
            className={`flex items-center space-x-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              state.scenario === scenario
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            } ${state.isActive && !allowChange ? 'cursor-not-allowed opacity-50' : ''}`}
            onClick={() => handleSelect(scenario)}
            disabled={state.isActive && !allowChange}
          >
            <span>{info.icon}</span>
            <span>{info.name}</span>
          </button>
        ))}
      </div>
    )
  }

  // Grid variant (default)
  return (
    <div className={className}>
      <h3 className='mb-6 text-center text-xl font-semibold text-gray-900'>
        Choose Your Demo Experience
      </h3>
      <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
        {scenarios.map(([scenario, info]) => (
          <ScenarioCard
            key={scenario}
            scenario={scenario}
            info={info}
            isSelected={state.scenario === scenario}
            isActive={state.isActive && state.scenario === scenario}
            onSelect={handleSelect}
            showDescription={showDescriptions}
            disabled={state.isActive && !allowChange}
          />
        ))}
      </div>

      {state.isActive && !allowChange && (
        <div className='mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3'>
          <div className='flex items-center space-x-2 text-sm text-blue-800'>
            <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            </svg>
            <span>Demo is active. Reset demo to change scenarios.</span>
          </div>
        </div>
      )}
    </div>
  )
}

// Quick scenario switcher for active demos
export function QuickScenarioSwitcher() {
  const { state } = useDemo()
  const { setScenario } = useDemoActions()
  const [isOpen, setIsOpen] = useState(false)

  if (!state.isActive) return null

  return (
    <div className='relative'>
      <button
        className='flex items-center space-x-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition-colors hover:bg-gray-50'
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{DEMO_SCENARIOS[state.scenario].icon}</span>
        <span className='hidden sm:inline'>{DEMO_SCENARIOS[state.scenario].name}</span>
        <svg
          className='h-4 w-4 text-gray-400'
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
        </svg>
      </button>

      {isOpen && (
        <div className='absolute top-full left-0 z-10 mt-1 w-64 rounded-lg border border-gray-200 bg-white py-1 shadow-lg'>
          {Object.entries(DEMO_SCENARIOS).map(([key, info]) => {
            const scenario = key as DemoScenario
            const isSelected = scenario === state.scenario

            return (
              <button
                key={scenario}
                className={`w-full px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
                  isSelected ? 'bg-green-50 text-green-900' : 'text-gray-900'
                }`}
                onClick={() => {
                  setScenario(scenario)
                  setIsOpen(false)
                }}
              >
                <div className='flex items-center space-x-3'>
                  <span className='text-lg'>{info.icon}</span>
                  <div>
                    <div className='font-medium'>{info.name}</div>
                    <div className='text-xs text-gray-600'>{info.steps.length} steps</div>
                  </div>
                  {isSelected && (
                    <svg
                      className='ml-auto h-4 w-4 text-green-600'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M5 13l4 4L19 7'
                      />
                    </svg>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
