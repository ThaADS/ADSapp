'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Send,
  Paperclip,
  LayoutTemplate,
  Image,
  FileText,
  Mic,
  Video,
  X,
  Sparkles,
} from 'lucide-react'
import { WhatsAppTemplateManager, WhatsAppTemplate } from '@/lib/whatsapp/templates'
import { WhatsAppMediaHandler } from '@/lib/whatsapp/media-handler'
import DraftSuggestions from '@/components/ai/draft-suggestions'

interface MessageInputProps {
  conversationId: string
  organizationId: string
  currentUserId: string
  contactName?: string
  onSendMessage: (
    content: string,
    type: 'text' | 'template' | 'image' | 'document' | 'audio' | 'video',
    attachments?: File[]
  ) => void
  onStartTyping?: () => void
  onStopTyping?: () => void
  disabled?: boolean
  placeholder?: string
}

interface TemplateModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectTemplate: (template: WhatsAppTemplate, variables: Record<string, string>) => void
  organizationId: string
}

interface AttachmentPreview {
  id: string
  file: File
  type: 'image' | 'document' | 'audio' | 'video'
  preview?: string
}

function TemplateModal({ isOpen, onClose, onSelectTemplate, organizationId }: TemplateModalProps) {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null)
  const [variables, setVariables] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const templateManager = new WhatsAppTemplateManager()

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setLoading(true)
        const result = await templateManager.getTemplates(organizationId, {
          status: 'approved',
          limit: 50,
        })
        setTemplates(result)
      } catch (error) {
        console.error('Failed to load templates:', error)
      } finally {
        setLoading(false)
      }
    }

    if (isOpen) {
      loadTemplates()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, organizationId])

  const handleTemplateSelect = (template: WhatsAppTemplate) => {
    setSelectedTemplate(template)
    // Initialize variables with example values
    const initialVariables: Record<string, string> = {}
    template.variables.forEach(variable => {
      initialVariables[variable.name] = variable.example
    })
    setVariables(initialVariables)
  }

  const handleSendTemplate = () => {
    if (selectedTemplate) {
      onSelectTemplate(selectedTemplate, variables)
      onClose()
      setSelectedTemplate(null)
      setVariables({})
    }
  }

  if (!isOpen) return null

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm'
      onClick={onClose}
    >
      <div
        className='max-h-[85vh] w-full max-w-4xl overflow-hidden rounded-xl bg-white shadow-2xl'
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with close button */}
        <div className='flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4'>
          <div className='flex items-center gap-3'>
            <div className='rounded-lg bg-blue-100 p-2'>
              <LayoutTemplate className='h-5 w-5 text-blue-600' />
            </div>
            <div>
              <h3 className='text-lg font-semibold text-gray-900'>Templates</h3>
              <p className='text-xs text-gray-600'>Kies een template om te gebruiken</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className='rounded-lg bg-white p-2.5 text-gray-600 shadow-sm transition-all hover:bg-gray-50 hover:text-gray-900 hover:shadow-md'
            aria-label='Sluiten'
          >
            <X className='h-6 w-6' />
          </button>
        </div>

        <div className='flex h-[65vh]'>
          {/* Template List */}
          <div className='w-2/5 overflow-y-auto border-r border-gray-100 bg-gray-50'>
            {loading ? (
              <div className='flex items-center justify-center p-8'>
                <div className='text-center'>
                  <div className='mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent'></div>
                  <p className='text-sm text-gray-600'>Templates laden...</p>
                </div>
              </div>
            ) : templates.length === 0 ? (
              <div className='flex items-center justify-center p-8 text-gray-500'>
                <div className='text-center'>
                  <LayoutTemplate className='mx-auto mb-3 h-12 w-12 text-gray-300' />
                  <p className='font-medium'>Geen templates gevonden</p>
                  <p className='mt-1 text-xs text-gray-400'>Maak eerst templates aan</p>
                </div>
              </div>
            ) : (
              <div className='divide-y divide-gray-200'>
                {templates.map(template => (
                  <div
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className={`group cursor-pointer p-4 transition-all ${
                      selectedTemplate?.id === template.id
                        ? 'border-r-4 border-blue-600 bg-white shadow-sm'
                        : 'hover:bg-white/80'
                    }`}
                  >
                    <div className='flex items-start justify-between'>
                      <div className='flex-1'>
                        <h4 className='font-semibold text-gray-900 group-hover:text-blue-600'>
                          {template.displayName}
                        </h4>
                        <p className='mt-1 text-xs font-medium uppercase tracking-wide text-gray-500'>
                          {template.category}
                        </p>
                      </div>
                      {selectedTemplate?.id === template.id && (
                        <div className='ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600'>
                          <svg className='h-3 w-3 text-white' fill='currentColor' viewBox='0 0 20 20'>
                            <path
                              fillRule='evenodd'
                              d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                              clipRule='evenodd'
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Template Preview */}
          <div className='w-3/5 overflow-y-auto bg-white p-6'>
            {selectedTemplate ? (
              <div className='space-y-6'>
                <div className='flex items-center justify-between'>
                  <h4 className='text-base font-semibold text-gray-900'>Preview</h4>
                  <span className='rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700'>
                    Goedgekeurd
                  </span>
                </div>

                {/* WhatsApp-style preview */}
                <div className='rounded-lg border-2 border-gray-200 bg-gradient-to-br from-green-50 to-teal-50 p-4'>
                  {/* Header */}
                  {selectedTemplate.content.header && (
                    <div className='mb-3 rounded-lg bg-white p-3 shadow-sm'>
                      <p className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
                        Header
                      </p>
                      <p className='mt-1 font-medium text-gray-900'>
                        {selectedTemplate.content.header.text}
                      </p>
                    </div>
                  )}

                  {/* Body */}
                  <div className='mb-3 rounded-lg bg-white p-3 shadow-sm'>
                    <p className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
                      Bericht
                    </p>
                    <p className='mt-1 whitespace-pre-wrap text-gray-900'>
                      {selectedTemplate.content.body.text}
                    </p>
                  </div>

                  {/* Footer */}
                  {selectedTemplate.content.footer && (
                    <div className='rounded-lg bg-white p-3 shadow-sm'>
                      <p className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
                        Footer
                      </p>
                      <p className='mt-1 text-sm text-gray-600'>
                        {selectedTemplate.content.footer.text}
                      </p>
                    </div>
                  )}
                </div>

                {/* Variables */}
                {selectedTemplate.variables.length > 0 && (
                  <div>
                    <p className='mb-3 text-sm font-semibold text-gray-900'>
                      Variabelen invullen
                    </p>
                    <div className='space-y-3'>
                      {selectedTemplate.variables.map(variable => (
                        <div key={variable.name}>
                          <label className='block text-sm font-medium text-gray-700'>
                            {variable.name} {variable.required && <span className='text-red-500'>*</span>}
                          </label>
                          <input
                            type='text'
                            value={variables[variable.name] || ''}
                            onChange={e =>
                              setVariables({ ...variables, [variable.name]: e.target.value })
                            }
                            placeholder={variable.example}
                            className='mt-1 block w-full rounded-lg border-gray-300 px-4 py-2.5 text-sm shadow-sm transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                          />
                          {variable.description && (
                            <p className='mt-1.5 text-xs text-gray-500'>{variable.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className='flex gap-3 border-t border-gray-100 pt-4'>
                  <button
                    onClick={onClose}
                    className='flex-1 rounded-lg border-2 border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50'
                  >
                    Annuleren
                  </button>
                  <button
                    onClick={handleSendTemplate}
                    className='flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-600/30 transition-all hover:bg-blue-700 hover:shadow-xl'
                  >
                    Template Versturen
                  </button>
                </div>
              </div>
            ) : (
              <div className='flex h-full items-center justify-center text-gray-400'>
                <div className='text-center'>
                  <LayoutTemplate className='mx-auto mb-4 h-16 w-16 text-gray-300' />
                  <p className='font-medium text-gray-600'>Selecteer een template</p>
                  <p className='mt-1 text-sm text-gray-500'>Kies links een template om de preview te zien</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function EnhancedMessageInput({
  conversationId,
  organizationId,
  contactName = 'Contact',
  onSendMessage,
  onStartTyping,
  onStopTyping,
  disabled = false,
  placeholder = 'Type a message...',
}: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [showAttachments, setShowAttachments] = useState(false)
  const [showAIDrafts, setShowAIDrafts] = useState(false)
  const [attachments, setAttachments] = useState<AttachmentPreview[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [typingTimer, setTypingTimer] = useState<NodeJS.Timeout | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleInputChange = (value: string) => {
    setMessage(value)

    // Handle typing indicators
    if (!isTyping && onStartTyping) {
      setIsTyping(true)
      onStartTyping()
    }

    if (typingTimer) {
      clearTimeout(typingTimer)
    }

    const timer = setTimeout(() => {
      if (isTyping && onStopTyping) {
        setIsTyping(false)
        onStopTyping()
      }
    }, 1000)

    setTypingTimer(timer)

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }

  const handleSend = () => {
    if (!message.trim() && attachments.length === 0) return

    if (attachments.length > 0) {
      // Send attachments
      attachments.forEach(attachment => {
        onSendMessage(message || `[${attachment.type}] ${attachment.file.name}`, attachment.type, [
          attachment.file,
        ])
      })
      setAttachments([])
    } else {
      // Send text message
      onSendMessage(message, 'text')
    }

    setMessage('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    if (isTyping && onStopTyping) {
      setIsTyping(false)
      onStopTyping()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileSelect = (type: 'image' | 'document' | 'audio' | 'video') => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = true

    switch (type) {
      case 'image':
        input.accept = 'image/*'
        break
      case 'document':
        input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt'
        break
      case 'audio':
        input.accept = 'audio/*'
        break
      case 'video':
        input.accept = 'video/*'
        break
    }

    input.onchange = e => {
      const files = (e.target as HTMLInputElement).files
      if (files) {
        Array.from(files).forEach(file => {
          const validation = WhatsAppMediaHandler.validateMediaFile(file)
          if (!validation.valid) {
            alert(`File validation failed: ${validation.errors.join(', ')}`)
            return
          }

          const attachment: AttachmentPreview = {
            id: crypto.randomUUID(),
            file,
            type,
          }

          if (type === 'image') {
            const reader = new FileReader()
            reader.onload = e => {
              attachment.preview = e.target?.result as string
              setAttachments(prev => [...prev, attachment])
            }
            reader.readAsDataURL(file)
          } else {
            setAttachments(prev => [...prev, attachment])
          }
        })
      }
    }

    input.click()
    setShowAttachments(false)
  }

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id))
  }

  const handleTemplateSelect = (template: WhatsAppTemplate, variables: Record<string, string>) => {
    // Format template with variables
    const templateContent = JSON.stringify({
      templateId: template.id,
      name: template.name,
      variables,
    })

    onSendMessage(templateContent, 'template')
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleSelectAIDraft = (draft: string) => {
    setMessage(draft)
    setShowAIDrafts(false)
    textareaRef.current?.focus()
  }

  return (
    <div className='border-t border-gray-200 bg-white'>
      {/* Attachment Previews */}
      {attachments.length > 0 && (
        <div className='border-b border-gray-200 p-4'>
          <div className='flex flex-wrap gap-2'>
            {attachments.map(attachment => (
              <div key={attachment.id} className='group relative'>
                {attachment.type === 'image' && attachment.preview ? (
                  <div className='relative'>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={attachment.preview}
                      alt={attachment.file.name}
                      className='h-16 w-16 rounded-lg object-cover'
                    />
                    <button
                      onClick={() => removeAttachment(attachment.id)}
                      className='absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white'
                    >
                      <X className='h-3 w-3' />
                    </button>
                  </div>
                ) : (
                  <div className='flex w-48 items-center space-x-2 rounded-lg bg-gray-100 p-2'>
                    {attachment.type === 'document' && (
                      <FileText className='h-8 w-8 text-gray-500' />
                    )}
                    {attachment.type === 'audio' && <Mic className='h-8 w-8 text-green-500' />}
                    {attachment.type === 'video' && <Video className='h-8 w-8 text-purple-500' />}
                    <div className='min-w-0 flex-1'>
                      <p className='truncate text-sm font-medium text-gray-900'>
                        {attachment.file.name}
                      </p>
                      <p className='text-xs text-gray-500'>
                        {formatFileSize(attachment.file.size)}
                      </p>
                    </div>
                    <button
                      onClick={() => removeAttachment(attachment.id)}
                      className='text-gray-400 hover:text-red-500'
                    >
                      <X className='h-4 w-4' />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Draft Suggestions */}
      {showAIDrafts && (
        <div className='border-b border-gray-200 p-4'>
          <DraftSuggestions
            conversationId={conversationId}
            organizationId={organizationId}
            contactName={contactName}
            onSelectDraft={handleSelectAIDraft}
          />
        </div>
      )}

      {/* Message Input */}
      <div className='flex items-center gap-2 p-4 bg-white border-t-2 border-gray-200'>
        {/* Attachment Button */}
        <div className='relative'>
          <button
            onClick={() => setShowAttachments(!showAttachments)}
            className='flex items-center justify-center rounded-full p-2 text-gray-600 transition-all hover:bg-gray-100'
            disabled={disabled}
            title='Bijlage toevoegen'
          >
            <Paperclip className='h-5 w-5' />
          </button>

          {/* Attachment Menu - WhatsApp/Telegram Style */}
          {showAttachments && (
            <div className='absolute bottom-full left-0 z-10 mb-2 flex flex-col gap-2 rounded-2xl bg-white p-3 shadow-2xl border border-gray-200'>
              <button
                onClick={() => handleFileSelect('image')}
                className='flex items-center justify-center rounded-full p-3 bg-purple-500 text-white transition-all hover:bg-purple-600 shadow-md'
                title='Afbeelding'
              >
                <Image className='h-5 w-5' />
              </button>
              <button
                onClick={() => handleFileSelect('document')}
                className='flex items-center justify-center rounded-full p-3 bg-blue-500 text-white transition-all hover:bg-blue-600 shadow-md'
                title='Document'
              >
                <FileText className='h-5 w-5' />
              </button>
              <button
                onClick={() => handleFileSelect('audio')}
                className='flex items-center justify-center rounded-full p-3 bg-orange-500 text-white transition-all hover:bg-orange-600 shadow-md'
                title='Audio'
              >
                <Mic className='h-5 w-5' />
              </button>
              <button
                onClick={() => handleFileSelect('video')}
                className='flex items-center justify-center rounded-full p-3 bg-red-500 text-white transition-all hover:bg-red-600 shadow-md'
                title='Video'
              >
                <Video className='h-5 w-5' />
              </button>
            </div>
          )}
        </div>

        {/* Template Button */}
        <button
          onClick={() => setShowTemplates(true)}
          className='flex items-center justify-center rounded-full p-2 text-gray-600 transition-all hover:bg-gray-100'
          disabled={disabled}
          title='Sjablonen'
        >
          <LayoutTemplate className='h-5 w-5' />
        </button>

        {/* AI Drafts Button */}
        <button
          onClick={() => setShowAIDrafts(!showAIDrafts)}
          className={`flex items-center justify-center rounded-full p-2 transition-all ${
            showAIDrafts
              ? 'bg-emerald-100 text-emerald-600'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
          disabled={disabled}
          title='AI Suggesties'
        >
          <Sparkles className='h-5 w-5' />
        </button>

        {/* Message Input */}
        <div className='flex-1'>
          <textarea
            ref={textareaRef}
            value={message}
            onChange={e => handleInputChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className='max-h-32 w-full resize-none rounded-full border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none'
            style={{ minHeight: '42px' }}
          />
        </div>

        {/* Send Button - Telegram Style Round */}
        <button
          onClick={handleSend}
          disabled={disabled || (!message.trim() && attachments.length === 0)}
          className='flex items-center justify-center rounded-full p-3 bg-blue-600 text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 shadow-md'
          title='Versturen'
        >
          <Send className='h-5 w-5' />
        </button>
      </div>

      {/* Template Modal */}
      <TemplateModal
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSelectTemplate={handleTemplateSelect}
        organizationId={organizationId}
      />
    </div>
  )
}
