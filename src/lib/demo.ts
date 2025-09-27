import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'
import {
  DemoSession,
  DemoProgress,
  DemoAnalytics,
  DemoEvent,
  DemoPageView,
  DemoFeatureUsage,
  DemoFunnelStep,
  DemoPerformanceMetrics,
  BusinessScenario,
  BusinessScenarioConfig,
  DemoSecurityPolicy,
  DemoRateLimitStatus,
  DemoSampleData,
  DemoContact,
  DemoConversation,
  DemoMessage,
  DemoTemplate,
  DemoAutomationRule,
  DEMO_SCENARIOS,
  DEFAULT_DEMO_SECURITY_POLICY,
  DemoStatus,
  DemoEventType,
  TrackAnalyticsRequest
} from '@/types/demo'
import { Database } from '@/types/database'

type SupabaseClient = ReturnType<typeof createClient<Database>>

/**
 * Manages demo sessions with security, rate limiting, and analytics
 */
export class DemoSessionManager {
  private supabase: SupabaseClient
  private securityPolicy: DemoSecurityPolicy

  constructor(supabaseClient: SupabaseClient, securityPolicy?: DemoSecurityPolicy) {
    this.supabase = supabaseClient
    this.securityPolicy = securityPolicy || DEFAULT_DEMO_SECURITY_POLICY
  }

  /**
   * Create a new demo session with rate limiting and security checks
   */
  async createSession(
    businessScenario: BusinessScenario,
    ipAddress: string,
    userAgent: string,
    metadata?: Record<string, any>
  ): Promise<{ session: DemoSession; organization: any; error?: string }> {
    try {
      // Check rate limits
      const rateLimitCheck = await this.checkRateLimit(ipAddress)
      if (!rateLimitCheck.allowed) {
        throw new Error(`Rate limit exceeded: ${rateLimitCheck.reason}`)
      }

      // Check for blocked IPs
      if (this.securityPolicy.blocked_ips.includes(ipAddress)) {
        throw new Error('Access denied from this IP address')
      }

      // Generate session token and organization
      const sessionToken = this.generateSecureToken()
      const organizationId = uuidv4()
      const sessionId = uuidv4()

      // Create demo organization
      const { data: organization, error: orgError } = await this.supabase
        .from('organizations')
        .insert({
          id: organizationId,
          name: DEMO_SCENARIOS[businessScenario].name,
          slug: `demo-${businessScenario}-${Date.now()}`,
          subscription_status: 'trial',
          subscription_tier: 'professional'
        })
        .select()
        .single()

      if (orgError) throw orgError

      // Create demo session record
      const expiresAt = new Date()
      expiresAt.setMinutes(expiresAt.getMinutes() + this.securityPolicy.session_duration_minutes)

      const session: DemoSession = {
        id: sessionId,
        token: sessionToken,
        organization_id: organizationId,
        business_scenario: businessScenario,
        status: 'active',
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent,
        progress: {
          steps_completed: [],
          current_step: 'welcome',
          completion_percentage: 0,
          interactions_count: 0,
          features_explored: [],
          time_spent_minutes: 0,
          last_activity_at: new Date().toISOString()
        },
        analytics: {
          session_id: sessionId,
          events: [],
          page_views: [],
          feature_usage: [],
          conversion_funnel: [],
          performance_metrics: {
            page_load_times: {},
            api_response_times: {},
            error_count: 0,
            bounce_rate: 0
          }
        }
      }

      // Store session in cache/database (using a demo_sessions table)
      await this.storeSession(session)

      // Seed demo data
      const dataSeeder = new DemoDataSeeder(this.supabase)
      await dataSeeder.seedOrganizationData(organizationId, businessScenario)

      // Track session creation
      await this.trackEvent(sessionId, {
        event_type: 'conversion',
        action: 'demo_session_created',
        category: 'demo',
        label: businessScenario,
        metadata: { ...metadata, ip_address: ipAddress }
      })

      return { session, organization }
    } catch (error) {
      console.error('Error creating demo session:', error)
      return {
        session: null as any,
        organization: null as any,
        error: error instanceof Error ? error.message : 'Failed to create demo session'
      }
    }
  }

  /**
   * Validate and retrieve an active demo session
   */
  async getSession(token: string): Promise<{ session: DemoSession | null; isValid: boolean; error?: string }> {
    try {
      const session = await this.retrieveSession(token)

      if (!session) {
        return { session: null, isValid: false, error: 'Session not found' }
      }

      // Check if session is expired
      const now = new Date()
      const expiresAt = new Date(session.expires_at)

      if (now > expiresAt) {
        await this.updateSessionStatus(session.id, 'expired')
        return { session, isValid: false, error: 'Session expired' }
      }

      // Check if session is blocked
      if (session.status === 'blocked' || session.status === 'rate_limited') {
        return { session, isValid: false, error: 'Session blocked' }
      }

      // Update last activity
      session.progress.last_activity_at = now.toISOString()
      await this.updateSession(session)

      return { session, isValid: true }
    } catch (error) {
      console.error('Error validating session:', error)
      return {
        session: null,
        isValid: false,
        error: error instanceof Error ? error.message : 'Session validation failed'
      }
    }
  }

  /**
   * Reset demo data for a session
   */
  async resetSessionData(token: string): Promise<{ success: boolean; itemsReset?: any; error?: string }> {
    try {
      const { session, isValid } = await this.getSession(token)

      if (!isValid || !session) {
        return { success: false, error: 'Invalid session' }
      }

      const dataSeeder = new DemoDataSeeder(this.supabase)
      const itemsReset = await dataSeeder.resetAndReseed(session.organization_id, session.business_scenario)

      // Reset progress
      session.progress = {
        steps_completed: [],
        current_step: 'welcome',
        completion_percentage: 0,
        interactions_count: 0,
        features_explored: [],
        time_spent_minutes: 0,
        last_activity_at: new Date().toISOString()
      }

      await this.updateSession(session)

      // Track reset event
      await this.trackEvent(session.id, {
        event_type: 'click',
        action: 'demo_data_reset',
        category: 'demo',
        label: session.business_scenario
      })

      return { success: true, itemsReset }
    } catch (error) {
      console.error('Error resetting session data:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reset demo data'
      }
    }
  }

  /**
   * Update session progress and analytics
   */
  async updateProgress(
    token: string,
    step: string,
    featureUsed?: string,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      const { session, isValid } = await this.getSession(token)

      if (!isValid || !session) return false

      // Update progress
      if (!session.progress.steps_completed.includes(step)) {
        session.progress.steps_completed.push(step)
      }

      session.progress.current_step = step
      session.progress.interactions_count += 1

      if (featureUsed && !session.progress.features_explored.includes(featureUsed)) {
        session.progress.features_explored.push(featureUsed)
      }

      // Calculate completion percentage based on key steps
      const totalSteps = 10 // Configurable based on scenario
      session.progress.completion_percentage = Math.min(
        (session.progress.steps_completed.length / totalSteps) * 100,
        100
      )

      // Calculate time spent
      const startTime = new Date(session.created_at)
      const now = new Date()
      session.progress.time_spent_minutes = Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60))
      session.progress.last_activity_at = now.toISOString()

      await this.updateSession(session)

      // Track progress event
      await this.trackEvent(session.id, {
        event_type: 'feature_interaction',
        action: 'progress_updated',
        category: 'demo',
        label: step,
        value: session.progress.completion_percentage,
        metadata
      })

      return true
    } catch (error) {
      console.error('Error updating progress:', error)
      return false
    }
  }

  /**
   * Track analytics events for the demo session
   */
  async trackEvent(sessionId: string, eventData: TrackAnalyticsRequest): Promise<string | null> {
    try {
      const eventId = uuidv4()
      const event: DemoEvent = {
        id: eventId,
        type: eventData.event_type,
        action: eventData.action,
        category: eventData.category,
        label: eventData.label,
        value: eventData.value,
        metadata: eventData.metadata,
        timestamp: new Date().toISOString()
      }

      // Store event (implement your preferred storage method)
      await this.storeEvent(sessionId, event)

      return eventId
    } catch (error) {
      console.error('Error tracking event:', error)
      return null
    }
  }

  /**
   * Check rate limits for IP address
   */
  private async checkRateLimit(ipAddress: string): Promise<{ allowed: boolean; reason?: string }> {
    try {
      // Get current sessions for this IP
      const currentSessions = await this.getCurrentSessionsForIP(ipAddress)

      if (currentSessions >= this.securityPolicy.max_sessions_per_ip) {
        return { allowed: false, reason: 'Too many active sessions from this IP' }
      }

      // Check sessions in the last hour
      const sessionsInLastHour = await this.getSessionsInWindow(ipAddress, this.securityPolicy.rate_limit_window_minutes)

      if (sessionsInLastHour >= this.securityPolicy.max_sessions_per_hour) {
        return { allowed: false, reason: 'Rate limit exceeded for this IP' }
      }

      return { allowed: true }
    } catch (error) {
      console.error('Error checking rate limit:', error)
      return { allowed: false, reason: 'Rate limit check failed' }
    }
  }

  /**
   * Generate a secure session token
   */
  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  /**
   * Store session in database/cache
   */
  private async storeSession(session: DemoSession): Promise<void> {
    // Implement storage logic (Redis, database, etc.)
    // For now, we'll use a simple in-memory approach or database

    // You might want to create a demo_sessions table in Supabase
    // or use Redis for better performance
    console.log('Storing session:', session.id)
  }

  /**
   * Retrieve session from storage
   */
  private async retrieveSession(token: string): Promise<DemoSession | null> {
    // Implement retrieval logic
    // This would query your session storage
    console.log('Retrieving session for token:', token)
    return null // Placeholder
  }

  /**
   * Update session in storage
   */
  private async updateSession(session: DemoSession): Promise<void> {
    console.log('Updating session:', session.id)
  }

  /**
   * Update session status
   */
  private async updateSessionStatus(sessionId: string, status: DemoStatus): Promise<void> {
    console.log('Updating session status:', sessionId, status)
  }

  /**
   * Store analytics event
   */
  private async storeEvent(sessionId: string, event: DemoEvent): Promise<void> {
    console.log('Storing event for session:', sessionId, event)
  }

  /**
   * Get current active sessions count for IP
   */
  private async getCurrentSessionsForIP(ipAddress: string): Promise<number> {
    // Query active sessions for this IP
    return 0 // Placeholder
  }

  /**
   * Get sessions count in time window for IP
   */
  private async getSessionsInWindow(ipAddress: string, windowMinutes: number): Promise<number> {
    // Query sessions in the time window
    return 0 // Placeholder
  }

  /**
   * Cleanup expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      // Find and remove expired sessions
      // This should be run as a background job
      console.log('Cleaning up expired sessions')
      return 0 // Return number of cleaned sessions
    } catch (error) {
      console.error('Error cleaning up sessions:', error)
      return 0
    }
  }
}

/**
 * Seeds demo data for different business scenarios
 */
export class DemoDataSeeder {
  private supabase: SupabaseClient

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient
  }

  /**
   * Seed organization with scenario-specific data
   */
  async seedOrganizationData(organizationId: string, scenario: BusinessScenario): Promise<void> {
    try {
      const scenarioConfig = DEMO_SCENARIOS[scenario]
      const sampleData = this.generateSampleData(scenario)

      // Create contacts
      await this.createContacts(organizationId, sampleData.contacts)

      // Create conversations and messages
      await this.createConversationsWithMessages(organizationId, sampleData.conversations, sampleData.messages)

      // Create templates
      await this.createTemplates(organizationId, sampleData.templates)

      console.log(`Demo data seeded for ${scenario} scenario`)
    } catch (error) {
      console.error('Error seeding demo data:', error)
      throw error
    }
  }

  /**
   * Reset and reseed organization data
   */
  async resetAndReseed(organizationId: string, scenario: BusinessScenario): Promise<{
    contacts: number;
    conversations: number;
    messages: number;
  }> {
    try {
      // Delete existing data
      const deletedContacts = await this.deleteOrganizationContacts(organizationId)
      const deletedConversations = await this.deleteOrganizationConversations(organizationId)
      const deletedMessages = await this.deleteOrganizationMessages(organizationId)

      // Reseed with fresh data
      await this.seedOrganizationData(organizationId, scenario)

      return {
        contacts: deletedContacts,
        conversations: deletedConversations,
        messages: deletedMessages
      }
    } catch (error) {
      console.error('Error resetting demo data:', error)
      throw error
    }
  }

  /**
   * Generate sample data for a business scenario
   */
  private generateSampleData(scenario: BusinessScenario): DemoSampleData {
    const baseData = this.getBaseScenarioData(scenario)

    return {
      contacts: this.generateContacts(scenario, 15),
      conversations: this.generateConversations(scenario, 8),
      messages: this.generateMessages(scenario, 25),
      templates: this.generateTemplates(scenario),
      automation_rules: this.generateAutomationRules(scenario)
    }
  }

  /**
   * Generate realistic contacts for scenario
   */
  private generateContacts(scenario: BusinessScenario, count: number): DemoContact[] {
    const contacts: DemoContact[] = []
    const names = this.getScenarioNames(scenario)

    for (let i = 0; i < count; i++) {
      contacts.push({
        name: names[i % names.length],
        phone_number: `+1555${(1000 + i).toString().padStart(4, '0')}`,
        whatsapp_id: `wa_${i}_${Date.now()}`,
        tags: this.getScenarioTags(scenario),
        notes: this.getScenarioNotes(scenario),
        last_interaction: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
      })
    }

    return contacts
  }

  /**
   * Generate realistic conversations
   */
  private generateConversations(scenario: BusinessScenario, count: number): DemoConversation[] {
    const conversations: DemoConversation[] = []
    const statuses: Array<'open' | 'pending' | 'resolved' | 'closed'> = ['open', 'pending', 'resolved', 'closed']
    const priorities: Array<'low' | 'medium' | 'high' | 'urgent'> = ['low', 'medium', 'high', 'urgent']

    for (let i = 0; i < count; i++) {
      conversations.push({
        contact_phone: `+1555${(1000 + i).toString().padStart(4, '0')}`,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        subject: this.getScenarioSubject(scenario, i),
        created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        last_message_at: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString()
      })
    }

    return conversations
  }

  /**
   * Generate realistic messages
   */
  private generateMessages(scenario: BusinessScenario, count: number): DemoMessage[] {
    const messages: DemoMessage[] = []
    const messageTypes: Array<'text' | 'image' | 'document'> = ['text', 'image', 'document']
    const senderTypes: Array<'contact' | 'agent'> = ['contact', 'agent']

    for (let i = 0; i < count; i++) {
      messages.push({
        conversation_contact_phone: `+1555${(1000 + (i % 8)).toString().padStart(4, '0')}`,
        sender_type: senderTypes[Math.floor(Math.random() * senderTypes.length)],
        content: this.getScenarioMessage(scenario, i),
        message_type: messageTypes[Math.floor(Math.random() * messageTypes.length)],
        created_at: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
        is_read: Math.random() > 0.3
      })
    }

    return messages
  }

  /**
   * Generate message templates for scenario
   */
  private generateTemplates(scenario: BusinessScenario): DemoTemplate[] {
    const templates = this.getScenarioTemplates(scenario)
    return templates.map(template => ({
      ...template,
      language: 'en',
      variables: this.extractVariables(template.content)
    }))
  }

  /**
   * Generate automation rules for scenario
   */
  private generateAutomationRules(scenario: BusinessScenario): DemoAutomationRule[] {
    return this.getScenarioAutomationRules(scenario)
  }

  // Scenario-specific data generators
  private getScenarioNames(scenario: BusinessScenario): string[] {
    const nameMap: Record<BusinessScenario, string[]> = {
      retail: ['Sarah Johnson', 'Mike Chen', 'Emma Davis', 'James Wilson', 'Lisa Garcia', 'David Brown', 'Maria Rodriguez', 'John Smith'],
      restaurant: ['Tony Martinez', 'Sofia Rossi', 'Marco Benedetti', 'Isabella Romano', 'Giuseppe Conti', 'Francesca Marino', 'Andrea Ricci'],
      real_estate: ['Robert Thompson', 'Jennifer Lee', 'Michael Anderson', 'Amanda White', 'Christopher Moore', 'Nicole Taylor', 'Kevin Martin'],
      healthcare: ['Dr. Patricia Johnson', 'Nurse Williams', 'Mary Anderson', 'Dr. James Miller', 'Susan Davis', 'Dr. Karen Wilson'],
      education: ['Student Alex', 'Student Jamie', 'Student Taylor', 'Student Morgan', 'Student Casey', 'Student Riley', 'Student Avery'],
      ecommerce: ['Tech Buyer Sam', 'Gadget Lover Pat', 'Smart Home Jane', 'Gamer Alex', 'Professional Mike', 'Student Sarah'],
      automotive: ['Car Buyer Tom', 'Family Driver Sue', 'Speed Enthusiast Max', 'Eco Driver Emma', 'Truck Buyer Joe', 'Luxury Seeker Ana'],
      travel: ['Adventure Seeker', 'Family Traveler', 'Business Traveler', 'Honeymoon Couple', 'Solo Backpacker', 'Luxury Tourist'],
      fitness: ['Gym Member Sam', 'Yoga Enthusiast', 'CrossFit Athlete', 'Runner Maria', 'Weightlifter John', 'Pilates Lover'],
      generic: ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Williams', 'Charlie Brown', 'Diana Davis', 'Frank Miller']
    }
    return nameMap[scenario] || nameMap.generic
  }

  private getScenarioTags(scenario: BusinessScenario): string[] {
    const tagMap: Record<BusinessScenario, string[]> = {
      retail: ['vip-customer', 'frequent-buyer'],
      restaurant: ['regular-customer', 'delivery-preferred'],
      real_estate: ['buyer', 'investor'],
      healthcare: ['patient', 'follow-up-needed'],
      education: ['enrolled', 'prospective'],
      ecommerce: ['premium-member', 'tech-enthusiast'],
      automotive: ['test-drive-completed', 'financing-interested'],
      travel: ['frequent-traveler', 'group-booking'],
      fitness: ['active-member', 'personal-training'],
      generic: ['important', 'follow-up']
    }
    return tagMap[scenario] || tagMap.generic
  }

  private getScenarioNotes(scenario: BusinessScenario): string {
    const noteMap: Record<BusinessScenario, string> = {
      retail: 'Prefers email notifications for new arrivals',
      restaurant: 'Allergic to nuts - important for orders',
      real_estate: 'Looking for properties in downtown area',
      healthcare: 'Prefers morning appointments',
      education: 'Interested in advanced courses',
      ecommerce: 'Interested in smart home products',
      automotive: 'Looking for eco-friendly vehicles',
      travel: 'Prefers adventure travel packages',
      fitness: 'Interested in strength training programs',
      generic: 'Important customer notes'
    }
    return noteMap[scenario] || noteMap.generic
  }

  private getScenarioSubject(scenario: BusinessScenario, index: number): string {
    const subjectMap: Record<BusinessScenario, string[]> = {
      retail: ['Order Status Inquiry', 'Size Exchange Request', 'Return Process', 'Product Recommendation'],
      restaurant: ['Table Reservation', 'Takeout Order', 'Catering Inquiry', 'Special Dietary Requirements'],
      real_estate: ['Property Viewing', 'Market Analysis Request', 'Financing Options', 'Investment Opportunity'],
      healthcare: ['Appointment Booking', 'Prescription Refill', 'Test Results Inquiry', 'Health Consultation'],
      education: ['Course Enrollment', 'Assignment Help', 'Grade Inquiry', 'Academic Support'],
      ecommerce: ['Order Tracking', 'Product Support', 'Warranty Claim', 'Technical Issue'],
      automotive: ['Test Drive Request', 'Service Appointment', 'Finance Application', 'Vehicle Inquiry'],
      travel: ['Trip Planning', 'Booking Assistance', 'Travel Insurance', 'Destination Information'],
      fitness: ['Class Booking', 'Personal Training', 'Membership Inquiry', 'Fitness Consultation'],
      generic: ['General Inquiry', 'Support Request', 'Information Needed', 'Service Question']
    }
    const subjects = subjectMap[scenario] || subjectMap.generic
    return subjects[index % subjects.length]
  }

  private getScenarioMessage(scenario: BusinessScenario, index: number): string {
    const messageMap: Record<BusinessScenario, string[]> = {
      retail: [
        'Hi! I placed an order last week and wanted to check the status.',
        'Could you help me with a size exchange?',
        'The item I received doesn\'t fit properly.',
        'Do you have this in a different color?'
      ],
      restaurant: [
        'I\'d like to make a reservation for tonight.',
        'Can I place a takeout order?',
        'Do you have any vegan options available?',
        'What are your hours for delivery?'
      ],
      real_estate: [
        'I\'m interested in scheduling a viewing.',
        'Could you provide more details about this property?',
        'What\'s the current market trend in this area?',
        'Do you have financing options available?'
      ],
      healthcare: [
        'I need to schedule an appointment.',
        'When will my test results be ready?',
        'I need a prescription refill.',
        'Can I consult about my symptoms?'
      ],
      education: [
        'How do I enroll in the advanced course?',
        'I need help with my assignment.',
        'When are the exam dates?',
        'What are the course requirements?'
      ],
      ecommerce: [
        'Where is my order?',
        'The product isn\'t working as expected.',
        'I need to return this item.',
        'Do you have technical support?'
      ],
      automotive: [
        'I\'d like to schedule a test drive.',
        'What financing options do you offer?',
        'Can you service my current vehicle?',
        'Tell me more about this model.'
      ],
      travel: [
        'I need help planning a trip.',
        'What packages do you recommend?',
        'Can you book flights and hotels?',
        'What\'s included in this tour?'
      ],
      fitness: [
        'I want to book a fitness class.',
        'Do you offer personal training?',
        'What are your membership rates?',
        'Can you create a workout plan?'
      ],
      generic: [
        'I have a question about your service.',
        'Could you provide more information?',
        'I need assistance with something.',
        'How can you help me?'
      ]
    }
    const messages = messageMap[scenario] || messageMap.generic
    return messages[index % messages.length]
  }

  private getScenarioTemplates(scenario: BusinessScenario): Omit<DemoTemplate, 'language' | 'variables'>[] {
    const templateMap: Record<BusinessScenario, Omit<DemoTemplate, 'language' | 'variables'>[]> = {
      retail: [
        {
          name: 'Order Confirmation',
          content: 'Hi {{customer_name}}! Your order #{{order_number}} has been confirmed and will be shipped within 24 hours.',
          category: 'orders'
        },
        {
          name: 'Shipping Update',
          content: 'Your order #{{order_number}} is on its way! Track it here: {{tracking_link}}',
          category: 'shipping'
        }
      ],
      restaurant: [
        {
          name: 'Reservation Confirmation',
          content: 'Your table for {{party_size}} is confirmed for {{date}} at {{time}}. See you soon!',
          category: 'reservations'
        },
        {
          name: 'Order Ready',
          content: 'Hi {{customer_name}}, your takeout order is ready for pickup!',
          category: 'orders'
        }
      ],
      // Add more scenarios...
      generic: [
        {
          name: 'Welcome Message',
          content: 'Welcome {{customer_name}}! How can we help you today?',
          category: 'general'
        },
        {
          name: 'Thank You',
          content: 'Thank you for contacting us. We\'ll get back to you within 24 hours.',
          category: 'general'
        }
      ]
    }
    return templateMap[scenario] || templateMap.generic
  }

  private getScenarioAutomationRules(scenario: BusinessScenario): DemoAutomationRule[] {
    return [
      {
        name: 'Welcome New Contacts',
        trigger: 'new_contact',
        conditions: { is_first_message: true },
        actions: { send_template: 'welcome_message' },
        is_active: true
      },
      {
        name: 'Auto-assign to Agent',
        trigger: 'new_conversation',
        conditions: { business_hours: true },
        actions: { assign_to: 'available_agent' },
        is_active: true
      }
    ]
  }

  private extractVariables(content: string): string[] {
    const matches = content.match(/\{\{([^}]+)\}\}/g)
    return matches ? matches.map(match => match.slice(2, -2)) : []
  }

  private getBaseScenarioData(scenario: BusinessScenario): any {
    return DEMO_SCENARIOS[scenario]
  }

  // Database operation methods
  private async createContacts(organizationId: string, contacts: DemoContact[]): Promise<void> {
    for (const contact of contacts) {
      await this.supabase.from('contacts').insert({
        organization_id: organizationId,
        whatsapp_id: contact.whatsapp_id,
        phone_number: contact.phone_number,
        name: contact.name,
        profile_picture_url: contact.profile_picture_url,
        tags: contact.tags,
        notes: contact.notes,
        last_message_at: contact.last_interaction
      })
    }
  }

  private async createConversationsWithMessages(
    organizationId: string,
    conversations: DemoConversation[],
    messages: DemoMessage[]
  ): Promise<void> {
    for (const conversation of conversations) {
      // Find contact by phone number
      const { data: contact } = await this.supabase
        .from('contacts')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('phone_number', conversation.contact_phone)
        .single()

      if (contact) {
        const { data: newConversation } = await this.supabase
          .from('conversations')
          .insert({
            organization_id: organizationId,
            contact_id: contact.id,
            status: conversation.status,
            priority: conversation.priority,
            subject: conversation.subject,
            last_message_at: conversation.last_message_at
          })
          .select()
          .single()

        if (newConversation) {
          // Create messages for this conversation
          const conversationMessages = messages.filter(
            msg => msg.conversation_contact_phone === conversation.contact_phone
          )

          for (const message of conversationMessages) {
            await this.supabase.from('messages').insert({
              conversation_id: newConversation.id,
              sender_type: message.sender_type,
              content: message.content,
              message_type: message.message_type,
              media_url: message.media_url,
              is_read: message.is_read,
              created_at: message.created_at
            })
          }
        }
      }
    }
  }

  private async createTemplates(organizationId: string, templates: DemoTemplate[]): Promise<void> {
    // Templates would be stored in a separate table if implemented
    console.log('Creating templates for organization:', organizationId, templates.length)
  }

  private async deleteOrganizationContacts(organizationId: string): Promise<number> {
    const { count } = await this.supabase
      .from('contacts')
      .delete({ count: 'exact' })
      .eq('organization_id', organizationId)

    return count || 0
  }

  private async deleteOrganizationConversations(organizationId: string): Promise<number> {
    const { count } = await this.supabase
      .from('conversations')
      .delete({ count: 'exact' })
      .eq('organization_id', organizationId)

    return count || 0
  }

  private async deleteOrganizationMessages(organizationId: string): Promise<number> {
    // Delete messages through conversations
    const { data: conversations } = await this.supabase
      .from('conversations')
      .select('id')
      .eq('organization_id', organizationId)

    if (conversations && conversations.length > 0) {
      const conversationIds = conversations.map(c => c.id)
      const { count } = await this.supabase
        .from('messages')
        .delete({ count: 'exact' })
        .in('conversation_id', conversationIds)

      return count || 0
    }

    return 0
  }
}

/**
 * Enforces security policies for demo accounts
 */
export class DemoSecurityPolicy {
  private policy: DemoSecurityPolicy

  constructor(customPolicy?: Partial<DemoSecurityPolicy>) {
    this.policy = { ...DEFAULT_DEMO_SECURITY_POLICY, ...customPolicy }
  }

  /**
   * Validate if a new session can be created for this IP
   */
  validateNewSession(ipAddress: string, currentSessions: number, sessionsInWindow: number): {
    allowed: boolean
    reason?: string
  } {
    if (this.policy.blocked_ips.includes(ipAddress)) {
      return { allowed: false, reason: 'IP address is blocked' }
    }

    if (currentSessions >= this.policy.max_sessions_per_ip) {
      return { allowed: false, reason: 'Maximum concurrent sessions exceeded for this IP' }
    }

    if (sessionsInWindow >= this.policy.max_sessions_per_hour) {
      return { allowed: false, reason: 'Rate limit exceeded - too many sessions created in the last hour' }
    }

    return { allowed: true }
  }

  /**
   * Check if session should be expired
   */
  shouldExpireSession(sessionCreatedAt: string): boolean {
    const createdTime = new Date(sessionCreatedAt)
    const now = new Date()
    const diffMinutes = (now.getTime() - createdTime.getTime()) / (1000 * 60)

    return diffMinutes > this.policy.session_duration_minutes
  }

  /**
   * Get security policy configuration
   */
  getPolicy(): DemoSecurityPolicy {
    return { ...this.policy }
  }

  /**
   * Update security policy
   */
  updatePolicy(updates: Partial<DemoSecurityPolicy>): void {
    this.policy = { ...this.policy, ...updates }
  }

  /**
   * Block an IP address
   */
  blockIP(ipAddress: string): void {
    if (!this.policy.blocked_ips.includes(ipAddress)) {
      this.policy.blocked_ips.push(ipAddress)
    }
  }

  /**
   * Unblock an IP address
   */
  unblockIP(ipAddress: string): void {
    this.policy.blocked_ips = this.policy.blocked_ips.filter(ip => ip !== ipAddress)
  }

  /**
   * Check if IP is blocked
   */
  isIPBlocked(ipAddress: string): boolean {
    return this.policy.blocked_ips.includes(ipAddress)
  }
}

/**
 * Utility functions for demo management
 */
export const DemoUtils = {
  /**
   * Generate a demo organization slug
   */
  generateDemoSlug(scenario: BusinessScenario): string {
    return `demo-${scenario}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
  },

  /**
   * Calculate demo progress percentage
   */
  calculateProgress(stepsCompleted: string[], totalSteps: number): number {
    return Math.min((stepsCompleted.length / totalSteps) * 100, 100)
  },

  /**
   * Format session duration
   */
  formatSessionDuration(startTime: string): string {
    const start = new Date(startTime)
    const now = new Date()
    const diffMinutes = Math.floor((now.getTime() - start.getTime()) / (1000 * 60))

    if (diffMinutes < 60) {
      return `${diffMinutes} minutes`
    } else {
      const hours = Math.floor(diffMinutes / 60)
      const remainingMinutes = diffMinutes % 60
      return `${hours}h ${remainingMinutes}m`
    }
  },

  /**
   * Generate demo analytics summary
   */
  generateAnalyticsSummary(analytics: DemoAnalytics): any {
    return {
      totalEvents: analytics.events.length,
      totalPageViews: analytics.page_views.length,
      featuresUsed: analytics.feature_usage.length,
      completionRate: analytics.conversion_funnel.filter(step => step.completed).length / analytics.conversion_funnel.length * 100,
      averagePageLoadTime: Object.values(analytics.performance_metrics.page_load_times).reduce((a, b) => a + b, 0) / Object.keys(analytics.performance_metrics.page_load_times).length || 0
    }
  }
}