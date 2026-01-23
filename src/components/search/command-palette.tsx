'use client'

import { useState, useEffect, useCallback, useRef, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, Transition } from '@headlessui/react'
import {
  MagnifyingGlassIcon,
  UserIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

interface SearchResult {
  id: string
  type: 'contact' | 'message' | 'conversation'
  score: number
  data: {
    id: string
    name?: string
    phone_number?: string
    content?: string
    subject?: string
    contact?: {
      id: string
      name: string
      phone_number: string
    }
    created_at?: string
  }
}

interface CommandPaletteProps {
  organizationId: string
}

export function CommandPalette({ organizationId }: CommandPaletteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  // Open with Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setQuery('')
      setResults([])
      setSelectedIndex(0)
    }
  }, [isOpen])

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (!query.trim()) {
      setResults([])
      return
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch()
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [query])

  const performSearch = async () => {
    if (!query.trim()) return

    setIsSearching(true)
    try {
      const response = await fetch('/api/search/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          text: query,
          type: 'all',
          limit: 10,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setResults(data.results || [])
        setSelectedIndex(0)
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelect = useCallback(
    (result: SearchResult) => {
      setIsOpen(false)

      switch (result.type) {
        case 'contact':
          router.push(`/dashboard/contacts/${result.data.id}`)
          break
        case 'conversation':
          router.push(`/dashboard/inbox?conversation=${result.data.id}`)
          break
        case 'message':
          // Navigate to conversation containing this message
          const conversationId = result.data.contact?.id
          if (conversationId) {
            router.push(`/dashboard/inbox?conversation=${conversationId}`)
          }
          break
      }
    },
    [router]
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex])
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'contact':
        return UserIcon
      case 'conversation':
        return ChatBubbleLeftRightIcon
      case 'message':
        return EnvelopeIcon
      default:
        return MagnifyingGlassIcon
    }
  }

  const getResultTypeColor = (type: string) => {
    switch (type) {
      case 'contact':
        return 'bg-blue-100 text-blue-600'
      case 'conversation':
        return 'bg-purple-100 text-purple-600'
      case 'message':
        return 'bg-green-100 text-green-600'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  const getResultTitle = (result: SearchResult) => {
    switch (result.type) {
      case 'contact':
        return result.data.name || result.data.phone_number || 'Unknown Contact'
      case 'conversation':
        return result.data.subject || result.data.contact?.name || 'Conversation'
      case 'message':
        return result.data.content?.slice(0, 60) + (result.data.content && result.data.content.length > 60 ? '...' : '')
      default:
        return 'Unknown'
    }
  }

  const getResultSubtitle = (result: SearchResult) => {
    switch (result.type) {
      case 'contact':
        return result.data.phone_number || ''
      case 'conversation':
        return result.data.contact?.phone_number || ''
      case 'message':
        return `From ${result.data.contact?.name || 'Unknown'}`
      default:
        return ''
    }
  }

  return (
    <>
      {/* Search Trigger Button */}
      <button
        type='button'
        onClick={() => setIsOpen(true)}
        className='flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-500 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500'
      >
        <MagnifyingGlassIcon className='h-4 w-4' />
        <span className='hidden sm:inline'>Search...</span>
        <kbd className='hidden rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-500 sm:inline'>
          Ctrl+K
        </kbd>
      </button>

      {/* Command Palette Modal */}
      <Transition.Root show={isOpen} as={Fragment}>
        <Dialog as='div' className='relative z-50' onClose={setIsOpen}>
          <Transition.Child
            as={Fragment}
            enter='ease-out duration-200'
            enterFrom='opacity-0'
            enterTo='opacity-100'
            leave='ease-in duration-150'
            leaveFrom='opacity-100'
            leaveTo='opacity-0'
          >
            <div className='fixed inset-0 bg-black/50 transition-opacity' />
          </Transition.Child>

          <div className='fixed inset-0 z-10 overflow-y-auto p-4 sm:p-6 md:p-20'>
            <Transition.Child
              as={Fragment}
              enter='ease-out duration-200'
              enterFrom='opacity-0 scale-95'
              enterTo='opacity-100 scale-100'
              leave='ease-in duration-150'
              leaveFrom='opacity-100 scale-100'
              leaveTo='opacity-0 scale-95'
            >
              <Dialog.Panel className='mx-auto max-w-xl transform overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black/5 transition-all'>
                {/* Search Input */}
                <div className='relative'>
                  <MagnifyingGlassIcon className='pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-gray-400' />
                  <input
                    ref={inputRef}
                    type='text'
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder='Search contacts, conversations, messages...'
                    className='h-12 w-full border-0 bg-transparent pl-11 pr-4 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm'
                  />
                  {query && (
                    <button
                      onClick={() => setQuery('')}
                      className='absolute right-4 top-3.5 text-gray-400 hover:text-gray-600'
                    >
                      <XMarkIcon className='h-5 w-5' />
                    </button>
                  )}
                </div>

                {/* Results */}
                {(isSearching || results.length > 0 || query.trim()) && (
                  <div className='max-h-80 overflow-y-auto border-t border-gray-200'>
                    {isSearching ? (
                      <div className='flex items-center justify-center py-8'>
                        <div className='h-5 w-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent'></div>
                        <span className='ml-2 text-sm text-gray-500'>Searching...</span>
                      </div>
                    ) : results.length === 0 && query.trim() ? (
                      <div className='py-8 text-center'>
                        <p className='text-sm text-gray-500'>No results found for "{query}"</p>
                      </div>
                    ) : (
                      <ul className='py-2'>
                        {results.map((result, index) => {
                          const Icon = getResultIcon(result.type)
                          const isSelected = index === selectedIndex

                          return (
                            <li key={`${result.type}-${result.id}`}>
                              <button
                                onClick={() => handleSelect(result)}
                                onMouseEnter={() => setSelectedIndex(index)}
                                className={`flex w-full items-center gap-3 px-4 py-3 text-left ${
                                  isSelected ? 'bg-emerald-50' : 'hover:bg-gray-50'
                                }`}
                              >
                                <div className={`rounded-lg p-2 ${getResultTypeColor(result.type)}`}>
                                  <Icon className='h-4 w-4' />
                                </div>
                                <div className='min-w-0 flex-1'>
                                  <p className={`truncate text-sm font-medium ${
                                    isSelected ? 'text-emerald-900' : 'text-gray-900'
                                  }`}>
                                    {getResultTitle(result)}
                                  </p>
                                  {getResultSubtitle(result) && (
                                    <p className='truncate text-xs text-gray-500'>
                                      {getResultSubtitle(result)}
                                    </p>
                                  )}
                                </div>
                                <span className='rounded bg-gray-100 px-2 py-0.5 text-xs capitalize text-gray-500'>
                                  {result.type}
                                </span>
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                )}

                {/* Footer */}
                {!query.trim() && (
                  <div className='border-t border-gray-200 px-4 py-3'>
                    <p className='text-xs text-gray-500'>
                      Type to search contacts, conversations, and messages
                    </p>
                    <div className='mt-2 flex items-center gap-4 text-xs text-gray-400'>
                      <span>
                        <kbd className='rounded bg-gray-100 px-1.5 py-0.5 font-medium'>↑</kbd>
                        <kbd className='ml-1 rounded bg-gray-100 px-1.5 py-0.5 font-medium'>↓</kbd>
                        <span className='ml-1'>to navigate</span>
                      </span>
                      <span>
                        <kbd className='rounded bg-gray-100 px-1.5 py-0.5 font-medium'>Enter</kbd>
                        <span className='ml-1'>to select</span>
                      </span>
                      <span>
                        <kbd className='rounded bg-gray-100 px-1.5 py-0.5 font-medium'>Esc</kbd>
                        <span className='ml-1'>to close</span>
                      </span>
                    </div>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>
    </>
  )
}
