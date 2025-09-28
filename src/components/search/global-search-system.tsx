'use client';

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  FunnelIcon,
  ClockIcon,
  BookmarkIcon,
  UserIcon,
  ChatBubbleLeftRightIcon,
  DocumentIcon,
  TagIcon,
  CalendarIcon,
  AdjustmentsHorizontalIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon,
  ShareIcon,
  StarIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import {
  BookmarkIcon as BookmarkIconSolid,
  StarIcon as StarIconSolid
} from '@heroicons/react/24/solid';

// Search result types
interface SearchResult {
  id: string;
  type: 'contact' | 'message' | 'conversation' | 'document' | 'template';
  title: string;
  content: string;
  snippet: string;
  timestamp: Date;
  score: number;
  metadata: {
    contact?: string;
    tags?: string[];
    category?: string;
    fileType?: string;
    messageCount?: number;
    lastActivity?: Date;
  };
  highlighted?: {
    title?: string;
    content?: string;
    snippet?: string;
  };
}

interface SearchFilter {
  id: string;
  label: string;
  type: 'select' | 'multiselect' | 'daterange' | 'checkbox' | 'text';
  options?: { value: string; label: string; count?: number }[];
  value: any;
}

interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: Record<string, any>;
  createdAt: Date;
  lastUsed: Date;
  useCount: number;
}

// Sample data
const SAMPLE_RESULTS: SearchResult[] = [
  {
    id: '1',
    type: 'contact',
    title: 'John Smith',
    content: 'CEO at Tech Corp',
    snippet: 'john.smith@techcorp.com • +1234567890 • Last contact: 2 hours ago',
    timestamp: new Date(),
    score: 0.95,
    metadata: {
      contact: 'John Smith',
      tags: ['vip', 'enterprise'],
      messageCount: 24,
      lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000)
    }
  },
  {
    id: '2',
    type: 'message',
    title: 'Product inquiry about enterprise features',
    content: 'Hi, I\'m interested in your enterprise features. Could you provide more details about pricing and implementation?',
    snippet: 'From: Sarah Johnson • 3 hours ago • Conversation with Sarah Johnson',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
    score: 0.87,
    metadata: {
      contact: 'Sarah Johnson',
      tags: ['sales', 'enterprise'],
      category: 'inquiry'
    }
  },
  {
    id: '3',
    type: 'conversation',
    title: 'Support conversation with Mike Chen',
    content: 'Technical support conversation about integration issues',
    snippet: '15 messages • Started 1 day ago • Status: Open',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    score: 0.78,
    metadata: {
      contact: 'Mike Chen',
      tags: ['support', 'technical'],
      messageCount: 15,
      category: 'support'
    }
  },
  {
    id: '4',
    type: 'template',
    title: 'Welcome Message Template',
    content: 'Hello {{name}}! Welcome to our service. How can we help you today?',
    snippet: 'Template • Category: Greeting • Variables: name',
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    score: 0.65,
    metadata: {
      category: 'greeting',
      tags: ['welcome', 'onboarding']
    }
  },
  {
    id: '5',
    type: 'document',
    title: 'Product Catalog 2024.pdf',
    content: 'Complete product catalog with pricing and specifications',
    snippet: 'PDF Document • 2.4 MB • Uploaded 2 weeks ago',
    timestamp: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    score: 0.59,
    metadata: {
      fileType: 'pdf',
      category: 'marketing'
    }
  }
];

const SAMPLE_SAVED_SEARCHES: SavedSearch[] = [
  {
    id: '1',
    name: 'VIP Customer Messages',
    query: 'vip customer',
    filters: { type: ['contact', 'message'], tags: ['vip'] },
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000),
    useCount: 15
  },
  {
    id: '2',
    name: 'Support Tickets This Week',
    query: 'support',
    filters: { type: ['conversation'], category: ['support'], dateRange: 'week' },
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    lastUsed: new Date(Date.now() - 4 * 60 * 60 * 1000),
    useCount: 8
  }
];

const SEARCH_FILTERS: SearchFilter[] = [
  {
    id: 'type',
    label: 'Content Type',
    type: 'multiselect',
    options: [
      { value: 'contact', label: 'Contacts', count: 156 },
      { value: 'message', label: 'Messages', count: 2847 },
      { value: 'conversation', label: 'Conversations', count: 324 },
      { value: 'document', label: 'Documents', count: 89 },
      { value: 'template', label: 'Templates', count: 45 }
    ],
    value: []
  },
  {
    id: 'dateRange',
    label: 'Date Range',
    type: 'select',
    options: [
      { value: 'today', label: 'Today' },
      { value: 'week', label: 'This Week' },
      { value: 'month', label: 'This Month' },
      { value: 'quarter', label: 'This Quarter' },
      { value: 'year', label: 'This Year' },
      { value: 'custom', label: 'Custom Range' }
    ],
    value: ''
  },
  {
    id: 'tags',
    label: 'Tags',
    type: 'multiselect',
    options: [
      { value: 'vip', label: 'VIP', count: 23 },
      { value: 'enterprise', label: 'Enterprise', count: 15 },
      { value: 'support', label: 'Support', count: 89 },
      { value: 'sales', label: 'Sales', count: 156 },
      { value: 'technical', label: 'Technical', count: 67 }
    ],
    value: []
  },
  {
    id: 'status',
    label: 'Status',
    type: 'select',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'resolved', label: 'Resolved' },
      { value: 'pending', label: 'Pending' },
      { value: 'archived', label: 'Archived' }
    ],
    value: ''
  },
  {
    id: 'assignee',
    label: 'Assigned To',
    type: 'select',
    options: [
      { value: 'alice', label: 'Alice Johnson' },
      { value: 'bob', label: 'Bob Wilson' },
      { value: 'charlie', label: 'Charlie Brown' },
      { value: 'unassigned', label: 'Unassigned' }
    ],
    value: ''
  }
];

interface GlobalSearchSystemProps {
  onResultSelect?: (result: SearchResult) => void;
  onSearchChange?: (query: string) => void;
}

export default function GlobalSearchSystem({
  onResultSelect,
  onSearchChange
}: GlobalSearchSystemProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(SAMPLE_SAVED_SEARCHES);
  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'type'>('relevance');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedResults, setSelectedResults] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['all']));

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch();
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, filters]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      // Escape to clear search
      if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setQuery('');
        setResults([]);
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Perform search
  const performSearch = useCallback(async () => {
    if (!query.trim() && Object.keys(filters).length === 0) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    onSearchChange?.(query);

    // Simulate search API call
    await new Promise(resolve => setTimeout(resolve, 200));

    // Filter and sort results
    let filteredResults = SAMPLE_RESULTS.filter(result => {
      // Text search
      const matchesQuery = !query.trim() ||
        result.title.toLowerCase().includes(query.toLowerCase()) ||
        result.content.toLowerCase().includes(query.toLowerCase()) ||
        result.snippet.toLowerCase().includes(query.toLowerCase());

      // Filter by type
      const matchesType = !filters.type?.length || filters.type.includes(result.type);

      // Filter by tags
      const matchesTags = !filters.tags?.length ||
        filters.tags.some((tag: string) => result.metadata.tags?.includes(tag));

      return matchesQuery && matchesType && matchesTags;
    });

    // Add highlighting
    filteredResults = filteredResults.map(result => ({
      ...result,
      highlighted: query.trim() ? {
        title: highlightText(result.title, query),
        content: highlightText(result.content, query),
        snippet: highlightText(result.snippet, query)
      } : undefined
    }));

    // Sort results
    filteredResults.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'relevance':
          comparison = b.score - a.score;
          break;
        case 'date':
          comparison = b.timestamp.getTime() - a.timestamp.getTime();
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
      }

      return sortOrder === 'desc' ? comparison : -comparison;
    });

    setResults(filteredResults);
    setIsSearching(false);
  }, [query, filters, sortBy, sortOrder, onSearchChange]);

  // Highlight search terms
  const highlightText = (text: string, searchTerm: string): string => {
    if (!searchTerm.trim()) return text;

    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  };

  // Group results by type
  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};

    results.forEach(result => {
      if (!groups[result.type]) {
        groups[result.type] = [];
      }
      groups[result.type].push(result);
    });

    return groups;
  }, [results]);

  // Update filter
  const updateFilter = useCallback((filterId: string, value: any) => {
    setFilters(prev => ({ ...prev, [filterId]: value }));
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  // Save current search
  const saveCurrentSearch = useCallback(() => {
    if (!query.trim()) return;

    const searchName = prompt('Enter name for this search:');
    if (!searchName) return;

    const newSavedSearch: SavedSearch = {
      id: `search-${Date.now()}`,
      name: searchName,
      query,
      filters,
      createdAt: new Date(),
      lastUsed: new Date(),
      useCount: 1
    };

    setSavedSearches(prev => [...prev, newSavedSearch]);
  }, [query, filters]);

  // Load saved search
  const loadSavedSearch = useCallback((savedSearch: SavedSearch) => {
    setQuery(savedSearch.query);
    setFilters(savedSearch.filters);
    setShowSavedSearches(false);

    // Update usage stats
    setSavedSearches(prev => prev.map(search =>
      search.id === savedSearch.id
        ? { ...search, lastUsed: new Date(), useCount: search.useCount + 1 }
        : search
    ));
  }, []);

  // Toggle group expansion
  const toggleGroup = useCallback((groupType: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupType)) {
        newSet.delete(groupType);
      } else {
        newSet.add(groupType);
      }
      return newSet;
    });
  }, []);

  // Handle result selection
  const handleResultSelect = useCallback((result: SearchResult) => {
    onResultSelect?.(result);
  }, [onResultSelect]);

  // Get result type icon
  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'contact': return UserIcon;
      case 'message': return ChatBubbleLeftRightIcon;
      case 'conversation': return ChatBubbleLeftRightIcon;
      case 'document': return DocumentIcon;
      case 'template': return DocumentIcon;
      default: return DocumentIcon;
    }
  };

  // Get result type color
  const getResultTypeColor = (type: SearchResult['type']) => {
    switch (type) {
      case 'contact': return 'text-blue-600 bg-blue-100';
      case 'message': return 'text-green-600 bg-green-100';
      case 'conversation': return 'text-purple-600 bg-purple-100';
      case 'document': return 'text-orange-600 bg-orange-100';
      case 'template': return 'text-pink-600 bg-pink-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Search Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          {/* Search Input */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search contacts, messages, conversations... (Ctrl+K)"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center px-3 py-2 border rounded-lg transition-colors ${
              showFilters || Object.keys(filters).length > 0
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FunnelIcon className="w-4 h-4 mr-2" />
            Filters
            {Object.keys(filters).length > 0 && (
              <span className="ml-1 px-2 py-1 text-xs bg-blue-600 text-white rounded-full">
                {Object.keys(filters).length}
              </span>
            )}
          </button>

          {/* Saved Searches */}
          <button
            onClick={() => setShowSavedSearches(!showSavedSearches)}
            className="flex items-center px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50"
          >
            <BookmarkIcon className="w-4 h-4 mr-2" />
            Saved
          </button>

          {/* Save Search */}
          {query.trim() && (
            <button
              onClick={saveCurrentSearch}
              className="flex items-center px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50"
              title="Save current search"
            >
              <BookmarkIconSolid className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {SEARCH_FILTERS.map(filter => (
                <div key={filter.id}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {filter.label}
                  </label>

                  {filter.type === 'select' && (
                    <select
                      value={filters[filter.id] || ''}
                      onChange={(e) => updateFilter(filter.id, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="">All {filter.label}</option>
                      {filter.options?.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  )}

                  {filter.type === 'multiselect' && (
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {filter.options?.map(option => (
                        <label key={option.value} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={filters[filter.id]?.includes(option.value) || false}
                            onChange={(e) => {
                              const currentValues = filters[filter.id] || [];
                              const newValues = e.target.checked
                                ? [...currentValues, option.value]
                                : currentValues.filter((v: string) => v !== option.value);
                              updateFilter(filter.id, newValues);
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            {option.label}
                            {option.count && (
                              <span className="text-gray-500 ml-1">({option.count})</span>
                            )}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">Sort by:</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="date">Date</option>
                    <option value="type">Type</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="p-1 text-gray-600 hover:text-gray-900"
                  >
                    {sortOrder === 'asc' ? <ArrowUpIcon className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}

        {/* Saved Searches Panel */}
        {showSavedSearches && (
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Saved Searches</h3>
            <div className="space-y-2">
              {savedSearches.map(search => (
                <button
                  key={search.id}
                  onClick={() => loadSavedSearch(search)}
                  className="w-full text-left p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm text-gray-900">{search.name}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        "{search.query}" • Used {search.useCount} times
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {search.lastUsed.toLocaleDateString()}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Search Results */}
      <div className="flex-1 overflow-y-auto">
        {isSearching && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center space-x-2 text-gray-600">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
              <span>Searching...</span>
            </div>
          </div>
        )}

        {!isSearching && results.length === 0 && query.trim() && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <MagnifyingGlassIcon className="w-12 h-12 mb-4" />
            <h3 className="text-lg font-medium mb-2">No results found</h3>
            <p>Try adjusting your search terms or filters</p>
          </div>
        )}

        {!isSearching && results.length === 0 && !query.trim() && (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <MagnifyingGlassIcon className="w-12 h-12 mb-4" />
            <h3 className="text-lg font-medium mb-2">Search Everything</h3>
            <p>Find contacts, messages, conversations, and more</p>
            <div className="mt-4 text-sm">
              <kbd className="px-2 py-1 bg-gray-100 rounded">Ctrl</kbd> + <kbd className="px-2 py-1 bg-gray-100 rounded">K</kbd> to focus search
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-600">
                {results.length} result{results.length !== 1 ? 's' : ''} found
              </div>
            </div>

            {/* Grouped Results */}
            {Object.entries(groupedResults).map(([type, typeResults]) => (
              <div key={type} className="mb-6">
                <button
                  onClick={() => toggleGroup(type)}
                  className="flex items-center justify-between w-full text-left p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    {expandedGroups.has(type) ? (
                      <ChevronDownIcon className="w-4 h-4 text-gray-600" />
                    ) : (
                      <ChevronRightIcon className="w-4 h-4 text-gray-600" />
                    )}
                    <span className="font-medium capitalize text-gray-900">
                      {type.replace(/([A-Z])/g, ' $1')}
                    </span>
                    <span className="text-sm text-gray-500">({typeResults.length})</span>
                  </div>
                </button>

                {expandedGroups.has(type) && (
                  <div className="mt-2 space-y-2">
                    {typeResults.map(result => {
                      const IconComponent = getResultIcon(result.type);
                      const typeColor = getResultTypeColor(result.type);

                      return (
                        <button
                          key={result.id}
                          onClick={() => handleResultSelect(result)}
                          className="w-full text-left p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-start space-x-3">
                            <div className={`p-2 rounded-lg ${typeColor}`}>
                              <IconComponent className="w-4 h-4" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <h3
                                  className="font-medium text-gray-900 truncate"
                                  dangerouslySetInnerHTML={{
                                    __html: result.highlighted?.title || result.title
                                  }}
                                />
                                <div className="flex items-center space-x-2 text-xs text-gray-500">
                                  <ClockIcon className="w-3 h-3" />
                                  <span>{result.timestamp.toLocaleDateString()}</span>
                                </div>
                              </div>

                              <p
                                className="text-sm text-gray-600 line-clamp-2"
                                dangerouslySetInnerHTML={{
                                  __html: result.highlighted?.content || result.content
                                }}
                              />

                              <div className="flex items-center justify-between mt-2">
                                <p
                                  className="text-xs text-gray-500"
                                  dangerouslySetInnerHTML={{
                                    __html: result.highlighted?.snippet || result.snippet
                                  }}
                                />

                                {result.metadata.tags && result.metadata.tags.length > 0 && (
                                  <div className="flex items-center space-x-1">
                                    {result.metadata.tags.slice(0, 2).map(tag => (
                                      <span
                                        key={tag}
                                        className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full"
                                      >
                                        {tag}
                                      </span>
                                    ))}
                                    {result.metadata.tags.length > 2 && (
                                      <span className="text-xs text-gray-500">
                                        +{result.metadata.tags.length - 2}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}