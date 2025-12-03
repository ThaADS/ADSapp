'use client'

/**
 * Skeleton Loading Components
 * Reusable skeleton loaders for consistent loading states throughout the app
 */

import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

/**
 * Base Skeleton component - animated pulse effect
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-gray-200', className)}
      {...props}
    />
  )
}

/**
 * Text Skeleton - for single lines of text
 */
export function SkeletonText({ className, ...props }: SkeletonProps) {
  return (
    <Skeleton className={cn('h-4 w-full', className)} {...props} />
  )
}

/**
 * Avatar Skeleton - circular loading state
 */
export function SkeletonAvatar({ className, ...props }: SkeletonProps) {
  return (
    <Skeleton className={cn('h-10 w-10 rounded-full', className)} {...props} />
  )
}

/**
 * Button Skeleton - for button placeholders
 */
export function SkeletonButton({ className, ...props }: SkeletonProps) {
  return (
    <Skeleton className={cn('h-10 w-24 rounded-md', className)} {...props} />
  )
}

/**
 * Card Skeleton - for card components
 */
export function SkeletonCard({ className, ...props }: SkeletonProps) {
  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white p-4', className)} {...props}>
      <div className="space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  )
}

/**
 * Chart Skeleton - for analytics charts
 */
export function SkeletonChart({ className, ...props }: SkeletonProps) {
  return (
    <div className={cn('h-64 w-full rounded-lg bg-gray-100', className)} {...props}>
      <div className="flex h-full flex-col items-center justify-center space-y-2 p-4">
        <Skeleton className="h-32 w-full rounded" />
        <div className="flex w-full justify-between">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-3 w-8" />
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Table Skeleton - for data tables
 */
export function SkeletonTable({ rows = 5, className, ...props }: SkeletonProps & { rows?: number }) {
  return (
    <div className={cn('w-full rounded-lg border border-gray-200 bg-white', className)} {...props}>
      {/* Header */}
      <div className="flex border-b border-gray-200 bg-gray-50 p-4">
        <Skeleton className="h-4 w-1/4 mr-4" />
        <Skeleton className="h-4 w-1/4 mr-4" />
        <Skeleton className="h-4 w-1/4 mr-4" />
        <Skeleton className="h-4 w-1/4" />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex border-b border-gray-100 p-4 last:border-b-0">
          <Skeleton className="h-4 w-1/4 mr-4" />
          <Skeleton className="h-4 w-1/4 mr-4" />
          <Skeleton className="h-4 w-1/4 mr-4" />
          <Skeleton className="h-4 w-1/4" />
        </div>
      ))}
    </div>
  )
}

/**
 * Conversation List Skeleton - for inbox conversation list
 */
export function SkeletonConversationList({ count = 5, className, ...props }: SkeletonProps & { count?: number }) {
  return (
    <div className={cn('space-y-2', className)} {...props}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3 rounded-lg border border-gray-200 bg-white p-4">
          <SkeletonAvatar />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  )
}

/**
 * Message List Skeleton - for chat messages
 */
export function SkeletonMessageList({ count = 6, className, ...props }: SkeletonProps & { count?: number }) {
  return (
    <div className={cn('space-y-4 p-4', className)} {...props}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn('flex', i % 2 === 0 ? 'justify-start' : 'justify-end')}
        >
          <div className={cn('max-w-[70%] space-y-2', i % 2 === 0 ? '' : 'items-end')}>
            <Skeleton className={cn('h-16 rounded-lg', i % 2 === 0 ? 'w-48' : 'w-40')} />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Stats Card Skeleton - for dashboard stat cards
 */
export function SkeletonStatsCard({ className, ...props }: SkeletonProps) {
  return (
    <div className={cn('rounded-lg border border-gray-200 bg-white p-6', className)} {...props}>
      <div className="space-y-3">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  )
}

/**
 * Dashboard Skeleton - full dashboard loading state
 */
export function SkeletonDashboard({ className, ...props }: SkeletonProps) {
  return (
    <div className={cn('space-y-6', className)} {...props}>
      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonStatsCard key={i} />
        ))}
      </div>
      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SkeletonChart />
        <SkeletonChart />
      </div>
      {/* Table */}
      <SkeletonTable rows={4} />
    </div>
  )
}

/**
 * Contact Card Skeleton - for contact lists
 */
export function SkeletonContactCard({ className, ...props }: SkeletonProps) {
  return (
    <div className={cn('flex items-center space-x-4 rounded-lg border border-gray-200 bg-white p-4', className)} {...props}>
      <SkeletonAvatar className="h-12 w-12" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  )
}

/**
 * Form Skeleton - for form loading states
 */
export function SkeletonForm({ fields = 4, className, ...props }: SkeletonProps & { fields?: number }) {
  return (
    <div className={cn('space-y-6', className)} {...props}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <div className="flex justify-end space-x-4 pt-4">
        <SkeletonButton />
        <SkeletonButton className="w-32" />
      </div>
    </div>
  )
}

/**
 * Profile Skeleton - for profile pages
 */
export function SkeletonProfile({ className, ...props }: SkeletonProps) {
  return (
    <div className={cn('space-y-6', className)} {...props}>
      <div className="flex items-center space-x-4">
        <SkeletonAvatar className="h-20 w-20" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <SkeletonForm fields={3} />
    </div>
  )
}

/**
 * Inbox Skeleton - complete inbox loading state
 */
export function SkeletonInbox({ className, ...props }: SkeletonProps) {
  return (
    <div className={cn('flex h-full', className)} {...props}>
      {/* Conversation List */}
      <div className="w-80 border-r border-gray-200 p-4">
        <Skeleton className="mb-4 h-10 w-full" /> {/* Search bar */}
        <SkeletonConversationList count={6} />
      </div>
      {/* Message Area */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <div className="flex items-center space-x-3 border-b border-gray-200 p-4">
          <SkeletonAvatar />
          <div className="space-y-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        {/* Messages */}
        <div className="flex-1">
          <SkeletonMessageList count={5} />
        </div>
        {/* Input */}
        <div className="border-t border-gray-200 p-4">
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  )
}
