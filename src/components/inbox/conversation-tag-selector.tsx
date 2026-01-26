'use client'

import { useState, useEffect, useRef } from 'react'
import { Tag, X, Plus, Check } from 'lucide-react'
import { useTranslations } from '@/components/providers/translation-provider'

interface TagItem {
  id: string
  name: string
  color_hex?: string
  color_class?: string
  icon?: string
}

interface ConversationTagSelectorProps {
  conversationId: string
  organizationId: string
  selectedTags: string[] // Array of tag IDs
  onAddTag: (tagId: string) => Promise<void>
  onRemoveTag: (tagId: string) => Promise<void>
}

// Standaard tags die altijd beschikbaar zijn als fallback
const DEFAULT_TAGS: TagItem[] = [
  { id: 'sales', name: 'Sales', color_hex: '#10b981', icon: '💰' },
  { id: 'leads', name: 'Leads', color_hex: '#3b82f6', icon: '🎯' },
  { id: 'follow-up', name: 'Follow-up', color_hex: '#f59e0b', icon: '📅' },
  { id: 'service', name: 'Service', color_hex: '#8b5cf6', icon: '🔧' },
  { id: 'backoffice', name: 'Backoffice', color_hex: '#6366f1', icon: '📋' },
  { id: 'administratie', name: 'Administratie', color_hex: '#ec4899', icon: '📄' },
  { id: 'agent-1', name: 'Agent 1', color_hex: '#14b8a6', icon: '👤' },
  { id: 'agent-2', name: 'Agent 2', color_hex: '#f97316', icon: '👤' },
  { id: 'agent-3', name: 'Agent 3', color_hex: '#a855f7', icon: '👤' },
]

export default function ConversationTagSelector({
  conversationId,
  organizationId,
  selectedTags,
  onAddTag,
  onRemoveTag,
}: ConversationTagSelectorProps) {
  const t = useTranslations('inbox')
  const [availableTags, setAvailableTags] = useState<TagItem[]>(DEFAULT_TAGS)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchTags()
  }, [organizationId])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const fetchTags = async () => {
    try {
      const response = await fetch(`/api/tags?organization_id=${organizationId}`)
      if (response.ok) {
        const data = await response.json()
        const dbTags = data.tags || []

        // Als er tags uit de database komen, gebruik die
        // Anders gebruik de standaard tags
        if (dbTags.length > 0) {
          // Combineer database tags met standaard tags (database tags hebben voorrang)
          const dbTagIds = new Set(dbTags.map((t: TagItem) => t.id))
          const combinedTags = [
            ...dbTags,
            ...DEFAULT_TAGS.filter(t => !dbTagIds.has(t.id))
          ]
          setAvailableTags(combinedTags)
        } else {
          // Geen database tags, gebruik standaard tags
          setAvailableTags(DEFAULT_TAGS)
        }
      }
    } catch (error) {
      console.error('Error fetching tags:', error)
      // Bij een fout, gebruik standaard tags
      setAvailableTags(DEFAULT_TAGS)
    }
  }

  const handleAddTag = async (tagId: string) => {
    setIsLoading(true)
    try {
      await onAddTag(tagId)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveTag = async (tagId: string) => {
    setIsLoading(true)
    try {
      await onRemoveTag(tagId)
    } finally {
      setIsLoading(false)
    }
  }

  const getTagColor = (tag: TagItem): string => {
    if (tag.color_hex) {
      return tag.color_hex
    }
    // Default colors if none specified
    const defaultColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
    const index = availableTags.indexOf(tag) % defaultColors.length
    return defaultColors[index]
  }

  const selectedTagObjects = availableTags.filter(tag => selectedTags.includes(tag.id))
  const unselectedTags = availableTags.filter(tag => !selectedTags.includes(tag.id))

  return (
    <div className='relative inline-block' ref={dropdownRef}>
      {/* Selected Tags Display */}
      <div className='flex flex-wrap items-center gap-2'>
        {selectedTagObjects.length > 0 ? (
          selectedTagObjects.map(tag => (
            <span
              key={tag.id}
              className='inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium text-white shadow-sm'
              style={{ backgroundColor: getTagColor(tag) }}
            >
              {tag.icon && <span>{tag.icon}</span>}
              {tag.name}
              <button
                type='button'
                onClick={() => handleRemoveTag(tag.id)}
                disabled={isLoading}
                className='ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-white/20'
                title={t('tags.remove')}
                aria-label={`${tag.name} ${t('tags.remove').toLowerCase()}`}
              >
                <X className='h-3 w-3' />
              </button>
            </span>
          ))
        ) : (
          <span className='text-xs text-gray-400'>{t('tags.noTags')}</span>
        )}

        {/* Add Tag Button */}
        <button
          type='button'
          onClick={() => setIsOpen(!isOpen)}
          className='inline-flex items-center gap-1 rounded-full border-2 border-dashed border-gray-300 px-2.5 py-0.5 text-xs font-medium text-gray-600 hover:border-emerald-400 hover:text-emerald-600'
          title={t('tags.add')}
          aria-label={t('tags.add')}
          aria-expanded={isOpen ? 'true' : 'false'}
        >
          <Plus className='h-3 w-3' />
          {t('tags.add')}
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className='absolute left-0 top-full z-50 mt-2 w-64 rounded-lg border border-gray-200 bg-white shadow-lg'>
          <div className='p-2'>
            {unselectedTags.length === 0 ? (
              <div className='p-4 text-center'>
                <p className='text-sm text-gray-500'>{t('tags.allAdded')}</p>
              </div>
            ) : (
              <div className='max-h-72 overflow-y-auto'>
                {/* Categorie Tags */}
                {unselectedTags.filter(tag => !tag.id.startsWith('agent-')).length > 0 && (
                  <>
                    <div className='mb-1 px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide'>
                      {t('tags.categories')}
                    </div>
                    <div className='space-y-0.5 mb-2'>
                      {unselectedTags.filter(tag => !tag.id.startsWith('agent-')).map(tag => (
                        <button
                          type='button'
                          key={tag.id}
                          onClick={() => {
                            handleAddTag(tag.id)
                            setIsOpen(false)
                          }}
                          disabled={isLoading}
                          className='flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50'
                          title={`${tag.name} toevoegen`}
                        >
                          <span
                            className='h-3 w-3 rounded-full flex-shrink-0'
                            style={{ backgroundColor: tag.color_hex || '#6b7280' }}
                          />
                          {tag.icon && <span className='flex-shrink-0'>{tag.icon}</span>}
                          <span className='flex-1 truncate'>{tag.name}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {/* Agent Tags */}
                {unselectedTags.filter(tag => tag.id.startsWith('agent-')).length > 0 && (
                  <>
                    <div className='mb-1 px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide border-t border-gray-100 pt-2'>
                      {t('tags.assignTo')}
                    </div>
                    <div className='space-y-0.5'>
                      {unselectedTags.filter(tag => tag.id.startsWith('agent-')).map(tag => (
                        <button
                          type='button'
                          key={tag.id}
                          onClick={() => {
                            handleAddTag(tag.id)
                            setIsOpen(false)
                          }}
                          disabled={isLoading}
                          className='flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50'
                          title={`${tag.name} toevoegen`}
                        >
                          <span
                            className='h-3 w-3 rounded-full flex-shrink-0'
                            style={{ backgroundColor: tag.color_hex || '#6b7280' }}
                          />
                          {tag.icon && <span className='flex-shrink-0'>{tag.icon}</span>}
                          <span className='flex-1 truncate'>{tag.name}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
