'use client'

import { useState } from 'react'
import { Search, X, Filter, Calendar } from 'lucide-react'
import { useTranslations } from '@/components/providers/translation-provider'

interface SearchFilters {
  query: string
  dateFrom?: string
  dateTo?: string
  sender?: string
  tags?: string[]
  messageType?: 'text' | 'image' | 'document' | 'audio' | 'video'
}

interface MessageSearchProps {
  organizationId: string
  onSearchResults: (results: any[]) => void
  onClose: () => void
}

export default function MessageSearch({
  organizationId,
  onSearchResults,
  onClose,
}: MessageSearchProps) {
  const t = useTranslations('inbox')
  const [filters, setFilters] = useState<SearchFilters>({ query: '' })
  const [isSearching, setIsSearching] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleSearch = async () => {
    if (!filters.query.trim() && !filters.dateFrom && !filters.tags?.length) {
      return
    }

    setIsSearching(true)

    try {
      const params = new URLSearchParams()
      if (filters.query) params.append('q', filters.query)
      if (filters.dateFrom) params.append('from', filters.dateFrom)
      if (filters.dateTo) params.append('to', filters.dateTo)
      if (filters.sender) params.append('sender', filters.sender)
      if (filters.tags?.length) params.append('tags', filters.tags.join(','))
      if (filters.messageType) params.append('type', filters.messageType)

      const response = await fetch(`/api/messages/search?${params}`)
      const data = await response.json()

      onSearchResults(data.messages || [])
    } catch (error) {
      console.error('Search error:', error)
      onSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSearch()
    }
  }

  return (
    <div className='fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-20'>
      <div className='mx-4 w-full max-w-2xl rounded-lg bg-white shadow-xl'>
        {/* Header */}
        <div className='flex items-center justify-between border-b p-4'>
          <h2 className='flex items-center gap-2 text-lg font-semibold'>
            <Search className='h-5 w-5' />
            {t('messageSearch.title')}
          </h2>
          <button
            type='button'
            onClick={onClose}
            className='rounded-full p-2 transition-colors hover:bg-gray-100'
            title={t('actions.cancel')}
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        {/* Search Input */}
        <div className='p-4'>
          <div className='relative'>
            <Search className='absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-400' />
            <input
              type='text'
              value={filters.query}
              onChange={e => setFilters({ ...filters, query: e.target.value })}
              onKeyPress={handleKeyPress}
              placeholder={t('messageSearch.placeholder')}
              className='w-full rounded-lg border py-3 pr-4 pl-10 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500'
              autoFocus
            />
          </div>

          {/* Advanced Filters Toggle */}
          <button
            type='button'
            onClick={() => setShowAdvanced(!showAdvanced)}
            className='mt-3 flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700'
          >
            <Filter className='h-4 w-4' />
            {showAdvanced ? t('messageSearch.hideFilters') : t('messageSearch.advancedFilters')}
          </button>

          {/* Advanced Filters */}
          {showAdvanced && (
            <div className='mt-4 space-y-3 rounded-lg bg-gray-50 p-4'>
              {/* Date Range */}
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='mb-1 block text-sm font-medium text-gray-700'>
                    <Calendar className='mr-1 inline h-4 w-4' />
                    {t('messageSearch.fromDate')}
                  </label>
                  <input
                    type='date'
                    value={filters.dateFrom || ''}
                    onChange={e => setFilters({ ...filters, dateFrom: e.target.value })}
                    className='w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-emerald-500'
                  />
                </div>
                <div>
                  <label className='mb-1 block text-sm font-medium text-gray-700'>{t('messageSearch.toDate')}</label>
                  <input
                    type='date'
                    value={filters.dateTo || ''}
                    onChange={e => setFilters({ ...filters, dateTo: e.target.value })}
                    className='w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-emerald-500'
                  />
                </div>
              </div>

              {/* Message Type */}
              <div>
                <label className='mb-1 block text-sm font-medium text-gray-700'>{t('messageSearch.messageType')}</label>
                <select
                  value={filters.messageType || ''}
                  onChange={e => setFilters({ ...filters, messageType: e.target.value as any })}
                  className='w-full rounded-lg border px-3 py-2 focus:ring-2 focus:ring-emerald-500'
                >
                  <option value=''>{t('messageSearch.allTypes')}</option>
                  <option value='text'>{t('messageSearch.text')}</option>
                  <option value='image'>{t('messageSearch.images')}</option>
                  <option value='document'>{t('messageSearch.documents')}</option>
                  <option value='audio'>{t('messageSearch.audio')}</option>
                  <option value='video'>{t('messageSearch.video')}</option>
                </select>
              </div>
            </div>
          )}

          {/* Search Button */}
          <div className='mt-4 flex gap-2'>
            <button
              type='button'
              onClick={handleSearch}
              disabled={
                isSearching || (!filters.query.trim() && !filters.dateFrom && !filters.tags?.length)
              }
              className='flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300'
            >
              {isSearching ? t('messageSearch.searching') : t('messageSearch.search')}
            </button>
            <button
              type='button'
              onClick={() => setFilters({ query: '' })}
              className='rounded-lg border border-gray-300 px-4 py-2 transition-colors hover:bg-gray-50'
            >
              {t('messageSearch.clear')}
            </button>
          </div>
        </div>

        {/* Search Tips */}
        <div className='px-4 pb-4 text-sm text-gray-500'>
          <p className='mb-1 font-medium'>{t('messageSearch.tips')}</p>
          <ul className='list-inside list-disc space-y-1'>
            <li>{t('messageSearch.tip1')}</li>
            <li>{t('messageSearch.tip2')}</li>
            <li>{t('messageSearch.tip3')}</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
