"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DemoProvider, useDemo, useDemoActions, useDemoAnalytics } from '@/contexts/demo-context';
import { DemoBanner } from '@/components/demo/demo-banner';
import { DemoProgress } from '@/components/demo/demo-progress';
import { DemoWatermark, ContextualWatermark } from '@/components/demo/demo-watermark';
import { QuickScenarioSwitcher } from '@/components/demo/demo-scenario-selector';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  description?: string;
}

function MetricCard({ title, value, change, changeType = 'neutral', icon, description }: MetricCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-blue-100 rounded-lg flex items-center justify-center">
          {icon}
        </div>
        {change && (
          <span className={`text-sm font-medium ${
            changeType === 'positive' ? 'text-green-600' :
            changeType === 'negative' ? 'text-red-600' : 'text-gray-600'
          }`}>
            {change}
          </span>
        )}
      </div>
      <div className="mb-2">
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm font-medium text-gray-600">{title}</div>
      </div>
      {description && (
        <div className="text-xs text-gray-500">{description}</div>
      )}
    </div>
  );
}

function ChartPlaceholder({ title, type = 'line' }: { title: string; type?: 'line' | 'bar' | 'pie' }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="h-64 bg-gradient-to-br from-green-50 to-blue-50 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {type === 'line' && (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            )}
            {type === 'bar' && (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            )}
            {type === 'pie' && (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
            )}
          </svg>
          <div className="text-gray-600">
            <div className="font-medium">Demo Analytics</div>
            <div className="text-sm">Interactive {type} chart simulation</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResponseTimeChart() {
  const [selectedPeriod, setSelectedPeriod] = useState('7d');

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Response Time Trends</h3>
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1"
        >
          <option value="24h">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
        </select>
      </div>

      <div className="h-64 bg-gradient-to-br from-green-50 to-blue-50 rounded-lg flex items-center justify-center relative overflow-hidden">
        {/* Simulated chart lines */}
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{ stopColor: '#10B981', stopOpacity: 0.3 }} />
              <stop offset="100%" style={{ stopColor: '#3B82F6', stopOpacity: 0.3 }} />
            </linearGradient>
          </defs>
          <path
            d="M 20 200 Q 80 120 140 160 T 260 100 T 380 140"
            stroke="#10B981"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 20 220 Q 80 180 140 200 T 260 160 T 380 180"
            stroke="#6B7280"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeDasharray="5,5"
          />
        </svg>

        <div className="text-center z-10">
          <div className="text-gray-600">
            <div className="font-medium">Live Response Time Tracking</div>
            <div className="text-sm">Real-time performance metrics</div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-600">Average Response Time</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
            <span className="text-gray-600">Industry Benchmark</span>
          </div>
        </div>
        <div className="text-green-600 font-medium">-23% vs last period</div>
      </div>
    </div>
  );
}

function ConversationsByScenario() {
  const { state } = useDemo();

  const scenarioData = [
    { name: 'Order Inquiries', value: 45, color: 'bg-green-500' },
    { name: 'Support Requests', value: 30, color: 'bg-blue-500' },
    { name: 'Product Questions', value: 15, color: 'bg-purple-500' },
    { name: 'Complaints', value: 10, color: 'bg-red-500' },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversation Categories</h3>

      <div className="space-y-4">
        {scenarioData.map((item, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
              <span className="text-sm text-gray-600">{item.name}</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-24 bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${item.color}`}
                  style={{ width: `${item.value}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium text-gray-900 w-8">{item.value}%</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          Based on {state.conversations.length} demo conversations in {state.scenario} scenario
        </div>
      </div>
    </div>
  );
}

function AnalyticsDemoContent() {
  const { state } = useDemo();
  const { timeSpent, completionRate, engagementScore, analytics } = useDemoAnalytics();
  const { incrementInteraction } = useDemoActions();
  const router = useRouter();

  useEffect(() => {
    if (!state.isActive) {
      router.push('/demo');
    }
  }, [state.isActive, router]);

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
      <ContextualWatermark context="analytics" />

      {/* Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-semibold text-gray-900">Analytics Dashboard</h1>
              <nav className="flex space-x-4">
                <button
                  onClick={() => incrementInteraction()}
                  className="px-3 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-lg"
                >
                  Overview
                </button>
                <button
                  onClick={() => incrementInteraction()}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg"
                >
                  Performance
                </button>
                <button
                  onClick={() => incrementInteraction()}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 rounded-lg"
                >
                  Reports
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
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main analytics */}
          <div className="lg:col-span-3 space-y-8">
            {/* Key metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="Avg Response Time"
                value="2.3 min"
                change="-23%"
                changeType="positive"
                icon={
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                description="vs last week"
              />

              <MetricCard
                title="Resolution Rate"
                value="94.2%"
                change="+5.1%"
                changeType="positive"
                icon={
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                description="First contact resolution"
              />

              <MetricCard
                title="Customer Satisfaction"
                value="4.8/5"
                change="+0.3"
                changeType="positive"
                icon={
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                }
                description="Average rating"
              />

              <MetricCard
                title="Active Conversations"
                value={state.conversations.filter(c => c.status === 'active').length}
                change="Real-time"
                changeType="neutral"
                icon={
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                }
                description={`${state.scenario} scenario`}
              />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ResponseTimeChart />
              <ChartPlaceholder title="Message Volume" type="bar" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ConversationsByScenario />
              <ChartPlaceholder title="Team Performance" type="pie" />
            </div>

            {/* Recent activity */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {state.conversations.slice(0, 3).map((conversation, index) => (
                  <div key={conversation.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                      {conversation.avatar}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{conversation.customerName}</div>
                      <div className="text-xs text-gray-600">{conversation.lastMessage}</div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(conversation.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Demo progress */}
            <DemoProgress variant="detailed" showStats={true} showSteps={false} />

            {/* Demo analytics */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Demo Statistics</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Time Spent</span>
                  <span className="text-sm font-medium text-gray-900">
                    {Math.floor(timeSpent / 60)}m {timeSpent % 60}s
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Completion Rate</span>
                  <span className="text-sm font-medium text-gray-900">{Math.round(completionRate)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Engagement Score</span>
                  <span className="text-sm font-medium text-gray-900">{engagementScore}/100</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Interactions</span>
                  <span className="text-sm font-medium text-gray-900">{analytics.interactionCount}</span>
                </div>
              </div>
            </div>

            {/* Quick actions */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link
                  href="/demo/inbox"
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors text-center block"
                >
                  View Inbox
                </Link>
                <Link
                  href="/demo/automation"
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors text-center block"
                >
                  Setup Automation
                </Link>
                <button
                  onClick={() => incrementInteraction()}
                  className="w-full border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Export Report
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

export const dynamic = 'force-dynamic';

export default function AnalyticsDemoPage() {
  return (
    <DemoProvider>
      <AnalyticsDemoContent />
    </DemoProvider>
  );
}