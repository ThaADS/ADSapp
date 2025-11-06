/**
 * API Versioning System
 * Handles version negotiation and routing
 */

import { NextRequest } from 'next/server'

export type ApiVersion = 'v1' | 'v2'

export const API_VERSIONS: Record<
  ApiVersion,
  {
    version: string
    status: 'active' | 'deprecated' | 'sunset'
    sunsetDate?: Date
    deprecationWarning?: string
  }
> = {
  v1: {
    version: 'v1',
    status: 'active',
    deprecationWarning: undefined,
  },
  v2: {
    version: 'v2',
    status: 'active',
  },
}

export const DEFAULT_VERSION: ApiVersion = 'v2'
export const SUPPORTED_VERSIONS = Object.keys(API_VERSIONS) as ApiVersion[]

/**
 * Extract API version from request
 * Supports multiple methods:
 * 1. URL path: /api/v2/...
 * 2. Accept header: application/vnd.adsapp.v2+json
 * 3. X-API-Version header: v2
 * 4. Query parameter: ?api_version=v2
 */
export function getApiVersion(request: NextRequest): ApiVersion {
  // Method 1: URL path (most common)
  const pathMatch = request.nextUrl.pathname.match(/\/api\/(v\d+)\//)
  if (pathMatch) {
    const version = pathMatch[1] as ApiVersion
    if (isSupportedVersion(version)) {
      return version
    }
  }

  // Method 2: Accept header with vendor MIME type
  const acceptHeader = request.headers.get('accept')
  if (acceptHeader) {
    const versionMatch = acceptHeader.match(/application\/vnd\.adsapp\.(v\d+)\+json/)
    if (versionMatch) {
      const version = versionMatch[1] as ApiVersion
      if (isSupportedVersion(version)) {
        return version
      }
    }
  }

  // Method 3: X-API-Version header
  const versionHeader = request.headers.get('x-api-version')
  if (versionHeader && isSupportedVersion(versionHeader as ApiVersion)) {
    return versionHeader as ApiVersion
  }

  // Method 4: Query parameter
  const queryVersion = request.nextUrl.searchParams.get('api_version')
  if (queryVersion && isSupportedVersion(queryVersion as ApiVersion)) {
    return queryVersion as ApiVersion
  }

  // Default version
  return DEFAULT_VERSION
}

/**
 * Check if version is supported
 */
export function isSupportedVersion(version: string): boolean {
  return SUPPORTED_VERSIONS.includes(version as ApiVersion)
}

/**
 * Get version metadata
 */
export function getVersionMetadata(version: ApiVersion) {
  return API_VERSIONS[version]
}

/**
 * Check if version is deprecated
 */
export function isDeprecated(version: ApiVersion): boolean {
  return API_VERSIONS[version].status === 'deprecated'
}

/**
 * Check if version is sunset (no longer supported)
 */
export function isSunset(version: ApiVersion): boolean {
  return API_VERSIONS[version].status === 'sunset'
}

/**
 * Get deprecation warning headers
 */
export function getDeprecationHeaders(version: ApiVersion): Record<string, string> {
  const metadata = API_VERSIONS[version]
  const headers: Record<string, string> = {}

  if (metadata.status === 'deprecated') {
    headers['X-API-Deprecation-Warning'] = 'true'
    if (metadata.deprecationWarning) {
      headers['X-API-Deprecation-Message'] = metadata.deprecationWarning
    }
    if (metadata.sunsetDate) {
      headers['X-API-Sunset-Date'] = metadata.sunsetDate.toISOString()
    }
  }

  return headers
}

/**
 * Validate API version and throw error if sunset
 */
export function validateApiVersion(version: ApiVersion): void {
  if (isSunset(version)) {
    throw new Error(`API version ${version} is no longer supported`)
  }
}

/**
 * Get recommended upgrade version
 */
export function getUpgradeVersion(currentVersion: ApiVersion): ApiVersion | null {
  const currentIndex = SUPPORTED_VERSIONS.indexOf(currentVersion)
  if (currentIndex < SUPPORTED_VERSIONS.length - 1) {
    return SUPPORTED_VERSIONS[currentIndex + 1]
  }
  return null
}

/**
 * Version compatibility check
 * Returns true if the feature is available in the given version
 */
export function isFeatureAvailable(feature: string, version: ApiVersion): boolean {
  const featureMatrix: Record<string, ApiVersion[]> = {
    'standardized-responses': ['v2'],
    'hateoas-links': ['v2'],
    'improved-pagination': ['v2'],
    graphql: ['v2'],
    'webhook-v2': ['v2'],
    'event-sourcing': ['v2'],
    cqrs: ['v2'],
  }

  const supportedVersions = featureMatrix[feature]
  return supportedVersions ? supportedVersions.includes(version) : true
}
