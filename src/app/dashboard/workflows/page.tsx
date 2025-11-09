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
  searchParams: { status?: string; type?: string; search?: string };
}) {
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
  if (searchParams.status) {
    query = query.eq('status', searchParams.status);
  }

  if (searchParams.type) {
    query = query.eq('type', searchParams.type);
  }

  if (searchParams.search) {
    query = query.ilike('name', `%${searchParams.search}%`);
  }

  const { data: workflows, count } = await query;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Workflows
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Create and manage automated workflows for your WhatsApp campaigns
              </p>
            </div>
            <Link
              href="/dashboard/workflows/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Workflow
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search workflows..."
                  defaultValue={searchParams.search}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Status filter */}
            <select
              defaultValue={searchParams.status || 'all'}
              className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="archived">Archived</option>
            </select>

            {/* Type filter */}
            <select
              defaultValue={searchParams.type || 'all'}
              className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-12 text-center">
            <div className="text-slate-400 dark:text-slate-600 mb-4">
              <BarChart3 className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
              No workflows yet
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Get started by creating your first automated workflow
            </p>
            <Link
              href="/dashboard/workflows/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Workflow
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function WorkflowCard({ workflow }: { workflow: any }) {
  const statusColors: Record<string, string> = {
    draft: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
    active: 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300',
    paused: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300',
    archived: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
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
          <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
            {workflow.description}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Nodes</div>
            <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {workflow.nodes?.length || 0}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Executions</div>
            <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {workflow.stats?.totalExecutions || 0}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Success</div>
            <div className="text-lg font-semibold text-green-600 dark:text-green-400">
              {workflow.stats?.completedExecutions || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 flex items-center justify-between gap-2">
        <Link
          href={`/dashboard/workflows/${workflow.id}`}
          className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg text-center transition-colors"
        >
          Edit
        </Link>
        <button
          className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          title="Duplicate"
        >
          <Copy className="w-4 h-4" />
        </button>
        <button
          className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          title="View Analytics"
        >
          <BarChart3 className="w-4 h-4" />
        </button>
        <button
          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
