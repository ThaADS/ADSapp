/**
 * SSO Type Definitions
 * Comprehensive type system for Single Sign-On implementation
 */

import { Database } from '@/types/database';

// Database types
export type SSOConfiguration = Database['public']['Tables']['sso_configurations']['Row'];
export type SSOSession = Database['public']['Tables']['sso_sessions']['Row'];
export type SSOAuditLog = Database['public']['Tables']['sso_audit_logs']['Row'];

// Provider Types
export type ProviderType = 'saml' | 'oauth' | 'oidc';
export type ProviderName =
  | 'azure_ad'
  | 'okta'
  | 'google_workspace'
  | 'onelogin'
  | 'google'
  | 'microsoft'
  | 'github'
  | 'gitlab'
  | 'custom';

export type UserRole = 'owner' | 'admin' | 'agent';

// SAML Configuration
export interface SAMLConfig {
  entityId: string;
  ssoUrl: string;
  sloUrl?: string;
  certificate: string;
  signRequests?: boolean;
  wantAssertionsSigned?: boolean;
  nameIdFormat?: string;
}

// OAuth Configuration
export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl?: string;
  jwksUrl?: string;
  scopes?: string[];
  pkceEnabled?: boolean;
}

// Attribute Mapping
export interface AttributeMapping {
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  groups?: string;
  department?: string;
  title?: string;
  [key: string]: string | undefined;
}

// Role Mapping
export interface RoleMapping {
  default: UserRole;
  rules: RoleMappingRule[];
}

export interface RoleMappingRule {
  condition: {
    attribute: string; // e.g., 'groups'
    operator: 'contains' | 'equals' | 'matches' | 'in';
    value: string | string[];
  };
  role: UserRole;
  priority: number; // Higher priority rules are evaluated first
}

// SAML Assertion
export interface SAMLAssertion {
  nameId: string;
  nameIdFormat: string;
  sessionIndex?: string;
  attributes: Record<string, string | string[]>;
  issuer: string;
  audience?: string;
  notBefore?: Date;
  notOnOrAfter?: Date;
  inResponseTo?: string;
}

// OAuth Token Response
export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
  scope?: string;
}

// OIDC UserInfo
export interface OIDCUserInfo {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
  [key: string]: unknown;
}

// SSO Login Request
export interface SSOLoginRequest {
  organizationId: string;
  providerId?: string;
  relayState?: string;
  forceAuthn?: boolean;
}

// SSO Login Response
export interface SSOLoginResponse {
  success: boolean;
  redirectUrl?: string;
  error?: SSOError;
  sessionId?: string;
}

// SSO Callback Request
export interface SSOCallbackRequest {
  provider: ProviderName;
  code?: string;
  state?: string;
  samlResponse?: string;
  relayState?: string;
}

// SSO User Profile
export interface SSOUserProfile {
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  groups?: string[];
  attributes: Record<string, unknown>;
  providerId: string;
  providerSessionId?: string;
}

// JIT Provisioning Configuration
export interface JITProvisioningConfig {
  enabled: boolean;
  autoCreateUsers: boolean;
  autoUpdateUsers: boolean;
  defaultRole: UserRole;
}

// SSO Error Types
export type SSOErrorCode =
  | 'CONFIG_NOT_FOUND'
  | 'CONFIG_DISABLED'
  | 'INVALID_ASSERTION'
  | 'SIGNATURE_VERIFICATION_FAILED'
  | 'INVALID_OAUTH_STATE'
  | 'TOKEN_EXCHANGE_FAILED'
  | 'USER_INFO_FETCH_FAILED'
  | 'INVALID_CREDENTIALS'
  | 'SESSION_EXPIRED'
  | 'PROVISIONING_FAILED'
  | 'ROLE_MAPPING_FAILED'
  | 'UNKNOWN_ERROR';

export interface SSOError {
  code: SSOErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

// SSO Audit Event Types
export type SSOEventType =
  | 'config_created'
  | 'config_updated'
  | 'config_deleted'
  | 'config_tested'
  | 'login_initiated'
  | 'login_success'
  | 'login_failed'
  | 'logout_initiated'
  | 'logout_success'
  | 'logout_failed'
  | 'token_refreshed'
  | 'session_expired'
  | 'user_provisioned'
  | 'user_updated'
  | 'role_mapped'
  | 'assertion_validated'
  | 'signature_verified'
  | 'error_occurred';

export interface SSOAuditEvent {
  organizationId: string;
  userId?: string;
  ssoConfigId?: string;
  eventType: SSOEventType;
  userEmail?: string;
  userName?: string;
  providerType?: ProviderType;
  providerName?: ProviderName;
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

// PKCE Configuration
export interface PKCEConfig {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256' | 'plain';
}

// Session Configuration
export interface SessionConfig {
  durationMinutes: number;
  forceAuthn: boolean;
  allowIdpInitiated: boolean;
}

// SSO Provider Metadata
export interface ProviderMetadata {
  name: ProviderName;
  displayName: string;
  type: ProviderType;
  logo?: string;
  documentation?: string;
  defaultScopes?: string[];
  requiredClaims?: string[];
  supportedNameIdFormats?: string[];
}

// Configuration Test Result
export interface ConfigTestResult {
  success: boolean;
  timestamp: Date;
  error?: SSOError;
  metadata?: {
    certificateValid?: boolean;
    urlsAccessible?: boolean;
    metadataValid?: boolean;
  };
}

// SP (Service Provider) Metadata for SAML
export interface SPMetadata {
  entityId: string;
  assertionConsumerServiceUrl: string;
  singleLogoutServiceUrl?: string;
  certificate?: string;
  wantAssertionsSigned: boolean;
  nameIdFormat: string[];
}

// Token Validation Result
export interface TokenValidationResult {
  valid: boolean;
  claims?: Record<string, unknown>;
  error?: SSOError;
}

// Utility Types
export interface CreateSSOConfigRequest {
  organizationId: string;
  providerType: ProviderType;
  providerName: ProviderName;
  displayName: string;
  samlConfig?: SAMLConfig;
  oauthConfig?: OAuthConfig;
  attributeMappings?: AttributeMapping;
  roleMappings?: RoleMapping;
  jitProvisioning?: JITProvisioningConfig;
  sessionConfig?: SessionConfig;
}

export interface UpdateSSOConfigRequest extends Partial<CreateSSOConfigRequest> {
  id: string;
  enabled?: boolean;
}

export interface SSOConfigResponse {
  id: string;
  organizationId: string;
  provider: {
    type: ProviderType;
    name: ProviderName;
    displayName: string;
  };
  enabled: boolean;
  jitProvisioning: JITProvisioningConfig;
  attributeMappings: AttributeMapping;
  roleMappings: RoleMapping;
  sessionConfig: SessionConfig;
  createdAt: string;
  updatedAt: string;
  lastTestedAt?: string;
  lastTestResult?: ConfigTestResult;
}

// SSO Statistics
export interface SSOStatistics {
  organizationId: string;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    totalLogins: number;
    successfulLogins: number;
    failedLogins: number;
    uniqueUsers: number;
    averageSessionDuration: number;
    topErrors: Array<{
      code: SSOErrorCode;
      count: number;
    }>;
  };
  byProvider: Record<
    string,
    {
      logins: number;
      successRate: number;
    }
  >;
}
