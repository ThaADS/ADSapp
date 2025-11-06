/**
 * Accessibility Components Index
 * Central export file for all accessibility components and hooks
 */

// Provider and context
// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches

export {
  AccessibilityProvider,
  useAccessibility,
  withAccessibility,
  useKeyboardShortcuts,
} from './accessibility-provider'

// Skip links and utilities
export { SkipLinks, VisuallyHidden, LiveRegion, FocusIndicator } from './skip-links'

// Focus management
export { FocusTrap, ModalFocusTrap, useFocusManagement, useScopedKeyboard } from './focus-trap'

// ARIA helpers
export {
  AccessibleButton,
  AccessibleLink,
  AccessibleImage,
  AccessibleFormField,
  AccessibleTooltip,
  AccessibleProgressBar,
  AccessibleTabs,
  AccessibleDisclosure,
  AccessibleList,
} from './aria-helpers'

// Modal components
export { AccessibleModal, AccessibleConfirmDialog, useAccessibleModal } from './accessible-modal'

// Dropdown components
export { AccessibleDropdown, useAccessibleDropdown } from './accessible-dropdown'

// Form components
export {
  AccessibleInput,
  AccessibleTextarea,
  AccessibleCheckbox,
  AccessibleRadioGroup,
  AccessibleForm,
  useAccessibleForm,
} from './accessible-form'

// Preferences components
export { AccessibilityPreferences, AccessibilityQuickToggle } from './accessibility-preferences'

// Types
export type { AccessibilityState, AccessibilityAction } from './accessibility-provider'
