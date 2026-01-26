'use client'

import { useState } from 'react'
import type { ConversationWithDetails } from '@/types'
import ConversationTagSelector from './conversation-tag-selector'
import { useTranslations } from '@/components/providers/translation-provider'

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
  const t = useTranslations('inbox')
  const contact = conversation.contact
  const [conversationTags, setConversationTags] = useState<string[]>(
    conversation.tags || []
  )

  const handleAddTag = async (tagId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversation.id}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagId }),
      })

      if (!response.ok) throw new Error('Failed to add tag')

      setConversationTags([...conversationTags, tagId])
    } catch (error) {
      console.error('Error adding tag:', error)
    }
  }

  const handleRemoveTag = async (tagId: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversation.id}/tags/${tagId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to remove tag')

      setConversationTags(conversationTags.filter(id => id !== tagId))
    } catch (error) {
      console.error('Error removing tag:', error)
    }
  }

  return (
    <div className='flex h-full flex-col bg-white'>
      {/* Header */}
      <div className='flex items-center justify-between border-b border-gray-200 p-4'>
        <h3 className='text-lg font-medium text-gray-900'>{t('contact.details')}</h3>
        <button type='button' onClick={onClose} className='p-1 text-gray-400 hover:text-gray-600'>
          <svg className='h-5 w-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M6 18L18 6M6 6l12 12'
            />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className='flex-1 space-y-6 overflow-y-auto p-4'>
        {/* Contact Info */}
        <div>
          <div className='flex items-center space-x-4'>
            <div className='flex h-16 w-16 items-center justify-center rounded-full bg-green-500'>
              <span className='text-xl font-medium text-white'>
                {contact.name?.charAt(0).toUpperCase() ||
                  contact.phone_number.slice(-2).toUpperCase()}
              </span>
            </div>
            <div>
              <h4 className='text-lg font-medium text-gray-900'>
                {contact.name || t('contact.unknown')}
              </h4>
              <p className='text-sm text-gray-500'>{contact.phone_number}</p>
            </div>
          </div>

          {contact.profile_picture_url && (
            <div className='mt-4'>
              <img
                src={contact.profile_picture_url}
                alt={`${contact.name}'s profile`}
                className='h-16 w-16 rounded-full object-cover'
              />
            </div>
          )}
        </div>

        {/* Contact Actions */}
        <div className='space-y-2'>
          <button type='button' className='flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50'>
            <svg
              className='mr-3 h-4 w-4 text-gray-400'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z'
              />
            </svg>
            {t('contact.call', { phone: contact.phone_number })}
          </button>

          <button type='button' className='flex w-full items-center rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50'>
            <svg
              className='mr-3 h-4 w-4 text-gray-400'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z'
              />
            </svg>
            {t('actions.blockContact')}
          </button>
        </div>

        {/* Tags */}
        <div>
          <h5 className='mb-2 text-sm font-medium text-gray-900'>{t('tags.label')}</h5>
          <div className='flex flex-wrap gap-2'>
            <ConversationTagSelector
              conversationId={conversation.id}
              organizationId={conversation.organization_id}
              selectedTags={conversationTags}
              onAddTag={handleAddTag}
              onRemoveTag={handleRemoveTag}
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <h5 className='mb-2 text-sm font-medium text-gray-900'>{t('contact.notes')}</h5>
          <textarea
            defaultValue={contact.notes || ''}
            placeholder={t('contact.notesPlaceholder')}
            className='w-full resize-none rounded-md border border-gray-300 p-3 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none'
            rows={4}
          />
          <button type='button' className='mt-2 rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700'>
            {t('contact.saveNotes')}
          </button>
        </div>

        {/* Conversation Stats */}
        <div>
          <h5 className='mb-2 text-sm font-medium text-gray-900'>{t('conversationInfo.title')}</h5>
          <dl className='text-sm'>
            <div className='flex justify-between py-2'>
              <dt className='text-gray-500'>{t('conversationInfo.status')}</dt>
              <dd className='font-medium text-gray-900'>{t(`status.${conversation.status}`)}</dd>
            </div>
            <div className='flex justify-between py-2'>
              <dt className='text-gray-500'>{t('conversationInfo.priority')}</dt>
              <dd className='font-medium text-gray-900'>{t(`priority.${conversation.priority}`)}</dd>
            </div>
            <div className='flex justify-between py-2'>
              <dt className='text-gray-500'>{t('conversationInfo.assignedTo')}</dt>
              <dd className='text-gray-900'>
                {conversation.assigned_agent?.full_name || t('assignment.unassigned')}
              </dd>
            </div>
            <div className='flex justify-between py-2'>
              <dt className='text-gray-500'>{t('conversationInfo.created')}</dt>
              <dd className='text-gray-900'>{formatDateTime(new Date(conversation.created_at))}</dd>
            </div>
            <div className='flex justify-between py-2'>
              <dt className='text-gray-500'>{t('conversationInfo.lastMessage')}</dt>
              <dd className='text-gray-900'>
                {conversation.last_message_at &&
                  formatDateTime(new Date(conversation.last_message_at))}
              </dd>
            </div>
            <div className='flex justify-between py-2'>
              <dt className='text-gray-500'>{t('contact.firstContacted')}</dt>
              <dd className='text-gray-900'>
                {contact.created_at && formatDateTime(new Date(contact.created_at))}
              </dd>
            </div>
          </dl>
        </div>

        {/* Actions */}
        <div className='space-y-2'>
          <button type='button' className='w-full rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50'>
            {t('actions.deleteConversation')}
          </button>
          <button type='button' className='w-full rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50'>
            {t('actions.exportChat')}
          </button>
        </div>
      </div>
    </div>
  )
}
