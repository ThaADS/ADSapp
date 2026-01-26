'use client'

import { useEffect, useRef } from 'react'
import { ShoppingCart, Package, ShoppingBag } from 'lucide-react'
import { useTranslations } from '@/components/providers/translation-provider'
import type { MessageWithSender } from '@/types'
import type { CartData, CartItem } from '@/types/whatsapp-catalog'

// Simple time formatter
function formatMessageTime(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// Format currency
function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: currency || 'EUR',
  }).format(amount)
}

// Calculate cart total
function calculateCartTotal(items: CartItem[]): { total: number; currency: string } {
  if (!items || items.length === 0) return { total: 0, currency: 'EUR' }
  const total = items.reduce((sum, item) => sum + item.item_price * item.quantity, 0)
  return { total, currency: items[0]?.currency || 'EUR' }
}

// Parse cart data from message metadata
function parseCartData(message: MessageWithSender): CartData | null {
  try {
    // Cart data could be in metadata or parsed from content
    const metadata = message.metadata as Record<string, unknown> | null
    if (metadata?.cart_data) {
      return metadata.cart_data as CartData
    }
    // Try parsing from content if it's JSON
    if (message.content?.startsWith('{')) {
      return JSON.parse(message.content) as CartData
    }
    return null
  } catch {
    return null
  }
}

// Order Message Component
function OrderMessageContent({ cartData, customerNote, t }: { cartData: CartData; customerNote?: string; t: (key: string, params?: Record<string, unknown>) => string }) {
  const { total, currency } = calculateCartTotal(cartData.product_items)

  return (
    <div className='space-y-2'>
      <div className='flex items-center gap-2 text-sm font-medium'>
        <ShoppingCart className='h-4 w-4' />
        <span>{t('messageList.orderReceived')}</span>
      </div>

      {/* Product items */}
      <div className='space-y-1.5'>
        {cartData.product_items.map((item, index) => (
          <div key={index} className='flex items-center justify-between text-sm bg-white/10 rounded px-2 py-1'>
            <div className='flex items-center gap-2'>
              <Package className='h-3.5 w-3.5 opacity-70' />
              <span className='font-mono text-xs'>{item.product_retailer_id}</span>
              <span className='opacity-70'>×{item.quantity}</span>
            </div>
            <span className='font-medium'>
              {formatPrice(item.item_price * item.quantity, item.currency)}
            </span>
          </div>
        ))}
      </div>

      {/* Total */}
      <div className='flex items-center justify-between border-t border-white/20 pt-2 text-sm font-semibold'>
        <span>{t('messageList.total')}</span>
        <span>{formatPrice(total, currency)}</span>
      </div>

      {/* Customer note */}
      {(customerNote || cartData.text) && (
        <div className='text-xs opacity-80 italic border-t border-white/20 pt-2'>
          &quot;{customerNote || cartData.text}&quot;
        </div>
      )}
    </div>
  )
}

// Product Message Component (single product or product list sent by agent)
function ProductMessageContent({ message, t }: { message: MessageWithSender; t: (key: string, params?: Record<string, unknown>) => string }) {
  const metadata = message.metadata as Record<string, unknown> | null

  // Check if it's a product list message
  const isProductList = metadata?.sections || metadata?.products
  const products = (metadata?.products as string[]) || []
  const headerText = metadata?.header_text as string | undefined
  const bodyText = metadata?.body_text as string | undefined

  if (isProductList && products.length > 0) {
    return (
      <div className='space-y-2'>
        <div className='flex items-center gap-2 text-sm font-medium'>
          <ShoppingBag className='h-4 w-4' />
          <span>{t('messageList.productsShared', { count: products.length })}</span>
        </div>
        {headerText && <div className='text-sm font-medium'>{headerText}</div>}
        {bodyText && <div className='text-sm opacity-90'>{bodyText}</div>}
        <div className='text-xs opacity-70'>
          {products.slice(0, 3).join(', ')}
          {products.length > 3 && ` ${t('messageList.more', { count: products.length - 3 })}`}
        </div>
      </div>
    )
  }

  // Single product
  const productId = metadata?.product_retailer_id as string | undefined
  return (
    <div className='space-y-1'>
      <div className='flex items-center gap-2 text-sm font-medium'>
        <Package className='h-4 w-4' />
        <span>{t('messageList.productShared')}</span>
      </div>
      {productId && (
        <div className='text-xs font-mono opacity-70'>{productId}</div>
      )}
      {message.content && message.content !== productId && (
        <div className='text-sm'>{message.content}</div>
      )}
    </div>
  )
}

interface MessageListProps {
  messages: MessageWithSender[]
  currentUserId: string
}

export function MessageList({ messages, currentUserId }: MessageListProps) {
  const t = useTranslations('inbox')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className='flex h-full items-center justify-center p-8'>
        <div className='text-center'>
          <svg
            className='mx-auto h-12 w-12 text-gray-400'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'
            />
          </svg>
          <h3 className='mt-2 text-sm font-medium text-gray-900'>{t('messageList.noMessages')}</h3>
          <p className='mt-1 text-sm text-gray-500'>{t('messageList.startConversation')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className='flex h-full flex-col'>
      <div className='flex-1 space-y-4 overflow-y-auto px-6 py-4'>
        {messages.map(message => {
          const isFromCurrentUser = message.sender_id === currentUserId
          const isFromAgent = message.sender_type === 'agent'
          const isFromContact = message.sender_type === 'contact'
          const isSystemMessage = message.sender_type === 'system'

          // System messages
          if (isSystemMessage) {
            return (
              <div key={message.id} className='flex justify-center'>
                <div className='rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600'>
                  {message.content}
                </div>
              </div>
            )
          }

          // Agent/Contact messages
          return (
            <div
              key={message.id}
              className={`flex ${isFromAgent ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`flex max-w-xs lg:max-w-md ${isFromAgent ? 'flex-row-reverse' : 'flex-row'} items-end space-x-2`}
              >
                {/* Avatar */}
                <div className={`flex-shrink-0 ${isFromAgent ? 'ml-2' : 'mr-2'}`}>
                  {isFromAgent ? (
                    <div className='flex h-6 w-6 items-center justify-center rounded-full bg-blue-500'>
                      <span className='text-xs font-medium text-white'>
                        {message.sender?.full_name?.charAt(0) || 'A'}
                      </span>
                    </div>
                  ) : (
                    <div className='flex h-6 w-6 items-center justify-center rounded-full bg-green-500'>
                      <span className='text-xs font-medium text-white'>C</span>
                    </div>
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={`relative rounded-lg px-4 py-2 ${
                    isFromAgent ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {/* Order Message (from customer) */}
                  {message.message_type === 'order' && (() => {
                    const cartData = parseCartData(message)
                    if (cartData) {
                      return <OrderMessageContent cartData={cartData} customerNote={message.content} t={t} />
                    }
                    return <div className='text-sm'>{message.content}</div>
                  })()}

                  {/* Product Message (sent by agent) */}
                  {(message.message_type === 'product' || message.message_type === 'product_list') && (
                    <ProductMessageContent message={message} t={t} />
                  )}

                  {/* Regular text and other message types */}
                  {message.message_type !== 'order' &&
                   message.message_type !== 'product' &&
                   message.message_type !== 'product_list' && (
                    <>
                      {/* Message Type Indicator */}
                      {message.message_type !== 'text' && (
                        <div className='mb-1 text-xs opacity-75'>[{message.message_type}]</div>
                      )}
                      {/* Message Content */}
                      <div className='text-sm'>{message.content}</div>
                    </>
                  )}

                  {/* Media */}
                  {message.media_url && (
                    <div className='mt-2'>
                      {message.message_type === 'image' && (
                        <img
                          src={message.media_url}
                          alt={t('messageList.sharedImage')}
                          className='max-w-full rounded'
                        />
                      )}
                      {(message.message_type === 'document' ||
                        message.message_type === 'audio' ||
                        message.message_type === 'video') && (
                        <a
                          href={message.media_url}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='text-xs underline opacity-75 hover:opacity-100'
                        >
                          {t('messageList.download', { type: message.message_type })}
                        </a>
                      )}
                    </div>
                  )}

                  {/* Timestamp */}
                  <div
                    className={`mt-1 text-xs ${isFromAgent ? 'text-blue-100' : 'text-gray-500'}`}
                  >
                    {formatMessageTime(new Date(message.created_at))}
                    {isFromAgent && (
                      <span className='ml-1'>
                        {message.delivered_at && !message.read_at && '✓'}
                        {message.read_at && '✓✓'}
                      </span>
                    )}
                  </div>

                  {/* Message Status */}
                  {!message.is_read && isFromContact && (
                    <div className='absolute -top-1 -left-1 h-3 w-3 rounded-full bg-green-500'></div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}
