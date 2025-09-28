import { requireOrganization } from '@/lib/auth'
import WorkflowBuilder from '@/components/automation/workflow-builder'

export default async function AutomationPage() {
  const profile = await requireOrganization()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Automation</h1>
        <p className="mt-1 text-sm text-gray-600">
          Create automated workflows and responses for your WhatsApp business.
        </p>
      </div>
      
      <WorkflowBuilder organizationId={profile.organization_id} />
    </div>
  )
}
