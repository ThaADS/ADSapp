/**
 * Shared test helpers for API integration tests
 */

import { mockApiRequest } from '../../utils/api-test-helpers'

export async function parseResponse(response: any) {
  const text = await response.text()
  let data: any
  try {
    data = JSON.parse(text)
  } catch {
    data = text
  }
  return { status: response.status, data, headers: response.headers }
}

export function expectErrorResponse(data: any, status?: number, message?: string) {
  expect(data).toHaveProperty('error')
  if (status) {
    const actualStatus = data.statusCode || data.status || status
    expect(actualStatus).toBe(status)
  }
  if (message) {
    const errorMsg = data.message || data.error
    expect(errorMsg).toContain(message)
  }
}

export function expectPaginatedResponse(data: any) {
  expect(data).toHaveProperty('pagination')
  expect(data.pagination).toHaveProperty('page')
  expect(data.pagination).toHaveProperty('limit')
  expect(data.pagination).toHaveProperty('total')
}

export function createMockRequest(
  method: string,
  url: string,
  body?: any,
  headers?: Record<string, string>
) {
  return mockApiRequest({
    method,
    url,
    body,
    headers,
  })
}

export function createPaginatedUrl(
  baseUrl: string,
  params: { page?: number; limit?: number; sort?: string; order?: string }
) {
  const url = new URL(baseUrl, 'http://localhost:3000')
  if (params.page) url.searchParams.set('page', params.page.toString())
  if (params.limit) url.searchParams.set('limit', params.limit.toString())
  if (params.sort) url.searchParams.set('sort', params.sort)
  if (params.order) url.searchParams.set('order', params.order)
  return url.toString()
}
