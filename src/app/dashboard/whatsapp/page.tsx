import { requireOrganization } from '@/lib/auth'
import WhatsAppStatusClient from './whatsapp-status-client'

// ⚡ PERFORMANCE: Cache page for faster tab switches
export const revalidate = 300

export default async function WhatsAppPage() {
  const profile = await requireOrganization()

  return <WhatsAppStatusClient organizationId={profile.organization_id!} />
}