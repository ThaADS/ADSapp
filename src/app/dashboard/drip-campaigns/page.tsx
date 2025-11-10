/**
 * Drip Campaigns Dashboard Page
 * Overview of all drip campaigns with create/manage functionality
 */

import { Metadata } from 'next'
import { DripCampaignsList } from '@/components/campaigns/drip-campaigns-list'
import { Button } from '@/components/ui/button'
import { PlusIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Drip Campagnes | Adsapp',
  description: 'Beheer geautomatiseerde berichtenreeksen',
}

export default function DripCampaignsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Drip Campagnes</h1>
              <p className="mt-1 text-sm text-gray-500">
                Geautomatiseerde berichtenreeksen die automatisch worden verstuurd over tijd
              </p>
            </div>

            <Link href="/dashboard/drip-campaigns/new">
              <Button className="flex items-center gap-2">
                <PlusIcon className="h-5 w-5" />
                Nieuwe Campagne
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <DripCampaignsList />
      </div>
    </div>
  )
}
