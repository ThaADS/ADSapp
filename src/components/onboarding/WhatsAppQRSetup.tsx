'use client'

import { useState, useEffect, useCallback } from 'react'

interface WhatsAppQRSetupProps {
  onComplete: (credentials: QRCredentials) => void
  onSkip: () => void
}

interface QRCredentials {
  phoneNumberId: string
  businessAccountId: string
  accessToken: string
  webhookVerifyToken: string
  sessionId: string
}

type ConnectionStatus = 'idle' | 'generating' | 'waiting' | 'scanning' | 'connected' | 'error'

export function WhatsAppQRSetup({ onComplete, onSkip }: WhatsAppQRSetupProps) {
  const [status, setStatus] = useState<ConnectionStatus>('idle')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(60)

  // Generate QR code
  const generateQR = useCallback(async () => {
    setStatus('generating')
    setError(null)

    try {
      const response = await fetch('/api/whatsapp/qr/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        throw new Error('Failed to generate QR code')
      }

      const data = await response.json()
      setQrCode(data.qrCode)
      setSessionId(data.sessionId)
      setStatus('waiting')
      setCountdown(60)
    } catch (err) {
      setError('Failed to generate QR code. Please try again.')
      setStatus('error')
    }
  }, [])

  // Poll for connection status
  useEffect(() => {
    if (status !== 'waiting' || !sessionId) return

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/whatsapp/qr/status?sessionId=${sessionId}`)
        const data = await response.json()

        if (data.status === 'scanning') {
          setStatus('scanning')
        } else if (data.status === 'connected') {
          setStatus('connected')
          clearInterval(pollInterval)

          // Complete with session credentials
          setTimeout(() => {
            onComplete({
              phoneNumberId: data.phoneNumberId || `qr-${sessionId}`,
              businessAccountId: data.businessAccountId || `qr-ba-${sessionId}`,
              accessToken: data.accessToken || `qr-token-${sessionId}`,
              webhookVerifyToken: data.webhookVerifyToken || `qr-verify-${sessionId}`,
              sessionId: sessionId,
            })
          }, 1500)
        }
      } catch (err) {
        // Silently continue polling
      }
    }, 2000)

    return () => clearInterval(pollInterval)
  }, [status, sessionId, onComplete])

  // Countdown timer for QR refresh
  useEffect(() => {
    if (status !== 'waiting') return

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // QR expired, regenerate
          generateQR()
          return 60
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [status, generateQR])

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">Connect via QR Code</h2>
        <p className="mt-2 text-gray-600">
          Scan the QR code with your WhatsApp to connect instantly
        </p>
      </div>

      {/* QR Code Display */}
      <div className="rounded-xl border-2 border-gray-200 bg-white p-8">
        {status === 'idle' && (
          <div className="text-center">
            <div className="mb-6">
              <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-2xl bg-gray-100">
                <span className="text-5xl">📱</span>
              </div>
            </div>
            <h3 className="mb-2 text-lg font-semibold">Ready to Connect</h3>
            <p className="mb-6 text-gray-600">
              Click the button below to generate a QR code
            </p>
            <button
              onClick={generateQR}
              className="rounded-lg bg-green-600 px-8 py-3 font-medium text-white transition-colors hover:bg-green-700"
            >
              Generate QR Code
            </button>
          </div>
        )}

        {status === 'generating' && (
          <div className="flex flex-col items-center py-8">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
            <p className="text-gray-600">Generating QR code...</p>
          </div>
        )}

        {status === 'waiting' && qrCode && (
          <div className="text-center">
            <div className="relative mx-auto mb-4 inline-block">
              {/* QR Code placeholder - in production this would be a real QR image */}
              <div className="flex h-64 w-64 items-center justify-center rounded-lg border-4 border-gray-200 bg-white">
                {qrCode.startsWith('data:') ? (
                  <img src={qrCode} alt="WhatsApp QR Code" className="h-full w-full" />
                ) : (
                  <div className="text-center">
                    <div className="grid grid-cols-8 gap-0.5 p-4">
                      {/* Simulated QR pattern */}
                      {Array.from({ length: 64 }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-3 w-3 ${Math.random() > 0.5 ? 'bg-black' : 'bg-white'}`}
                        />
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-gray-400">Demo QR Code</p>
                  </div>
                )}
              </div>

              {/* Countdown badge */}
              <div className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                {countdown}
              </div>
            </div>

            <div className="mb-4 space-y-2">
              <h3 className="text-lg font-semibold">Scan with WhatsApp</h3>
              <p className="text-sm text-gray-600">
                Open WhatsApp on your phone → Go to Settings → Linked Devices → Link a Device
              </p>
            </div>

            <div className="rounded-lg bg-yellow-50 p-4 text-left">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Keep this window open while scanning. The QR code will
                refresh in {countdown} seconds.
              </p>
            </div>
          </div>
        )}

        {status === 'scanning' && (
          <div className="flex flex-col items-center py-8">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <span className="text-3xl">📲</span>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-blue-900">Scanning detected!</h3>
            <p className="text-gray-600">Waiting for confirmation on your phone...</p>
            <div className="mt-4 h-2 w-48 overflow-hidden rounded-full bg-blue-100">
              <div className="h-full w-full animate-pulse bg-blue-500" />
            </div>
          </div>
        )}

        {status === 'connected' && (
          <div className="flex flex-col items-center py-8">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <span className="text-3xl">✓</span>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-green-900">Connected!</h3>
            <p className="text-gray-600">Your WhatsApp is now linked to ADSapp</p>
            <div className="mt-4 h-2 w-48 rounded-full bg-green-500" />
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center py-8">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <span className="text-3xl">✕</span>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-red-900">Connection Failed</h3>
            <p className="mb-4 text-gray-600">{error || 'Something went wrong. Please try again.'}</p>
            <button
              onClick={generateQR}
              className="rounded-lg bg-red-600 px-6 py-2 font-medium text-white transition-colors hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="rounded-lg bg-gray-50 p-6">
        <h4 className="mb-3 font-semibold text-gray-900">How to scan:</h4>
        <ol className="space-y-3 text-sm text-gray-600">
          <li className="flex items-start gap-3">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
              1
            </span>
            <span>Open WhatsApp on your phone</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
              2
            </span>
            <span>
              <strong>Android:</strong> Tap Menu (⋮) → Linked Devices → Link a Device
              <br />
              <strong>iPhone:</strong> Go to Settings → Linked Devices → Link a Device
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
              3
            </span>
            <span>Point your phone camera at the QR code to scan</span>
          </li>
        </ol>
      </div>

      {/* Limitations Notice */}
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        <h4 className="mb-2 font-semibold text-yellow-900">⚠️ QR Code Connection Limitations</h4>
        <ul className="space-y-1 text-sm text-yellow-800">
          <li>• Session may disconnect if phone is offline for extended periods</li>
          <li>• Some advanced features require Cloud API connection</li>
          <li>• Best suited for testing and small-scale usage</li>
          <li>• For production use, we recommend the Cloud API option</li>
        </ul>
      </div>

      {/* Skip Button */}
      <div className="text-center">
        <button
          onClick={onSkip}
          className="text-sm text-gray-500 underline hover:text-gray-700"
        >
          Skip for now - I'll set this up later
        </button>
      </div>
    </div>
  )
}
