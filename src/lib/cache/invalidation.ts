/**
 * Cache Invalidation Utilities
 *
 * Smart cache invalidation strategies
 * Features:
 * - Automatic invalidation on data mutations
 * - Cascade invalidation for related data
 * - Tag-based invalidation
 * - Scheduled invalidation
 * - Webhook-triggered invalidation
 */

import { getCacheManager } from './cache-manager';
import { deletePattern } from './redis-client';

export interface InvalidationRule {
  resource: string;
  relatedResources?: string[];
  cascade?: boolean;
  delay?: number; // Delay invalidation (ms)
}

export interface InvalidationEvent {
  tenant: string;
  resource: string;
  id?: string;
  operation: 'create' | 'update' | 'delete';
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Cache invalidation manager
 */
export class CacheInvalidation {
  private rules: Map<string, InvalidationRule>;
  private eventQueue: InvalidationEvent[];
  private processing: boolean;

  constructor() {
    this.rules = new Map();
    this.eventQueue = [];
    this.processing = false;
    this.initializeDefaultRules();
  }

  /**
   * Register invalidation rule
   */
  registerRule(rule: InvalidationRule): void {
    this.rules.set(rule.resource, rule);
  }

  /**
   * Invalidate cache for resource
   */
  async invalidate(
    tenant: string,
    resource: string,
    id?: string,
    cascade: boolean = true
  ): Promise<number> {
    try {
      const manager = getCacheManager();
      let totalInvalidated = 0;

      // Invalidate main resource
      const mainCount = await manager.invalidate(
        tenant,
        id ? `${resource}:${id}` : resource
      );
      totalInvalidated += mainCount;

      console.log(
        `[CacheInvalidation] Invalidated ${mainCount} keys for ${tenant}:${resource}${id ? ':' + id : ''}`
      );

      // Cascade invalidation if enabled
      if (cascade) {
        const rule = this.rules.get(resource);
        if (rule?.relatedResources) {
          for (const relatedResource of rule.relatedResources) {
            const relatedCount = await manager.invalidate(tenant, relatedResource);
            totalInvalidated += relatedCount;
            console.log(
              `[CacheInvalidation] Cascade: Invalidated ${relatedCount} keys for ${tenant}:${relatedResource}`
            );
          }
        }
      }

      return totalInvalidated;
    } catch (error) {
      console.error('[CacheInvalidation] Invalidation error:', error);
      return 0;
    }
  }

  /**
   * Queue invalidation event
   */
  queueInvalidation(event: InvalidationEvent): void {
    this.eventQueue.push(event);

    // Process queue if not already processing
    if (!this.processing) {
      this.processQueue();
    }
  }

  /**
   * Process invalidation queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.eventQueue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      if (!event) continue;

      try {
        const rule = this.rules.get(event.resource);

        // Apply delay if specified
        if (rule?.delay) {
          await new Promise((resolve) => setTimeout(resolve, rule.delay));
        }

        // Execute invalidation
        await this.invalidate(
          event.tenant,
          event.resource,
          event.id,
          rule?.cascade ?? true
        );
      } catch (error) {
        console.error('[CacheInvalidation] Queue processing error:', error);
      }
    }

    this.processing = false;
  }

  /**
   * Initialize default invalidation rules
   */
  private initializeDefaultRules(): void {
    // Conversation invalidation rules
    this.registerRule({
      resource: 'conversations',
      relatedResources: ['messages', 'contacts', 'dashboard-stats'],
      cascade: true,
    });

    // Message invalidation rules
    this.registerRule({
      resource: 'messages',
      relatedResources: ['conversations', 'dashboard-stats'],
      cascade: true,
    });

    // Contact invalidation rules
    this.registerRule({
      resource: 'contacts',
      relatedResources: ['conversations', 'contact-lists'],
      cascade: true,
    });

    // Template invalidation rules
    this.registerRule({
      resource: 'templates',
      relatedResources: ['template-categories'],
      cascade: false,
    });

    // Organization invalidation rules
    this.registerRule({
      resource: 'organizations',
      relatedResources: ['users', 'billing', 'settings'],
      cascade: true,
    });

    // User invalidation rules
    this.registerRule({
      resource: 'users',
      relatedResources: ['organizations', 'permissions'],
      cascade: true,
    });

    // Analytics invalidation rules
    this.registerRule({
      resource: 'analytics',
      relatedResources: ['dashboard-stats', 'reports'],
      cascade: false,
      delay: 5000, // Delay 5 seconds to allow data aggregation
    });
  }
}

// Global invalidation manager
let globalInvalidation: CacheInvalidation | null = null;

/**
 * Get global invalidation manager
 */
export function getInvalidationManager(): CacheInvalidation {
  if (!globalInvalidation) {
    globalInvalidation = new CacheInvalidation();
  }
  return globalInvalidation;
}

/**
 * Helper: Invalidate after create
 */
export async function invalidateAfterCreate(
  tenant: string,
  resource: string
): Promise<void> {
  const manager = getInvalidationManager();
  manager.queueInvalidation({
    tenant,
    resource,
    operation: 'create',
    timestamp: Date.now(),
  });
}

/**
 * Helper: Invalidate after update
 */
export async function invalidateAfterUpdate(
  tenant: string,
  resource: string,
  id: string
): Promise<void> {
  const manager = getInvalidationManager();
  manager.queueInvalidation({
    tenant,
    resource,
    id,
    operation: 'update',
    timestamp: Date.now(),
  });
}

/**
 * Helper: Invalidate after delete
 */
export async function invalidateAfterDelete(
  tenant: string,
  resource: string,
  id: string
): Promise<void> {
  const manager = getInvalidationManager();
  manager.queueInvalidation({
    tenant,
    resource,
    id,
    operation: 'delete',
    timestamp: Date.now(),
  });
}

/**
 * Invalidate multiple resources at once
 */
export async function invalidateMultiple(
  tenant: string,
  resources: string[]
): Promise<number> {
  const manager = getInvalidationManager();
  let total = 0;

  for (const resource of resources) {
    const count = await manager.invalidate(tenant, resource);
    total += count;
  }

  return total;
}

/**
 * Invalidate entire tenant cache
 */
export async function invalidateTenant(tenant: string): Promise<number> {
  try {
    const count = await deletePattern(`${tenant}:*`);
    console.log(`[CacheInvalidation] Invalidated entire cache for tenant ${tenant}: ${count} keys`);
    return count;
  } catch (error) {
    console.error('[CacheInvalidation] Tenant invalidation error:', error);
    return 0;
  }
}

/**
 * Tag-based cache invalidation
 */
export class TagBasedInvalidation {
  private tagRegistry: Map<string, Set<string>>; // tag -> cache keys

  constructor() {
    this.tagRegistry = new Map();
  }

  /**
   * Tag a cache key
   */
  tag(cacheKey: string, tags: string[]): void {
    for (const tag of tags) {
      if (!this.tagRegistry.has(tag)) {
        this.tagRegistry.set(tag, new Set());
      }
      this.tagRegistry.get(tag)!.add(cacheKey);
    }
  }

  /**
   * Invalidate by tag
   */
  async invalidateByTag(tag: string): Promise<number> {
    const keys = this.tagRegistry.get(tag);
    if (!keys || keys.size === 0) return 0;

    let count = 0;
    for (const key of keys) {
      const pattern = `*${key}*`;
      const deleted = await deletePattern(pattern);
      count += deleted;
    }

    // Clear tag registry
    this.tagRegistry.delete(tag);

    console.log(`[TagBasedInvalidation] Invalidated ${count} keys for tag: ${tag}`);
    return count;
  }

  /**
   * Invalidate by multiple tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    let total = 0;
    for (const tag of tags) {
      const count = await this.invalidateByTag(tag);
      total += count;
    }
    return total;
  }

  /**
   * Get all keys for tag
   */
  getKeysForTag(tag: string): string[] {
    const keys = this.tagRegistry.get(tag);
    return keys ? Array.from(keys) : [];
  }

  /**
   * Clear all tags
   */
  clearTags(): void {
    this.tagRegistry.clear();
  }
}

// Global tag-based invalidation
let globalTagInvalidation: TagBasedInvalidation | null = null;

/**
 * Get global tag-based invalidation manager
 */
export function getTagInvalidation(): TagBasedInvalidation {
  if (!globalTagInvalidation) {
    globalTagInvalidation = new TagBasedInvalidation();
  }
  return globalTagInvalidation;
}

/**
 * Scheduled cache warming
 */
export class CacheWarmer {
  private warmingSchedule: Map<string, NodeJS.Timeout>;

  constructor() {
    this.warmingSchedule = new Map();
  }

  /**
   * Schedule cache warming
   */
  schedule(
    key: string,
    warmFn: () => Promise<void>,
    intervalMs: number
  ): void {
    // Clear existing schedule
    this.cancel(key);

    // Execute immediately
    warmFn().catch((error) => {
      console.error(`[CacheWarmer] Initial warming failed for ${key}:`, error);
    });

    // Schedule recurring warming
    const timer = setInterval(async () => {
      try {
        await warmFn();
        console.log(`[CacheWarmer] Successfully warmed cache for ${key}`);
      } catch (error) {
        console.error(`[CacheWarmer] Warming failed for ${key}:`, error);
      }
    }, intervalMs);

    this.warmingSchedule.set(key, timer);
  }

  /**
   * Cancel scheduled warming
   */
  cancel(key: string): void {
    const timer = this.warmingSchedule.get(key);
    if (timer) {
      clearInterval(timer);
      this.warmingSchedule.delete(key);
    }
  }

  /**
   * Cancel all warming schedules
   */
  cancelAll(): void {
    for (const [key, timer] of this.warmingSchedule.entries()) {
      clearInterval(timer);
    }
    this.warmingSchedule.clear();
  }
}

// Global cache warmer
let globalCacheWarmer: CacheWarmer | null = null;

/**
 * Get global cache warmer
 */
export function getCacheWarmer(): CacheWarmer {
  if (!globalCacheWarmer) {
    globalCacheWarmer = new CacheWarmer();
  }
  return globalCacheWarmer;
}

/**
 * Schedule dashboard stats warming
 */
export function warmDashboardStats(tenant: string, intervalMs: number = 300000): void {
  const warmer = getCacheWarmer();
  warmer.schedule(
    `dashboard-stats:${tenant}`,
    async () => {
      // This would call your dashboard stats API to warm the cache
      console.log(`[CacheWarmer] Warming dashboard stats for ${tenant}`);
      // Implementation depends on your dashboard stats endpoint
    },
    intervalMs
  );
}
