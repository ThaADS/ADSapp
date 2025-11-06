'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import {
  PaperAirplaneIcon,
  PaperClipIcon,
  FaceSmileIcon,
  MicrophoneIcon,
  PhotoIcon,
  DocumentIcon,
  VideoCameraIcon,
  LinkIcon,
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  ListBulletIcon,
  NumberedListIcon,
  CodeBracketIcon,
  AtSymbolIcon,
  HashtagIcon,
  XMarkIcon,
  PlayIcon,
  PauseIcon,
  StopIcon,
  SpeakerWaveIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline'
import {
  CheckIcon as CheckIconSolid,
  ExclamationTriangleIcon as ExclamationTriangleIconSolid,
} from '@heroicons/react/24/solid'

// Message types
interface Message {
  id: string
  content: string
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location'
  sender: 'user' | 'contact'
  timestamp: Date
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
  metadata?: {
    fileName?: string
    fileSize?: number
    duration?: number
    mimeType?: string
    thumbnail?: string
    location?: { lat: number; lng: number; address: string }
  }
  replyTo?: string
  reactions?: { emoji: string; count: number }[]
}

interface Attachment {
  id: string
  file: File
  type: 'image' | 'video' | 'audio' | 'document'
  preview?: string
  uploadProgress?: number
}

interface Template {
  id: string
  name: string
  content: string
  category: string
  variables: string[]
}

// Sample data
const SAMPLE_MESSAGES: Message[] = [
  {
    id: '1',
    content: 'Hello! How can I help you today?',
    type: 'text',
    sender: 'user',
    timestamp: new Date(Date.now() - 3600000),
    status: 'read',
  },
  {
    id: '2',
    content: "Hi! I'm interested in your products. Could you send me more information?",
    type: 'text',
    sender: 'contact',
    timestamp: new Date(Date.now() - 3300000),
    status: 'read',
  },
  {
    id: '3',
    content: 'Of course! Let me share our latest catalog with you.',
    type: 'text',
    sender: 'user',
    timestamp: new Date(Date.now() - 3000000),
    status: 'read',
  },
]

const SAMPLE_TEMPLATES: Template[] = [
  {
    id: '1',
    name: 'Welcome Message',
    content: 'Hello {{name}}! Welcome to our service. How can we help you today?',
    category: 'greeting',
    variables: ['name'],
  },
  {
    id: '2',
    name: 'Order Confirmation',
    content:
      'Your order #{{orderNumber}} has been confirmed. Total: {{amount}}. Expected delivery: {{date}}.',
    category: 'order',
    variables: ['orderNumber', 'amount', 'date'],
  },
  {
    id: '3',
    name: 'Support Response',
    content:
      "Thank you for contacting support. We've received your inquiry about {{topic}} and will respond within 24 hours.",
    category: 'support',
    variables: ['topic'],
  },
]

const EMOJI_CATEGORIES = {
  recent: ['😀', '😂', '❤️', '👍', '🎉', '😊', '🤔', '👏'],
  people: ['😀', '😂', '🥰', '😍', '🤗', '🤔', '😎', '😴', '🤯', '😱'],
  nature: ['🌟', '🌙', '☀️', '🌈', '🔥', '💧', '🌸', '🌺', '🌻', '🍀'],
  objects: ['💼', '📱', '💻', '📝', '📊', '🎯', '🔔', '🎁', '🏆', '⚡'],
  symbols: ['❤️', '💯', '✨', '🎉', '👍', '👎', '✅', '❌', '⭐', '🔥'],
}

interface EnhancedMessageInterfaceProps {
  contactId: string
  contactName: string
  onSendMessage: (message: Omit<Message, 'id' | 'timestamp' | 'status'>) => void
}

export default function EnhancedMessageInterface({
  contactId,
  contactName,
  onSendMessage,
}: EnhancedMessageInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(SAMPLE_MESSAGES)
  const [messageInput, setMessageInput] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [showFormatting, setShowFormatting] = useState(false)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [isTyping, setIsTyping] = useState(false)

  const messageInputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Simulate typing indicator
  useEffect(() => {
    if (messageInput.length > 0) {
      setIsTyping(true)
      const timeout = setTimeout(() => setIsTyping(false), 1000)
      return () => clearTimeout(timeout)
    }
  }, [messageInput])

  // Handle file selection
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return

    Array.from(files).forEach(file => {
      const attachment: Attachment = {
        id: `att-${Date.now()}-${Math.random()}`,
        file,
        type: file.type.startsWith('image/')
          ? 'image'
          : file.type.startsWith('video/')
            ? 'video'
            : file.type.startsWith('audio/')
              ? 'audio'
              : 'document',
        uploadProgress: 0,
      }

      // Generate preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = e => {
          setAttachments(prev =>
            prev.map(att =>
              att.id === attachment.id ? { ...att, preview: e.target?.result as string } : att
            )
          )
        }
        reader.readAsDataURL(file)
      }

      setAttachments(prev => [...prev, attachment])

      // Simulate upload progress
      let progress = 0
      const interval = setInterval(() => {
        progress += Math.random() * 30
        if (progress >= 100) {
          progress = 100
          clearInterval(interval)
        }
        setAttachments(prev =>
          prev.map(att => (att.id === attachment.id ? { ...att, uploadProgress: progress } : att))
        )
      }, 200)
    })
  }, [])

  // Start voice recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      const chunks: Blob[] = []
      mediaRecorder.ondataavailable = e => chunks.push(e.data)
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' })
        const file = new File([audioBlob], 'voice-message.wav', { type: 'audio/wav' })
        handleFileSelect([file] as any)
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } catch (error) {
      console.error('Error starting recording:', error)
      alert('Unable to access microphone. Please check permissions.')
    }
  }, [handleFileSelect])

  // Stop voice recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      setIsRecording(false)
      setRecordingTime(0)
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
      }
    }
  }, [isRecording])

  // Format time for recording
  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Insert emoji
  const insertEmoji = useCallback(
    (emoji: string) => {
      if (messageInputRef.current) {
        const start = messageInputRef.current.selectionStart || 0
        const end = messageInputRef.current.selectionEnd || 0
        const newValue = messageInput.slice(0, start) + emoji + messageInput.slice(end)
        setMessageInput(newValue)

        // Set cursor position after emoji
        setTimeout(() => {
          if (messageInputRef.current) {
            messageInputRef.current.selectionStart = start + emoji.length
            messageInputRef.current.selectionEnd = start + emoji.length
            messageInputRef.current.focus()
          }
        }, 0)
      }
      setShowEmojiPicker(false)
    },
    [messageInput]
  )

  // Apply text formatting
  const applyFormatting = useCallback(
    (format: string) => {
      if (!messageInputRef.current) return

      const start = messageInputRef.current.selectionStart || 0
      const end = messageInputRef.current.selectionEnd || 0
      const selectedText = messageInput.slice(start, end)

      let formattedText = selectedText
      switch (format) {
        case 'bold':
          formattedText = `*${selectedText}*`
          break
        case 'italic':
          formattedText = `_${selectedText}_`
          break
        case 'code':
          formattedText = `\`${selectedText}\``
          break
        case 'strikethrough':
          formattedText = `~${selectedText}~`
          break
      }

      const newValue = messageInput.slice(0, start) + formattedText + messageInput.slice(end)
      setMessageInput(newValue)

      setTimeout(() => {
        if (messageInputRef.current) {
          messageInputRef.current.selectionStart = start + formattedText.length
          messageInputRef.current.selectionEnd = start + formattedText.length
          messageInputRef.current.focus()
        }
      }, 0)
    },
    [messageInput]
  )

  // Use template
  const useTemplate = useCallback((template: Template) => {
    setMessageInput(template.content)
    setSelectedTemplate(template)
    setShowTemplates(false)
    messageInputRef.current?.focus()
  }, [])

  // Send message
  const sendMessage = useCallback(() => {
    if (!messageInput.trim() && attachments.length === 0) return

    const newMessage: Omit<Message, 'id' | 'timestamp' | 'status'> = {
      content: messageInput.trim(),
      type: attachments.length > 0 ? attachments[0].type : 'text',
      sender: 'user',
      replyTo: replyingTo?.id,
    }

    onSendMessage(newMessage)
    setMessages(prev => [
      ...prev,
      {
        ...newMessage,
        id: `msg-${Date.now()}`,
        timestamp: new Date(),
        status: 'sending',
      },
    ])

    setMessageInput('')
    setAttachments([])
    setReplyingTo(null)
    setSelectedTemplate(null)
    messageInputRef.current?.focus()
  }, [messageInput, attachments, replyingTo, onSendMessage])

  // Handle key press
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (e.shiftKey) {
          // Allow new line on Shift+Enter
          return
        } else {
          e.preventDefault()
          sendMessage()
        }
      }
    },
    [sendMessage]
  )

  // Remove attachment
  const removeAttachment = useCallback((attachmentId: string) => {
    setAttachments(prev => prev.filter(att => att.id !== attachmentId))
  }, [])

  // Message status icon
  const getStatusIcon = (status: Message['status']) => {
    switch (status) {
      case 'sending':
        return <ClockIcon className='h-3 w-3 text-gray-400' />
      case 'sent':
        return <CheckIcon className='h-3 w-3 text-gray-400' />
      case 'delivered':
        return <CheckIconSolid className='h-3 w-3 text-gray-600' />
      case 'read':
        return <CheckIconSolid className='h-3 w-3 text-blue-600' />
      case 'failed':
        return <ExclamationTriangleIconSolid className='h-3 w-3 text-red-500' />
      default:
        return null
    }
  }

  return (
    <div className='flex h-full flex-col bg-white'>
      {/* Messages Area */}
      <div className='flex-1 space-y-4 overflow-y-auto p-4'>
        {messages.map(message => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs rounded-lg px-4 py-2 lg:max-w-md ${
                message.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
              }`}
            >
              {/* Reply indicator */}
              {message.replyTo && (
                <div className='bg-opacity-10 mb-1 rounded bg-black p-2 text-xs opacity-75'>
                  Replying to message
                </div>
              )}

              {/* Message content */}
              <div className='text-sm whitespace-pre-wrap'>{message.content}</div>

              {/* Message metadata */}
              <div
                className={`mt-1 flex items-center justify-between text-xs ${
                  message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}
              >
                <span>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                {message.sender === 'user' && (
                  <div className='ml-2'>{getStatusIcon(message.status)}</div>
                )}
              </div>

              {/* Reactions */}
              {message.reactions && message.reactions.length > 0 && (
                <div className='mt-2 flex flex-wrap gap-1'>
                  {message.reactions.map((reaction, index) => (
                    <span
                      key={index}
                      className='bg-opacity-10 rounded-full bg-black px-2 py-1 text-xs'
                    >
                      {reaction.emoji} {reaction.count}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className='flex justify-start'>
            <div className='rounded-lg bg-gray-100 px-4 py-2'>
              <div className='flex space-x-1'>
                <div className='h-2 w-2 animate-bounce rounded-full bg-gray-400'></div>
                <div
                  className='h-2 w-2 animate-bounce rounded-full bg-gray-400'
                  style={{ animationDelay: '0.1s' }}
                ></div>
                <div
                  className='h-2 w-2 animate-bounce rounded-full bg-gray-400'
                  style={{ animationDelay: '0.2s' }}
                ></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Reply indicator */}
      {replyingTo && (
        <div className='flex items-center justify-between border-l-4 border-blue-500 bg-blue-50 px-4 py-2'>
          <div>
            <div className='text-xs font-medium text-blue-600'>Replying to</div>
            <div className='truncate text-sm text-gray-700'>{replyingTo.content}</div>
          </div>
          <button onClick={() => setReplyingTo(null)} className='text-gray-400 hover:text-gray-600'>
            <XMarkIcon className='h-4 w-4' />
          </button>
        </div>
      )}

      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className='border-t bg-gray-50 px-4 py-2'>
          <div className='flex flex-wrap gap-2'>
            {attachments.map(attachment => (
              <div
                key={attachment.id}
                className='relative rounded-lg border border-gray-200 bg-white p-2'
              >
                {attachment.type === 'image' && attachment.preview && (
                  <img src={attachment.preview} alt='' className='h-16 w-16 rounded object-cover' />
                )}
                {attachment.type !== 'image' && (
                  <div className='flex h-16 w-16 items-center justify-center rounded bg-gray-100'>
                    {attachment.type === 'video' && (
                      <VideoCameraIcon className='h-6 w-6 text-gray-400' />
                    )}
                    {attachment.type === 'audio' && (
                      <MicrophoneIcon className='h-6 w-6 text-gray-400' />
                    )}
                    {attachment.type === 'document' && (
                      <DocumentIcon className='h-6 w-6 text-gray-400' />
                    )}
                  </div>
                )}

                {/* Upload progress */}
                {attachment.uploadProgress !== undefined && attachment.uploadProgress < 100 && (
                  <div className='bg-opacity-50 absolute inset-0 flex items-center justify-center rounded bg-black'>
                    <div className='text-xs text-white'>
                      {Math.round(attachment.uploadProgress)}%
                    </div>
                  </div>
                )}

                {/* Remove button */}
                <button
                  onClick={() => removeAttachment(attachment.id)}
                  className='absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white hover:bg-red-600'
                >
                  <XMarkIcon className='h-3 w-3' />
                </button>

                <div className='mt-1 w-16 truncate text-xs text-gray-500'>
                  {attachment.file.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message input area */}
      <div className='border-t border-gray-200 p-4'>
        {/* Formatting toolbar */}
        {showFormatting && (
          <div className='mb-3 flex items-center space-x-2 rounded-lg bg-gray-50 p-2'>
            <button
              onClick={() => applyFormatting('bold')}
              className='rounded p-1 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              title='Bold'
            >
              <BoldIcon className='h-4 w-4' />
            </button>
            <button
              onClick={() => applyFormatting('italic')}
              className='rounded p-1 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              title='Italic'
            >
              <ItalicIcon className='h-4 w-4' />
            </button>
            <button
              onClick={() => applyFormatting('code')}
              className='rounded p-1 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              title='Code'
            >
              <CodeBracketIcon className='h-4 w-4' />
            </button>
            <button
              onClick={() => applyFormatting('strikethrough')}
              className='rounded p-1 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              title='Strikethrough'
            >
              <UnderlineIcon className='h-4 w-4' />
            </button>
          </div>
        )}

        <div className='flex items-end space-x-2'>
          {/* Attachment button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className='rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900'
            title='Attach file'
          >
            <PaperClipIcon className='h-5 w-5' />
          </button>

          {/* Message input */}
          <div className='relative flex-1'>
            <textarea
              ref={messageInputRef}
              value={messageInput}
              onChange={e => setMessageInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={`Message ${contactName}...`}
              className='w-full resize-none rounded-lg border border-gray-300 px-4 py-3 pr-12 focus:border-transparent focus:ring-2 focus:ring-blue-500 focus:outline-none'
              rows={1}
              style={{
                minHeight: '44px',
                maxHeight: '120px',
                resize: 'none',
              }}
              onInput={e => {
                const target = e.target as HTMLTextAreaElement
                target.style.height = 'auto'
                target.style.height = `${Math.min(target.scrollHeight, 120)}px`
              }}
            />

            {/* Input actions */}
            <div className='absolute right-3 bottom-3 flex items-center space-x-1'>
              <button
                onClick={() => setShowFormatting(!showFormatting)}
                className={`rounded p-1 transition-colors ${
                  showFormatting ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                }`}
                title='Text formatting'
              >
                <BoldIcon className='h-4 w-4' />
              </button>

              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className='rounded p-1 text-gray-400 transition-colors hover:text-gray-600'
                title='Add emoji'
              >
                <FaceSmileIcon className='h-4 w-4' />
              </button>

              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className='rounded p-1 text-gray-400 transition-colors hover:text-gray-600'
                title='Use template'
              >
                <AtSymbolIcon className='h-4 w-4' />
              </button>
            </div>
          </div>

          {/* Voice recording / Send button */}
          {messageInput.trim() || attachments.length > 0 ? (
            <button
              onClick={sendMessage}
              className='rounded-lg bg-blue-600 p-2 text-white transition-colors hover:bg-blue-700'
              title='Send message'
            >
              <PaperAirplaneIcon className='h-5 w-5' />
            </button>
          ) : (
            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onMouseLeave={stopRecording}
              className={`rounded-lg p-2 transition-colors ${
                isRecording
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={isRecording ? 'Release to send' : 'Hold to record'}
            >
              {isRecording ? (
                <div className='flex items-center space-x-1'>
                  <div className='h-2 w-2 animate-pulse rounded-full bg-white'></div>
                  <span className='text-xs'>{formatRecordingTime(recordingTime)}</span>
                </div>
              ) : (
                <MicrophoneIcon className='h-5 w-5' />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className='absolute right-4 bottom-20 z-50 w-80 rounded-lg border border-gray-200 bg-white p-4 shadow-lg'>
          <div className='mb-3 flex space-x-2'>
            {Object.keys(EMOJI_CATEGORIES).map(category => (
              <button
                key={category}
                className='rounded bg-gray-100 px-2 py-1 text-xs capitalize hover:bg-gray-200'
              >
                {category}
              </button>
            ))}
          </div>
          <div className='grid max-h-48 grid-cols-8 gap-1 overflow-y-auto'>
            {EMOJI_CATEGORIES.recent
              .concat(
                EMOJI_CATEGORIES.people,
                EMOJI_CATEGORIES.nature,
                EMOJI_CATEGORIES.objects,
                EMOJI_CATEGORIES.symbols
              )
              .map((emoji, index) => (
                <button
                  key={index}
                  onClick={() => insertEmoji(emoji)}
                  className='rounded p-2 text-lg hover:bg-gray-100'
                >
                  {emoji}
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Templates Panel */}
      {showTemplates && (
        <div className='absolute bottom-20 left-4 z-50 w-96 rounded-lg border border-gray-200 bg-white p-4 shadow-lg'>
          <h3 className='mb-3 font-medium text-gray-900'>Message Templates</h3>
          <div className='max-h-64 space-y-2 overflow-y-auto'>
            {SAMPLE_TEMPLATES.map(template => (
              <button
                key={template.id}
                onClick={() => useTemplate(template)}
                className='w-full rounded-lg border border-gray-200 p-3 text-left transition-colors hover:border-blue-500 hover:bg-blue-50'
              >
                <div className='text-sm font-medium text-gray-900'>{template.name}</div>
                <div className='mt-1 line-clamp-2 text-xs text-gray-600'>{template.content}</div>
                <div className='mt-2 flex items-center'>
                  <span className='rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600'>
                    {template.category}
                  </span>
                  {template.variables.length > 0 && (
                    <span className='ml-2 text-xs text-gray-500'>
                      {template.variables.length} variables
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type='file'
        multiple
        accept='image/*,video/*,audio/*,.pdf,.doc,.docx,.txt'
        onChange={e => handleFileSelect(e.target.files)}
        className='hidden'
      />
    </div>
  )
}
