export interface WhatsAppTemplateVariable {
  name: string
  type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video'
  required: boolean
  example: string
  description?: string
}

export interface WhatsAppTemplateButton {
  type: 'quick_reply' | 'url' | 'phone_number'
  text: string
  url?: string
  phone_number?: string
}

export interface WhatsAppTemplateContent {
  header?: {
    type: 'text' | 'image' | 'document' | 'video'
    text?: string
    media_url?: string
  }
  body: {
    text: string
  }
  footer?: {
    text: string
  }
  buttons?: WhatsAppTemplateButton[]
}

export interface WhatsAppTemplate {
  id: string
  name: string
  displayName: string
  category: 'marketing' | 'utility' | 'authentication'
  language: string
  status: 'pending' | 'approved' | 'rejected' | 'disabled'
  content: WhatsAppTemplateContent
  variables: WhatsAppTemplateVariable[]
  created_at: string
  updated_at: string
  organization_id: string
}

export interface TemplateUsageStats {
  templateId: string
  sent: number
  delivered: number
  read: number
  failed: number
  lastUsed: string
}

export interface CreateTemplateRequest {
  name: string
  displayName: string
  category: 'marketing' | 'utility' | 'authentication'
  language: string
  content: WhatsAppTemplateContent
  variables: WhatsAppTemplateVariable[]
}

export interface SendTemplateRequest {
  templateId: string
  recipientPhoneNumber: string
  variables: Record<string, string>
  conversationId?: string
}

export class WhatsAppTemplateManager {
  private baseUrl = '/api/templates'

  async getTemplates(
    organizationId: string,
    options?: {
      status?: string
      category?: string
      language?: string
      limit?: number
      offset?: number
    }
  ): Promise<WhatsAppTemplate[]> {
    try {
      const params = new URLSearchParams({
        organization_id: organizationId,
        limit: (options?.limit || 50).toString(),
        offset: (options?.offset || 0).toString(),
      })

      if (options?.status) params.append('status', options.status)
      if (options?.category) params.append('category', options.category)
      if (options?.language) params.append('language', options.language)

      const response = await fetch(`${this.baseUrl}?${params}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch templates: ${response.statusText}`)
      }

      const data = await response.json()
      return data.templates || []
    } catch (error) {
      console.error('Error fetching templates:', error)

      // Return mock templates for development
      return this.getMockTemplates(organizationId)
    }
  }

  async getTemplate(templateId: string): Promise<WhatsAppTemplate | null> {
    try {
      const response = await fetch(`${this.baseUrl}/${templateId}`)
      if (!response.ok) {
        if (response.status === 404) return null
        throw new Error(`Failed to fetch template: ${response.statusText}`)
      }

      const data = await response.json()
      return data.template
    } catch (error) {
      console.error('Error fetching template:', error)
      return null
    }
  }

  async createTemplate(
    organizationId: string,
    template: CreateTemplateRequest
  ): Promise<WhatsAppTemplate> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organization_id: organizationId,
          ...template,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to create template: ${response.statusText}`)
      }

      const data = await response.json()
      return data.template
    } catch (error) {
      console.error('Error creating template:', error)
      throw error
    }
  }

  async updateTemplate(
    templateId: string,
    updates: Partial<CreateTemplateRequest>
  ): Promise<WhatsAppTemplate> {
    try {
      const response = await fetch(`${this.baseUrl}/${templateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error(`Failed to update template: ${response.statusText}`)
      }

      const data = await response.json()
      return data.template
    } catch (error) {
      console.error('Error updating template:', error)
      throw error
    }
  }

  async deleteTemplate(templateId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/${templateId}`, {
        method: 'DELETE',
      })

      return response.ok
    } catch (error) {
      console.error('Error deleting template:', error)
      return false
    }
  }

  async sendTemplate(request: SendTemplateRequest): Promise<{
    success: boolean
    messageId?: string
    error?: string
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      })

      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to send template',
        }
      }

      return {
        success: true,
        messageId: data.messageId,
      }
    } catch (error) {
      console.error('Error sending template:', error)
      return {
        success: false,
        error: 'Network error occurred',
      }
    }
  }

  async syncTemplatesFromWhatsApp(organizationId: string): Promise<{
    synced: number
    errors: string[]
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ organization_id: organizationId }),
      })

      if (!response.ok) {
        throw new Error(`Failed to sync templates: ${response.statusText}`)
      }

      const data = await response.json()
      return {
        synced: data.synced || 0,
        errors: data.errors || [],
      }
    } catch (error) {
      console.error('Error syncing templates:', error)
      return {
        synced: 0,
        errors: ['Failed to sync templates from WhatsApp'],
      }
    }
  }

  async getTemplateUsageStats(
    organizationId: string,
    templateId?: string
  ): Promise<TemplateUsageStats[]> {
    try {
      const params = new URLSearchParams({ organization_id: organizationId })
      if (templateId) params.append('template_id', templateId)

      const response = await fetch(`${this.baseUrl}/stats?${params}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch template stats: ${response.statusText}`)
      }

      const data = await response.json()
      return data.stats || []
    } catch (error) {
      console.error('Error fetching template stats:', error)
      return []
    }
  }

  formatTemplateContent(template: WhatsAppTemplate, variables: Record<string, string>): string {
    let content = template.content.body.text

    // Replace variables in the content
    template.variables.forEach(variable => {
      const value = variables[variable.name] || variable.example || `{{${variable.name}}}`
      const regex = new RegExp(`{{${variable.name}}}`, 'g')
      content = content.replace(regex, value)
    })

    return content
  }

  validateTemplateVariables(
    template: WhatsAppTemplate,
    variables: Record<string, string>
  ): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    template.variables.forEach(variable => {
      if (variable.required && !variables[variable.name]) {
        errors.push(`Variable '${variable.name}' is required`)
      }

      if (variables[variable.name]) {
        // Add type-specific validation here
        switch (variable.type) {
          case 'currency':
            if (!/^\d+(\.\d{2})?$/.test(variables[variable.name])) {
              errors.push(`Variable '${variable.name}' must be a valid currency amount`)
            }
            break
          case 'date_time':
            if (isNaN(Date.parse(variables[variable.name]))) {
              errors.push(`Variable '${variable.name}' must be a valid date`)
            }
            break
        }
      }
    })

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  private getMockTemplates(organizationId: string): WhatsAppTemplate[] {
    return [
      {
        id: 'template-1',
        name: 'welcome_message',
        displayName: 'Welcome Message',
        category: 'utility',
        language: 'en',
        status: 'approved',
        content: {
          header: {
            type: 'text',
            text: 'Welcome to {{company_name}}!',
          },
          body: {
            text: "Hi {{customer_name}}, thank you for contacting us. We're here to help you with any questions you may have.",
          },
          footer: {
            text: 'Reply STOP to opt out',
          },
        },
        variables: [
          {
            name: 'company_name',
            type: 'text',
            required: true,
            example: 'Your Company',
            description: 'Name of your company',
          },
          {
            name: 'customer_name',
            type: 'text',
            required: true,
            example: 'John',
            description: "Customer's first name",
          },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        organization_id: organizationId,
      },
      {
        id: 'template-2',
        name: 'order_confirmation',
        displayName: 'Order Confirmation',
        category: 'utility',
        language: 'en',
        status: 'approved',
        content: {
          header: {
            type: 'text',
            text: 'Order Confirmed',
          },
          body: {
            text: 'Your order #{{order_number}} has been confirmed for {{order_total}}. Expected delivery: {{delivery_date}}.',
          },
          footer: {
            text: 'Track your order at example.com/track',
          },
          buttons: [
            {
              type: 'url',
              text: 'Track Order',
              url: 'https://example.com/track/{{order_number}}',
            },
          ],
        },
        variables: [
          {
            name: 'order_number',
            type: 'text',
            required: true,
            example: 'ORD-12345',
            description: 'Order number',
          },
          {
            name: 'order_total',
            type: 'currency',
            required: true,
            example: '99.99',
            description: 'Total order amount',
          },
          {
            name: 'delivery_date',
            type: 'date_time',
            required: true,
            example: '2024-01-15',
            description: 'Expected delivery date',
          },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        organization_id: organizationId,
      },
      {
        id: 'template-3',
        name: 'appointment_reminder',
        displayName: 'Appointment Reminder',
        category: 'utility',
        language: 'en',
        status: 'approved',
        content: {
          body: {
            text: 'Hi {{customer_name}}, this is a reminder about your appointment on {{appointment_date}} at {{appointment_time}}. Please reply to confirm.',
          },
          buttons: [
            {
              type: 'quick_reply',
              text: 'Confirm',
            },
            {
              type: 'quick_reply',
              text: 'Reschedule',
            },
          ],
        },
        variables: [
          {
            name: 'customer_name',
            type: 'text',
            required: true,
            example: 'John',
            description: "Customer's first name",
          },
          {
            name: 'appointment_date',
            type: 'date_time',
            required: true,
            example: '2024-01-15',
            description: 'Appointment date',
          },
          {
            name: 'appointment_time',
            type: 'text',
            required: true,
            example: '2:00 PM',
            description: 'Appointment time',
          },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        organization_id: organizationId,
      },
    ]
  }

  // Utility methods for template management
  getTemplatesByCategory(templates: WhatsAppTemplate[], category: string): WhatsAppTemplate[] {
    return templates.filter(template => template.category === category)
  }

  getApprovedTemplates(templates: WhatsAppTemplate[]): WhatsAppTemplate[] {
    return templates.filter(template => template.status === 'approved')
  }

  searchTemplates(templates: WhatsAppTemplate[], query: string): WhatsAppTemplate[] {
    const lowercaseQuery = query.toLowerCase()
    return templates.filter(
      template =>
        template.displayName.toLowerCase().includes(lowercaseQuery) ||
        template.name.toLowerCase().includes(lowercaseQuery) ||
        template.content.body.text.toLowerCase().includes(lowercaseQuery)
    )
  }
}
