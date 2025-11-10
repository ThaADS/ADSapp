'use client'

import React, { useState, useMemo, useCallback, useRef } from 'react'
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  UserPlusIcon,
  UserGroupIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  TagIcon,
  CalendarIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
  DocumentArrowDownIcon,
  DocumentArrowUpIcon,
  StarIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  BuildingOfficeIcon,
  GlobeAltIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowPathIcon,
  EyeIcon,
  ShareIcon,
  Bars3Icon,
  TableCellsIcon,
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import ContactForm from './contact-form'
import { useToast } from '@/components/ui/toast'

// Contact interface
interface Contact {
  id: string
  firstName: string
  lastName: string
  phone: string
  email?: string
  avatar?: string
  company?: string
  position?: string
  location?: string
  website?: string
  metadata?: Record<string, unknown>
  tags: string[]
  status: 'active' | 'inactive' | 'blocked'
  isStarred: boolean
  lastContact: string
  addedDate: string
  totalMessages: number
  customFields: Record<string, unknown>
  notes: string
  source: 'manual' | 'import' | 'whatsapp' | 'api'
  assignedTo?: string
}

// Filter options
interface FilterOptions {
  search: string
  status: string
  tags: string[]
  dateRange: string
  source: string
  assignedTo: string
  isStarred: boolean | null
}

// No more mock data - all loaded from API

interface ContactManagerProps {
  organizationId: string
}

export default function ContactManager({ organizationId }: ContactManagerProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [tags, setTags] = useState<Array<{ id: string; label: string; color: string }>>([])
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; name: string }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table')
  const [showFilters, setShowFilters] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [isLoadingForm, setIsLoadingForm] = useState(false)
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    status: 'all',
    tags: [],
    dateRange: 'all',
    source: 'all',
    assignedTo: 'all',
    isStarred: null,
  })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { addToast } = useToast()

  // Load data on mount
  React.useEffect(() => {
    Promise.all([loadContacts(), loadTags(), loadTeamMembers()]).finally(() => setIsLoading(false))
  }, [organizationId])

  // Load contacts from API
  const loadContacts = async () => {
    try {
      const res = await fetch(`/api/contacts?organization_id=${organizationId}`)
      const data = await res.json()

      if (data.contacts) {
        const formattedContacts = data.contacts.map((c: any) => ({
          id: c.id,
          firstName: c.name?.split(' ')[0] || '',
          lastName: c.name?.split(' ').slice(1).join(' ') || '',
          phone: c.phone_number,
          email: c.email,
          tags: c.tags || [],
          status: c.is_blocked ? 'blocked' : 'active',
          isStarred: c.is_starred || false,
          lastContact: c.last_contact_at || c.created_at,
          addedDate: c.created_at,
          totalMessages: c.total_messages || 0,
          customFields: c.metadata || {},
          notes: c.notes || '',
          source: c.source || 'manual',
          company: c.metadata?.company,
          position: c.metadata?.position,
          location: c.metadata?.location,
          website: c.metadata?.website,
          assignedTo: c.assigned_to,
        }))
        setContacts(formattedContacts)
      }
    } catch (error) {
      console.error('Error loading contacts:', error)
      addToast({
        type: 'error',
        title: 'Error loading contacts',
        message: 'Failed to load contacts from server',
      })
    }
  }

  // Load tags from API
  const loadTags = async () => {
    try {
      const res = await fetch(`/api/tags?organization_id=${organizationId}`)
      const data = await res.json()

      if (data.tags) {
        const formattedTags = data.tags.map((t: any) => ({
          id: t.name.toLowerCase().replace(/\s+/g, '-'),
          label: t.name,
          color: t.color_class || 'bg-gray-100 text-gray-800',
        }))
        setTags(formattedTags)
      }
    } catch (error) {
      console.error('Error loading tags:', error)
    }
  }

  // Load team members from API
  const loadTeamMembers = async () => {
    try {
      const res = await fetch(`/api/admin/users?organization_id=${organizationId}`)
      const data = await res.json()

      if (data.users) {
        const formattedMembers = data.users.map((u: any) => ({
          id: u.id,
          name: u.full_name,
        }))
        setTeamMembers(formattedMembers)
      }
    } catch (error) {
      console.error('Error loading team members:', error)
    }
  }

  // Filter contacts based on current filters
  const filteredContacts = useMemo(() => {
    return contacts.filter(contact => {
      // Search filter
      const searchTerm = filters.search.toLowerCase()
      const matchesSearch =
        !searchTerm ||
        contact.firstName.toLowerCase().includes(searchTerm) ||
        contact.lastName.toLowerCase().includes(searchTerm) ||
        contact.email?.toLowerCase().includes(searchTerm) ||
        contact.phone.includes(searchTerm) ||
        contact.company?.toLowerCase().includes(searchTerm)

      // Status filter
      const matchesStatus = filters.status === 'all' || contact.status === filters.status

      // Tags filter
      const matchesTags =
        filters.tags.length === 0 || filters.tags.some(tag => contact.tags.includes(tag))

      // Starred filter
      const matchesStarred = filters.isStarred === null || contact.isStarred === filters.isStarred

      // Source filter
      const matchesSource = filters.source === 'all' || contact.source === filters.source

      // Assigned to filter
      const matchesAssignment =
        filters.assignedTo === 'all' || contact.assignedTo === filters.assignedTo

      // Date range filter (simplified)
      const matchesDateRange = filters.dateRange === 'all' // Implement date logic as needed

      return (
        matchesSearch &&
        matchesStatus &&
        matchesTags &&
        matchesStarred &&
        matchesSource &&
        matchesAssignment &&
        matchesDateRange
      )
    })
  }, [contacts, filters])

  // Handle contact selection
  const toggleContactSelection = useCallback((contactId: string) => {
    setSelectedContacts(prev =>
      prev.includes(contactId) ? prev.filter(id => id !== contactId) : [...prev, contactId]
    )
  }, [])

  // Select all contacts
  const toggleSelectAll = useCallback(() => {
    setSelectedContacts(prev =>
      prev.length === filteredContacts.length ? [] : filteredContacts.map(c => c.id)
    )
  }, [filteredContacts])

  // Star/Unstar contact
  const toggleStar = useCallback((contactId: string) => {
    setContacts(prev =>
      prev.map(contact =>
        contact.id === contactId ? { ...contact, isStarred: !contact.isStarred } : contact
      )
    )
  }, [])

  // Delete contacts
  const deleteContacts = useCallback((contactIds: string[]) => {
    if (confirm(`Are you sure you want to delete ${contactIds.length} contact(s)?`)) {
      setContacts(prev => prev.filter(contact => !contactIds.includes(contact.id)))
      setSelectedContacts([])
    }
  }, [])

  // Export contacts
  const exportContacts = useCallback(
    (format: 'csv' | 'excel') => {
      // Simulate export functionality
      const contactsToExport =
        selectedContacts.length > 0
          ? contacts.filter(c => selectedContacts.includes(c.id))
          : filteredContacts

      // In real implementation, generate and download file
      alert(`Exported ${contactsToExport.length} contacts as ${format.toUpperCase()}`)
    },
    [contacts, selectedContacts, filteredContacts]
  )

  // Import contacts
  const handleImport = useCallback((file: File) => {
    // Simulate import functionality

    // In real implementation, parse file and add contacts
    setShowImportModal(false)
    alert('Contacts imported successfully!')
  }, [])

  // Handle contact form submission
  const handleContactSubmit = useCallback(
    async (
      formData: {
        name: string
        phone_number: string
        email: string
        tags: string[]
        notes: string
        metadata: Record<string, string>
      },
      contactId?: string
    ) => {
      setIsLoadingForm(true)

      try {
        const url = contactId ? `/api/contacts/${contactId}` : '/api/contacts'
        const method = contactId ? 'PUT' : 'POST'

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to save contact')
        }

        // Update contacts list
        if (contactId) {
          // Update existing contact in the list
          setContacts(prev =>
            prev.map(c => {
              if (c.id === contactId) {
                return {
                  ...c,
                  firstName: formData.name.split(' ')[0] || '',
                  lastName: formData.name.split(' ').slice(1).join(' ') || '',
                  email: formData.email || undefined,
                  tags: formData.tags,
                  notes: formData.notes,
                  customFields: formData.metadata,
                }
              }
              return c
            })
          )

          addToast({
            type: 'success',
            title: 'Contact updated',
            message: 'Contact has been updated successfully',
          })
        } else {
          // Add new contact to the list
          const newContact: Contact = {
            id: data.id || Date.now().toString(),
            firstName: formData.name.split(' ')[0] || '',
            lastName: formData.name.split(' ').slice(1).join(' ') || '',
            phone: formData.phone_number,
            email: formData.email || undefined,
            tags: formData.tags,
            notes: formData.notes,
            customFields: formData.metadata,
            status: 'active',
            isStarred: false,
            lastContact: new Date().toISOString().split('T')[0],
            addedDate: new Date().toISOString().split('T')[0],
            totalMessages: 0,
            source: 'manual',
          }

          setContacts(prev => [newContact, ...prev])

          addToast({
            type: 'success',
            title: 'Contact created',
            message: 'New contact has been added successfully',
          })
        }

        // Close modal
        setShowContactModal(false)
        setEditingContact(null)
      } catch (error) {
        console.error('Error saving contact:', error)
        addToast({
          type: 'error',
          title: 'Error',
          message: error instanceof Error ? error.message : 'Failed to save contact',
        })
      } finally {
        setIsLoadingForm(false)
      }
    },
    [addToast]
  )

  // Contact card component for grid view
  const ContactCard: React.FC<{ contact: Contact }> = ({ contact }) => (
    <div className='rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md'>
      <div className='mb-3 flex items-start justify-between'>
        <div className='flex items-center space-x-3'>
          <input
            type='checkbox'
            title={`Select contact ${contact.firstName} ${contact.lastName}`}
            checked={selectedContacts.includes(contact.id)}
            onChange={() => toggleContactSelection(contact.id)}
            className='rounded border-gray-300 text-blue-600 focus:ring-blue-500'
          />
          <div className='flex h-10 w-10 items-center justify-center rounded-full bg-gray-300'>
            {contact.avatar ? (
              <img src={contact.avatar} alt='' className='h-10 w-10 rounded-full' />
            ) : (
              <span className='text-sm font-medium text-gray-600'>
                {contact.firstName[0]}
                {contact.lastName[0]}
              </span>
            )}
          </div>
        </div>
        <div className='flex items-center space-x-1'>
          <button
            type='button'
            onClick={() => toggleStar(contact.id)}
            className='text-gray-400 hover:text-yellow-500'
            aria-label='Star contact'
          >
            {contact.isStarred ? (
              <StarIconSolid className='h-4 w-4 text-yellow-500' />
            ) : (
              <StarIcon className='h-4 w-4' />
            )}
          </button>
          <button
            type='button'
            className='text-gray-400 hover:text-gray-600'
            aria-label='More options'
          >
            <EllipsisVerticalIcon className='h-4 w-4' />
          </button>
        </div>
      </div>

      <div className='mb-3'>
        <h3 className='font-medium text-gray-900'>
          {contact.firstName} {contact.lastName}
        </h3>
        {contact.position && contact.company && (
          <p className='text-sm text-gray-600'>
            {contact.position} at {contact.company}
          </p>
        )}
      </div>

      <div className='mb-3 space-y-2 text-sm text-gray-600'>
        {contact.phone && (
          <div className='flex items-center'>
            <PhoneIcon className='mr-2 h-4 w-4' />
            {contact.phone}
          </div>
        )}
        {contact.email && (
          <div className='flex items-center'>
            <EnvelopeIcon className='mr-2 h-4 w-4' />
            {contact.email}
          </div>
        )}
        {contact.location && (
          <div className='flex items-center'>
            <MapPinIcon className='mr-2 h-4 w-4' />
            {contact.location}
          </div>
        )}
      </div>

      <div className='mb-3 flex flex-wrap gap-1'>
        {contact.tags.slice(0, 3).map(tagId => {
          const tag = tags.find(t => t.id === tagId)
          return tag ? (
            <span key={tagId} className={`rounded-full px-2 py-1 text-xs ${tag.color}`}>
              {tag.label}
            </span>
          ) : null
        })}
        {contact.tags.length > 3 && (
          <span className='rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600'>
            +{contact.tags.length - 3}
          </span>
        )}
      </div>

      <div className='flex items-center justify-between text-xs text-gray-500'>
        <span>{contact.totalMessages} messages</span>
        <span>Last: {contact.lastContact}</span>
      </div>
    </div>
  )

  return (
    <div className='flex flex-col bg-gray-50 min-h-screen'>
      {/* Header */}
      <div className='border-b border-gray-200 bg-white'>
        <div className='px-4 py-3 sm:px-6 sm:py-4'>
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
            <div className='flex items-center gap-3'>
              <h1 className='text-xl sm:text-2xl font-bold text-gray-900'>Contacts</h1>
              <span className='text-xs sm:text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full'>
                {filteredContacts.length} of {contacts.length}
              </span>
            </div>

            <div className='flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2 sm:pb-0'>
              {/* View Toggle - Hidden on mobile */}
              <div className='hidden sm:flex rounded-lg border border-gray-300'>
                <button
                  type='button'
                  onClick={() => setViewMode('table')}
                  className={`p-2 min-h-[40px] min-w-[40px] ${viewMode === 'table' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'}`}
                  aria-label='Table view'
                >
                  <TableCellsIcon className='h-5 w-5' />
                </button>
                <button
                  type='button'
                  onClick={() => setViewMode('grid')}
                  className={`p-2 min-h-[40px] min-w-[40px] ${viewMode === 'grid' ? 'bg-blue-50 text-blue-600' : 'text-gray-600'}`}
                  aria-label='Grid view'
                >
                  <Bars3Icon className='h-5 w-5' />
                </button>
              </div>

              <button
                type='button'
                onClick={() => setShowImportModal(true)}
                className='flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 whitespace-nowrap min-h-[44px]'
              >
                <DocumentArrowUpIcon className='h-5 w-5 sm:mr-2' />
                <span className='hidden sm:inline'>Import</span>
              </button>

              <button
                type='button'
                onClick={() => exportContacts('csv')}
                className='flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 whitespace-nowrap min-h-[44px]'
              >
                <DocumentArrowDownIcon className='h-5 w-5 sm:mr-2' />
                <span className='hidden sm:inline'>Export</span>
              </button>

              <button
                type='button'
                onClick={() => {
                  setEditingContact(null)
                  setShowContactModal(true)
                }}
                className='flex items-center rounded-lg border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 active:bg-blue-800 whitespace-nowrap min-h-[44px] shadow-sm'
              >
                <UserPlusIcon className='h-5 w-5 sm:mr-2' />
                <span className='hidden sm:inline'>Add Contact</span>
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className='mt-3 sm:mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4'>
            <div className='relative flex-1'>
              <MagnifyingGlassIcon className='absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 transform text-gray-400' />
              <input
                type='text'
                placeholder='Search contacts...'
                value={filters.search}
                onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className='w-full rounded-lg border border-gray-300 py-2.5 pr-4 pl-10 text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none min-h-[44px]'
              />
            </div>

            <button
              type='button'
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium min-h-[44px] whitespace-nowrap transition-colors ${
                showFilters
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FunnelIcon className='h-5 w-5 mr-2' />
              Filters
            </button>

            {selectedContacts.length > 0 && (
              <div className='flex items-center space-x-2'>
                <span className='text-sm text-gray-600'>{selectedContacts.length} selected</span>
                <button
                  type='button'
                  onClick={() => deleteContacts(selectedContacts)}
                  className='text-red-600 hover:text-red-700'
                  aria-label='Delete selected contacts'
                >
                  <TrashIcon className='h-4 w-4' />
                </button>
              </div>
            )}
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className='mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4'>
              <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
                <div>
                  <label className='mb-1 block text-sm font-medium text-gray-700'>Status</label>
                  <select
                    title='Filter by contact status'
                    value={filters.status}
                    onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    className='w-full rounded-md border border-gray-300 px-3 py-2 text-sm'
                  >
                    <option value='all'>All Statuses</option>
                    <option value='active'>Active</option>
                    <option value='inactive'>Inactive</option>
                    <option value='blocked'>Blocked</option>
                  </select>
                </div>

                <div>
                  <label className='mb-1 block text-sm font-medium text-gray-700'>Source</label>
                  <select
                    title='Filter by contact source'
                    value={filters.source}
                    onChange={e => setFilters(prev => ({ ...prev, source: e.target.value }))}
                    className='w-full rounded-md border border-gray-300 px-3 py-2 text-sm'
                  >
                    <option value='all'>All Sources</option>
                    <option value='whatsapp'>WhatsApp</option>
                    <option value='manual'>Manual</option>
                    <option value='import'>Import</option>
                    <option value='api'>API</option>
                  </select>
                </div>

                <div>
                  <label className='mb-1 block text-sm font-medium text-gray-700'>
                    Assigned To
                  </label>
                  <select
                    title='Filter by assigned team member'
                    value={filters.assignedTo}
                    onChange={e => setFilters(prev => ({ ...prev, assignedTo: e.target.value }))}
                    className='w-full rounded-md border border-gray-300 px-3 py-2 text-sm'
                  >
                    <option value='all'>All Team Members</option>
                    {teamMembers.map(member => (
                      <option key={member.id} value={member.name}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className='mb-1 block text-sm font-medium text-gray-700'>Tags</label>
                  <div className='flex flex-wrap gap-2'>
                    {tags.slice(0, 4).map(tag => (
                      <button
                        type='button'
                        key={tag.id}
                        onClick={() => {
                          setFilters(prev => ({
                            ...prev,
                            tags: prev.tags.includes(tag.id)
                              ? prev.tags.filter(t => t !== tag.id)
                              : [...prev.tags, tag.id],
                          }))
                        }}
                        className={`rounded-full px-2 py-1 text-xs transition-colors ${
                          filters.tags.includes(tag.id)
                            ? tag.color
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {tag.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className='mt-4 flex items-center justify-between'>
                <div className='flex items-center space-x-4'>
                  <label className='flex items-center'>
                    <input
                      type='checkbox'
                      checked={filters.isStarred === true}
                      onChange={e =>
                        setFilters(prev => ({
                          ...prev,
                          isStarred: e.target.checked ? true : null,
                        }))
                      }
                      className='rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                    />
                    <span className='ml-2 text-sm text-gray-700'>Starred only</span>
                  </label>
                </div>

                <button
                  type='button'
                  onClick={() =>
                    setFilters({
                      search: '',
                      status: 'all',
                      tags: [],
                      dateRange: 'all',
                      source: 'all',
                      assignedTo: 'all',
                      isStarred: null,
                    })
                  }
                  className='text-sm text-blue-600 hover:text-blue-700'
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className='flex-1 overflow-hidden'>
        {viewMode === 'table' ? (
          /* Table View */
          <div className='h-full overflow-y-auto'>
            <table className='w-full'>
              <thead className='sticky top-0 bg-gray-50'>
                <tr>
                  <th className='w-12 px-6 py-3'>
                    <input
                      type='checkbox'
                      title='Select all contacts'
                      checked={
                        selectedContacts.length === filteredContacts.length &&
                        filteredContacts.length > 0
                      }
                      onChange={toggleSelectAll}
                      className='rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                    />
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase'>
                    Contact
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase'>
                    Company
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase'>
                    Contact Info
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase'>
                    Tags
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase'>
                    Status
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase'>
                    Last Contact
                  </th>
                  <th className='px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase'>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-200 bg-white'>
                {filteredContacts.map(contact => (
                  <tr key={contact.id} className='hover:bg-gray-50'>
                    <td className='px-6 py-4'>
                      <input
                        type='checkbox'
                        title={`Select ${contact.firstName} ${contact.lastName}`}
                        checked={selectedContacts.includes(contact.id)}
                        onChange={() => toggleContactSelection(contact.id)}
                        className='rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                      />
                    </td>
                    <td className='px-6 py-4'>
                      <div className='flex items-center'>
                        <div className='mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-gray-300'>
                          {contact.avatar ? (
                            <img src={contact.avatar} alt='' className='h-8 w-8 rounded-full' />
                          ) : (
                            <span className='text-xs font-medium text-gray-600'>
                              {contact.firstName[0]}
                              {contact.lastName[0]}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className='flex items-center'>
                            <span className='text-sm font-medium text-gray-900'>
                              {contact.firstName} {contact.lastName}
                            </span>
                            {contact.isStarred && (
                              <StarIconSolid className='ml-1 h-4 w-4 text-yellow-500' />
                            )}
                          </div>
                          {contact.position && (
                            <div className='text-sm text-gray-500'>{contact.position}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className='px-6 py-4 text-sm text-gray-900'>{contact.company || '-'}</td>
                    <td className='px-6 py-4'>
                      <div className='text-sm text-gray-900'>{contact.phone}</div>
                      {contact.email && (
                        <div className='text-sm text-gray-500'>{contact.email}</div>
                      )}
                    </td>
                    <td className='px-6 py-4'>
                      <div className='flex flex-wrap gap-1'>
                        {contact.tags.slice(0, 2).map(tagId => {
                          const tag = tags.find(t => t.id === tagId)
                          return tag ? (
                            <span
                              key={tagId}
                              className={`rounded-full px-2 py-1 text-xs ${tag.color}`}
                            >
                              {tag.label}
                            </span>
                          ) : null
                        })}
                        {contact.tags.length > 2 && (
                          <span className='rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600'>
                            +{contact.tags.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className='px-6 py-4'>
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                          contact.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : contact.status === 'inactive'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {contact.status}
                      </span>
                    </td>
                    <td className='px-6 py-4 text-sm text-gray-500'>{contact.lastContact}</td>
                    <td className='px-6 py-4'>
                      <div className='flex items-center space-x-2'>
                        <button
                          type='button'
                          onClick={() => toggleStar(contact.id)}
                          className='text-gray-400 hover:text-yellow-500'
                          aria-label='Star contact'
                        >
                          {contact.isStarred ? (
                            <StarIconSolid className='h-4 w-4 text-yellow-500' />
                          ) : (
                            <StarIcon className='h-4 w-4' />
                          )}
                        </button>
                        <button
                          type='button'
                          onClick={() => {
                            setEditingContact(contact)
                            setShowContactModal(true)
                          }}
                          className='text-gray-400 hover:text-blue-600'
                          aria-label='Edit contact'
                        >
                          <PencilIcon className='h-4 w-4' />
                        </button>
                        <button
                          type='button'
                          onClick={() => deleteContacts([contact.id])}
                          className='text-gray-400 hover:text-red-600'
                          aria-label='Delete contact'
                        >
                          <TrashIcon className='h-4 w-4' />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredContacts.length === 0 && (
              <div className='py-12 text-center'>
                <UserGroupIcon className='mx-auto mb-4 h-12 w-12 text-gray-400' />
                <h3 className='mb-2 text-lg font-medium text-gray-900'>No contacts found</h3>
                <p className='mb-4 text-gray-500'>
                  {filters.search || filters.status !== 'all' || filters.tags.length > 0
                    ? 'Try adjusting your filters'
                    : 'Get started by adding your first contact'}
                </p>
                <button
                  type='button'
                  onClick={() => {
                    setEditingContact(null)
                    setShowContactModal(true)
                  }}
                  className='rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700'
                >
                  Add Contact
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Grid View */
          <div className='overflow-y-auto p-6'>
            <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
              {filteredContacts.map(contact => (
                <ContactCard key={contact.id} contact={contact} />
              ))}
            </div>

            {filteredContacts.length === 0 && (
              <div className='py-12 text-center'>
                <UserGroupIcon className='mx-auto mb-4 h-12 w-12 text-gray-400' />
                <h3 className='mb-2 text-lg font-medium text-gray-900'>No contacts found</h3>
                <p className='mb-4 text-gray-500'>
                  {filters.search || filters.status !== 'all' || filters.tags.length > 0
                    ? 'Try adjusting your filters'
                    : 'Get started by adding your first contact'}
                </p>
                <button
                  type='button'
                  onClick={() => {
                    setEditingContact(null)
                    setShowContactModal(true)
                  }}
                  className='rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700'
                >
                  Add Contact
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className='bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black'>
          <div className='mx-4 w-full max-w-md rounded-lg bg-white shadow-xl'>
            <div className='flex items-center justify-between border-b border-gray-200 p-6'>
              <h2 className='text-lg font-medium text-gray-900'>Import Contacts</h2>
              <button
                type='button'
                onClick={() => setShowImportModal(false)}
                className='text-gray-400 hover:text-gray-600'
                aria-label='Close import modal'
              >
                <XMarkIcon className='h-5 w-5' />
              </button>
            </div>

            <div className='p-6'>
              <div className='space-y-4'>
                <div>
                  <label className='mb-2 block text-sm font-medium text-gray-700'>
                    Select File
                  </label>
                  <input
                    ref={fileInputRef}
                    type='file'
                    title='Select CSV or Excel file to import contacts'
                    accept='.csv,.xlsx,.xls'
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) {
                        handleImport(file)
                      }
                    }}
                    className='w-full rounded-md border border-gray-300 px-3 py-2'
                  />
                  <p className='mt-1 text-xs text-gray-500'>
                    Supported formats: CSV, Excel (.xlsx, .xls)
                  </p>
                </div>

                <div className='border-t border-gray-200 pt-4'>
                  <h4 className='mb-2 text-sm font-medium text-gray-900'>Required Columns</h4>
                  <ul className='space-y-1 text-xs text-gray-600'>
                    <li>• first_name (required)</li>
                    <li>• last_name (required)</li>
                    <li>• phone (required)</li>
                    <li>• email (optional)</li>
                    <li>• company (optional)</li>
                    <li>• position (optional)</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className='flex justify-end space-x-3 border-t border-gray-200 p-6'>
              <button
                type='button'
                onClick={() => setShowImportModal(false)}
                className='rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50'
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact Modal (Add/Edit) */}
      {showContactModal && (
        <div className='bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black p-4'>
          <div className='flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-xl'>
            <div className='flex flex-shrink-0 items-center justify-between border-b border-gray-200 p-6'>
              <h2 className='text-lg font-medium text-gray-900'>
                {editingContact ? 'Edit Contact' : 'Add New Contact'}
              </h2>
              <button
                type='button'
                onClick={() => {
                  setShowContactModal(false)
                  setEditingContact(null)
                }}
                disabled={isLoadingForm}
                className='text-gray-400 hover:text-gray-600 disabled:opacity-50'
                aria-label='Close contact modal'
              >
                <XMarkIcon className='h-5 w-5' />
              </button>
            </div>

            <div className='flex-1 overflow-y-auto p-6'>
              <ContactForm
                contact={
                  editingContact
                    ? {
                        id: editingContact.id,
                        name: `${editingContact.firstName} ${editingContact.lastName}`,
                        phone_number: editingContact.phone,
                        email: editingContact.email,
                        tags: editingContact.tags,
                        notes: editingContact.notes,
                        metadata: editingContact.customFields,
                      }
                    : null
                }
                onSubmit={handleContactSubmit}
                onCancel={() => {
                  setShowContactModal(false)
                  setEditingContact(null)
                }}
                isLoading={isLoadingForm}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
