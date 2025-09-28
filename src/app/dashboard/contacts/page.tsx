import { requireOrganization } from '@/lib/auth'
import ContactManager from '@/components/contacts/contact-manager'

export default async function ContactsPage() {
  const profile = await requireOrganization()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage your WhatsApp contacts and customer information.
        </p>
      </div>
      
      <ContactManager organizationId={profile.organization_id} />
    </div>
  )
}
