"use client";

import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';

// Demo scenario types
export type DemoScenario = 'ecommerce' | 'support' | 'restaurant' | 'agency';

// Demo step types
export interface DemoStep {
  id: string;
  title: string;
  description: string;
  component: string;
  completed: boolean;
  required: boolean;
}

// Demo message types
export interface DemoMessage {
  id: string;
  type: 'incoming' | 'outgoing';
  content: string;
  timestamp: Date;
  sender: string;
  avatar?: string;
  status?: 'sent' | 'delivered' | 'read';
  messageType?: 'text' | 'image' | 'document' | 'template';
}

// Demo conversation
export interface DemoConversation {
  id: string;
  customerName: string;
  customerPhone: string;
  avatar: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  status: 'active' | 'resolved' | 'pending';
  assignedTo?: string;
  tags: string[];
  messages: DemoMessage[];
}

// Demo state interface
export interface DemoState {
  isActive: boolean;
  scenario: DemoScenario;
  currentStep: number;
  progress: number;
  steps: DemoStep[];
  conversations: DemoConversation[];
  activeConversationId: string | null;
  isSimulating: boolean;
  simulationSpeed: number;
  showTour: boolean;
  tourStep: number;
  analytics: {
    startTime: Date | null;
    completedSteps: number;
    timeSpent: number;
    interactionCount: number;
  };
  settings: {
    autoAdvance: boolean;
    showHints: boolean;
    enableSound: boolean;
  };
}

// Demo actions
type DemoAction =
  | { type: 'START_DEMO'; scenario: DemoScenario }
  | { type: 'END_DEMO' }
  | { type: 'RESET_DEMO' }
  | { type: 'SET_SCENARIO'; scenario: DemoScenario }
  | { type: 'NEXT_STEP' }
  | { type: 'PREVIOUS_STEP' }
  | { type: 'SET_STEP'; step: number }
  | { type: 'COMPLETE_STEP'; stepId: string }
  | { type: 'SET_ACTIVE_CONVERSATION'; conversationId: string | null }
  | { type: 'ADD_MESSAGE'; conversationId: string; message: Omit<DemoMessage, 'id' | 'timestamp'> }
  | { type: 'START_SIMULATION' }
  | { type: 'STOP_SIMULATION' }
  | { type: 'SET_SIMULATION_SPEED'; speed: number }
  | { type: 'SHOW_TOUR' }
  | { type: 'HIDE_TOUR' }
  | { type: 'SET_TOUR_STEP'; step: number }
  | { type: 'UPDATE_ANALYTICS'; data: Partial<DemoState['analytics']> }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<DemoState['settings']> }
  | { type: 'INCREMENT_INTERACTION' };

// Demo scenarios configuration
export const DEMO_SCENARIOS: Record<DemoScenario, {
  name: string;
  description: string;
  icon: string;
  steps: DemoStep[];
  conversations: DemoConversation[];
}> = {
  ecommerce: {
    name: 'E-commerce Store',
    description: 'Handle order inquiries, shipping updates, and customer support for an online store',
    icon: '🛒',
    steps: [
      {
        id: 'welcome',
        title: 'Welcome to Demo',
        description: 'Get familiar with the ADSapp interface',
        component: 'WelcomeStep',
        completed: false,
        required: true,
      },
      {
        id: 'inbox-overview',
        title: 'Inbox Overview',
        description: 'See how conversations are organized',
        component: 'InboxOverviewStep',
        completed: false,
        required: true,
      },
      {
        id: 'handle-inquiry',
        title: 'Handle Order Inquiry',
        description: 'Respond to a customer asking about their order',
        component: 'HandleInquiryStep',
        completed: false,
        required: true,
      },
      {
        id: 'use-templates',
        title: 'Use Message Templates',
        description: 'Send quick responses with pre-made templates',
        component: 'UseTemplatesStep',
        completed: false,
        required: true,
      },
      {
        id: 'automation',
        title: 'Set Up Automation',
        description: 'Configure automatic responses for common inquiries',
        component: 'AutomationStep',
        completed: false,
        required: false,
      },
      {
        id: 'analytics',
        title: 'View Analytics',
        description: 'Check performance metrics and insights',
        component: 'AnalyticsStep',
        completed: false,
        required: false,
      },
    ],
    conversations: [
      {
        id: 'conv-1',
        customerName: 'Sarah Johnson',
        customerPhone: '+1234567890',
        avatar: 'SJ',
        lastMessage: 'Hi, I wanted to check on my order status. Order #12345',
        lastMessageTime: new Date(Date.now() - 5 * 60 * 1000),
        unreadCount: 1,
        status: 'pending',
        tags: ['order-inquiry', 'urgent'],
        messages: [
          {
            id: 'msg-1',
            type: 'incoming',
            content: 'Hi, I wanted to check on my order status. Order #12345',
            timestamp: new Date(Date.now() - 5 * 60 * 1000),
            sender: 'Sarah Johnson',
            status: 'read',
            messageType: 'text',
          },
        ],
      },
      {
        id: 'conv-2',
        customerName: 'Mike Chen',
        customerPhone: '+1234567891',
        avatar: 'MC',
        lastMessage: 'Thank you for the quick response!',
        lastMessageTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
        unreadCount: 0,
        status: 'resolved',
        assignedTo: 'You',
        tags: ['resolved', 'shipping'],
        messages: [
          {
            id: 'msg-2',
            type: 'incoming',
            content: 'When will my package arrive?',
            timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
            sender: 'Mike Chen',
            status: 'read',
            messageType: 'text',
          },
          {
            id: 'msg-3',
            type: 'outgoing',
            content: 'Your package is scheduled to arrive tomorrow between 2-6 PM. You\'ll receive a tracking notification.',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
            sender: 'You',
            status: 'read',
            messageType: 'text',
          },
          {
            id: 'msg-4',
            type: 'incoming',
            content: 'Thank you for the quick response!',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
            sender: 'Mike Chen',
            status: 'read',
            messageType: 'text',
          },
        ],
      },
    ],
  },
  support: {
    name: 'Tech Support',
    description: 'Provide technical assistance and troubleshooting for software products',
    icon: '🛠️',
    steps: [
      {
        id: 'welcome',
        title: 'Welcome to Demo',
        description: 'Get familiar with the ADSapp interface',
        component: 'WelcomeStep',
        completed: false,
        required: true,
      },
      {
        id: 'ticket-triage',
        title: 'Ticket Triage',
        description: 'Categorize and prioritize support requests',
        component: 'TicketTriageStep',
        completed: false,
        required: true,
      },
      {
        id: 'troubleshooting',
        title: 'Troubleshooting',
        description: 'Help a customer resolve a technical issue',
        component: 'TroubleshootingStep',
        completed: false,
        required: true,
      },
      {
        id: 'escalation',
        title: 'Escalate to Specialist',
        description: 'Transfer complex issues to technical specialists',
        component: 'EscalationStep',
        completed: false,
        required: true,
      },
    ],
    conversations: [
      {
        id: 'conv-1',
        customerName: 'Alex Rodriguez',
        customerPhone: '+1234567892',
        avatar: 'AR',
        lastMessage: 'The app keeps crashing when I try to export my data',
        lastMessageTime: new Date(Date.now() - 10 * 60 * 1000),
        unreadCount: 1,
        status: 'pending',
        tags: ['bug-report', 'high-priority'],
        messages: [
          {
            id: 'msg-1',
            type: 'incoming',
            content: 'The app keeps crashing when I try to export my data',
            timestamp: new Date(Date.now() - 10 * 60 * 1000),
            sender: 'Alex Rodriguez',
            status: 'read',
            messageType: 'text',
          },
        ],
      },
    ],
  },
  restaurant: {
    name: 'Restaurant Orders',
    description: 'Manage food orders, reservations, and customer inquiries for a restaurant',
    icon: '🍕',
    steps: [
      {
        id: 'welcome',
        title: 'Welcome to Demo',
        description: 'Get familiar with the ADSapp interface',
        component: 'WelcomeStep',
        completed: false,
        required: true,
      },
      {
        id: 'take-order',
        title: 'Take Food Order',
        description: 'Process a customer\'s food order via WhatsApp',
        component: 'TakeOrderStep',
        completed: false,
        required: true,
      },
      {
        id: 'manage-reservations',
        title: 'Manage Reservations',
        description: 'Handle table booking requests',
        component: 'ManageReservationsStep',
        completed: false,
        required: true,
      },
      {
        id: 'order-updates',
        title: 'Send Order Updates',
        description: 'Keep customers informed about their order status',
        component: 'OrderUpdatesStep',
        completed: false,
        required: true,
      },
    ],
    conversations: [
      {
        id: 'conv-1',
        customerName: 'Emma Wilson',
        customerPhone: '+1234567893',
        avatar: 'EW',
        lastMessage: 'Hi, I\'d like to place an order for delivery',
        lastMessageTime: new Date(Date.now() - 3 * 60 * 1000),
        unreadCount: 1,
        status: 'active',
        tags: ['food-order', 'delivery'],
        messages: [
          {
            id: 'msg-1',
            type: 'incoming',
            content: 'Hi, I\'d like to place an order for delivery',
            timestamp: new Date(Date.now() - 3 * 60 * 1000),
            sender: 'Emma Wilson',
            status: 'read',
            messageType: 'text',
          },
        ],
      },
    ],
  },
  agency: {
    name: 'Marketing Agency',
    description: 'Manage multiple client accounts and campaigns from one dashboard',
    icon: '📊',
    steps: [
      {
        id: 'welcome',
        title: 'Welcome to Demo',
        description: 'Get familiar with the ADSapp interface',
        component: 'WelcomeStep',
        completed: false,
        required: true,
      },
      {
        id: 'client-switching',
        title: 'Switch Between Clients',
        description: 'Navigate between different client accounts',
        component: 'ClientSwitchingStep',
        completed: false,
        required: true,
      },
      {
        id: 'campaign-management',
        title: 'Campaign Management',
        description: 'Monitor and respond to campaign messages',
        component: 'CampaignManagementStep',
        completed: false,
        required: true,
      },
      {
        id: 'client-reporting',
        title: 'Client Reporting',
        description: 'Generate reports for client performance',
        component: 'ClientReportingStep',
        completed: false,
        required: true,
      },
    ],
    conversations: [
      {
        id: 'conv-1',
        customerName: 'David Kim',
        customerPhone: '+1234567894',
        avatar: 'DK',
        lastMessage: 'How is our campaign performing this week?',
        lastMessageTime: new Date(Date.now() - 1 * 60 * 60 * 1000),
        unreadCount: 1,
        status: 'pending',
        tags: ['campaign-inquiry', 'client-communication'],
        messages: [
          {
            id: 'msg-1',
            type: 'incoming',
            content: 'How is our campaign performing this week?',
            timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
            sender: 'David Kim',
            status: 'read',
            messageType: 'text',
          },
        ],
      },
    ],
  },
};

// Initial state
const initialState: DemoState = {
  isActive: false,
  scenario: 'ecommerce',
  currentStep: 0,
  progress: 0,
  steps: DEMO_SCENARIOS.ecommerce.steps,
  conversations: DEMO_SCENARIOS.ecommerce.conversations,
  activeConversationId: null,
  isSimulating: false,
  simulationSpeed: 1,
  showTour: false,
  tourStep: 0,
  analytics: {
    startTime: null,
    completedSteps: 0,
    timeSpent: 0,
    interactionCount: 0,
  },
  settings: {
    autoAdvance: true,
    showHints: true,
    enableSound: false,
  },
};

// Reducer function
function demoReducer(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case 'START_DEMO':
      const scenarioData = DEMO_SCENARIOS[action.scenario];
      return {
        ...state,
        isActive: true,
        scenario: action.scenario,
        currentStep: 0,
        progress: 0,
        steps: scenarioData.steps,
        conversations: scenarioData.conversations,
        activeConversationId: scenarioData.conversations[0]?.id || null,
        analytics: {
          ...state.analytics,
          startTime: new Date(),
          completedSteps: 0,
          interactionCount: 0,
        },
      };

    case 'END_DEMO':
      return {
        ...state,
        isActive: false,
        showTour: false,
        isSimulating: false,
      };

    case 'RESET_DEMO':
      const resetScenarioData = DEMO_SCENARIOS[state.scenario];
      return {
        ...state,
        currentStep: 0,
        progress: 0,
        steps: resetScenarioData.steps.map(step => ({ ...step, completed: false })),
        conversations: resetScenarioData.conversations,
        activeConversationId: resetScenarioData.conversations[0]?.id || null,
        isSimulating: false,
        showTour: false,
        analytics: {
          ...state.analytics,
          startTime: new Date(),
          completedSteps: 0,
          interactionCount: 0,
        },
      };

    case 'SET_SCENARIO':
      const newScenarioData = DEMO_SCENARIOS[action.scenario];
      return {
        ...state,
        scenario: action.scenario,
        currentStep: 0,
        progress: 0,
        steps: newScenarioData.steps,
        conversations: newScenarioData.conversations,
        activeConversationId: newScenarioData.conversations[0]?.id || null,
      };

    case 'NEXT_STEP':
      const nextStep = Math.min(state.currentStep + 1, state.steps.length - 1);
      return {
        ...state,
        currentStep: nextStep,
        progress: ((nextStep + 1) / state.steps.length) * 100,
      };

    case 'PREVIOUS_STEP':
      const prevStep = Math.max(state.currentStep - 1, 0);
      return {
        ...state,
        currentStep: prevStep,
        progress: ((prevStep + 1) / state.steps.length) * 100,
      };

    case 'SET_STEP':
      const setStep = Math.max(0, Math.min(action.step, state.steps.length - 1));
      return {
        ...state,
        currentStep: setStep,
        progress: ((setStep + 1) / state.steps.length) * 100,
      };

    case 'COMPLETE_STEP':
      const updatedSteps = state.steps.map(step =>
        step.id === action.stepId ? { ...step, completed: true } : step
      );
      const completedCount = updatedSteps.filter(step => step.completed).length;
      return {
        ...state,
        steps: updatedSteps,
        progress: (completedCount / state.steps.length) * 100,
        analytics: {
          ...state.analytics,
          completedSteps: completedCount,
        },
      };

    case 'SET_ACTIVE_CONVERSATION':
      return {
        ...state,
        activeConversationId: action.conversationId,
      };

    case 'ADD_MESSAGE':
      const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newMessage: DemoMessage = {
        ...action.message,
        id: messageId,
        timestamp: new Date(),
      };

      return {
        ...state,
        conversations: state.conversations.map(conv =>
          conv.id === action.conversationId
            ? {
                ...conv,
                messages: [...conv.messages, newMessage],
                lastMessage: newMessage.content,
                lastMessageTime: newMessage.timestamp,
                unreadCount: newMessage.type === 'incoming' ? conv.unreadCount + 1 : 0,
              }
            : conv
        ),
      };

    case 'START_SIMULATION':
      return {
        ...state,
        isSimulating: true,
      };

    case 'STOP_SIMULATION':
      return {
        ...state,
        isSimulating: false,
      };

    case 'SET_SIMULATION_SPEED':
      return {
        ...state,
        simulationSpeed: action.speed,
      };

    case 'SHOW_TOUR':
      return {
        ...state,
        showTour: true,
        tourStep: 0,
      };

    case 'HIDE_TOUR':
      return {
        ...state,
        showTour: false,
      };

    case 'SET_TOUR_STEP':
      return {
        ...state,
        tourStep: action.step,
      };

    case 'UPDATE_ANALYTICS':
      return {
        ...state,
        analytics: {
          ...state.analytics,
          ...action.data,
        },
      };

    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.settings,
        },
      };

    case 'INCREMENT_INTERACTION':
      return {
        ...state,
        analytics: {
          ...state.analytics,
          interactionCount: state.analytics.interactionCount + 1,
        },
      };

    default:
      return state;
  }
}

// Context
const DemoContext = createContext<{
  state: DemoState;
  dispatch: React.Dispatch<DemoAction>;
} | null>(null);

// Provider component
export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(demoReducer, initialState);

  // Auto-save demo progress
  useEffect(() => {
    // Only access localStorage in browser environment
    if (typeof window !== 'undefined' && state.isActive) {
      const demoData = {
        scenario: state.scenario,
        currentStep: state.currentStep,
        completedSteps: state.steps.filter(s => s.completed).map(s => s.id),
        analytics: state.analytics,
      };
      localStorage.setItem('adsapp-demo-progress', JSON.stringify(demoData));
    }
  }, [state.isActive, state.scenario, state.currentStep, state.steps, state.analytics]);

  // Load demo progress on mount
  useEffect(() => {
    // Only access localStorage in browser environment
    if (typeof window === 'undefined') return;

    const savedProgress = localStorage.getItem('adsapp-demo-progress');
    if (savedProgress) {
      try {
        const data = JSON.parse(savedProgress);
        if (data.scenario && DEMO_SCENARIOS[data.scenario]) {
          dispatch({ type: 'SET_SCENARIO', scenario: data.scenario });
          if (data.currentStep !== undefined) {
            dispatch({ type: 'SET_STEP', step: data.currentStep });
          }
          if (data.completedSteps && Array.isArray(data.completedSteps)) {
            data.completedSteps.forEach((stepId: string) => {
              dispatch({ type: 'COMPLETE_STEP', stepId });
            });
          }
          if (data.analytics) {
            dispatch({ type: 'UPDATE_ANALYTICS', data: data.analytics });
          }
        }
      } catch (error) {
        console.warn('Failed to load demo progress:', error);
      }
    }
  }, []);

  return (
    <DemoContext.Provider value={{ state, dispatch }}>
      {children}
    </DemoContext.Provider>
  );
}

// Custom hooks
export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error('useDemo must be used within a DemoProvider');
  }
  return context;
}

export function useDemoActions() {
  const { dispatch } = useDemo();

  return {
    startDemo: (scenario: DemoScenario) => dispatch({ type: 'START_DEMO', scenario }),
    endDemo: () => dispatch({ type: 'END_DEMO' }),
    resetDemo: () => dispatch({ type: 'RESET_DEMO' }),
    setScenario: (scenario: DemoScenario) => dispatch({ type: 'SET_SCENARIO', scenario }),
    nextStep: () => dispatch({ type: 'NEXT_STEP' }),
    previousStep: () => dispatch({ type: 'PREVIOUS_STEP' }),
    setStep: (step: number) => dispatch({ type: 'SET_STEP', step }),
    completeStep: (stepId: string) => dispatch({ type: 'COMPLETE_STEP', stepId }),
    setActiveConversation: (id: string | null) => dispatch({ type: 'SET_ACTIVE_CONVERSATION', conversationId: id }),
    addMessage: (conversationId: string, message: Omit<DemoMessage, 'id' | 'timestamp'>) =>
      dispatch({ type: 'ADD_MESSAGE', conversationId, message }),
    startSimulation: () => dispatch({ type: 'START_SIMULATION' }),
    stopSimulation: () => dispatch({ type: 'STOP_SIMULATION' }),
    setSimulationSpeed: (speed: number) => dispatch({ type: 'SET_SIMULATION_SPEED', speed }),
    showTour: () => dispatch({ type: 'SHOW_TOUR' }),
    hideTour: () => dispatch({ type: 'HIDE_TOUR' }),
    setTourStep: (step: number) => dispatch({ type: 'SET_TOUR_STEP', step }),
    updateAnalytics: (data: Partial<DemoState['analytics']>) => dispatch({ type: 'UPDATE_ANALYTICS', data }),
    updateSettings: (settings: Partial<DemoState['settings']>) => dispatch({ type: 'UPDATE_SETTINGS', settings }),
    incrementInteraction: () => dispatch({ type: 'INCREMENT_INTERACTION' }),
  };
}

export function useDemoAnalytics() {
  const { state } = useDemo();

  const getTimeSpent = () => {
    if (!state.analytics.startTime) return 0;
    return Math.floor((Date.now() - state.analytics.startTime.getTime()) / 1000);
  };

  const getCompletionRate = () => {
    if (state.steps.length === 0) return 0;
    return (state.analytics.completedSteps / state.steps.length) * 100;
  };

  const getEngagementScore = () => {
    const timeSpent = getTimeSpent();
    const interactions = state.analytics.interactionCount;
    const completionRate = getCompletionRate();

    // Simple engagement calculation
    const timeScore = Math.min(timeSpent / 600, 1) * 30; // Max 30 points for 10 minutes
    const interactionScore = Math.min(interactions / 20, 1) * 40; // Max 40 points for 20 interactions
    const completionScore = (completionRate / 100) * 30; // Max 30 points for completion

    return Math.round(timeScore + interactionScore + completionScore);
  };

  return {
    timeSpent: getTimeSpent(),
    completionRate: getCompletionRate(),
    engagementScore: getEngagementScore(),
    analytics: state.analytics,
  };
}