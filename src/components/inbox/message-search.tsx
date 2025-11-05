// @ts-nocheck - Database types need regeneration
'use client'

import { useState, useEffect } from 'react'
import { Search, X, Filter, Calendar, User, Tag } from 'lucide-react'

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

export default function MessageSearch({ organizationId, onSearchResults, onClose }: MessageSearchProps) {
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
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-20 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Search className="w-5 h-5" />
            Berichten doorzoeken
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={filters.query}
              onChange={(e) => setFilters({ ...filters, query: e.target.value })}
              onKeyPress={handleKeyPress}
              placeholder="Zoek in berichten..."
              className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              autoFocus
            />
          </div>

          {/* Advanced Filters Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="mt-3 text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            <Filter className="w-4 h-4" />
            {showAdvanced ? 'Verberg filters' : 'Geavanceerde filters'}
          </button>

          {/* Advanced Filters */}
          {showAdvanced && (
            <div className="mt-4 space-y-3 p-4 bg-gray-50 rounded-lg">
              {/* Date Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Van datum
                  </label>
                  <input
                    type="date"
                    value={filters.dateFrom || ''}
                    onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tot datum
                  </label>
                  <input
                    type="date"
                    value={filters.dateTo || ''}
                    onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Message Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bericht type
                </label>
                <select
                  value={filters.messageType || ''}
                  onChange={(e) => setFilters({ ...filters, messageType: e.target.value as any })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Alle types</option>
                  <option value="text">Tekst</option>
                  <option value="image">Afbeeldingen</option>
                  <option value="document">Documenten</option>
                  <option value="audio">Audio</option>
                  <option value="video">Video</option>
                </select>
              </div>
            </div>
          )}

          {/* Search Button */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleSearch}
              disabled={isSearching || (!filters.query.trim() && !filters.dateFrom && !filters.tags?.length)}
              className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isSearching ? 'Zoeken...' : 'Zoeken'}
            </button>
            <button
              onClick={() => setFilters({ query: '' })}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Wissen
            </button>
          </div>
        </div>

        {/* Search Tips */}
        <div className="px-4 pb-4 text-sm text-gray-500">
          <p className="font-medium mb-1">Zoektips:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Gebruik meerdere woorden voor betere resultaten</li>
            <li>Datumfilters helpen bij het beperken van resultaten</li>
            <li>Combineer tekst met filters voor specifieke zoekopdrachten</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
