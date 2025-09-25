'use client'

import { useState } from 'react'
import { ConversationList } from './conversation-list'
import { ChatWindow } from './chat-window'
import { ConversationDetails } from './conversation-details'
import type { ConversationWithDetails } from '@/types'

interface InboxLayoutProps {
  conversations: ConversationWithDetails[]
  profile: any
}

export function InboxLayout({ conversations, profile }: InboxLayoutProps) {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    conversations[0]?.id || null
  )
  const [showDetails, setShowDetails] = useState(false)

  const selectedConversation = conversations.find(c => c.id === selectedConversationId)

  return (
    <div className="flex h-full bg-white">
      {/* Conversation List - Left Sidebar */}
      <div className="w-80 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900">Inbox</h1>
            <div className="flex items-center space-x-2">
              {/* Filter buttons */}
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Status filter tabs */}
          <div className="mt-4 flex space-x-1 bg-gray-100 rounded-lg p-1">
            <button className="flex-1 text-xs font-medium text-white bg-green-600 rounded-md py-1">
              All
            </button>
            <button className="flex-1 text-xs font-medium text-gray-600 hover:text-gray-900 py-1">
              Open
            </button>
            <button className="flex-1 text-xs font-medium text-gray-600 hover:text-gray-900 py-1">
              Assigned
            </button>
            <button className="flex-1 text-xs font-medium text-gray-600 hover:text-gray-900 py-1">
              Unread
            </button>
          </div>
        </div>

        <ConversationList
          conversations={conversations}
          selectedConversationId={selectedConversationId}
          onSelectConversation={setSelectedConversationId}
        />
      </div>

      {/* Chat Window - Center */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedConversation ? (
          <ChatWindow
            conversation={selectedConversation}
            profile={profile}
            onShowDetails={() => setShowDetails(!showDetails)}
            showDetails={showDetails}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No conversation selected</h3>
              <p className="mt-1 text-sm text-gray-500">
                Choose a conversation from the left to start messaging.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Conversation Details - Right Sidebar */}
      {selectedConversation && showDetails && (
        <div className="w-80 border-l border-gray-200">
          <ConversationDetails
            conversation={selectedConversation}
            profile={profile}
            onClose={() => setShowDetails(false)}
          />
        </div>
      )}
    </div>
  )
}