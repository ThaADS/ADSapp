/**
 * API V2 Response Builder
 * Standardized response format with HATEOAS support
 */

// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches

import { NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

export interface ApiV2Response<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
    field?: string
  }
  meta: {
    version: string
    timestamp: string
    requestId: string
    processingTime?: number
  }
  links?: {
    self: string
    next?: string
    prev?: string
    first?: string
    last?: string
    related?: Record<string, string>
  }
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface ApiV2ListResponse<T = any> extends ApiV2Response<T[]> {
  pagination: PaginationMeta
}

export interface ResponseBuilderOptions {
  requestId?: string
  startTime?: number
  version?: string
  baseUrl?: string
  endpoint?: string
}

/**
 * Build successful response
 */
export function createV2SuccessResponse<T>(
  data: T,
  options: ResponseBuilderOptions = {},
  status: number = 200
): NextResponse<ApiV2Response<T>> {
  const requestId = options.requestId || uuidv4()
  const processingTime = options.startTime ? Date.now() - options.startTime : undefined

  const response: ApiV2Response<T> = {
    success: true,
    data,
    meta: {
      version: options.version || 'v2',
      timestamp: new Date().toISOString(),
      requestId,
      ...(processingTime !== undefined && { processingTime }),
    },
  }

  // Add HATEOAS links if endpoint provided
  if (options.endpoint) {
    response.links = {
      self: `${options.baseUrl || ''}${options.endpoint}`,
    }
  }

  return NextResponse.json(response, {
    status,
    headers: {
      'X-Request-ID': requestId,
      'X-API-Version': options.version || 'v2',
      ...(processingTime !== undefined && {
        'X-Processing-Time-MS': processingTime.toString(),
      }),
    },
  })
}

/**
 * Build error response
 */
export function createV2ErrorResponse(
  code: string,
  message: string,
  options: ResponseBuilderOptions & {
    details?: any
    field?: string
  } = {},
  status: number = 400
): NextResponse<ApiV2Response> {
  const requestId = options.requestId || uuidv4()
  const processingTime = options.startTime ? Date.now() - options.startTime : undefined

  const response: ApiV2Response = {
    success: false,
    error: {
      code,
      message,
      ...(options.details && { details: options.details }),
      ...(options.field && { field: options.field }),
    },
    meta: {
      version: options.version || 'v2',
      timestamp: new Date().toISOString(),
      requestId,
      ...(processingTime !== undefined && { processingTime }),
    },
  }

  return NextResponse.json(response, {
    status,
    headers: {
      'X-Request-ID': requestId,
      'X-API-Version': options.version || 'v2',
    },
  })
}

/**
 * Build paginated list response
 */
export function createV2ListResponse<T>(
  data: T[],
  pagination: PaginationMeta,
  options: ResponseBuilderOptions = {},
  status: number = 200
): NextResponse<ApiV2ListResponse<T>> {
  const requestId = options.requestId || uuidv4()
  const processingTime = options.startTime ? Date.now() - options.startTime : undefined
  const baseUrl = options.baseUrl || ''
  const endpoint = options.endpoint || ''

  const response: ApiV2ListResponse<T> = {
    success: true,
    data,
    pagination,
    meta: {
      version: options.version || 'v2',
      timestamp: new Date().toISOString(),
      requestId,
      ...(processingTime !== undefined && { processingTime }),
    },
    links: {
      self: `${baseUrl}${endpoint}?page=${pagination.page}&limit=${pagination.limit}`,
      first: `${baseUrl}${endpoint}?page=1&limit=${pagination.limit}`,
      last: `${baseUrl}${endpoint}?page=${pagination.totalPages}&limit=${pagination.limit}`,
    },
  }

  // Add next/prev links
  if (pagination.hasNext) {
    response.links!.next = `${baseUrl}${endpoint}?page=${pagination.page + 1}&limit=${pagination.limit}`
  }
  if (pagination.hasPrev) {
    response.links!.prev = `${baseUrl}${endpoint}?page=${pagination.page - 1}&limit=${pagination.limit}`
  }

  return NextResponse.json(response, {
    status,
    headers: {
      'X-Request-ID': requestId,
      'X-API-Version': options.version || 'v2',
      'X-Total-Count': pagination.total.toString(),
      'X-Total-Pages': pagination.totalPages.toString(),
      'X-Current-Page': pagination.page.toString(),
      ...(processingTime !== undefined && {
        'X-Processing-Time-MS': processingTime.toString(),
      }),
    },
  })
}

/**
 * Build created response (201)
 */
export function createV2CreatedResponse<T>(
  data: T,
  resourceUrl: string,
  options: ResponseBuilderOptions = {}
): NextResponse<ApiV2Response<T>> {
  const response = createV2SuccessResponse(data, options, 201)

  // Add Location header
  const headers = new Headers(response.headers)
  headers.set('Location', resourceUrl)

  // Add created resource link
  const body = response.body as any
  if (body && typeof body === 'object') {
    body.links = {
      self: resourceUrl,
      ...(body.links || {}),
    }
  }

  return new NextResponse(JSON.stringify(body), {
    status: 201,
    headers,
  })
}

/**
 * Build no content response (204)
 */
export function createV2NoContentResponse(options: ResponseBuilderOptions = {}): NextResponse {
  const requestId = options.requestId || uuidv4()

  return new NextResponse(null, {
    status: 204,
    headers: {
      'X-Request-ID': requestId,
      'X-API-Version': options.version || 'v2',
    },
  })
}

/**
 * Build accepted response (202) for async operations
 */
export function createV2AcceptedResponse(
  statusUrl: string,
  options: ResponseBuilderOptions & { estimatedTime?: number } = {}
): NextResponse<ApiV2Response> {
  const requestId = options.requestId || uuidv4()

  const response: ApiV2Response = {
    success: true,
    data: {
      status: 'accepted',
      statusUrl,
      ...(options.estimatedTime && { estimatedCompletionTime: options.estimatedTime }),
    },
    meta: {
      version: options.version || 'v2',
      timestamp: new Date().toISOString(),
      requestId,
    },
    links: {
      self: statusUrl,
      status: statusUrl,
    },
  }

  return NextResponse.json(response, {
    status: 202,
    headers: {
      'X-Request-ID': requestId,
      'X-API-Version': options.version || 'v2',
      Location: statusUrl,
    },
  })
}

/**
 * Common error responses
 */
export const V2Errors = {
  notFound: (resource: string, options?: ResponseBuilderOptions) =>
    createV2ErrorResponse('RESOURCE_NOT_FOUND', `${resource} not found`, options, 404),

  unauthorized: (message: string = 'Authentication required', options?: ResponseBuilderOptions) =>
    createV2ErrorResponse('UNAUTHORIZED', message, options, 401),

  forbidden: (message: string = 'Access denied', options?: ResponseBuilderOptions) =>
    createV2ErrorResponse('FORBIDDEN', message, options, 403),

  badRequest: (message: string, details?: any, options?: ResponseBuilderOptions) =>
    createV2ErrorResponse('BAD_REQUEST', message, { ...options, details }, 400),

  validationError: (field: string, message: string, options?: ResponseBuilderOptions) =>
    createV2ErrorResponse('VALIDATION_ERROR', message, { ...options, field }, 422),

  conflict: (message: string, options?: ResponseBuilderOptions) =>
    createV2ErrorResponse('CONFLICT', message, options, 409),

  tooManyRequests: (retryAfter?: number, options?: ResponseBuilderOptions) => {
    const response = createV2ErrorResponse(
      'RATE_LIMIT_EXCEEDED',
      'Too many requests, please try again later',
      options,
      429
    )

    if (retryAfter) {
      const headers = new Headers(response.headers)
      headers.set('Retry-After', retryAfter.toString())
      return new NextResponse(response.body, { status: 429, headers })
    }

    return response
  },

  internalError: (message: string = 'Internal server error', options?: ResponseBuilderOptions) =>
    createV2ErrorResponse('INTERNAL_ERROR', message, options, 500),

  serviceUnavailable: (
    message: string = 'Service temporarily unavailable',
    options?: ResponseBuilderOptions
  ) => createV2ErrorResponse('SERVICE_UNAVAILABLE', message, options, 503),
}

/**
 * Build HATEOAS links for a resource
 */
export function buildResourceLinks(
  resourceType: string,
  resourceId: string,
  baseUrl: string = ''
): Record<string, string> {
  const links: Record<string, string> = {
    self: `${baseUrl}/api/v2/${resourceType}/${resourceId}`,
  }

  // Add common resource-specific links
  switch (resourceType) {
    case 'conversations':
      links.messages = `${baseUrl}/api/v2/conversations/${resourceId}/messages`
      links.contact = `${baseUrl}/api/v2/contacts`
      break
    case 'contacts':
      links.conversations = `${baseUrl}/api/v2/conversations?contact_id=${resourceId}`
      break
    case 'messages':
      links.conversation = `${baseUrl}/api/v2/conversations`
      break
  }

  return links
}
