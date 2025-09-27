"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DemoProvider, useDemo, useDemoActions } from '@/contexts/demo-context';
import { DemoBanner } from '@/components/demo/demo-banner';
import { DemoProgress } from '@/components/demo/demo-progress';
import { DemoWatermark, ContextualWatermark } from '@/components/demo/demo-watermark';
import { QuickScenarioSwitcher } from '@/components/demo/demo-scenario-selector';

interface AutomationRuleProps {
  id: string;
  name: string;
  description: string;
  trigger: string;
  action: string;
  isActive: boolean;
  messagesProcessed: number;
  onToggle: (id: string) => void;
  onEdit: (id: string) => void;
}

function AutomationRule({ id, name, description, trigger, action, isActive, messagesProcessed, onToggle, onEdit }: AutomationRuleProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="text-gray-600 mb-3">{description}</p>

          <div className="space-y-2 text-sm">
            <div className="flex items-center space-x-2">
              <span className="text-gray-500">Trigger:</span>
              <span className="font-medium text-gray-900">{trigger}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-500">Action:</span>
              <span className="font-medium text-gray-900">{action}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onToggle(id)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isActive ? 'bg-green-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isActive ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <button
            onClick={() => onEdit(id)}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Messages processed this week</span>
          <span className="text-sm font-semibold text-gray-900">{messagesProcessed}</span>
        </div>
      </div>
    </div>
  );
}

interface WorkflowStepProps {
  step: {
    id: string;
    type: 'trigger' | 'condition' | 'action';
    title: string;
    description: string;
    icon: React.ReactNode;
  };
  isActive?: boolean;
}

function WorkflowStep({ step, isActive = false }: WorkflowStepProps) {
  return (
    <div className={`relative p-4 rounded-lg border-2 ${
      isActive ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'
    }`}>
      <div className="flex items-start space-x-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          step.type === 'trigger' ? 'bg-blue-100 text-blue-600' :
          step.type === 'condition' ? 'bg-yellow-100 text-yellow-600' :
          'bg-green-100 text-green-600'
        }`}>
          {step.icon}
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 mb-1">{step.title}</h4>
          <p className="text-sm text-gray-600">{step.description}</p>
          <div className="mt-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              step.type === 'trigger' ? 'bg-blue-100 text-blue-800' :
              step.type === 'condition' ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            }`}>
              {step.type.charAt(0).toUpperCase() + step.type.slice(1)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function WorkflowBuilder() {
  const { incrementInteraction } = useDemoActions();
  const [activeStep, setActiveStep] = useState(0);

  const workflowSteps = [
    {
      id: '1',
      type: 'trigger' as const,
      title: 'New Message Received',
      description: 'When a customer sends a message containing specific keywords',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
    {
      id: '2',
      type: 'condition' as const,
      title: 'Check Business Hours',
      description: 'Verify if the message was received during business hours',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: '3',
      type: 'action' as const,
      title: 'Send Auto-Reply',
      description: 'Send a personalized response based on the message content',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      ),
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % workflowSteps.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [workflowSteps.length]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Workflow Builder</h3>
        <button
          onClick={() => incrementInteraction()}
          className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
        >
          Create New Workflow
        </button>
      </div>

      <div className="space-y-4">
        {workflowSteps.map((step, index) => (
          <div key={step.id} className="relative">
            <WorkflowStep step={step} isActive={activeStep === index} />
            {index < workflowSteps.length - 1 && (
              <div className="flex justify-center py-2">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-center space-x-2 text-blue-800">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium">Demo Mode</span>
        </div>
        <p className="text-sm text-blue-700 mt-1">
          This workflow simulation shows how automation steps execute in sequence.
          Click "Create New Workflow" to explore the builder interface.
        </p>
      </div>
    </div>
  );
}

function AutomationStats() {
  const { state } = useDemo();

  const stats = [
    {
      label: 'Time Saved',
      value: '2.4 hours',
      description: 'This week',
      icon: (
        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'Auto-Responses',
      value: '47',
      description: 'Sent automatically',
      icon: (
        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
    {
      label: 'Success Rate',
      value: '96.2%',
      description: 'Customer satisfaction',
      icon: (
        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {stats.map((stat, index) => (
        <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
              {stat.icon}
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-sm font-medium text-gray-600">{stat.label}</div>
            </div>
          </div>
          <div className="text-xs text-gray-500">{stat.description}</div>
        </div>
      ))}
    </div>
  );
}

function AutomationDemoContent() {
  const { state } = useDemo();
  const { incrementInteraction } = useDemoActions();
  const router = useRouter();
  const [automationRules, setAutomationRules] = useState([
    {
      id: '1',
      name: 'Order Status Inquiry',
      description: 'Automatically respond to order status questions with tracking information',
      trigger: 'Keywords: "order", "status", "tracking"',
      action: 'Send order status template',
      isActive: true,
      messagesProcessed: 23,
    },
    {
      id: '2',
      name: 'Business Hours Response',
      description: 'Send after-hours message when customers contact outside business hours',
      trigger: 'Message received outside 9 AM - 6 PM',
      action: 'Send business hours message',
      isActive: true,
      messagesProcessed: 12,
    },
    {
      id: '3',
      name: 'FAQ Auto-Response',
      description: 'Answer common questions automatically using knowledge base',
      trigger: 'Keywords: "return", "shipping", "payment"',
      action: 'Send relevant FAQ response',
      isActive: false,
      messagesProcessed: 8,
    },
  ]);

  useEffect(() => {
    if (!state.isActive) {
      router.push('/demo');
    }
  }, [state.isActive, router]);

  const handleToggleRule = (ruleId: string) => {
    setAutomationRules(rules =>
      rules.map(rule =>
        rule.id === ruleId ? { ...rule, isActive: !rule.isActive } : rule
      )
    );
    incrementInteraction();
  };

  const handleEditRule = (ruleId: string) => {
    incrementInteraction();
    console.log('Edit rule:', ruleId);
  };

  if (!state.isActive) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading demo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Demo banner */}
      <DemoBanner />

      {/* Contextual watermark */}
      <ContextualWatermark context="automation" />

      {/* Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-semibold text-gray-900">Automation Center</h1>
              <nav className="flex space-x-4">
                <button
                  onClick={() => incrementInteraction()}
                  className="px-3 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-lg"
                >
                  Rules
                </button>
                <button
                  onClick={() => incrementInteraction()}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg"
                >
                  Workflows
                </button>
                <button
                  onClick={() => incrementInteraction()}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg"
                >
                  Templates
                </button>
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <QuickScenarioSwitcher />
              <Link
                href="/demo/inbox"
                className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg"
              >
                ← Back to Inbox
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Stats */}
            <AutomationStats />

            {/* Automation Rules */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Automation Rules</h2>
                <button
                  onClick={() => incrementInteraction()}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  Create New Rule
                </button>
              </div>

              <div className="space-y-4">
                {automationRules.map((rule) => (
                  <AutomationRule
                    key={rule.id}
                    {...rule}
                    onToggle={handleToggleRule}
                    onEdit={handleEditRule}
                  />
                ))}
              </div>
            </div>

            {/* Workflow Builder */}
            <WorkflowBuilder />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Demo progress */}
            <DemoProgress variant="detailed" showStats={true} showSteps={false} />

            {/* Quick Templates */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Templates</h3>
              <div className="space-y-3">
                {[
                  'Order Status Update',
                  'Business Hours Notice',
                  'Thank You Message',
                  'FAQ Response',
                ].map((template, index) => (
                  <button
                    key={index}
                    onClick={() => incrementInteraction()}
                    className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <div className="text-sm font-medium text-gray-900">{template}</div>
                    <div className="text-xs text-gray-600">Ready to use template</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Performance Insights */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Insights</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Active Rules</span>
                  <span className="text-sm font-medium text-gray-900">
                    {automationRules.filter(r => r.isActive).length} / {automationRules.length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Automations</span>
                  <span className="text-sm font-medium text-gray-900">
                    {automationRules.reduce((sum, r) => sum + r.messagesProcessed, 0)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Success Rate</span>
                  <span className="text-sm font-medium text-green-600">96.2%</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link
                  href="/demo/analytics"
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors text-center block"
                >
                  View Analytics
                </Link>
                <button
                  onClick={() => incrementInteraction()}
                  className="w-full border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Import Templates
                </button>
                <button
                  onClick={() => incrementInteraction()}
                  className="w-full border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Export Rules
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Watermark */}
      <DemoWatermark variant="corner" position="bottom-right" />
    </div>
  );
}

export default function AutomationDemoPage() {
  return (
    <DemoProvider>
      <AutomationDemoContent />
    </DemoProvider>
  );
}