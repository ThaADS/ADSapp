/**
 * Workflow Analytics Dashboard
 *
 * Comprehensive analytics and performance metrics for workflows.
 * Shows execution stats, conversion funnels, node performance, and A/B test results.
 */

import React from 'react';
import {
  Activity,
  TrendingUp,
  Clock,
  Target,
  AlertCircle,
  Users,
  CheckCircle,
  XCircle,
  Zap,
  BarChart3,
} from 'lucide-react';

// ============================================================================
// INTERFACES
// ============================================================================

interface WorkflowAnalyticsPageProps {
  params: Promise<{
    id: string;
  }>;
}

// ============================================================================
// MOCK DATA (Replace with real API calls)
// ============================================================================

const getMockAnalytics = () => ({
  overview: {
    totalExecutions: 1247,
    successRate: 87.3,
    averageCompletionTime: '4.2 hours',
    conversionRate: 23.5,
    activeExecutions: 34,
  },
  timeSeriesData: [
    { date: '2024-01-01', executions: 45, conversions: 12 },
    { date: '2024-01-02', executions: 52, conversions: 14 },
    { date: '2024-01-03', executions: 38, conversions: 9 },
    { date: '2024-01-04', executions: 61, conversions: 18 },
    { date: '2024-01-05', executions: 49, conversions: 11 },
    { date: '2024-01-06', executions: 55, conversions: 15 },
    { date: '2024-01-07', executions: 48, conversions: 13 },
  ],
  nodePerformance: [
    { nodeId: 'trigger_1', nodeName: 'Campaign Trigger', executions: 1247, avgTime: '0s', errorRate: 0 },
    { nodeId: 'message_1', nodeName: 'Welcome Message', executions: 1247, avgTime: '2.3s', errorRate: 0.4 },
    { nodeId: 'delay_1', nodeName: 'Wait 24 Hours', executions: 1199, avgTime: '24h', errorRate: 0 },
    { nodeId: 'condition_1', nodeName: 'Check Response', executions: 1199, avgTime: '0.1s', errorRate: 0 },
    { nodeId: 'message_2', nodeName: 'Follow-up', executions: 856, avgTime: '2.1s', errorRate: 1.2 },
    { nodeId: 'goal_1', nodeName: 'Conversion', executions: 293, avgTime: '0s', errorRate: 0 },
  ],
  funnelData: [
    { stage: 'Started', count: 1247, percentage: 100 },
    { stage: 'Message Sent', count: 1199, percentage: 96.2 },
    { stage: 'Response Received', count: 856, percentage: 68.7 },
    { stage: 'Converted', count: 293, percentage: 23.5 },
  ],
  abTestResults: [
    {
      name: 'Message Variant Test',
      branches: [
        { name: 'Variant A', executions: 612, conversions: 152, conversionRate: 24.8 },
        { name: 'Variant B', executions: 635, conversions: 141, conversionRate: 22.2 },
      ],
    },
  ],
});

// ============================================================================
// COMPONENTS
// ============================================================================

function StatCard({
  icon: Icon,
  label,
  value,
  change,
  color = 'blue',
}: {
  icon: any;
  label: string;
  value: string | number;
  change?: string;
  color?: string;
}) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400',
    amber: 'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400',
    purple: 'bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400',
    slate: 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400',
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-slate-600 dark:text-slate-400">{label}</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-2">{value}</p>
          {change && (
            <p className="text-sm text-green-600 dark:text-green-400 mt-2">
              {change} vs last week
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

function NodePerformanceTable({ nodes }: { nodes: typeof getMockAnalytics extends () => infer R ? R['nodePerformance'] : never }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800">
            <th className="text-left py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">
              Node
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">
              Executions
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">
              Avg Time
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-slate-600 dark:text-slate-400">
              Error Rate
            </th>
          </tr>
        </thead>
        <tbody>
          {nodes.map((node, index) => (
            <tr key={node.nodeId} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <td className="py-3 px-4">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${index === 0 ? 'bg-green-500' : 'bg-blue-500'}`} />
                  <span className="text-sm text-slate-900 dark:text-slate-100">{node.nodeName}</span>
                </div>
              </td>
              <td className="text-right py-3 px-4 text-sm text-slate-900 dark:text-slate-100">
                {node.executions.toLocaleString()}
              </td>
              <td className="text-right py-3 px-4 text-sm text-slate-600 dark:text-slate-400">
                {node.avgTime}
              </td>
              <td className="text-right py-3 px-4">
                <span className={`text-sm ${node.errorRate > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {node.errorRate}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ConversionFunnel({ data }: { data: typeof getMockAnalytics extends () => infer R ? R['funnelData'] : never }) {
  return (
    <div className="space-y-3">
      {data.map((stage, index) => (
        <div key={stage.stage} className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-900 dark:text-slate-100 font-medium">{stage.stage}</span>
            <span className="text-slate-600 dark:text-slate-400">
              {stage.count.toLocaleString()} ({stage.percentage.toFixed(1)}%)
            </span>
          </div>
          <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
              style={{ width: `${stage.percentage}%` }}
            />
          </div>
          {index < data.length - 1 && (
            <div className="flex items-center justify-center py-1">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {((data[index + 1].count / stage.count) * 100).toFixed(1)}% moved to next step
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default async function WorkflowAnalyticsPage({ params }: WorkflowAnalyticsPageProps) {
  const { id: workflowId } = await params;

  // TODO: Replace with real API call
  // const analytics = await fetchWorkflowAnalytics(workflowId);
  const analytics = getMockAnalytics();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Workflow Analytics
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Performance metrics and insights for workflow {workflowId}
              </p>
            </div>
            <div className="flex gap-3">
              <select className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm">
                <option>Last 7 days</option>
                <option>Last 30 days</option>
                <option>Last 90 days</option>
                <option>All time</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <StatCard
            icon={Activity}
            label="Total Executions"
            value={analytics.overview.totalExecutions.toLocaleString()}
            change="+12.3%"
            color="blue"
          />
          <StatCard
            icon={CheckCircle}
            label="Success Rate"
            value={`${analytics.overview.successRate}%`}
            change="+2.1%"
            color="green"
          />
          <StatCard
            icon={Clock}
            label="Avg Completion Time"
            value={analytics.overview.averageCompletionTime}
            color="amber"
          />
          <StatCard
            icon={Target}
            label="Conversion Rate"
            value={`${analytics.overview.conversionRate}%`}
            change="+5.4%"
            color="purple"
          />
          <StatCard
            icon={Zap}
            label="Active Executions"
            value={analytics.overview.activeExecutions}
            color="slate"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Execution Trend */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Execution Trend
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Daily executions and conversions
                </p>
              </div>
              <BarChart3 className="w-5 h-5 text-slate-400" />
            </div>
            <div className="h-64 flex items-end gap-2">
              {analytics.timeSeriesData.map((day, index) => {
                const maxExec = Math.max(...analytics.timeSeriesData.map((d) => d.executions));
                const height = (day.executions / maxExec) * 100;
                return (
                  <div key={day.date} className="flex-1 flex flex-col gap-1">
                    <div className="relative h-full flex items-end">
                      <div
                        className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                        style={{ height: `${height}%` }}
                        title={`${day.executions} executions`}
                      />
                    </div>
                    <div className="text-xs text-center text-slate-500 dark:text-slate-400 mt-1">
                      {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Conversion Funnel */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Conversion Funnel
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Contact journey through workflow
                </p>
              </div>
              <TrendingUp className="w-5 h-5 text-slate-400" />
            </div>
            <ConversionFunnel data={analytics.funnelData} />
          </div>
        </div>

        {/* Node Performance */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Node Performance
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Execution metrics for each workflow step
              </p>
            </div>
          </div>
          <NodePerformanceTable nodes={analytics.nodePerformance} />
        </div>

        {/* A/B Test Results */}
        {analytics.abTestResults.map((test) => (
          <div
            key={test.name}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6"
          >
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {test.name}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                A/B test performance comparison
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {test.branches.map((branch) => (
                <div
                  key={branch.name}
                  className="border border-slate-200 dark:border-slate-800 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-slate-900 dark:text-slate-100">{branch.name}</h3>
                    <div
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        branch.conversionRate > 23
                          ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {branch.conversionRate > 23 ? 'Winner' : 'Control'}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">Executions</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {branch.executions.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">Conversions</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {branch.conversions.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">Conversion Rate</span>
                      <span className="font-bold text-lg text-slate-900 dark:text-slate-100">
                        {branch.conversionRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
