/**
 * Mobile Navigation Component
 *
 * Bottom navigation bar for mobile devices
 * Provides quick access to key sections
 */

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/responsive'

interface NavItem {
  name: string
  href: string
  icon: React.ReactNode
  badge?: number
}

interface MobileNavProps {
  items: NavItem[]
  className?: string
}

export function MobileBottomNav({ items, className }: MobileNavProps) {
  const pathname = usePathname()

  return (
    <nav
      className={cn(
        'md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg',
        className
      )}
    >
      <div className="grid grid-cols-4 gap-1 px-2 py-2" style={{ gridTemplateColumns: `repeat(${Math.min(items.length, 5)}, 1fr)` }}>
        {items.map(item => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-colors min-h-[60px]',
                isActive
                  ? 'text-emerald-600 bg-emerald-50'
                  : 'text-gray-600 hover:text-emerald-600 hover:bg-gray-50'
              )}
            >
              <div className="relative">
                <div className={cn('w-6 h-6', isActive && 'scale-110 transition-transform')}>
                  {item.icon}
                </div>
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-medium text-white">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className={cn(
                'mt-1 text-[11px] font-medium leading-tight text-center',
                isActive && 'font-semibold'
              )}>
                {item.name}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

/**
 * Mobile Header with Hamburger Menu
 */
interface MobileHeaderProps {
  title?: string
  onMenuClick?: () => void
  actions?: React.ReactNode
  showBackButton?: boolean
  onBackClick?: () => void
  className?: string
}

export function MobileHeader({
  title,
  onMenuClick,
  actions,
  showBackButton,
  onBackClick,
  className,
}: MobileHeaderProps) {
  return (
    <header
      className={cn(
        'md:hidden sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm',
        className
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 min-h-[56px]">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {showBackButton ? (
            <button
              onClick={onBackClick}
              className="flex-shrink-0 p-2 -ml-2 text-gray-600 hover:text-gray-900 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Go back"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          ) : onMenuClick ? (
            <button
              onClick={onMenuClick}
              className="flex-shrink-0 p-2 -ml-2 text-gray-600 hover:text-gray-900 min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Open menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          ) : null}

          {title && (
            <h1 className="text-lg font-semibold text-gray-900 truncate">
              {title}
            </h1>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </header>
  )
}

/**
 * Mobile Floating Action Button (FAB)
 */
interface MobileFABProps {
  onClick: () => void
  icon?: React.ReactNode
  label?: string
  position?: 'bottom-right' | 'bottom-center' | 'bottom-left'
  className?: string
}

export function MobileFAB({
  onClick,
  icon,
  label,
  position = 'bottom-right',
  className,
}: MobileFABProps) {
  const positionClasses = {
    'bottom-right': 'bottom-20 right-4',
    'bottom-center': 'bottom-20 left-1/2 -translate-x-1/2',
    'bottom-left': 'bottom-20 left-4',
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'md:hidden fixed z-40 flex items-center gap-2 px-4 py-3 min-h-[56px] rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 active:scale-95 transition-all',
        positionClasses[position],
        className
      )}
      aria-label={label || 'Action'}
    >
      {icon && <div className="w-6 h-6">{icon}</div>}
      {label && <span className="font-medium">{label}</span>}
    </button>
  )
}
