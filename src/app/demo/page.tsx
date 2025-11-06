'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DemoProvider, useDemo, useDemoActions } from '@/contexts/demo-context'
import { DemoScenarioSelector } from '@/components/demo/demo-scenario-selector'
import { DemoWatermark, NotificationWatermark } from '@/components/demo/demo-watermark'

interface DemoFeatureProps {
  icon: React.ReactNode
  title: string
  description: string
}

function DemoFeature({ icon, title, description }: DemoFeatureProps) {
  return (
    <div className='flex items-start space-x-3 rounded-lg border border-gray-200 bg-white p-4'>
      <div className='flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-green-100 to-blue-100'>
        {icon}
      </div>
      <div>
        <h3 className='mb-1 font-semibold text-gray-900'>{title}</h3>
        <p className='text-sm text-gray-600'>{description}</p>
      </div>
    </div>
  )
}

function DemoStartButton({ onStart }: { onStart: () => void }) {
  const [isLoading, setIsLoading] = useState(false)

  const handleStart = async () => {
    setIsLoading(true)
    try {
      // Simulate API call to initialize demo
      await new Promise(resolve => setTimeout(resolve, 1000))
      onStart()
    } catch (error) {
      console.error('Failed to start demo:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleStart}
      disabled={isLoading}
      className='flex w-full items-center justify-center rounded-lg bg-green-600 px-8 py-4 font-semibold text-white transition-colors hover:bg-green-700 disabled:bg-green-400'
    >
      {isLoading ? (
        <>
          <svg
            className='mr-2 h-5 w-5 animate-spin'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
            />
          </svg>
          Starting Demo...
        </>
      ) : (
        <>
          <svg className='mr-2 h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m2-10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
            />
          </svg>
          Start Interactive Demo
        </>
      )}
    </button>
  )
}

function DemoContent() {
  const { state } = useDemo()
  const { startDemo } = useDemoActions()
  const router = useRouter()
  const [selectedScenario, setSelectedScenario] = useState<
    'ecommerce' | 'support' | 'restaurant' | 'agency'
  >('ecommerce')

  useEffect(() => {
    if (state.isActive) {
      // Redirect to inbox demo when demo is active
      router.push('/demo/inbox')
    }
  }, [state.isActive, router])

  const handleStartDemo = () => {
    startDemo(selectedScenario)
  }

  if (state.isActive) {
    return (
      <div className='flex min-h-screen items-center justify-center bg-gray-50'>
        <div className='text-center'>
          <div className='mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-green-600'></div>
          <p className='text-gray-600'>Initializing demo...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-indigo-50'>
      {/* Header */}
      <div className='border-b border-gray-200 bg-white'>
        <div className='mx-auto max-w-7xl px-4 sm:px-6 lg:px-8'>
          <div className='flex h-16 items-center justify-between'>
            <Link href='/' className='text-2xl font-bold text-gray-900'>
              ADS<span className='text-green-600'>app</span>{' '}
              <span className='text-sm font-normal text-gray-500'>Demo</span>
            </Link>
            <Link href='/' className='text-gray-600 transition-colors hover:text-gray-900'>
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>

      <div className='mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8'>
        {/* Hero Section */}
        <div className='mb-16 text-center'>
          <h1 className='mb-6 text-4xl font-bold text-gray-900 lg:text-5xl'>
            Experience ADSapp
            <span className='block text-green-600'>Interactive Demo</span>
          </h1>
          <p className='mx-auto mb-8 max-w-3xl text-xl text-gray-600'>
            Get hands-on experience with our WhatsApp Business inbox. Choose a scenario that matches
            your business and see how ADSapp transforms customer communication.
          </p>

          {/* Quick Stats */}
          <div className='mx-auto mb-12 grid max-w-2xl grid-cols-1 gap-6 md:grid-cols-3'>
            <div className='text-center'>
              <div className='mb-1 text-2xl font-bold text-green-600'>5 min</div>
              <div className='text-sm text-gray-600'>Average demo time</div>
            </div>
            <div className='text-center'>
              <div className='mb-1 text-2xl font-bold text-green-600'>4</div>
              <div className='text-sm text-gray-600'>Business scenarios</div>
            </div>
            <div className='text-center'>
              <div className='mb-1 text-2xl font-bold text-green-600'>100%</div>
              <div className='text-sm text-gray-600'>Interactive experience</div>
            </div>
          </div>
        </div>

        {/* Demo Features */}
        <div className='mb-16'>
          <h2 className='mb-8 text-center text-2xl font-bold text-gray-900'>
            What You'll Experience
          </h2>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
            <DemoFeature
              icon={
                <svg
                  className='h-6 w-6 text-green-600'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'
                  />
                </svg>
              }
              title='Real Conversations'
              description='Handle realistic customer inquiries with sample data'
            />
            <DemoFeature
              icon={
                <svg
                  className='h-6 w-6 text-blue-600'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M13 10V3L4 14h7v7l9-11h-7z'
                  />
                </svg>
              }
              title='Smart Automation'
              description='See how AI-powered responses save time'
            />
            <DemoFeature
              icon={
                <svg
                  className='h-6 w-6 text-purple-600'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
                  />
                </svg>
              }
              title='Live Analytics'
              description='Explore real-time metrics and insights'
            />
            <DemoFeature
              icon={
                <svg
                  className='h-6 w-6 text-indigo-600'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100-4m0 4v2m0-6V4'
                  />
                </svg>
              }
              title='Guided Tour'
              description='Step-by-step walkthrough of key features'
            />
          </div>
        </div>

        {/* Scenario Selection */}
        <div className='mb-12 rounded-2xl bg-white p-8 shadow-xl'>
          <DemoScenarioSelector
            onSelect={setSelectedScenario}
            showDescriptions={true}
            allowChange={true}
          />
        </div>

        {/* Start Demo */}
        <div className='mb-16 text-center'>
          <div className='mx-auto max-w-md'>
            <DemoStartButton onStart={handleStartDemo} />
            <p className='mt-4 text-sm text-gray-600'>
              No signup required • Takes 5 minutes • Reset anytime
            </p>
          </div>
        </div>

        {/* FAQ */}
        <div className='rounded-2xl border border-gray-200 bg-white p-8 shadow-sm'>
          <h2 className='mb-8 text-center text-2xl font-bold text-gray-900'>Demo FAQ</h2>
          <div className='grid grid-cols-1 gap-8 md:grid-cols-2'>
            <div>
              <h3 className='mb-2 font-semibold text-gray-900'>Is this a real WhatsApp account?</h3>
              <p className='text-sm text-gray-600'>
                No, this is a simulated environment with sample data. No real messages are sent or
                received.
              </p>
            </div>
            <div>
              <h3 className='mb-2 font-semibold text-gray-900'>How long does the demo take?</h3>
              <p className='text-sm text-gray-600'>
                The demo typically takes 5-10 minutes, but you can explore at your own pace and
                reset anytime.
              </p>
            </div>
            <div>
              <h3 className='mb-2 font-semibold text-gray-900'>Can I try different scenarios?</h3>
              <p className='text-sm text-gray-600'>
                Yes! You can reset the demo and try different business scenarios to see how ADSapp
                adapts.
              </p>
            </div>
            <div>
              <h3 className='mb-2 font-semibold text-gray-900'>What happens to my demo data?</h3>
              <p className='text-sm text-gray-600'>
                Demo data is temporary and automatically cleared. No personal information is
                collected or stored.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className='mt-16 text-center'>
          <h2 className='mb-4 text-2xl font-bold text-gray-900'>Ready to Get Started?</h2>
          <p className='mb-8 text-gray-600'>
            Experience how ADSapp can transform your WhatsApp business communication
          </p>
          <div className='flex flex-col justify-center gap-4 sm:flex-row'>
            <Link
              href='/auth/signup'
              className='rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-green-700'
            >
              Start Free Trial
            </Link>
            <Link
              href='/#demo'
              className='rounded-lg border-2 border-gray-300 px-6 py-3 font-semibold text-gray-700 transition-colors hover:border-gray-400'
            >
              Book Live Demo
            </Link>
          </div>
        </div>
      </div>

      {/* Watermarks */}
      <DemoWatermark variant='corner' position='bottom-left' />
    </div>
  )
}

export default function DemoPage() {
  return (
    <DemoProvider>
      <DemoContent />
    </DemoProvider>
  )
}
