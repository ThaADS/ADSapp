"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useDemo, useDemoActions, DemoMessage, DemoConversation } from '@/contexts/demo-context';

interface SimulationPreset {
  id: string;
  name: string;
  description: string;
  messages: Omit<DemoMessage, 'id' | 'timestamp'>[];
  interval: number; // milliseconds between messages
  triggerWords?: string[]; // words that trigger this simulation
}

const SIMULATION_PRESETS: Record<string, SimulationPreset[]> = {
  ecommerce: [
    {
      id: 'order-inquiry',
      name: 'Order Status Inquiry',
      description: 'Customer asking about their order',
      interval: 3000,
      triggerWords: ['order', 'status', 'delivery', 'shipping'],
      messages: [
        {
          type: 'incoming',
          content: 'Hi there! I placed an order last week and haven\'t received any updates.',
          sender: 'Jessica Miller',
          messageType: 'text',
        },
        {
          type: 'incoming',
          content: 'Order number is #54321. Can you help me check the status?',
          sender: 'Jessica Miller',
          messageType: 'text',
        }
      ],
    },
    {
      id: 'product-question',
      name: 'Product Question',
      description: 'Customer asking about product details',
      interval: 4000,
      triggerWords: ['product', 'size', 'color', 'availability'],
      messages: [
        {
          type: 'incoming',
          content: 'Do you have the blue sweater in size M?',
          sender: 'Tom Wilson',
          messageType: 'text',
        },
        {
          type: 'incoming',
          content: 'Also, what material is it made of?',
          sender: 'Tom Wilson',
          messageType: 'text',
        }
      ],
    },
    {
      id: 'return-request',
      name: 'Return Request',
      description: 'Customer wants to return an item',
      interval: 5000,
      triggerWords: ['return', 'refund', 'exchange'],
      messages: [
        {
          type: 'incoming',
          content: 'I need to return the shoes I ordered. They don\'t fit properly.',
          sender: 'Maria Garcia',
          messageType: 'text',
        },
        {
          type: 'incoming',
          content: 'What\'s the return process?',
          sender: 'Maria Garcia',
          messageType: 'text',
        }
      ],
    },
  ],
  support: [
    {
      id: 'bug-report',
      name: 'Bug Report',
      description: 'User reporting a technical issue',
      interval: 2000,
      triggerWords: ['bug', 'error', 'crash', 'problem'],
      messages: [
        {
          type: 'incoming',
          content: 'The app crashes every time I try to sync my data 😞',
          sender: 'Alex Chen',
          messageType: 'text',
        },
        {
          type: 'incoming',
          content: 'This has been happening for 3 days now. I\'m using iOS 17.',
          sender: 'Alex Chen',
          messageType: 'text',
        }
      ],
    },
    {
      id: 'feature-request',
      name: 'Feature Request',
      description: 'User requesting a new feature',
      interval: 3500,
      triggerWords: ['feature', 'suggestion', 'improvement'],
      messages: [
        {
          type: 'incoming',
          content: 'Would it be possible to add dark mode to the app?',
          sender: 'Sarah Kim',
          messageType: 'text',
        },
        {
          type: 'incoming',
          content: 'Many users have been asking for this on the forums.',
          sender: 'Sarah Kim',
          messageType: 'text',
        }
      ],
    },
  ],
  restaurant: [
    {
      id: 'food-order',
      name: 'Food Order',
      description: 'Customer placing a food order',
      interval: 2500,
      triggerWords: ['order', 'food', 'menu', 'delivery'],
      messages: [
        {
          type: 'incoming',
          content: 'Hi! Can I place an order for delivery?',
          sender: 'Mike Johnson',
          messageType: 'text',
        },
        {
          type: 'incoming',
          content: 'I\'d like 2 margherita pizzas and 1 Caesar salad please',
          sender: 'Mike Johnson',
          messageType: 'text',
        }
      ],
    },
    {
      id: 'reservation',
      name: 'Table Reservation',
      description: 'Customer making a reservation',
      interval: 4000,
      triggerWords: ['reservation', 'table', 'book', 'tonight'],
      messages: [
        {
          type: 'incoming',
          content: 'Do you have availability for 4 people tonight at 7 PM?',
          sender: 'Lisa Brown',
          messageType: 'text',
        },
        {
          type: 'incoming',
          content: 'It\'s for a special occasion 🎉',
          sender: 'Lisa Brown',
          messageType: 'text',
        }
      ],
    },
  ],
  agency: [
    {
      id: 'campaign-performance',
      name: 'Campaign Performance',
      description: 'Client asking about campaign results',
      interval: 3000,
      triggerWords: ['campaign', 'performance', 'results', 'analytics'],
      messages: [
        {
          type: 'incoming',
          content: 'How is our Q4 campaign performing so far?',
          sender: 'David Park',
          messageType: 'text',
        },
        {
          type: 'incoming',
          content: 'We need the monthly report for the board meeting.',
          sender: 'David Park',
          messageType: 'text',
        }
      ],
    },
    {
      id: 'new-project',
      name: 'New Project Request',
      description: 'Client requesting a new campaign',
      interval: 5000,
      triggerWords: ['new', 'project', 'campaign', 'launch'],
      messages: [
        {
          type: 'incoming',
          content: 'We\'re launching a new product next month. Can we set up a campaign?',
          sender: 'Jennifer Lee',
          messageType: 'text',
        },
        {
          type: 'incoming',
          content: 'Budget is around $50k. When can we discuss details?',
          sender: 'Jennifer Lee',
          messageType: 'text',
        }
      ],
    },
  ],
};

function SimulationControls({
  onStartSimulation,
  onStopSimulation,
  isSimulating,
  simulationSpeed,
  onSpeedChange
}: {
  onStartSimulation: (presetId: string) => void;
  onStopSimulation: () => void;
  isSimulating: boolean;
  simulationSpeed: number;
  onSpeedChange: (speed: number) => void;
}) {
  const { state } = useDemo();
  const [selectedPreset, setSelectedPreset] = useState<string>('');

  const presets = SIMULATION_PRESETS[state.scenario] || [];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Message Simulator</h3>
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
          isSimulating
            ? 'bg-green-100 text-green-800'
            : 'bg-gray-100 text-gray-600'
        }`}>
          {isSimulating ? 'Active' : 'Inactive'}
        </div>
      </div>

      {/* Preset selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Choose Simulation
        </label>
        <select
          value={selectedPreset}
          onChange={(e) => setSelectedPreset(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isSimulating}
        >
          <option value="">Select a scenario...</option>
          {presets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>
        {selectedPreset && (
          <p className="text-sm text-gray-600 mt-1">
            {presets.find(p => p.id === selectedPreset)?.description}
          </p>
        )}
      </div>

      {/* Speed control */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Simulation Speed: {simulationSpeed}x
        </label>
        <input
          type="range"
          min="0.5"
          max="3"
          step="0.5"
          value={simulationSpeed}
          onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
          className="w-full"
          disabled={isSimulating}
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Slow (0.5x)</span>
          <span>Normal (1x)</span>
          <span>Fast (3x)</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex space-x-3">
        {!isSimulating ? (
          <button
            onClick={() => selectedPreset && onStartSimulation(selectedPreset)}
            disabled={!selectedPreset}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Start Simulation
          </button>
        ) : (
          <button
            onClick={onStopSimulation}
            className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
          >
            Stop Simulation
          </button>
        )}
      </div>
    </div>
  );
}

function SimulationStatus({ preset, messageIndex, totalMessages }: {
  preset: SimulationPreset | null;
  messageIndex: number;
  totalMessages: number;
}) {
  if (!preset) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-blue-900">
          Running: {preset.name}
        </span>
        <span className="text-xs text-blue-600">
          {messageIndex} / {totalMessages} messages
        </span>
      </div>
      <div className="w-full bg-blue-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${(messageIndex / totalMessages) * 100}%` }}
        />
      </div>
    </div>
  );
}

export function DemoSimulator() {
  const { state } = useDemo();
  const { startSimulation, stopSimulation, setSimulationSpeed, addMessage, incrementInteraction } = useDemoActions();
  const [currentPreset, setCurrentPreset] = useState<SimulationPreset | null>(null);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  // Create new conversation for simulation
  const createSimulationConversation = (preset: SimulationPreset): string => {
    const conversationId = `sim-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    // In a real implementation, you'd add this conversation to the state
    // For demo purposes, we'll use an existing conversation
    return state.conversations[0]?.id || 'default';
  };

  const handleStartSimulation = (presetId: string) => {
    const presets = SIMULATION_PRESETS[state.scenario] || [];
    const preset = presets.find(p => p.id === presetId);

    if (!preset) return;

    setCurrentPreset(preset);
    setCurrentMessageIndex(0);
    startSimulation();

    // Start sending messages
    const conversationId = state.activeConversationId || state.conversations[0]?.id;
    if (conversationId) {
      sendNextMessage(preset, 0, conversationId);
    }
  };

  const handleStopSimulation = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }

    stopSimulation();
    setCurrentPreset(null);
    setCurrentMessageIndex(0);
  };

  const sendNextMessage = (preset: SimulationPreset, messageIndex: number, conversationId: string) => {
    if (messageIndex >= preset.messages.length) {
      // Simulation complete
      handleStopSimulation();
      return;
    }

    const message = preset.messages[messageIndex];
    const delay = preset.interval / state.simulationSpeed;

    const timeout = setTimeout(() => {
      addMessage(conversationId, message);
      incrementInteraction();
      setCurrentMessageIndex(messageIndex + 1);

      // Send next message
      sendNextMessage(preset, messageIndex + 1, conversationId);
    }, delay);

    setTimeoutId(timeout);
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  // Stop simulation when demo ends
  useEffect(() => {
    if (!state.isActive && state.isSimulating) {
      handleStopSimulation();
    }
  }, [state.isActive]);

  if (!state.isActive) return null;

  return (
    <div className="space-y-4">
      {/* Simulation Status */}
      {state.isSimulating && currentPreset && (
        <SimulationStatus
          preset={currentPreset}
          messageIndex={currentMessageIndex}
          totalMessages={currentPreset.messages.length}
        />
      )}

      {/* Simulation Controls */}
      <SimulationControls
        onStartSimulation={handleStartSimulation}
        onStopSimulation={handleStopSimulation}
        isSimulating={state.isSimulating}
        simulationSpeed={state.simulationSpeed}
        onSpeedChange={setSimulationSpeed}
      />

      {/* Quick Actions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Quick Simulations</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(SIMULATION_PRESETS[state.scenario] || []).map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleStartSimulation(preset.id)}
              disabled={state.isSimulating}
              className="text-left p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <div className="font-medium text-sm text-gray-900">{preset.name}</div>
              <div className="text-xs text-gray-600 mt-1">{preset.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-yellow-800">Simulation Tips</h4>
            <ul className="text-xs text-yellow-700 mt-1 space-y-1">
              <li>• Simulations help you practice handling different customer scenarios</li>
              <li>• Try responding to simulated messages to complete tour steps</li>
              <li>• Use different speeds to practice quick responses or thoughtful replies</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// Floating simulation widget for minimal UI
export function FloatingSimulator() {
  const { state } = useDemo();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!state.isActive) return null;

  return (
    <div className="fixed bottom-20 right-6 z-20">
      {isExpanded ? (
        <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-80">
          <div className="flex items-center justify-between p-3 border-b border-gray-200">
            <h3 className="font-medium text-gray-900">Message Simulator</h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          <div className="p-3">
            <DemoSimulator />
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsExpanded(true)}
          className={`p-3 rounded-full shadow-lg transition-colors ${
            state.isSimulating
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-white hover:bg-gray-50 text-gray-600 border border-gray-200'
          }`}
          title="Open Message Simulator"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {state.isSimulating && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
          )}
        </button>
      )}
    </div>
  );
}