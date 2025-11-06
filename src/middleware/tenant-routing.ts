/**
 * Tenant Domain Routing Middleware
 *
 * This middleware handles:
 * - Subdomain routing (tenant.adsapp.com)
 * - Custom domain support
 * - SSL certificate management
 * - Domain verification
 * - Tenant resolution from domain
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Types for domain routing
export interface TenantDomain {
  id: string
  organization_id: string
  domain: string
  subdomain?: string
  domain_type: 'custom' | 'subdomain'
  ssl_status: 'pending' | 'active' | 'expired' | 'failed'
  verification_status: 'pending' | 'verified' | 'failed'
  is_active: boolean
  is_primary: boolean
}

export interface TenantContext {
  organizationId: string
  subdomain?: string
  customDomain?: string
  isCustomDomain: boolean
  branding?: {
    logo?: string
    companyName?: string
    primaryColor: string
    favicon?: string
  }
}

export class TenantRouter {
  private supabase: SupabaseClient
  private mainDomain: string

  constructor(supabaseUrl: string, supabaseKey: string, mainDomain: string = 'adsapp.com') {
    this.supabase = createClient(supabaseUrl, supabaseKey)
    this.mainDomain = mainDomain
  }

  /**
   * Main middleware function for Next.js
   */
  async middleware(request: NextRequest): Promise<NextResponse> {
    const url = request.nextUrl.clone()
    const hostname = request.headers.get('host') || ''

    try {
      // Extract tenant context from domain
      const tenantContext = await this.resolveTenant(hostname)

      if (!tenantContext) {
        // No tenant found - could be main site or invalid domain
        return this.handleMainSite(request, url)
      }

      // Add tenant context to headers for downstream processing
      const response = this.addTenantHeaders(request, url, tenantContext)

      // Handle custom domain SSL and redirects
      if (tenantContext.isCustomDomain) {
        return this.handleCustomDomain(request, url, tenantContext)
      }

      return response
    } catch (error) {
      console.error('Tenant routing error:', error)

      // Fallback to main site on error
      return this.handleMainSite(request, url)
    }
  }

  /**
   * Resolve tenant from hostname
   */
  async resolveTenant(hostname: string): Promise<TenantContext | null> {
    // Remove port if present
    const domain = hostname.split(':')[0]

    // Check if it's a subdomain of the main domain
    if (domain.endsWith(`.${this.mainDomain}`)) {
      const subdomain = domain.replace(`.${this.mainDomain}`, '')

      if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
        return this.resolveSubdomain(subdomain)
      }
    }

    // Check for custom domain
    return this.resolveCustomDomain(domain)
  }

  /**
   * Resolve tenant by subdomain
   */
  private async resolveSubdomain(subdomain: string): Promise<TenantContext | null> {
    const { data, error } = await this.supabase
      .from('tenant_domains')
      .select(
        `
        *,
        organizations!inner(id, name),
        tenant_branding(logo_url, company_name, primary_color, favicon_url)
      `
      )
      .eq('subdomain', subdomain)
      .eq('domain_type', 'subdomain')
      .eq('is_active', true)
      .single()

    if (error || !data) {
      // Fallback: check organizations table for legacy support
      const { data: orgData, error: orgError } = await this.supabase
        .from('organizations')
        .select(
          `
          id,
          name,
          tenant_branding(logo_url, company_name, primary_color, favicon_url)
        `
        )
        .eq('subdomain', subdomain)
        .single()

      if (orgError || !orgData) {
        return null
      }

      return {
        organizationId: orgData.id,
        subdomain,
        isCustomDomain: false,
        branding: orgData.tenant_branding?.[0]
          ? {
              logo: orgData.tenant_branding[0].logo_url,
              companyName: orgData.tenant_branding[0].company_name || orgData.name,
              primaryColor: orgData.tenant_branding[0].primary_color || '#3B82F6',
              favicon: orgData.tenant_branding[0].favicon_url,
            }
          : undefined,
      }
    }

    return {
      organizationId: data.organization_id,
      subdomain,
      isCustomDomain: false,
      branding: data.tenant_branding
        ? {
            logo: data.tenant_branding.logo_url,
            companyName: data.tenant_branding.company_name || data.organizations.name,
            primaryColor: data.tenant_branding.primary_color || '#3B82F6',
            favicon: data.tenant_branding.favicon_url,
          }
        : undefined,
    }
  }

  /**
   * Resolve tenant by custom domain
   */
  private async resolveCustomDomain(domain: string): Promise<TenantContext | null> {
    const { data, error } = await this.supabase
      .from('tenant_domains')
      .select(
        `
        *,
        organizations!inner(id, name),
        tenant_branding(logo_url, company_name, primary_color, favicon_url)
      `
      )
      .eq('domain', domain)
      .eq('domain_type', 'custom')
      .eq('is_active', true)
      .eq('verification_status', 'verified')
      .single()

    if (error || !data) {
      // Check organizations table for legacy custom domain support
      const { data: orgData, error: orgError } = await this.supabase
        .from('organizations')
        .select(
          `
          id,
          name,
          tenant_branding(logo_url, company_name, primary_color, favicon_url)
        `
        )
        .eq('custom_domain', domain)
        .single()

      if (orgError || !orgData) {
        return null
      }

      return {
        organizationId: orgData.id,
        customDomain: domain,
        isCustomDomain: true,
        branding: orgData.tenant_branding?.[0]
          ? {
              logo: orgData.tenant_branding[0].logo_url,
              companyName: orgData.tenant_branding[0].company_name || orgData.name,
              primaryColor: orgData.tenant_branding[0].primary_color || '#3B82F6',
              favicon: orgData.tenant_branding[0].favicon_url,
            }
          : undefined,
      }
    }

    return {
      organizationId: data.organization_id,
      customDomain: domain,
      isCustomDomain: true,
      branding: data.tenant_branding
        ? {
            logo: data.tenant_branding.logo_url,
            companyName: data.tenant_branding.company_name || data.organizations.name,
            primaryColor: data.tenant_branding.primary_color || '#3B82F6',
            favicon: data.tenant_branding.favicon_url,
          }
        : undefined,
    }
  }

  /**
   * Add tenant context to request headers
   */
  private addTenantHeaders(
    request: NextRequest,
    url: URL,
    tenantContext: TenantContext
  ): NextResponse {
    // Rewrite the URL to include tenant context
    if (tenantContext.subdomain) {
      url.pathname = `/tenant/${tenantContext.organizationId}${url.pathname}`
    }

    const response = NextResponse.rewrite(url)

    // Add tenant context headers
    response.headers.set('x-tenant-id', tenantContext.organizationId)
    response.headers.set('x-tenant-subdomain', tenantContext.subdomain || '')
    response.headers.set('x-tenant-custom-domain', tenantContext.customDomain || '')
    response.headers.set('x-tenant-is-custom-domain', tenantContext.isCustomDomain.toString())

    // Add branding headers if available
    if (tenantContext.branding) {
      response.headers.set('x-tenant-logo', tenantContext.branding.logo || '')
      response.headers.set('x-tenant-company-name', tenantContext.branding.companyName || '')
      response.headers.set('x-tenant-primary-color', tenantContext.branding.primaryColor)
      response.headers.set('x-tenant-favicon', tenantContext.branding.favicon || '')
    }

    return response
  }

  /**
   * Handle custom domain specific logic
   */
  private handleCustomDomain(
    request: NextRequest,
    url: URL,
    tenantContext: TenantContext
  ): NextResponse {
    // Force HTTPS for custom domains
    if (request.nextUrl.protocol === 'http:' && process.env.NODE_ENV === 'production') {
      url.protocol = 'https:'
      return NextResponse.redirect(url)
    }

    // Handle www redirect
    if (url.hostname.startsWith('www.')) {
      url.hostname = url.hostname.replace('www.', '')
      return NextResponse.redirect(url)
    }

    return this.addTenantHeaders(request, url, tenantContext)
  }

  /**
   * Handle main site (no tenant)
   */
  private handleMainSite(request: NextRequest, url: URL): NextResponse {
    const hostname = url.hostname

    // For localhost development, always allow through
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('localhost:') ||
      hostname.startsWith('127.0.0.1:')
    ) {
      return NextResponse.next()
    }

    // If requesting main domain, continue normally
    if (hostname === this.mainDomain || hostname === `www.${this.mainDomain}`) {
      // Redirect www to non-www
      if (hostname.startsWith('www.')) {
        url.hostname = this.mainDomain
        return NextResponse.redirect(url)
      }
      return NextResponse.next()
    }

    // For development, don't redirect unknown domains
    if (process.env.NODE_ENV !== 'production') {
      return NextResponse.next()
    }

    // Unknown domain - redirect to main site (production only)
    url.hostname = this.mainDomain
    url.pathname = '/404'
    return NextResponse.redirect(url)
  }
}

/**
 * Domain management utilities
 */
export class DomainManager {
  private supabase

  constructor(supabaseClient: ReturnType<typeof createClient>) {
    this.supabase = supabaseClient
  }

  /**
   * Add a custom domain for a tenant
   */
  async addCustomDomain(
    organizationId: string,
    domain: string,
    isPrimary: boolean = false
  ): Promise<TenantDomain | null> {
    // Generate verification token
    const verificationToken = this.generateVerificationToken()

    const { data, error } = await this.supabase
      .from('tenant_domains')
      .insert({
        organization_id: organizationId,
        domain,
        domain_type: 'custom',
        verification_token: verificationToken,
        is_primary: isPrimary,
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding custom domain:', error)
      return null
    }

    return data
  }

  /**
   * Add a subdomain for a tenant
   */
  async addSubdomain(organizationId: string, subdomain: string): Promise<TenantDomain | null> {
    const { data, error } = await this.supabase
      .from('tenant_domains')
      .insert({
        organization_id: organizationId,
        subdomain,
        domain: `${subdomain}.adsapp.com`,
        domain_type: 'subdomain',
        verification_status: 'verified', // Subdomains are automatically verified
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding subdomain:', error)
      return null
    }

    return data
  }

  /**
   * Verify domain ownership
   */
  async verifyDomain(domainId: string): Promise<boolean> {
    const { data: domain, error } = await this.supabase
      .from('tenant_domains')
      .select('*')
      .eq('id', domainId)
      .single()

    if (error || !domain) {
      return false
    }

    // Perform DNS verification
    const isVerified = await this.performDNSVerification(domain)

    if (isVerified) {
      await this.supabase
        .from('tenant_domains')
        .update({
          verification_status: 'verified',
          is_active: true,
          last_verified_at: new Date().toISOString(),
        })
        .eq('id', domainId)
    }

    return isVerified
  }

  /**
   * Perform DNS verification
   */
  private async performDNSVerification(domain: TenantDomain): Promise<boolean> {
    try {
      // In a real implementation, you would use DNS lookup libraries
      // For now, we'll simulate the verification

      // Check if domain points to our servers
      const dnsRecord = await this.lookupDNS(domain.domain)

      return dnsRecord.includes(process.env.APP_IP || '')
    } catch (error) {
      console.error('DNS verification failed:', error)
      return false
    }
  }

  /**
   * Mock DNS lookup (replace with real DNS library in production)
   */
  private async lookupDNS(_domain: string): Promise<string> {
    // Mock implementation - replace with actual DNS lookup
    // Using a library like 'dns' or 'node-dns'
    return Promise.resolve('')
  }

  /**
   * Generate verification token
   */
  private generateVerificationToken(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }

  /**
   * Get DNS records needed for verification
   */
  getDNSRecords(
    domain: string,
    verificationToken: string
  ): {
    type: string
    name: string
    value: string
    description: string
  }[] {
    const appIP = process.env.APP_IP || '76.76.19.19' // Vercel's IP

    return [
      {
        type: 'A',
        name: domain,
        value: appIP,
        description: 'Points your domain to our servers',
      },
      {
        type: 'CNAME',
        name: 'www',
        value: domain,
        description: 'Redirects www to your main domain',
      },
      {
        type: 'TXT',
        name: '_adsapp-verification',
        value: verificationToken,
        description: 'Verification record to prove domain ownership',
      },
    ]
  }

  /**
   * Remove domain
   */
  async removeDomain(domainId: string): Promise<boolean> {
    const { error } = await this.supabase.from('tenant_domains').delete().eq('id', domainId)

    return !error
  }

  /**
   * Set primary domain
   */
  async setPrimaryDomain(organizationId: string, domainId: string): Promise<boolean> {
    // First, unset current primary
    await this.supabase
      .from('tenant_domains')
      .update({ is_primary: false })
      .eq('organization_id', organizationId)

    // Set new primary
    const { error } = await this.supabase
      .from('tenant_domains')
      .update({ is_primary: true })
      .eq('id', domainId)

    return !error
  }

  /**
   * List domains for organization
   */
  async listDomains(organizationId: string): Promise<TenantDomain[]> {
    const { data, error } = await this.supabase
      .from('tenant_domains')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error listing domains:', error)
      return []
    }

    return data || []
  }
}

/**
 * Middleware configuration helper
 */
export function createTenantMiddleware(config: {
  supabaseUrl: string
  supabaseKey: string
  mainDomain?: string
}) {
  const router = new TenantRouter(config.supabaseUrl, config.supabaseKey, config.mainDomain)

  return async function middleware(request: NextRequest) {
    return router.middleware(request)
  }
}

/**
 * Utility functions for tenant context
 */
export const tenantUtils = {
  /**
   * Extract tenant context from headers (for use in API routes)
   */
  getTenantContext(headers: Headers): TenantContext | null {
    const organizationId = headers.get('x-tenant-id')
    if (!organizationId) return null

    return {
      organizationId,
      subdomain: headers.get('x-tenant-subdomain') || undefined,
      customDomain: headers.get('x-tenant-custom-domain') || undefined,
      isCustomDomain: headers.get('x-tenant-is-custom-domain') === 'true',
      branding: {
        logo: headers.get('x-tenant-logo') || undefined,
        companyName: headers.get('x-tenant-company-name') || undefined,
        primaryColor: headers.get('x-tenant-primary-color') || '#3B82F6',
        favicon: headers.get('x-tenant-favicon') || undefined,
      },
    }
  },

  /**
   * Generate tenant URL
   */
  generateTenantUrl(
    subdomain: string,
    path: string = '',
    mainDomain: string = 'adsapp.com'
  ): string {
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    return `${protocol}://${subdomain}.${mainDomain}${path}`
  },

  /**
   * Validate subdomain format
   */
  isValidSubdomain(subdomain: string): boolean {
    const pattern = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/
    return (
      pattern.test(subdomain) &&
      subdomain.length >= 3 &&
      subdomain.length <= 63 &&
      !['www', 'api', 'admin', 'app', 'mail', 'ftp'].includes(subdomain)
    )
  },

  /**
   * Validate custom domain format
   */
  isValidDomain(domain: string): boolean {
    const pattern = /^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/
    return pattern.test(domain) && domain.length <= 253
  },
}

export default TenantRouter
