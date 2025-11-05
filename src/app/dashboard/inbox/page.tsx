import { requireOrganization } from '@/lib/auth'
import WhatsAppInbox from '@/components/inbox/whatsapp-inbox'

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
