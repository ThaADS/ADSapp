import { requireOrganization } from '@/lib/auth'
import TemplateEditor from '@/components/templates/template-editor'

export default async function TemplatesPage() {
  const profile = await requireOrganization()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Message Templates</h1>
        <p className="mt-1 text-sm text-gray-600">
          Create and manage WhatsApp message templates for your business.
        </p>
      </div>
      
      <TemplateEditor organizationId={profile.organization_id} />
    </div>
  )
}
