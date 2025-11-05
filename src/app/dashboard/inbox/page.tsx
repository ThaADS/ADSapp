import { requireOrganization } from '@/lib/auth'
import WhatsAppInbox from '@/components/inbox/whatsapp-inbox'

// ⚡ PERFORMANCE: Cache page for faster tab switches (data fetched client-side)
export const revalidate = 60

export default async function InboxPage() {
  const profile = await requireOrganization()

  return (
    <div className="h-[calc(100vh-4rem)]">
      <WhatsAppInbox
        organizationId={profile.organization_id}
        currentUserId={profile.id}
        userRole={profile.role as 'owner' | 'admin' | 'agent'}
      />
    </div>
  )
}
