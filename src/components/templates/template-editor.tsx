'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  ListBulletIcon,
  NumberedListIcon,
  LinkIcon,
  PhotoIcon,
  DocumentIcon,
  PaperClipIcon,
  EyeIcon,
  CodeBracketIcon,
  PlusIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  BookmarkIcon,
  ClockIcon,
  UserIcon,
  PhoneIcon,
  TagIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline'

// Template variable types
interface TemplateVariable {
  id: string
  name: string
  placeholder: string
  type: 'text' | 'number' | 'date' | 'phone' | 'email' | 'url' | 'contact_field'
  required: boolean
  defaultValue?: string
  description?: string
}

// Template interface
interface MessageTemplate {
  id: string
  name: string
  content: string
  variables: TemplateVariable[]
  category: string
  tags: string[]
  language: string
  status: 'draft' | 'active' | 'archived'
  createdAt: string
  lastModified: string
  usageCount: number
  attachments: TemplateAttachment[]
}

interface TemplateAttachment {
  id: string
  type: 'image' | 'document' | 'video' | 'audio'
  name: string
  url: string
  size: number
}

// Predefined variables
const PREDEFINED_VARIABLES: TemplateVariable[] = [
  {
    id: 'contact_name',
    name: 'Contact Name',
    placeholder: '{{contact_name}}',
    type: 'text',
    required: false,
    description: 'The name of the contact',
  },
  {
    id: 'contact_phone',
    name: 'Phone Number',
    placeholder: '{{contact_phone}}',
    type: 'phone',
    required: false,
    description: 'Contact phone number',
  },
  {
    id: 'contact_email',
    name: 'Email Address',
    placeholder: '{{contact_email}}',
    type: 'email',
    required: false,
    description: 'Contact email address',
  },
  {
    id: 'company_name',
    name: 'Company Name',
    placeholder: '{{company_name}}',
    type: 'text',
    required: false,
    description: 'Name of the company',
  },
  {
    id: 'agent_name',
    name: 'Agent Name',
    placeholder: '{{agent_name}}',
    type: 'text',
    required: false,
    description: 'Name of the assigned agent',
  },
  {
    id: 'current_date',
    name: 'Current Date',
    placeholder: '{{current_date}}',
    type: 'date',
    required: false,
    description: "Today's date",
  },
  {
    id: 'current_time',
    name: 'Current Time',
    placeholder: '{{current_time}}',
    type: 'text',
    required: false,
    description: 'Current time',
  },
]

// Sample templates
const SAMPLE_TEMPLATES: MessageTemplate[] = [
  {
    id: 'welcome',
    name: 'Welcome Message',
    content:
      "Hello {{contact_name}}! 👋\n\nWelcome to {{company_name}}. We're excited to have you with us.\n\nIf you have any questions, feel free to reach out to me directly.",
    variables: [
      {
        id: 'contact_name',
        name: 'Contact Name',
        placeholder: '{{contact_name}}',
        type: 'text',
        required: true,
      },
      {
        id: 'company_name',
        name: 'Company Name',
        placeholder: '{{company_name}}',
        type: 'text',
        required: true,
      },
    ],
    category: 'onboarding',
    tags: ['welcome', 'greeting'],
    language: 'en',
    status: 'active',
    createdAt: '2024-01-15',
    lastModified: '2024-01-20',
    usageCount: 142,
    attachments: [],
  },
  {
    id: 'follow-up',
    name: 'Follow-up Reminder',
    content:
      'Hi {{contact_name}},\n\nI wanted to follow up on our conversation from {{last_contact_date}}.\n\nAre you still interested in learning more about our services?\n\nBest regards,\n{{agent_name}}',
    variables: [
      {
        id: 'contact_name',
        name: 'Contact Name',
        placeholder: '{{contact_name}}',
        type: 'text',
        required: true,
      },
      {
        id: 'last_contact_date',
        name: 'Last Contact Date',
        placeholder: '{{last_contact_date}}',
        type: 'date',
        required: true,
      },
      {
        id: 'agent_name',
        name: 'Agent Name',
        placeholder: '{{agent_name}}',
        type: 'text',
        required: true,
      },
    ],
    category: 'follow-up',
    tags: ['follow-up', 'reminder'],
    language: 'en',
    status: 'active',
    createdAt: '2024-01-10',
    lastModified: '2024-01-18',
    usageCount: 89,
    attachments: [],
  },
]

// Template categories
const TEMPLATE_CATEGORIES = [
  { id: 'onboarding', label: 'Onboarding', icon: UserIcon },
  { id: 'follow-up', label: 'Follow-up', icon: ClockIcon },
  { id: 'support', label: 'Support', icon: PhoneIcon },
  { id: 'sales', label: 'Sales', icon: TagIcon },
  { id: 'general', label: 'General', icon: Bars3Icon },
]

interface TemplateEditorProps {
  organizationId: string
}

export function TemplateEditor({ organizationId }: TemplateEditorProps) {
  const [templates, setTemplates] = useState<MessageTemplate[]>(SAMPLE_TEMPLATES)
  const [currentTemplate, setCurrentTemplate] = useState<MessageTemplate | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [content, setContent] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [showVariables, setShowVariables] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [cursorPosition, setCursorPosition] = useState(0)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Initialize with first template
  useEffect(() => {
    if (templates.length > 0 && !currentTemplate) {
      setCurrentTemplate(templates[0])
      setContent(templates[0].content)
    }
  }, [templates, currentTemplate])

  // Text formatting functions
  const formatText = useCallback(
    (format: string) => {
      if (!textareaRef.current) return

      const textarea = textareaRef.current
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const selectedText = content.substring(start, end)

      let formattedText = ''
      switch (format) {
        case 'bold':
          formattedText = `**${selectedText}**`
          break
        case 'italic':
          formattedText = `*${selectedText}*`
          break
        case 'underline':
          formattedText = `_${selectedText}_`
          break
        case 'link':
          formattedText = `[${selectedText || 'Link text'}](https://example.com)`
          break
        default:
          formattedText = selectedText
      }

      const newContent = content.substring(0, start) + formattedText + content.substring(end)
      setContent(newContent)

      // Update cursor position
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + formattedText.length, start + formattedText.length)
      }, 0)
    },
    [content]
  )

  // Insert variable at cursor position
  const insertVariable = useCallback(
    (variable: TemplateVariable) => {
      if (!textareaRef.current) return

      const textarea = textareaRef.current
      const start = textarea.selectionStart
      const end = textarea.selectionEnd

      const newContent = content.substring(0, start) + variable.placeholder + content.substring(end)
      setContent(newContent)

      // Update cursor position
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(
          start + variable.placeholder.length,
          start + variable.placeholder.length
        )
      }, 0)

      setShowVariables(false)
    },
    [content]
  )

  // Validate template
  const validateTemplate = useCallback((templateContent: string, variables: TemplateVariable[]) => {
    const errors: string[] = []

    // Check for undefined variables
    const variablePattern = /\{\{([^}]+)\}\}/g
    let match
    const usedVariables = new Set<string>()

    while ((match = variablePattern.exec(templateContent)) !== null) {
      const variableName = match[1].trim()
      usedVariables.add(variableName)

      const isDefined =
        variables.some(v => v.id === variableName) ||
        PREDEFINED_VARIABLES.some(v => v.id === variableName)

      if (!isDefined) {
        errors.push(`Undefined variable: {{${variableName}}}`)
      }
    }

    // Check for required variables
    variables.forEach(variable => {
      if (variable.required && !usedVariables.has(variable.id)) {
        errors.push(`Required variable not used: {{${variable.id}}}`)
      }
    })

    setValidationErrors(errors)
    return errors.length === 0
  }, [])

  // Save template
  const saveTemplate = useCallback(() => {
    if (!currentTemplate) return

    const isValid = validateTemplate(content, currentTemplate.variables)
    if (!isValid) {
      alert('Please fix validation errors before saving.')
      return
    }

    const updatedTemplate = {
      ...currentTemplate,
      content,
      lastModified: new Date().toISOString().split('T')[0],
    }

    setTemplates(prev => prev.map(t => (t.id === currentTemplate.id ? updatedTemplate : t)))
    setCurrentTemplate(updatedTemplate)
    setIsEditing(false)

    alert('Template saved successfully!')
  }, [currentTemplate, content, validateTemplate])

  // Create new template
  const createNewTemplate = useCallback(() => {
    const newTemplate: MessageTemplate = {
      id: `template-${Date.now()}`,
      name: 'New Template',
      content: '',
      variables: [],
      category: 'general',
      tags: [],
      language: 'en',
      status: 'draft',
      createdAt: new Date().toISOString().split('T')[0],
      lastModified: new Date().toISOString().split('T')[0],
      usageCount: 0,
      attachments: [],
    }

    setTemplates(prev => [...prev, newTemplate])
    setCurrentTemplate(newTemplate)
    setContent('')
    setIsEditing(true)
  }, [])

  // Delete template
  const deleteTemplate = useCallback(
    (templateId: string) => {
      if (confirm('Are you sure you want to delete this template?')) {
        setTemplates(prev => prev.filter(t => t.id !== templateId))
        if (currentTemplate?.id === templateId) {
          setCurrentTemplate(templates.find(t => t.id !== templateId) || null)
        }
      }
    },
    [currentTemplate, templates]
  )

  // Render preview content
  const renderPreview = useCallback((templateContent: string) => {
    let preview = templateContent

    // Replace variables with sample data
    const sampleData: Record<string, string> = {
      contact_name: 'John Doe',
      contact_phone: '+1234567890',
      contact_email: 'john@example.com',
      company_name: 'ADSapp',
      agent_name: 'Alice Smith',
      current_date: new Date().toLocaleDateString(),
      current_time: new Date().toLocaleTimeString(),
      last_contact_date: new Date(Date.now() - 86400000).toLocaleDateString(),
    }

    // Replace all variables
    Object.entries(sampleData).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g')
      preview = preview.replace(regex, value)
    })

    // Format text
    preview = preview
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/_(.*?)_/g, '<u>$1</u>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-blue-600 underline">$1</a>')
      .replace(/\n/g, '<br>')

    return preview
  }, [])

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  return (
    <div className='flex h-screen bg-gray-50'>
      {/* Template Library Sidebar */}
      <div className='flex w-80 flex-col border-r border-gray-200 bg-white'>
        {/* Header */}
        <div className='border-b border-gray-200 p-4'>
          <div className='mb-4 flex items-center justify-between'>
            <h2 className='text-lg font-semibold text-gray-900'>Message Templates</h2>
            <button
              type='button'
              onClick={createNewTemplate}
              className='rounded-lg p-2 text-blue-600 hover:bg-blue-50'
              aria-label='Create new template'
            >
              <PlusIcon className='h-5 w-5' />
            </button>
          </div>

          {/* Search */}
          <div className='relative'>
            <MagnifyingGlassIcon className='absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400' />
            <input
              type='text'
              placeholder='Search templates...'
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className='w-full rounded-lg border border-gray-300 py-2 pr-4 pl-10 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
            />
          </div>

          {/* Category Filter */}
          <div className='mt-3'>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
              aria-label='Filter by category'
            >
              <option value='all'>All Categories</option>
              {TEMPLATE_CATEGORIES.map(category => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Template List */}
        <div className='flex-1 overflow-y-auto'>
          {filteredTemplates.map(template => (
            <div
              key={template.id}
              className={`cursor-pointer border-b border-gray-100 p-4 hover:bg-gray-50 ${
                currentTemplate?.id === template.id ? 'border-blue-200 bg-blue-50' : ''
              }`}
              onClick={() => {
                setCurrentTemplate(template)
                setContent(template.content)
                setIsEditing(false)
              }}
              role='button'
              tabIndex={0}
              aria-label={`Select template: ${template.name}`}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setCurrentTemplate(template)
                  setContent(template.content)
                  setIsEditing(false)
                }
              }}
            >
              <div className='flex items-start justify-between'>
                <div className='min-w-0 flex-1'>
                  <h3 className='truncate text-sm font-medium text-gray-900'>{template.name}</h3>
                  <p className='mt-1 line-clamp-2 text-xs text-gray-500'>{template.content}</p>
                </div>
                <div className='ml-2 flex items-center space-x-1'>
                  <span
                    className={`h-2 w-2 rounded-full ${
                      template.status === 'active'
                        ? 'bg-green-400'
                        : template.status === 'draft'
                          ? 'bg-yellow-400'
                          : 'bg-gray-400'
                    }`}
                  ></span>
                  <button
                    type='button'
                    onClick={e => {
                      e.stopPropagation()
                      deleteTemplate(template.id)
                    }}
                    className='text-red-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-600'
                    aria-label='Delete template'
                  >
                    <TrashIcon className='h-3 w-3' />
                  </button>
                </div>
              </div>

              <div className='mt-3 flex items-center justify-between'>
                <div className='flex items-center space-x-2'>
                  <span className='rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600'>
                    {template.category}
                  </span>
                  {template.tags.slice(0, 2).map(tag => (
                    <span
                      key={tag}
                      className='rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-600'
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <span className='text-xs text-gray-400'>{template.usageCount} uses</span>
              </div>
            </div>
          ))}

          {filteredTemplates.length === 0 && (
            <div className='p-8 text-center'>
              <DocumentIcon className='mx-auto mb-4 h-12 w-12 text-gray-400' />
              <p className='text-gray-500'>No templates found</p>
              <button
                type='button'
                onClick={createNewTemplate}
                className='mt-2 font-medium text-blue-600 hover:text-blue-700'
              >
                Create your first template
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Editor */}
      <div className='flex flex-1 flex-col'>
        {currentTemplate ? (
          <>
            {/* Editor Header */}
            <div className='border-b border-gray-200 bg-white px-6 py-4'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center space-x-4'>
                  <input
                    type='text'
                    title='Template name'
                    placeholder='Enter template name'
                    value={currentTemplate.name}
                    onChange={e =>
                      setCurrentTemplate(prev => (prev ? { ...prev, name: e.target.value } : null))
                    }
                    className='rounded border-none bg-transparent px-2 py-1 text-xl font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none'
                    disabled={!isEditing}
                  />
                  <span
                    className={`rounded-full px-2 py-1 text-xs ${
                      currentTemplate.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : currentTemplate.status === 'draft'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {currentTemplate.status}
                  </span>
                </div>

                <div className='flex items-center space-x-3'>
                  <button
                    type='button'
                    onClick={() => setShowVariables(!showVariables)}
                    className={`flex items-center rounded-lg px-3 py-2 text-sm font-medium ${
                      showVariables
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    aria-label='Toggle variables panel'
                  >
                    <CodeBracketIcon className='mr-2 h-4 w-4' />
                    Variables
                  </button>

                  <button
                    type='button'
                    onClick={() => setShowPreview(!showPreview)}
                    className={`flex items-center rounded-lg px-3 py-2 text-sm font-medium ${
                      showPreview
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    aria-label='Toggle preview'
                  >
                    <EyeIcon className='mr-2 h-4 w-4' />
                    Preview
                  </button>

                  {isEditing ? (
                    <div className='flex items-center space-x-2'>
                      <button
                        type='button'
                        onClick={() => {
                          setContent(currentTemplate.content)
                          setIsEditing(false)
                        }}
                        className='rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50'
                      >
                        Cancel
                      </button>
                      <button
                        type='button'
                        onClick={saveTemplate}
                        className='rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700'
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <button
                      type='button'
                      onClick={() => setIsEditing(true)}
                      className='rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700'
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>

              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <div className='mt-4 rounded-lg border border-red-200 bg-red-50 p-3'>
                  <div className='flex items-start'>
                    <ExclamationTriangleIcon className='mt-0.5 mr-2 h-5 w-5 text-red-400' />
                    <div>
                      <h4 className='text-sm font-medium text-red-800'>Validation Errors</h4>
                      <ul className='mt-1 list-inside list-disc text-sm text-red-700'>
                        {validationErrors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className='flex flex-1'>
              {/* Toolbar */}
              {isEditing && (
                <div className='flex w-12 flex-col space-y-2 border-r border-gray-200 bg-white p-2'>
                  <button
                    type='button'
                    onClick={() => formatText('bold')}
                    className='rounded p-2 text-gray-600 hover:bg-gray-100'
                    title='Bold'
                    aria-label='Bold text'
                  >
                    <BoldIcon className='h-4 w-4' />
                  </button>
                  <button
                    type='button'
                    onClick={() => formatText('italic')}
                    className='rounded p-2 text-gray-600 hover:bg-gray-100'
                    title='Italic'
                    aria-label='Italic text'
                  >
                    <ItalicIcon className='h-4 w-4' />
                  </button>
                  <button
                    type='button'
                    onClick={() => formatText('underline')}
                    className='rounded p-2 text-gray-600 hover:bg-gray-100'
                    title='Underline'
                    aria-label='Underline text'
                  >
                    <UnderlineIcon className='h-4 w-4' />
                  </button>
                  <button
                    type='button'
                    onClick={() => formatText('link')}
                    className='rounded p-2 text-gray-600 hover:bg-gray-100'
                    title='Insert Link'
                    aria-label='Insert link'
                  >
                    <LinkIcon className='h-4 w-4' />
                  </button>
                  <div className='my-2 border-t border-gray-200'></div>
                  <button
                    type='button'
                    className='rounded p-2 text-gray-600 hover:bg-gray-100'
                    title='Insert Image'
                    aria-label='Insert image'
                  >
                    <PhotoIcon className='h-4 w-4' />
                  </button>
                  <button
                    type='button'
                    className='rounded p-2 text-gray-600 hover:bg-gray-100'
                    title='Attach File'
                    aria-label='Attach file'
                  >
                    <PaperClipIcon className='h-4 w-4' />
                  </button>
                </div>
              )}

              {/* Content Area */}
              <div className='flex flex-1'>
                {/* Editor */}
                <div className={`${showPreview ? 'w-1/2' : 'w-full'} p-6`}>
                  {isEditing ? (
                    <textarea
                      ref={textareaRef}
                      value={content}
                      onChange={e => {
                        setContent(e.target.value)
                        validateTemplate(e.target.value, currentTemplate.variables)
                      }}
                      onSelect={e =>
                        setCursorPosition((e.target as HTMLTextAreaElement).selectionStart)
                      }
                      className='h-full w-full resize-none rounded-lg border border-gray-300 p-4 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
                      placeholder='Start typing your message template...'
                    />
                  ) : (
                    <div className='h-full w-full overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-4'>
                      <pre className='font-sans text-sm whitespace-pre-wrap text-gray-900'>
                        {currentTemplate.content}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Preview */}
                {showPreview && (
                  <div className='w-1/2 border-l border-gray-200 p-6'>
                    <div className='h-full overflow-y-auto rounded-lg border border-gray-200 bg-white p-4'>
                      <h3 className='mb-4 text-sm font-medium text-gray-700'>Preview</h3>
                      <div
                        className='prose prose-sm max-w-none'
                        dangerouslySetInnerHTML={{ __html: renderPreview(content) }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Variables Panel */}
              {showVariables && (
                <div className='w-80 overflow-y-auto border-l border-gray-200 bg-white p-4'>
                  <h3 className='mb-4 text-sm font-medium text-gray-900'>Variables</h3>

                  <div className='space-y-4'>
                    <div>
                      <h4 className='mb-2 text-xs font-medium tracking-wide text-gray-500 uppercase'>
                        Predefined Variables
                      </h4>
                      <div className='space-y-2'>
                        {PREDEFINED_VARIABLES.map(variable => (
                          <div
                            key={variable.id}
                            className='cursor-pointer rounded-lg border border-gray-200 p-3 transition-colors hover:border-blue-500'
                            onClick={() => insertVariable(variable)}
                            role='button'
                            tabIndex={0}
                            aria-label={`Insert ${variable.name} variable`}
                            onKeyDown={e => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                insertVariable(variable)
                              }
                            }}
                          >
                            <div className='flex items-center justify-between'>
                              <div>
                                <div className='text-sm font-medium text-gray-900'>
                                  {variable.name}
                                </div>
                                <div className='mt-1 text-xs text-gray-500'>
                                  {variable.description}
                                </div>
                              </div>
                              <code className='rounded bg-gray-100 px-2 py-1 text-xs'>
                                {variable.placeholder}
                              </code>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className='mb-2 text-xs font-medium tracking-wide text-gray-500 uppercase'>
                        Custom Variables
                      </h4>
                      {currentTemplate.variables.length > 0 ? (
                        <div className='space-y-2'>
                          {currentTemplate.variables.map(variable => (
                            <div
                              key={variable.id}
                              className='cursor-pointer rounded-lg border border-gray-200 p-3 transition-colors hover:border-blue-500'
                              onClick={() => insertVariable(variable)}
                            >
                              <div className='flex items-center justify-between'>
                                <div>
                                  <div className='text-sm font-medium text-gray-900'>
                                    {variable.name}
                                  </div>
                                  {variable.required && (
                                    <span className='text-xs text-red-500'>Required</span>
                                  )}
                                </div>
                                <code className='rounded bg-gray-100 px-2 py-1 text-xs'>
                                  {variable.placeholder}
                                </code>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className='text-sm text-gray-500'>No custom variables defined</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className='flex flex-1 items-center justify-center'>
            <div className='text-center'>
              <DocumentIcon className='mx-auto mb-4 h-16 w-16 text-gray-400' />
              <h2 className='mb-2 text-xl font-medium text-gray-900'>No Template Selected</h2>
              <p className='mb-6 text-gray-500'>
                Select a template from the sidebar or create a new one
              </p>
              <button
                type='button'
                onClick={createNewTemplate}
                className='rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700'
              >
                Create New Template
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default TemplateEditor
