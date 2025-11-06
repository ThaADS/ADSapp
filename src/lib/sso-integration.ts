/**
 * SSO Integration System
 * Provides SAML 2.0, OAuth, and enterprise SSO capabilities
 */

// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches

import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'

// Types for SSO configuration
export interface SSOProvider {
  id: string
  name: string
  type: 'saml' | 'oauth' | 'oidc'
  organizationId: string
  isActive: boolean
  config: SAMLConfig | OAuthConfig | OIDCConfig
  createdAt: Date
  updatedAt: Date
}

export interface SAMLConfig {
  entityId: string
  ssoUrl: string
  x509Certificate: string
  signatureAlgorithm: 'RSA-SHA256' | 'RSA-SHA1'
  nameIdFormat: string
  attributeMapping: {
    email: string
    firstName?: string
    lastName?: string
    displayName?: string
    groups?: string
  }
  signAuthnRequests: boolean
  wantAssertionsSigned: boolean
  wantResponseSigned: boolean
}

export interface OAuthConfig {
  clientId: string
  clientSecret: string
  authorizationUrl: string
  tokenUrl: string
  userInfoUrl: string
  scopes: string[]
  provider: 'google' | 'microsoft' | 'github' | 'azure' | 'okta' | 'custom'
  attributeMapping: {
    email: string
    firstName?: string
    lastName?: string
    displayName?: string
    groups?: string
  }
}

export interface OIDCConfig {
  issuer: string
  clientId: string
  clientSecret: string
  discoveryUrl: string
  scopes: string[]
  attributeMapping: {
    email: string
    firstName?: string
    lastName?: string
    displayName?: string
    groups?: string
  }
}

export interface JITProvisioningConfig {
  enabled: boolean
  defaultRole: 'agent' | 'admin'
  groupRoleMapping: Record<string, 'agent' | 'admin' | 'owner'>
  autoAssignToOrganization: boolean
  requireGroupMembership: boolean
  allowedGroups?: string[]
}

export interface SCIMConfig {
  enabled: boolean
  endpoint: string
  bearerToken: string
  supportedOperations: {
    users: boolean
    groups: boolean
    provisioning: boolean
    deprovisioning: boolean
  }
}

// SSO Provider Management
export class SSOProviderManager {
  private supabase: any

  constructor() {
    this.supabase = createClient()
  }

  async createProvider(
    provider: Omit<SSOProvider, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<SSOProvider> {
    const { data, error } = await this.supabase
      .from('sso_providers')
      .insert({
        ...provider,
        config: JSON.stringify(provider.config),
      })
      .select()
      .single()

    if (error) throw error
    return this.parseProvider(data)
  }

  async getProvider(id: string): Promise<SSOProvider | null> {
    const { data, error } = await this.supabase
      .from('sso_providers')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single()

    if (error) return null
    return this.parseProvider(data)
  }

  async getProviderByOrganization(organizationId: string): Promise<SSOProvider[]> {
    const { data, error } = await this.supabase
      .from('sso_providers')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)

    if (error) return []
    return data.map(this.parseProvider)
  }

  async updateProvider(id: string, updates: Partial<SSOProvider>): Promise<SSOProvider> {
    const { data, error } = await this.supabase
      .from('sso_providers')
      .update({
        ...updates,
        config: updates.config ? JSON.stringify(updates.config) : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return this.parseProvider(data)
  }

  async deleteProvider(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('sso_providers')
      .update({ is_active: false })
      .eq('id', id)

    if (error) throw error
  }

  private parseProvider(data: any): SSOProvider {
    return {
      ...data,
      config: JSON.parse(data.config),
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    }
  }
}

// SAML 2.0 Handler
export class SAMLHandler {
  private provider: SSOProvider
  private config: SAMLConfig

  constructor(provider: SSOProvider) {
    this.provider = provider
    this.config = provider.config as SAMLConfig
  }

  generateAuthRequest(relayState?: string): { url: string; id: string } {
    const id = '_' + crypto.randomBytes(16).toString('hex')
    const timestamp = new Date().toISOString()

    const samlRequest = `
      <samlp:AuthnRequest
        xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
        xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
        ID="${id}"
        Version="2.0"
        IssueInstant="${timestamp}"
        Destination="${this.config.ssoUrl}"
        ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
        AssertionConsumerServiceURL="${process.env.NEXT_PUBLIC_APP_URL}/auth/sso/saml/acs"
        IsPassive="false">
        <saml:Issuer>${this.config.entityId}</saml:Issuer>
        <samlp:NameIDPolicy Format="${this.config.nameIdFormat}" AllowCreate="true"/>
      </samlp:AuthnRequest>
    `

    const encodedRequest = Buffer.from(samlRequest).toString('base64')
    const params = new URLSearchParams({
      SAMLRequest: encodedRequest,
      ...(relayState && { RelayState: relayState }),
    })

    return {
      url: `${this.config.ssoUrl}?${params.toString()}`,
      id,
    }
  }

  async validateResponse(samlResponse: string): Promise<{
    valid: boolean
    user?: {
      email: string
      firstName?: string
      lastName?: string
      displayName?: string
      groups?: string[]
    }
    error?: string
  }> {
    try {
      // Decode SAML response
      const decodedResponse = Buffer.from(samlResponse, 'base64').toString('utf-8')

      // Validate signature if required
      if (this.config.wantResponseSigned || this.config.wantAssertionsSigned) {
        const isValid = await this.validateSignature(decodedResponse)
        if (!isValid) {
          return { valid: false, error: 'Invalid signature' }
        }
      }

      // Extract user attributes
      const user = this.extractUserFromSAML(decodedResponse)
      if (!user.email) {
        return { valid: false, error: 'No email found in SAML response' }
      }

      return { valid: true, user }
    } catch (error) {
      return { valid: false, error: 'Failed to validate SAML response' }
    }
  }

  private async validateSignature(samlResponse: string): Promise<boolean> {
    // Implementation would use xmldsig library for signature validation
    // This is a simplified version - in production, use proper SAML library
    return true
  }

  private extractUserFromSAML(samlResponse: string): any {
    // Parse SAML XML and extract attributes based on mapping
    // This is simplified - use proper XML parser in production
    const mapping = this.config.attributeMapping
    return {
      email: 'user@example.com', // Extract from SAML
      firstName: 'John',
      lastName: 'Doe',
      displayName: 'John Doe',
      groups: ['users'],
    }
  }
}

// OAuth Handler
export class OAuthHandler {
  private provider: SSOProvider
  private config: OAuthConfig

  constructor(provider: SSOProvider) {
    this.provider = provider
    this.config = provider.config as OAuthConfig
  }

  generateAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      scope: this.config.scopes.join(' '),
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/auth/sso/oauth/callback`,
      state,
    })

    return `${this.config.authorizationUrl}?${params.toString()}`
  }

  async exchangeCodeForToken(code: string): Promise<{
    access_token: string
    token_type: string
    expires_in?: number
    refresh_token?: string
  }> {
    const response = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/auth/sso/oauth/callback`,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to exchange code for token')
    }

    return response.json()
  }

  async getUserInfo(accessToken: string): Promise<any> {
    const response = await fetch(this.config.userInfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch user info')
    }

    const userInfo = await response.json()
    return this.mapUserAttributes(userInfo)
  }

  private mapUserAttributes(userInfo: any): any {
    const mapping = this.config.attributeMapping
    return {
      email: userInfo[mapping.email],
      firstName: mapping.firstName ? userInfo[mapping.firstName] : undefined,
      lastName: mapping.lastName ? userInfo[mapping.lastName] : undefined,
      displayName: mapping.displayName ? userInfo[mapping.displayName] : undefined,
      groups: mapping.groups ? userInfo[mapping.groups] : undefined,
    }
  }
}

// Just-in-Time User Provisioning
export class JITProvisioning {
  private supabase: any

  constructor() {
    this.supabase = createClient()
  }

  async provisionUser(
    userInfo: any,
    organizationId: string,
    config: JITProvisioningConfig
  ): Promise<{ user: any; profile: any }> {
    if (!config.enabled) {
      throw new Error('JIT provisioning is not enabled')
    }

    // Check group membership if required
    if (config.requireGroupMembership) {
      const userGroups = userInfo.groups || []
      const hasAllowedGroup = config.allowedGroups?.some(group => userGroups.includes(group))

      if (!hasAllowedGroup) {
        throw new Error('User is not a member of allowed groups')
      }
    }

    // Determine user role from group mapping
    const role = this.determineUserRole(userInfo.groups, config)

    // Create or update user in Supabase Auth
    const { data: user, error: authError } = await this.supabase.auth.admin.createUser({
      email: userInfo.email,
      email_confirm: true,
      user_metadata: {
        full_name: userInfo.displayName,
        first_name: userInfo.firstName,
        last_name: userInfo.lastName,
        provider: 'sso',
      },
    })

    if (authError) throw authError

    // Create or update profile
    const { data: profile, error: profileError } = await this.supabase
      .from('profiles')
      .upsert({
        id: user.user.id,
        organization_id: config.autoAssignToOrganization ? organizationId : null,
        email: userInfo.email,
        full_name: userInfo.displayName,
        role: role,
        is_active: true,
      })
      .select()
      .single()

    if (profileError) throw profileError

    return { user: user.user, profile }
  }

  private determineUserRole(groups: string[] = [], config: JITProvisioningConfig): string {
    for (const [group, role] of Object.entries(config.groupRoleMapping)) {
      if (groups.includes(group)) {
        return role
      }
    }
    return config.defaultRole
  }
}

// SCIM Protocol Handler
export class SCIMHandler {
  private config: SCIMConfig
  private supabase: any

  constructor(config: SCIMConfig) {
    this.config = config
    this.supabase = createClient()
  }

  async handleUserProvisioning(scimUser: any): Promise<any> {
    if (!this.config.supportedOperations.provisioning) {
      throw new Error('User provisioning is not supported')
    }

    const userInfo = {
      email: scimUser.emails?.[0]?.value,
      firstName: scimUser.name?.givenName,
      lastName: scimUser.name?.familyName,
      displayName: scimUser.displayName,
      active: scimUser.active,
    }

    // Create user in Supabase
    const { data: user, error } = await this.supabase.auth.admin.createUser({
      email: userInfo.email,
      email_confirm: true,
      user_metadata: {
        full_name: userInfo.displayName,
        first_name: userInfo.firstName,
        last_name: userInfo.lastName,
        provider: 'scim',
      },
    })

    if (error) throw error

    return {
      id: user.user.id,
      userName: userInfo.email,
      emails: [{ value: userInfo.email, primary: true }],
      name: {
        givenName: userInfo.firstName,
        familyName: userInfo.lastName,
      },
      displayName: userInfo.displayName,
      active: userInfo.active,
      meta: {
        resourceType: 'User',
        created: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      },
    }
  }

  async handleUserDeprovisioning(userId: string): Promise<void> {
    if (!this.config.supportedOperations.deprovisioning) {
      throw new Error('User deprovisioning is not supported')
    }

    // Deactivate user
    const { error } = await this.supabase
      .from('profiles')
      .update({ is_active: false })
      .eq('id', userId)

    if (error) throw error
  }

  async handleGroupSync(scimGroup: any): Promise<any> {
    if (!this.config.supportedOperations.groups) {
      throw new Error('Group operations are not supported')
    }

    // Implementation for group synchronization
    return {
      id: crypto.randomUUID(),
      displayName: scimGroup.displayName,
      members: scimGroup.members || [],
      meta: {
        resourceType: 'Group',
        created: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      },
    }
  }
}

// SSO Session Manager
export class SSOSessionManager {
  private supabase: any

  constructor() {
    this.supabase = createClient()
  }

  async createSSOSession(userId: string, providerId: string, sessionData: any): Promise<string> {
    const sessionId = crypto.randomUUID()

    const { error } = await this.supabase.from('sso_sessions').insert({
      id: sessionId,
      user_id: userId,
      provider_id: providerId,
      session_data: sessionData,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    })

    if (error) throw error
    return sessionId
  }

  async validateSSOSession(sessionId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('sso_sessions')
      .select('expires_at')
      .eq('id', sessionId)
      .single()

    if (error || !data) return false
    return new Date(data.expires_at) > new Date()
  }

  async invalidateSSOSession(sessionId: string): Promise<void> {
    const { error } = await this.supabase.from('sso_sessions').delete().eq('id', sessionId)

    if (error) throw error
  }
}

// Main SSO Service
export class SSOService {
  private providerManager: SSOProviderManager
  private jitProvisioning: JITProvisioning
  private sessionManager: SSOSessionManager

  constructor() {
    this.providerManager = new SSOProviderManager()
    this.jitProvisioning = new JITProvisioning()
    this.sessionManager = new SSOSessionManager()
  }

  async initiateSSO(organizationId: string, providerId: string): Promise<string> {
    const provider = await this.providerManager.getProvider(providerId)
    if (!provider || provider.organizationId !== organizationId) {
      throw new Error('Provider not found')
    }

    const state = crypto.randomUUID()

    switch (provider.type) {
      case 'saml':
        const samlHandler = new SAMLHandler(provider)
        const { url } = samlHandler.generateAuthRequest(state)
        return url

      case 'oauth':
      case 'oidc':
        const oauthHandler = new OAuthHandler(provider)
        return oauthHandler.generateAuthUrl(state)

      default:
        throw new Error('Unsupported provider type')
    }
  }

  async handleSSOCallback(
    providerId: string,
    callbackData: any
  ): Promise<{ user: any; profile: any; sessionId: string }> {
    const provider = await this.providerManager.getProvider(providerId)
    if (!provider) {
      throw new Error('Provider not found')
    }

    let userInfo: any

    switch (provider.type) {
      case 'saml':
        const samlHandler = new SAMLHandler(provider)
        const samlResult = await samlHandler.validateResponse(callbackData.SAMLResponse)
        if (!samlResult.valid) {
          throw new Error(samlResult.error || 'SAML validation failed')
        }
        userInfo = samlResult.user
        break

      case 'oauth':
      case 'oidc':
        const oauthHandler = new OAuthHandler(provider)
        const tokens = await oauthHandler.exchangeCodeForToken(callbackData.code)
        userInfo = await oauthHandler.getUserInfo(tokens.access_token)
        break

      default:
        throw new Error('Unsupported provider type')
    }

    // Get JIT configuration for the organization
    const { data: jitConfig } = await this.providerManager.supabase
      .from('sso_jit_configs')
      .select('*')
      .eq('organization_id', provider.organizationId)
      .single()

    // Provision user if JIT is enabled
    const { user, profile } = await this.jitProvisioning.provisionUser(
      userInfo,
      provider.organizationId,
      jitConfig || { enabled: false, defaultRole: 'agent' }
    )

    // Create SSO session
    const sessionId = await this.sessionManager.createSSOSession(user.id, provider.id, {
      userInfo,
      tokens: callbackData,
    })

    return { user, profile, sessionId }
  }

  async getSSOProviders(organizationId: string): Promise<SSOProvider[]> {
    return this.providerManager.getProviderByOrganization(organizationId)
  }
}

// Export singleton instance
export const ssoService = new SSOService()
