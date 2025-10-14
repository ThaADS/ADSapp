'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Paperclip, Smile, LayoutTemplate, Image, FileText, Mic, Video, X, Plus } from 'lucide-react'
import { WhatsAppTemplateManager, WhatsAppTemplate } from '@/lib/whatsapp/templates'
import { WhatsAppMediaHandler } from '@/lib/whatsapp/media-handler'

interface MessageInputProps {
  conversationId: string
  organizationId: string
  currentUserId: string
  onSendMessage: (content: string, type: 'text' | 'template' | 'image' | 'document' | 'audio' | 'video', attachments?: any[]) => void
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

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const result = await templateManager.getTemplates(organizationId, {
        status: 'approved',
        limit: 50
      })
      setTemplates(result)
    } catch (error) {
      console.error('Failed to load templates:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadTemplates()
    }
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Select Template</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex h-[60vh]">
          {/* Template List */}
          <div className="w-1/2 border-r border-gray-200 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Loading templates...</div>
            ) : templates.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <LayoutTemplate className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>No approved templates found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 ${
                      selectedTemplate?.id === template.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                    }`}
                  >
                    <h4 className="font-medium text-gray-900">{template.displayName}</h4>
                    <p className="text-sm text-gray-500 mt-1">{template.category}</p>
                    <div className="mt-2">
                      <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                        {template.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Template Preview */}
          <div className="w-1/2 p-4 overflow-y-auto">
            {selectedTemplate ? (
              <div>
                <h4 className="font-medium text-gray-900 mb-4">Template Preview</h4>

                {/* Header */}
                {selectedTemplate.content.header && (
                  <div className="mb-3 p-3 bg-gray-50 rounded">
                    <p className="text-sm font-medium text-gray-700">Header</p>
                    <p className="text-sm text-gray-600">{selectedTemplate.content.header.text}</p>
                  </div>
                )}

                {/* Body */}
                <div className="mb-3 p-3 bg-gray-50 rounded">
                  <p className="text-sm font-medium text-gray-700">Body</p>
                  <p className="text-sm text-gray-600">{selectedTemplate.content.body.text}</p>
                </div>

                {/* Footer */}
                {selectedTemplate.content.footer && (
                  <div className="mb-3 p-3 bg-gray-50 rounded">
                    <p className="text-sm font-medium text-gray-700">Footer</p>
                    <p className="text-sm text-gray-600">{selectedTemplate.content.footer.text}</p>
                  </div>
                )}

                {/* Variables */}
                {selectedTemplate.variables.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Variables</p>
                    <div className="space-y-2">
                      {selectedTemplate.variables.map((variable) => (
                        <div key={variable.name}>
                          <label className="block text-xs font-medium text-gray-600">
                            {variable.name} {variable.required && '*'}
                          </label>
                          <input
                            type="text"
                            value={variables[variable.name] || ''}
                            onChange={(e) => setVariables({ ...variables, [variable.name]: e.target.value })}
                            placeholder={variable.example}
                            className="mt-1 block w-full px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          />
                          {variable.description && (
                            <p className="text-xs text-gray-500 mt-1">{variable.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Send Button */}
                <button
                  onClick={handleSendTemplate}
                  className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Send Template
                </button>
              </div>
            ) : (
              <div className="text-center text-gray-500 mt-8">
                <LayoutTemplate className="w-12 h-12 mx-auto mb-4 text-gray-300" />
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
  currentUserId,
  onSendMessage,
  onStartTyping,
  onStopTyping,
  disabled = false,
  placeholder = 'Type a message...'
}: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [showAttachments, setShowAttachments] = useState(false)
  const [attachments, setAttachments] = useState<AttachmentPreview[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const [typingTimer, setTypingTimer] = useState<NodeJS.Timeout | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
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
        onSendMessage(
          message || `[${attachment.type}] ${attachment.file.name}`,
          attachment.type,
          [attachment.file]
        )
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

    input.onchange = (e) => {
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
            type
          }

          if (type === 'image') {
            const reader = new FileReader()
            reader.onload = (e) => {
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
      variables
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

  return (
    <div className="border-t border-gray-200 bg-white">
      {/* Attachment Previews */}
      {attachments.length > 0 && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment) => (
              <div key={attachment.id} className="relative group">
                {attachment.type === 'image' && attachment.preview ? (
                  <div className="relative">
                    <img
                      src={attachment.preview}
                      alt={attachment.file.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removeAttachment(attachment.id)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-2 w-48">
                    {attachment.type === 'document' && <FileText className="w-8 h-8 text-gray-500" />}
                    {attachment.type === 'audio' && <Mic className="w-8 h-8 text-green-500" />}
                    {attachment.type === 'video' && <Video className="w-8 h-8 text-purple-500" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {attachment.file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(attachment.file.size)}
                      </p>
                    </div>
                    <button
                      onClick={() => removeAttachment(attachment.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="flex items-end space-x-3 p-4">
        {/* Attachment Button */}
        <div className="relative">
          <button
            onClick={() => setShowAttachments(!showAttachments)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            disabled={disabled}
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Attachment Menu */}
          {showAttachments && (
            <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-10">
              <button
                onClick={() => handleFileSelect('image')}
                className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Image className="w-4 h-4 text-blue-500" />
                <span>Image</span>
              </button>
              <button
                onClick={() => handleFileSelect('document')}
                className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <FileText className="w-4 h-4 text-gray-500" />
                <span>Document</span>
              </button>
              <button
                onClick={() => handleFileSelect('audio')}
                className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Mic className="w-4 h-4 text-green-500" />
                <span>Audio</span>
              </button>
              <button
                onClick={() => handleFileSelect('video')}
                className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Video className="w-4 h-4 text-purple-500" />
                <span>Video</span>
              </button>
            </div>
          )}
        </div>

        {/* Template Button */}
        <button
          onClick={() => setShowTemplates(true)}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          disabled={disabled}
        >
          <LayoutTemplate className="w-5 h-5" />
        </button>

        {/* Message Input */}
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="w-full px-4 py-2 border border-gray-300 rounded-full resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 max-h-32"
            style={{ minHeight: '40px' }}
          />
        </div>

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={disabled || (!message.trim() && attachments.length === 0)}
          className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-5 h-5" />
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