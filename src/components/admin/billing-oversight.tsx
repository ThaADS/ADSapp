'use client';

import { useEffect, useState } from 'react';
import {
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  XCircleIcon,
  CreditCardIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';

interface BillingMetrics {
  totalRevenue: number;
  monthlyRecurringRevenue: number;
  averageRevenuePerOrg: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  pastDueSubscriptions: number;
  cancelledSubscriptions: number;
}

interface Subscription {
  id: string;
  organization_id: string;
  organization_name: string;
  plan: string;
  status: 'active' | 'trial' | 'past_due' | 'cancelled';
  amount: number;
  currency: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  iconColor: string;
  iconBgColor: string;
  trend?: number;
}

function MetricCard({ title, value, subtitle, icon: Icon, iconColor, iconBgColor, trend }: MetricCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-900/5 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <div className={`rounded-xl ${iconBgColor} p-3`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            {trend !== undefined && (
              <span className={`text-xs font-semibold ${trend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {trend >= 0 ? '+' : ''}{trend}%
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

export function BillingOversight() {
  const [metrics, setMetrics] = useState<BillingMetrics | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      const [metricsRes, subscriptionsRes] = await Promise.all([
        fetch('/api/admin/billing/metrics'),
        fetch('/api/admin/billing/subscriptions'),
      ]);

      if (!metricsRes.ok || !subscriptionsRes.ok) {
        throw new Error('Failed to fetch billing data');
      }

      const metricsData = await metricsRes.json();
      const subscriptionsData = await subscriptionsRes.json();

      setMetrics(metricsData.data);
      setSubscriptions(subscriptionsData.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, cancelAtPeriodEnd: boolean) => {
    if (cancelAtPeriodEnd) {
      return (
        <span className="inline-flex items-center gap-x-1.5 rounded-full px-3 py-1 text-xs font-medium bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20">
          <ClockIcon className="h-3.5 w-3.5" />
          Cancelling
        </span>
      );
    }

    const badges = {
      active: {
        icon: CheckCircleIcon,
        class: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
        text: 'Active',
      },
      trial: {
        icon: ClockIcon,
        class: 'bg-blue-50 text-blue-700 ring-blue-600/20',
        text: 'Trial',
      },
      past_due: {
        icon: ExclamationTriangleIcon,
        class: 'bg-red-50 text-red-700 ring-red-600/20',
        text: 'Past Due',
      },
      cancelled: {
        icon: XCircleIcon,
        class: 'bg-slate-50 text-slate-700 ring-slate-600/20',
        text: 'Cancelled',
      },
    };

    const badge = badges[status as keyof typeof badges] || badges.cancelled;
    const BadgeIcon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-x-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${badge.class}`}>
        <BadgeIcon className="h-3.5 w-3.5" />
        {badge.text}
      </span>
    );
  };

  const filteredSubscriptions = filterStatus === 'all'
    ? subscriptions
    : subscriptions.filter(sub => sub.status === filterStatus);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          <p className="mt-4 text-sm text-slate-600">Loading billing data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 p-6 ring-1 ring-red-600/10">
        <div className="flex">
          <div className="flex-shrink-0">
            <XCircleIcon className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading billing data</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Billing Oversight</h2>
        <p className="mt-2 text-sm text-slate-600">
          Monitor subscriptions, revenue, and billing metrics across all organizations
        </p>
      </div>

      {/* Metrics Grid */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <MetricCard
            title="Total Revenue"
            value={`$${(metrics.totalRevenue / 100).toLocaleString()}`}
            subtitle="All time"
            icon={CurrencyDollarIcon}
            iconColor="text-emerald-600"
            iconBgColor="bg-emerald-50"
            trend={12}
          />
          <MetricCard
            title="Monthly Recurring Revenue"
            value={`$${(metrics.monthlyRecurringRevenue / 100).toLocaleString()}`}
            subtitle="MRR"
            icon={ArrowTrendingUpIcon}
            iconColor="text-blue-600"
            iconBgColor="bg-blue-50"
            trend={8}
          />
          <MetricCard
            title="Average Revenue Per Org"
            value={`$${(metrics.averageRevenuePerOrg / 100).toLocaleString()}`}
            subtitle="ARPO"
            icon={BuildingOfficeIcon}
            iconColor="text-purple-600"
            iconBgColor="bg-purple-50"
          />
          <MetricCard
            title="Active Subscriptions"
            value={metrics.activeSubscriptions.toLocaleString()}
            subtitle={`${metrics.trialSubscriptions} trials, ${metrics.pastDueSubscriptions} past due`}
            icon={CreditCardIcon}
            iconColor="text-orange-600"
            iconBgColor="bg-orange-50"
          />
        </div>
      )}

      {/* Subscriptions Overview */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-4 ring-1 ring-emerald-600/20">
            <div className="flex items-center gap-3">
              <CheckCircleIcon className="h-8 w-8 text-emerald-600" />
              <div>
                <p className="text-2xl font-bold text-emerald-900">{metrics.activeSubscriptions}</p>
                <p className="text-xs font-medium text-emerald-700">Active</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 ring-1 ring-blue-600/20">
            <div className="flex items-center gap-3">
              <ClockIcon className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-900">{metrics.trialSubscriptions}</p>
                <p className="text-xs font-medium text-blue-700">Trial</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4 ring-1 ring-red-600/20">
            <div className="flex items-center gap-3">
              <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-red-900">{metrics.pastDueSubscriptions}</p>
                <p className="text-xs font-medium text-red-700">Past Due</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 ring-1 ring-slate-600/20">
            <div className="flex items-center gap-3">
              <XCircleIcon className="h-8 w-8 text-slate-600" />
              <div>
                <p className="text-2xl font-bold text-slate-900">{metrics.cancelledSubscriptions}</p>
                <p className="text-xs font-medium text-slate-700">Cancelled</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subscriptions Table */}
      <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-900/5 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">All Subscriptions</h3>
              <p className="text-sm text-slate-600 mt-1">Detailed view of all organization subscriptions</p>
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg border-slate-300 text-sm focus:ring-emerald-600 focus:border-emerald-600"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="past_due">Past Due</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Organization
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Current Period
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredSubscriptions.map((sub) => (
                <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                        <BuildingOfficeIcon className="h-4 w-4 text-white" />
                      </div>
                      <span className="font-medium text-slate-900">{sub.organization_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-slate-900 capitalize">{sub.plan}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(sub.status, sub.cancel_at_period_end)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-semibold text-slate-900">
                      {sub.currency.toUpperCase()} ${(sub.amount / 100).toFixed(2)}
                    </span>
                    <span className="text-xs text-slate-500 ml-1">/mo</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {new Date(sub.current_period_start).toLocaleDateString()} -{' '}
                    {new Date(sub.current_period_end).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredSubscriptions.length === 0 && (
            <div className="text-center py-12">
              <CreditCardIcon className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-2 text-sm font-medium text-slate-900">No subscriptions found</h3>
              <p className="mt-1 text-sm text-slate-500">
                {filterStatus !== 'all' ? 'Try adjusting your filter.' : 'No subscriptions have been created yet.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}