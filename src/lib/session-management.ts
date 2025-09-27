/**
 * Session Management and Security Monitoring System
 * Active session tracking, device management, suspicious activity detection
 */

import { createClient } from '@/lib/supabase/server'
import { createClient as createClientClient } from '@/lib/supabase/client'
import { headers } from 'next/headers'
import crypto from 'crypto'

// Types for session management
export interface UserSession {
  id: string
  userId: string
  organizationId: string
  sessionToken: string
  deviceInfo: DeviceInfo
  location: LocationInfo
  status: 'active' | 'expired' | 'terminated' | 'suspicious'
  createdAt: Date
  lastActivity: Date
  expiresAt: Date
  ipAddress: string
  userAgent: string
  isCurrentSession: boolean
  riskScore: number
  flags: SessionFlag[]
}

export interface DeviceInfo {
  deviceId: string
  deviceName: string
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown'
  browser: string
  browserVersion: string
  os: string
  osVersion: string
  screenResolution: string
  timezone: string
  language: string
  isTrusted: boolean
  lastSeen: Date
}

export interface LocationInfo {
  country: string
  region: string
  city: string
  latitude?: number
  longitude?: number
  timezone: string
  isp: string
  organization: string
  isVpn: boolean
  isTor: boolean
  isProxy: boolean
  threatLevel: 'low' | 'medium' | 'high' | 'critical'
}

export interface SessionFlag {
  type: 'unusual_location' | 'new_device' | 'suspicious_activity' | 'concurrent_sessions' | 'security_violation'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  detectedAt: Date
  resolved: boolean
  resolvedAt?: Date
  resolvedBy?: string
}

export interface SessionConfiguration {
  organizationId: string
  maxConcurrentSessions: number
  sessionTimeoutMinutes: number
  inactivityTimeoutMinutes: number
  requireDeviceAuthentication: boolean
  allowRemoteAccess: boolean
  enableLocationTracking: boolean
  enableSuspiciousActivityDetection: boolean
  autoTerminateSuspiciousSessions: boolean
  notifyOnNewDevice: boolean
  notifyOnUnusualLocation: boolean
  trustedNetworks: string[] // CIDR blocks
  blockedCountries: string[]
  allowedCountries: string[]
  maxFailedLocationAttempts: number
  deviceTrustExpirationDays: number
}

export interface SecurityEvent {
  id: string
  userId: string
  organizationId: string
  sessionId?: string
  eventType: 'login' | 'logout' | 'session_created' | 'session_terminated' | 'suspicious_activity' | 'device_registered' | 'location_change'
  severity: 'info' | 'warning' | 'error' | 'critical'
  description: string
  metadata: Record<string, any>
  ipAddress: string
  userAgent: string
  location: LocationInfo
  createdAt: Date
}

// Session Manager Class
export class SessionManager {
  private supabase: any
  private ipApiKey: string

  constructor() {
    this.supabase = createClient()
    this.ipApiKey = process.env.IP_API_KEY || ''
  }

  // Session Creation and Management
  async createSession(
    userId: string,
    organizationId: string,
    deviceInfo: DeviceInfo,
    ipAddress: string,
    userAgent: string
  ): Promise<UserSession> {
    // Get session configuration
    const config = await this.getSessionConfiguration(organizationId)

    // Check concurrent session limits
    await this.enforceSessionLimits(userId, config)

    // Get location info
    const location = await this.getLocationInfo(ipAddress)

    // Calculate risk score
    const riskScore = await this.calculateRiskScore(userId, deviceInfo, location, ipAddress)

    // Generate session token
    const sessionToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + config.sessionTimeoutMinutes * 60 * 1000)

    // Create session record
    const { data: session, error } = await this.supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        session_token: sessionToken,
        device_info: JSON.stringify(deviceInfo),
        location: JSON.stringify(location),
        ip_address: ipAddress,
        user_agent: userAgent,
        expires_at: expiresAt.toISOString(),
        risk_score: riskScore,
        status: riskScore > 70 ? 'suspicious' : 'active'
      })
      .select()
      .single()

    if (error) throw error

    const sessionObj = this.parseSession(session)

    // Detect and flag suspicious activities
    const flags = await this.detectSuspiciousActivity(sessionObj, config)
    if (flags.length > 0) {
      await this.addSessionFlags(sessionObj.id, flags)
      sessionObj.flags = flags
    }

    // Log security event
    await this.logSecurityEvent({
      userId,
      organizationId,
      sessionId: sessionObj.id,
      eventType: 'session_created',
      severity: riskScore > 70 ? 'warning' : 'info',
      description: `User session created from ${location.city}, ${location.country}`,
      metadata: { deviceInfo, location, riskScore },
      ipAddress,
      userAgent,
      location
    })

    // Send notifications if needed
    if (config.notifyOnNewDevice && !deviceInfo.isTrusted) {
      await this.sendNewDeviceNotification(userId, deviceInfo, location)
    }

    if (config.notifyOnUnusualLocation && this.isUnusualLocation(userId, location)) {
      await this.sendUnusualLocationNotification(userId, location)
    }

    return sessionObj
  }

  async validateSession(sessionToken: string): Promise<UserSession | null> {
    const { data: session, error } = await this.supabase
      .from('user_sessions')
      .select('*')
      .eq('session_token', sessionToken)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .single()

    if (error || !session) return null

    const sessionObj = this.parseSession(session)

    // Update last activity
    await this.updateSessionActivity(sessionObj.id)

    return sessionObj
  }

  async updateSessionActivity(sessionId: string): Promise<void> {
    await this.supabase
      .from('user_sessions')
      .update({
        last_activity: new Date().toISOString()
      })
      .eq('id', sessionId)
  }

  async terminateSession(sessionId: string, reason: string = 'user_logout'): Promise<void> {
    const { data: session } = await this.supabase
      .from('user_sessions')
      .select('user_id, organization_id')
      .eq('id', sessionId)
      .single()

    await this.supabase
      .from('user_sessions')
      .update({
        status: 'terminated',
        terminated_at: new Date().toISOString(),
        termination_reason: reason
      })
      .eq('id', sessionId)

    if (session) {
      await this.logSecurityEvent({
        userId: session.user_id,
        organizationId: session.organization_id,
        sessionId,
        eventType: 'session_terminated',
        severity: 'info',
        description: `Session terminated: ${reason}`,
        metadata: { reason },
        ipAddress: '',
        userAgent: '',
        location: {} as LocationInfo
      })
    }
  }

  async terminateAllUserSessions(userId: string, exceptSessionId?: string): Promise<number> {
    let query = this.supabase
      .from('user_sessions')
      .update({
        status: 'terminated',
        terminated_at: new Date().toISOString(),
        termination_reason: 'admin_action'
      })
      .eq('user_id', userId)
      .eq('status', 'active')

    if (exceptSessionId) {
      query = query.neq('id', exceptSessionId)
    }

    const { data, error } = await query.select('id')

    if (error) throw error
    return data?.length || 0
  }

  // Device Management
  async registerDevice(
    userId: string,
    deviceInfo: DeviceInfo,
    trustDevice: boolean = false
  ): Promise<DeviceInfo> {
    const { data: existingDevice } = await this.supabase
      .from('user_devices')
      .select('*')
      .eq('user_id', userId)
      .eq('device_id', deviceInfo.deviceId)
      .single()

    if (existingDevice) {
      // Update existing device
      await this.supabase
        .from('user_devices')
        .update({
          device_name: deviceInfo.deviceName,
          browser: deviceInfo.browser,
          browser_version: deviceInfo.browserVersion,
          os: deviceInfo.os,
          os_version: deviceInfo.osVersion,
          screen_resolution: deviceInfo.screenResolution,
          timezone: deviceInfo.timezone,
          language: deviceInfo.language,
          is_trusted: trustDevice,
          last_seen: new Date().toISOString()
        })
        .eq('id', existingDevice.id)

      return { ...deviceInfo, isTrusted: trustDevice }
    }

    // Create new device
    await this.supabase
      .from('user_devices')
      .insert({
        user_id: userId,
        device_id: deviceInfo.deviceId,
        device_name: deviceInfo.deviceName,
        device_type: deviceInfo.deviceType,
        browser: deviceInfo.browser,
        browser_version: deviceInfo.browserVersion,
        os: deviceInfo.os,
        os_version: deviceInfo.osVersion,
        screen_resolution: deviceInfo.screenResolution,
        timezone: deviceInfo.timezone,
        language: deviceInfo.language,
        is_trusted: trustDevice
      })

    return { ...deviceInfo, isTrusted: trustDevice }
  }

  async getUserDevices(userId: string): Promise<DeviceInfo[]> {
    const { data: devices, error } = await this.supabase
      .from('user_devices')
      .select('*')
      .eq('user_id', userId)
      .order('last_seen', { ascending: false })

    if (error) return []

    return devices.map(device => ({
      deviceId: device.device_id,
      deviceName: device.device_name,
      deviceType: device.device_type,
      browser: device.browser,
      browserVersion: device.browser_version,
      os: device.os,
      osVersion: device.os_version,
      screenResolution: device.screen_resolution,
      timezone: device.timezone,
      language: device.language,
      isTrusted: device.is_trusted,
      lastSeen: new Date(device.last_seen)
    }))
  }

  async trustDevice(userId: string, deviceId: string): Promise<void> {
    await this.supabase
      .from('user_devices')
      .update({ is_trusted: true })
      .eq('user_id', userId)
      .eq('device_id', deviceId)
  }

  async untrustDevice(userId: string, deviceId: string): Promise<void> {
    await this.supabase
      .from('user_devices')
      .update({ is_trusted: false })
      .eq('user_id', userId)
      .eq('device_id', deviceId)
  }

  async removeDevice(userId: string, deviceId: string): Promise<void> {
    // Terminate all sessions from this device
    await this.supabase
      .from('user_sessions')
      .update({
        status: 'terminated',
        terminated_at: new Date().toISOString(),
        termination_reason: 'device_removed'
      })
      .eq('user_id', userId)
      .eq('status', 'active')
      .contains('device_info', { deviceId })

    // Remove device record
    await this.supabase
      .from('user_devices')
      .delete()
      .eq('user_id', userId)
      .eq('device_id', deviceId)
  }

  // Session Queries
  async getUserSessions(userId: string, includeExpired: boolean = false): Promise<UserSession[]> {
    let query = this.supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)

    if (!includeExpired) {
      query = query.in('status', ['active', 'suspicious'])
    }

    const { data: sessions, error } = await query.order('last_activity', { ascending: false })

    if (error) return []
    return sessions.map(this.parseSession)
  }

  async getOrganizationSessions(organizationId: string, limit: number = 100): Promise<UserSession[]> {
    const { data: sessions, error } = await this.supabase
      .from('user_sessions')
      .select(`
        *,
        profiles!inner(full_name, email)
      `)
      .eq('organization_id', organizationId)
      .in('status', ['active', 'suspicious'])
      .order('last_activity', { ascending: false })
      .limit(limit)

    if (error) return []
    return sessions.map(this.parseSession)
  }

  async getSuspiciousSessions(organizationId: string): Promise<UserSession[]> {
    const { data: sessions, error } = await this.supabase
      .from('user_sessions')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('status', 'suspicious')
      .order('created_at', { ascending: false })

    if (error) return []
    return sessions.map(this.parseSession)
  }

  // Suspicious Activity Detection
  private async detectSuspiciousActivity(
    session: UserSession,
    config: SessionConfiguration
  ): Promise<SessionFlag[]> {
    const flags: SessionFlag[] = []

    // Check for unusual location
    if (config.enableLocationTracking && await this.isUnusualLocation(session.userId, session.location)) {
      flags.push({
        type: 'unusual_location',
        severity: 'medium',
        description: `Login from unusual location: ${session.location.city}, ${session.location.country}`,
        detectedAt: new Date(),
        resolved: false
      })
    }

    // Check for new device
    if (config.requireDeviceAuthentication && !session.deviceInfo.isTrusted) {
      flags.push({
        type: 'new_device',
        severity: 'low',
        description: `Login from new device: ${session.deviceInfo.deviceName}`,
        detectedAt: new Date(),
        resolved: false
      })
    }

    // Check for concurrent sessions
    const activeSessions = await this.getUserSessions(session.userId, false)
    if (activeSessions.length > config.maxConcurrentSessions) {
      flags.push({
        type: 'concurrent_sessions',
        severity: 'medium',
        description: `Exceeded maximum concurrent sessions: ${activeSessions.length}/${config.maxConcurrentSessions}`,
        detectedAt: new Date(),
        resolved: false
      })
    }

    // Check for VPN/Tor usage
    if (session.location.isVpn || session.location.isTor) {
      flags.push({
        type: 'suspicious_activity',
        severity: session.location.isTor ? 'high' : 'medium',
        description: `Login through ${session.location.isTor ? 'Tor' : 'VPN'} network`,
        detectedAt: new Date(),
        resolved: false
      })
    }

    // Check for blocked countries
    if (config.blockedCountries.includes(session.location.country)) {
      flags.push({
        type: 'security_violation',
        severity: 'critical',
        description: `Login from blocked country: ${session.location.country}`,
        detectedAt: new Date(),
        resolved: false
      })
    }

    return flags
  }

  private async calculateRiskScore(
    userId: string,
    deviceInfo: DeviceInfo,
    location: LocationInfo,
    ipAddress: string
  ): Promise<number> {
    let score = 0

    // Location-based risk
    if (location.threatLevel === 'critical') score += 40
    else if (location.threatLevel === 'high') score += 30
    else if (location.threatLevel === 'medium') score += 20
    else if (location.threatLevel === 'low') score += 10

    // VPN/Proxy risk
    if (location.isTor) score += 50
    else if (location.isVpn) score += 30
    else if (location.isProxy) score += 20

    // Device trust
    if (!deviceInfo.isTrusted) score += 25

    // Historical behavior
    const isUnusualLocation = await this.isUnusualLocation(userId, location)
    if (isUnusualLocation) score += 20

    // Recent login failures
    const recentFailures = await this.getRecentLoginFailures(userId)
    score += Math.min(recentFailures * 5, 25)

    return Math.min(score, 100)
  }

  private async isUnusualLocation(userId: string, location: LocationInfo): Promise<boolean> {
    const { data: recentSessions } = await this.supabase
      .from('user_sessions')
      .select('location')
      .eq('user_id', userId)
      .eq('status', 'active')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
      .limit(10)

    if (!recentSessions || recentSessions.length === 0) return false

    const usualCountries = new Set(
      recentSessions.map(s => JSON.parse(s.location).country)
    )

    return !usualCountries.has(location.country)
  }

  private async getRecentLoginFailures(userId: string): Promise<number> {
    const { data } = await this.supabase
      .from('login_attempts')
      .select('failure_count')
      .eq('user_id', userId)
      .gte('last_attempt', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .single()

    return data?.failure_count || 0
  }

  // Configuration Management
  async getSessionConfiguration(organizationId: string): Promise<SessionConfiguration> {
    const { data: config, error } = await this.supabase
      .from('session_configurations')
      .select('*')
      .eq('organization_id', organizationId)
      .single()

    if (error || !config) {
      return this.getDefaultSessionConfiguration(organizationId)
    }

    return {
      organizationId: config.organization_id,
      maxConcurrentSessions: config.max_concurrent_sessions,
      sessionTimeoutMinutes: config.session_timeout_minutes,
      inactivityTimeoutMinutes: config.inactivity_timeout_minutes,
      requireDeviceAuthentication: config.require_device_authentication,
      allowRemoteAccess: config.allow_remote_access,
      enableLocationTracking: config.enable_location_tracking,
      enableSuspiciousActivityDetection: config.enable_suspicious_activity_detection,
      autoTerminateSuspiciousSessions: config.auto_terminate_suspicious_sessions,
      notifyOnNewDevice: config.notify_on_new_device,
      notifyOnUnusualLocation: config.notify_on_unusual_location,
      trustedNetworks: config.trusted_networks || [],
      blockedCountries: config.blocked_countries || [],
      allowedCountries: config.allowed_countries || [],
      maxFailedLocationAttempts: config.max_failed_location_attempts,
      deviceTrustExpirationDays: config.device_trust_expiration_days
    }
  }

  // Location and IP Information
  private async getLocationInfo(ipAddress: string): Promise<LocationInfo> {
    try {
      // Use IP geolocation service
      const response = await fetch(`http://ip-api.com/json/${ipAddress}?fields=status,message,country,regionName,city,lat,lon,timezone,isp,org,proxy,query`)
      const data = await response.json()

      if (data.status === 'success') {
        return {
          country: data.country,
          region: data.regionName,
          city: data.city,
          latitude: data.lat,
          longitude: data.lon,
          timezone: data.timezone,
          isp: data.isp,
          organization: data.org,
          isVpn: false, // Would need additional service for VPN detection
          isTor: false, // Would need Tor exit node list
          isProxy: data.proxy || false,
          threatLevel: 'low'
        }
      }
    } catch (error) {
      console.error('Failed to get location info:', error)
    }

    // Return default location info
    return {
      country: 'Unknown',
      region: 'Unknown',
      city: 'Unknown',
      timezone: 'UTC',
      isp: 'Unknown',
      organization: 'Unknown',
      isVpn: false,
      isTor: false,
      isProxy: false,
      threatLevel: 'low'
    }
  }

  // Cleanup and Maintenance
  async cleanupExpiredSessions(): Promise<number> {
    const { data: expiredSessions, error } = await this.supabase
      .from('user_sessions')
      .update({ status: 'expired' })
      .eq('status', 'active')
      .lt('expires_at', new Date().toISOString())
      .select('id')

    if (error) throw error
    return expiredSessions?.length || 0
  }

  async cleanupInactiveSessions(): Promise<number> {
    const inactivityThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours

    const { data: inactiveSessions, error } = await this.supabase
      .from('user_sessions')
      .update({ status: 'expired' })
      .eq('status', 'active')
      .lt('last_activity', inactivityThreshold.toISOString())
      .select('id')

    if (error) throw error
    return inactiveSessions?.length || 0
  }

  // Notifications
  private async sendNewDeviceNotification(
    userId: string,
    deviceInfo: DeviceInfo,
    location: LocationInfo
  ): Promise<void> {
    // Implementation would send email/SMS notification
    // For now, just log the event
    console.log(`New device notification for user ${userId}: ${deviceInfo.deviceName} from ${location.city}`)
  }

  private async sendUnusualLocationNotification(
    userId: string,
    location: LocationInfo
  ): Promise<void> {
    // Implementation would send email/SMS notification
    // For now, just log the event
    console.log(`Unusual location notification for user ${userId}: ${location.city}, ${location.country}`)
  }

  // Security Event Logging
  private async logSecurityEvent(event: Omit<SecurityEvent, 'id' | 'createdAt'>): Promise<void> {
    await this.supabase
      .from('security_events')
      .insert({
        user_id: event.userId,
        organization_id: event.organizationId,
        session_id: event.sessionId,
        event_type: event.eventType,
        severity: event.severity,
        description: event.description,
        metadata: JSON.stringify(event.metadata),
        ip_address: event.ipAddress,
        user_agent: event.userAgent,
        location: JSON.stringify(event.location)
      })
  }

  // Helper methods
  private async enforceSessionLimits(userId: string, config: SessionConfiguration): Promise<void> {
    const activeSessions = await this.getUserSessions(userId, false)

    if (activeSessions.length >= config.maxConcurrentSessions) {
      // Terminate oldest sessions
      const sessionsToTerminate = activeSessions
        .sort((a, b) => a.lastActivity.getTime() - b.lastActivity.getTime())
        .slice(0, activeSessions.length - config.maxConcurrentSessions + 1)

      for (const session of sessionsToTerminate) {
        await this.terminateSession(session.id, 'session_limit_exceeded')
      }
    }
  }

  private async addSessionFlags(sessionId: string, flags: SessionFlag[]): Promise<void> {
    for (const flag of flags) {
      await this.supabase
        .from('session_flags')
        .insert({
          session_id: sessionId,
          flag_type: flag.type,
          severity: flag.severity,
          description: flag.description,
          detected_at: flag.detectedAt.toISOString()
        })
    }
  }

  private getDefaultSessionConfiguration(organizationId: string): SessionConfiguration {
    return {
      organizationId,
      maxConcurrentSessions: 5,
      sessionTimeoutMinutes: 480, // 8 hours
      inactivityTimeoutMinutes: 60,
      requireDeviceAuthentication: false,
      allowRemoteAccess: true,
      enableLocationTracking: true,
      enableSuspiciousActivityDetection: true,
      autoTerminateSuspiciousSessions: false,
      notifyOnNewDevice: true,
      notifyOnUnusualLocation: true,
      trustedNetworks: [],
      blockedCountries: [],
      allowedCountries: [],
      maxFailedLocationAttempts: 3,
      deviceTrustExpirationDays: 30
    }
  }

  private parseSession(data: any): UserSession {
    return {
      id: data.id,
      userId: data.user_id,
      organizationId: data.organization_id,
      sessionToken: data.session_token,
      deviceInfo: JSON.parse(data.device_info),
      location: JSON.parse(data.location),
      status: data.status,
      createdAt: new Date(data.created_at),
      lastActivity: new Date(data.last_activity),
      expiresAt: new Date(data.expires_at),
      ipAddress: data.ip_address,
      userAgent: data.user_agent,
      isCurrentSession: false, // This would be set by the calling code
      riskScore: data.risk_score || 0,
      flags: [] // This would be loaded separately if needed
    }
  }
}

// Export singleton instance
export const sessionManager = new SessionManager()