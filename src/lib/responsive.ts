/**
 * Mobile-First Responsive Utilities
 *
 * Provides helper functions, constants, and utilities for building
 * responsive mobile-first interfaces across ADSapp.
 */

// ==================== BREAKPOINTS ====================

export const breakpoints = {
  sm: '640px',   // Small devices (landscape phones)
  md: '768px',   // Medium devices (tablets)
  lg: '1024px',  // Large devices (desktops)
  xl: '1280px',  // Extra large devices
  '2xl': '1536px' // 2X Extra large devices
} as const

export const breakpointValues = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
} as const

// ==================== DEVICE DETECTION ====================

/**
 * Check if current viewport is mobile size (< 768px)
 */
export const isMobile = (): boolean => {
  if (typeof window === 'undefined') return false
  return window.innerWidth < breakpointValues.md
}

/**
 * Check if current viewport is tablet size (768px - 1024px)
 */
export const isTablet = (): boolean => {
  if (typeof window === 'undefined') return false
  return window.innerWidth >= breakpointValues.md && window.innerWidth < breakpointValues.lg
}

/**
 * Check if current viewport is desktop size (>= 1024px)
 */
export const isDesktop = (): boolean => {
  if (typeof window === 'undefined') return false
  return window.innerWidth >= breakpointValues.lg
}

/**
 * Check if device supports touch input
 */
export const isTouch = (): boolean => {
  if (typeof window === 'undefined') return false
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

/**
 * Get current device type
 */
export const getDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  if (isMobile()) return 'mobile'
  if (isTablet()) return 'tablet'
  return 'desktop'
}

// ==================== RESPONSIVE CLASSES ====================

/**
 * Responsive grid classes for common layouts
 */
export const responsiveGrid = {
  // 1 column on mobile, 2 on tablet, 3 on desktop, 4 on large screens
  default: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4',

  // 1 column on mobile, 2 on tablet+
  twoCol: 'grid grid-cols-1 md:grid-cols-2 gap-4',

  // 1 column on mobile, 3 on tablet+
  threeCol: 'grid grid-cols-1 md:grid-cols-3 gap-4',

  // 1 column on mobile, 2 on tablet, 4 on desktop
  fourCol: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4',

  // Stats grid (optimized for dashboard stats)
  stats: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4',

  // Card grid
  cards: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6',

  // List grid (single column on mobile, 2 on desktop)
  list: 'grid grid-cols-1 lg:grid-cols-2 gap-6',
} as const

/**
 * Responsive container classes
 */
export const responsiveContainer = {
  // Standard page container
  default: 'px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto',

  // Tight container (less padding)
  tight: 'px-2 sm:px-4 lg:px-6 max-w-7xl mx-auto',

  // Wide container
  wide: 'px-4 sm:px-6 lg:px-8 max-w-screen-2xl mx-auto',

  // Full width (no max-width)
  full: 'px-4 sm:px-6 lg:px-8 w-full',

  // No padding
  noPadding: 'max-w-7xl mx-auto',
} as const

/**
 * Responsive spacing classes
 */
export const responsiveSpacing = {
  // Section padding
  section: 'py-8 sm:py-12 lg:py-16',

  // Card padding
  card: 'p-4 sm:p-6',

  // Header padding
  header: 'px-4 sm:px-6 lg:px-8 py-4 sm:py-6',

  // Margin between sections
  marginY: 'my-6 sm:my-8 lg:my-12',

  // Gap between items
  gap: 'gap-4 sm:gap-6',
} as const

/**
 * Touch-optimized button classes
 */
export const touchButton = {
  // Minimum touch target size (44x44px)
  base: 'min-h-[44px] min-w-[44px]',

  // Small button (still touch-friendly)
  sm: 'min-h-[40px] min-w-[40px] px-3 py-2 text-sm',

  // Medium button
  md: 'min-h-[44px] min-w-[44px] px-4 py-2 text-base',

  // Large button
  lg: 'min-h-[48px] min-w-[48px] px-6 py-3 text-lg',

  // Icon button
  icon: 'min-h-[44px] min-w-[44px] p-2',
} as const

/**
 * Responsive text classes
 */
export const responsiveText = {
  // Page title
  pageTitle: 'text-2xl sm:text-3xl lg:text-4xl font-bold',

  // Section title
  sectionTitle: 'text-xl sm:text-2xl lg:text-3xl font-semibold',

  // Card title
  cardTitle: 'text-lg sm:text-xl font-semibold',

  // Body text (minimum 16px for readability)
  body: 'text-base sm:text-base', // Always at least 16px

  // Small text (but still readable)
  small: 'text-sm sm:text-sm', // Minimum 14px

  // Caption text
  caption: 'text-xs sm:text-xs',
} as const

// ==================== RESPONSIVE HELPERS ====================

/**
 * Hide on mobile, show on desktop
 */
export const hideOnMobile = 'hidden md:block'

/**
 * Show on mobile, hide on desktop
 */
export const showOnMobile = 'block md:hidden'

/**
 * Stack on mobile, row on desktop
 */
export const responsiveStack = 'flex flex-col md:flex-row'

/**
 * Reverse stack on mobile
 */
export const responsiveStackReverse = 'flex flex-col-reverse md:flex-row'

/**
 * Full width on mobile, auto on desktop
 */
export const responsiveWidth = 'w-full md:w-auto'

/**
 * Fixed height on desktop, auto on mobile
 */
export const responsiveHeight = 'h-auto md:h-screen'

// ==================== RESPONSIVE HOOKS ====================

/**
 * React hook for responsive breakpoint detection
 * Usage: const isMobileView = useMediaQuery('(max-width: 768px)')
 */
export const useMediaQuery = (query: string): boolean => {
  if (typeof window === 'undefined') return false

  const mediaQuery = window.matchMedia(query)
  const [matches, setMatches] = React.useState(mediaQuery.matches)

  React.useEffect(() => {
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [mediaQuery])

  return matches
}

/**
 * Hook to get current device type with reactivity
 */
export const useDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  const [deviceType, setDeviceType] = React.useState<'mobile' | 'tablet' | 'desktop'>(getDeviceType())

  React.useEffect(() => {
    const handleResize = () => {
      setDeviceType(getDeviceType())
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return deviceType
}

// ==================== TABLE RESPONSIVE PATTERNS ====================

/**
 * Classes for responsive tables
 */
export const responsiveTable = {
  // Hide table on mobile, show on desktop
  desktopOnly: 'hidden md:table',

  // Show card layout on mobile
  mobileCards: 'block md:hidden',

  // Horizontal scroll on mobile (for simple tables)
  scrollable: 'overflow-x-auto -mx-4 sm:mx-0',

  // Table wrapper
  wrapper: 'overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg',
} as const

// ==================== MODAL RESPONSIVE PATTERNS ====================

/**
 * Classes for responsive modals
 */
export const responsiveModal = {
  // Full screen on mobile, centered on desktop
  container: 'fixed inset-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2',

  // Modal sizing
  size: {
    sm: 'w-full h-full md:w-auto md:h-auto md:max-w-md md:rounded-lg',
    md: 'w-full h-full md:w-auto md:h-auto md:max-w-lg md:rounded-lg',
    lg: 'w-full h-full md:w-auto md:h-auto md:max-w-2xl md:rounded-lg',
    xl: 'w-full h-full md:w-auto md:h-auto md:max-w-4xl md:rounded-lg',
    full: 'w-full h-full md:w-auto md:h-auto md:max-w-7xl md:rounded-lg',
  },

  // Bottom sheet on mobile
  bottomSheet: 'fixed inset-x-0 bottom-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 rounded-t-2xl md:rounded-lg',
} as const

// ==================== UTILITY FUNCTIONS ====================

/**
 * Combine responsive classes conditionally
 */
export const cn = (...classes: (string | false | null | undefined)[]): string => {
  return classes.filter(Boolean).join(' ')
}

/**
 * Get responsive class based on device type
 */
export const getResponsiveClass = (
  mobile: string,
  tablet?: string,
  desktop?: string
): string => {
  const device = getDeviceType()

  if (device === 'mobile') return mobile
  if (device === 'tablet') return tablet || mobile
  return desktop || tablet || mobile
}

// Import React for hooks
import React from 'react'
