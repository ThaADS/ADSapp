// @ts-nocheck - Type definitions need review
import { BulkOperation, BulkOperationQueue, BulkMessageConfig, BulkContactImportConfig } from './queue'
import { getWhatsAppClient } from '@/lib/whatsapp/enhanced-client'
import { MediaStorageService } from '@/lib/media/storage'
import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'

export class BulkOperationProcessor {
  private queue: BulkOperationQueue
  private mediaStorage: MediaStorageService

  constructor() {
    this.queue = new BulkOperationQueue()
    this.mediaStorage = new MediaStorageService()
  }

  async processOperation(operation: BulkOperation): Promise<void> {
    try {
      await this.queue.updateStatus(operation.id, 'processing')

      switch (operation.type) {
        case 'bulk_message':
          await this.processBulkMessage(operation)
          break
        case 'bulk_contact_import':
          await this.processBulkContactImport(operation)
          break
        case 'bulk_contact_export':
          await this.processBulkContactExport(operation)
          break
        case 'bulk_conversation_close':
          await this.processBulkConversationClose(operation)
          break
        default:
          throw new Error(`Unknown operation type: ${operation.type}`)
      }

      await this.queue.updateStatus(operation.id, 'completed')
    } catch (error) {
      console.error(`Bulk operation ${operation.id} failed:`, error)
      await this.queue.updateStatus(operation.id, 'failed', error.message)
    }
  }

  private async processBulkMessage(operation: BulkOperation): Promise<void> {
    const config = operation.configuration as BulkMessageConfig
    const supabase = await createClient()
    const whatsappClient = await getWhatsAppClient(operation.organizationId)

    // Get organization's phone number ID
    const { data: org } = await supabase
      .from('organizations')
      .select('whatsapp_phone_number_id')
      .eq('id', operation.organizationId)
      .single()

    if (!org?.whatsapp_phone_number_id) {
      throw new Error('WhatsApp phone number not configured')
    }

    const results = {
      sent: [],
      failed: [],
      summary: {
        totalSent: 0,
        totalFailed: 0,
        errors: {}
      }
    }

    let processedCount = 0
    let failedCount = 0

    for (const recipient of config.recipients) {
      try {
        // Check if operation was cancelled
        const currentOp = await this.queue.getOperation(operation.id, operation.organizationId)
        if (currentOp?.status === 'cancelled') {
          break
        }

        let messageData: any

        if (config.message.type === 'text') {
          messageData = {
            type: 'text',
            text: { body: config.message.content }
          }
        } else if (config.message.type === 'template') {
          messageData = {
            type: 'template',
            template: {
              name: config.message.content, // template name
              language: { code: 'en' },
              components: recipient.variables ? [{
                type: 'body',
                parameters: Object.values(recipient.variables).map(value => ({
                  type: 'text',
                  text: value
                }))
              }] : undefined
            }
          }
        }

        // Send message
        const messageId = await whatsappClient.sendMessage(
          org.whatsapp_phone_number_id,
          recipient.phoneNumber,
          messageData
        )

        // Store message in database
        await this.storeOutgoingMessage(
          supabase,
          operation.organizationId,
          recipient.contactId,
          messageId,
          config.message.content,
          config.message.type,
          operation.userId
        )

        results.sent.push({
          contactId: recipient.contactId,
          phoneNumber: recipient.phoneNumber,
          messageId,
          sentAt: new Date().toISOString()
        })

        results.summary.totalSent++
        processedCount++

        // Apply delay if configured
        if (config.scheduling?.delay && processedCount < config.recipients.length) {
          await new Promise(resolve => setTimeout(resolve, config.scheduling.delay * 1000))
        }

      } catch (error) {
        console.error(`Failed to send message to ${recipient.phoneNumber}:`, error)

        results.failed.push({
          contactId: recipient.contactId,
          phoneNumber: recipient.phoneNumber,
          error: error.message,
          failedAt: new Date().toISOString()
        })

        const errorKey = error.message.substring(0, 100)
        results.summary.errors[errorKey] = (results.summary.errors[errorKey] || 0) + 1
        results.summary.totalFailed++
        failedCount++
      }

      // Update progress every 10 messages
      if (processedCount % 10 === 0) {
        await this.queue.updateProgress(operation.id, {
          processedItems: processedCount,
          failedItems: failedCount,
          results
        })
      }
    }

    // Final progress update
    await this.queue.updateProgress(operation.id, {
      processedItems: processedCount,
      failedItems: failedCount,
      results
    })
  }

  private async processBulkContactImport(operation: BulkOperation): Promise<void> {
    const config = operation.configuration as BulkContactImportConfig
    const supabase = await createClient()

    // Download the file
    const response = await fetch(config.file.url)
    const fileBuffer = await response.arrayBuffer()

    let contacts: any[] = []

    // Parse file based on format
    switch (config.file.format) {
      case 'csv':
        const csvText = new TextDecoder().decode(fileBuffer)
        const csvData = Papa.parse(csvText, { header: true, skipEmptyLines: true })
        contacts = csvData.data
        break

      case 'xlsx':
        const workbook = XLSX.read(fileBuffer, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        contacts = XLSX.utils.sheet_to_json(worksheet)
        break

      case 'json':
        const jsonText = new TextDecoder().decode(fileBuffer)
        contacts = JSON.parse(jsonText)
        break

      default:
        throw new Error(`Unsupported file format: ${config.file.format}`)
    }

    const results = {
      imported: [],
      skipped: [],
      failed: [],
      summary: {
        totalImported: 0,
        totalSkipped: 0,
        totalFailed: 0
      }
    }

    let processedCount = 0

    for (const rawContact of contacts) {
      try {
        // Map fields according to configuration
        const mappedContact: any = {}
        for (const [targetField, sourceField] of Object.entries(config.mapping)) {
          if (rawContact[sourceField]) {
            mappedContact[targetField] = rawContact[sourceField]
          }
        }

        // Validate required fields
        if (!mappedContact.phone_number) {
          results.failed.push({
            data: rawContact,
            error: 'Missing phone number',
            row: processedCount + 1
          })
          results.summary.totalFailed++
          processedCount++
          continue
        }

        // Check for duplicates if configured
        if (config.options.skipDuplicates) {
          const { data: existing } = await supabase
            .from('contacts')
            .select('id')
            .eq('organization_id', operation.organizationId)
            .eq('phone_number', mappedContact.phone_number)
            .single()

          if (existing) {
            if (config.options.updateExisting) {
              // Update existing contact
              const { error } = await supabase
                .from('contacts')
                .update({
                  ...mappedContact,
                  tags: config.options.tagAll ? [...(mappedContact.tags || []), ...config.options.tagAll] : mappedContact.tags,
                  updated_at: new Date().toISOString()
                })
                .eq('id', existing.id)

              if (error) {
                throw error
              }

              results.imported.push({
                contactId: existing.id,
                phoneNumber: mappedContact.phone_number,
                action: 'updated'
              })
              results.summary.totalImported++
            } else {
              results.skipped.push({
                phoneNumber: mappedContact.phone_number,
                reason: 'Duplicate phone number'
              })
              results.summary.totalSkipped++
            }
            processedCount++
            continue
          }
        }

        // Insert new contact
        const { data: newContact, error } = await supabase
          .from('contacts')
          .insert({
            organization_id: operation.organizationId,
            ...mappedContact,
            tags: config.options.tagAll ? [...(mappedContact.tags || []), ...config.options.tagAll] : mappedContact.tags,
            metadata: { imported: true, import_source: config.file.format }
          })
          .select()
          .single()

        if (error) {
          throw error
        }

        results.imported.push({
          contactId: newContact.id,
          phoneNumber: mappedContact.phone_number,
          action: 'created'
        })
        results.summary.totalImported++

      } catch (error) {
        console.error(`Failed to import contact at row ${processedCount + 1}:`, error)
        results.failed.push({
          data: rawContact,
          error: error.message,
          row: processedCount + 1
        })
        results.summary.totalFailed++
      }

      processedCount++

      // Update progress every 50 contacts
      if (processedCount % 50 === 0) {
        await this.queue.updateProgress(operation.id, {
          processedItems: processedCount,
          results
        })
      }
    }

    // Final progress update
    await this.queue.updateProgress(operation.id, {
      processedItems: processedCount,
      results
    })
  }

  private async processBulkContactExport(operation: BulkOperation): Promise<void> {
    const supabase = await createClient()
    const config = operation.configuration

    // Get all contacts for the organization
    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('organization_id', operation.organizationId)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    // Convert to export format
    const exportData = contacts.map(contact => ({
      id: contact.id,
      name: contact.name,
      phone_number: contact.phone_number,
      email: contact.email,
      tags: contact.tags?.join(', ') || '',
      notes: contact.notes,
      created_at: contact.created_at,
      last_message_at: contact.last_message_at
    }))

    // Generate file based on format
    let fileContent: Buffer
    let mimeType: string
    let filename: string

    switch (config.format) {
      case 'csv':
        const csvContent = Papa.unparse(exportData)
        fileContent = Buffer.from(csvContent, 'utf-8')
        mimeType = 'text/csv'
        filename = `contacts-export-${new Date().toISOString().split('T')[0]}.csv`
        break

      case 'xlsx':
        const worksheet = XLSX.utils.json_to_sheet(exportData)
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Contacts')
        const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
        fileContent = Buffer.from(excelBuffer)
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        filename = `contacts-export-${new Date().toISOString().split('T')[0]}.xlsx`
        break

      case 'json':
        fileContent = Buffer.from(JSON.stringify(exportData, null, 2), 'utf-8')
        mimeType = 'application/json'
        filename = `contacts-export-${new Date().toISOString().split('T')[0]}.json`
        break

      default:
        throw new Error(`Unsupported export format: ${config.format}`)
    }

    // Upload file to storage
    const mediaFile = await this.mediaStorage.uploadFile(
      fileContent,
      filename,
      mimeType,
      {
        organizationId: operation.organizationId,
        uploadedBy: operation.userId
      }
    )

    const results = {
      exportedCount: contacts.length,
      fileUrl: mediaFile.url,
      filename: mediaFile.originalName,
      fileSize: mediaFile.size
    }

    await this.queue.updateProgress(operation.id, {
      processedItems: contacts.length,
      results
    })
  }

  private async processBulkConversationClose(operation: BulkOperation): Promise<void> {
    const supabase = await createClient()
    const config = operation.configuration

    // Get conversations to close based on criteria
    let query = supabase
      .from('conversations')
      .select('id, status')
      .eq('organization_id', operation.organizationId)

    if (config.status) {
      query = query.eq('status', config.status)
    }

    if (config.olderThanDays) {
      const cutoffDate = new Date(Date.now() - config.olderThanDays * 24 * 60 * 60 * 1000).toISOString()
      query = query.lt('last_message_at', cutoffDate)
    }

    const { data: conversations, error } = await query

    if (error) {
      throw error
    }

    const results = {
      closed: [],
      failed: [],
      summary: {
        totalClosed: 0,
        totalFailed: 0
      }
    }

    let processedCount = 0

    for (const conversation of conversations) {
      try {
        const { error: updateError } = await supabase
          .from('conversations')
          .update({
            status: 'closed',
            updated_at: new Date().toISOString()
          })
          .eq('id', conversation.id)

        if (updateError) {
          throw updateError
        }

        results.closed.push(conversation.id)
        results.summary.totalClosed++

      } catch (error) {
        console.error(`Failed to close conversation ${conversation.id}:`, error)
        results.failed.push({
          conversationId: conversation.id,
          error: error.message
        })
        results.summary.totalFailed++
      }

      processedCount++

      // Update progress every 100 conversations
      if (processedCount % 100 === 0) {
        await this.queue.updateProgress(operation.id, {
          processedItems: processedCount,
          results
        })
      }
    }

    // Final progress update
    await this.queue.updateProgress(operation.id, {
      processedItems: processedCount,
      results
    })
  }

  private async storeOutgoingMessage(
    supabase: any,
    organizationId: string,
    contactId: string,
    whatsappMessageId: string,
    content: string,
    messageType: string,
    senderId: string
  ): Promise<void> {
    // Find or create conversation
    let { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('contact_id', contactId)
      .in('status', ['open', 'pending'])
      .single()

    if (!conversation) {
      const { data: newConversation } = await supabase
        .from('conversations')
        .insert({
          organization_id: organizationId,
          contact_id: contactId,
          status: 'open',
          last_message_at: new Date().toISOString()
        })
        .select()
        .single()

      conversation = newConversation
    }

    // Insert message
    await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        whatsapp_message_id: whatsappMessageId,
        sender_type: 'agent',
        sender_id: senderId,
        content,
        message_type: messageType,
        created_at: new Date().toISOString()
      })

    // Update conversation timestamp
    await supabase
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString()
      })
      .eq('id', conversation.id)
  }
}