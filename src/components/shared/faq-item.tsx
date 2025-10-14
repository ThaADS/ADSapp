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
        <mark key={index} className="bg-yellow-200 text-gray-900 px-0.5 rounded">
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
      className="border border-gray-200 rounded-lg bg-white hover:border-green-300 transition-colors"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left"
        aria-expanded={isOpen}
      >
        <span className="text-lg font-semibold text-gray-900 pr-4">
          {typeof question === 'string' ? highlightText(question, searchTerm) : question}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-gray-500 flex-shrink-0 transition-transform duration-200 ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="px-4 pb-4 text-gray-600 leading-relaxed">
          {typeof answer === 'string' ? (
            <div>{highlightText(answer, searchTerm)}</div>
          ) : (
            answer
          )}

          {/* Helpful feedback */}
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-4">
            <span className="text-sm text-gray-500">Was this helpful?</span>
            <button
              className="text-sm text-green-600 hover:text-green-700 font-medium"
              onClick={(e) => {
                e.stopPropagation()
                // TODO: Track helpful feedback
                alert('Thank you for your feedback!')
              }}
            >
              Yes
            </button>
            <button
              className="text-sm text-gray-500 hover:text-gray-700 font-medium"
              onClick={(e) => {
                e.stopPropagation()
                // TODO: Track unhelpful feedback
                alert('Thank you for your feedback. We\'ll work to improve this answer.')
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