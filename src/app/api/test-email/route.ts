/**
 * Test Email API Endpoint
 * For development only - verifies SMTP configuration
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifySmtpConnection, sendConfirmationEmail } from '@/lib/email/auth-emails'

export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  try {
    const isConnected = await verifySmtpConnection()

    return NextResponse.json({
      smtp_configured: isConnected,
      smtp_host: process.env.SMTP_HOST,
      smtp_user: process.env.SMTP_USER ? '***configured***' : 'not set',
      smtp_from: process.env.SMTP_FROM_EMAIL,
    })
  } catch (error) {
    return NextResponse.json({
      error: 'SMTP test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Send a test confirmation email
    await sendConfirmationEmail({
      to: email,
      locale: 'nl',
      confirmationUrl: 'https://adsapp.nl/test-confirmation',
    })

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${email}`
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to send test email',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
