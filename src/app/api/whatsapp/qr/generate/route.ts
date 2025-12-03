/**
 * API Route: Generate WhatsApp QR Code
 * Creates a new session for QR-based WhatsApp connection
 */

import { createClient } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'

export async function POST() {
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

    // Generate a unique session ID
    const sessionId = uuidv4()

    // In a production environment, you would:
    // 1. Initialize a WhatsApp Web.js session or similar library
    // 2. Generate an actual QR code
    // 3. Store session state in database/Redis

    // For now, return a demo QR code
    // In production, integrate with @whiskeysockets/baileys or whatsapp-web.js
    const demoQrData = `whatsapp://qr/${sessionId}`

    // Create a simple QR pattern for demo purposes
    // In production, use a real QR generation library
    const qrCode = generateDemoQR(demoQrData)

    return Response.json({
      sessionId,
      qrCode,
      expiresAt: new Date(Date.now() + 60000).toISOString(), // Expires in 60 seconds
    })
  } catch (error) {
    console.error('QR generation error:', error)
    return Response.json({ error: 'Failed to generate QR code' }, { status: 500 })
  }
}

/**
 * Generate a demo QR code (placeholder)
 * In production, use a proper QR library like 'qrcode'
 */
function generateDemoQR(_data: string): string {
  // This would be replaced with actual QR generation
  // For demo purposes, return a data URL with a simple pattern
  return 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
      <rect width="200" height="200" fill="white"/>
      <g fill="black">
        ${generateQRPattern()}
      </g>
    </svg>
  `.trim())
}

function generateQRPattern(): string {
  const rects: string[] = []
  const size = 8
  const margin = 20

  // Generate a pseudo-random pattern for demo
  for (let y = 0; y < 20; y++) {
    for (let x = 0; x < 20; x++) {
      // Position markers (corners)
      const isPositionMarker =
        (x < 7 && y < 7) || // Top-left
        (x >= 13 && y < 7) || // Top-right
        (x < 7 && y >= 13) // Bottom-left

      if (isPositionMarker) {
        // Draw position marker pattern
        const isOuter = x === 0 || x === 6 || y === 0 || y === 6 ||
                        x === 13 || x === 19 || y === 13 || y === 19
        const isInner = (x >= 2 && x <= 4 && y >= 2 && y <= 4) ||
                        (x >= 15 && x <= 17 && y >= 2 && y <= 4) ||
                        (x >= 2 && x <= 4 && y >= 15 && y <= 17)

        if (isOuter || isInner) {
          rects.push(`<rect x="${margin + x * size}" y="${margin + y * size}" width="${size}" height="${size}"/>`)
        }
      } else {
        // Random data pattern
        if (Math.random() > 0.5) {
          rects.push(`<rect x="${margin + x * size}" y="${margin + y * size}" width="${size}" height="${size}"/>`)
        }
      }
    }
  }

  return rects.join('\n')
}
