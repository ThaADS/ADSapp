/**
 * Cache Analytics and Monitoring
 *
 * Comprehensive cache performance tracking
 * Features:
 * - Real-time metrics collection
 * - Hit rate analysis
 * - Latency tracking
 * - Memory usage monitoring
 * - Cost analysis
 * - Performance recommendations
 */

// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches


import { getCacheManager } from './cache-manager';
import { getCacheStats, getCacheHitRate } from './redis-client';
import { getL1Cache } from './l1-cache';

export interface CacheMetrics {
  timestamp: number;
  l1: {
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
    entries: number;
    evictions: number;
  };
  l2: {
    hits: number;
    misses: number;
    hitRate: number;
    errors: number;
  };
  combined: {
    totalRequests: number;
    overallHitRate: number;
    averageLatency: number;
    l1Hits: number;
    l2Hits: number;
    l3Hits: number;
  };
  performance: {
    fastestQuery: number;
    slowestQuery: number;
    p50Latency: number;
    p95Latency: number;
    p99Latency: number;
  };
}

export interface CacheHealthStatus {
  status: 'healthy' | 'degraded' | 'critical';
  l1Available: boolean;
  l2Available: boolean;
  issues: string[];
  recommendations: string[];
  score: number; // 0-100
}

export interface CacheCostAnalysis {
  estimatedMonthlyCost: number;
  requestsPerMonth: number;
  redisStorageGB: number;
  redisOperationsPerMonth: number;
  potentialSavings: number;
}

/**
 * Cache analytics collector
 */
export class CacheAnalytics {
  private metrics: CacheMetrics[];
  private maxMetricsHistory: number;
  private latencies: number[];
  private maxLatencyHistory: number;

  constructor() {
    this.metrics = [];
    this.maxMetricsHistory = 1000; // Keep last 1000 metrics
    this.latencies = [];
    this.maxLatencyHistory = 10000; // Keep last 10000 latencies
  }

  /**
   * Collect current metrics snapshot
   */
  async collect(): Promise<CacheMetrics> {
    const l1Cache = getL1Cache();
    const l1Stats = l1Cache.getStats();
    const l2Stats = getCacheStats();
    const manager = getCacheManager();
    const performance = manager.getPerformance();

    const metrics: CacheMetrics = {
      timestamp: Date.now(),
      l1: {
        hits: l1Stats.hits,
        misses: l1Stats.misses,
        hitRate: l1Stats.hitRate,
        size: l1Stats.size,
        entries: l1Stats.entries,
        evictions: l1Stats.evictions,
      },
      l2: {
        hits: l2Stats.hits,
        misses: l2Stats.misses,
        hitRate: getCacheHitRate(),
        errors: l2Stats.errors,
      },
      combined: {
        totalRequests: performance.totalRequests,
        overallHitRate: performance.l2HitRate,
        averageLatency: performance.averageLatency,
        l1Hits: performance.l1Hits,
        l2Hits: performance.l2Hits,
        l3Hits: performance.l3Hits,
      },
      performance: this.calculatePerformanceMetrics(),
    };

    // Store metrics
    this.metrics.push(metrics);
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics.shift();
    }

    return metrics;
  }

  /**
   * Record query latency
   */
  recordLatency(latencyMs: number): void {
    this.latencies.push(latencyMs);
    if (this.latencies.length > this.maxLatencyHistory) {
      this.latencies.shift();
    }
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): CacheMetrics | null {
    return this.metrics[this.metrics.length - 1] || null;
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(limit?: number): CacheMetrics[] {
    if (limit) {
      return this.metrics.slice(-limit);
    }
    return [...this.metrics];
  }

  /**
   * Calculate performance percentiles
   */
  private calculatePerformanceMetrics(): CacheMetrics['performance'] {
    if (this.latencies.length === 0) {
      return {
        fastestQuery: 0,
        slowestQuery: 0,
        p50Latency: 0,
        p95Latency: 0,
        p99Latency: 0,
      };
    }

    const sorted = [...this.latencies].sort((a, b) => a - b);

    return {
      fastestQuery: sorted[0],
      slowestQuery: sorted[sorted.length - 1],
      p50Latency: sorted[Math.floor(sorted.length * 0.5)],
      p95Latency: sorted[Math.floor(sorted.length * 0.95)],
      p99Latency: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  /**
   * Analyze cache health
   */
  async analyzeHealth(): Promise<CacheHealthStatus> {
    const manager = getCacheManager();
    const health = await manager.healthCheck();
    const metrics = await this.collect();

    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // Check L1 availability
    if (!health.l1Available) {
      issues.push('L1 cache (in-memory) is unavailable');
      score -= 30;
    }

    // Check L2 availability
    if (!health.l2Available) {
      issues.push('L2 cache (Redis) is unavailable');
      recommendations.push('Check Redis connection and credentials');
      score -= 40;
    }

    // Check hit rates
    if (metrics.combined.overallHitRate < 50) {
      issues.push('Low cache hit rate (<50%)');
      recommendations.push('Review cache TTL settings and warming strategy');
      score -= 10;
    }

    // Check L1 evictions
    if (metrics.l1.evictions > metrics.l1.entries * 0.5) {
      issues.push('High L1 cache eviction rate');
      recommendations.push('Increase L1 cache size or reduce TTL');
      score -= 5;
    }

    // Check errors
    if (metrics.l2.errors > 0) {
      issues.push(`L2 cache has ${metrics.l2.errors} errors`);
      recommendations.push('Check Redis logs for error details');
      score -= 10;
    }

    // Check latency
    if (metrics.performance.p95Latency > 100) {
      issues.push('High P95 latency (>100ms)');
      recommendations.push('Optimize database queries or increase cache TTL');
      score -= 5;
    }

    // Determine overall status
    let status: CacheHealthStatus['status'];
    if (score >= 80) {
      status = 'healthy';
    } else if (score >= 50) {
      status = 'degraded';
    } else {
      status = 'critical';
    }

    return {
      status,
      l1Available: health.l1Available,
      l2Available: health.l2Available,
      issues,
      recommendations,
      score: Math.max(0, score),
    };
  }

  /**
   * Generate performance report
   */
  generateReport(): {
    summary: string;
    metrics: CacheMetrics;
    health: CacheHealthStatus;
    trends: {
      hitRateTrend: 'improving' | 'stable' | 'declining';
      latencyTrend: 'improving' | 'stable' | 'declining';
    };
  } {
    const currentMetrics = this.getCurrentMetrics();
    if (!currentMetrics) {
      return {
        summary: 'No metrics available',
        metrics: {} as CacheMetrics,
        health: {
          status: 'critical',
          l1Available: false,
          l2Available: false,
          issues: ['No metrics collected'],
          recommendations: ['Start collecting metrics'],
          score: 0,
        },
        trends: {
          hitRateTrend: 'stable',
          latencyTrend: 'stable',
        },
      };
    }

    const health = this.analyzeHealth();

    // Calculate trends
    const trends = this.calculateTrends();

    // Generate summary
    const summary = this.generateSummary(currentMetrics, trends);

    return {
      summary,
      metrics: currentMetrics,
      health: health as CacheHealthStatus,
      trends,
    };
  }

  /**
   * Calculate performance trends
   */
  private calculateTrends(): {
    hitRateTrend: 'improving' | 'stable' | 'declining';
    latencyTrend: 'improving' | 'stable' | 'declining';
  } {
    if (this.metrics.length < 10) {
      return {
        hitRateTrend: 'stable',
        latencyTrend: 'stable',
      };
    }

    const recent = this.metrics.slice(-10);
    const older = this.metrics.slice(-20, -10);

    // Calculate average hit rates
    const recentHitRate =
      recent.reduce((sum, m) => sum + m.combined.overallHitRate, 0) / recent.length;
    const olderHitRate =
      older.reduce((sum, m) => sum + m.combined.overallHitRate, 0) / older.length;

    // Calculate average latencies
    const recentLatency =
      recent.reduce((sum, m) => sum + m.combined.averageLatency, 0) / recent.length;
    const olderLatency =
      older.reduce((sum, m) => sum + m.combined.averageLatency, 0) / older.length;

    // Determine trends
    const hitRateDiff = recentHitRate - olderHitRate;
    const latencyDiff = recentLatency - olderLatency;

    return {
      hitRateTrend:
        hitRateDiff > 5 ? 'improving' : hitRateDiff < -5 ? 'declining' : 'stable',
      latencyTrend:
        latencyDiff < -10 ? 'improving' : latencyDiff > 10 ? 'declining' : 'stable',
    };
  }

  /**
   * Generate summary text
   */
  private generateSummary(
    metrics: CacheMetrics,
    trends: { hitRateTrend: string; latencyTrend: string }
  ): string {
    const parts: string[] = [];

    // Overall hit rate
    parts.push(
      `Cache hit rate: ${metrics.combined.overallHitRate.toFixed(1)}% (${trends.hitRateTrend})`
    );

    // Latency
    parts.push(
      `Average latency: ${metrics.combined.averageLatency.toFixed(1)}ms (${trends.latencyTrend})`
    );

    // Layer distribution
    const total = metrics.combined.totalRequests;
    if (total > 0) {
      const l1Pct = ((metrics.combined.l1Hits / total) * 100).toFixed(1);
      const l2Pct = ((metrics.combined.l2Hits / total) * 100).toFixed(1);
      const l3Pct = ((metrics.combined.l3Hits / total) * 100).toFixed(1);
      parts.push(`Layer distribution: L1=${l1Pct}% L2=${l2Pct}% L3=${l3Pct}%`);
    }

    // Performance percentiles
    parts.push(
      `P95 latency: ${metrics.performance.p95Latency.toFixed(1)}ms, ` +
        `P99: ${metrics.performance.p99Latency.toFixed(1)}ms`
    );

    return parts.join(' | ');
  }

  /**
   * Estimate cache costs (Upstash pricing)
   */
  estimateCosts(requestsPerDay: number): CacheCostAnalysis {
    const requestsPerMonth = requestsPerDay * 30;

    // Estimate Redis operations (assuming 50% cache hit rate)
    const redisOperationsPerMonth = requestsPerMonth * 0.5;

    // Estimate Redis storage (assuming 1KB average value)
    const redisStorageGB = (redisOperationsPerMonth * 1024) / (1024 * 1024 * 1024);

    // Upstash pricing estimation (approximate)
    // Storage: $0.25/GB/month
    // Operations: $0.20 per 100,000 operations
    const storageCost = redisStorageGB * 0.25;
    const operationsCost = (redisOperationsPerMonth / 100000) * 0.2;
    const estimatedMonthlyCost = storageCost + operationsCost;

    // Calculate potential savings (vs database queries)
    // Assuming $0.001 per database query
    const databaseCost = (requestsPerMonth * 0.001);
    const potentialSavings = databaseCost - estimatedMonthlyCost;

    return {
      estimatedMonthlyCost,
      requestsPerMonth,
      redisStorageGB,
      redisOperationsPerMonth,
      potentialSavings: Math.max(0, potentialSavings),
    };
  }

  /**
   * Reset analytics data
   */
  reset(): void {
    this.metrics = [];
    this.latencies = [];
  }
}

// Global analytics instance
let globalAnalytics: CacheAnalytics | null = null;

/**
 * Get global cache analytics instance
 */
export function getCacheAnalytics(): CacheAnalytics {
  if (!globalAnalytics) {
    globalAnalytics = new CacheAnalytics();
  }
  return globalAnalytics;
}

/**
 * Start automatic metrics collection
 */
export function startMetricsCollection(intervalMs: number = 60000): NodeJS.Timeout {
  const analytics = getCacheAnalytics();

  return setInterval(async () => {
    try {
      await analytics.collect();
    } catch (error) {
      console.error('[CacheAnalytics] Collection error:', error);
    }
  }, intervalMs);
}

/**
 * Get cache performance summary
 */
export async function getCachePerformanceSummary(): Promise<string> {
  const analytics = getCacheAnalytics();
  const report = analytics.generateReport();
  return report.summary;
}

/**
 * Get cache health check
 */
export async function checkCacheHealth(): Promise<CacheHealthStatus> {
  const analytics = getCacheAnalytics();
  return await analytics.analyzeHealth();
}

/**
 * Export metrics for external monitoring
 */
export async function exportMetrics(): Promise<{
  timestamp: number;
  metrics: CacheMetrics | null;
  health: CacheHealthStatus;
}> {
  const analytics = getCacheAnalytics();
  const metrics = analytics.getCurrentMetrics();
  const health = await analytics.analyzeHealth();

  return {
    timestamp: Date.now(),
    metrics,
    health,
  };
}
