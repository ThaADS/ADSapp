/**
 * API V2 Pagination Utilities
 * Improved pagination with cursor-based support
 */

import { NextRequest } from 'next/server'
import { PaginationMeta } from './response'

export interface PaginationParams {
  page: number
  limit: number
  offset: number
}

export interface CursorPaginationParams {
  limit: number
  cursor?: string
  direction?: 'forward' | 'backward'
}

export interface CursorPaginationResult<T> {
  data: T[]
  hasNext: boolean
  hasPrev: boolean
  nextCursor?: string
  prevCursor?: string
}

/**
 * Extract and validate offset-based pagination parameters
 */
export function extractPaginationParams(request: NextRequest): PaginationParams {
  const { searchParams } = new URL(request.url)

  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
  const offset = (page - 1) * limit

  return { page, limit, offset }
}

/**
 * Extract cursor-based pagination parameters
 */
export function extractCursorParams(request: NextRequest): CursorPaginationParams {
  const { searchParams } = new URL(request.url)

  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
  const cursor = searchParams.get('cursor') || undefined
  const direction = (searchParams.get('direction') as 'forward' | 'backward') || 'forward'

  return { limit, cursor, direction }
}

/**
 * Build pagination metadata from query result
 */
export function buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  const totalPages = Math.ceil(total / limit)

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  }
}

/**
 * Encode cursor for pagination
 */
export function encodeCursor(data: Record<string, any>): string {
  return Buffer.from(JSON.stringify(data)).toString('base64url')
}

/**
 * Decode cursor for pagination
 */
export function decodeCursor(cursor: string): Record<string, any> {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'))
  } catch (error) {
    throw new Error('Invalid cursor')
  }
}

/**
 * Build cursor pagination result
 */
export function buildCursorPaginationResult<T extends Record<string, any>>(
  data: T[],
  limit: number,
  cursorField: keyof T = 'id'
): CursorPaginationResult<T> {
  const hasNext = data.length > limit
  const hasPrev = false // Would need to track in actual implementation

  // Remove extra item used for hasNext check
  const items = hasNext ? data.slice(0, limit) : data

  const nextCursor =
    hasNext && items.length > 0
      ? encodeCursor({ [cursorField]: items[items.length - 1][cursorField] })
      : undefined

  const prevCursor =
    hasPrev && items.length > 0 ? encodeCursor({ [cursorField]: items[0][cursorField] }) : undefined

  return {
    data: items,
    hasNext,
    hasPrev,
    nextCursor,
    prevCursor,
  }
}

/**
 * Build Supabase query with cursor pagination
 */
export function applyCursorPagination<T>(
  query: any,
  params: CursorPaginationParams,
  cursorField: string = 'created_at',
  idField: string = 'id'
) {
  let paginatedQuery = query

  // Apply cursor filter if provided
  if (params.cursor) {
    const cursorData = decodeCursor(params.cursor)
    const operator = params.direction === 'backward' ? 'lt' : 'gt'

    if (cursorData[cursorField]) {
      paginatedQuery = paginatedQuery[operator](cursorField, cursorData[cursorField])
    }
  }

  // Apply limit + 1 to check for more results
  paginatedQuery = paginatedQuery.limit(params.limit + 1)

  // Apply ordering
  const ascending = params.direction === 'backward'
  paginatedQuery = paginatedQuery.order(cursorField, { ascending })

  return paginatedQuery
}

/**
 * Extract sort parameters from request
 */
export interface SortParams {
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

export function extractSortParams(
  request: NextRequest,
  allowedFields: string[],
  defaultField: string = 'created_at',
  defaultOrder: 'asc' | 'desc' = 'desc'
): SortParams {
  const { searchParams } = new URL(request.url)

  const sortBy = searchParams.get('sort_by') || searchParams.get('sortBy') || defaultField
  const sortOrder = (searchParams.get('sort_order') ||
    searchParams.get('sortOrder') ||
    defaultOrder) as 'asc' | 'desc'

  // Validate sort field
  if (!allowedFields.includes(sortBy)) {
    throw new Error(`Invalid sort field: ${sortBy}. Allowed: ${allowedFields.join(', ')}`)
  }

  // Validate sort order
  if (!['asc', 'desc'].includes(sortOrder)) {
    throw new Error('Invalid sort order. Must be "asc" or "desc"')
  }

  return { sortBy, sortOrder }
}

/**
 * Extract filter parameters from request
 */
export function extractFilters(
  request: NextRequest,
  allowedFilters: string[]
): Record<string, any> {
  const { searchParams } = new URL(request.url)
  const filters: Record<string, any> = {}

  for (const filter of allowedFilters) {
    const value = searchParams.get(filter)
    if (value !== null) {
      filters[filter] = value
    }
  }

  return filters
}

/**
 * Apply filters to Supabase query
 */
export function applyFilters(
  query: any,
  filters: Record<string, any>,
  filterConfig: Record<
    string,
    {
      operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in'
      transform?: (value: any) => any
    }
  > = {}
) {
  let filteredQuery = query

  for (const [key, value] of Object.entries(filters)) {
    const config = filterConfig[key] || {}
    const operator = config.operator || 'eq'
    const transformedValue = config.transform ? config.transform(value) : value

    switch (operator) {
      case 'eq':
        filteredQuery = filteredQuery.eq(key, transformedValue)
        break
      case 'neq':
        filteredQuery = filteredQuery.neq(key, transformedValue)
        break
      case 'gt':
        filteredQuery = filteredQuery.gt(key, transformedValue)
        break
      case 'gte':
        filteredQuery = filteredQuery.gte(key, transformedValue)
        break
      case 'lt':
        filteredQuery = filteredQuery.lt(key, transformedValue)
        break
      case 'lte':
        filteredQuery = filteredQuery.lte(key, transformedValue)
        break
      case 'like':
        filteredQuery = filteredQuery.like(key, transformedValue)
        break
      case 'ilike':
        filteredQuery = filteredQuery.ilike(key, transformedValue)
        break
      case 'in':
        filteredQuery = filteredQuery.in(
          key,
          Array.isArray(transformedValue) ? transformedValue : [transformedValue]
        )
        break
    }
  }

  return filteredQuery
}

/**
 * Build search query
 */
export function buildSearchQuery(query: any, searchTerm: string, searchFields: string[]) {
  if (!searchTerm || searchFields.length === 0) {
    return query
  }

  // Build OR condition for each search field
  return query.or(searchFields.map(field => `${field}.ilike.%${searchTerm}%`).join(','))
}
