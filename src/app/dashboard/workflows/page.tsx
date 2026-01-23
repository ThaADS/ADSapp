/**
 * Workflows List Page
 *
 * Shows all workflows with filtering, search, and management actions.
 */

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, Filter, Play, Pause, Trash2, Copy, BarChart3 } from 'lucide-react';

export default async function WorkflowsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; search?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/signin');
  }

  // Get user's organization
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect('/auth/signin');
  }

  // Build query
  let query = supabase
    .from('workflows')
    .select('*', { count: 'exact' })
    .eq('organization_id', profile.organization_id)
    .order('updated_at', { ascending: false });

  // Apply filters
  if (resolvedSearchParams.status) {
    query = query.eq('status', resolvedSearchParams.status);
  }

  if (resolvedSearchParams.type) {
    query = query.eq('type', resolvedSearchParams.type);
  }

  if (resolvedSearchParams.search) {
    query = query.ilike('name', `%${resolvedSearchParams.search}%`);
  }

  const { data: workflows, count } = await query;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
          <p className="text-sm text-gray-600 mt-1">
            Create and manage automated workflows for your WhatsApp campaigns
          </p>
        </div>
        <Link
          href="/dashboard/workflows/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Workflow
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search workflows..."
                defaultValue={resolvedSearchParams.search}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Status filter */}
          <select
            defaultValue={resolvedSearchParams.status || 'all'}
            aria-label="Filter by status"
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="archived">Archived</option>
          </select>

          {/* Type filter */}
          <select
            defaultValue={resolvedSearchParams.type || 'all'}
            aria-label="Filter by type"
            className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="automation">Automation</option>
            <option value="drip_campaign">Drip Campaign</option>
            <option value="broadcast">Broadcast</option>
            <option value="custom">Custom</option>
          </select>
        </div>
      </div>

      {/* Workflows grid */}
      {workflows && workflows.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workflows.map((workflow: any) => (
            <WorkflowCard key={workflow.id} workflow={workflow} />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
          <div className="text-gray-400 mb-4">
            <BarChart3 className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No workflows yet
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            Get started by creating your first automated workflow
          </p>
          <Link
            href="/dashboard/workflows/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Workflow
          </Link>
        </div>
      )}
    </div>
  );
}

function WorkflowCard({ workflow }: { workflow: any }) {
  const statusColors: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-700',
    active: 'bg-green-100 text-green-700',
    paused: 'bg-yellow-100 text-yellow-700',
    archived: 'bg-gray-100 text-gray-500',
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">
            {workflow.name}
          </h3>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              statusColors[workflow.status] || statusColors.draft
            }`}
          >
            {workflow.status}
          </span>
        </div>
        {workflow.description && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {workflow.description}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xs text-gray-500 mb-1">Nodes</div>
            <div className="text-lg font-semibold text-gray-900">
              {workflow.nodes?.length || 0}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Executions</div>
            <div className="text-lg font-semibold text-gray-900">
              {workflow.stats?.totalExecutions || 0}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Success</div>
            <div className="text-lg font-semibold text-green-600">
              {workflow.stats?.completedExecutions || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 flex items-center justify-between gap-2">
        <Link
          href={`/dashboard/workflows/${workflow.id}`}
          className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg text-center transition-colors"
        >
          Edit
        </Link>
        <button
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="Duplicate"
        >
          <Copy className="w-4 h-4" />
        </button>
        <button
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          title="View Analytics"
        >
          <BarChart3 className="w-4 h-4" />
        </button>
        <button
          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
