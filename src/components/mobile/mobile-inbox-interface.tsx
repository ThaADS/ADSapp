'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  EllipsisVerticalIcon,
  PlusIcon,
  ArrowLeftIcon,
  PaperAirplaneIcon,
  MicrophoneIcon,
  PaperClipIcon,
  PhoneIcon,
  VideoCameraIcon,
  InformationCircleIcon,
  FaceSmileIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Bars3BottomLeftIcon,
  XMarkIcon,
  UserPlusIcon
} from '@heroicons/react/24/outline';
import {
  CheckIcon,
  ExclamationTriangleIcon as ExclamationTriangleIconSolid
} from '@heroicons/react/24/solid';

interface Conversation {
  id: string;
  contact: {
    id: string;
    name: string;
    avatar?: string;
    phone: string;
    status: 'online' | 'offline' | 'away';
  };
  lastMessage: {
    content: string;
    timestamp: Date;
    sender: 'user' | 'contact';
    type: 'text' | 'image' | 'audio' | 'video' | 'document';
  };
  unreadCount: number;
  isPinned: boolean;
  tags: string[];
  assignedTo?: string;
}

interface Message {
  id: string;
  content: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'document';
  sender: 'user' | 'contact';
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

// Sample data
const SAMPLE_CONVERSATIONS: Conversation[] = [
  {
    id: '1',
    contact: {
      id: 'c1',
      name: 'Sarah Johnson',
      phone: '+1 234 567 8900',
      status: 'online'
    },
    lastMessage: {
      content: 'Could you send me the pricing details?',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      sender: 'contact',
      type: 'text'
    },
    unreadCount: 2,
    isPinned: false,
    tags: ['sales', 'priority'],
    assignedTo: 'You'
  },
  {
    id: '2',
    contact: {
      id: 'c2',
      name: 'Michael Chen',
      phone: '+1 234 567 8901',
      status: 'away'
    },
    lastMessage: {
      content: 'Thanks for the quick response!',
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
      sender: 'contact',
      type: 'text'
    },
    unreadCount: 0,
    isPinned: true,
    tags: ['support'],
    assignedTo: 'Alice'
  },
  {
    id: '3',
    contact: {
      id: 'c3',
      name: 'Emma Wilson',
      phone: '+1 234 567 8902',
      status: 'offline'
    },
    lastMessage: {
      content: 'Product demo scheduled for tomorrow',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      sender: 'user',
      type: 'text'
    },
    unreadCount: 0,
    isPinned: false,
    tags: ['demo'],
    assignedTo: 'Bob'
  }
];

const SAMPLE_MESSAGES: Message[] = [
  {
    id: '1',
    content: 'Hi! I\'m interested in your products.',
    type: 'text',
    sender: 'contact',
    timestamp: new Date(Date.now() - 3600000),
    status: 'read'
  },
  {
    id: '2',
    content: 'Hello! Thanks for reaching out. I\'d be happy to help you with information about our products.',
    type: 'text',
    sender: 'user',
    timestamp: new Date(Date.now() - 3300000),
    status: 'read'
  },
  {
    id: '3',
    content: 'Could you send me the pricing details?',
    type: 'text',
    sender: 'contact',
    timestamp: new Date(Date.now() - 300000),
    status: 'delivered'
  }
];

interface MobileInboxInterfaceProps {
  organizationId: string;
}

export default function MobileInboxInterface({ organizationId }: MobileInboxInterfaceProps) {
  const [conversations, setConversations] = useState<Conversation[]>(SAMPLE_CONVERSATIONS);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>(SAMPLE_MESSAGES);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);

  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [viewportHeight, setViewportHeight] = useState(0);

  // Handle viewport height changes (for mobile keyboards)
  useEffect(() => {
    const updateViewportHeight = () => {
      setViewportHeight(window.innerHeight);
    };

    updateViewportHeight();
    window.addEventListener('resize', updateViewportHeight);
    return () => window.removeEventListener('resize', updateViewportHeight);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Filter conversations based on search
  const filteredConversations = conversations.filter(conv =>
    conv.contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.lastMessage.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Send message
  const sendMessage = useCallback(() => {
    if (!messageInput.trim() || !selectedConversation) return;

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      content: messageInput.trim(),
      type: 'text',
      sender: 'user',
      timestamp: new Date(),
      status: 'sending'
    };

    setMessages(prev => [...prev, newMessage]);
    setMessageInput('');

    // Update conversation last message
    setConversations(prev => prev.map(conv =>
      conv.id === selectedConversation.id
        ? {
          ...conv,
          lastMessage: {
            content: newMessage.content,
            timestamp: newMessage.timestamp,
            sender: newMessage.sender,
            type: newMessage.type
          }
        }
        : conv
    ));

    // Simulate message status updates
    setTimeout(() => {
      setMessages(prev => prev.map(msg =>
        msg.id === newMessage.id ? { ...msg, status: 'sent' } : msg
      ));
    }, 1000);

    setTimeout(() => {
      setMessages(prev => prev.map(msg =>
        msg.id === newMessage.id ? { ...msg, status: 'delivered' } : msg
      ));
    }, 2000);
  }, [messageInput, selectedConversation]);

  // Handle conversation selection
  const selectConversation = useCallback((conversation: Conversation) => {
    setSelectedConversation(conversation);
    setShowContactInfo(false);

    // Mark as read
    setConversations(prev => prev.map(conv =>
      conv.id === conversation.id ? { ...conv, unreadCount: 0 } : conv
    ));
  }, []);

  // Get status indicator color
  const getStatusColor = (status: 'online' | 'offline' | 'away') => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  // Get message status icon
  const getStatusIcon = (status: Message['status']) => {
    switch (status) {
      case 'sending':
        return <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />;
      case 'sent':
        return <CheckIcon className="w-3 h-3 text-gray-400" />;
      case 'delivered':
        return <div className="flex"><CheckIcon className="w-3 h-3 text-gray-600" /><CheckIcon className="w-3 h-3 text-gray-600 -ml-1" /></div>;
      case 'read':
        return <div className="flex"><CheckIcon className="w-3 h-3 text-blue-600" /><CheckIcon className="w-3 h-3 text-blue-600 -ml-1" /></div>;
      case 'failed':
        return <ExclamationTriangleIconSolid className="w-3 h-3 text-red-500" />;
      default:
        return null;
    }
  };

  // Format time for mobile display
  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  // Render conversation list
  const renderConversationList = () => (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Inbox</h1>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              <MagnifyingGlassIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowNewChatModal(true)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              <PlusIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div className="mt-3">
            <div className="relative">
              <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <ChatBubbleLeftRightIcon className="w-12 h-12 mb-4" />
            <h3 className="text-lg font-medium mb-2">No conversations</h3>
            <p className="text-center">Start a new conversation to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                onClick={() => selectConversation(conversation)}
                className="w-full p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
              >
                <div className="flex items-center space-x-3">
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                      {conversation.contact.avatar ? (
                        <img
                          src={conversation.contact.avatar}
                          alt=""
                          className="w-12 h-12 rounded-full"
                        />
                      ) : (
                        <span className="text-sm font-medium text-gray-600">
                          {conversation.contact.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      )}
                    </div>
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(conversation.contact.status)}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {conversation.contact.name}
                      </h3>
                      <div className="flex items-center space-x-1">
                        <span className="text-xs text-gray-500">
                          {formatTime(conversation.lastMessage.timestamp)}
                        </span>
                        {conversation.unreadCount > 0 && (
                          <div className="min-w-[20px] h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center px-1">
                            {conversation.unreadCount}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-1">
                      <p className="text-sm text-gray-600 truncate">
                        {conversation.lastMessage.sender === 'user' && '✓ '}
                        {conversation.lastMessage.content}
                      </p>
                    </div>

                    {/* Tags */}
                    {conversation.tags.length > 0 && (
                      <div className="flex items-center space-x-1 mt-2">
                        {conversation.tags.slice(0, 2).map(tag => (
                          <span
                            key={tag}
                            className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                        {conversation.tags.length > 2 && (
                          <span className="text-xs text-gray-500">+{conversation.tags.length - 2}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Render chat interface
  const renderChatInterface = () => (
    <div className="flex flex-col h-full bg-white">
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setSelectedConversation(null)}
              className="p-1 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  {selectedConversation?.contact.avatar ? (
                    <img
                      src={selectedConversation.contact.avatar}
                      alt=""
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <span className="text-xs font-medium text-gray-600">
                      {selectedConversation?.contact.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  )}
                </div>
                <div className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-white ${getStatusColor(selectedConversation?.contact.status || 'offline')}`} />
              </div>

              <div>
                <h2 className="text-sm font-medium text-gray-900">
                  {selectedConversation?.contact.name}
                </h2>
                <p className="text-xs text-gray-500">
                  {selectedConversation?.contact.status}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
              <PhoneIcon className="w-4 h-4" />
            </button>
            <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
              <VideoCameraIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowContactInfo(!showContactInfo)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              <InformationCircleIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs px-4 py-2 rounded-2xl ${
                message.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-br-md'
                  : 'bg-gray-100 text-gray-900 rounded-bl-md'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <div className={`flex items-center justify-between mt-1 text-xs ${
                message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
              }`}>
                <span>{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                {message.sender === 'user' && (
                  <div className="ml-2">{getStatusIcon(message.status)}</div>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex items-end space-x-2">
          <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
            <PaperClipIcon className="w-5 h-5" />
          </button>

          <div className="flex-1 relative">
            <textarea
              ref={messageInputRef}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Type a message..."
              className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-full resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={1}
              style={{ maxHeight: '100px' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${Math.min(target.scrollHeight, 100)}px`;
              }}
            />

            <button className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600">
              <FaceSmileIcon className="w-4 h-4" />
            </button>
          </div>

          {messageInput.trim() ? (
            <button
              onClick={sendMessage}
              className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700"
            >
              <PaperAirplaneIcon className="w-5 h-5" />
            </button>
          ) : (
            <button
              className={`p-2 rounded-full ${
                isRecording ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
              onTouchStart={() => setIsRecording(true)}
              onTouchEnd={() => setIsRecording(false)}
            >
              <MicrophoneIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Contact Info Sidebar (Mobile) */}
      {showContactInfo && (
        <div className="fixed inset-y-0 right-0 w-80 bg-white border-l border-gray-200 z-20 transform transition-transform">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Contact Info</h3>
              <button
                onClick={() => setShowContactInfo(false)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-gray-300 rounded-full mx-auto mb-3 flex items-center justify-center">
                <span className="text-lg font-medium text-gray-600">
                  {selectedConversation?.contact.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <h4 className="text-lg font-medium">{selectedConversation?.contact.name}</h4>
              <p className="text-gray-600">{selectedConversation?.contact.phone}</p>
            </div>

            <div className="space-y-4">
              <div>
                <h5 className="font-medium text-gray-900 mb-2">Tags</h5>
                <div className="flex flex-wrap gap-2">
                  {selectedConversation?.tags.map(tag => (
                    <span
                      key={tag}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h5 className="font-medium text-gray-900 mb-2">Assigned To</h5>
                <p className="text-gray-600">{selectedConversation?.assignedTo || 'Unassigned'}</p>
              </div>

              <div>
                <h5 className="font-medium text-gray-900 mb-2">Status</h5>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(selectedConversation?.contact.status || 'offline')}`} />
                  <span className="text-gray-600 capitalize">{selectedConversation?.contact.status}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full" style={{ height: viewportHeight || '100vh' }}>
      {selectedConversation ? renderChatInterface() : renderConversationList()}

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-medium">New Chat</h2>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4">
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Enter phone number..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <UserPlusIcon className="w-4 h-4 mr-2" />
                  Start Chat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}