/**
 * Email Template Components
 * Generates branded HTML emails for auth flows with i18n support
 */

import type { Locale } from '@/../i18n.config'

// Brand colors
const BRAND_BLUE = '#2563eb'
const BRAND_BLUE_DARK = '#1d4ed8'
const TEXT_PRIMARY = '#1f2937'
const TEXT_SECONDARY = '#6b7280'
const BG_LIGHT = '#f9fafb'

// Shared email styles
const containerStyle = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
  line-height: 1.6;
  color: ${TEXT_PRIMARY};
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
`

const cardStyle = `
  background-color: #ffffff;
  border-radius: 8px;
  padding: 40px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`

const buttonStyle = `
  display: inline-block;
  background-color: ${BRAND_BLUE};
  color: #ffffff;
  padding: 14px 32px;
  text-decoration: none;
  border-radius: 6px;
  font-weight: 600;
`

const logoStyle = `
  text-align: center;
  margin-bottom: 30px;
`

const footerStyle = `
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
  font-size: 14px;
  color: ${TEXT_SECONDARY};
`

interface EmailTranslations {
  common: {
    greeting: string
    greetingWithName: string
    regards: string
    team: string
    footer: string
    securityNotice: string
    linkExpiry: string
  }
  [key: string]: unknown
}

interface BaseEmailProps {
  locale: Locale
  translations: EmailTranslations
  actionUrl: string
}

/**
 * Email layout wrapper with ADSapp branding
 */
function emailLayout(content: string, locale: Locale): string {
  return `
<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ADSapp</title>
</head>
<body style="${containerStyle}">
  <div style="${cardStyle}">
    <div style="${logoStyle}">
      <h1 style="color: ${BRAND_BLUE}; margin: 0; font-size: 28px;">ADSapp</h1>
    </div>
    ${content}
  </div>
</body>
</html>
  `.trim()
}

/**
 * Interpolate parameters into translation string
 */
function interpolate(text: string, params?: Record<string, string | number>): string {
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (_, key) => params[key]?.toString() ?? `{${key}}`)
}

// Type for email-specific translations
interface ConfirmationTranslations extends EmailTranslations {
  confirmation: {
    subject: string
    title: string
    body: string
    button: string
    linkText: string
    notYou: string
  }
}

export function generateConfirmationEmail(
  translations: ConfirmationTranslations,
  locale: Locale,
  confirmationUrl: string
): string {
  const t = translations.confirmation
  const common = translations.common

  const content = `
    <h2 style="color: ${TEXT_PRIMARY}; margin-bottom: 20px;">${t.title}</h2>
    <p>${common.greeting},</p>
    <p>${t.body}</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${confirmationUrl}" style="${buttonStyle}">${t.button}</a>
    </div>
    <p style="font-size: 14px; color: ${TEXT_SECONDARY};">
      ${t.linkText}<br>
      <a href="${confirmationUrl}" style="color: ${BRAND_BLUE}; word-break: break-all;">${confirmationUrl}</a>
    </p>
    <div style="background-color: ${BG_LIGHT}; border-left: 4px solid ${BRAND_BLUE}; padding: 12px 16px; margin: 20px 0; font-size: 14px;">
      ${t.notYou}
    </div>
    <div style="${footerStyle}">
      <p>${common.regards},<br>${common.team}</p>
      <p>${common.footer}</p>
    </div>
  `

  return emailLayout(content, locale)
}

interface PasswordResetTranslations extends EmailTranslations {
  passwordReset: {
    subject: string
    title: string
    body: string
    button: string
    linkText: string
    expiry: string
    notYou: string
  }
}

export function generatePasswordResetEmail(
  translations: PasswordResetTranslations,
  locale: Locale,
  resetUrl: string
): string {
  const t = translations.passwordReset
  const common = translations.common

  const content = `
    <h2 style="color: ${TEXT_PRIMARY}; margin-bottom: 20px;">${t.title}</h2>
    <p>${common.greeting},</p>
    <p>${t.body}</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" style="${buttonStyle}">${t.button}</a>
    </div>
    <p style="font-size: 14px; color: ${TEXT_SECONDARY};">
      ${t.linkText}<br>
      <a href="${resetUrl}" style="color: ${BRAND_BLUE}; word-break: break-all;">${resetUrl}</a>
    </p>
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 20px 0; font-size: 14px;">
      <strong>⏰</strong> ${t.expiry}
    </div>
    <div style="background-color: ${BG_LIGHT}; border-left: 4px solid ${BRAND_BLUE}; padding: 12px 16px; margin: 20px 0; font-size: 14px;">
      ${t.notYou}
    </div>
    <div style="${footerStyle}">
      <p>${common.regards},<br>${common.team}</p>
      <p>${common.footer}</p>
    </div>
  `

  return emailLayout(content, locale)
}

interface MagicLinkTranslations extends EmailTranslations {
  magicLink: {
    subject: string
    title: string
    body: string
    button: string
    linkText: string
    expiry: string
    notYou: string
  }
}

export function generateMagicLinkEmail(
  translations: MagicLinkTranslations,
  locale: Locale,
  magicLinkUrl: string
): string {
  const t = translations.magicLink
  const common = translations.common

  const content = `
    <h2 style="color: ${TEXT_PRIMARY}; margin-bottom: 20px;">${t.title}</h2>
    <p>${common.greeting},</p>
    <p>${t.body}</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${magicLinkUrl}" style="${buttonStyle}">${t.button}</a>
    </div>
    <p style="font-size: 14px; color: ${TEXT_SECONDARY};">
      ${t.linkText}<br>
      <a href="${magicLinkUrl}" style="color: ${BRAND_BLUE}; word-break: break-all;">${magicLinkUrl}</a>
    </p>
    <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 20px 0; font-size: 14px;">
      <strong>⏰</strong> ${t.expiry}
    </div>
    <div style="background-color: ${BG_LIGHT}; border-left: 4px solid ${BRAND_BLUE}; padding: 12px 16px; margin: 20px 0; font-size: 14px;">
      ${t.notYou}
    </div>
    <div style="${footerStyle}">
      <p>${common.regards},<br>${common.team}</p>
      <p>${common.footer}</p>
    </div>
  `

  return emailLayout(content, locale)
}

// Re-export for use in auth-emails.ts
export type { ConfirmationTranslations, PasswordResetTranslations, MagicLinkTranslations }
