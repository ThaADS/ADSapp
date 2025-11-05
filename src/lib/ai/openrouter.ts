/**
 * OpenRouter AI Client
 * Unified API client for multiple AI models with fallback and cost tracking
 */

// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches


import { createClient } from '@/lib/supabase/server';
import type {
  OpenRouterMessage,
  OpenRouterRequest,
  OpenRouterResponse,
  AIFeatureUsage,
} from './types';

export class OpenRouterClient {
  private apiKey: string;
  private baseUrl = 'https://openrouter.ai/api/v1';
  private defaultModel: string;
  private fallbackModel: string;
  private maxTokens: number;
  private temperature: number;

  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    this.defaultModel = process.env.OPENROUTER_DEFAULT_MODEL || 'anthropic/claude-3.5-sonnet';
    this.fallbackModel = process.env.OPENROUTER_FALLBACK_MODEL || 'anthropic/claude-3-haiku';
    this.maxTokens = parseInt(process.env.OPENROUTER_MAX_TOKENS || '1000');
    this.temperature = parseFloat(process.env.OPENROUTER_TEMPERATURE || '0.7');

    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY not configured in environment variables');
    }
  }

  /**
   * Main chat completion method with automatic fallback
   */
  async chat(
    messages: OpenRouterMessage[],
    options: Partial<OpenRouterRequest> = {}
  ): Promise<OpenRouterResponse> {
    const model = options.model || this.defaultModel;
    const startTime = Date.now();

    try {
      const response = await this.makeRequest(model, messages, options);
      const latency = Date.now() - startTime;

      // Log successful request
      console.log(`✅ OpenRouter success: ${model} (${latency}ms, ${response.usage.total_tokens} tokens)`);

      return response;
    } catch (error) {
      const primaryLatency = Date.now() - startTime;
      console.warn(`⚠️  Primary model ${model} failed after ${primaryLatency}ms, falling back to ${this.fallbackModel}`);
      console.error('Primary model error:', error);

      // Fallback to cheaper/faster model
      try {
        const fallbackStart = Date.now();
        const response = await this.makeRequest(this.fallbackModel, messages, {
          ...options,
          model: this.fallbackModel,
        });
        const fallbackLatency = Date.now() - fallbackStart;

        console.log(`✅ Fallback success: ${this.fallbackModel} (${fallbackLatency}ms)`);
        return response;
      } catch (fallbackError) {
        console.error('❌ Fallback model also failed:', fallbackError);
        throw new Error('Both primary and fallback AI models failed');
      }
    }
  }

  /**
   * Make HTTP request to OpenRouter API
   */
  private async makeRequest(
    model: string,
    messages: OpenRouterMessage[],
    options: Partial<OpenRouterRequest>
  ): Promise<OpenRouterResponse> {
    const requestBody: OpenRouterRequest = {
      model,
      messages,
      max_tokens: options.max_tokens || this.maxTokens,
      temperature: options.temperature !== undefined ? options.temperature : this.temperature,
      top_p: options.top_p,
      frequency_penalty: options.frequency_penalty,
      presence_penalty: options.presence_penalty,
      stream: false, // We don't support streaming yet
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_DOMAIN || 'https://adsapp.nl',
        'X-Title': 'ADSapp WhatsApp Inbox',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `OpenRouter API error (${response.status})`;

      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      throw new Error(errorMessage);
    }

    const data: OpenRouterResponse = await response.json();

    // Validate response structure
    if (!data.choices || data.choices.length === 0) {
      throw new Error('OpenRouter returned empty response');
    }

    return data;
  }

  /**
   * Log AI usage to database for cost tracking and analytics
   */
  async logUsage(usage: Omit<AIFeatureUsage, 'costUsd'>): Promise<void> {
    try {
      const costUsd = this.calculateCost(usage.model, usage.tokensUsed);

      const supabase = await createClient();
      await supabase.from('ai_responses').insert({
        organization_id: usage.organizationId,
        conversation_id: usage.conversationId,
        message_id: usage.messageId,
        model: usage.model,
        feature: usage.feature,
        prompt: usage.prompt,
        response: usage.response,
        tokens_used: usage.tokensUsed,
        cost_usd: costUsd,
        latency_ms: usage.latencyMs,
        feedback: usage.feedback,
        edited_response: usage.editedResponse,
        metadata: usage.metadata,
      });
    } catch (error) {
      // Don't fail the main operation if logging fails
      console.error('Failed to log AI usage:', error);
    }
  }

  /**
   * Calculate approximate cost based on model and tokens
   * Prices are per million tokens (approximate, may vary)
   */
  private calculateCost(model: string, totalTokens: number): number {
    // Cost per million tokens (input + output averaged)
    const costs: Record<string, number> = {
      'anthropic/claude-3.5-sonnet': 3.00,
      'anthropic/claude-3-sonnet': 3.00,
      'anthropic/claude-3-opus': 15.00,
      'anthropic/claude-3-haiku': 0.25,
      'openai/gpt-4-turbo': 10.00,
      'openai/gpt-4': 30.00,
      'openai/gpt-3.5-turbo': 0.50,
      'meta-llama/llama-3-70b': 0.90,
      'meta-llama/llama-3-8b': 0.18,
      'google/gemini-pro': 0.125,
      'google/gemini-pro-1.5': 1.25,
      'mistralai/mistral-medium': 2.70,
      'mistralai/mistral-small': 1.00,
    };

    const costPerMillion = costs[model] || 1.00; // Default fallback
    return (totalTokens / 1_000_000) * costPerMillion;
  }

  /**
   * Check if organization is within budget before making request
   */
  async checkBudget(organizationId: string, estimatedCost: number): Promise<boolean> {
    try {
      const supabase = await createClient();

      const { data: settings } = await supabase
        .from('ai_settings')
        .select('monthly_budget_usd, current_month_spend_usd')
        .eq('organization_id', organizationId)
        .single();

      // No budget limit set - allow
      if (!settings || !settings.monthly_budget_usd) {
        return true;
      }

      // Check if adding this cost would exceed budget
      const newSpend = (settings.current_month_spend_usd || 0) + estimatedCost;
      return newSpend <= settings.monthly_budget_usd;
    } catch (error) {
      console.error('Failed to check budget:', error);
      // Allow on error to not block functionality
      return true;
    }
  }

  /**
   * Get available models from OpenRouter
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }

      const data = await response.json();
      return data.data.map((model: any) => model.id);
    } catch (error) {
      console.error('Failed to get available models:', error);
      // Return common models as fallback
      return [
        'anthropic/claude-3.5-sonnet',
        'anthropic/claude-3-haiku',
        'openai/gpt-4-turbo',
        'openai/gpt-3.5-turbo',
      ];
    }
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.chat([
        { role: 'user', content: 'Hello! Please respond with just "OK".' }
      ], {
        max_tokens: 10,
        temperature: 0,
      });

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Singleton instance
let clientInstance: OpenRouterClient | null = null;

/**
 * Get OpenRouter client instance (singleton pattern)
 */
export function getOpenRouterClient(): OpenRouterClient {
  if (!clientInstance) {
    clientInstance = new OpenRouterClient();
  }
  return clientInstance;
}

// Default export for convenience
export const openRouter = getOpenRouterClient();
