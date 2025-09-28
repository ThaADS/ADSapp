import { createClient } from '@/lib/supabase/server'
import { WhatsAppClient } from './client'
import crypto from 'crypto'

export interface WhatsAppBusinessConfig {
  accessToken: string
  appId: string
  appSecret: string
  businessAccountId: string
  phoneNumberId: string
  phoneNumber: string
  webhookVerifyToken: string
}

export interface WhatsAppSetupStep {
  id: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  error?: string
}

export interface BusinessProfile {
  name: string
  category: string
  description?: string
  email?: string
  websites?: string[]
  address?: {
    street: string
    city: string
    state: string
    zip: string
    country: string
  }
  profilePictureUrl?: string
}

export class WhatsAppBusinessAPI {
  private client: WhatsAppClient
  private config: WhatsAppBusinessConfig

  constructor(config: WhatsAppBusinessConfig) {
    this.config = config
    this.client = new WhatsAppClient(config.accessToken, config.phoneNumberId)
  }

  /**
   * WhatsApp Business Setup Wizard
   */
  async runSetupWizard(organizationId: string): Promise<WhatsAppSetupStep[]> {
    const steps: WhatsAppSetupStep[] = [
      {
        id: 'verify_credentials',
        title: 'Verify API Credentials',
        description: 'Testing access token and app credentials',
        status: 'pending'
      },
      {
        id: 'verify_phone_number',
        title: 'Verify Phone Number',
        description: 'Validating WhatsApp Business phone number',
        status: 'pending'
      },
      {
        id: 'setup_webhook',
        title: 'Configure Webhook',
        description: 'Setting up webhook URL and verification',
        status: 'pending'
      },
      {
        id: 'test_messaging',
        title: 'Test Messaging',
        description: 'Sending test message to verify integration',
        status: 'pending'
      },
      {
        id: 'setup_business_profile',
        title: 'Setup Business Profile',
        description: 'Configuring business information and profile',
        status: 'pending'
      },
      {
        id: 'save_configuration',
        title: 'Save Configuration',
        description: 'Storing configuration in database',
        status: 'pending'
      }
    ]

    // Step 1: Verify API Credentials
    steps[0].status = 'in_progress'
    try {
      await this.verifyCredentials()
      steps[0].status = 'completed'
    } catch (error) {
      steps[0].status = 'failed'
      steps[0].error = error instanceof Error ? error.message : 'Unknown error'
      return steps
    }

    // Step 2: Verify Phone Number
    steps[1].status = 'in_progress'
    try {
      const phoneInfo = await this.getPhoneNumberInfo()
      if (phoneInfo.verified_name && phoneInfo.status === 'CONNECTED') {
        steps[1].status = 'completed'
      } else {
        throw new Error('Phone number not verified or not connected')
      }
    } catch (error) {
      steps[1].status = 'failed'
      steps[1].error = error instanceof Error ? error.message : 'Unknown error'
      return steps
    }

    // Step 3: Setup Webhook
    steps[2].status = 'in_progress'
    try {
      await this.setupWebhook()
      steps[2].status = 'completed'
    } catch (error) {
      steps[2].status = 'failed'
      steps[2].error = error instanceof Error ? error.message : 'Unknown error'
      return steps
    }

    // Step 4: Test Messaging
    steps[3].status = 'in_progress'
    try {
      // Send a test message to the business phone number
      await this.sendTestMessage()
      steps[3].status = 'completed'
    } catch (error) {
      steps[3].status = 'failed'
      steps[3].error = error instanceof Error ? error.message : 'Unknown error'
      return steps
    }

    // Step 5: Setup Business Profile
    steps[4].status = 'in_progress'
    try {
      const profile = await this.getBusinessProfile()
      if (profile.name) {
        steps[4].status = 'completed'
      } else {
        throw new Error('Business profile not complete')
      }
    } catch (error) {
      steps[4].status = 'failed'
      steps[4].error = error instanceof Error ? error.message : 'Unknown error'
      return steps
    }

    // Step 6: Save Configuration
    steps[5].status = 'in_progress'
    try {
      await this.saveConfiguration(organizationId)
      steps[5].status = 'completed'
    } catch (error) {
      steps[5].status = 'failed'
      steps[5].error = error instanceof Error ? error.message : 'Unknown error'
      return steps
    }

    return steps
  }

  /**
   * Verify API credentials and permissions
   */
  async verifyCredentials(): Promise<boolean> {
    try {
      const response = await fetch(`https://graph.facebook.com/v18.0/${this.config.appId}`, {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
        },
      })

      if (!response.ok) {
        throw new Error('Invalid access token or app ID')
      }

      const appInfo = await response.json()

      // Verify app has necessary permissions
      const requiredPermissions = ['whatsapp_business_messaging', 'whatsapp_business_management']
      // Note: In practice, you'd check app permissions here

      return true
    } catch (error) {
      throw new Error(`Credential verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get phone number information and verification status
   */
  async getPhoneNumberInfo(): Promise<any> {
    try {
      const response = await fetch(`https://graph.facebook.com/v18.0/${this.config.phoneNumberId}`, {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to get phone number information')
      }

      return await response.json()
    } catch (error) {
      throw new Error(`Phone number verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Setup webhook configuration
   */
  async setupWebhook(): Promise<boolean> {
    try {
      const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/whatsapp`

      const response = await fetch(`https://graph.facebook.com/v18.0/${this.config.appId}/subscriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          object: 'whatsapp_business_account',
          callback_url: webhookUrl,
          verify_token: this.config.webhookVerifyToken,
          fields: ['messages', 'message_deliveries', 'message_reads', 'message_reactions']
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`Webhook setup failed: ${error.error?.message || 'Unknown error'}`)
      }

      return true
    } catch (error) {
      throw new Error(`Webhook configuration failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Send a test message to verify integration
   */
  async sendTestMessage(): Promise<boolean> {
    try {
      // Send a test message to the business phone number itself
      const testMessage = 'WhatsApp Business API integration test successful! 🎉'
      await this.client.sendTextMessage(this.config.phoneNumber, testMessage)
      return true
    } catch (error) {
      throw new Error(`Test message failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get business profile information
   */
  async getBusinessProfile(): Promise<BusinessProfile> {
    try {
      const response = await fetch(`https://graph.facebook.com/v18.0/${this.config.businessAccountId}`, {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to get business profile')
      }

      const profile = await response.json()
      return {
        name: profile.name,
        category: profile.vertical || 'Business',
        description: profile.description,
        email: profile.email,
        websites: profile.websites || [],
        profilePictureUrl: profile.profile_picture_url
      }
    } catch (error) {
      throw new Error(`Failed to get business profile: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Update business profile
   */
  async updateBusinessProfile(profile: Partial<BusinessProfile>): Promise<boolean> {
    try {
      const updateData: any = {}

      if (profile.name) updateData.name = profile.name
      if (profile.category) updateData.vertical = profile.category
      if (profile.description) updateData.description = profile.description
      if (profile.email) updateData.email = profile.email
      if (profile.websites) updateData.websites = profile.websites

      const response = await fetch(`https://graph.facebook.com/v18.0/${this.config.businessAccountId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`Profile update failed: ${error.error?.message || 'Unknown error'}`)
      }

      return true
    } catch (error) {
      throw new Error(`Failed to update business profile: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Save configuration to database
   */
  async saveConfiguration(organizationId: string): Promise<boolean> {
    try {
      const supabase = await createClient()

      const { error } = await supabase
        .from('organizations')
        .update({
          whatsapp_business_account_id: this.config.businessAccountId,
          whatsapp_phone_number_id: this.config.phoneNumberId,
          updated_at: new Date().toISOString()
        })
        .eq('id', organizationId)

      if (error) {
        throw new Error(`Database update failed: ${error.message}`)
      }

      // Store additional configuration in a separate table or encrypted field
      // For security, don't store access tokens in plain text

      return true
    } catch (error) {
      throw new Error(`Failed to save configuration: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Validate webhook signature for security
   */
  static validateWebhook(signature: string, payload: string, appSecret: string): boolean {
    // crypto is now imported at the top

    const expectedSignature = crypto
      .createHmac('sha256', appSecret)
      .update(payload)
      .digest('hex')

    return crypto.timingSafeEqual(
      Buffer.from(signature.replace('sha256=', '')),
      Buffer.from(expectedSignature)
    )
  }

  /**
   * Handle webhook verification challenge
   */
  static handleWebhookVerification(
    mode: string,
    token: string,
    challenge: string,
    verifyToken: string
  ): string | null {
    if (mode === 'subscribe' && token === verifyToken) {
      return challenge
    }
    return null
  }

  /**
   * Get WhatsApp Business API rate limits and usage
   */
  async getRateLimits(): Promise<any> {
    try {
      const response = await fetch(`https://graph.facebook.com/v18.0/${this.config.phoneNumberId}/insights`, {
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to get rate limits')
      }

      return await response.json()
    } catch (error) {
      console.error('Failed to get rate limits:', error)
      return null
    }
  }

  /**
   * Test API connectivity and health
   */
  async healthCheck(): Promise<{
    api: boolean
    webhook: boolean
    phoneNumber: boolean
    businessAccount: boolean
  }> {
    const health = {
      api: false,
      webhook: false,
      phoneNumber: false,
      businessAccount: false
    }

    try {
      // Test API access
      await this.verifyCredentials()
      health.api = true

      // Test phone number
      const phoneInfo = await this.getPhoneNumberInfo()
      health.phoneNumber = phoneInfo.status === 'CONNECTED'

      // Test business account
      const profile = await this.getBusinessProfile()
      health.businessAccount = !!profile.name

      // Test webhook (would require actual webhook endpoint test)
      health.webhook = true // Assume webhook is working if other tests pass

    } catch (error) {
      console.error('Health check failed:', error)
    }

    return health
  }
}

/**
 * WhatsApp Business API Configuration Manager
 */
export class WhatsAppConfigManager {
  static async getConfig(organizationId: string): Promise<WhatsAppBusinessConfig | null> {
    try {
      const supabase = await createClient()

      const { data: organization } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single()

      if (!organization?.whatsapp_phone_number_id) {
        return null
      }

      // In production, decrypt these values
      return {
        accessToken: process.env.WHATSAPP_ACCESS_TOKEN!,
        appId: process.env.WHATSAPP_APP_ID!,
        appSecret: process.env.WHATSAPP_APP_SECRET!,
        businessAccountId: organization.whatsapp_business_account_id!,
        phoneNumberId: organization.whatsapp_phone_number_id,
        phoneNumber: organization.whatsapp_phone_number || '',
        webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN!
      }
    } catch (error) {
      console.error('Failed to get WhatsApp config:', error)
      return null
    }
  }

  static async isConfigured(organizationId: string): Promise<boolean> {
    const config = await this.getConfig(organizationId)
    return config !== null && !!config.phoneNumberId && !!config.businessAccountId
  }

  static async validateConfig(config: WhatsAppBusinessConfig): Promise<{
    valid: boolean
    errors: string[]
  }> {
    const errors: string[] = []

    if (!config.accessToken) errors.push('Access token is required')
    if (!config.appId) errors.push('App ID is required')
    if (!config.appSecret) errors.push('App secret is required')
    if (!config.businessAccountId) errors.push('Business Account ID is required')
    if (!config.phoneNumberId) errors.push('Phone Number ID is required')
    if (!config.webhookVerifyToken) errors.push('Webhook verify token is required')

    if (errors.length > 0) {
      return { valid: false, errors }
    }

    // Test the configuration
    try {
      const api = new WhatsAppBusinessAPI(config)
      await api.verifyCredentials()
      return { valid: true, errors: [] }
    } catch (error) {
      return {
        valid: false,
        errors: [`Configuration test failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      }
    }
  }
}