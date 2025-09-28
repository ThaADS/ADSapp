/**
 * Simplified Admin Dashboard API
 * Provides basic platform metrics for the super admin dashboard
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

// Helper function to check if user is super admin
async function isSuperAdmin(supabase: SupabaseClient, userId: string): Promise<boolean> {
  try {
    // Check if user has super admin role in profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_super_admin')
      .eq('id', userId)
      .single();

    if (!profile) return false;

    // Check for super admin role or is_super_admin flag
    return profile.role === 'owner' || profile.is_super_admin === true;
  } catch (error) {
    console.error('Error checking super admin status:', error);
    return false;
  }
}

export async function GET() {
  try {
    const supabase = await createClient();

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super admin
    const isAdmin = await isSuperAdmin(supabase, user.id);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Super admin access required' }, { status: 403 });
    }

    // Get basic platform metrics
    const [
      totalOrgs,
      activeOrgs,
      totalUsers,
      activeUsers,
      totalMessages,
      totalConversations
    ] = await Promise.all([
      supabase.from('organizations').select('id', { count: 'exact' }),
      supabase.from('organizations').select('id', { count: 'exact' }).eq('is_active', true),
      supabase.from('profiles').select('id', { count: 'exact' }),
      supabase.from('profiles').select('id', { count: 'exact' }).eq('is_active', true),
      supabase.from('messages').select('id', { count: 'exact' }),
      supabase.from('conversations').select('id', { count: 'exact' })
    ]);

    // Get subscription distribution
    const { data: orgsData } = await supabase
      .from('organizations')
      .select('subscription_tier');

    const subscriptionDistribution = (orgsData || []).reduce((acc, org) => {
      const tier = org.subscription_tier || 'starter';
      acc[tier] = (acc[tier] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Calculate estimated revenue based on subscription tiers
    const tierPricing = {
      starter: 29,
      professional: 99,
      enterprise: 299
    };

    const estimatedRevenue = Object.entries(subscriptionDistribution)
      .reduce((total, [tier, count]) => {
        const price = tierPricing[tier as keyof typeof tierPricing] || 29;
        return total + (price * count);
      }, 0);

    const dashboardData = {
      data: {
        total_organizations: totalOrgs.count || 0,
        active_organizations: activeOrgs.count || 0,
        total_users: totalUsers.count || 0,
        active_users: activeUsers.count || 0,
        total_messages: totalMessages.count || 0,
        total_conversations: totalConversations.count || 0,
        revenue_cents: estimatedRevenue * 100,
        currency: 'USD'
      },
      systemHealth: 'healthy',
      subscriptionDistribution,
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json(dashboardData);

  } catch (error) {
    console.error('Admin dashboard API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}