import { requireOrganization } from '@/lib/auth'
import WhatsAppStatusClient from './whatsapp-status-client'

export default async function WhatsAppPage() {
  const profile = await requireOrganization()

  return <WhatsAppStatusClient organizationId={profile.organization_id!} />
}