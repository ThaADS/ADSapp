'use client'

import { useState, useEffect, useRef } from 'react'
import { Download, Play, Pause, FileText, MapPin, Clock, Check, CheckCheck, Image as ImageIcon, Video, Mic } from 'lucide-react'
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
        <div className="max-w-sm">
          {message.media?.url ? (
            <div className="relative group">
              <img
                src={message.media.thumbnailUrl || message.media.url}
                alt="Shared image"
                className="rounded-lg max-h-64 w-auto cursor-pointer"
                onClick={() => window.open(message.media.url, '_blank')}
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all duration-200 flex items-center justify-center">
                <button
                  onClick={handleDownload}
                  disabled={loading}
                  className="opacity-0 group-hover:opacity-100 bg-white bg-opacity-90 text-gray-800 p-2 rounded-full transition-opacity duration-200"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-3 p-3 bg-gray-100 rounded-lg">
              <ImageIcon className="w-8 h-8 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">Image</p>
                <p className="text-xs text-gray-500">Unable to load image</p>
              </div>
            </div>
          )}
          {message.content && (
            <p className="mt-2 text-sm text-gray-700">{message.content}</p>
          )}
        </div>
      )

    case 'video':
      return (
        <div className="max-w-sm">
          {message.media?.url ? (
            <div className="relative group">
              <video
                ref={videoRef}
                src={message.media.url}
                className="rounded-lg max-h-64 w-auto"
                controls
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
              />
              <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-1 rounded">
                <Video className="w-4 h-4" />
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-3 p-3 bg-gray-100 rounded-lg">
              <Video className="w-8 h-8 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">Video</p>
                <p className="text-xs text-gray-500">Unable to load video</p>
              </div>
            </div>
          )}
          {message.content && (
            <p className="mt-2 text-sm text-gray-700">{message.content}</p>
          )}
        </div>
      )

    case 'audio':
      return (
        <div className="max-w-xs">
          <div className="flex items-center space-x-3 p-3 bg-gray-100 rounded-lg">
            <button
              onClick={handlePlayAudio}
              className="flex-shrink-0 w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors"
            >
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900">Voice Message</p>
                <button
                  onClick={handleDownload}
                  disabled={loading}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
              {message.media && (
                <p className="text-xs text-gray-500">{formatFileSize(message.media.fileSize)}</p>
              )}
            </div>
          </div>
          {message.media?.url && (
            <audio
              ref={audioRef}
              src={message.media.url}
              onEnded={() => setPlaying(false)}
              className="hidden"
            />
          )}
          {message.content && (
            <p className="mt-2 text-sm text-gray-700">{message.content}</p>
          )}
        </div>
      )

    case 'document':
      return (
        <div className="max-w-sm">
          <div className="flex items-center space-x-3 p-3 bg-gray-100 rounded-lg">
            <FileText className="w-8 h-8 text-gray-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {message.media?.filename || 'Document'}
              </p>
              {message.media && (
                <p className="text-xs text-gray-500">{formatFileSize(message.media.fileSize)}</p>
              )}
            </div>
            <button
              onClick={handleDownload}
              disabled={loading}
              className="flex-shrink-0 text-gray-500 hover:text-gray-700"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
          {message.content && (
            <p className="mt-2 text-sm text-gray-700">{message.content}</p>
          )}
        </div>
      )

    case 'location':
      return (
        <div className="max-w-sm">
          <div className="flex items-center space-x-3 p-3 bg-gray-100 rounded-lg">
            <MapPin className="w-8 h-8 text-red-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-900">Location</p>
              <p className="text-xs text-gray-500">Tap to view on map</p>
            </div>
          </div>
          {message.content && (
            <p className="mt-2 text-sm text-gray-700">{message.content}</p>
          )}
        </div>
      )

    default:
      return <p className="text-sm text-gray-700">{message.content}</p>
  }
}

export default function EnhancedMessageList({
  conversationId,
  messages,
  currentUserId,
  onMessageRead,
  onLoadMore,
  hasMore,
  loading
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
      return <CheckCheck className="w-4 h-4 text-blue-500" />
    } else if (message.delivered_at) {
      return <CheckCheck className="w-4 h-4 text-gray-400" />
    } else {
      return <Check className="w-4 h-4 text-gray-400" />
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
    <div className="flex flex-col h-full">
      {/* Load More Button */}
      {hasMore && (
        <div className="p-4 text-center border-b border-gray-200">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load older messages'}
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messageGroups.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p className="text-lg font-medium mb-2">No messages yet</p>
            <p className="text-sm">Start the conversation by sending a message</p>
          </div>
        ) : (
          messageGroups.map((group, groupIndex) => (
            <div key={groupIndex}>
              {/* Date Header */}
              <div className="text-center mb-4">
                <span className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
                  {formatDateHeader(group.date)}
                </span>
              </div>

              {/* Messages in this date group */}
              <div className="space-y-2">
                {group.messages.map((message, messageIndex) => {
                  const isFromCurrentUser = message.sender_type === 'agent' && message.sender_id === currentUserId
                  const isSystem = message.sender_type === 'system'

                  if (isSystem) {
                    return (
                      <div key={message.id} className="text-center">
                        <span className="bg-yellow-100 text-yellow-800 text-xs px-3 py-1 rounded-full">
                          {message.content}
                        </span>
                      </div>
                    )
                  }

                  return (
                    <div
                      key={message.id}
                      className={`flex ${isFromCurrentUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[70%] ${isFromCurrentUser ? 'order-2' : 'order-1'}`}>
                        {/* Sender Avatar (for agent messages from others) */}
                        {!isFromCurrentUser && message.sender_type === 'agent' && (
                          <div className="flex items-center space-x-2 mb-1">
                            {message.sender?.avatar_url ? (
                              <img
                                src={message.sender.avatar_url}
                                alt={message.sender.full_name}
                                className="w-6 h-6 rounded-full"
                              />
                            ) : (
                              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                                <span className="text-xs font-medium text-white">
                                  {message.sender?.full_name?.charAt(0) || 'A'}
                                </span>
                              </div>
                            )}
                            <span className="text-xs text-gray-500">
                              {message.sender?.full_name || 'Agent'}
                            </span>
                          </div>
                        )}

                        {/* Message Bubble */}
                        <div
                          className={`rounded-lg px-3 py-2 ${
                            isFromCurrentUser
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <MediaMessage
                            message={message}
                            onDownload={handleMediaDownload}
                          />
                        </div>

                        {/* Message Status and Time */}
                        <div
                          className={`flex items-center mt-1 space-x-1 ${
                            isFromCurrentUser ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <span className="text-xs text-gray-500">
                            {formatTime(message.created_at)}
                          </span>
                          {isFromCurrentUser && getDeliveryStatus(message)}
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