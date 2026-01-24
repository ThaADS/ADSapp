import { createClient } from '@/lib/supabase/server'
import { decryptWhatsAppCredentials } from '@/lib/security/credential-manager'
import type { ProductSection } from '@/types/whatsapp-catalog'

export interface WhatsAppMedia {
  id: string
  url?: string
  mimeType: string
  filename?: string
  caption?: string
  sha256?: string
  fileSize?: number
}

export interface WhatsAppMessage {
  id: string
  from: string
  timestamp: string
  type:
    | 'text'
    | 'image'
    | 'document'
    | 'audio'
    | 'video'
    | 'location'
    | 'contacts'
    | 'sticker'
    | 'button'
    | 'list'
    | 'interactive'
  text?: {
    body: string
  }
  image?: WhatsAppMedia & { caption?: string }
  document?: WhatsAppMedia & { caption?: string }
  audio?: WhatsAppMedia
  video?: WhatsAppMedia & { caption?: string }
  location?: {
    latitude: number
    longitude: number
    name?: string
    address?: string
  }
  contacts?: Array<{
    name: {
      formatted_name: string
      first_name?: string
      last_name?: string
    }
    phones?: Array<{
      phone: string
      type?: string
    }>
    emails?: Array<{
      email: string
      type?: string
    }>
  }>
  button?: {
    text: string
    payload: string
  }
  interactive?: {
    type: 'button_reply' | 'list_reply'
    button_reply?: {
      id: string
      title: string
    }
    list_reply?: {
      id: string
      title: string
      description?: string
    }
  }
  context?: {
    from: string
    id: string
  }
  errors?: Array<{
    code: number
    title: string
    message: string
  }>
}

export interface WhatsAppStatus {
  id: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  timestamp: string
  recipient_id: string
  conversation?: {
    id: string
    origin?: {
      type: string
    }
  }
  pricing?: {
    billable: boolean
    pricing_model: string
    category: string
  }
  errors?: Array<{
    code: number
    title: string
    message: string
    error_data?: {
      details: string
    }
  }>
}

export interface WhatsAppContact {
  profile: {
    name: string
  }
  wa_id: string
}

export interface WhatsAppWebhookValue {
  messaging_product: string
  metadata: {
    display_phone_number: string
    phone_number_id: string
  }
  contacts?: WhatsAppContact[]
  messages?: WhatsAppMessage[]
  statuses?: WhatsAppStatus[]
}

export class EnhancedWhatsAppClient {
  private apiVersion: string = 'v18.0'
  private baseUrl: string = 'https://graph.facebook.com'
  private accessToken: string

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  async downloadMedia(mediaId: string): Promise<Buffer> {
    try {
      // First, get the media URL
      const mediaResponse = await fetch(`${this.baseUrl}/${this.apiVersion}/${mediaId}`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      })

      if (!mediaResponse.ok) {
        throw new Error(`Failed to get media URL: ${mediaResponse.statusText}`)
      }

      const mediaData = await mediaResponse.json()

      // Download the actual media file
      const fileResponse = await fetch(mediaData.url, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      })

      if (!fileResponse.ok) {
        throw new Error(`Failed to download media: ${fileResponse.statusText}`)
      }

      return Buffer.from(await fileResponse.arrayBuffer())
    } catch (error) {
      console.error('Error downloading media:', error)
      throw error
    }
  }

  async uploadMedia(file: Buffer, type: string, filename?: string): Promise<string> {
    try {
      const formData = new FormData()
      const blob = new Blob([file], { type })

      formData.append('file', blob, filename)
      formData.append('type', type)
      formData.append('messaging_product', 'whatsapp')

      const response = await fetch(`${this.baseUrl}/${this.apiVersion}/media`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Failed to upload media: ${response.statusText}`)
      }

      const result = await response.json()
      return result.id
    } catch (error) {
      console.error('Error uploading media:', error)
      throw error
    }
  }

  async sendMessage(
    phoneNumberId: string,
    to: string,
    message: Record<string, unknown>
  ): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/${this.apiVersion}/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          ...message,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Failed to send message: ${JSON.stringify(errorData)}`)
      }

      const result = await response.json()
      return result.messages[0].id
    } catch (error) {
      console.error('Error sending message:', error)
      throw error
    }
  }

  async markAsRead(phoneNumberId: string, messageId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${this.apiVersion}/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to mark message as read: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Error marking message as read:', error)
      throw error
    }
  }

  async getBusinessProfile(phoneNumberId: string): Promise<Record<string, unknown>> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${this.apiVersion}/${phoneNumberId}?fields=verified_name,display_phone_number,quality_rating,messaging_limit_tier`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to get business profile: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error getting business profile:', error)
      throw error
    }
  }

  async createTemplate(
    businessAccountId: string,
    template: Record<string, unknown>
  ): Promise<string> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${this.apiVersion}/${businessAccountId}/message_templates`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(template),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Failed to create template: ${JSON.stringify(errorData)}`)
      }

      const result = await response.json()
      return result.id
    } catch (error) {
      console.error('Error creating template:', error)
      throw error
    }
  }

  async getTemplates(businessAccountId: string): Promise<Record<string, unknown>[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${this.apiVersion}/${businessAccountId}/message_templates`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to get templates: ${response.statusText}`)
      }

      const result = await response.json()
      return result.data || []
    } catch (error) {
      console.error('Error getting templates:', error)
      throw error
    }
  }

  async deleteTemplate(businessAccountId: string, templateName: string): Promise<void> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${this.apiVersion}/${businessAccountId}/message_templates`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: templateName,
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to delete template: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Error deleting template:', error)
      throw error
    }
  }

  // ============================================================================
  // Product Message Methods
  // ============================================================================

  /**
   * Send a single product message
   * @param phoneNumberId - Business phone number ID
   * @param to - Recipient phone number
   * @param catalogId - Catalog ID from Commerce Manager
   * @param productRetailerId - Product SKU/retailer ID
   * @param options - Optional body and footer text
   * @returns Message ID
   */
  async sendProductMessage(
    phoneNumberId: string,
    to: string,
    catalogId: string,
    productRetailerId: string,
    options?: {
      bodyText?: string
      footerText?: string
    }
  ): Promise<string> {
    const payload: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'product',
        action: {
          catalog_id: catalogId,
          product_retailer_id: productRetailerId
        }
      }
    }

    // Add optional body text
    if (options?.bodyText) {
      (payload.interactive as Record<string, unknown>).body = {
        text: options.bodyText.substring(0, 1024) // Max 1024 chars
      }
    }

    // Add optional footer text
    if (options?.footerText) {
      (payload.interactive as Record<string, unknown>).footer = {
        text: options.footerText.substring(0, 60) // Max 60 chars
      }
    }

    const response = await fetch(
      `${this.baseUrl}/${this.apiVersion}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to send product message: ${error.error?.message || response.statusText}`)
    }

    const data = await response.json()
    return data.messages[0].id
  }

  /**
   * Send a multi-product list message
   * @param phoneNumberId - Business phone number ID
   * @param to - Recipient phone number
   * @param catalogId - Catalog ID from Commerce Manager
   * @param sections - Product sections (max 10 sections, 30 products total)
   * @param options - Required header and body text
   * @returns Message ID
   */
  async sendProductListMessage(
    phoneNumberId: string,
    to: string,
    catalogId: string,
    sections: ProductSection[],
    options: {
      headerText: string
      bodyText: string
      footerText?: string
    }
  ): Promise<string> {
    // Validate constraints
    if (sections.length > 10) {
      throw new Error('Maximum 10 sections allowed')
    }

    const totalProducts = sections.reduce(
      (sum, section) => sum + section.product_items.length,
      0
    )
    if (totalProducts > 30) {
      throw new Error('Maximum 30 products allowed across all sections')
    }

    const payload: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'product_list',
        header: {
          type: 'text',
          text: options.headerText
        },
        body: {
          text: options.bodyText
        },
        action: {
          catalog_id: catalogId,
          sections: sections.map(section => ({
            title: section.title,
            product_items: section.product_items
          }))
        }
      }
    }

    // Add optional footer
    if (options.footerText) {
      (payload.interactive as Record<string, unknown>).footer = {
        text: options.footerText.substring(0, 60)
      }
    }

    const response = await fetch(
      `${this.baseUrl}/${this.apiVersion}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to send product list message: ${error.error?.message || response.statusText}`)
    }

    const data = await response.json()
    return data.messages[0].id
  }

  /**
   * Send a catalog storefront message (opens full catalog)
   * Note: Not available in India
   */
  async sendCatalogMessage(
    phoneNumberId: string,
    to: string,
    options: {
      bodyText: string
      footerText?: string
      thumbnailProductRetailerId?: string
    }
  ): Promise<string> {
    const payload: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'catalog_message',
        body: {
          text: options.bodyText
        },
        action: {
          name: 'catalog_message',
          parameters: options.thumbnailProductRetailerId
            ? { thumbnail_product_retailer_id: options.thumbnailProductRetailerId }
            : {}
        }
      }
    }

    if (options.footerText) {
      (payload.interactive as Record<string, unknown>).footer = {
        text: options.footerText.substring(0, 60)
      }
    }

    const response = await fetch(
      `${this.baseUrl}/${this.apiVersion}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Failed to send catalog message: ${error.error?.message || response.statusText}`)
    }

    const data = await response.json()
    return data.messages[0].id
  }

  // ============================================================================
  // Catalog Fetching Methods
  // ============================================================================

  /**
   * Get products from a catalog with pagination
   * @param catalogId - The Meta Commerce Manager catalog ID
   * @param limit - Number of products to fetch (max 1000)
   * @param after - Cursor for pagination
   * @returns Catalog products response with pagination info
   */
  async getCatalogProducts(
    catalogId: string,
    limit: number = 100,
    after?: string
  ): Promise<{
    data: Array<{
      id: string
      retailer_id: string
      name: string
      description?: string
      price: string
      currency: string
      availability: string
      image_url?: string
      url?: string
      brand?: string
      category?: string
    }>
    paging?: {
      cursors: { before: string; after: string }
      next?: string
    }
  }> {
    try {
      const fields = [
        'id',
        'retailer_id',
        'name',
        'description',
        'price',
        'currency',
        'availability',
        'image_url',
        'url',
        'brand',
        'category',
      ].join(',')

      let url = `${this.baseUrl}/${this.apiVersion}/${catalogId}/products?fields=${fields}&limit=${Math.min(limit, 1000)}`
      if (after) {
        url += `&after=${after}`
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          `Failed to get catalog products: ${response.statusText}${
            errorData.error?.message ? ` - ${errorData.error.message}` : ''
          }`
        )
      }

      return await response.json()
    } catch (error) {
      console.error('Error getting catalog products:', error)
      throw error
    }
  }

  /**
   * Get all products from a catalog (handles pagination automatically)
   * @param catalogId - The Meta Commerce Manager catalog ID
   * @param maxProducts - Maximum number of products to fetch (default 10000)
   * @returns Array of all catalog products
   */
  async getAllCatalogProducts(
    catalogId: string,
    maxProducts: number = 10000
  ): Promise<
    Array<{
      id: string
      retailer_id: string
      name: string
      description?: string
      price: string
      currency: string
      availability: string
      image_url?: string
      url?: string
      brand?: string
      category?: string
    }>
  > {
    const allProducts: Array<{
      id: string
      retailer_id: string
      name: string
      description?: string
      price: string
      currency: string
      availability: string
      image_url?: string
      url?: string
      brand?: string
      category?: string
    }> = []

    let after: string | undefined
    let hasMore = true

    while (hasMore && allProducts.length < maxProducts) {
      const batchSize = Math.min(1000, maxProducts - allProducts.length)
      const response = await this.getCatalogProducts(catalogId, batchSize, after)

      if (response.data && response.data.length > 0) {
        allProducts.push(...response.data)
      }

      if (response.paging?.next && response.paging.cursors?.after) {
        after = response.paging.cursors.after
      } else {
        hasMore = false
      }
    }

    return allProducts
  }

  /**
   * Get catalogs linked to a WhatsApp Business Account
   * @param businessAccountId - The WhatsApp Business Account ID
   * @returns Array of linked catalogs
   */
  async getLinkedCatalogs(businessAccountId: string): Promise<
    Array<{
      id: string
      name: string
    }>
  > {
    try {
      const response = await fetch(
        `${this.baseUrl}/${this.apiVersion}/${businessAccountId}/owned_product_catalogs?fields=id,name`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          `Failed to get linked catalogs: ${response.statusText}${
            errorData.error?.message ? ` - ${errorData.error.message}` : ''
          }`
        )
      }

      const result = await response.json()
      return result.data || []
    } catch (error) {
      console.error('Error getting linked catalogs:', error)
      throw error
    }
  }

  /**
   * Get a single product by retailer ID from a catalog
   * @param catalogId - The Meta Commerce Manager catalog ID
   * @param retailerId - The product retailer ID (SKU)
   * @returns Product details or null if not found
   */
  async getProductByRetailerId(
    catalogId: string,
    retailerId: string
  ): Promise<{
    id: string
    retailer_id: string
    name: string
    description?: string
    price: string
    currency: string
    availability: string
    image_url?: string
    url?: string
    brand?: string
    category?: string
  } | null> {
    try {
      const fields = [
        'id',
        'retailer_id',
        'name',
        'description',
        'price',
        'currency',
        'availability',
        'image_url',
        'url',
        'brand',
        'category',
      ].join(',')

      const response = await fetch(
        `${this.baseUrl}/${this.apiVersion}/${catalogId}/products?fields=${fields}&filter=${encodeURIComponent(
          JSON.stringify({ retailer_id: { eq: retailerId } })
        )}`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          `Failed to get product: ${response.statusText}${
            errorData.error?.message ? ` - ${errorData.error.message}` : ''
          }`
        )
      }

      const result = await response.json()
      return result.data?.[0] || null
    } catch (error) {
      console.error('Error getting product by retailer ID:', error)
      throw error
    }
  }
}

export async function getWhatsAppClient(organizationId: string): Promise<EnhancedWhatsAppClient> {
  const supabase = await createClient()

  const { data: organization, error } = await supabase
    .from('organizations')
    .select('whatsapp_access_token, whatsapp_phone_number_id, whatsapp_business_account_id, whatsapp_webhook_verify_token')
    .eq('id', organizationId)
    .single()

  if (error || !organization?.whatsapp_access_token) {
    throw new Error('WhatsApp access token not found for organization')
  }

  // Decrypt credentials (handles both encrypted and legacy plaintext)
  const credentials = decryptWhatsAppCredentials(
    organizationId,
    organization.whatsapp_access_token,
    organization.whatsapp_phone_number_id,
    organization.whatsapp_business_account_id,
    organization.whatsapp_webhook_verify_token
  )

  if (!credentials) {
    throw new Error('Failed to decrypt WhatsApp credentials for organization')
  }

  return new EnhancedWhatsAppClient(credentials.accessToken)
}
