/**
 * Redis Mock Factory
 *
 * Mocking utilities for Redis/Upstash cache operations.
 */

import { Redis } from '@upstash/redis'

// =============================================================================
// Mock Redis Client
// =============================================================================

export function createMockRedisClient(): jest.Mocked<Partial<Redis>> {
  const store = new Map<string, string>()

  return {
    get: jest.fn(async (key: string) => store.get(key) || null),
    set: jest.fn(async (key: string, value: any) => {
      store.set(key, JSON.stringify(value))
      return 'OK'
    }),
    setex: jest.fn(async (key: string, seconds: number, value: any) => {
      store.set(key, JSON.stringify(value))
      return 'OK'
    }),
    del: jest.fn(async (...keys: string[]) => {
      keys.forEach((key) => store.delete(key))
      return keys.length
    }),
    exists: jest.fn(async (...keys: string[]) => {
      return keys.filter((key) => store.has(key)).length
    }),
    expire: jest.fn(async (key: string, seconds: number) => {
      return store.has(key) ? 1 : 0
    }),
    ttl: jest.fn(async (key: string) => {
      return store.has(key) ? 300 : -2
    }),
    incr: jest.fn(async (key: string) => {
      const value = parseInt(store.get(key) || '0') + 1
      store.set(key, value.toString())
      return value
    }),
    decr: jest.fn(async (key: string) => {
      const value = parseInt(store.get(key) || '0') - 1
      store.set(key, value.toString())
      return value
    }),
    keys: jest.fn(async (pattern: string) => {
      return Array.from(store.keys()).filter((key) =>
        new RegExp(pattern.replace('*', '.*')).test(key)
      )
    }),
    flushdb: jest.fn(async () => {
      store.clear()
      return 'OK'
    }),
    hget: jest.fn(async (key: string, field: string) => {
      const hash = JSON.parse(store.get(key) || '{}')
      return hash[field] || null
    }),
    hset: jest.fn(async (key: string, field: string, value: any) => {
      const hash = JSON.parse(store.get(key) || '{}')
      hash[field] = value
      store.set(key, JSON.stringify(hash))
      return 1
    }),
    hdel: jest.fn(async (key: string, ...fields: string[]) => {
      const hash = JSON.parse(store.get(key) || '{}')
      fields.forEach((field) => delete hash[field])
      store.set(key, JSON.stringify(hash))
      return fields.length
    }),
    hgetall: jest.fn(async (key: string) => {
      return JSON.parse(store.get(key) || '{}')
    }),
  } as any
}

// =============================================================================
// Export
// =============================================================================

export default {
  createMockRedisClient,
}
