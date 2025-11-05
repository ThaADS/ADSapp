/**
 * AI Usage Analytics API
 * Get AI usage statistics and cost tracking
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return Response.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || '30'; // days
    const feature = searchParams.get('feature'); // optional filter

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Build query
    let query = supabase
      .from('ai_responses')
      .select('*')
      .eq('organization_id', profile.organization_id)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // Apply feature filter if specified
    if (feature) {
      const validFeatures = ['draft', 'auto_response', 'sentiment', 'summary', 'template'];
      if (!validFeatures.includes(feature)) {
        return Response.json({
          error: `Invalid feature. Must be one of: ${validFeatures.join(', ')}`,
        }, { status: 400 });
      }
      query = query.eq('feature', feature as 'draft' | 'auto_response' | 'sentiment' | 'summary' | 'template' | 'translation');
    }

    const { data: responses, error: responsesError } = await query;

    if (responsesError) {
      throw responsesError;
    }

    // Calculate summary statistics
    const totalRequests = responses.length;
    const totalTokens = responses.reduce((sum, r) => sum + (r.total_tokens || 0), 0);
    const totalCost = responses.reduce((sum, r) => sum + (r.cost_usd || 0), 0);
    const avgLatency = totalRequests > 0
      ? responses.reduce((sum, r) => sum + (r.latency_ms || 0), 0) / totalRequests
      : 0;

    // Calculate acceptance rate
    const responsesWithFeedback = responses.filter(r => r.user_feedback);
    const acceptedResponses = responses.filter(r => r.user_feedback === 'accepted');
    const acceptanceRate = responsesWithFeedback.length > 0
      ? (acceptedResponses.length / responsesWithFeedback.length) * 100
      : null;

    // Group by feature
    const byFeature: Record<string, { count: number; cost: number; tokens: number }> = {};
    responses.forEach(r => {
      if (!byFeature[r.feature]) {
        byFeature[r.feature] = { count: 0, cost: 0, tokens: 0 };
      }
      byFeature[r.feature].count++;
      byFeature[r.feature].cost += r.cost_usd || 0;
      byFeature[r.feature].tokens += r.total_tokens || 0;
    });

    // Group by date for trend analysis
    const byDate: Record<string, { count: number; cost: number }> = {};
    responses.forEach(r => {
      const date = new Date(r.created_at).toISOString().split('T')[0];
      if (!byDate[date]) {
        byDate[date] = { count: 0, cost: 0 };
      }
      byDate[date].count++;
      byDate[date].cost += r.cost_usd || 0;
    });

    // Get AI settings for budget comparison
    const { data: settings } = await supabase
      .from('ai_settings')
      .select('monthly_budget_usd, alert_threshold')
      .eq('organization_id', profile.organization_id)
      .single();

    // Calculate budget status
    let budgetStatus = null;
    if (settings?.monthly_budget_usd) {
      const currentSpend = totalCost; // Calculate from actual responses
      const budget = settings.monthly_budget_usd;
      const percentUsed = (currentSpend / budget) * 100;
      const alertThreshold = settings.alert_threshold || 80;

      budgetStatus = {
        budget,
        currentSpend,
        percentUsed,
        remaining: budget - currentSpend,
        isOverBudget: currentSpend > budget,
        isNearLimit: percentUsed >= alertThreshold,
        alertThreshold,
      };
    }

    // Get most used models
    const modelUsage: Record<string, number> = {};
    responses.forEach(r => {
      modelUsage[r.model_used] = (modelUsage[r.model_used] || 0) + 1;
    });

    return Response.json({
      success: true,
      period: {
        days: parseInt(period),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      summary: {
        totalRequests,
        totalTokens,
        totalCostUsd: parseFloat(totalCost.toFixed(6)),
        avgLatencyMs: Math.round(avgLatency),
        acceptanceRate: acceptanceRate !== null ? parseFloat(acceptanceRate.toFixed(2)) : null,
      },
      byFeature,
      byDate,
      modelUsage,
      budgetStatus,
      topConversations: responses
        .filter(r => r.conversation_id !== null)
        .reduce((acc: Record<string, number>, r) => {
          acc[r.conversation_id!] = (acc[r.conversation_id!] || 0) + 1;
          return acc;
        }, {}),
    });

  } catch (error) {
    console.error('Get AI usage error:', error);
    return Response.json(
      {
        error: 'Failed to get AI usage statistics',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}
