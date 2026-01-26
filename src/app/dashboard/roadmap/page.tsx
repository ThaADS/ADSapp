import { RoadmapOverview } from '@/components/roadmap/roadmap-overview'
import { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Roadmap | ADSapp',
    description: 'Product roadmap and future updates',
}

export default function RoadmapPage() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            <RoadmapOverview />
        </div>
    )
}
