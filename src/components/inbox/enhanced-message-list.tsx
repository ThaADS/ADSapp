'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Download,
  Play,
  Pause,
  FileText,
  MapPin,
  Clock,
  Check,
  CheckCheck,
  Image as ImageIcon,
  Video,
  Mic,
} from 'lucide-react'
import { WhatsAppMediaHandler } from '@/lib/whatsapp/media-handler'

interface Message {
  id: string
  conversation_id: string
  whatsapp_message_id?: string
  sender_type: 'contact' | 'agent' | 'system'
  sender_id?: string
  sender?: {
    id: string
    full_name: string
    avatar_url?: string
  }
  content: string
  message_type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'location' | 'system'
  media_url?: string
  media_mime_type?: string
  is_read: boolean
  delivered_at?: string
  read_at?: string
  created_at: string
  media?: {
    id: string
    filename: string
    fileSize: number
    url: string
    thumbnailUrl?: string
    mimeType: string
  }
}

interface MessageListProps {
  conversationId: string
  messages: Message[]
  currentUserId: string
  onMessageRead?: (messageId: string) => void
  onLoadMore?: () => void
  hasMore?: boolean
  loading?: boolean
  // Customizable bubble colors
  agentBubbleColor?: string
  contactBubbleColor?: string
  agentTextColor?: string
  contactTextColor?: string
}

interface MediaMessageProps {
  message: Message
  onDownload?: (mediaId: string) => void
}

function MediaMessage({ message, onDownload }: MediaMessageProps) {
  const [playing, setPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handlePlayAudio = () => {
    if (!audioRef.current) return

    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      audioRef.current.play()
      setPlaying(true)
    }
  }

  const handlePlayVideo = () => {
    if (!videoRef.current) return

    if (playing) {
      videoRef.current.pause()
      setPlaying(false)
    } else {
      videoRef.current.play()
      setPlaying(true)
    }
  }

  const handleDownload = async () => {
    if (!message.media || !onDownload) return

    setLoading(true)
    try {
      await onDownload(message.media.id)
    } catch (error) {
      console.error('Download failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  switch (message.message_type) {
    case 'image':
      return (
        <div className='max-w-sm'>
          {message.media?.url ? (
            <div className='group relative'>
              <img
                src={message.media.thumbnailUrl || message.media.url}
                alt='Shared image'
                className='max-h-64 w-auto cursor-pointer rounded-md'
                onClick={() => window.open(message.media.url, '_blank')}
              />
              <div className='bg-opacity-0 group-hover:bg-opacity-20 absolute inset-0 flex items-center justify-center rounded-md bg-black transition-all duration-200'>
                <button
                  onClick={handleDownload}
                  disabled={loading}
                  className='bg-opacity-90 rounded-full bg-white p-2 text-gray-800 opacity-0 transition-opacity duration-200 group-hover:opacity-100'
                >
                  <Download className='h-4 w-4' />
                </button>
              </div>
            </div>
          ) : (
            <div className='flex items-center space-x-3 rounded-md bg-black/5 p-3'>
              <ImageIcon className='h-8 w-8 text-gray-400' />
              <div>
                <p className='text-sm font-medium'>Image</p>
                <p className='text-xs opacity-60'>Unable to load image</p>
              </div>
            </div>
          )}
          {message.content && <p className='mt-2 text-sm'>{message.content}</p>}
        </div>
      )

    case 'video':
      return (
        <div className='max-w-sm'>
          {message.media?.url ? (
            <div className='group relative'>
              <video
                ref={videoRef}
                src={message.media.url}
                className='max-h-64 w-auto rounded-lg'
                controls
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
              />
              <div className='bg-opacity-50 absolute top-2 right-2 rounded bg-black p-1 text-white'>
                <Video className='h-4 w-4' />
              </div>
            </div>
          ) : (
            <div className='flex items-center space-x-3 rounded-lg bg-gray-100 p-3'>
              <Video className='h-8 w-8 text-gray-400' />
              <div>
                <p className='text-sm font-medium text-gray-900'>Video</p>
                <p className='text-xs text-gray-500'>Unable to load video</p>
              </div>
            </div>
          )}
          {message.content && <p className='mt-2 text-sm text-gray-700'>{message.content}</p>}
        </div>
      )

    case 'audio':
      return (
        <div className='max-w-xs'>
          <div className='flex items-center space-x-3 rounded-lg bg-gray-100 p-3'>
            <button
              onClick={handlePlayAudio}
              className='flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-500 text-white transition-colors hover:bg-blue-600'
            >
              {playing ? <Pause className='h-4 w-4' /> : <Play className='h-4 w-4' />}
            </button>
            <div className='flex-1'>
              <div className='flex items-center justify-between'>
                <p className='text-sm font-medium text-gray-900'>Voice Message</p>
                <button
                  onClick={handleDownload}
                  disabled={loading}
                  className='text-gray-500 hover:text-gray-700'
                >
                  <Download className='h-4 w-4' />
                </button>
              </div>
              {message.media && (
                <p className='text-xs text-gray-500'>{formatFileSize(message.media.fileSize)}</p>
              )}
            </div>
          </div>
          {message.media?.url && (
            <audio
              ref={audioRef}
              src={message.media.url}
              onEnded={() => setPlaying(false)}
              className='hidden'
            />
          )}
          {message.content && <p className='mt-2 text-sm text-gray-700'>{message.content}</p>}
        </div>
      )

    case 'document':
      return (
        <div className='max-w-sm'>
          <div className='flex items-center space-x-3 rounded-lg bg-gray-100 p-3'>
            <FileText className='h-8 w-8 flex-shrink-0 text-gray-400' />
            <div className='min-w-0 flex-1'>
              <p className='truncate text-sm font-medium text-gray-900'>
                {message.media?.filename || 'Document'}
              </p>
              {message.media && (
                <p className='text-xs text-gray-500'>{formatFileSize(message.media.fileSize)}</p>
              )}
            </div>
            <button
              onClick={handleDownload}
              disabled={loading}
              className='flex-shrink-0 text-gray-500 hover:text-gray-700'
            >
              <Download className='h-4 w-4' />
            </button>
          </div>
          {message.content && <p className='mt-2 text-sm text-gray-700'>{message.content}</p>}
        </div>
      )

    case 'location':
      return (
        <div className='max-w-sm'>
          <div className='flex items-center space-x-3 rounded-lg bg-gray-100 p-3'>
            <MapPin className='h-8 w-8 flex-shrink-0 text-red-500' />
            <div>
              <p className='text-sm font-medium text-gray-900'>Location</p>
              <p className='text-xs text-gray-500'>Tap to view on map</p>
            </div>
          </div>
          {message.content && <p className='mt-2 text-sm text-gray-700'>{message.content}</p>}
        </div>
      )

    default:
      return <p className='text-sm leading-relaxed whitespace-pre-wrap break-words'>{message.content}</p>
  }
}

export default function EnhancedMessageList({
  conversationId,
  messages,
  currentUserId,
  onMessageRead,
  onLoadMore,
  hasMore,
  loading,
  agentBubbleColor = 'bg-emerald-500',
  contactBubbleColor = 'bg-white',
  agentTextColor = 'text-white',
  contactTextColor = 'text-gray-900',
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const mediaHandler = new WhatsAppMediaHandler('', '') // Would be initialized with proper tokens

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Mark unread messages as read when they come into view
    markVisibleMessagesAsRead()
  }, [messages, onMessageRead])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const markVisibleMessagesAsRead = () => {
    const unreadMessages = messages.filter(
      message => !message.is_read && message.sender_type === 'contact'
    )

    unreadMessages.forEach(message => {
      if (onMessageRead) {
        onMessageRead(message.id)
      }
    })
  }

  const handleMediaDownload = async (mediaId: string) => {
    try {
      // Create download link
      const message = messages.find(m => m.media?.id === mediaId)
      if (message?.media?.url) {
        const link = document.createElement('a')
        link.href = message.media.url
        link.download = message.media.filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } catch (error) {
      console.error('Download failed:', error)
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const getDeliveryStatus = (message: Message) => {
    if (message.sender_type !== 'agent') return null

    if (message.read_at) {
      return <CheckCheck className='h-4 w-4 text-blue-500' />
    } else if (message.delivered_at) {
      return <CheckCheck className='h-4 w-4 text-gray-400' />
    } else {
      return <Check className='h-4 w-4 text-gray-400' />
    }
  }

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { date: string; messages: Message[] }[] = []
    let currentDate = ''
    let currentGroup: Message[] = []

    messages.forEach(message => {
      const messageDate = new Date(message.created_at).toDateString()

      if (messageDate !== currentDate) {
        if (currentGroup.length > 0) {
          groups.push({ date: currentDate, messages: currentGroup })
        }
        currentDate = messageDate
        currentGroup = [message]
      } else {
        currentGroup.push(message)
      }
    })

    if (currentGroup.length > 0) {
      groups.push({ date: currentDate, messages: currentGroup })
    }

    return groups
  }

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString()
    }
  }

  const messageGroups = groupMessagesByDate(messages)

  return (
    <div className='flex h-full flex-col'>
      {/* Load More Button */}
      {hasMore && (
        <div className='border-b border-gray-200 p-4 text-center'>
          <button
            onClick={onLoadMore}
            disabled={loading}
            className='px-4 py-2 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50'
          >
            {loading ? 'Loading...' : 'Load older messages'}
          </button>
        </div>
      )}

      {/* Messages */}
      <div
        className='flex-1 space-y-4 overflow-y-auto p-4'
        style={{
          background: 'linear-gradient(to bottom, #f9fafb 0%, #f3f4f6 100%)',
          backgroundImage: `
            linear-gradient(to bottom, #f9fafb 0%, #f3f4f6 100%),
            url("data:image/svg+xml,%3Csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h10v10H0zM10 10h10v10H10z' fill='%23f0f0f0' opacity='0.3'/%3E%3C/svg%3E")
          `,
          backgroundBlendMode: 'overlay'
        }}
      >
        {messageGroups.length === 0 ? (
          <div className='py-8 text-center text-gray-500'>
            <p className='mb-2 text-lg font-medium'>No messages yet</p>
            <p className='text-sm'>Start the conversation by sending a message</p>
          </div>
        ) : (
          messageGroups.map((group, groupIndex) => (
            <div key={groupIndex}>
              {/* Date Header */}
              <div className='mb-4 text-center'>
                <span className='rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600'>
                  {formatDateHeader(group.date)}
                </span>
              </div>

              {/* Messages in this date group */}
              <div className='space-y-1'>
                {group.messages.map((message, messageIndex) => {
                  // Simplified alignment logic: agent messages RIGHT, contact messages LEFT
                  const isFromAgent = message.sender_type === 'agent'
                  const isSystem = message.sender_type === 'system'
                  const isContact = message.sender_type === 'contact'

                  if (isSystem) {
                    return (
                      <div key={message.id} className='my-3 text-center'>
                        <span className='rounded-full bg-yellow-100 px-3 py-1 text-xs text-yellow-800'>
                          {message.content}
                        </span>
                      </div>
                    )
                  }

                  return (
                    <div
                      key={message.id}
                      className={`flex ${isFromAgent ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[75%] ${isFromAgent ? 'items-end' : 'items-start'} flex flex-col`}>
                        {/* Sender Name (above bubble) */}
                        {!isFromAgent && (
                          <div className='mb-1 px-3'>
                            <span className='text-xs font-medium text-gray-700'>
                              {isContact
                                ? 'Contact'
                                : message.sender?.full_name || 'Agent'}
                            </span>
                          </div>
                        )}

                        {/* Message Bubble */}
                        <div
                          className={`rounded-2xl shadow-sm ${
                            isFromAgent
                              ? `rounded-tr-sm bg-gradient-to-br from-emerald-50 to-emerald-100 ${agentTextColor}`
                              : `rounded-tl-sm border border-gray-200 ${contactBubbleColor} ${contactTextColor}`
                          }`}
                          style={{
                            padding: message.message_type === 'text' ? '12px 16px' : '8px',
                            boxShadow: isFromAgent
                              ? '0 1px 2px rgba(0, 0, 0, 0.05)'
                              : '0 1px 2px rgba(0, 0, 0, 0.06)',
                          }}
                        >
                          <MediaMessage message={message} onDownload={handleMediaDownload} />
                        </div>

                        {/* Message Status and Time */}
                        <div
                          className={`mt-1 flex items-center space-x-1 px-1 ${
                            isFromAgent ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <span className='text-xs text-gray-500'>
                            {formatTime(message.created_at)}
                          </span>
                          {isFromAgent && getDeliveryStatus(message)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}
