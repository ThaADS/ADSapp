/**
 * Auth Email Service
 * Sends localized authentication emails via SMTP (nodemailer)
 */

import nodemailer from 'nodemailer'
import type { Locale } from '@/../i18n.config'
import {
  generateConfirmationEmail,
  generatePasswordResetEmail,
  generateMagicLinkEmail,
  type ConfirmationTranslations,
  type PasswordResetTranslations,
  type MagicLinkTranslations,
} from './email-templates'

// SMTP Configuration
const smtpConfig = {
  host: process.env.SMTP_HOST || 'mail.zxcs.nl',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE !== 'false', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
}

// Check if SMTP is configured
const isSmtpConfigured = !!(smtpConfig.auth.user && smtpConfig.auth.pass)

// Create transporter (lazy initialization)
let transporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter | null {
  if (!isSmtpConfigured) {
    return null
  }
  if (!transporter) {
    transporter = nodemailer.createTransport(smtpConfig)
  }
  return transporter
}

// From email address
const fromName = process.env.SMTP_FROM_NAME || 'ADSapp'
const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@adsapp.nl'
const fromAddress = `${fromName} <${fromEmail}>`

/**
 * Load email translations for a locale
 */
async function loadEmailTranslations(locale: Locale): Promise<Record<string, unknown>> {
  try {
    const translations = await import(`@/locales/${locale}/emails.json`)
    return translations.default || translations
  } catch (error) {
    console.warn(`Failed to load email translations for ${locale}, falling back to English`)
    const fallback = await import('@/locales/en/emails.json')
    return fallback.default || fallback
  }
}

interface SendConfirmationEmailParams {
  to: string
  locale: Locale
  confirmationUrl: string
}

/**
 * Send email confirmation email
 */
export async function sendConfirmationEmail({
  to,
  locale,
  confirmationUrl,
}: SendConfirmationEmailParams): Promise<void> {
  const transport = getTransporter()
  if (!transport) {
    console.warn('SMTP not configured. Skipping confirmation email to:', to)
    console.warn('Set SMTP_USER and SMTP_PASS environment variables to enable email sending.')
    return
  }

  try {
    const translations = await loadEmailTranslations(locale) as ConfirmationTranslations

    const html = generateConfirmationEmail(translations, locale, confirmationUrl)
    const subject = translations.confirmation?.subject || 'Confirm your email address'

    await transport.sendMail({
      from: fromAddress,
      to,
      subject,
      html,
    })

    console.log(`Confirmation email sent to ${to} in ${locale}`)
  } catch (error) {
    console.error('Error sending confirmation email:', error)
    throw error
  }
}

interface SendPasswordResetEmailParams {
  to: string
  locale: Locale
  resetUrl: string
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail({
  to,
  locale,
  resetUrl,
}: SendPasswordResetEmailParams): Promise<void> {
  const transport = getTransporter()
  if (!transport) {
    console.warn('SMTP not configured. Skipping password reset email to:', to)
    console.warn('Set SMTP_USER and SMTP_PASS environment variables to enable email sending.')
    return
  }

  try {
    const translations = await loadEmailTranslations(locale) as PasswordResetTranslations

    const html = generatePasswordResetEmail(translations, locale, resetUrl)
    const subject = translations.passwordReset?.subject || 'Reset your password'

    await transport.sendMail({
      from: fromAddress,
      to,
      subject,
      html,
    })

    console.log(`Password reset email sent to ${to} in ${locale}`)
  } catch (error) {
    console.error('Error sending password reset email:', error)
    throw error
  }
}

interface SendMagicLinkEmailParams {
  to: string
  locale: Locale
  magicLinkUrl: string
}

/**
 * Send magic link email
 */
export async function sendMagicLinkEmail({
  to,
  locale,
  magicLinkUrl,
}: SendMagicLinkEmailParams): Promise<void> {
  const transport = getTransporter()
  if (!transport) {
    console.warn('SMTP not configured. Skipping magic link email to:', to)
    console.warn('Set SMTP_USER and SMTP_PASS environment variables to enable email sending.')
    return
  }

  try {
    const translations = await loadEmailTranslations(locale) as MagicLinkTranslations

    const html = generateMagicLinkEmail(translations, locale, magicLinkUrl)
    const subject = translations.magicLink?.subject || 'Your sign-in link'

    await transport.sendMail({
      from: fromAddress,
      to,
      subject,
      html,
    })

    console.log(`Magic link email sent to ${to} in ${locale}`)
  } catch (error) {
    console.error('Error sending magic link email:', error)
    throw error
  }
}

/**
 * Get user's preferred locale from database or fallback
 * Utility function for auth flows that don't have locale context
 */
export async function getUserLocale(userId: string): Promise<Locale> {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()

    const { data: profile } = await supabase
      .from('profiles')
      .select('preferred_language')
      .eq('id', userId)
      .single()

    if (profile?.preferred_language === 'nl' || profile?.preferred_language === 'en') {
      return profile.preferred_language
    }
  } catch (error) {
    console.warn('Failed to get user locale:', error)
  }

  return 'en' // Default fallback
}

/**
 * Get locale from email address (for new user registration)
 * Uses browser locale if available via cookie, otherwise defaults to English
 */
export async function getLocaleForNewUser(email: string): Promise<Locale> {
  // For new users, we could:
  // 1. Check if email domain suggests a locale (e.g., .nl domain)
  // 2. Use a cookie set during the signup flow
  // For now, default to English for new users
  // The user can change their preference after signup

  // Simple heuristic: Dutch email domains get Dutch
  if (email.endsWith('.nl') || email.includes('@nl.')) {
    return 'nl'
  }

  return 'en'
}

/**
 * Verify SMTP connection
 * Useful for health checks and debugging
 */
export async function verifySmtpConnection(): Promise<boolean> {
  const transport = getTransporter()
  if (!transport) {
    console.warn('SMTP not configured')
    return false
  }

  try {
    await transport.verify()
    console.log('SMTP connection verified successfully')
    return true
  } catch (error) {
    console.error('SMTP connection verification failed:', error)
    return false
  }
}
