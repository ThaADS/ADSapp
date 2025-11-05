'use client';

/**
 * AI Analytics Dashboard Component
 * Display AI usage statistics and cost tracking
 */

import { useState, useEffect } from 'react';

interface AIUsageStats {
  period: {
    days: number;
    startDate: string;
    endDate: string;
  };
  summary: {
    totalRequests: number;
    totalTokens: number;
    totalCostUsd: number;
    avgLatencyMs: number;
    acceptanceRate: number | null;
  };
  byFeature: Record<string, {
    count: number;
    cost: number;
    tokens: number;
  }>;
  byDate: Record<string, {
    count: number;
    cost: number;
  }>;
  modelUsage: Record<string, number>;
  budgetStatus: {
    budget: number;
    currentSpend: number;
    percentUsed: number;
    remaining: number;
    isOverBudget: boolean;
    isNearLimit: boolean;
    alertThreshold: number;
  } | null;
}

interface AIAnalyticsProps {
  organizationId: string;
}

export function AIAnalytics({ organizationId }: AIAnalyticsProps) {
  const [stats, setStats] = useState<AIUsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('30'); // days

  useEffect(() => {
    loadStats();
  }, [organizationId, period]);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/ai/usage?period=${period}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load analytics');
      }

      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
      console.error('Load analytics error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('nl-NL').format(num);
  };

  const getFeatureLabel = (feature: string) => {
    const labels: Record<string, string> = {
      draft: 'Concept Suggesties',
      auto_response: 'Auto-Antwoorden',
      sentiment: 'Sentiment Analyse',
      summary: 'Samenvattingen',
      template: 'Template Generatie',
    };
    return labels[feature] || feature;
  };

  const getFeatureIcon = (feature: string) => {
    switch (feature) {
      case 'draft':
        return '✏️';
      case 'auto_response':
        return '🤖';
      case 'sentiment':
        return '😊';
      case 'summary':
        return '📝';
      case 'template':
        return '📋';
      default:
        return '🔧';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">{error}</p>
        <button
          onClick={loadStats}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Opnieuw proberen
        </button>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header with Period Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">AI Analytics</h2>
          <p className="mt-1 text-sm text-gray-600">
            Gebruik en kosten overzicht van AI features
          </p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
        >
          <option value="7">Laatste 7 dagen</option>
          <option value="30">Laatste 30 dagen</option>
          <option value="90">Laatste 90 dagen</option>
        </select>
      </div>

      {/* Budget Alert */}
      {stats.budgetStatus && stats.budgetStatus.isNearLimit && (
        <div className={`p-4 rounded-lg border ${stats.budgetStatus.isOverBudget ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className={`h-5 w-5 ${stats.budgetStatus.isOverBudget ? 'text-red-400' : 'text-yellow-400'}`} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className={`text-sm font-medium ${stats.budgetStatus.isOverBudget ? 'text-red-800' : 'text-yellow-800'}`}>
                {stats.budgetStatus.isOverBudget ? 'Budget overschreden' : 'Budget limiet bereikt'}
              </h3>
              <div className={`mt-2 text-sm ${stats.budgetStatus.isOverBudget ? 'text-red-700' : 'text-yellow-700'}`}>
                <p>
                  Je hebt {formatCurrency(stats.budgetStatus.currentSpend)} van {formatCurrency(stats.budgetStatus.budget)} gebruikt
                  ({stats.budgetStatus.percentUsed.toFixed(1)}%).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-600">Totaal Verzoeken</p>
            <span className="text-2xl">📊</span>
          </div>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {formatNumber(stats.summary.totalRequests)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            AI verzoeken afgelopen {period} dagen
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-600">Totale Kosten</p>
            <span className="text-2xl">💰</span>
          </div>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {formatCurrency(stats.summary.totalCostUsd)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            API kosten afgelopen {period} dagen
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-600">Gem. Latency</p>
            <span className="text-2xl">⚡</span>
          </div>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {Math.round(stats.summary.avgLatencyMs)}ms
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Gemiddelde response tijd
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-600">Acceptatie</p>
            <span className="text-2xl">✅</span>
          </div>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            {stats.summary.acceptanceRate !== null
              ? `${stats.summary.acceptanceRate.toFixed(1)}%`
              : 'N/A'}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Suggesties geaccepteerd
          </p>
        </div>
      </div>

      {/* Feature Breakdown */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Per Feature</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {Object.entries(stats.byFeature).map(([feature, data]) => (
              <div key={feature} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getFeatureIcon(feature)}</span>
                  <div>
                    <p className="font-medium text-gray-900">{getFeatureLabel(feature)}</p>
                    <p className="text-sm text-gray-600">
                      {formatNumber(data.count)} verzoeken · {formatNumber(data.tokens)} tokens
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatCurrency(data.cost)}</p>
                  <p className="text-xs text-gray-500">
                    {((data.count / stats.summary.totalRequests) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Usage Over Time Chart */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Gebruik Over Tijd</h3>
        </div>
        <div className="p-6">
          <div className="space-y-2">
            {Object.entries(stats.byDate)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, data]) => {
                const maxCount = Math.max(...Object.values(stats.byDate).map(d => d.count));
                const width = (data.count / maxCount) * 100;

                return (
                  <div key={date} className="flex items-center space-x-4">
                    <div className="w-24 text-sm text-gray-600">
                      {new Date(date).toLocaleDateString('nl-NL', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                    <div className="flex-1">
                      <div className="relative h-8 bg-gray-100 rounded">
                        <div
                          className="absolute h-full bg-blue-500 rounded flex items-center justify-end pr-2"
                          style={{ width: `${width}%` }}
                        >
                          <span className="text-xs font-medium text-white">
                            {data.count}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="w-20 text-right text-sm text-gray-600">
                      {formatCurrency(data.cost)}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Model Usage */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Model Gebruik</h3>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {Object.entries(stats.modelUsage)
              .sort(([, a], [, b]) => b - a)
              .map(([model, count]) => {
                const percentage = (count / stats.summary.totalRequests) * 100;

                return (
                  <div key={model}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">{model}</span>
                      <span className="text-gray-600">{count} ({percentage.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Budget Status */}
      {stats.budgetStatus && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Budget Status</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Maandelijks Budget</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(stats.budgetStatus.budget)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Huidig Verbruik</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(stats.budgetStatus.currentSpend)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Resterend</span>
                <span className={`font-semibold ${stats.budgetStatus.remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(Math.abs(stats.budgetStatus.remaining))}
                  {stats.budgetStatus.remaining < 0 && ' over budget'}
                </span>
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Voortgang</span>
                  <span className="font-medium text-gray-900">
                    {stats.budgetStatus.percentUsed.toFixed(1)}%
                  </span>
                </div>
                <div className="relative w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      stats.budgetStatus.isOverBudget
                        ? 'bg-red-600'
                        : stats.budgetStatus.isNearLimit
                        ? 'bg-yellow-500'
                        : 'bg-green-600'
                    }`}
                    style={{ width: `${Math.min(stats.budgetStatus.percentUsed, 100)}%` }}
                  />
                  {/* Alert threshold marker */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-orange-400"
                    style={{ left: `${stats.budgetStatus.alertThreshold}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Waarschuwing bij {stats.budgetStatus.alertThreshold}% van budget
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
