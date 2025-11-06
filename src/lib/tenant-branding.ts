/**
 * Tenant Branding Management System
 *
 * This module provides comprehensive tenant branding functionality including:
 * - Brand configuration management
 * - Theme customization
 * - Logo and asset management
 * - Email template branding
 * - CSS injection and custom styling
 */

// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches

import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

// Types for tenant branding
export interface TenantBranding {
  id: string
  organization_id: string

  // Visual branding
  logo_url?: string
  logo_dark_url?: string
  favicon_url?: string
  primary_color: string
  secondary_color: string
  accent_color: string
  background_color: string
  text_color: string

  // Typography
  font_family: string
  font_size_base: number

  // Company information
  company_name?: string
  company_tagline?: string
  company_description?: string
  support_email?: string
  support_phone?: string
  website_url?: string

  // Custom styling
  custom_css?: string
  custom_js?: string

  // Theme settings
  theme_mode: 'light' | 'dark' | 'auto'
  border_radius: number

  // White-label settings
  hide_powered_by: boolean
  custom_footer_text?: string

  created_at: string
  updated_at: string
}

export interface EmailTemplate {
  id: string
  organization_id: string
  template_type: string
  subject: string
  html_content: string
  text_content?: string
  variables: string[]
  use_custom_branding: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BrandingConfig {
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    text: string
  }
  typography: {
    fontFamily: string
    fontSize: number
  }
  layout: {
    borderRadius: number
  }
  logos: {
    light?: string
    dark?: string
    favicon?: string
  }
  company: {
    name?: string
    tagline?: string
    description?: string
    supportEmail?: string
    supportPhone?: string
    websiteUrl?: string
  }
  theme: {
    mode: 'light' | 'dark' | 'auto'
  }
  whiteLabel: {
    hidePoweredBy: boolean
    customFooter?: string
  }
}

export class TenantBrandingManager {
  private supabase: SupabaseClient

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient
  }

  /**
   * Get tenant branding configuration
   */
  async getBranding(organizationId: string): Promise<TenantBranding | null> {
    const { data, error } = await this.supabase
      .from('tenant_branding')
      .select('*')
      .eq('organization_id', organizationId)
      .single()

    if (error) {
      console.error('Error fetching tenant branding:', error)
      return null
    }

    return data
  }

  /**
   * Create or update tenant branding
   */
  async updateBranding(
    organizationId: string,
    branding: Partial<TenantBranding>
  ): Promise<TenantBranding | null> {
    const { data, error } = await this.supabase
      .from('tenant_branding')
      .upsert({
        organization_id: organizationId,
        ...branding,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Error updating tenant branding:', error)
      return null
    }

    return data
  }

  /**
   * Get branding configuration in a more usable format
   */
  async getBrandingConfig(organizationId: string): Promise<BrandingConfig | null> {
    const branding = await this.getBranding(organizationId)

    if (!branding) {
      return this.getDefaultBrandingConfig()
    }

    return {
      colors: {
        primary: branding.primary_color,
        secondary: branding.secondary_color,
        accent: branding.accent_color,
        background: branding.background_color,
        text: branding.text_color,
      },
      typography: {
        fontFamily: branding.font_family,
        fontSize: branding.font_size_base,
      },
      layout: {
        borderRadius: branding.border_radius,
      },
      logos: {
        light: branding.logo_url,
        dark: branding.logo_dark_url,
        favicon: branding.favicon_url,
      },
      company: {
        name: branding.company_name,
        tagline: branding.company_tagline,
        description: branding.company_description,
        supportEmail: branding.support_email,
        supportPhone: branding.support_phone,
        websiteUrl: branding.website_url,
      },
      theme: {
        mode: branding.theme_mode,
      },
      whiteLabel: {
        hidePoweredBy: branding.hide_powered_by,
        customFooter: branding.custom_footer_text,
      },
    }
  }

  /**
   * Get default branding configuration
   */
  getDefaultBrandingConfig(): BrandingConfig {
    return {
      colors: {
        primary: '#3B82F6',
        secondary: '#1E40AF',
        accent: '#10B981',
        background: '#FFFFFF',
        text: '#1F2937',
      },
      typography: {
        fontFamily: 'Inter',
        fontSize: 14,
      },
      layout: {
        borderRadius: 8,
      },
      logos: {},
      company: {},
      theme: {
        mode: 'light',
      },
      whiteLabel: {
        hidePoweredBy: false,
      },
    }
  }

  /**
   * Generate CSS variables from branding configuration
   */
  generateCSSVariables(config: BrandingConfig): string {
    return `
      :root {
        --brand-primary: ${config.colors.primary};
        --brand-secondary: ${config.colors.secondary};
        --brand-accent: ${config.colors.accent};
        --brand-background: ${config.colors.background};
        --brand-text: ${config.colors.text};
        --brand-font-family: ${config.typography.fontFamily};
        --brand-font-size: ${config.typography.fontSize}px;
        --brand-border-radius: ${config.layout.borderRadius}px;
      }
    `
  }

  /**
   * Generate complete custom CSS
   */
  async generateCustomCSS(organizationId: string): Promise<string> {
    const branding = await this.getBranding(organizationId)

    if (!branding) {
      return ''
    }

    const config = await this.getBrandingConfig(organizationId)

    if (!config) {
      return ''
    }

    let css = this.generateCSSVariables(config)

    // Add theme-specific styles
    if (config.theme.mode === 'dark') {
      css += `
        body {
          background-color: #1F2937;
          color: #F9FAFB;
        }
      `
    }

    // Add custom CSS if provided
    if (branding.custom_css) {
      css += '\n' + branding.custom_css
    }

    return css
  }

  /**
   * Upload and manage brand assets
   */
  async uploadBrandAsset(
    organizationId: string,
    file: File,
    assetType: 'logo' | 'logo_dark' | 'favicon'
  ): Promise<string | null> {
    const fileExt = file.name.split('.').pop()
    const fileName = `${organizationId}/${assetType}.${fileExt}`

    const { data, error } = await this.supabase.storage
      .from('brand-assets')
      .upload(fileName, file, {
        upsert: true,
        contentType: file.type,
      })

    if (error) {
      console.error('Error uploading brand asset:', error)
      return null
    }

    // Get public URL
    const { data: urlData } = this.supabase.storage.from('brand-assets').getPublicUrl(fileName)

    // Update branding record
    const updateField =
      assetType === 'logo'
        ? 'logo_url'
        : assetType === 'logo_dark'
          ? 'logo_dark_url'
          : 'favicon_url'

    await this.updateBranding(organizationId, {
      [updateField]: urlData.publicUrl,
    })

    return urlData.publicUrl
  }

  /**
   * Email template management
   */
  async getEmailTemplate(
    organizationId: string,
    templateType: string
  ): Promise<EmailTemplate | null> {
    const { data, error } = await this.supabase
      .from('tenant_email_templates')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('template_type', templateType)
      .single()

    if (error) {
      console.error('Error fetching email template:', error)
      return null
    }

    return data
  }

  /**
   * Update email template
   */
  async updateEmailTemplate(
    organizationId: string,
    templateType: string,
    template: Partial<EmailTemplate>
  ): Promise<EmailTemplate | null> {
    const { data, error } = await this.supabase
      .from('tenant_email_templates')
      .upsert({
        organization_id: organizationId,
        template_type: templateType,
        ...template,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Error updating email template:', error)
      return null
    }

    return data
  }

  /**
   * Generate branded email HTML
   */
  async generateBrandedEmail(
    organizationId: string,
    templateType: string,
    variables: Record<string, string> = {}
  ): Promise<string> {
    const template = await this.getEmailTemplate(organizationId, templateType)
    const branding = await this.getBranding(organizationId)

    if (!template) {
      return ''
    }

    let html = template.html_content

    // Replace variables
    Object.entries(variables).forEach(([key, value]) => {
      html = html.replace(new RegExp(`{{${key}}}`, 'g'), value)
    })

    // Apply branding if enabled
    if (template.use_custom_branding && branding) {
      // Replace branding placeholders
      html = html.replace(/{{brand\.logo}}/g, branding.logo_url || '')
      html = html.replace(/{{brand\.company_name}}/g, branding.company_name || '')
      html = html.replace(/{{brand\.primary_color}}/g, branding.primary_color)
      html = html.replace(/{{brand\.support_email}}/g, branding.support_email || '')
      html = html.replace(/{{brand\.website_url}}/g, branding.website_url || '')
    }

    return html
  }

  /**
   * Validate branding configuration
   */
  validateBrandingConfig(config: Partial<BrandingConfig>): {
    isValid: boolean
    errors: string[]
  } {
    const errors: string[] = []

    // Validate colors (hex format)
    const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/

    if (config.colors) {
      Object.entries(config.colors).forEach(([key, color]) => {
        if (color && !hexColorRegex.test(color)) {
          errors.push(`Invalid color format for ${key}: ${color}`)
        }
      })
    }

    // Validate typography
    if (
      config.typography?.fontSize &&
      (config.typography.fontSize < 10 || config.typography.fontSize > 24)
    ) {
      errors.push('Font size must be between 10 and 24 pixels')
    }

    // Validate URLs
    const urlFields = ['company.websiteUrl', 'logos.light', 'logos.dark', 'logos.favicon']
    urlFields.forEach(field => {
      const value = this.getNestedValue(config, field)
      if (value && !this.isValidUrl(value)) {
        errors.push(`Invalid URL format for ${field}: ${value}`)
      }
    })

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * Helper function to get nested object value
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current: any, key) => current?.[key], obj)
  }

  /**
   * Helper function to validate URL
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  /**
   * Preview branding configuration
   */
  async previewBranding(
    organizationId: string,
    config: BrandingConfig
  ): Promise<{
    css: string
    logoUrl?: string
    companyName?: string
  }> {
    const css = this.generateCSSVariables(config)

    return {
      css,
      logoUrl: config.logos.light,
      companyName: config.company.name,
    }
  }

  /**
   * Reset branding to defaults
   */
  async resetBranding(organizationId: string): Promise<boolean> {
    const defaultConfig = this.getDefaultBrandingConfig()

    const result = await this.updateBranding(organizationId, {
      primary_color: defaultConfig.colors.primary,
      secondary_color: defaultConfig.colors.secondary,
      accent_color: defaultConfig.colors.accent,
      background_color: defaultConfig.colors.background,
      text_color: defaultConfig.colors.text,
      font_family: defaultConfig.typography.fontFamily,
      font_size_base: defaultConfig.typography.fontSize,
      border_radius: defaultConfig.layout.borderRadius,
      theme_mode: defaultConfig.theme.mode,
      hide_powered_by: defaultConfig.whiteLabel.hidePoweredBy,
      logo_url: undefined,
      logo_dark_url: undefined,
      favicon_url: undefined,
      custom_css: undefined,
      custom_js: undefined,
      custom_footer_text: undefined,
    })

    return !!result
  }

  /**
   * Get branding for public pages (no auth required)
   */
  async getPublicBranding(organizationId: string): Promise<{
    logo?: string
    companyName?: string
    primaryColor: string
    favicon?: string
  }> {
    const branding = await this.getBranding(organizationId)

    return {
      logo: branding?.logo_url,
      companyName: branding?.company_name,
      primaryColor: branding?.primary_color || '#3B82F6',
      favicon: branding?.favicon_url,
    }
  }
}

/**
 * Utility functions for branding
 */
export const brandingUtils = {
  /**
   * Generate a contrasting color
   */
  getContrastColor(hexColor: string): string {
    // Remove # if present
    const color = hexColor.replace('#', '')

    // Convert to RGB
    const r = parseInt(color.substr(0, 2), 16)
    const g = parseInt(color.substr(2, 2), 16)
    const b = parseInt(color.substr(4, 2), 16)

    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

    return luminance > 0.5 ? '#000000' : '#FFFFFF'
  },

  /**
   * Generate color variations
   */
  generateColorPalette(baseColor: string): {
    light: string
    dark: string
    muted: string
  } {
    // This is a simplified version - in production, you'd use a proper color library
    return {
      light: baseColor + '20', // Add transparency
      dark: baseColor.replace(/[0-9A-F]{2}/gi, match =>
        Math.max(0, parseInt(match, 16) - 30)
          .toString(16)
          .padStart(2, '0')
      ),
      muted: baseColor + '80',
    }
  },

  /**
   * Validate hex color
   */
  isValidHexColor(color: string): boolean {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)
  },

  /**
   * Convert CSS to safe inline styles
   */
  sanitizeCSS(css: string): string {
    // Remove potentially dangerous CSS
    return css
      .replace(/@import/g, '')
      .replace(/javascript:/g, '')
      .replace(/expression\(/g, '')
      .replace(/behavior:/g, '')
  },
}

export default TenantBrandingManager
