import type { Metadata } from 'next'
// Temporarily disabled Google Fonts for build performance analysis
// import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import '@/styles/accessibility.css'
import { DemoProvider } from '@/contexts/demo-context'
import { AccessibilityProvider } from '@/components/accessibility/accessibility-provider'
import { ToastProvider } from '@/components/ui/toast'
import { WebVitals } from '@/components/performance/web-vitals'

// const geistSans = Geist({
//   variable: '--font-geist-sans',
//   subsets: ['latin'],
//   display: 'swap',
//   preload: true,
// })

// const geistMono = Geist_Mono({
//   variable: '--font-geist-mono',
//   subsets: ['latin'],
//   display: 'swap',
//   preload: true,
// })

export const metadata: Metadata = {
  title: 'ADSapp - Professional WhatsApp Business Inbox',
  description:
    "Transform your WhatsApp business communication with ADSapp's professional inbox. Manage conversations, automate responses, and scale your customer support.",
}

export const dynamic = 'force-dynamic'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body
        className="antialiased"
        suppressHydrationWarning
      >
        <WebVitals />
        <ToastProvider>
          <AccessibilityProvider>
            <DemoProvider>{children}</DemoProvider>
          </AccessibilityProvider>
        </ToastProvider>
      </body>
    </html>
  )
}
