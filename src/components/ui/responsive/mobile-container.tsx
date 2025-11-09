/**
 * Mobile-First Responsive Container
 *
 * Smart container component that adapts to different screen sizes
 * with mobile-first approach
 */

import { cn } from '@/lib/responsive'

interface MobileContainerProps {
  children: React.ReactNode
  className?: string
  size?: 'default' | 'tight' | 'wide' | 'full' | 'noPadding'
  noPadding?: boolean
  as?: 'div' | 'section' | 'article' | 'main'
}

export function MobileContainer({
  children,
  className,
  size = 'default',
  noPadding = false,
  as: Component = 'div',
}: MobileContainerProps) {
  const baseClasses = {
    default: 'px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto',
    tight: 'px-2 sm:px-4 lg:px-6 max-w-7xl mx-auto',
    wide: 'px-4 sm:px-6 lg:px-8 max-w-screen-2xl mx-auto',
    full: 'px-4 sm:px-6 lg:px-8 w-full',
    noPadding: 'max-w-7xl mx-auto',
  }

  return (
    <Component className={cn(
      noPadding ? baseClasses.noPadding : baseClasses[size],
      className
    )}>
      {children}
    </Component>
  )
}

/**
 * Page Container - For full page layouts
 */
export function PageContainer({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('min-h-screen bg-gray-50', className)}>
      {children}
    </div>
  )
}

/**
 * Section Container - For page sections
 */
export function SectionContainer({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn('py-8 sm:py-12 lg:py-16', className)}>
      {children}
    </section>
  )
}
