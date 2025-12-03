/**
 * API Route: Check WhatsApp QR Session Status
 * Polls for connection status after QR scan
 */

import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return Response.json({ error: 'Session ID required' }, { status: 400 })
    }

    // In production, you would:
    // 1. Check the actual session status from your WhatsApp session store
    // 2. Return the real connection state
    // 3. Once connected, return the phone details

    // For demo purposes, simulate a connection after some time
    // This would be replaced with actual session status checking
    const demoStatus = getDemoStatus(sessionId)

    return Response.json(demoStatus)
  } catch (error) {
    console.error('QR status check error:', error)
    return Response.json({ error: 'Failed to check status' }, { status: 500 })
  }
}

/**
 * Demo status generator
 * In production, replace with actual session state lookup
 */
function getDemoStatus(sessionId: string) {
  // Simulate different states based on session creation time
  // For demo, use a simple random approach
  const random = Math.random()

  if (random < 0.1) {
    // 10% chance of being connected (for demo purposes)
    return {
      status: 'connected',
      phoneNumberId: `qr-phone-${sessionId.slice(0, 8)}`,
      businessAccountId: `qr-ba-${sessionId.slice(0, 8)}`,
      accessToken: `qr-token-${sessionId}`,
      webhookVerifyToken: `qr-verify-${Date.now()}`,
      phoneNumber: '+31 6 12345678',
      deviceName: 'iPhone 14 Pro',
    }
  } else if (random < 0.15) {
    // 5% chance of being in scanning state
    return {
      status: 'scanning',
    }
  } else {
    // Default: waiting for scan
    return {
      status: 'waiting',
    }
  }
}
