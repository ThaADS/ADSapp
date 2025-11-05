'use client'

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
    <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-3 border border-gray-200">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
          Advanced Filters
        </h3>
        <button
          onClick={onClearAll}
          className="text-xs text-green-600 hover:text-green-700 font-medium"
        >
          Clear all
        </button>
      </div>

      {/* Tags filter */}
      {allTags.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Tags
          </label>
          <div className="flex flex-wrap gap-1.5">
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:border-green-500'
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
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Assigned Agent
          </label>
          <select
            value={selectedAgent || ''}
            onChange={(e) => onAgentChange(e.target.value || null)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
          >
            <option value="">All agents</option>
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
        <label className="block text-xs font-medium text-gray-700 mb-2">
          Date Range
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <input
              type="date"
              value={formatDate(dateRange.start)}
              onChange={(e) => onDateRangeChange({ ...dateRange, start: parseDate(e.target.value) })}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Start date"
            />
          </div>
          <div>
            <input
              type="date"
              value={formatDate(dateRange.end)}
              onChange={(e) => onDateRangeChange({ ...dateRange, end: parseDate(e.target.value) })}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="End date"
            />
          </div>
        </div>
      </div>

      {/* Active filters summary */}
      {(selectedTags.length > 0 || selectedAgent || dateRange.start || dateRange.end) && (
        <div className="pt-2 border-t border-gray-200">
          <div className="text-xs text-gray-600 space-y-1">
            {selectedTags.length > 0 && (
              <div>
                <span className="font-medium">Tags:</span> {selectedTags.join(', ')}
              </div>
            )}
            {selectedAgent && (
              <div>
                <span className="font-medium">Agent:</span>{' '}
                {allAgents.find(a => a.id === selectedAgent)?.name}
              </div>
            )}
            {(dateRange.start || dateRange.end) && (
              <div>
                <span className="font-medium">Date:</span>{' '}
                {dateRange.start ? formatDate(dateRange.start) : 'Any'} -{' '}
                {dateRange.end ? formatDate(dateRange.end) : 'Any'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
