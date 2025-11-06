'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export interface FAQItemProps {
  question: string
  answer: string | React.ReactNode
  id?: string
  searchTerm?: string
}

export function FAQItem({ question, answer, id, searchTerm }: FAQItemProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Highlight search term if provided
  const highlightText = (text: string, term?: string) => {
    if (!term || !text) return text

    const parts = text.split(new RegExp(`(${term})`, 'gi'))
    return parts.map((part, index) =>
      part.toLowerCase() === term.toLowerCase() ? (
        <mark key={index} className='rounded bg-yellow-200 px-0.5 text-gray-900'>
          {part}
        </mark>
      ) : (
        part
      )
    )
  }

  return (
    <div
      id={id}
      className='rounded-lg border border-gray-200 bg-white transition-colors hover:border-green-300'
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className='flex w-full items-center justify-between p-4 text-left'
        aria-expanded={isOpen}
      >
        <span className='pr-4 text-lg font-semibold text-gray-900'>
          {typeof question === 'string' ? highlightText(question, searchTerm) : question}
        </span>
        <ChevronDown
          className={`h-5 w-5 flex-shrink-0 text-gray-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180 transform' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className='px-4 pb-4 leading-relaxed text-gray-600'>
          {typeof answer === 'string' ? <div>{highlightText(answer, searchTerm)}</div> : answer}

          {/* Helpful feedback */}
          <div className='mt-4 flex items-center gap-4 border-t border-gray-100 pt-4'>
            <span className='text-sm text-gray-500'>Was this helpful?</span>
            <button
              className='text-sm font-medium text-green-600 hover:text-green-700'
              onClick={e => {
                e.stopPropagation()
                // TODO: Track helpful feedback
                alert('Thank you for your feedback!')
              }}
            >
              Yes
            </button>
            <button
              className='text-sm font-medium text-gray-500 hover:text-gray-700'
              onClick={e => {
                e.stopPropagation()
                // TODO: Track unhelpful feedback
                alert("Thank you for your feedback. We'll work to improve this answer.")
              }}
            >
              No
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
