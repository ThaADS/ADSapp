/**
 * Redis Mock Client for Testing
 *
 * Provides a mock implementation of Redis client for unit and integration tests.
 * Simulates Redis operations with in-memory storage for testing cache functionality.
 */

import type { Redis } from '@upstash/redis'

export interface MockRedisClient {
  get: jest.Mock
  set: jest.Mock
  del: jest.Mock
  exists: jest.Mock
  expire: jest.Mock
  ttl: jest.Mock
  incr: jest.Mock
  decr: jest.Mock
  hget: jest.Mock
  hset: jest.Mock
  hdel: jest.Mock
  hgetall: jest.Mock
  sadd: jest.Mock
  smembers: jest.Mock
  srem: jest.Mock
  zadd: jest.Mock
  zrange: jest.Mock
  zrem: jest.Mock
  lpush: jest.Mock
  rpush: jest.Mock
  lpop: jest.Mock
  rpop: jest.Mock
  lrange: jest.Mock
  flushall: jest.Mock
  flushdb: jest.Mock
  keys: jest.Mock
  scan: jest.Mock
  ping: jest.Mock
}

/**
 * In-memory storage for mock Redis data
 */
class MockRedisStorage {
  private store: Map<string, { value: any; expiresAt?: number }> = new Map()
  private hashes: Map<string, Map<string, any>> = new Map()
  private sets: Map<string, Set<any>> = new Map()
  private sortedSets: Map<string, Map<any, number>> = new Map()
  private lists: Map<string, any[]> = new Map()

  // String operations
  get(key: string): any | null {
    const item = this.store.get(key)
    if (!item) return null
    if (item.expiresAt && item.expiresAt < Date.now()) {
      this.store.delete(key)
      return null
    }
    return item.value
  }

  set(key: string, value: any, options?: { ex?: number; px?: number }): 'OK' {
    const expiresAt = options?.ex
      ? Date.now() + options.ex * 1000
      : options?.px
        ? Date.now() + options.px
        : undefined
    this.store.set(key, { value, expiresAt })
    return 'OK'
  }

  del(...keys: string[]): number {
    let deleted = 0
    keys.forEach(key => {
      if (this.store.delete(key)) deleted++
      if (this.hashes.delete(key)) deleted++
      if (this.sets.delete(key)) deleted++
      if (this.sortedSets.delete(key)) deleted++
      if (this.lists.delete(key)) deleted++
    })
    return deleted
  }

  exists(...keys: string[]): number {
    return keys.filter(key => this.store.has(key)).length
  }

  expire(key: string, seconds: number): number {
    const item = this.store.get(key)
    if (!item) return 0
    item.expiresAt = Date.now() + seconds * 1000
    return 1
  }

  ttl(key: string): number {
    const item = this.store.get(key)
    if (!item) return -2
    if (!item.expiresAt) return -1
    const ttl = Math.floor((item.expiresAt - Date.now()) / 1000)
    return ttl > 0 ? ttl : -2
  }

  incr(key: string): number {
    const current = this.get(key) || 0
    const newValue = Number(current) + 1
    this.set(key, newValue)
    return newValue
  }

  decr(key: string): number {
    const current = this.get(key) || 0
    const newValue = Number(current) - 1
    this.set(key, newValue)
    return newValue
  }

  // Hash operations
  hget(key: string, field: string): any | null {
    return this.hashes.get(key)?.get(field) ?? null
  }

  hset(key: string, field: string, value: any): number {
    if (!this.hashes.has(key)) {
      this.hashes.set(key, new Map())
    }
    const hash = this.hashes.get(key)!
    const isNew = !hash.has(field)
    hash.set(field, value)
    return isNew ? 1 : 0
  }

  hdel(key: string, ...fields: string[]): number {
    const hash = this.hashes.get(key)
    if (!hash) return 0
    let deleted = 0
    fields.forEach(field => {
      if (hash.delete(field)) deleted++
    })
    return deleted
  }

  hgetall(key: string): Record<string, any> {
    const hash = this.hashes.get(key)
    if (!hash) return {}
    return Object.fromEntries(hash)
  }

  // Set operations
  sadd(key: string, ...members: any[]): number {
    if (!this.sets.has(key)) {
      this.sets.set(key, new Set())
    }
    const set = this.sets.get(key)!
    let added = 0
    members.forEach(member => {
      const sizeBefore = set.size
      set.add(member)
      if (set.size > sizeBefore) added++
    })
    return added
  }

  smembers(key: string): any[] {
    return Array.from(this.sets.get(key) || [])
  }

  srem(key: string, ...members: any[]): number {
    const set = this.sets.get(key)
    if (!set) return 0
    let removed = 0
    members.forEach(member => {
      if (set.delete(member)) removed++
    })
    return removed
  }

  // Sorted set operations
  zadd(key: string, score: number, member: any): number {
    if (!this.sortedSets.has(key)) {
      this.sortedSets.set(key, new Map())
    }
    const zset = this.sortedSets.get(key)!
    const isNew = !zset.has(member)
    zset.set(member, score)
    return isNew ? 1 : 0
  }

  zrange(key: string, start: number, stop: number): any[] {
    const zset = this.sortedSets.get(key)
    if (!zset) return []
    const sorted = Array.from(zset.entries()).sort((a, b) => a[1] - b[1])
    return sorted.slice(start, stop === -1 ? undefined : stop + 1).map(([member]) => member)
  }

  zrem(key: string, ...members: any[]): number {
    const zset = this.sortedSets.get(key)
    if (!zset) return 0
    let removed = 0
    members.forEach(member => {
      if (zset.delete(member)) removed++
    })
    return removed
  }

  // List operations
  lpush(key: string, ...values: any[]): number {
    if (!this.lists.has(key)) {
      this.lists.set(key, [])
    }
    const list = this.lists.get(key)!
    list.unshift(...values.reverse())
    return list.length
  }

  rpush(key: string, ...values: any[]): number {
    if (!this.lists.has(key)) {
      this.lists.set(key, [])
    }
    const list = this.lists.get(key)!
    list.push(...values)
    return list.length
  }

  lpop(key: string): any | null {
    const list = this.lists.get(key)
    return list?.shift() ?? null
  }

  rpop(key: string): any | null {
    const list = this.lists.get(key)
    return list?.pop() ?? null
  }

  lrange(key: string, start: number, stop: number): any[] {
    const list = this.lists.get(key)
    if (!list) return []
    return list.slice(start, stop === -1 ? undefined : stop + 1)
  }

  // Database operations
  flushall(): 'OK' {
    this.store.clear()
    this.hashes.clear()
    this.sets.clear()
    this.sortedSets.clear()
    this.lists.clear()
    return 'OK'
  }

  flushdb(): 'OK' {
    return this.flushall()
  }

  keys(pattern: string): string[] {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'))
    return Array.from(this.store.keys()).filter(key => regex.test(key))
  }

  scan(cursor: number, options?: { match?: string; count?: number }): [number, string[]] {
    const allKeys = Array.from(this.store.keys())
    const filteredKeys = options?.match
      ? allKeys.filter(key => {
          const regex = new RegExp(options.match!.replace(/\*/g, '.*'))
          return regex.test(key)
        })
      : allKeys
    const count = options?.count || 10
    const start = cursor
    const end = start + count
    const keys = filteredKeys.slice(start, end)
    const nextCursor = end >= filteredKeys.length ? 0 : end
    return [nextCursor, keys]
  }

  ping(): 'PONG' {
    return 'PONG'
  }
}

/**
 * Creates a mock Redis client for testing
 * @param storage - Optional shared storage instance for coordinated tests
 * @returns Mock Redis client with jest mock functions
 */
export function createMockRedisClient(storage?: MockRedisStorage): MockRedisClient {
  const store = storage || new MockRedisStorage()

  return {
    get: jest.fn((key: string) => Promise.resolve(store.get(key))),
    set: jest.fn((key: string, value: any, options?: any) =>
      Promise.resolve(store.set(key, value, options))
    ),
    del: jest.fn((...keys: string[]) => Promise.resolve(store.del(...keys))),
    exists: jest.fn((...keys: string[]) => Promise.resolve(store.exists(...keys))),
    expire: jest.fn((key: string, seconds: number) => Promise.resolve(store.expire(key, seconds))),
    ttl: jest.fn((key: string) => Promise.resolve(store.ttl(key))),
    incr: jest.fn((key: string) => Promise.resolve(store.incr(key))),
    decr: jest.fn((key: string) => Promise.resolve(store.decr(key))),
    hget: jest.fn((key: string, field: string) => Promise.resolve(store.hget(key, field))),
    hset: jest.fn((key: string, field: string, value: any) =>
      Promise.resolve(store.hset(key, field, value))
    ),
    hdel: jest.fn((key: string, ...fields: string[]) =>
      Promise.resolve(store.hdel(key, ...fields))
    ),
    hgetall: jest.fn((key: string) => Promise.resolve(store.hgetall(key))),
    sadd: jest.fn((key: string, ...members: any[]) => Promise.resolve(store.sadd(key, ...members))),
    smembers: jest.fn((key: string) => Promise.resolve(store.smembers(key))),
    srem: jest.fn((key: string, ...members: any[]) => Promise.resolve(store.srem(key, ...members))),
    zadd: jest.fn((key: string, score: number, member: any) =>
      Promise.resolve(store.zadd(key, score, member))
    ),
    zrange: jest.fn((key: string, start: number, stop: number) =>
      Promise.resolve(store.zrange(key, start, stop))
    ),
    zrem: jest.fn((key: string, ...members: any[]) => Promise.resolve(store.zrem(key, ...members))),
    lpush: jest.fn((key: string, ...values: any[]) => Promise.resolve(store.lpush(key, ...values))),
    rpush: jest.fn((key: string, ...values: any[]) => Promise.resolve(store.rpush(key, ...values))),
    lpop: jest.fn((key: string) => Promise.resolve(store.lpop(key))),
    rpop: jest.fn((key: string) => Promise.resolve(store.rpop(key))),
    lrange: jest.fn((key: string, start: number, stop: number) =>
      Promise.resolve(store.lrange(key, start, stop))
    ),
    flushall: jest.fn(() => Promise.resolve(store.flushall())),
    flushdb: jest.fn(() => Promise.resolve(store.flushdb())),
    keys: jest.fn((pattern: string) => Promise.resolve(store.keys(pattern))),
    scan: jest.fn((cursor: number, options?: any) => Promise.resolve(store.scan(cursor, options))),
    ping: jest.fn(() => Promise.resolve(store.ping())),
  }
}

/**
 * Create a shared storage instance for coordinated testing
 * Useful when multiple components need to share the same Redis state
 */
export function createSharedRedisStorage(): MockRedisStorage {
  return new MockRedisStorage()
}

/**
 * Example Usage:
 *
 * ```typescript
 * // Basic usage in a test
 * const mockRedis = createMockRedisClient()
 * await mockRedis.set('key', 'value')
 * const value = await mockRedis.get('key')
 * expect(value).toBe('value')
 *
 * // Shared storage across multiple mocks
 * const storage = createSharedRedisStorage()
 * const client1 = createMockRedisClient(storage)
 * const client2 = createMockRedisClient(storage)
 * await client1.set('shared-key', 'shared-value')
 * const value = await client2.get('shared-key')
 * expect(value).toBe('shared-value')
 *
 * // Verify mock calls
 * expect(mockRedis.get).toHaveBeenCalledWith('key')
 * expect(mockRedis.set).toHaveBeenCalledWith('key', 'value')
 * ```
 */

export default {
  createMockRedisClient,
  createSharedRedisStorage,
}
