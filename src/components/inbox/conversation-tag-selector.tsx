'use client'

import { useState, useEffect, useRef } from 'react'
import { Tag, X, Plus, Check } from 'lucide-react'

interface Tag {
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

export default function ConversationTagSelector({
  conversationId,
  organizationId,
  selectedTags,
  onAddTag,
  onRemoveTag,
}: ConversationTagSelectorProps) {
  const [availableTags, setAvailableTags] = useState<Tag[]>([])
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
        setAvailableTags(data.tags || [])
      }
    } catch (error) {
      console.error('Error fetching tags:', error)
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

  const getTagColor = (tag: Tag): string => {
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
                onClick={() => handleRemoveTag(tag.id)}
                disabled={isLoading}
                className='ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-white/20'
                title='Tag verwijderen'
              >
                <X className='h-3 w-3' />
              </button>
            </span>
          ))
        ) : (
          <span className='text-xs text-gray-400'>Geen tags</span>
        )}

        {/* Add Tag Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className='inline-flex items-center gap-1 rounded-full border-2 border-dashed border-gray-300 px-2.5 py-0.5 text-xs font-medium text-gray-600 hover:border-emerald-400 hover:text-emerald-600'
          title='Tag toevoegen'
        >
          <Plus className='h-3 w-3' />
          Tag toevoegen
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && unselectedTags.length > 0 && (
        <div className='absolute left-0 top-full z-50 mt-2 w-64 rounded-lg border border-gray-200 bg-white shadow-lg'>
          <div className='p-2'>
            <div className='mb-2 px-2 text-xs font-medium text-gray-500'>
              Beschikbare tags
            </div>
            <div className='max-h-60 space-y-1 overflow-y-auto'>
              {unselectedTags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => {
                    handleAddTag(tag.id)
                    setIsOpen(false)
                  }}
                  disabled={isLoading}
                  className='flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-50'
                >
                  <span
                    className='h-3 w-3 rounded-full'
                    style={{ backgroundColor: getTagColor(tag) }}
                  />
                  {tag.icon && <span>{tag.icon}</span>}
                  <span className='flex-1'>{tag.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
