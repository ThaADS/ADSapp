"use client";

import React, { useState } from 'react';
import { useDemo, useDemoActions, DemoScenario, DEMO_SCENARIOS } from '@/contexts/demo-context';

interface ScenarioSelectorProps {
  variant?: 'grid' | 'list' | 'dropdown' | 'compact';
  onSelect?: (scenario: DemoScenario) => void;
  showDescriptions?: boolean;
  allowChange?: boolean;
  className?: string;
}

interface ScenarioCardProps {
  scenario: DemoScenario;
  info: typeof DEMO_SCENARIOS[DemoScenario];
  isSelected: boolean;
  isActive: boolean;
  onSelect: (scenario: DemoScenario) => void;
  showDescription?: boolean;
  disabled?: boolean;
}

function ScenarioCard({
  scenario,
  info,
  isSelected,
  isActive,
  onSelect,
  showDescription = true,
  disabled = false
}: ScenarioCardProps) {
  return (
    <div
      className={`relative border-2 rounded-xl p-6 cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'border-green-500 bg-green-50 shadow-md'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={() => !disabled && onSelect(scenario)}
    >
      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      {/* Active indicator */}
      {isActive && (
        <div className="absolute top-4 right-4">
          <div className="flex items-center space-x-1 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
            <span>Active</span>
          </div>
        </div>
      )}

      {/* Icon */}
      <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center text-3xl mb-4">
        {info.icon}
      </div>

      {/* Content */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{info.name}</h3>
        {showDescription && (
          <p className="text-sm text-gray-600 mb-4 leading-relaxed">{info.description}</p>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{info.steps.length} steps</span>
          <span>{info.conversations.length} conversations</span>
        </div>
      </div>
    </div>
  );
}

function DropdownSelector({
  currentScenario,
  onSelect,
  disabled = false
}: {
  currentScenario: DemoScenario;
  onSelect: (scenario: DemoScenario) => void;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        className={`w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-left cursor-default focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-400'
        }`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-xl">{DEMO_SCENARIOS[currentScenario].icon}</span>
            <div>
              <div className="font-medium text-gray-900">{DEMO_SCENARIOS[currentScenario].name}</div>
              <div className="text-sm text-gray-600 truncate">
                {DEMO_SCENARIOS[currentScenario].description}
              </div>
            </div>
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-lg py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none">
          {Object.entries(DEMO_SCENARIOS).map(([key, info]) => {
            const scenario = key as DemoScenario;
            const isSelected = scenario === currentScenario;

            return (
              <div
                key={scenario}
                className={`cursor-pointer select-none relative py-3 px-4 hover:bg-gray-50 ${
                  isSelected ? 'bg-green-50 text-green-900' : 'text-gray-900'
                }`}
                onClick={() => {
                  onSelect(scenario);
                  setIsOpen(false);
                }}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{info.icon}</span>
                  <div className="flex-1">
                    <div className="font-medium">{info.name}</div>
                    <div className="text-sm text-gray-600">{info.description}</div>
                  </div>
                  {isSelected && (
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function DemoScenarioSelector({
  variant = 'grid',
  onSelect,
  showDescriptions = true,
  allowChange = true,
  className = ''
}: ScenarioSelectorProps) {
  const { state } = useDemo();
  const { setScenario, startDemo } = useDemoActions();

  const handleSelect = (scenario: DemoScenario) => {
    if (!allowChange && state.isActive) return;

    if (state.isActive) {
      setScenario(scenario);
    } else {
      startDemo(scenario);
    }

    onSelect?.(scenario);
  };

  const scenarios = Object.entries(DEMO_SCENARIOS) as [DemoScenario, typeof DEMO_SCENARIOS[DemoScenario]][];

  // Dropdown variant
  if (variant === 'dropdown') {
    return (
      <div className={`w-full max-w-md ${className}`}>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Choose Demo Scenario
        </label>
        <DropdownSelector
          currentScenario={state.scenario}
          onSelect={handleSelect}
          disabled={state.isActive && !allowChange}
        />
      </div>
    );
  }

  // List variant
  if (variant === 'list') {
    return (
      <div className={`space-y-3 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Your Demo Scenario</h3>
        {scenarios.map(([scenario, info]) => (
          <div
            key={scenario}
            className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
              state.scenario === scenario
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            } ${state.isActive && !allowChange ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => handleSelect(scenario)}
          >
            <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center text-xl mr-4">
              {info.icon}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900">{info.name}</h4>
              {showDescriptions && (
                <p className="text-sm text-gray-600 mt-1">{info.description}</p>
              )}
              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                <span>{info.steps.length} steps</span>
                <span>{info.conversations.length} conversations</span>
              </div>
            </div>
            {state.scenario === scenario && (
              <div className="ml-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return (
      <div className={`flex space-x-2 ${className}`}>
        {scenarios.map(([scenario, info]) => (
          <button
            key={scenario}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              state.scenario === scenario
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            } ${state.isActive && !allowChange ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => handleSelect(scenario)}
            disabled={state.isActive && !allowChange}
          >
            <span>{info.icon}</span>
            <span>{info.name}</span>
          </button>
        ))}
      </div>
    );
  }

  // Grid variant (default)
  return (
    <div className={className}>
      <h3 className="text-xl font-semibold text-gray-900 mb-6 text-center">
        Choose Your Demo Experience
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2 text-sm text-blue-800">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Demo is active. Reset demo to change scenarios.</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Quick scenario switcher for active demos
export function QuickScenarioSwitcher() {
  const { state } = useDemo();
  const { setScenario } = useDemoActions();
  const [isOpen, setIsOpen] = useState(false);

  if (!state.isActive) return null;

  return (
    <div className="relative">
      <button
        className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{DEMO_SCENARIOS[state.scenario].icon}</span>
        <span className="hidden sm:inline">{DEMO_SCENARIOS[state.scenario].name}</span>
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white shadow-lg rounded-lg py-1 z-10 border border-gray-200">
          {Object.entries(DEMO_SCENARIOS).map(([key, info]) => {
            const scenario = key as DemoScenario;
            const isSelected = scenario === state.scenario;

            return (
              <button
                key={scenario}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                  isSelected ? 'bg-green-50 text-green-900' : 'text-gray-900'
                }`}
                onClick={() => {
                  setScenario(scenario);
                  setIsOpen(false);
                }}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{info.icon}</span>
                  <div>
                    <div className="font-medium">{info.name}</div>
                    <div className="text-xs text-gray-600">{info.steps.length} steps</div>
                  </div>
                  {isSelected && (
                    <svg className="w-4 h-4 text-green-600 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}