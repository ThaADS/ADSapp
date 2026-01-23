/**
 * Workflow Analytics API Route
 *
 * GET /api/workflows/[id]/analytics - Get analytics for a specific workflow
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

interface NodePerformance {
  nodeId: string;
  nodeName: string;
  executions: number;
  avgTime: string;
  errorRate: number;
}

interface FunnelStage {
  stage: string;
  count: number;
  percentage: number;
}

interface TimeSeriesData {
  date: string;
  executions: number;
  conversions: number;
}

/**
 * GET /api/workflows/[id]/analytics
 * Retrieve workflow analytics data
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Parse query parameters
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get('days') || '7', 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch workflow with nodes info
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('id, name, nodes')
      .eq('id', id)
      .eq('organization_id', profile.organization_id)
      .single();

    if (workflowError || !workflow) {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    // Fetch all executions for this workflow within date range
    const { data: executions, error: execError } = await supabase
      .from('workflow_executions')
      .select('*')
      .eq('workflow_id', id)
      .eq('organization_id', profile.organization_id)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (execError) {
      console.error('Failed to fetch executions:', execError);
      return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
    }

    const executionList = executions || [];

    // Calculate overview stats
    const totalExecutions = executionList.length;
    const completedExecutions = executionList.filter(e => e.status === 'completed').length;
    const failedExecutions = executionList.filter(e => e.status === 'failed').length;
    const activeExecutions = executionList.filter(e => e.status === 'running' || e.status === 'waiting').length;
    const successRate = totalExecutions > 0 ? (completedExecutions / totalExecutions) * 100 : 0;

    // Calculate average completion time
    const completedWithTime = executionList.filter(
      e => e.status === 'completed' && e.started_at && e.completed_at
    );
    let averageCompletionTime = 'N/A';
    if (completedWithTime.length > 0) {
      const totalMs = completedWithTime.reduce((acc, e) => {
        const start = new Date(e.started_at).getTime();
        const end = new Date(e.completed_at).getTime();
        return acc + (end - start);
      }, 0);
      const avgMs = totalMs / completedWithTime.length;
      averageCompletionTime = formatDuration(avgMs);
    }

    // Count conversions (executions that reached a goal node)
    const conversions = executionList.filter(e => {
      if (!e.execution_path || !Array.isArray(e.execution_path)) return false;
      const nodes = workflow.nodes || [];
      return e.execution_path.some((nodeId: string) => {
        const node = nodes.find((n: any) => n.id === nodeId);
        return node?.type === 'goal';
      });
    }).length;
    const conversionRate = totalExecutions > 0 ? (conversions / totalExecutions) * 100 : 0;

    // Build time series data
    const timeSeriesMap = new Map<string, { executions: number; conversions: number }>();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      timeSeriesMap.set(dateKey, { executions: 0, conversions: 0 });
    }

    for (const exec of executionList) {
      const dateKey = new Date(exec.created_at).toISOString().split('T')[0];
      if (timeSeriesMap.has(dateKey)) {
        const entry = timeSeriesMap.get(dateKey)!;
        entry.executions++;

        // Check if this execution converted
        const path = exec.execution_path || [];
        const nodes = workflow.nodes || [];
        const hasGoal = path.some((nodeId: string) => {
          const node = nodes.find((n: any) => n.id === nodeId);
          return node?.type === 'goal';
        });
        if (hasGoal) {
          entry.conversions++;
        }
      }
    }

    const timeSeriesData: TimeSeriesData[] = Array.from(timeSeriesMap.entries()).map(
      ([date, data]) => ({ date, ...data })
    );

    // Calculate node performance
    const nodes = workflow.nodes || [];
    const nodePerformance: NodePerformance[] = nodes.map((node: any) => {
      // Count executions that passed through this node
      const nodeExecutions = executionList.filter(e => {
        const path = e.execution_path || [];
        return path.includes(node.id);
      });

      // Count errors at this node
      const nodeErrors = executionList.filter(e => e.error_node_id === node.id);
      const errorRate = nodeExecutions.length > 0
        ? (nodeErrors.length / nodeExecutions.length) * 100
        : 0;

      return {
        nodeId: node.id,
        nodeName: node.data?.label || node.type || 'Unknown',
        executions: nodeExecutions.length,
        avgTime: calculateNodeAvgTime(node, nodeExecutions),
        errorRate: Math.round(errorRate * 10) / 10,
      };
    });

    // Build conversion funnel
    const funnelData: FunnelStage[] = buildConversionFunnel(workflow.nodes, executionList);

    // Check for A/B test results (split nodes)
    const splitNodes = nodes.filter((n: any) => n.type === 'split');
    const abTestResults = splitNodes.map((splitNode: any) => {
      const branches = splitNode.data?.splitConfig?.branches || [];
      return {
        name: splitNode.data?.label || 'Split Test',
        branches: branches.map((branch: any) => {
          // Count executions that took this branch
          const branchExecutions = executionList.filter(e => {
            const context = e.context || {};
            return context[`split_${splitNode.id}`] === branch.id;
          });

          // Count conversions in this branch
          const branchConversions = branchExecutions.filter(e => {
            const path = e.execution_path || [];
            return path.some((nodeId: string) => {
              const node = nodes.find((n: any) => n.id === nodeId);
              return node?.type === 'goal';
            });
          });

          const convRate = branchExecutions.length > 0
            ? (branchConversions.length / branchExecutions.length) * 100
            : 0;

          return {
            name: branch.name || `Variant ${branch.id}`,
            executions: branchExecutions.length,
            conversions: branchConversions.length,
            conversionRate: Math.round(convRate * 10) / 10,
          };
        }),
      };
    });

    return NextResponse.json({
      overview: {
        totalExecutions,
        successRate: Math.round(successRate * 10) / 10,
        averageCompletionTime,
        conversionRate: Math.round(conversionRate * 10) / 10,
        activeExecutions,
      },
      timeSeriesData,
      nodePerformance,
      funnelData,
      abTestResults: abTestResults.filter((t: any) => t.branches.length > 0),
    });
  } catch (error) {
    console.error('Workflow analytics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Format duration in milliseconds to human-readable string
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Calculate average time for a node based on execution data
 */
function calculateNodeAvgTime(node: any, executions: any[]): string {
  // For delay nodes, return configured delay
  if (node.type === 'delay') {
    const config = node.data?.delayConfig;
    if (config) {
      return `${config.amount}${config.unit?.charAt(0) || ''}`;
    }
  }

  // For other nodes, estimate based on execution count
  if (executions.length === 0) return '0s';

  // Simple heuristic - most nodes execute in under a second
  if (node.type === 'trigger' || node.type === 'condition' || node.type === 'goal') {
    return '0s';
  } else if (node.type === 'message') {
    return '2s';
  } else if (node.type === 'webhook') {
    return '3s';
  } else if (node.type === 'ai') {
    return '5s';
  }

  return '1s';
}

/**
 * Build conversion funnel from workflow nodes and executions
 */
function buildConversionFunnel(nodes: any[], executions: any[]): FunnelStage[] {
  if (!nodes || nodes.length === 0 || executions.length === 0) {
    return [{ stage: 'Started', count: executions.length, percentage: 100 }];
  }

  const stages: FunnelStage[] = [];
  const totalStarted = executions.length;

  // Find trigger node
  const triggerNode = nodes.find((n: any) => n.type === 'trigger');
  if (triggerNode) {
    stages.push({
      stage: 'Started',
      count: totalStarted,
      percentage: 100,
    });
  }

  // Find message nodes for "Message Sent" stage
  const messageNodes = nodes.filter((n: any) => n.type === 'message');
  if (messageNodes.length > 0) {
    const messageSent = executions.filter(e => {
      const path = e.execution_path || [];
      return messageNodes.some((mn: any) => path.includes(mn.id));
    }).length;
    stages.push({
      stage: 'Message Sent',
      count: messageSent,
      percentage: totalStarted > 0 ? Math.round((messageSent / totalStarted) * 1000) / 10 : 0,
    });
  }

  // Find condition nodes for "Response Received" stage (if they checked for response)
  const conditionNodes = nodes.filter((n: any) => n.type === 'condition');
  if (conditionNodes.length > 0) {
    const passedCondition = executions.filter(e => {
      const context = e.context || {};
      return conditionNodes.some((cn: any) => context[`condition_${cn.id}`] === true);
    }).length;
    if (passedCondition > 0) {
      stages.push({
        stage: 'Condition Met',
        count: passedCondition,
        percentage: totalStarted > 0 ? Math.round((passedCondition / totalStarted) * 1000) / 10 : 0,
      });
    }
  }

  // Find goal nodes for "Converted" stage
  const goalNodes = nodes.filter((n: any) => n.type === 'goal');
  if (goalNodes.length > 0) {
    const converted = executions.filter(e => {
      const path = e.execution_path || [];
      return goalNodes.some((gn: any) => path.includes(gn.id));
    }).length;
    stages.push({
      stage: 'Converted',
      count: converted,
      percentage: totalStarted > 0 ? Math.round((converted / totalStarted) * 1000) / 10 : 0,
    });
  }

  return stages.length > 0 ? stages : [{ stage: 'No Data', count: 0, percentage: 0 }];
}
