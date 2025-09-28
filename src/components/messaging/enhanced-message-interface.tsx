'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
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
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import {
  CheckIcon as CheckIconSolid,
  ExclamationTriangleIcon as ExclamationTriangleIconSolid
} from '@heroicons/react/24/solid';

// Message types
interface Message {
  id: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location';
  sender: 'user' | 'contact';
  timestamp: Date;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  metadata?: {
    fileName?: string;
    fileSize?: number;
    duration?: number;
    mimeType?: string;
    thumbnail?: string;
    location?: { lat: number; lng: number; address: string };
  };
  replyTo?: string;
  reactions?: { emoji: string; count: number }[];
}

interface Attachment {
  id: string;
  file: File;
  type: 'image' | 'video' | 'audio' | 'document';
  preview?: string;
  uploadProgress?: number;
}

interface Template {
  id: string;
  name: string;
  content: string;
  category: string;
  variables: string[];
}

// Sample data
const SAMPLE_MESSAGES: Message[] = [
  {
    id: '1',
    content: 'Hello! How can I help you today?',
    type: 'text',
    sender: 'user',
    timestamp: new Date(Date.now() - 3600000),
    status: 'read'
  },
  {
    id: '2',
    content: 'Hi! I\'m interested in your products. Could you send me more information?',
    type: 'text',
    sender: 'contact',
    timestamp: new Date(Date.now() - 3300000),
    status: 'read'
  },
  {
    id: '3',
    content: 'Of course! Let me share our latest catalog with you.',
    type: 'text',
    sender: 'user',
    timestamp: new Date(Date.now() - 3000000),
    status: 'read'
  }
];

const SAMPLE_TEMPLATES: Template[] = [
  {
    id: '1',
    name: 'Welcome Message',
    content: 'Hello {{name}}! Welcome to our service. How can we help you today?',
    category: 'greeting',
    variables: ['name']
  },
  {
    id: '2',
    name: 'Order Confirmation',
    content: 'Your order #{{orderNumber}} has been confirmed. Total: {{amount}}. Expected delivery: {{date}}.',
    category: 'order',
    variables: ['orderNumber', 'amount', 'date']
  },
  {
    id: '3',
    name: 'Support Response',
    content: 'Thank you for contacting support. We\'ve received your inquiry about {{topic}} and will respond within 24 hours.',
    category: 'support',
    variables: ['topic']
  }
];

const EMOJI_CATEGORIES = {
  recent: ['😀', '😂', '❤️', '👍', '🎉', '😊', '🤔', '👏'],
  people: ['😀', '😂', '🥰', '😍', '🤗', '🤔', '😎', '😴', '🤯', '😱'],
  nature: ['🌟', '🌙', '☀️', '🌈', '🔥', '💧', '🌸', '🌺', '🌻', '🍀'],
  objects: ['💼', '📱', '💻', '📝', '📊', '🎯', '🔔', '🎁', '🏆', '⚡'],
  symbols: ['❤️', '💯', '✨', '🎉', '👍', '👎', '✅', '❌', '⭐', '🔥']
};

interface EnhancedMessageInterfaceProps {
  contactId: string;
  contactName: string;
  onSendMessage: (message: Omit<Message, 'id' | 'timestamp' | 'status'>) => void;
}

export default function EnhancedMessageInterface({
  contactId,
  contactName,
  onSendMessage
}: EnhancedMessageInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(SAMPLE_MESSAGES);
  const [messageInput, setMessageInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showFormatting, setShowFormatting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Simulate typing indicator
  useEffect(() => {
    if (messageInput.length > 0) {
      setIsTyping(true);
      const timeout = setTimeout(() => setIsTyping(false), 1000);
      return () => clearTimeout(timeout);
    }
  }, [messageInput]);

  // Handle file selection
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    Array.from(files).forEach(file => {
      const attachment: Attachment = {
        id: `att-${Date.now()}-${Math.random()}`,
        file,
        type: file.type.startsWith('image/') ? 'image' :
              file.type.startsWith('video/') ? 'video' :
              file.type.startsWith('audio/') ? 'audio' : 'document',
        uploadProgress: 0
      };

      // Generate preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setAttachments(prev => prev.map(att =>
            att.id === attachment.id
              ? { ...att, preview: e.target?.result as string }
              : att
          ));
        };
        reader.readAsDataURL(file);
      }

      setAttachments(prev => [...prev, attachment]);

      // Simulate upload progress
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 30;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
        }
        setAttachments(prev => prev.map(att =>
          att.id === attachment.id
            ? { ...att, uploadProgress: progress }
            : att
        ));
      }, 200);
    });
  }, []);

  // Start voice recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' });
        const file = new File([audioBlob], 'voice-message.wav', { type: 'audio/wav' });
        handleFileSelect([file] as any);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Unable to access microphone. Please check permissions.');
    }
  }, [handleFileSelect]);

  // Stop voice recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setRecordingTime(0);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  }, [isRecording]);

  // Format time for recording
  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Insert emoji
  const insertEmoji = useCallback((emoji: string) => {
    if (messageInputRef.current) {
      const start = messageInputRef.current.selectionStart || 0;
      const end = messageInputRef.current.selectionEnd || 0;
      const newValue = messageInput.slice(0, start) + emoji + messageInput.slice(end);
      setMessageInput(newValue);

      // Set cursor position after emoji
      setTimeout(() => {
        if (messageInputRef.current) {
          messageInputRef.current.selectionStart = start + emoji.length;
          messageInputRef.current.selectionEnd = start + emoji.length;
          messageInputRef.current.focus();
        }
      }, 0);
    }
    setShowEmojiPicker(false);
  }, [messageInput]);

  // Apply text formatting
  const applyFormatting = useCallback((format: string) => {
    if (!messageInputRef.current) return;

    const start = messageInputRef.current.selectionStart || 0;
    const end = messageInputRef.current.selectionEnd || 0;
    const selectedText = messageInput.slice(start, end);

    let formattedText = selectedText;
    switch (format) {
      case 'bold':
        formattedText = `*${selectedText}*`;
        break;
      case 'italic':
        formattedText = `_${selectedText}_`;
        break;
      case 'code':
        formattedText = `\`${selectedText}\``;
        break;
      case 'strikethrough':
        formattedText = `~${selectedText}~`;
        break;
    }

    const newValue = messageInput.slice(0, start) + formattedText + messageInput.slice(end);
    setMessageInput(newValue);

    setTimeout(() => {
      if (messageInputRef.current) {
        messageInputRef.current.selectionStart = start + formattedText.length;
        messageInputRef.current.selectionEnd = start + formattedText.length;
        messageInputRef.current.focus();
      }
    }, 0);
  }, [messageInput]);

  // Use template
  const useTemplate = useCallback((template: Template) => {
    setMessageInput(template.content);
    setSelectedTemplate(template);
    setShowTemplates(false);
    messageInputRef.current?.focus();
  }, []);

  // Send message
  const sendMessage = useCallback(() => {
    if (!messageInput.trim() && attachments.length === 0) return;

    const newMessage: Omit<Message, 'id' | 'timestamp' | 'status'> = {
      content: messageInput.trim(),
      type: attachments.length > 0 ? attachments[0].type : 'text',
      sender: 'user',
      replyTo: replyingTo?.id
    };

    onSendMessage(newMessage);
    setMessages(prev => [...prev, {
      ...newMessage,
      id: `msg-${Date.now()}`,
      timestamp: new Date(),
      status: 'sending'
    }]);

    setMessageInput('');
    setAttachments([]);
    setReplyingTo(null);
    setSelectedTemplate(null);
    messageInputRef.current?.focus();
  }, [messageInput, attachments, replyingTo, onSendMessage]);

  // Handle key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Allow new line on Shift+Enter
        return;
      } else {
        e.preventDefault();
        sendMessage();
      }
    }
  }, [sendMessage]);

  // Remove attachment
  const removeAttachment = useCallback((attachmentId: string) => {
    setAttachments(prev => prev.filter(att => att.id !== attachmentId));
  }, []);

  // Message status icon
  const getStatusIcon = (status: Message['status']) => {
    switch (status) {
      case 'sending':
        return <ClockIcon className="w-3 h-3 text-gray-400" />;
      case 'sent':
        return <CheckIcon className="w-3 h-3 text-gray-400" />;
      case 'delivered':
        return <CheckIconSolid className="w-3 h-3 text-gray-600" />;
      case 'read':
        return <CheckIconSolid className="w-3 h-3 text-blue-600" />;
      case 'failed':
        return <ExclamationTriangleIconSolid className="w-3 h-3 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.sender === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {/* Reply indicator */}
              {message.replyTo && (
                <div className="text-xs opacity-75 mb-1 p-2 bg-black bg-opacity-10 rounded">
                  Replying to message
                </div>
              )}

              {/* Message content */}
              <div className="text-sm whitespace-pre-wrap">{message.content}</div>

              {/* Message metadata */}
              <div className={`flex items-center justify-between mt-1 text-xs ${
                message.sender === 'user' ? 'text-blue-100' : 'text-gray-500'
              }`}>
                <span>{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                {message.sender === 'user' && (
                  <div className="ml-2">{getStatusIcon(message.status)}</div>
                )}
              </div>

              {/* Reactions */}
              {message.reactions && message.reactions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {message.reactions.map((reaction, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 text-xs bg-black bg-opacity-10 rounded-full"
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
          <div className="flex justify-start">
            <div className="bg-gray-100 px-4 py-2 rounded-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Reply indicator */}
      {replyingTo && (
        <div className="px-4 py-2 bg-blue-50 border-l-4 border-blue-500 flex items-center justify-between">
          <div>
            <div className="text-xs text-blue-600 font-medium">Replying to</div>
            <div className="text-sm text-gray-700 truncate">{replyingTo.content}</div>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 border-t">
          <div className="flex flex-wrap gap-2">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className="relative bg-white p-2 rounded-lg border border-gray-200"
              >
                {attachment.type === 'image' && attachment.preview && (
                  <img
                    src={attachment.preview}
                    alt=""
                    className="w-16 h-16 object-cover rounded"
                  />
                )}
                {attachment.type !== 'image' && (
                  <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded">
                    {attachment.type === 'video' && <VideoCameraIcon className="w-6 h-6 text-gray-400" />}
                    {attachment.type === 'audio' && <MicrophoneIcon className="w-6 h-6 text-gray-400" />}
                    {attachment.type === 'document' && <DocumentIcon className="w-6 h-6 text-gray-400" />}
                  </div>
                )}

                {/* Upload progress */}
                {attachment.uploadProgress !== undefined && attachment.uploadProgress < 100 && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded">
                    <div className="text-white text-xs">{Math.round(attachment.uploadProgress)}%</div>
                  </div>
                )}

                {/* Remove button */}
                <button
                  onClick={() => removeAttachment(attachment.id)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>

                <div className="text-xs text-gray-500 mt-1 truncate w-16">
                  {attachment.file.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message input area */}
      <div className="p-4 border-t border-gray-200">
        {/* Formatting toolbar */}
        {showFormatting && (
          <div className="flex items-center space-x-2 mb-3 p-2 bg-gray-50 rounded-lg">
            <button
              onClick={() => applyFormatting('bold')}
              className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
              title="Bold"
            >
              <BoldIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => applyFormatting('italic')}
              className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
              title="Italic"
            >
              <ItalicIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => applyFormatting('code')}
              className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
              title="Code"
            >
              <CodeBracketIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => applyFormatting('strikethrough')}
              className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded"
              title="Strikethrough"
            >
              <UnderlineIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex items-end space-x-2">
          {/* Attachment button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="Attach file"
          >
            <PaperClipIcon className="w-5 h-5" />
          </button>

          {/* Message input */}
          <div className="flex-1 relative">
            <textarea
              ref={messageInputRef}
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={`Message ${contactName}...`}
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={1}
              style={{
                minHeight: '44px',
                maxHeight: '120px',
                resize: 'none'
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
              }}
            />

            {/* Input actions */}
            <div className="absolute right-3 bottom-3 flex items-center space-x-1">
              <button
                onClick={() => setShowFormatting(!showFormatting)}
                className={`p-1 rounded transition-colors ${
                  showFormatting ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                }`}
                title="Text formatting"
              >
                <BoldIcon className="w-4 h-4" />
              </button>

              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                title="Add emoji"
              >
                <FaceSmileIcon className="w-4 h-4" />
              </button>

              <button
                onClick={() => setShowTemplates(!showTemplates)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                title="Use template"
              >
                <AtSymbolIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Voice recording / Send button */}
          {messageInput.trim() || attachments.length > 0 ? (
            <button
              onClick={sendMessage}
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              title="Send message"
            >
              <PaperAirplaneIcon className="w-5 h-5" />
            </button>
          ) : (
            <button
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onMouseLeave={stopRecording}
              className={`p-2 rounded-lg transition-colors ${
                isRecording
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={isRecording ? 'Release to send' : 'Hold to record'}
            >
              {isRecording ? (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <span className="text-xs">{formatRecordingTime(recordingTime)}</span>
                </div>
              ) : (
                <MicrophoneIcon className="w-5 h-5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div className="absolute bottom-20 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 w-80">
          <div className="flex space-x-2 mb-3">
            {Object.keys(EMOJI_CATEGORIES).map((category) => (
              <button
                key={category}
                className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded capitalize"
              >
                {category}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
            {EMOJI_CATEGORIES.recent.concat(
              EMOJI_CATEGORIES.people,
              EMOJI_CATEGORIES.nature,
              EMOJI_CATEGORIES.objects,
              EMOJI_CATEGORIES.symbols
            ).map((emoji, index) => (
              <button
                key={index}
                onClick={() => insertEmoji(emoji)}
                className="p-2 hover:bg-gray-100 rounded text-lg"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Templates Panel */}
      {showTemplates && (
        <div className="absolute bottom-20 left-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50 w-96">
          <h3 className="font-medium text-gray-900 mb-3">Message Templates</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {SAMPLE_TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => useTemplate(template)}
                className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <div className="font-medium text-sm text-gray-900">{template.name}</div>
                <div className="text-xs text-gray-600 mt-1 line-clamp-2">{template.content}</div>
                <div className="flex items-center mt-2">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    {template.category}
                  </span>
                  {template.variables.length > 0 && (
                    <span className="text-xs text-gray-500 ml-2">
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
        type="file"
        multiple
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />
    </div>
  );
}