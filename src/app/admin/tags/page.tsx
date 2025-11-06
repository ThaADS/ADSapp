'use client'

import { useState, useEffect } from 'react'
import {
  TagIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline'

interface Tag {
  id: string
  name: string
  description: string | null
  color_hex: string
  color_class: string
  icon: string | null
  category_id: string | null
  category?: {
    id: string
    name: string
    description: string | null
  }
  sort_order: number
  is_active: boolean
  usage_count: number
  created_at: string
  updated_at: string
}

interface TagFormData {
  name: string
  description: string
  color_hex: string
  color_class: string
  icon: string
  category_id: string
  is_active: boolean
}

const PREDEFINED_COLORS = [
  { hex: '#EF4444', class: 'bg-red-100 text-red-800', name: 'Red' },
  { hex: '#F59E0B', class: 'bg-orange-100 text-orange-800', name: 'Orange' },
  { hex: '#EAB308', class: 'bg-yellow-100 text-yellow-800', name: 'Yellow' },
  { hex: '#10B981', class: 'bg-green-100 text-green-800', name: 'Green' },
  { hex: '#06B6D4', class: 'bg-cyan-100 text-cyan-800', name: 'Cyan' },
  { hex: '#3B82F6', class: 'bg-blue-100 text-blue-800', name: 'Blue' },
  { hex: '#8B5CF6', class: 'bg-purple-100 text-purple-800', name: 'Purple' },
  { hex: '#EC4899', class: 'bg-pink-100 text-pink-800', name: 'Pink' },
  { hex: '#6B7280', class: 'bg-gray-100 text-gray-800', name: 'Gray' },
]

export default function TagsManagementPage() {
  const [tags, setTags] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [filterActive, setFilterActive] = useState<boolean | null>(null)

  const [formData, setFormData] = useState<TagFormData>({
    name: '',
    description: '',
    color_hex: PREDEFINED_COLORS[0].hex,
    color_class: PREDEFINED_COLORS[0].class,
    icon: '',
    category_id: '',
    is_active: true,
  })

  // Load tags on mount
  useEffect(() => {
    loadTags()
  }, [])

  const loadTags = async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/tags')
      const data = await res.json()

      if (data.tags) {
        setTags(data.tags)
      }
    } catch (error) {
      console.error('Error loading tags:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenModal = (tag?: Tag) => {
    if (tag) {
      setEditingTag(tag)
      setFormData({
        name: tag.name,
        description: tag.description || '',
        color_hex: tag.color_hex,
        color_class: tag.color_class,
        icon: tag.icon || '',
        category_id: tag.category_id || '',
        is_active: tag.is_active,
      })
    } else {
      setEditingTag(null)
      setFormData({
        name: '',
        description: '',
        color_hex: PREDEFINED_COLORS[0].hex,
        color_class: PREDEFINED_COLORS[0].class,
        icon: '',
        category_id: '',
        is_active: true,
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingTag(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const url = editingTag ? `/api/tags/${editingTag.id}` : '/api/tags'
      const method = editingTag ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save tag')
      }

      await loadTags()
      handleCloseModal()
    } catch (error) {
      console.error('Error saving tag:', error)
      alert(error instanceof Error ? error.message : 'Failed to save tag')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (tagId: string) => {
    if (
      !confirm('Are you sure you want to delete this tag? This will remove it from all contacts.')
    ) {
      return
    }

    try {
      const res = await fetch(`/api/tags/${tagId}?force=true`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete tag')
      }

      await loadTags()
    } catch (error) {
      console.error('Error deleting tag:', error)
      alert(error instanceof Error ? error.message : 'Failed to delete tag')
    }
  }

  const filteredTags = tags.filter(tag => {
    const matchesSearch =
      tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tag.description?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesActive = filterActive === null || tag.is_active === filterActive
    return matchesSearch && matchesActive
  })

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-slate-900'>Tags Management</h1>
          <p className='mt-1 text-sm text-slate-500'>
            Manage tags for contact organization across all organizations
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className='inline-flex items-center rounded-lg border border-transparent bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:outline-none'
        >
          <PlusIcon className='mr-2 h-5 w-5' />
          Create Tag
        </button>
      </div>

      {/* Filters */}
      <div className='rounded-lg border border-slate-200 bg-white p-4 shadow-sm'>
        <div className='flex flex-col gap-4 sm:flex-row'>
          <div className='relative flex-1'>
            <MagnifyingGlassIcon className='absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-slate-400' />
            <input
              type='text'
              placeholder='Search tags...'
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className='w-full rounded-lg border border-slate-300 py-2 pr-4 pl-10 focus:ring-2 focus:ring-emerald-500 focus:outline-none'
            />
          </div>
          <div className='flex gap-2'>
            <button
              onClick={() => setFilterActive(null)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                filterActive === null
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterActive(true)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                filterActive === true
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilterActive(false)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                filterActive === false
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Inactive
            </button>
          </div>
        </div>
      </div>

      {/* Tags Grid */}
      {isLoading ? (
        <div className='py-12 text-center'>
          <div className='inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-600 border-r-transparent'></div>
          <p className='mt-2 text-sm text-slate-500'>Loading tags...</p>
        </div>
      ) : filteredTags.length === 0 ? (
        <div className='rounded-lg border border-slate-200 bg-white py-12 text-center shadow-sm'>
          <TagIcon className='mx-auto h-12 w-12 text-slate-400' />
          <h3 className='mt-2 text-sm font-medium text-slate-900'>No tags found</h3>
          <p className='mt-1 text-sm text-slate-500'>
            {searchQuery || filterActive !== null
              ? 'Try adjusting your filters'
              : 'Get started by creating a new tag'}
          </p>
          {!searchQuery && filterActive === null && (
            <div className='mt-6'>
              <button
                onClick={() => handleOpenModal()}
                className='inline-flex items-center rounded-lg border border-transparent bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700'
              >
                <PlusIcon className='mr-2 h-5 w-5' />
                Create Tag
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {filteredTags.map(tag => (
            <div
              key={tag.id}
              className='rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md'
            >
              <div className='mb-3 flex items-start justify-between'>
                <div className='flex-1'>
                  <div className='mb-1 flex items-center gap-2'>
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-medium ${tag.color_class}`}
                    >
                      {tag.name}
                    </span>
                    {!tag.is_active && (
                      <span className='rounded bg-slate-100 px-2 py-1 text-xs text-slate-600'>
                        Inactive
                      </span>
                    )}
                  </div>
                  {tag.description && (
                    <p className='mt-2 text-sm text-slate-600'>{tag.description}</p>
                  )}
                  {tag.category && (
                    <p className='mt-1 text-xs text-slate-500'>Category: {tag.category.name}</p>
                  )}
                </div>
                <div className='flex gap-1'>
                  <button
                    onClick={() => handleOpenModal(tag)}
                    className='p-1 text-slate-400 transition-colors hover:text-blue-600'
                    title='Edit tag'
                  >
                    <PencilIcon className='h-4 w-4' />
                  </button>
                  <button
                    onClick={() => handleDelete(tag.id)}
                    className='p-1 text-slate-400 transition-colors hover:text-red-600'
                    title='Delete tag'
                  >
                    <TrashIcon className='h-4 w-4' />
                  </button>
                </div>
              </div>
              <div className='flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500'>
                <span>Used by {tag.usage_count || 0} contacts</span>
                <span>{new Date(tag.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className='bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4'>
          <div className='max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white shadow-xl'>
            <div className='sticky top-0 border-b border-slate-200 bg-white px-6 py-4'>
              <h2 className='text-lg font-medium text-slate-900'>
                {editingTag ? 'Edit Tag' : 'Create New Tag'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className='space-y-4 p-6'>
              {/* Tag Name */}
              <div>
                <label className='mb-1 block text-sm font-medium text-slate-700'>
                  Tag Name <span className='text-red-500'>*</span>
                </label>
                <input
                  type='text'
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder='e.g., VIP Customer'
                  className='w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none'
                />
              </div>

              {/* Description */}
              <div>
                <label className='mb-1 block text-sm font-medium text-slate-700'>Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder='Optional description...'
                  rows={2}
                  className='w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none'
                />
              </div>

              {/* Color Picker */}
              <div>
                <label className='mb-2 block text-sm font-medium text-slate-700'>Color</label>
                <div className='grid grid-cols-3 gap-2'>
                  {PREDEFINED_COLORS.map(color => (
                    <button
                      key={color.hex}
                      type='button'
                      onClick={() =>
                        setFormData({ ...formData, color_hex: color.hex, color_class: color.class })
                      }
                      className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2 transition-all ${
                        formData.color_hex === color.hex
                          ? 'border-emerald-500 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div
                        className='h-4 w-4 rounded-full'
                        style={{ backgroundColor: color.hex }}
                      />
                      <span className='text-xs text-slate-700'>{color.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div>
                <label className='mb-2 block text-sm font-medium text-slate-700'>Preview</label>
                <div className='flex items-center gap-2'>
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-medium ${formData.color_class}`}
                  >
                    {formData.name || 'Tag Name'}
                  </span>
                </div>
              </div>

              {/* Active Status */}
              <div className='flex items-center'>
                <input
                  type='checkbox'
                  id='is_active'
                  checked={formData.is_active}
                  onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                  className='rounded border-slate-300 text-emerald-600 focus:ring-emerald-500'
                />
                <label htmlFor='is_active' className='ml-2 text-sm text-slate-700'>
                  Active (visible to users)
                </label>
              </div>

              {/* Actions */}
              <div className='flex gap-3 border-t border-slate-200 pt-4'>
                <button
                  type='button'
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  className='flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50'
                >
                  Cancel
                </button>
                <button
                  type='submit'
                  disabled={isSubmitting}
                  className='flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50'
                >
                  {isSubmitting ? 'Saving...' : editingTag ? 'Update Tag' : 'Create Tag'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
