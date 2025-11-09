/**
 * Broadcast Campaigns Page
 * Send bulk WhatsApp messages to targeted audiences
 */

import { Metadata } from 'next'
import { BroadcastCampaignsList } from '@/components/campaigns/broadcast-campaigns-list'
import { Button } from '@/components/ui/button'
import { PlusIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Broadcast Campagnes | Adsapp',
  description: 'Verstuur bulkberichten naar WhatsApp contacten',
}

export default function BroadcastPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Broadcast Campagnes</h1>
              <p className="mt-1 text-sm text-gray-500">
                Verstuur eenmalige berichten naar grote groepen WhatsApp contacten
              </p>
            </div>

            <Link href="/dashboard/broadcast/new">
              <Button className="flex items-center gap-2">
                <PlusIcon className="h-5 w-5" />
                Nieuwe Broadcast
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <BroadcastCampaignsList />
      </div>
    </div>
  )
}
