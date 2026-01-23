'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  AdvancedDemoAnalytics,
  UserJourney,
  FeatureEngagement,
  RealTimeMetrics,
  OptimizationInsight,
} from '@/lib/demo-analytics-advanced'
import { ABTestingFramework, ABTest, ABTestResults, ABTestingUtils } from '@/lib/ab-testing'
import {
  ConversionOptimizationEngine,
  ConversionFunnel,
  OptimizationOpportunity,
  ConversionOptimizationUtils,
} from '@/lib/conversion-optimization'
import { LeadHandoffSystem, Lead, LeadHandoffUtils } from '@/lib/lead-handoff'
import { BusinessScenario } from '@/types/demo'
import { createClient } from '@supabase/supabase-js'

interface DemoPerformanceDashboardProps {
  className?: string
}

interface DashboardMetrics {
  totalSessions: number
  conversionRate: number
  averageEngagement: number
  activeTests: number
  qualifiedLeads: number
  revenueImpact: number
}

interface TimeRangeOption {
  label: string
  value: string
  days: number
}

const timeRangeOptions: TimeRangeOption[] = [
  { label: 'Last 24 Hours', value: '24h', days: 1 },
  { label: 'Last 7 Days', value: '7d', days: 7 },
  { label: 'Last 30 Days', value: '30d', days: 30 },
  { label: 'Last 90 Days', value: '90d', days: 90 },
]

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const DemoPerformanceDashboard: React.FC<DemoPerformanceDashboardProps> = ({
  className = '',
}) => {
  // Services
  const [analytics] = useState(() => new AdvancedDemoAnalytics(supabase))
  const [abTesting] = useState(() => new ABTestingFramework(supabase))
  const [conversionEngine] = useState(() => new ConversionOptimizationEngine(supabase))
  const [leadSystem] = useState(() => new LeadHandoffSystem(supabase))

  // State
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRangeOption>(timeRangeOptions[1])
  const [selectedScenario, setSelectedScenario] = useState<BusinessScenario | 'all'>('all')
  const [activeTab, setActiveTab] = useState<
    'overview' | 'analytics' | 'tests' | 'optimization' | 'leads'
  >('overview')
  const [isLoading, setIsLoading] = useState(true)

  // Data state
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics>({
    totalSessions: 0,
    conversionRate: 0,
    averageEngagement: 0,
    activeTests: 0,
    qualifiedLeads: 0,
    revenueImpact: 0,
  })
  const [realTimeMetrics, setRealTimeMetrics] = useState<RealTimeMetrics | null>(null)
  const [conversionFunnels, setConversionFunnels] = useState<ConversionFunnel[]>([])
  const [featureEngagement, setFeatureEngagement] = useState<FeatureEngagement[]>([])
  const [activeTests, setActiveTests] = useState<ABTest[]>([])
  const [testResults, setTestResults] = useState<ABTestResults[]>([])
  const [optimizationOpportunities, setOptimizationOpportunities] = useState<
    OptimizationOpportunity[]
  >([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [optimizationInsights, setOptimizationInsights] = useState<OptimizationInsight[]>([])

  // Calculate time range
  const timeRange = useMemo(() => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - selectedTimeRange.days)
    return {
      start: start.toISOString(),
      end: end.toISOString(),
    }
  }, [selectedTimeRange])

  // Load dashboard data
  useEffect(() => {
    loadDashboardData()
  }, [selectedTimeRange, selectedScenario])

  // Start real-time monitoring
  useEffect(() => {
    const monitoringId = analytics.startRealTimeMonitoring(metrics => {
      setRealTimeMetrics(metrics)
    })

    return () => {
      analytics.stopRealTimeMonitoring(monitoringId)
    }
  }, [analytics])

  const loadDashboardData = async () => {
    setIsLoading(true)
    try {
      await Promise.all([
        loadOverviewMetrics(),
        loadAnalyticsData(),
        loadTestingData(),
        loadOptimizationData(),
        loadLeadsData(),
      ])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadOverviewMetrics = async () => {
    try {
      // This would typically come from aggregated analytics
      const metrics = {
        totalSessions: 1250,
        conversionRate: 12.8,
        averageEngagement: 67,
        activeTests: 3,
        qualifiedLeads: 45,
        revenueImpact: 125000,
      }
      setDashboardMetrics(metrics)
    } catch (error) {
      console.error('Error loading overview metrics:', error)
    }
  }

  const loadAnalyticsData = async () => {
    try {
      const scenario = selectedScenario === 'all' ? undefined : selectedScenario

      // Load conversion funnels
      if (scenario) {
        const funnel = await conversionEngine.analyzeFunnel(scenario, timeRange)
        setConversionFunnels([funnel])
      }

      // Load feature engagement
      const engagement = await analytics.calculateFeatureEngagement(scenario, timeRange)
      setFeatureEngagement(engagement)

      // Load optimization insights
      const insights = await conversionEngine.generateOptimizationInsights(scenario, timeRange)
      setOptimizationInsights(insights)
    } catch (error) {
      console.error('Error loading analytics data:', error)
    }
  }

  const loadTestingData = async () => {
    try {
      // Load active tests (placeholder)
      setActiveTests([])
      setTestResults([])
    } catch (error) {
      console.error('Error loading testing data:', error)
    }
  }

  const loadOptimizationData = async () => {
    try {
      if (conversionFunnels.length > 0) {
        const opportunities = conversionFunnels[0].optimization_opportunities
        setOptimizationOpportunities(opportunities)
      }
    } catch (error) {
      console.error('Error loading optimization data:', error)
    }
  }

  const loadLeadsData = async () => {
    try {
      const leadsData = await leadSystem.getLeads({
        business_scenario: selectedScenario === 'all' ? undefined : selectedScenario,
        created_after: timeRange.start,
        created_before: timeRange.end,
      })
      setLeads(leadsData)
    } catch (error) {
      console.error('Error loading leads data:', error)
    }
  }

  const renderOverviewTab = () => (
    <div className='space-y-6'>
      {/* Key Metrics Cards */}
      <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'>
        <MetricCard
          title='Total Sessions'
          value={dashboardMetrics.totalSessions.toLocaleString()}
          change='+12.5%'
          trend='up'
          icon='👥'
        />
        <MetricCard
          title='Conversion Rate'
          value={`${dashboardMetrics.conversionRate}%`}
          change='+2.3%'
          trend='up'
          icon='📈'
        />
        <MetricCard
          title='Avg Engagement'
          value={`${dashboardMetrics.averageEngagement}/100`}
          change='+5.7%'
          trend='up'
          icon='⚡'
        />
        <MetricCard
          title='Active Tests'
          value={dashboardMetrics.activeTests.toString()}
          change='2 completed'
          trend='neutral'
          icon='🧪'
        />
        <MetricCard
          title='Qualified Leads'
          value={dashboardMetrics.qualifiedLeads.toString()}
          change='+18.9%'
          trend='up'
          icon='🎯'
        />
        <MetricCard
          title='Revenue Impact'
          value={`$${(dashboardMetrics.revenueImpact / 1000).toFixed(0)}K`}
          change='+25.3%'
          trend='up'
          icon='💰'
        />
      </div>

      {/* Real-time Activity */}
      {realTimeMetrics && (
        <div className='rounded-lg border border-gray-200 bg-white p-6'>
          <h3 className='mb-4 text-lg font-semibold text-gray-900'>Real-time Activity</h3>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
            <div className='text-center'>
              <div className='text-2xl font-bold text-green-600'>
                {realTimeMetrics.active_sessions}
              </div>
              <div className='text-sm text-gray-500'>Active Sessions</div>
            </div>
            <div className='text-center'>
              <div className='text-2xl font-bold text-blue-600'>
                {realTimeMetrics.current_conversions}
              </div>
              <div className='text-sm text-gray-500'>Today's Conversions</div>
            </div>
            <div className='text-center'>
              <div className='text-2xl font-bold text-purple-600'>
                {realTimeMetrics.trending_features.length}
              </div>
              <div className='text-sm text-gray-500'>Trending Features</div>
            </div>
            <div className='text-center'>
              <div className='text-2xl font-bold text-orange-600'>
                {realTimeMetrics.alert_conditions.filter(a => a.triggered).length}
              </div>
              <div className='text-sm text-gray-500'>Active Alerts</div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Insights */}
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
        <div className='rounded-lg border border-gray-200 bg-white p-6'>
          <h3 className='mb-4 text-lg font-semibold text-gray-900'>
            Top Optimization Opportunities
          </h3>
          <div className='space-y-3'>
            {optimizationOpportunities.slice(0, 3).map((opportunity, index) => (
              <div
                key={index}
                className='flex items-center justify-between rounded-lg bg-gray-50 p-3'
              >
                <div>
                  <div className='font-medium text-gray-900'>{opportunity.title}</div>
                  <div className='text-sm text-gray-500'>{opportunity.description}</div>
                </div>
                <div className='text-right'>
                  <div className='text-sm font-medium text-green-600'>
                    +{opportunity.ab_test_suggestions[0]?.expected_improvement || 0}%
                  </div>
                  <div className='text-xs text-gray-400'>Expected Impact</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className='rounded-lg border border-gray-200 bg-white p-6'>
          <h3 className='mb-4 text-lg font-semibold text-gray-900'>Recent Insights</h3>
          <div className='space-y-3'>
            {optimizationInsights.slice(0, 3).map((insight, index) => (
              <div key={index} className='flex items-start space-x-3 rounded-lg bg-gray-50 p-3'>
                <div
                  className={`mt-2 h-2 w-2 rounded-full ${
                    insight.severity === 'critical'
                      ? 'bg-red-500'
                      : insight.severity === 'warning'
                        ? 'bg-yellow-500'
                        : 'bg-blue-500'
                  }`}
                />
                <div>
                  <div className='font-medium text-gray-900'>{insight.title}</div>
                  <div className='text-sm text-gray-500'>{insight.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  const renderAnalyticsTab = () => (
    <div className='space-y-6'>
      {/* Conversion Funnel */}
      {conversionFunnels.length > 0 && (
        <div className='rounded-lg border border-gray-200 bg-white p-6'>
          <h3 className='mb-4 text-lg font-semibold text-gray-900'>Conversion Funnel</h3>
          <ConversionFunnelChart funnel={conversionFunnels[0]} />
        </div>
      )}

      {/* Feature Engagement */}
      <div className='rounded-lg border border-gray-200 bg-white p-6'>
        <h3 className='mb-4 text-lg font-semibold text-gray-900'>Feature Engagement</h3>
        <FeatureEngagementChart features={featureEngagement} />
      </div>

      {/* User Journey Heatmap */}
      <div className='rounded-lg border border-gray-200 bg-white p-6'>
        <h3 className='mb-4 text-lg font-semibold text-gray-900'>User Journey Patterns</h3>
        <div className='py-8 text-center text-gray-500'>
          User journey heatmap visualization would go here
        </div>
      </div>
    </div>
  )

  const renderTestsTab = () => (
    <div className='space-y-6'>
      {/* Active Tests */}
      <div className='rounded-lg border border-gray-200 bg-white p-6'>
        <div className='mb-4 flex items-center justify-between'>
          <h3 className='text-lg font-semibold text-gray-900'>Active A/B Tests</h3>
          <button className='rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700'>
            Create New Test
          </button>
        </div>
        {activeTests.length > 0 ? (
          <ABTestList tests={activeTests} />
        ) : (
          <div className='py-8 text-center text-gray-500'>
            No active tests. Create your first A/B test to optimize conversion rates.
          </div>
        )}
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className='rounded-lg border border-gray-200 bg-white p-6'>
          <h3 className='mb-4 text-lg font-semibold text-gray-900'>Recent Test Results</h3>
          <TestResultsList results={testResults} />
        </div>
      )}
    </div>
  )

  const renderOptimizationTab = () => (
    <div className='space-y-6'>
      {/* Optimization Score */}
      <div className='rounded-lg border border-gray-200 bg-white p-6'>
        <h3 className='mb-4 text-lg font-semibold text-gray-900'>Optimization Score</h3>
        <OptimizationScoreCard
          score={72}
          opportunities={optimizationOpportunities}
          funnels={conversionFunnels}
        />
      </div>

      {/* Opportunities List */}
      <div className='rounded-lg border border-gray-200 bg-white p-6'>
        <h3 className='mb-4 text-lg font-semibold text-gray-900'>Optimization Opportunities</h3>
        <OptimizationOpportunitiesList opportunities={optimizationOpportunities} />
      </div>

      {/* Performance Trends */}
      <div className='rounded-lg border border-gray-200 bg-white p-6'>
        <h3 className='mb-4 text-lg font-semibold text-gray-900'>Performance Trends</h3>
        <PerformanceTrendsChart />
      </div>
    </div>
  )

  const renderLeadsTab = () => (
    <div className='space-y-6'>
      {/* Lead Pipeline */}
      <div className='rounded-lg border border-gray-200 bg-white p-6'>
        <h3 className='mb-4 text-lg font-semibold text-gray-900'>Lead Pipeline</h3>
        <LeadPipelineChart leads={leads} />
      </div>

      {/* Lead Quality Distribution */}
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
        <div className='rounded-lg border border-gray-200 bg-white p-6'>
          <h3 className='mb-4 text-lg font-semibold text-gray-900'>Lead Quality Distribution</h3>
          <LeadQualityChart leads={leads} />
        </div>

        <div className='rounded-lg border border-gray-200 bg-white p-6'>
          <h3 className='mb-4 text-lg font-semibold text-gray-900'>Recent High-Quality Leads</h3>
          <HighQualityLeadsList
            leads={leads.filter(l => l.lead_score.sales_readiness === 'qualified').slice(0, 5)}
          />
        </div>
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className={`${className} flex h-96 items-center justify-center`}>
        <div className='h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600'></div>
      </div>
    )
  }

  return (
    <div className={`${className} mx-auto max-w-7xl`}>
      {/* Header */}
      <div className='mb-8'>
        <div className='mb-4 flex items-center justify-between'>
          <h1 className='text-3xl font-bold text-gray-900'>Demo Performance Dashboard</h1>
          <div className='flex items-center space-x-4'>
            <select
              value={selectedScenario}
              onChange={e => setSelectedScenario(e.target.value as BusinessScenario | 'all')}
              className='rounded-lg border border-gray-300 px-3 py-2 text-sm'
            >
              <option value='all'>All Scenarios</option>
              <option value='retail'>Retail</option>
              <option value='restaurant'>Restaurant</option>
              <option value='ecommerce'>E-commerce</option>
              <option value='healthcare'>Healthcare</option>
              <option value='education'>Education</option>
            </select>
            <select
              value={selectedTimeRange.value}
              onChange={e => {
                const range = timeRangeOptions.find(r => r.value === e.target.value)
                if (range) setSelectedTimeRange(range)
              }}
              className='rounded-lg border border-gray-300 px-3 py-2 text-sm'
            >
              {timeRangeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className='border-b border-gray-200'>
          <nav className='flex space-x-8'>
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'analytics', label: 'Analytics' },
              { id: 'tests', label: 'A/B Tests' },
              { id: 'optimization', label: 'Optimization' },
              { id: 'leads', label: 'Leads' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`border-b-2 px-1 py-2 text-sm font-medium ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'analytics' && renderAnalyticsTab()}
        {activeTab === 'tests' && renderTestsTab()}
        {activeTab === 'optimization' && renderOptimizationTab()}
        {activeTab === 'leads' && renderLeadsTab()}
      </div>
    </div>
  )
}

// Supporting Components

interface MetricCardProps {
  title: string
  value: string
  change: string
  trend: 'up' | 'down' | 'neutral'
  icon: string
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, trend, icon }) => (
  <div className='rounded-lg border border-gray-200 bg-white p-4'>
    <div className='mb-2 flex items-center justify-between'>
      <div className='text-2xl'>{icon}</div>
      <div
        className={`rounded-full px-2 py-1 text-xs font-medium ${
          trend === 'up'
            ? 'bg-green-100 text-green-600'
            : trend === 'down'
              ? 'bg-red-100 text-red-600'
              : 'bg-gray-100 text-gray-600'
        }`}
      >
        {change}
      </div>
    </div>
    <div className='text-2xl font-bold text-gray-900'>{value}</div>
    <div className='text-sm text-gray-500'>{title}</div>
  </div>
)

interface ConversionFunnelChartProps {
  funnel: ConversionFunnel
}

const ConversionFunnelChart: React.FC<ConversionFunnelChartProps> = ({ funnel }) => (
  <div className='space-y-4'>
    {funnel.steps.map((step, index) => (
      <div key={step.id} className='flex items-center space-x-4'>
        <div className='flex-1'>
          <div className='mb-2 flex items-center justify-between'>
            <span className='font-medium text-gray-900'>{step.name}</span>
            <span className='text-sm text-gray-500'>
              {step.conversion_rate.toFixed(1)}% conversion
            </span>
          </div>
          <div className='h-2 w-full rounded-full bg-gray-200'>
            <div
              className='h-2 rounded-full bg-blue-600'
              style={{ width: `${step.conversion_rate}%` }}
            />
          </div>
          <div className='mt-1 flex justify-between text-xs text-gray-400'>
            <span>{step.entry_count} entered</span>
            <span>{step.completion_count} completed</span>
          </div>
        </div>
      </div>
    ))}
  </div>
)

interface FeatureEngagementChartProps {
  features: FeatureEngagement[]
}

const FeatureEngagementChart: React.FC<FeatureEngagementChartProps> = ({ features }) => (
  <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
    {features.map((feature, index) => (
      <div key={index} className='rounded-lg border border-gray-200 p-4'>
        <div className='mb-2 font-medium text-gray-900'>{feature.feature_name}</div>
        <div className='space-y-2'>
          <div className='flex justify-between text-sm'>
            <span className='text-gray-500'>Engagement Score</span>
            <span className='font-medium'>{feature.engagement_score}/100</span>
          </div>
          <div className='flex justify-between text-sm'>
            <span className='text-gray-500'>Users</span>
            <span className='font-medium'>{feature.unique_users}</span>
          </div>
          <div className='flex justify-between text-sm'>
            <span className='text-gray-500'>Completion Rate</span>
            <span className='font-medium'>{feature.completion_rate.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    ))}
  </div>
)

interface ABTestListProps {
  tests: ABTest[]
}

const ABTestList: React.FC<ABTestListProps> = ({ tests }) => (
  <div className='space-y-4'>
    {tests.map(test => (
      <div key={test.id} className='rounded-lg border border-gray-200 p-4'>
        <div className='mb-2 flex items-center justify-between'>
          <h4 className='font-medium text-gray-900'>{test.name}</h4>
          <span
            className={`rounded-full px-2 py-1 text-xs font-medium ${
              test.status === 'running'
                ? 'bg-green-100 text-green-600'
                : test.status === 'completed'
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-gray-100 text-gray-600'
            }`}
          >
            {test.status}
          </span>
        </div>
        <p className='mb-3 text-sm text-gray-500'>{test.description}</p>
        <div className='grid grid-cols-2 gap-4'>
          {test.variants.map(variant => (
            <div key={variant.id} className='rounded bg-gray-50 p-3 text-center'>
              <div className='font-medium text-gray-900'>{variant.name}</div>
              <div className='text-sm text-gray-500'>
                {variant.conversion_rate.toFixed(1)}% conversion
              </div>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
)

interface TestResultsListProps {
  results: ABTestResults[]
}

const TestResultsList: React.FC<TestResultsListProps> = ({ results }) => (
  <div className='space-y-4'>
    {results.map(result => (
      <div key={result.test_id} className='rounded-lg border border-gray-200 p-4'>
        <div className='mb-4'>
          <div className='flex items-center justify-between'>
            <h4 className='font-medium text-gray-900'>Test Results</h4>
            <div
              className={`rounded-full px-2 py-1 text-xs font-medium ${
                result.statistical_significance.is_significant
                  ? 'bg-green-100 text-green-600'
                  : 'bg-yellow-100 text-yellow-600'
              }`}
            >
              {result.statistical_significance.is_significant ? 'Significant' : 'Not Significant'}
            </div>
          </div>
          <div className='text-sm text-gray-500'>
            {result.total_sessions} sessions • {result.overall_conversion_rate.toFixed(1)}% overall
            conversion
          </div>
        </div>
        <div className='space-y-2'>
          {result.variant_results.map(variant => (
            <div
              key={variant.variant_id}
              className='flex items-center justify-between rounded bg-gray-50 p-2'
            >
              <span className='font-medium'>{variant.variant_name}</span>
              <div className='text-right'>
                <div className='text-sm font-medium'>{variant.conversion_rate.toFixed(1)}%</div>
                <div
                  className={`text-xs ${
                    variant.improvement_over_control > 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {variant.improvement_over_control > 0 ? '+' : ''}
                  {variant.improvement_over_control.toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
)

interface OptimizationScoreCardProps {
  score: number
  opportunities: OptimizationOpportunity[]
  funnels: ConversionFunnel[]
}

const OptimizationScoreCard: React.FC<OptimizationScoreCardProps> = ({
  score,
  opportunities,
  funnels,
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBackground = (score: number) => {
    if (score >= 80) return 'bg-green-100'
    if (score >= 60) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  return (
    <div className='text-center'>
      <div
        className={`inline-flex h-24 w-24 items-center justify-center rounded-full ${getScoreBackground(score)} mb-4`}
      >
        <span className={`text-3xl font-bold ${getScoreColor(score)}`}>{score}</span>
      </div>
      <div className='mb-2 text-lg font-medium text-gray-900'>Optimization Score</div>
      <div className='mb-4 text-sm text-gray-500'>
        {opportunities.length} opportunities identified
      </div>
      <div className='grid grid-cols-3 gap-4 text-center'>
        <div>
          <div className='text-lg font-bold text-gray-900'>
            {opportunities.filter(o => o.impact_level === 'high').length}
          </div>
          <div className='text-xs text-gray-500'>High Impact</div>
        </div>
        <div>
          <div className='text-lg font-bold text-gray-900'>
            {opportunities.filter(o => o.effort_level === 'low').length}
          </div>
          <div className='text-xs text-gray-500'>Low Effort</div>
        </div>
        <div>
          <div className='text-lg font-bold text-gray-900'>
            {funnels.length > 0 ? funnels[0].bottlenecks.length : 0}
          </div>
          <div className='text-xs text-gray-500'>Bottlenecks</div>
        </div>
      </div>
    </div>
  )
}

interface OptimizationOpportunitiesListProps {
  opportunities: OptimizationOpportunity[]
}

const OptimizationOpportunitiesList: React.FC<OptimizationOpportunitiesListProps> = ({
  opportunities,
}) => {
  const prioritized = ConversionOptimizationUtils.prioritizeOpportunities(opportunities)

  return (
    <div className='space-y-4'>
      {prioritized.slice(0, 5).map(opportunity => (
        <div key={opportunity.id} className='rounded-lg border border-gray-200 p-4'>
          <div className='mb-2 flex items-center justify-between'>
            <h4 className='font-medium text-gray-900'>{opportunity.title}</h4>
            <div className='flex items-center space-x-2'>
              <span
                className={`rounded-full px-2 py-1 text-xs font-medium ${
                  opportunity.impact_level === 'high'
                    ? 'bg-red-100 text-red-600'
                    : opportunity.impact_level === 'medium'
                      ? 'bg-yellow-100 text-yellow-600'
                      : 'bg-green-100 text-green-600'
                }`}
              >
                {opportunity.impact_level} impact
              </span>
              <span
                className={`rounded-full px-2 py-1 text-xs font-medium ${
                  opportunity.effort_level === 'low'
                    ? 'bg-green-100 text-green-600'
                    : opportunity.effort_level === 'medium'
                      ? 'bg-yellow-100 text-yellow-600'
                      : 'bg-red-100 text-red-600'
                }`}
              >
                {opportunity.effort_level} effort
              </span>
            </div>
          </div>
          <p className='mb-3 text-sm text-gray-500'>{opportunity.description}</p>
          <div className='flex items-center justify-between'>
            <div className='text-sm text-gray-600'>
              ROI Score: <span className='font-medium'>{opportunity.roi_score}</span>
            </div>
            <button className='text-sm font-medium text-blue-600 hover:text-blue-700'>
              Create A/B Test
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

const PerformanceTrendsChart: React.FC = () => (
  <div className='py-8 text-center text-gray-500'>Performance trends chart would go here</div>
)

interface LeadPipelineChartProps {
  leads: Lead[]
}

const LeadPipelineChart: React.FC<LeadPipelineChartProps> = ({ leads }) => {
  const stages = ['new', 'contacted', 'qualified', 'demo_scheduled', 'proposal_sent', 'closed_won']
  const stageLabels = {
    new: 'New',
    contacted: 'Contacted',
    qualified: 'Qualified',
    demo_scheduled: 'Demo Scheduled',
    proposal_sent: 'Proposal Sent',
    closed_won: 'Closed Won',
  }

  const stageCounts = stages.reduce(
    (acc, stage) => {
      acc[stage] = leads.filter(lead => lead.status === stage).length
      return acc
    },
    {} as Record<string, number>
  )

  return (
    <div className='space-y-4'>
      {stages.map(stage => (
        <div key={stage} className='flex items-center space-x-4'>
          <div className='w-32 text-sm font-medium text-gray-700'>
            {stageLabels[stage as keyof typeof stageLabels]}
          </div>
          <div className='flex-1'>
            <div className='mb-1 flex items-center justify-between'>
              <span className='text-sm text-gray-500'>{stageCounts[stage]} leads</span>
            </div>
            <div className='h-2 w-full rounded-full bg-gray-200'>
              <div
                className='h-2 rounded-full bg-blue-600'
                style={{
                  width: `${leads.length > 0 ? (stageCounts[stage] / leads.length) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

interface LeadQualityChartProps {
  leads: Lead[]
}

const LeadQualityChart: React.FC<LeadQualityChartProps> = ({ leads }) => {
  const qualityDistribution = leads.reduce(
    (acc, lead) => {
      acc[lead.lead_score.sales_readiness] = (acc[lead.lead_score.sales_readiness] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return (
    <div className='space-y-4'>
      {Object.entries(qualityDistribution).map(([quality, count]) => (
        <div key={quality} className='flex items-center justify-between'>
          <span className='font-medium text-gray-700 capitalize'>{quality.replace('_', ' ')}</span>
          <div className='flex items-center space-x-2'>
            <span className='text-sm text-gray-500'>{count}</span>
            <div className='h-2 w-20 rounded-full bg-gray-200'>
              <div
                className={`h-2 rounded-full ${
                  quality === 'qualified'
                    ? 'bg-green-500'
                    : quality === 'hot'
                      ? 'bg-orange-500'
                      : quality === 'warm'
                        ? 'bg-yellow-500'
                        : 'bg-gray-400'
                }`}
                style={{ width: `${leads.length > 0 ? (count / leads.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

interface HighQualityLeadsListProps {
  leads: Lead[]
}

const HighQualityLeadsList: React.FC<HighQualityLeadsListProps> = ({ leads }) => (
  <div className='space-y-3'>
    {leads.map(lead => {
      const { scoreColor, statusBadge } = LeadHandoffUtils.formatLeadDisplay(lead)
      return (
        <div key={lead.id} className='flex items-center justify-between rounded-lg bg-gray-50 p-3'>
          <div>
            <div className='font-medium text-gray-900'>{lead.name || lead.email}</div>
            <div className='text-sm text-gray-500'>{lead.company || lead.business_scenario}</div>
          </div>
          <div className='text-right'>
            <div className={`text-sm font-medium text-${scoreColor}-600`}>
              {lead.lead_score.total_score}/100
            </div>
            <div className='text-xs text-gray-400'>{statusBadge}</div>
          </div>
        </div>
      )
    })}
  </div>
)

export default DemoPerformanceDashboard
