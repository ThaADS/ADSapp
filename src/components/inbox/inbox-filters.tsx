'use client'

import { useTranslations } from '@/components/providers/translation-provider'

interface InboxFiltersProps {
  selectedTags: string[]
  onTagsChange: (tags: string[]) => void
  selectedAgent: string | null
  onAgentChange: (agentId: string | null) => void
  dateRange: { start: Date | null; end: Date | null }
  onDateRangeChange: (range: { start: Date | null; end: Date | null }) => void
  allTags: string[]
  allAgents: { id: string; name: string }[]
  onClearAll: () => void
}

export function InboxFilters({
  selectedTags,
  onTagsChange,
  selectedAgent,
  onAgentChange,
  dateRange,
  onDateRangeChange,
  allTags,
  allAgents,
  onClearAll,
}: InboxFiltersProps) {
  const t = useTranslations('inbox')

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter(t => t !== tag))
    } else {
      onTagsChange([...selectedTags, tag])
    }
  }

  const formatDate = (date: Date | null) => {
    if (!date) return ''
    return date.toISOString().split('T')[0]
  }

  const parseDate = (dateStr: string) => {
    if (!dateStr) return null
    return new Date(dateStr)
  }

  return (
    <div className='mt-3 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3'>
      <div className='flex items-center justify-between'>
        <h3 className='text-xs font-semibold tracking-wide text-gray-700 uppercase'>
          {t('filters.title')}
        </h3>
        <button
          type='button'
          onClick={onClearAll}
          className='text-xs font-medium text-green-600 hover:text-green-700'
        >
          {t('filters.clearAll')}
        </button>
      </div>

      {/* Tags filter */}
      {allTags.length > 0 && (
        <div>
          <label className='mb-2 block text-xs font-medium text-gray-700'>{t('tags.label')}</label>
          <div className='flex flex-wrap gap-1.5'>
            {allTags.map(tag => (
              <button
                type='button'
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-green-600 text-white'
                    : 'border border-gray-300 bg-white text-gray-700 hover:border-green-500'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Agent filter */}
      {allAgents.length > 0 && (
        <div>
          <label className='mb-2 block text-xs font-medium text-gray-700'>{t('filters.assignedAgent')}</label>
          <select
            value={selectedAgent || ''}
            onChange={e => onAgentChange(e.target.value || null)}
            className='w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-green-500 focus:outline-none'
            aria-label={t('filters.assignedAgent')}
          >
            <option value=''>{t('filters.allAgents')}</option>
            {allAgents.map(agent => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Date range filter */}
      <div>
        <label className='mb-2 block text-xs font-medium text-gray-700'>{t('filters.dateRange')}</label>
        <div className='grid grid-cols-2 gap-2'>
          <div>
            <input
              type='date'
              value={formatDate(dateRange.start)}
              onChange={e => onDateRangeChange({ ...dateRange, start: parseDate(e.target.value) })}
              className='w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-transparent focus:ring-2 focus:ring-green-500 focus:outline-none'
              aria-label={t('filters.dateRange')}
            />
          </div>
          <div>
            <input
              type='date'
              value={formatDate(dateRange.end)}
              onChange={e => onDateRangeChange({ ...dateRange, end: parseDate(e.target.value) })}
              className='w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-transparent focus:ring-2 focus:ring-green-500 focus:outline-none'
              aria-label={t('filters.dateRange')}
            />
          </div>
        </div>
      </div>

      {/* Active filters summary */}
      {(selectedTags.length > 0 || selectedAgent || dateRange.start || dateRange.end) && (
        <div className='border-t border-gray-200 pt-2'>
          <div className='space-y-1 text-xs text-gray-600'>
            {selectedTags.length > 0 && (
              <div>
                <span className='font-medium'>{t('filters.activeSummary.tags')}:</span> {selectedTags.join(', ')}
              </div>
            )}
            {selectedAgent && (
              <div>
                <span className='font-medium'>{t('filters.activeSummary.agent')}:</span>{' '}
                {allAgents.find(a => a.id === selectedAgent)?.name}
              </div>
            )}
            {(dateRange.start || dateRange.end) && (
              <div>
                <span className='font-medium'>{t('filters.activeSummary.date')}:</span>{' '}
                {dateRange.start ? formatDate(dateRange.start) : '-'} -{' '}
                {dateRange.end ? formatDate(dateRange.end) : '-'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
