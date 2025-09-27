import { createClient } from '@/lib/supabase/server'

export interface WhatsAppTemplate {
  id: string
  organizationId: string
  whatsappTemplateId?: string
  name: string
  displayName: string
  category: WhatsAppTemplateCategory
  language: string
  status: WhatsAppTemplateStatus
  content: {
    header?: TemplateHeader
    body: TemplateBody
    footer?: TemplateFooter
    buttons?: TemplateButton[]
  }
  variables: TemplateVariable[]
  rejectionReason?: string
  submittedAt?: Date
  approvedAt?: Date
  lastUsedAt?: Date
  usageCount: number
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export type WhatsAppTemplateCategory =
  | 'AUTHENTICATION'
  | 'MARKETING'
  | 'UTILITY'

export type WhatsAppTemplateStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'DISABLED'
  | 'PAUSED'
  | 'LIMIT_EXCEEDED'

export interface TemplateHeader {
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT'
  text?: string
  mediaUrl?: string
  variables?: TemplateVariable[]
}

export interface TemplateBody {
  text: string
  variables: TemplateVariable[]
}

export interface TemplateFooter {
  text: string
}

export interface TemplateButton {
  type: 'QUICK_REPLY' | 'CALL_TO_ACTION' | 'URL'
  text: string
  url?: string
  phoneNumber?: string
  variables?: TemplateVariable[]
}

export interface TemplateVariable {
  name: string
  example: string
  type: 'TEXT' | 'NUMBER' | 'DATE' | 'CURRENCY'
  required: boolean
  description?: string
}

export interface TemplateUsageAnalytics {
  templateId: string
  totalSent: number
  delivered: number
  read: number
  replied: number
  deliveryRate: number
  readRate: number
  replyRate: number
  lastUsed: Date
  popularTimes: { hour: number; count: number }[]
  topContacts: { contactId: string; name: string; count: number }[]
}

export class WhatsAppTemplateManager {
  private supabase = createClient()

  /**
   * Create a new template
   */
  async createTemplate(
    organizationId: string,
    template: Omit<WhatsAppTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount' | 'status'>
  ): Promise<WhatsAppTemplate> {
    try {
      const templateData = {
        id: crypto.randomUUID(),
        organization_id: organizationId,
        name: template.name,
        display_name: template.displayName,
        category: template.category,
        language: template.language,
        status: 'DRAFT' as WhatsAppTemplateStatus,
        content: template.content,
        variables: template.variables,
        usage_count: 0,
        created_by: template.createdBy,
        created_at: new Date(),
        updated_at: new Date()
      }

      const { data, error } = await this.supabase
        .from('whatsapp_templates')
        .insert(templateData)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create template: ${error.message}`)
      }

      return this.mapToTemplate(data)
    } catch (error) {
      throw new Error(`Failed to create template: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Update existing template
   */
  async updateTemplate(
    templateId: string,
    updates: Partial<WhatsAppTemplate>
  ): Promise<WhatsAppTemplate> {
    try {
      const updateData: any = {
        updated_at: new Date()
      }

      if (updates.displayName) updateData.display_name = updates.displayName
      if (updates.category) updateData.category = updates.category
      if (updates.language) updateData.language = updates.language
      if (updates.content) updateData.content = updates.content
      if (updates.variables) updateData.variables = updates.variables
      if (updates.status) updateData.status = updates.status

      const { data, error } = await this.supabase
        .from('whatsapp_templates')
        .update(updateData)
        .eq('id', templateId)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update template: ${error.message}`)
      }

      return this.mapToTemplate(data)
    } catch (error) {
      throw new Error(`Failed to update template: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Submit template for WhatsApp approval
   */
  async submitTemplate(templateId: string): Promise<WhatsAppTemplate> {
    try {
      // Get template
      const template = await this.getTemplate(templateId)

      // Validate template before submission
      const validation = this.validateTemplate(template)
      if (!validation.valid) {
        throw new Error(`Template validation failed: ${validation.errors.join(', ')}`)
      }

      // Submit to WhatsApp Business API
      const whatsappTemplateId = await this.submitToWhatsApp(template)

      // Update template status
      const { data, error } = await this.supabase
        .from('whatsapp_templates')
        .update({
          status: 'PENDING',
          whatsapp_template_id: whatsappTemplateId,
          submitted_at: new Date(),
          updated_at: new Date()
        })
        .eq('id', templateId)
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to update template status: ${error.message}`)
      }

      return this.mapToTemplate(data)
    } catch (error) {
      throw new Error(`Failed to submit template: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Submit template to WhatsApp Business API
   */
  private async submitToWhatsApp(template: WhatsAppTemplate): Promise<string> {
    try {
      const businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID
      const accessToken = process.env.WHATSAPP_ACCESS_TOKEN

      if (!businessAccountId || !accessToken) {
        throw new Error('WhatsApp Business API credentials not configured')
      }

      const templateData = this.formatTemplateForWhatsApp(template)

      const response = await fetch(`https://graph.facebook.com/v18.0/${businessAccountId}/message_templates`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(templateData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`WhatsApp API Error: ${error.error?.message || 'Unknown error'}`)
      }

      const result = await response.json()
      return result.id
    } catch (error) {
      throw new Error(`Failed to submit to WhatsApp: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Format template for WhatsApp Business API submission
   */
  private formatTemplateForWhatsApp(template: WhatsAppTemplate): any {
    const components: any[] = []

    // Header component
    if (template.content.header) {
      components.push({
        type: 'HEADER',
        format: template.content.header.type,
        text: template.content.header.text,
        example: template.content.header.variables?.length > 0 ? {
          header_text: template.content.header.variables.map(v => v.example)
        } : undefined
      })
    }

    // Body component
    components.push({
      type: 'BODY',
      text: template.content.body.text,
      example: template.content.body.variables.length > 0 ? {
        body_text: [template.content.body.variables.map(v => v.example)]
      } : undefined
    })

    // Footer component
    if (template.content.footer) {
      components.push({
        type: 'FOOTER',
        text: template.content.footer.text
      })
    }

    // Buttons component
    if (template.content.buttons && template.content.buttons.length > 0) {
      components.push({
        type: 'BUTTONS',
        buttons: template.content.buttons.map(button => ({
          type: button.type,
          text: button.text,
          url: button.url,
          phone_number: button.phoneNumber
        }))
      })
    }

    return {
      name: template.name,
      language: template.language,
      category: template.category,
      components
    }
  }

  /**
   * Get template by ID
   */
  async getTemplate(templateId: string): Promise<WhatsAppTemplate> {
    try {
      const { data, error } = await this.supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('id', templateId)
        .single()

      if (error) {
        throw new Error(`Failed to get template: ${error.message}`)
      }

      return this.mapToTemplate(data)
    } catch (error) {
      throw new Error(`Failed to get template: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get templates for organization
   */
  async getTemplates(
    organizationId: string,
    options?: {
      status?: WhatsAppTemplateStatus
      category?: WhatsAppTemplateCategory
      language?: string
      limit?: number
      offset?: number
    }
  ): Promise<{
    templates: WhatsAppTemplate[]
    total: number
    hasMore: boolean
  }> {
    try {
      let query = this.supabase
        .from('whatsapp_templates')
        .select('*', { count: 'exact' })
        .eq('organization_id', organizationId)

      // Apply filters
      if (options?.status) {
        query = query.eq('status', options.status)
      }

      if (options?.category) {
        query = query.eq('category', options.category)
      }

      if (options?.language) {
        query = query.eq('language', options.language)
      }

      // Apply pagination
      const limit = options?.limit || 50
      const offset = options?.offset || 0
      query = query.range(offset, offset + limit - 1)
      query = query.order('created_at', { ascending: false })

      const { data, error, count } = await query

      if (error) {
        throw new Error(`Failed to get templates: ${error.message}`)
      }

      const templates = data?.map(item => this.mapToTemplate(item)) || []

      return {
        templates,
        total: count || 0,
        hasMore: (offset + limit) < (count || 0)
      }
    } catch (error) {
      throw new Error(`Failed to get templates: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId: string): Promise<boolean> {
    try {
      // Get template to check if it's submitted to WhatsApp
      const template = await this.getTemplate(templateId)

      // If template is approved in WhatsApp, disable it instead of deleting
      if (template.status === 'APPROVED' && template.whatsappTemplateId) {
        await this.updateTemplate(templateId, { status: 'DISABLED' })
        return true
      }

      const { error } = await this.supabase
        .from('whatsapp_templates')
        .delete()
        .eq('id', templateId)

      if (error) {
        throw new Error(`Failed to delete template: ${error.message}`)
      }

      return true
    } catch (error) {
      throw new Error(`Failed to delete template: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Validate template before submission
   */
  validateTemplate(template: WhatsAppTemplate): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // Check required fields
    if (!template.name) errors.push('Template name is required')
    if (!template.displayName) errors.push('Display name is required')
    if (!template.category) errors.push('Category is required')
    if (!template.language) errors.push('Language is required')
    if (!template.content.body.text) errors.push('Body text is required')

    // Validate template name (WhatsApp restrictions)
    if (template.name && !/^[a-z0-9_]+$/.test(template.name)) {
      errors.push('Template name can only contain lowercase letters, numbers, and underscores')
    }

    // Validate body text length
    if (template.content.body.text && template.content.body.text.length > 1024) {
      errors.push('Body text cannot exceed 1024 characters')
    }

    // Validate header text length
    if (template.content.header?.text && template.content.header.text.length > 60) {
      errors.push('Header text cannot exceed 60 characters')
    }

    // Validate footer text length
    if (template.content.footer?.text && template.content.footer.text.length > 60) {
      errors.push('Footer text cannot exceed 60 characters')
    }

    // Validate button limits
    if (template.content.buttons && template.content.buttons.length > 3) {
      errors.push('Cannot have more than 3 buttons')
    }

    // Validate variable count
    const totalVariables = [
      ...(template.content.header?.variables || []),
      ...template.content.body.variables,
      ...(template.content.buttons?.flatMap(b => b.variables || []) || [])
    ]

    if (totalVariables.length > 10) {
      errors.push('Cannot have more than 10 variables total')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  /**
   * Send template message
   */
  async sendTemplateMessage(
    templateId: string,
    to: string,
    variables: Record<string, string>,
    phoneNumberId: string,
    accessToken: string
  ): Promise<any> {
    try {
      const template = await this.getTemplate(templateId)

      if (template.status !== 'APPROVED') {
        throw new Error('Template is not approved for sending')
      }

      if (!template.whatsappTemplateId) {
        throw new Error('Template not submitted to WhatsApp')
      }

      // Build components with variables
      const components = this.buildTemplateComponents(template, variables)

      const messageData = {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: template.name,
          language: { code: template.language },
          components
        }
      }

      const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`Failed to send template message: ${error.error?.message || 'Unknown error'}`)
      }

      // Update usage count and last used
      await this.updateTemplate(templateId, {
        usageCount: template.usageCount + 1,
        lastUsedAt: new Date()
      })

      return await response.json()
    } catch (error) {
      throw new Error(`Failed to send template message: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Build template components with variables
   */
  private buildTemplateComponents(template: WhatsAppTemplate, variables: Record<string, string>): any[] {
    const components: any[] = []

    // Header component with variables
    if (template.content.header?.variables && template.content.header.variables.length > 0) {
      components.push({
        type: 'header',
        parameters: template.content.header.variables.map(variable => ({
          type: 'text',
          text: variables[variable.name] || variable.example
        }))
      })
    }

    // Body component with variables
    if (template.content.body.variables.length > 0) {
      components.push({
        type: 'body',
        parameters: template.content.body.variables.map(variable => ({
          type: 'text',
          text: variables[variable.name] || variable.example
        }))
      })
    }

    // Button components with variables
    template.content.buttons?.forEach((button, index) => {
      if (button.variables && button.variables.length > 0) {
        components.push({
          type: 'button',
          sub_type: button.type.toLowerCase(),
          index,
          parameters: button.variables.map(variable => ({
            type: 'text',
            text: variables[variable.name] || variable.example
          }))
        })
      }
    })

    return components
  }

  /**
   * Get template analytics
   */
  async getTemplateAnalytics(
    organizationId: string,
    templateId: string,
    dateRange: { start: Date; end: Date }
  ): Promise<TemplateUsageAnalytics> {
    try {
      // Get message data for this template
      const { data: messages, error } = await this.supabase
        .from('messages')
        .select(`
          id,
          created_at,
          delivered_at,
          read_at,
          conversation:conversations!inner(
            id,
            organization_id,
            contact:contacts(id, name)
          )
        `)
        .eq('conversation.organization_id', organizationId)
        .eq('template_id', templateId)
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())

      if (error) {
        throw new Error(`Failed to get template analytics: ${error.message}`)
      }

      // Calculate analytics
      const totalSent = messages?.length || 0
      const delivered = messages?.filter(m => m.delivered_at).length || 0
      const read = messages?.filter(m => m.read_at).length || 0

      // Get reply data (messages sent by contacts after template message)
      const replied = 0 // Would need more complex query to calculate actual replies

      // Calculate popular times
      const hourCounts: Record<number, number> = {}
      messages?.forEach(message => {
        const hour = new Date(message.created_at).getHours()
        hourCounts[hour] = (hourCounts[hour] || 0) + 1
      })

      const popularTimes = Object.entries(hourCounts).map(([hour, count]) => ({
        hour: parseInt(hour),
        count
      }))

      // Calculate top contacts
      const contactCounts: Record<string, { name: string; count: number }> = {}
      messages?.forEach(message => {
        const contactId = message.conversation.contact.id
        const contactName = message.conversation.contact.name || 'Unknown'
        if (!contactCounts[contactId]) {
          contactCounts[contactId] = { name: contactName, count: 0 }
        }
        contactCounts[contactId].count++
      })

      const topContacts = Object.entries(contactCounts)
        .map(([contactId, data]) => ({
          contactId,
          name: data.name,
          count: data.count
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      return {
        templateId,
        totalSent,
        delivered,
        read,
        replied,
        deliveryRate: totalSent > 0 ? (delivered / totalSent) * 100 : 0,
        readRate: totalSent > 0 ? (read / totalSent) * 100 : 0,
        replyRate: totalSent > 0 ? (replied / totalSent) * 100 : 0,
        lastUsed: messages?.[0] ? new Date(messages[0].created_at) : new Date(),
        popularTimes,
        topContacts
      }
    } catch (error) {
      throw new Error(`Failed to get template analytics: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Sync template status from WhatsApp
   */
  async syncTemplateStatus(organizationId: string): Promise<number> {
    try {
      const businessAccountId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID
      const accessToken = process.env.WHATSAPP_ACCESS_TOKEN

      if (!businessAccountId || !accessToken) {
        throw new Error('WhatsApp Business API credentials not configured')
      }

      // Get templates from WhatsApp
      const response = await fetch(`https://graph.facebook.com/v18.0/${businessAccountId}/message_templates`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch templates from WhatsApp')
      }

      const { data: whatsappTemplates } = await response.json()

      // Get local templates
      const { templates: localTemplates } = await this.getTemplates(organizationId)

      let updatedCount = 0

      // Update local template statuses
      for (const localTemplate of localTemplates) {
        if (!localTemplate.whatsappTemplateId) continue

        const whatsappTemplate = whatsappTemplates.find(
          (wt: any) => wt.id === localTemplate.whatsappTemplateId
        )

        if (whatsappTemplate && whatsappTemplate.status !== localTemplate.status) {
          await this.updateTemplate(localTemplate.id, {
            status: whatsappTemplate.status as WhatsAppTemplateStatus,
            rejectionReason: whatsappTemplate.rejected_reason,
            approvedAt: whatsappTemplate.status === 'APPROVED' ? new Date() : undefined
          })
          updatedCount++
        }
      }

      return updatedCount
    } catch (error) {
      throw new Error(`Failed to sync template status: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Map database record to template interface
   */
  private mapToTemplate(data: any): WhatsAppTemplate {
    return {
      id: data.id,
      organizationId: data.organization_id,
      whatsappTemplateId: data.whatsapp_template_id,
      name: data.name,
      displayName: data.display_name,
      category: data.category,
      language: data.language,
      status: data.status,
      content: data.content,
      variables: data.variables || [],
      rejectionReason: data.rejection_reason,
      submittedAt: data.submitted_at ? new Date(data.submitted_at) : undefined,
      approvedAt: data.approved_at ? new Date(data.approved_at) : undefined,
      lastUsedAt: data.last_used_at ? new Date(data.last_used_at) : undefined,
      usageCount: data.usage_count || 0,
      createdBy: data.created_by,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    }
  }
}

/**
 * Pre-built template helpers
 */
export class TemplateHelpers {
  static createWelcomeTemplate(): Omit<WhatsAppTemplate, 'id' | 'organizationId' | 'createdBy' | 'createdAt' | 'updatedAt' | 'usageCount' | 'status'> {
    return {
      name: 'welcome_message',
      displayName: 'Welcome Message',
      category: 'UTILITY',
      language: 'en',
      content: {
        body: {
          text: 'Welcome to {{1}}! We\'re excited to help you with your needs. How can we assist you today?',
          variables: [
            {
              name: 'company_name',
              example: 'Your Company',
              type: 'TEXT',
              required: true,
              description: 'Your company or business name'
            }
          ]
        }
      },
      variables: [
        {
          name: 'company_name',
          example: 'Your Company',
          type: 'TEXT',
          required: true,
          description: 'Your company or business name'
        }
      ]
    }
  }

  static createAppointmentReminderTemplate(): Omit<WhatsAppTemplate, 'id' | 'organizationId' | 'createdBy' | 'createdAt' | 'updatedAt' | 'usageCount' | 'status'> {
    return {
      name: 'appointment_reminder',
      displayName: 'Appointment Reminder',
      category: 'UTILITY',
      language: 'en',
      content: {
        body: {
          text: 'Hi {{1}}, this is a reminder that you have an appointment scheduled for {{2}} at {{3}}. Please reply to confirm or reschedule if needed.',
          variables: [
            {
              name: 'customer_name',
              example: 'John',
              type: 'TEXT',
              required: true,
              description: 'Customer first name'
            },
            {
              name: 'appointment_date',
              example: 'tomorrow',
              type: 'TEXT',
              required: true,
              description: 'Appointment date'
            },
            {
              name: 'appointment_time',
              example: '2:00 PM',
              type: 'TEXT',
              required: true,
              description: 'Appointment time'
            }
          ]
        }
      },
      variables: [
        {
          name: 'customer_name',
          example: 'John',
          type: 'TEXT',
          required: true,
          description: 'Customer first name'
        },
        {
          name: 'appointment_date',
          example: 'tomorrow',
          type: 'TEXT',
          required: true,
          description: 'Appointment date'
        },
        {
          name: 'appointment_time',
          example: '2:00 PM',
          type: 'TEXT',
          required: true,
          description: 'Appointment time'
        }
      ]
    }
  }

  static createOrderConfirmationTemplate(): Omit<WhatsAppTemplate, 'id' | 'organizationId' | 'createdBy' | 'createdAt' | 'updatedAt' | 'usageCount' | 'status'> {
    return {
      name: 'order_confirmation',
      displayName: 'Order Confirmation',
      category: 'UTILITY',
      language: 'en',
      content: {
        body: {
          text: 'Thank you for your order! Your order #{{1}} has been confirmed and will be delivered by {{2}}. Total amount: ${{3}}',
          variables: [
            {
              name: 'order_number',
              example: '12345',
              type: 'TEXT',
              required: true,
              description: 'Order number'
            },
            {
              name: 'delivery_date',
              example: 'Friday',
              type: 'TEXT',
              required: true,
              description: 'Expected delivery date'
            },
            {
              name: 'total_amount',
              example: '99.99',
              type: 'CURRENCY',
              required: true,
              description: 'Total order amount'
            }
          ]
        }
      },
      variables: [
        {
          name: 'order_number',
          example: '12345',
          type: 'TEXT',
          required: true,
          description: 'Order number'
        },
        {
          name: 'delivery_date',
          example: 'Friday',
          type: 'TEXT',
          required: true,
          description: 'Expected delivery date'
        },
        {
          name: 'total_amount',
          example: '99.99',
          type: 'CURRENCY',
          required: true,
          description: 'Total order amount'
        }
      ]
    }
  }
}