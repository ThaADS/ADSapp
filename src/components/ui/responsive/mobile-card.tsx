/**
 * Mobile-Optimized Card Component
 *
 * Responsive card that works well on all screen sizes
 * Full width on mobile, grid on desktop
 */

import { cn } from '@/lib/responsive'

interface MobileCardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  padding?: 'none' | 'sm' | 'md' | 'lg'
  shadow?: 'none' | 'sm' | 'md' | 'lg'
  border?: boolean
  hover?: boolean
}

export function MobileCard({
  children,
  className,
  onClick,
  padding = 'md',
  shadow = 'sm',
  border = true,
  hover = false,
}: MobileCardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8',
  }

  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-lg',
        border && 'border border-gray-200',
        paddingClasses[padding],
        shadowClasses[shadow],
        hover && 'hover:shadow-md transition-shadow',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  )
}

/**
 * Card Grid Container
 */
interface CardGridProps {
  children: React.ReactNode
  columns?: 1 | 2 | 3 | 4
  gap?: 'sm' | 'md' | 'lg'
  className?: string
}

export function CardGrid({
  children,
  columns = 3,
  gap = 'md',
  className,
}: CardGridProps) {
  const gridClasses = {
    1: 'grid grid-cols-1 gap-4',
    2: 'grid grid-cols-1 sm:grid-cols-2 gap-4',
    3: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4',
    4: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4',
  }

  const gapClasses = {
    sm: 'gap-3 sm:gap-4',
    md: 'gap-4 sm:gap-6',
    lg: 'gap-6 sm:gap-8',
  }

  // Replace the gap part in gridClasses
  const baseGrid = gridClasses[columns].replace(/gap-\d+/, gapClasses[gap])

  return (
    <div className={cn(baseGrid, className)}>
      {children}
    </div>
  )
}

/**
 * Card Header
 */
interface CardHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  className?: string
}

export function CardHeader({
  title,
  subtitle,
  actions,
  className,
}: CardHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4 mb-4', className)}>
      <div className="flex-1 min-w-0">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
          {title}
        </h3>
        {subtitle && (
          <p className="mt-1 text-sm text-gray-600">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  )
}

/**
 * Card Footer
 */
interface CardFooterProps {
  children: React.ReactNode
  className?: string
}

export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div className={cn('mt-4 pt-4 border-t border-gray-200', className)}>
      {children}
    </div>
  )
}
