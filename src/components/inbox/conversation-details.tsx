import type { ConversationWithDetails } from '@/types'

// Simple time formatter
function formatDateTime(date: Date) {
  return date.toLocaleString()
}

interface ConversationDetailsProps {
  conversation: ConversationWithDetails
  profile: any
  onClose: () => void
}

export function ConversationDetails({ conversation, profile, onClose }: ConversationDetailsProps) {
  const contact = conversation.contact

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Contact Details</h3>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Contact Info */}
        <div>
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center">
              <span className="text-xl font-medium text-white">
                {contact.name?.charAt(0).toUpperCase() ||
                 contact.phone_number.slice(-2).toUpperCase()}
              </span>
            </div>
            <div>
              <h4 className="text-lg font-medium text-gray-900">
                {contact.name || 'Unknown Contact'}
              </h4>
              <p className="text-sm text-gray-500">{contact.phone_number}</p>
            </div>
          </div>

          {contact.profile_picture_url && (
            <div className="mt-4">
              <img
                src={contact.profile_picture_url}
                alt={`${contact.name}'s profile`}
                className="w-16 h-16 rounded-full object-cover"
              />
            </div>
          )}
        </div>

        {/* Contact Actions */}
        <div className="space-y-2">
          <button className="w-full flex items-center px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 rounded-md">
            <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Call {contact.phone_number}
          </button>

          <button className="w-full flex items-center px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 rounded-md">
            <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            Block Contact
          </button>
        </div>

        {/* Tags */}
        <div>
          <h5 className="text-sm font-medium text-gray-900 mb-2">Tags</h5>
          <div className="flex flex-wrap gap-2">
            {contact.tags && contact.tags.length > 0 ? (
              contact.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {tag}
                  <button
                    type="button"
                    className="flex-shrink-0 ml-1.5 h-4 w-4 rounded-full inline-flex items-center justify-center text-blue-400 hover:bg-blue-200 hover:text-blue-500"
                  >
                    <svg className="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m1 1 6 6m0-6-6 6" />
                    </svg>
                  </button>
                </span>
              ))
            ) : (
              <p className="text-sm text-gray-500">No tags</p>
            )}
            <button className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-gray-600 border border-dashed border-gray-300 hover:border-gray-400">
              + Add tag
            </button>
          </div>
        </div>

        {/* Notes */}
        <div>
          <h5 className="text-sm font-medium text-gray-900 mb-2">Notes</h5>
          <textarea
            defaultValue={contact.notes || ''}
            placeholder="Add notes about this contact..."
            className="w-full p-3 text-sm border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
            rows={4}
          />
          <button className="mt-2 px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">
            Save Notes
          </button>
        </div>

        {/* Conversation Stats */}
        <div>
          <h5 className="text-sm font-medium text-gray-900 mb-2">Conversation Info</h5>
          <dl className="text-sm">
            <div className="py-2 flex justify-between">
              <dt className="text-gray-500">Status</dt>
              <dd className="text-gray-900 font-medium">{conversation.status}</dd>
            </div>
            <div className="py-2 flex justify-between">
              <dt className="text-gray-500">Priority</dt>
              <dd className="text-gray-900 font-medium">{conversation.priority}</dd>
            </div>
            <div className="py-2 flex justify-between">
              <dt className="text-gray-500">Assigned to</dt>
              <dd className="text-gray-900">
                {conversation.assigned_agent?.full_name || 'Unassigned'}
              </dd>
            </div>
            <div className="py-2 flex justify-between">
              <dt className="text-gray-500">Created</dt>
              <dd className="text-gray-900">
                {formatDateTime(new Date(conversation.created_at))}
              </dd>
            </div>
            <div className="py-2 flex justify-between">
              <dt className="text-gray-500">Last message</dt>
              <dd className="text-gray-900">
                {conversation.last_message_at &&
                 formatDateTime(new Date(conversation.last_message_at))}
              </dd>
            </div>
            <div className="py-2 flex justify-between">
              <dt className="text-gray-500">First contacted</dt>
              <dd className="text-gray-900">
                {contact.created_at &&
                 formatDateTime(new Date(contact.created_at))}
              </dd>
            </div>
          </dl>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button className="w-full px-3 py-2 text-sm text-left text-red-600 hover:bg-red-50 rounded-md">
            Delete Conversation
          </button>
          <button className="w-full px-3 py-2 text-sm text-left text-gray-700 hover:bg-gray-50 rounded-md">
            Export Chat History
          </button>
        </div>
      </div>
    </div>
  )
}