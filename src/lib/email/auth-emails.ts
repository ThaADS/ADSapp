/**
 * Auth Email Service
 * Sends localized authentication emails via Resend
 */

import { Resend } from 'resend'
import type { Locale } from '@/../i18n.config'
import {
  generateConfirmationEmail,
  generatePasswordResetEmail,
  generateMagicLinkEmail,
  type ConfirmationTranslations,
  type PasswordResetTranslations,
  type MagicLinkTranslations,
} from './email-templates'

// Initialize Resend (gracefully handles missing API key)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const fromEmail = process.env.RESEND_FROM_EMAIL || 'ADSapp <noreply@adsapp.com>'

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
  if (!resend) {
    console.warn('RESEND_API_KEY not configured. Skipping confirmation email to:', to)
    return
  }

  try {
    const translations = await loadEmailTranslations(locale) as ConfirmationTranslations

    const html = generateConfirmationEmail(translations, locale, confirmationUrl)
    const subject = translations.confirmation?.subject || 'Confirm your email address'

    const { error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
      tags: [
        { name: 'category', value: 'auth-confirmation' },
        { name: 'locale', value: locale },
      ],
    })

    if (error) {
      throw new Error(`Failed to send confirmation email: ${error.message}`)
    }
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
  if (!resend) {
    console.warn('RESEND_API_KEY not configured. Skipping password reset email to:', to)
    return
  }

  try {
    const translations = await loadEmailTranslations(locale) as PasswordResetTranslations

    const html = generatePasswordResetEmail(translations, locale, resetUrl)
    const subject = translations.passwordReset?.subject || 'Reset your password'

    const { error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
      tags: [
        { name: 'category', value: 'auth-password-reset' },
        { name: 'locale', value: locale },
      ],
    })

    if (error) {
      throw new Error(`Failed to send password reset email: ${error.message}`)
    }
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
  if (!resend) {
    console.warn('RESEND_API_KEY not configured. Skipping magic link email to:', to)
    return
  }

  try {
    const translations = await loadEmailTranslations(locale) as MagicLinkTranslations

    const html = generateMagicLinkEmail(translations, locale, magicLinkUrl)
    const subject = translations.magicLink?.subject || 'Your sign-in link'

    const { error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
      tags: [
        { name: 'category', value: 'auth-magic-link' },
        { name: 'locale', value: locale },
      ],
    })

    if (error) {
      throw new Error(`Failed to send magic link email: ${error.message}`)
    }
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
