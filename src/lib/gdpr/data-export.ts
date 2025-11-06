/**
 * GDPR Data Export Service
 *
 * Implements Right to Access (GDPR Article 15) and Right to Data Portability
 * (GDPR Article 20) with multiple export formats.
 *
 * Features:
 * - Complete personal data export
 * - Multiple formats: JSON, CSV, PDF
 * - Structured data packages
 * - Secure download links with expiry
 * - Multi-tenant isolation
 *
 * @module gdpr/data-export
 */

import { createClient } from '@/lib/supabase/server'
import type {
  DataExportRequest,
  DataExportResult,
  PersonalDataPackage,
  ExportFormat,
} from './types'

/**
 * Data Export Service
 *
 * Handles GDPR-compliant data exports for users and contacts.
 */
export class DataExportService {
  /**
   * Export all personal data for a user (GDPR Right to Access)
   */
  static async exportUserData(
    userId: string,
    organizationId: string,
    format: ExportFormat = 'json'
  ): Promise<DataExportResult> {
    const supabase = await createClient()
    const startTime = Date.now()

    console.log(`[DataExport] Exporting user ${userId} data in ${format} format`)

    try {
      // 1. Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .eq('organization_id', organizationId)
        .single()

      if (!profile) {
        throw new Error('User profile not found')
      }

      // 2. Get organization info
      const { data: organization } = await supabase
        .from('organizations')
        .select('name, slug')
        .eq('id', organizationId)
        .single()

      // 3. Build complete data package
      const dataPackage: PersonalDataPackage = {
        user_profile: {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          role: profile.role,
          created_at: profile.created_at,
          updated_at: profile.updated_at,
          last_seen_at: profile.last_seen_at,
        },
        metadata: {
          exported_at: new Date().toISOString(),
          format: format,
          version: '1.0',
          organization: organization?.name || 'Unknown',
        },
      }

      // 4. Format data based on requested format
      let formattedData: any
      let filename: string
      let sizeBytes: number

      switch (format) {
        case 'json':
          formattedData = JSON.stringify(dataPackage, null, 2)
          filename = `user-data-${userId}-${Date.now()}.json`
          sizeBytes = Buffer.byteLength(formattedData, 'utf8')
          break

        case 'csv':
          formattedData = this.convertToCSV(dataPackage)
          filename = `user-data-${userId}-${Date.now()}.csv`
          sizeBytes = Buffer.byteLength(formattedData, 'utf8')
          break

        case 'pdf':
          // For PDF, we return JSON and let client handle PDF generation
          formattedData = dataPackage
          filename = `user-data-${userId}-${Date.now()}.pdf`
          sizeBytes = JSON.stringify(dataPackage).length
          break

        default:
          throw new Error(`Unsupported format: ${format}`)
      }

      const generatedAt = new Date().toISOString()
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days

      console.log(
        `[DataExport] Completed user export in ${Date.now() - startTime}ms (${sizeBytes} bytes)`
      )

      return {
        format,
        filename,
        data: formattedData,
        generated_at: generatedAt,
        expires_at: expiresAt,
        size_bytes: sizeBytes,
      }
    } catch (error) {
      console.error('[DataExport] Error exporting user data:', error)
      throw error
    }
  }

  /**
   * Export contact data (GDPR Right to Access)
   */
  static async exportContactData(
    contactId: string,
    organizationId: string,
    format: ExportFormat = 'json'
  ): Promise<DataExportResult> {
    const supabase = await createClient()
    const startTime = Date.now()

    console.log(`[DataExport] Exporting contact ${contactId} data in ${format} format`)

    try {
      // 1. Get contact info
      const { data: contact } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .eq('organization_id', organizationId)
        .single()

      if (!contact) {
        throw new Error('Contact not found')
      }

      // 2. Get conversations
      const { data: conversations } = await supabase
        .from('conversations')
        .select('*')
        .eq('contact_id', contactId)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      // 3. Get messages
      let allMessages: any[] = []
      if (conversations && conversations.length > 0) {
        const conversationIds = conversations.map(c => c.id)

        const { data: messages } = await supabase
          .from('messages')
          .select('*')
          .in('conversation_id', conversationIds)
          .order('created_at', { ascending: false })

        allMessages = messages || []
      }

      // 4. Get organization info
      const { data: organization } = await supabase
        .from('organizations')
        .select('name, slug')
        .eq('id', organizationId)
        .single()

      // 5. Build data package
      const dataPackage: PersonalDataPackage = {
        contacts: [
          {
            id: contact.id,
            whatsapp_id: contact.whatsapp_id,
            phone_number: contact.phone_number,
            name: contact.name,
            tags: contact.tags,
            notes: contact.notes,
            created_at: contact.created_at,
            updated_at: contact.updated_at,
            last_message_at: contact.last_message_at,
          },
        ],
        conversations: conversations?.map(conv => ({
          id: conv.id,
          status: conv.status,
          priority: conv.priority,
          subject: conv.subject,
          created_at: conv.created_at,
          updated_at: conv.updated_at,
        })),
        messages: allMessages.map(msg => ({
          id: msg.id,
          conversation_id: msg.conversation_id,
          sender_type: msg.sender_type,
          content: msg.content,
          message_type: msg.message_type,
          created_at: msg.created_at,
          is_read: msg.is_read,
        })),
        metadata: {
          exported_at: new Date().toISOString(),
          format: format,
          version: '1.0',
          organization: organization?.name || 'Unknown',
        },
      }

      // 6. Format data
      let formattedData: any
      let filename: string
      let sizeBytes: number

      switch (format) {
        case 'json':
          formattedData = JSON.stringify(dataPackage, null, 2)
          filename = `contact-data-${contactId}-${Date.now()}.json`
          sizeBytes = Buffer.byteLength(formattedData, 'utf8')
          break

        case 'csv':
          formattedData = this.convertToCSV(dataPackage)
          filename = `contact-data-${contactId}-${Date.now()}.csv`
          sizeBytes = Buffer.byteLength(formattedData, 'utf8')
          break

        case 'pdf':
          formattedData = dataPackage
          filename = `contact-data-${contactId}-${Date.now()}.pdf`
          sizeBytes = JSON.stringify(dataPackage).length
          break

        default:
          throw new Error(`Unsupported format: ${format}`)
      }

      const generatedAt = new Date().toISOString()
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

      console.log(
        `[DataExport] Completed contact export in ${Date.now() - startTime}ms (${sizeBytes} bytes)`
      )

      return {
        format,
        filename,
        data: formattedData,
        generated_at: generatedAt,
        expires_at: expiresAt,
        size_bytes: sizeBytes,
      }
    } catch (error) {
      console.error('[DataExport] Error exporting contact data:', error)
      throw error
    }
  }

  /**
   * Export all organization data (admin function)
   */
  static async exportOrganizationData(
    organizationId: string,
    format: ExportFormat = 'json'
  ): Promise<DataExportResult> {
    const supabase = await createClient()
    const startTime = Date.now()

    console.log(`[DataExport] Exporting organization ${organizationId} data in ${format} format`)

    try {
      // 1. Get organization info
      const { data: organization } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single()

      if (!organization) {
        throw new Error('Organization not found')
      }

      // 2. Get all profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, created_at')
        .eq('organization_id', organizationId)
        .is('deleted_at', null)

      // 3. Get contacts count
      const { count: contactsCount } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .is('deleted_at', null)

      // 4. Get conversations count
      const { count: conversationsCount } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .is('deleted_at', null)

      // 5. Get messages count
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id')
        .eq('organization_id', organizationId)

      let messagesCount = 0
      if (conversations && conversations.length > 0) {
        const conversationIds = conversations.map(c => c.id)
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .in('conversation_id', conversationIds)
          .is('deleted_at', null)

        messagesCount = count || 0
      }

      // 6. Build data package
      const dataPackage = {
        organization: {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          subscription_status: organization.subscription_status,
          subscription_tier: organization.subscription_tier,
          created_at: organization.created_at,
        },
        statistics: {
          users: profiles?.length || 0,
          contacts: contactsCount || 0,
          conversations: conversationsCount || 0,
          messages: messagesCount,
        },
        users: profiles,
        metadata: {
          exported_at: new Date().toISOString(),
          format: format,
          version: '1.0',
        },
      }

      // 7. Format data
      let formattedData: any
      let filename: string
      let sizeBytes: number

      switch (format) {
        case 'json':
          formattedData = JSON.stringify(dataPackage, null, 2)
          filename = `org-data-${organizationId}-${Date.now()}.json`
          sizeBytes = Buffer.byteLength(formattedData, 'utf8')
          break

        case 'csv':
          formattedData = this.convertToCSV(dataPackage)
          filename = `org-data-${organizationId}-${Date.now()}.csv`
          sizeBytes = Buffer.byteLength(formattedData, 'utf8')
          break

        case 'pdf':
          formattedData = dataPackage
          filename = `org-data-${organizationId}-${Date.now()}.pdf`
          sizeBytes = JSON.stringify(dataPackage).length
          break

        default:
          throw new Error(`Unsupported format: ${format}`)
      }

      const generatedAt = new Date().toISOString()
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

      console.log(
        `[DataExport] Completed organization export in ${Date.now() - startTime}ms (${sizeBytes} bytes)`
      )

      return {
        format,
        filename,
        data: formattedData,
        generated_at: generatedAt,
        expires_at: expiresAt,
        size_bytes: sizeBytes,
      }
    } catch (error) {
      console.error('[DataExport] Error exporting organization data:', error)
      throw error
    }
  }

  /**
   * Convert data package to CSV format
   */
  private static convertToCSV(dataPackage: PersonalDataPackage | any): string {
    const rows: string[] = []

    // Add metadata section
    rows.push('DATA EXPORT')
    rows.push(`Exported At: ${dataPackage.metadata.exported_at}`)
    rows.push(`Format: CSV`)
    rows.push(`Version: ${dataPackage.metadata.version}`)
    rows.push('')

    // Add user profile if exists
    if (dataPackage.user_profile) {
      rows.push('USER PROFILE')
      rows.push('Field,Value')

      for (const [key, value] of Object.entries(dataPackage.user_profile)) {
        rows.push(`${key},${this.escapeCSV(String(value))}`)
      }

      rows.push('')
    }

    // Add contacts if exists
    if (dataPackage.contacts && dataPackage.contacts.length > 0) {
      rows.push('CONTACTS')

      const contactKeys = Object.keys(dataPackage.contacts[0])
      rows.push(contactKeys.join(','))

      dataPackage.contacts.forEach((contact: any) => {
        const values = contactKeys.map(key => this.escapeCSV(String(contact[key] || '')))
        rows.push(values.join(','))
      })

      rows.push('')
    }

    // Add conversations if exists
    if (dataPackage.conversations && dataPackage.conversations.length > 0) {
      rows.push('CONVERSATIONS')

      const convKeys = Object.keys(dataPackage.conversations[0])
      rows.push(convKeys.join(','))

      dataPackage.conversations.forEach((conv: any) => {
        const values = convKeys.map(key => this.escapeCSV(String(conv[key] || '')))
        rows.push(values.join(','))
      })

      rows.push('')
    }

    // Add messages if exists
    if (dataPackage.messages && dataPackage.messages.length > 0) {
      rows.push('MESSAGES')

      const msgKeys = Object.keys(dataPackage.messages[0])
      rows.push(msgKeys.join(','))

      dataPackage.messages.forEach((msg: any) => {
        const values = msgKeys.map(key => this.escapeCSV(String(msg[key] || '')))
        rows.push(values.join(','))
      })

      rows.push('')
    }

    return rows.join('\n')
  }

  /**
   * Escape CSV values
   */
  private static escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`
    }
    return value
  }

  /**
   * Generate secure download URL (placeholder - implement with actual storage)
   */
  private static async generateDownloadURL(
    filename: string,
    data: any,
    expiresAt: string
  ): Promise<string> {
    // TODO: Implement actual file storage and signed URL generation
    // For now, return a placeholder
    return `/api/gdpr/downloads/${filename}?expires=${expiresAt}`
  }
}

/**
 * Export convenience functions
 */
export const { exportUserData, exportContactData, exportOrganizationData } = DataExportService
