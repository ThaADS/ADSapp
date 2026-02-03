/**
 * Campaign Detail Page
 * Full analytics and progress tracking for individual campaigns
 * /dashboard/campaigns/[id]
 */

import { Metadata } from 'next'
import { CampaignDetailView } from '@/components/campaigns/campaign-detail-view'

export const metadata: Metadata = {
  title: 'Campagne Details | Adsapp',
  description: 'Gedetailleerde campagne analytics en voortgang',
}

interface CampaignDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  const { id } = await params

  return (
    <div className="min-h-screen bg-gray-50">
      <CampaignDetailView campaignId={id} />
    </div>
  )
}
