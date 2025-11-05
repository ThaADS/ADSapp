// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches


import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'
import { BusinessScenario } from '@/types/demo'
import { Database, Json } from '@/types/database'

type SupabaseClient = ReturnType<typeof createClient<Database>>

// Conversion Optimization Types
export interface ConversionFunnel {
  id: string
  name: string
  business_scenario: BusinessScenario
  steps: ConversionStep[]
  overall_conversion_rate: number
  total_sessions: number
  bottlenecks: Bottleneck[]
  optimization_opportunities: OptimizationOpportunity[]
  created_at: string
  updated_at: string
}

export interface ConversionStep {
  id: string
  name: string
  step_order: number
  page_path: string
  required_action: string
  entry_count: number
  exit_count: number
  conversion_rate: number
  avg_time_spent: number
  bounce_rate: number
}

export interface Bottleneck {
  step_id: string
  step_name: string
  drop_off_rate: number
  potential_improvement: number
  suggested_actions: string[]
}

export interface OptimizationOpportunity {
  id: string
  type: 'ui_improvement' | 'content_optimization' | 'flow_simplification' | 'personalization'
  priority: 'low' | 'medium' | 'high' | 'critical'
  description: string
  estimated_impact: number
  implementation_effort: 'low' | 'medium' | 'high'
  suggested_changes: string[]
}

// Conversion Optimization Service
export class ConversionOptimizationService {
  private supabase: SupabaseClient

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase
  }

  // Create a new conversion funnel
  async createFunnel(
    name: string,
    businessScenario: BusinessScenario,
    steps: Omit<ConversionStep, 'id'>[]
  ): Promise<ConversionFunnel> {
    const funnelId = uuidv4()
    
    const funnel: ConversionFunnel = {
      id: funnelId,
      name,
      business_scenario: businessScenario,
      steps: steps.map((step, index) => ({
        ...step,
        id: uuidv4(),
        step_order: index + 1
      })),
      overall_conversion_rate: 0,
      total_sessions: 0,
      bottlenecks: [],
      optimization_opportunities: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Store in database
    await this.supabase
      .from('conversion_funnels')
      .insert({
        name: funnel.name,
        business_scenario: funnel.business_scenario,
        steps: funnel.steps as unknown as Json,
        overall_conversion_rate: funnel.overall_conversion_rate,
        total_sessions: funnel.total_sessions,
        bottlenecks: funnel.bottlenecks as unknown as Json,
        optimization_opportunities: funnel.optimization_opportunities as unknown as Json
      })

    return funnel
  }

  // Get funnel by ID
  async getFunnel(funnelId: string): Promise<ConversionFunnel | null> {
    const { data, error } = await this.supabase
      .from('conversion_funnels')
      .select('*')
      .eq('id', funnelId)
      .single()

    if (error || !data) return null

    return {
      id: data.id,
      name: data.name,
      business_scenario: data.business_scenario as BusinessScenario,
      steps: data.steps as unknown as ConversionStep[],
      overall_conversion_rate: data.overall_conversion_rate,
      total_sessions: data.total_sessions,
      bottlenecks: data.bottlenecks as unknown as Bottleneck[],
      optimization_opportunities: data.optimization_opportunities as unknown as OptimizationOpportunity[],
      created_at: data.created_at,
      updated_at: data.updated_at
    }
  }

  // Analyze conversion funnel
  async analyzeFunnel(funnelId: string): Promise<{
    bottlenecks: Bottleneck[]
    opportunities: OptimizationOpportunity[]
    overallRate: number
  }> {
    const funnel = await this.getFunnel(funnelId)
    if (!funnel) throw new Error('Funnel not found')

    // Simple analysis logic
    const bottlenecks: Bottleneck[] = []
    const opportunities: OptimizationOpportunity[] = []

    funnel.steps.forEach((step, index) => {
      if (step.conversion_rate < 0.5) { // Less than 50% conversion
        bottlenecks.push({
          step_id: step.id,
          step_name: step.name,
          drop_off_rate: 1 - step.conversion_rate,
          potential_improvement: 0.2, // 20% potential improvement
          suggested_actions: [
            'Simplify the user interface',
            'Add clearer call-to-action buttons',
            'Reduce form fields'
          ]
        })

        opportunities.push({
          id: uuidv4(),
          type: 'ui_improvement',
          priority: step.conversion_rate < 0.3 ? 'high' : 'medium',
          description: `Improve conversion rate for step: ${step.name}`,
          estimated_impact: 0.15,
          implementation_effort: 'medium',
          suggested_changes: [
            'Redesign the step interface',
            'Add progress indicators',
            'Implement A/B testing'
          ]
        })
      }
    })

    const overallRate = funnel.steps.reduce((acc, step) => acc * step.conversion_rate, 1)

    return {
      bottlenecks,
      opportunities,
      overallRate
    }
  }

  // Get default funnel steps for business scenario
  getDefaultSteps(scenario: BusinessScenario): Omit<ConversionStep, 'id'>[] {
    const defaultSteps: Record<BusinessScenario, Omit<ConversionStep, 'id'>[]> = {
      retail: [
        {
          name: 'Landing Page Visit',
          step_order: 1,
          page_path: '/',
          required_action: 'page_view',
          entry_count: 1000,
          exit_count: 300,
          conversion_rate: 0.7,
          avg_time_spent: 30,
          bounce_rate: 0.3
        },
        {
          name: 'Product Browse',
          step_order: 2,
          page_path: '/products',
          required_action: 'browse_products',
          entry_count: 700,
          exit_count: 200,
          conversion_rate: 0.71,
          avg_time_spent: 120,
          bounce_rate: 0.29
        },
        {
          name: 'Add to Cart',
          step_order: 3,
          page_path: '/cart',
          required_action: 'add_to_cart',
          entry_count: 500,
          exit_count: 150,
          conversion_rate: 0.7,
          avg_time_spent: 60,
          bounce_rate: 0.3
        }
      ],
      restaurant: [
        {
          name: 'Menu View',
          step_order: 1,
          page_path: '/menu',
          required_action: 'view_menu',
          entry_count: 800,
          exit_count: 200,
          conversion_rate: 0.75,
          avg_time_spent: 90,
          bounce_rate: 0.25
        },
        {
          name: 'Make Reservation',
          step_order: 2,
          page_path: '/reservation',
          required_action: 'book_table',
          entry_count: 600,
          exit_count: 100,
          conversion_rate: 0.83,
          avg_time_spent: 180,
          bounce_rate: 0.17
        }
      ],
      real_estate: [
        {
          name: 'Property Search',
          step_order: 1,
          page_path: '/search',
          required_action: 'search_properties',
          entry_count: 500,
          exit_count: 100,
          conversion_rate: 0.8,
          avg_time_spent: 240,
          bounce_rate: 0.2
        }
      ],
      healthcare: [
        {
          name: 'Service Information',
          step_order: 1,
          page_path: '/services',
          required_action: 'view_services',
          entry_count: 300,
          exit_count: 50,
          conversion_rate: 0.83,
          avg_time_spent: 180,
          bounce_rate: 0.17
        }
      ],
      education: [
        {
          name: 'Course Catalog',
          step_order: 1,
          page_path: '/courses',
          required_action: 'browse_courses',
          entry_count: 400,
          exit_count: 80,
          conversion_rate: 0.8,
          avg_time_spent: 300,
          bounce_rate: 0.2
        }
      ],
      ecommerce: [
        {
          name: 'Product Discovery',
          step_order: 1,
          page_path: '/shop',
          required_action: 'discover_products',
          entry_count: 1200,
          exit_count: 400,
          conversion_rate: 0.67,
          avg_time_spent: 150,
          bounce_rate: 0.33
        }
      ],
      saas: [
        {
          name: 'Feature Overview',
          step_order: 1,
          page_path: '/features',
          required_action: 'view_features',
          entry_count: 600,
          exit_count: 150,
          conversion_rate: 0.75,
          avg_time_spent: 120,
          bounce_rate: 0.25
        }
      ],
      generic: [
        {
          name: 'Homepage Visit',
          step_order: 1,
          page_path: '/',
          required_action: 'page_view',
          entry_count: 1000,
          exit_count: 300,
          conversion_rate: 0.7,
          avg_time_spent: 60,
          bounce_rate: 0.3
        }
      ]
    }

    return defaultSteps[scenario] || defaultSteps.generic
  }
}
