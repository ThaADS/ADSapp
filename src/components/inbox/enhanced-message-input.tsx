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
    <div className='bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black'>
      <div className='max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-lg bg-white'>
        <div className='flex items-center justify-between border-b border-gray-200 p-4'>
          <h3 className='text-lg font-medium text-gray-900'>Select Template</h3>
          <button onClick={onClose} className='text-gray-400 hover:text-gray-600'>
            <X className='h-5 w-5' />
          </button>
        </div>

        <div className='flex h-[60vh]'>
          {/* Template List */}
          <div className='w-1/2 overflow-y-auto border-r border-gray-200'>
            {loading ? (
              <div className='p-4 text-center text-gray-500'>Loading templates...</div>
            ) : templates.length === 0 ? (
              <div className='p-4 text-center text-gray-500'>
                <LayoutTemplate className='mx-auto mb-2 h-8 w-8 text-gray-300' />
                <p>No approved templates found</p>
              </div>
            ) : (
              <div className='divide-y divide-gray-100'>
                {templates.map(template => (
                  <div
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className={`cursor-pointer p-4 hover:bg-gray-50 ${
                      selectedTemplate?.id === template.id
                        ? 'border-r-2 border-blue-500 bg-blue-50'
                        : ''
                    }`}
                  >
                    <h4 className='font-medium text-gray-900'>{template.displayName}</h4>
                    <p className='mt-1 text-sm text-gray-500'>{template.category}</p>
                    <div className='mt-2'>
                      <span className='inline-flex items-center rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-800'>
                        {template.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Template Preview */}
          <div className='w-1/2 overflow-y-auto p-4'>
            {selectedTemplate ? (
              <div>
                <h4 className='mb-4 font-medium text-gray-900'>Template Preview</h4>

                {/* Header */}
                {selectedTemplate.content.header && (
                  <div className='mb-3 rounded bg-gray-50 p-3'>
                    <p className='text-sm font-medium text-gray-700'>Header</p>
                    <p className='text-sm text-gray-600'>{selectedTemplate.content.header.text}</p>
                  </div>
                )}

                {/* Body */}
                <div className='mb-3 rounded bg-gray-50 p-3'>
                  <p className='text-sm font-medium text-gray-700'>Body</p>
                  <p className='text-sm text-gray-600'>{selectedTemplate.content.body.text}</p>
                </div>

                {/* Footer */}
                {selectedTemplate.content.footer && (
                  <div className='mb-3 rounded bg-gray-50 p-3'>
                    <p className='text-sm font-medium text-gray-700'>Footer</p>
                    <p className='text-sm text-gray-600'>{selectedTemplate.content.footer.text}</p>
                  </div>
                )}

                {/* Variables */}
                {selectedTemplate.variables.length > 0 && (
                  <div className='mb-4'>
                    <p className='mb-2 text-sm font-medium text-gray-700'>Variables</p>
                    <div className='space-y-2'>
                      {selectedTemplate.variables.map(variable => (
                        <div key={variable.name}>
                          <label className='block text-xs font-medium text-gray-600'>
                            {variable.name} {variable.required && '*'}
                          </label>
                          <input
                            type='text'
                            value={variables[variable.name] || ''}
                            onChange={e =>
                              setVariables({ ...variables, [variable.name]: e.target.value })
                            }
                            placeholder={variable.example}
                            className='mt-1 block w-full rounded-md border border-gray-300 px-3 py-1 text-sm focus:border-blue-500 focus:ring-blue-500'
                          />
                          {variable.description && (
                            <p className='mt-1 text-xs text-gray-500'>{variable.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Send Button */}
                <button
                  onClick={handleSendTemplate}
                  className='w-full rounded-md bg-blue-600 py-2 text-white transition-colors hover:bg-blue-700'
                >
                  Send Template
                </button>
              </div>
            ) : (
              <div className='mt-8 text-center text-gray-500'>
                <LayoutTemplate className='mx-auto mb-4 h-12 w-12 text-gray-300' />
                <p>Select a template to preview</p>
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
      <div className='flex items-end space-x-3 p-4'>
        {/* Attachment Button */}
        <div className='relative'>
          <button
            onClick={() => setShowAttachments(!showAttachments)}
            className='rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600'
            disabled={disabled}
          >
            <Paperclip className='h-5 w-5' />
          </button>

          {/* Attachment Menu */}
          {showAttachments && (
            <div className='absolute bottom-full left-0 z-10 mb-2 rounded-lg border border-gray-200 bg-white py-2 shadow-lg'>
              <button
                onClick={() => handleFileSelect('image')}
                className='flex w-full items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100'
              >
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <Image className='h-4 w-4 text-blue-500' />
                <span>Image</span>
              </button>
              <button
                onClick={() => handleFileSelect('document')}
                className='flex w-full items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100'
              >
                <FileText className='h-4 w-4 text-gray-500' />
                <span>Document</span>
              </button>
              <button
                onClick={() => handleFileSelect('audio')}
                className='flex w-full items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100'
              >
                <Mic className='h-4 w-4 text-green-500' />
                <span>Audio</span>
              </button>
              <button
                onClick={() => handleFileSelect('video')}
                className='flex w-full items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100'
              >
                <Video className='h-4 w-4 text-purple-500' />
                <span>Video</span>
              </button>
            </div>
          )}
        </div>

        {/* Template Button */}
        <button
          onClick={() => setShowTemplates(true)}
          className='rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600'
          disabled={disabled}
        >
          <LayoutTemplate className='h-5 w-5' />
        </button>

        {/* AI Drafts Button */}
        <button
          onClick={() => setShowAIDrafts(!showAIDrafts)}
          className={`rounded-full p-2 transition-colors ${
            showAIDrafts
              ? 'bg-emerald-100 text-emerald-600'
              : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
          }`}
          disabled={disabled}
          title='AI Draft Suggestions'
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
            className='max-h-32 w-full resize-none rounded-full border border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500'
            style={{ minHeight: '40px' }}
          />
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={disabled || (!message.trim() && attachments.length === 0)}
          className='rounded-full bg-blue-600 p-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50'
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
