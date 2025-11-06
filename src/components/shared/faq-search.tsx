'use client'

import { Search, X } from 'lucide-react'
import { useState } from 'react'

export interface FAQSearchProps {
  onSearch: (term: string) => void
  placeholder?: string
  className?: string
}

export function FAQSearch({
  onSearch,
  placeholder = 'Search frequently asked questions...',
  className = '',
}: FAQSearchProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const handleChange = (value: string) => {
    setSearchTerm(value)
    onSearch(value)
  }

  const handleClear = () => {
    setSearchTerm('')
    onSearch('')
  }

  return (
    <div className={`relative ${className}`}>
      <div className='pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3'>
        <Search className='h-5 w-5 text-gray-400' />
      </div>
      <input
        type='text'
        value={searchTerm}
        onChange={e => handleChange(e.target.value)}
        placeholder={placeholder}
        className='block w-full rounded-lg border border-gray-300 bg-white py-3 pr-10 pl-10 leading-5 placeholder-gray-500 transition-colors focus:border-green-500 focus:placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:outline-none sm:text-sm'
      />
      {searchTerm && (
        <button
          onClick={handleClear}
          className='absolute inset-y-0 right-0 flex items-center rounded-r-lg pr-3 hover:bg-gray-50'
          aria-label='Clear search'
        >
          <X className='h-5 w-5 text-gray-400 hover:text-gray-600' />
        </button>
      )}
    </div>
  )
}
