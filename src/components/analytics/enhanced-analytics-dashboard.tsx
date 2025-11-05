// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches


'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ChartBarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CalendarIcon,
  ClockIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  EyeIcon,
  DocumentArrowDownIcon,
  Cog6ToothIcon,
  PlusIcon,
  FunnelIcon,
  ArrowPathIcon,
  ShareIcon,
  PrinterIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  MinusIcon,
  MapPinIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  GlobeAltIcon,
  StarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

// Enhanced interfaces
interface MetricData {
  id: string;
  label: string;
  value: number;
  previousValue?: number;
  change: number;
  changeType: 'increase' | 'decrease' | 'neutral';
  period: string;
  target?: number;
  unit?: string;
  trend: number[];
  status: 'good' | 'warning' | 'danger' | 'neutral';
  description?: string;
}

interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
  category?: string;
  metadata?: Record<string, any>;
}

interface TimeSeriesData {
  id: string;
  name: string;
  data: ChartDataPoint[];
  color: string;
  type: 'line' | 'bar' | 'area';
}

interface GeographicData {
  country: string;
  countryCode: string;
  value: number;
  percentage: number;
  coordinates: [number, number];
}

interface DeviceData {
  device: string;
  icon: React.ComponentType<any>;
  value: number;
  percentage: number;
  color: string;
}

interface AlertData {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  actions?: Array<{
    label: string;
    action: () => void;
    style: 'primary' | 'secondary' | 'danger';
  }>;
}

// Enhanced sample data
const ENHANCED_METRICS: MetricData[] = [
  {
    id: 'total-messages',
    label: 'Total Messages',
    value: 15847,
    previousValue: 14203,
    change: 11.6,
    changeType: 'increase',
    period: 'vs last month',
    target: 16000,
    unit: 'messages',
    trend: [12000, 12500, 13200, 14203, 15847],
    status: 'good',
    description: 'Total messages sent and received across all conversations'
  },
  {
    id: 'active-conversations',
    label: 'Active Conversations',
    value: 428,
    previousValue: 445,
    change: -3.8,
    changeType: 'decrease',
    period: 'vs last week',
    target: 450,
    unit: 'conversations',
    trend: [520, 480, 445, 410, 428],
    status: 'warning',
    description: 'Currently active conversation threads'
  },
  {
    id: 'avg-response-time',
    label: 'Avg Response Time',
    value: 2.3,
    previousValue: 2.8,
    change: -17.9,
    changeType: 'decrease',
    period: 'minutes',
    target: 2.0,
    unit: 'minutes',
    trend: [3.2, 2.9, 2.8, 2.5, 2.3],
    status: 'good',
    description: 'Average time to respond to customer messages'
  },
  {
    id: 'customer-satisfaction',
    label: 'Customer Satisfaction',
    value: 4.8,
    previousValue: 4.6,
    change: 4.3,
    changeType: 'increase',
    period: 'out of 5.0',
    target: 4.5,
    unit: 'rating',
    trend: [4.2, 4.4, 4.6, 4.7, 4.8],
    status: 'good',
    description: 'Average customer satisfaction rating'
  },
  {
    id: 'conversion-rate',
    label: 'Conversion Rate',
    value: 12.4,
    previousValue: 11.8,
    change: 5.1,
    changeType: 'increase',
    period: 'vs last month',
    target: 15.0,
    unit: '%',
    trend: [10.5, 11.1, 11.8, 12.0, 12.4],
    status: 'good',
    description: 'Percentage of conversations that result in conversions'
  },
  {
    id: 'resolution-rate',
    label: 'First Contact Resolution',
    value: 78.5,
    previousValue: 82.1,
    change: -4.4,
    changeType: 'decrease',
    period: 'vs last month',
    target: 85.0,
    unit: '%',
    trend: [85.2, 83.8, 82.1, 79.3, 78.5],
    status: 'danger',
    description: 'Percentage of issues resolved on first contact'
  }
];

const TIME_SERIES_DATA: TimeSeriesData[] = [
  {
    id: 'messages',
    name: 'Messages',
    color: '#3b82f6',
    type: 'line',
    data: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      value: Math.floor(Math.random() * 200) + 400 + i * 5,
    }))
  },
  {
    id: 'conversations',
    name: 'New Conversations',
    color: '#10b981',
    type: 'area',
    data: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      value: Math.floor(Math.random() * 50) + 15 + i * 0.5,
    }))
  },
  {
    id: 'response-time',
    name: 'Response Time (min)',
    color: '#f59e0b',
    type: 'bar',
    data: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      value: Math.random() * 2 + 1.5,
    }))
  }
];

const GEOGRAPHIC_DATA: GeographicData[] = [
  { country: 'United States', countryCode: 'US', value: 1247, percentage: 42.3, coordinates: [-95.7129, 37.0902] },
  { country: 'Canada', countryCode: 'CA', value: 567, percentage: 19.2, coordinates: [-106.3468, 56.1304] },
  { country: 'United Kingdom', countryCode: 'GB', value: 423, percentage: 14.3, coordinates: [-3.4360, 55.3781] },
  { country: 'Germany', countryCode: 'DE', value: 312, percentage: 10.6, coordinates: [10.4515, 51.1657] },
  { country: 'Australia', countryCode: 'AU', value: 234, percentage: 7.9, coordinates: [133.7751, -25.2744] },
  { country: 'France', countryCode: 'FR', value: 178, percentage: 6.0, coordinates: [2.2137, 46.2276] }
];

const DEVICE_DATA: DeviceData[] = [
  { device: 'Mobile', icon: DevicePhoneMobileIcon, value: 1834, percentage: 62.1, color: '#3b82f6' },
  { device: 'Desktop', icon: ComputerDesktopIcon, value: 892, percentage: 30.2, color: '#10b981' },
  { device: 'Tablet', icon: DevicePhoneMobileIcon, value: 227, percentage: 7.7, color: '#f59e0b' }
];

const SAMPLE_ALERTS: AlertData[] = [
  {
    id: '1',
    type: 'warning',
    title: 'Response Time Alert',
    message: 'Average response time has increased by 15% in the last hour',
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    isRead: false,
    actions: [
      { label: 'View Details', action: () => {}, style: 'primary' },
      { label: 'Dismiss', action: () => {}, style: 'secondary' }
    ]
  },
  {
    id: '2',
    type: 'success',
    title: 'Goal Achieved',
    message: 'Customer satisfaction target of 4.5 has been exceeded',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    isRead: false
  },
  {
    id: '3',
    type: 'error',
    title: 'High Unresponded Messages',
    message: '23 messages have been waiting for response for over 30 minutes',
    timestamp: new Date(Date.now() - 45 * 60 * 1000),
    isRead: true,
    actions: [
      { label: 'View Messages', action: () => {}, style: 'danger' },
      { label: 'Assign Team', action: () => {}, style: 'primary' }
    ]
  }
];

interface EnhancedAnalyticsDashboardProps {
  organizationId: string;
}

export default function EnhancedAnalyticsDashboard({ organizationId }: EnhancedAnalyticsDashboardProps) {
  const [selectedDateRange, setSelectedDateRange] = useState('30d');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['total-messages', 'active-conversations', 'avg-response-time']);
  const [showFilters, setShowFilters] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [selectedChart, setSelectedChart] = useState<string>('messages');
  const [alerts, setAlerts] = useState<AlertData[]>(SAMPLE_ALERTS);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview', 'trends']));
  const [chartViewType, setChartViewType] = useState<'combined' | 'individual'>('combined');
  const [showComparisons, setShowComparisons] = useState(true);

  // Real-time data updates
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      // Simulate real-time data updates
      
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Filter metrics based on selection
  const filteredMetrics = useMemo(() => {
    return ENHANCED_METRICS.filter(metric => selectedMetrics.includes(metric.id));
  }, [selectedMetrics]);

  // Get metric status icon and color
  const getMetricStatusIcon = (status: MetricData['status']) => {
    switch (status) {
      case 'good':
        return <CheckCircleIcon className="w-4 h-4 text-green-600" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-4 h-4 text-yellow-600" />;
      case 'danger':
        return <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />;
      default:
        return <InformationCircleIcon className="w-4 h-4 text-gray-600" />;
    }
  };

  const getMetricStatusColor = (status: MetricData['status']) => {
    switch (status) {
      case 'good': return 'border-green-200 bg-green-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      case 'danger': return 'border-red-200 bg-red-50';
      default: return 'border-gray-200 bg-white';
    }
  };

  // Toggle section expansion
  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  }, []);

  // Enhanced chart component
  const EnhancedChart = ({ data, height = 300, type = 'line' }: { data: ChartDataPoint[], height?: number, type?: 'line' | 'bar' | 'area' }) => {
    const maxValue = Math.max(...data.map(d => d.value));
    const minValue = Math.min(...data.map(d => d.value));
    const range = maxValue - minValue;

    return (
      <div className="relative" style={{ height }}>
        <svg width="100%" height="100%" className="overflow-visible">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => (
            <g key={index}>
              <line
                x1="0"
                y1={height * ratio}
                x2="100%"
                y2={height * ratio}
                stroke="#e5e7eb"
                strokeWidth="1"
                opacity="0.5"
              />
              <text
                x="10"
                y={height * ratio - 5}
                fontSize="10"
                fill="#6b7280"
              >
                {Math.round(maxValue - (ratio * range))}
              </text>
            </g>
          ))}

          {/* Vertical grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => (
            <line
              key={index}
              x1={`${ratio * 100}%`}
              y1="0"
              x2={`${ratio * 100}%`}
              y2="100%"
              stroke="#e5e7eb"
              strokeWidth="1"
              opacity="0.3"
            />
          ))}

          {type === 'area' && (
            <defs>
              <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
              </linearGradient>
            </defs>
          )}

          {type === 'area' && (
            <polygon
              fill="url(#areaGradient)"
              points={`0,${height} ${data.map((point, index) => {
                const x = (index / (data.length - 1)) * 100;
                const y = height - ((point.value - minValue) / range) * height;
                return `${x}%,${y}`;
              }).join(' ')} 100%,${height}`}
            />
          )}

          {type === 'bar' ? (
            data.map((point, index) => {
              const x = (index / data.length) * 100;
              const barWidth = 100 / data.length * 0.8;
              const y = height - ((point.value - minValue) / range) * height;
              const barHeight = ((point.value - minValue) / range) * height;

              return (
                <rect
                  key={index}
                  x={`${x + (100 / data.length * 0.1)}%`}
                  y={y}
                  width={`${barWidth}%`}
                  height={barHeight}
                  fill="#3b82f6"
                  opacity="0.8"
                  rx="2"
                />
              );
            })
          ) : (
            <polyline
              fill="none"
              stroke="#3b82f6"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={data.map((point, index) => {
                const x = (index / (data.length - 1)) * 100;
                const y = height - ((point.value - minValue) / range) * height;
                return `${x}%,${y}`;
              }).join(' ')}
            />
          )}

          {/* Data points */}
          {type !== 'bar' && data.map((point, index) => {
            const x = (index / (data.length - 1)) * 100;
            const y = height - ((point.value - minValue) / range) * height;
            return (
              <circle
                key={index}
                cx={`${x}%`}
                cy={y}
                r="4"
                fill="#3b82f6"
                className="hover:r-6 transition-all cursor-pointer"
                onMouseEnter={(e) => {
                  // Show tooltip
                  const tooltip = document.getElementById('chart-tooltip');
                  if (tooltip) {
                    tooltip.style.display = 'block';
                    tooltip.style.left = `${x}%`;
                    tooltip.style.top = `${y - 40}px`;
                    tooltip.textContent = `${point.value} (${point.date})`;
                  }
                }}
                onMouseLeave={() => {
                  const tooltip = document.getElementById('chart-tooltip');
                  if (tooltip) {
                    tooltip.style.display = 'none';
                  }
                }}
              />
            );
          })}
        </svg>

        {/* Tooltip */}
        <div
          id="chart-tooltip"
          className="absolute bg-gray-800 text-white px-2 py-1 rounded text-xs pointer-events-none"
          style={{ display: 'none', transform: 'translateX(-50%)' }}
        />

        {/* X-axis labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500 mt-2">
          {data.filter((_, index) => index % Math.ceil(data.length / 5) === 0).map((point, index) => (
            <span key={index}>{new Date(point.date).toLocaleDateString()}</span>
          ))}
        </div>
      </div>
    );
  };

  // Mini sparkline component
  const Sparkline = ({ data, color = '#3b82f6', width = 80, height = 24 }: {
    data: number[],
    color?: string,
    width?: number,
    height?: number
  }) => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min;

    return (
      <svg width={width} height={height} className="inline-block">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={data.map((value, index) => {
            const x = (index / (data.length - 1)) * width;
            const y = height - ((value - min) / range) * height;
            return `${x},${y}`;
          }).join(' ')}
        />
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Enhanced Analytics</h1>
              <div className="flex items-center space-x-2">
                <CalendarIcon className="w-5 h-5 text-gray-400" />
                <select
                  value={selectedDateRange}
                  onChange={(e) => setSelectedDateRange(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Select date range"
                >
                  <option value="1d">Last 24 hours</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                  <option value="custom">Custom range</option>
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-3 mt-4 lg:mt-0">
              {/* Auto-refresh toggle */}
              <div className="flex items-center space-x-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Auto-refresh</span>
                </label>
                {autoRefresh && (
                  <select
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(Number(e.target.value))}
                    className="border border-gray-300 rounded-md px-2 py-1 text-xs"
                  >
                    <option value={10}>10s</option>
                    <option value={30}>30s</option>
                    <option value={60}>1m</option>
                    <option value={300}>5m</option>
                  </select>
                )}
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  showFilters ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <FunnelIcon className="w-4 h-4 mr-2" />
                Filters
              </button>

              <button className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
                Export
              </button>

              <button className="flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700">
                <ArrowPathIcon className="w-4 h-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Metrics to Display</label>
                  <div className="space-y-1">
                    {ENHANCED_METRICS.map(metric => (
                      <label key={metric.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedMetrics.includes(metric.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMetrics(prev => [...prev, metric.id]);
                            } else {
                              setSelectedMetrics(prev => prev.filter(id => id !== metric.id));
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{metric.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Chart Type</label>
                  <select
                    value={chartViewType}
                    onChange={(e) => setChartViewType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="combined">Combined View</option>
                    <option value="individual">Individual Charts</option>
                  </select>

                  <label className="flex items-center mt-3">
                    <input
                      type="checkbox"
                      checked={showComparisons}
                      onChange={(e) => setShowComparisons(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Show Comparisons</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Alert Filters</label>
                  <div className="space-y-1">
                    {['info', 'warning', 'error', 'success'].map(type => (
                      <label key={type} className="flex items-center">
                        <input
                          type="checkbox"
                          defaultChecked
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 capitalize">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-6">
        {/* Alerts Section */}
        {alerts.filter(alert => !alert.isRead).length > 0 && (
          <div className="mb-6">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <button
                onClick={() => toggleSection('alerts')}
                className="w-full flex items-center justify-between p-4 text-left"
              >
                <h2 className="text-lg font-medium text-gray-900">Active Alerts</h2>
                {expandedSections.has('alerts') ? (
                  <ChevronUpIcon className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {expandedSections.has('alerts') && (
                <div className="px-4 pb-4">
                  <div className="space-y-3">
                    {alerts.filter(alert => !alert.isRead).map(alert => (
                      <div
                        key={alert.id}
                        className={`p-4 rounded-lg border-l-4 ${
                          alert.type === 'error' ? 'border-red-500 bg-red-50' :
                          alert.type === 'warning' ? 'border-yellow-500 bg-yellow-50' :
                          alert.type === 'success' ? 'border-green-500 bg-green-50' :
                          'border-blue-500 bg-blue-50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{alert.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                            <p className="text-xs text-gray-500 mt-2">
                              {alert.timestamp.toLocaleString()}
                            </p>
                          </div>

                          {alert.actions && (
                            <div className="flex items-center space-x-2 ml-4">
                              {alert.actions.map((action, index) => (
                                <button
                                  key={index}
                                  onClick={action.action}
                                  className={`px-3 py-1 text-xs font-medium rounded ${
                                    action.style === 'primary' ? 'bg-blue-600 text-white hover:bg-blue-700' :
                                    action.style === 'danger' ? 'bg-red-600 text-white hover:bg-red-700' :
                                    'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                  }`}
                                >
                                  {action.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Overview Metrics */}
        <div className="mb-6">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <button
              onClick={() => toggleSection('overview')}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <h2 className="text-lg font-medium text-gray-900">Key Metrics Overview</h2>
              {expandedSections.has('overview') ? (
                <ChevronUpIcon className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDownIcon className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {expandedSections.has('overview') && (
              <div className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredMetrics.map(metric => (
                    <div
                      key={metric.id}
                      className={`p-6 rounded-lg border-2 ${getMetricStatusColor(metric.status)}`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          {getMetricStatusIcon(metric.status)}
                          <h3 className="text-sm font-medium text-gray-700">{metric.label}</h3>
                        </div>
                        <Sparkline data={metric.trend} color={metric.status === 'good' ? '#10b981' : metric.status === 'danger' ? '#ef4444' : '#f59e0b'} />
                      </div>

                      <div className="mb-4">
                        <div className="flex items-baseline space-x-2">
                          <span className="text-3xl font-bold text-gray-900">
                            {typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
                          </span>
                          {metric.unit && (
                            <span className="text-sm text-gray-500">{metric.unit}</span>
                          )}
                        </div>

                        {showComparisons && metric.previousValue && (
                          <div className="text-xs text-gray-500 mt-1">
                            vs {metric.previousValue.toLocaleString()} {metric.period}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className={`flex items-center space-x-1 ${
                          metric.changeType === 'increase' ? 'text-green-600' :
                          metric.changeType === 'decrease' ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {metric.changeType === 'increase' ? (
                            <TrendingUpIcon className="w-4 h-4" />
                          ) : metric.changeType === 'decrease' ? (
                            <TrendingDownIcon className="w-4 h-4" />
                          ) : (
                            <MinusIcon className="w-4 h-4" />
                          )}
                          <span className="text-sm font-medium">{Math.abs(metric.change)}%</span>
                        </div>

                        {metric.target && (
                          <div className="text-xs text-gray-500">
                            Target: {metric.target.toLocaleString()}
                            {metric.unit && ` ${metric.unit}`}
                          </div>
                        )}
                      </div>

                      {metric.target && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                            <span>Progress to target</span>
                            <span>{Math.round((metric.value / metric.target) * 100)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                metric.value >= metric.target ? 'bg-green-500' :
                                metric.value >= metric.target * 0.8 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min((metric.value / metric.target) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {metric.description && (
                        <p className="text-xs text-gray-600 mt-3">{metric.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Trends Section */}
        <div className="mb-6">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <button
              onClick={() => toggleSection('trends')}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <h2 className="text-lg font-medium text-gray-900">Trends & Analytics</h2>
              {expandedSections.has('trends') ? (
                <ChevronUpIcon className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDownIcon className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {expandedSections.has('trends') && (
              <div className="p-4">
                <div className="mb-4 flex items-center space-x-4">
                  <select
                    value={selectedChart}
                    onChange={(e) => setSelectedChart(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                  >
                    {TIME_SERIES_DATA.map(series => (
                      <option key={series.id} value={series.id}>{series.name}</option>
                    ))}
                  </select>

                  <div className="flex items-center space-x-2">
                    {TIME_SERIES_DATA.map(series => (
                      <button
                        key={series.id}
                        onClick={() => setSelectedChart(series.id)}
                        className={`px-3 py-1 text-xs font-medium rounded-full border ${
                          selectedChart === series.id
                            ? 'bg-blue-100 text-blue-700 border-blue-300'
                            : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-200'
                        }`}
                      >
                        {series.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-80">
                  <EnhancedChart
                    data={TIME_SERIES_DATA.find(s => s.id === selectedChart)?.data || []}
                    height={300}
                    type={TIME_SERIES_DATA.find(s => s.id === selectedChart)?.type || 'line'}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Geographic & Device Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Geographic Distribution */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <button
              onClick={() => toggleSection('geographic')}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <h2 className="text-lg font-medium text-gray-900">Geographic Distribution</h2>
              {expandedSections.has('geographic') ? (
                <ChevronUpIcon className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDownIcon className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {expandedSections.has('geographic') && (
              <div className="p-4">
                <div className="space-y-3">
                  {GEOGRAPHIC_DATA.map(country => (
                    <div key={country.countryCode} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <MapPinIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">{country.country}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${country.percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 w-16 text-right">
                          {country.value.toLocaleString()}
                        </span>
                        <span className="text-xs text-gray-500 w-12 text-right">
                          {country.percentage}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Device Analytics */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <button
              onClick={() => toggleSection('devices')}
              className="w-full flex items-center justify-between p-4 text-left"
            >
              <h2 className="text-lg font-medium text-gray-900">Device Analytics</h2>
              {expandedSections.has('devices') ? (
                <ChevronUpIcon className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDownIcon className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {expandedSections.has('devices') && (
              <div className="p-4">
                <div className="space-y-4">
                  {DEVICE_DATA.map(device => {
                    const IconComponent = device.icon;
                    return (
                      <div key={device.device} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 rounded-lg" style={{ backgroundColor: `${device.color}20` }}>
                            <IconComponent className="w-5 h-5" style={{ color: device.color }} />
                          </div>
                          <span className="text-sm font-medium text-gray-900">{device.device}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="w-32 bg-gray-200 rounded-full h-3">
                            <div
                              className="h-3 rounded-full"
                              style={{
                                backgroundColor: device.color,
                                width: `${device.percentage}%`
                              }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 w-16 text-right">
                            {device.value.toLocaleString()}
                          </span>
                          <span className="text-xs text-gray-500 w-12 text-right">
                            {device.percentage}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Device Insights</h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    <li>• Mobile usage has increased 15% this month</li>
                    <li>• Desktop users have higher conversion rates (18% vs 12%)</li>
                    <li>• Tablet usage peaks during weekend hours</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}