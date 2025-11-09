/**
 * Mobile-Optimized Table Component
 *
 * Automatically converts to card layout on mobile devices
 * Provides horizontal scroll on tablet
 * Full table on desktop
 */

'use client'

import { cn } from '@/lib/responsive'
import { useState } from 'react'

interface Column {
  key: string
  label: string
  mobileLabel?: string
  render?: (value: any, row: any) => React.ReactNode
  className?: string
  mobileOnly?: boolean
  desktopOnly?: boolean
  sortable?: boolean
}

interface MobileTableProps {
  data: any[]
  columns: Column[]
  keyField?: string
  onRowClick?: (row: any) => void
  loading?: boolean
  emptyMessage?: string
  className?: string
  mobileCardRender?: (row: any) => React.ReactNode
}

export function MobileTable({
  data,
  columns,
  keyField = 'id',
  onRowClick,
  loading = false,
  emptyMessage = 'No data found',
  className,
  mobileCardRender,
}: MobileTableProps) {
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(columnKey)
      setSortDirection('asc')
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Mobile Loading */}
        <div className="md:hidden space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>

        {/* Desktop Loading */}
        <div className="hidden md:block overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.filter(col => !col.mobileOnly).map(col => (
                  <th key={col.key} className="px-6 py-3 text-left">
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[1, 2, 3].map(i => (
                <tr key={i}>
                  {columns.filter(col => !col.mobileOnly).map(col => (
                    <td key={col.key} className="px-6 py-4">
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
        <p className="mt-4 text-sm text-gray-600">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={cn('', className)}>
      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {data.map(row => (
          <div
            key={row[keyField]}
            onClick={() => onRowClick?.(row)}
            className={cn(
              'bg-white rounded-lg border border-gray-200 p-4 shadow-sm',
              onRowClick && 'cursor-pointer hover:shadow-md transition-shadow'
            )}
          >
            {mobileCardRender ? (
              mobileCardRender(row)
            ) : (
              <div className="space-y-2">
                {columns
                  .filter(col => !col.desktopOnly)
                  .map(col => (
                    <div key={col.key} className="flex justify-between items-start">
                      <span className="text-sm font-medium text-gray-600 min-w-[100px]">
                        {col.mobileLabel || col.label}:
                      </span>
                      <span className="text-sm text-gray-900 text-right flex-1">
                        {col.render ? col.render(row[col.key], row) : row[col.key]}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto rounded-lg shadow ring-1 ring-black ring-opacity-5">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns
                .filter(col => !col.mobileOnly)
                .map(col => (
                  <th
                    key={col.key}
                    onClick={() => col.sortable && handleSort(col.key)}
                    className={cn(
                      'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                      col.sortable && 'cursor-pointer hover:bg-gray-100',
                      col.className
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {col.label}
                      {col.sortable && sortColumn === col.key && (
                        <svg
                          className={cn(
                            'h-4 w-4 transition-transform',
                            sortDirection === 'desc' && 'rotate-180'
                          )}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 15l7-7 7 7"
                          />
                        </svg>
                      )}
                    </div>
                  </th>
                ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map(row => (
              <tr
                key={row[keyField]}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'hover:bg-gray-50',
                  onRowClick && 'cursor-pointer'
                )}
              >
                {columns
                  .filter(col => !col.mobileOnly)
                  .map(col => (
                    <td key={col.key} className={cn('px-6 py-4 whitespace-nowrap', col.className)}>
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
