'use client';

import { useEffect, useState } from 'react';
import {
  BuildingOfficeIcon,
  EyeIcon,
  PauseIcon,
  PlayIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

interface Organization {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'cancelled' | 'pending_setup';
  subscription_status: 'trial' | 'active' | 'cancelled' | 'past_due';
  created_at: string;
  user_count?: number;
  message_count?: number;
}

export function OrganizationsManager() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const response = await fetch('/api/admin/organizations');
      if (!response.ok) {
        throw new Error('Failed to fetch organizations');
      }
      const data = await response.json();
      setOrganizations(data.organizations || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async (orgId: string) => {
    try {
      const response = await fetch(`/api/admin/organizations/${orgId}/suspend`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to suspend organization');
      }
      fetchOrganizations(); // Refresh list
    } catch (err) {
      alert('Failed to suspend organization');
    }
  };

  const handleActivate = async (orgId: string) => {
    try {
      const response = await fetch(`/api/admin/organizations/${orgId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'active' }),
      });
      if (!response.ok) {
        throw new Error('Failed to activate organization');
      }
      fetchOrganizations(); // Refresh list
    } catch (err) {
      alert('Failed to activate organization');
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      suspended: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
      pending_setup: 'bg-yellow-100 text-yellow-800',
    };

    // Handle null/undefined status
    const statusText = status ? status.replace('_', ' ') : 'unknown';

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {statusText}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          <p className="mt-4 text-sm text-slate-600">Loading organizations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 p-6 ring-1 ring-red-600/10">
        <div className="text-sm text-red-700">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Organizations</h2>
        <p className="mt-2 text-sm text-slate-600">
          Manage all tenant organizations on the platform
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-900/5 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <div className="sm:flex sm:items-center">
            <div className="sm:flex-auto">
              <h3 className="text-lg font-semibold text-slate-900">All Organizations</h3>
              <p className="mt-1 text-sm text-slate-600">
                A list of all organizations including their status and key metrics
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="py-3.5 pl-6 pr-3 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Organization
                </th>
                <th className="px-3 py-3.5 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-3 py-3.5 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Subscription
                </th>
                <th className="px-3 py-3.5 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Users
                </th>
                <th className="px-3 py-3.5 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Messages
                </th>
                <th className="px-3 py-3.5 text-left text-xs font-semibold text-slate-900 uppercase tracking-wider">
                  Created
                </th>
                <th className="relative py-3.5 pl-3 pr-6">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {organizations.map((org) => (
                <tr key={org.id} className="hover:bg-slate-50 transition-colors">
                  <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 flex-shrink-0">
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-sm">
                          <BuildingOfficeIcon className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{org.name}</div>
                        <div className="text-xs text-slate-500">{org.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm">
                    {getStatusBadge(org.status)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm">
                    {getStatusBadge(org.subscription_status)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-900 font-medium">
                    {org.user_count || 0}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-900 font-medium">
                    {org.message_count || 0}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                    {new Date(org.created_at).toLocaleDateString()}
                  </td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-6 text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        title="View organization details"
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      {org.status === 'active' ? (
                        <button
                          type="button"
                          title="Suspend organization"
                          onClick={() => handleSuspend(org.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <PauseIcon className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          title="Activate organization"
                          onClick={() => handleActivate(org.id)}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <PlayIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {organizations.length === 0 && (
            <div className="text-center py-12">
              <BuildingOfficeIcon className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-2 text-sm font-medium text-slate-900">No organizations</h3>
              <p className="mt-1 text-sm text-slate-500">
                No organizations have been created yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
