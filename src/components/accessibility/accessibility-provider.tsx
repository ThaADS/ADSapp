'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';

// Accessibility state interface
interface AccessibilityState {
  // Visual preferences
  highContrast: boolean;
  reducedMotion: boolean;
  largeText: boolean;
  focusVisible: boolean;

  // Keyboard navigation
  keyboardNavigation: boolean;
  skipLinks: boolean;

  // Screen reader support
  announcements: string[];
  liveRegionPolite: string;
  liveRegionAssertive: string;

  // Theme preferences
  theme: 'light' | 'dark' | 'auto';
  fontSize: 'small' | 'medium' | 'large' | 'xl';

  // Navigation preferences
  autoFocus: boolean;
  tabTrapEnabled: boolean;
  currentFocusedElement: string | null;
}

// Actions
type AccessibilityAction =
  | { type: 'TOGGLE_HIGH_CONTRAST' }
  | { type: 'TOGGLE_REDUCED_MOTION' }
  | { type: 'TOGGLE_LARGE_TEXT' }
  | { type: 'SET_THEME'; payload: AccessibilityState['theme'] }
  | { type: 'SET_FONT_SIZE'; payload: AccessibilityState['fontSize'] }
  | { type: 'ANNOUNCE'; payload: string }
  | { type: 'SET_LIVE_REGION'; payload: { type: 'polite' | 'assertive'; message: string } }
  | { type: 'CLEAR_ANNOUNCEMENTS' }
  | { type: 'SET_FOCUS'; payload: string | null }
  | { type: 'TOGGLE_KEYBOARD_NAV' }
  | { type: 'TOGGLE_AUTO_FOCUS' }
  | { type: 'LOAD_PREFERENCES'; payload: Partial<AccessibilityState> };

// Initial state
const initialState: AccessibilityState = {
  highContrast: false,
  reducedMotion: false,
  largeText: false,
  focusVisible: true,
  keyboardNavigation: true,
  skipLinks: true,
  announcements: [],
  liveRegionPolite: '',
  liveRegionAssertive: '',
  theme: 'auto',
  fontSize: 'medium',
  autoFocus: true,
  tabTrapEnabled: false,
  currentFocusedElement: null
};

// Reducer
function accessibilityReducer(state: AccessibilityState, action: AccessibilityAction): AccessibilityState {
  switch (action.type) {
    case 'TOGGLE_HIGH_CONTRAST':
      return { ...state, highContrast: !state.highContrast };

    case 'TOGGLE_REDUCED_MOTION':
      return { ...state, reducedMotion: !state.reducedMotion };

    case 'TOGGLE_LARGE_TEXT':
      return { ...state, largeText: !state.largeText };

    case 'SET_THEME':
      return { ...state, theme: action.payload };

    case 'SET_FONT_SIZE':
      return { ...state, fontSize: action.payload };

    case 'ANNOUNCE':
      return {
        ...state,
        announcements: [...state.announcements, action.payload].slice(-5) // Keep last 5 announcements
      };

    case 'SET_LIVE_REGION':
      return {
        ...state,
        [action.payload.type === 'polite' ? 'liveRegionPolite' : 'liveRegionAssertive']: action.payload.message
      };

    case 'CLEAR_ANNOUNCEMENTS':
      return { ...state, announcements: [] };

    case 'SET_FOCUS':
      return { ...state, currentFocusedElement: action.payload };

    case 'TOGGLE_KEYBOARD_NAV':
      return { ...state, keyboardNavigation: !state.keyboardNavigation };

    case 'TOGGLE_AUTO_FOCUS':
      return { ...state, autoFocus: !state.autoFocus };

    case 'LOAD_PREFERENCES':
      return { ...state, ...action.payload };

    default:
      return state;
  }
}

// Context
interface AccessibilityContextType {
  state: AccessibilityState;
  actions: {
    toggleHighContrast: () => void;
    toggleReducedMotion: () => void;
    toggleLargeText: () => void;
    setTheme: (theme: AccessibilityState['theme']) => void;
    setFontSize: (size: AccessibilityState['fontSize']) => void;
    announce: (message: string) => void;
    setLiveRegion: (type: 'polite' | 'assertive', message: string) => void;
    clearAnnouncements: () => void;
    setFocus: (elementId: string | null) => void;
    toggleKeyboardNav: () => void;
    toggleAutoFocus: () => void;
  };
  utils: {
    getAriaLabel: (base: string, context?: string) => string;
    getFocusableElements: (container?: Element) => Element[];
    trapFocus: (container: Element) => () => void;
    manageFocus: (direction: 'next' | 'previous' | 'first' | 'last', container?: Element) => void;
  };
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

// Provider component
export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(accessibilityReducer, initialState);

  // Load saved preferences on mount
  useEffect(() => {
    const savedPreferences = localStorage.getItem('accessibility-preferences');
    if (savedPreferences) {
      try {
        const preferences = JSON.parse(savedPreferences);
        dispatch({ type: 'LOAD_PREFERENCES', payload: preferences });
      } catch (error) {
        console.warn('Failed to load accessibility preferences:', error);
      }
    }

    // Detect system preferences
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      dispatch({ type: 'TOGGLE_REDUCED_MOTION' });
    }

    const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleColorSchemeChange = (e: MediaQueryListEvent) => {
      if (state.theme === 'auto') {
        // Apply system theme when in auto mode
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
      }
    };

    colorSchemeQuery.addEventListener('change', handleColorSchemeChange);
    return () => colorSchemeQuery.removeEventListener('change', handleColorSchemeChange);
  }, []);

  // Save preferences when state changes
  useEffect(() => {
    const preferences = {
      highContrast: state.highContrast,
      reducedMotion: state.reducedMotion,
      largeText: state.largeText,
      theme: state.theme,
      fontSize: state.fontSize,
      keyboardNavigation: state.keyboardNavigation,
      autoFocus: state.autoFocus
    };

    localStorage.setItem('accessibility-preferences', JSON.stringify(preferences));
  }, [state.highContrast, state.reducedMotion, state.largeText, state.theme, state.fontSize, state.keyboardNavigation, state.autoFocus]);

  // Apply accessibility styles to document
  useEffect(() => {
    const root = document.documentElement;

    // High contrast
    if (state.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    // Reduced motion
    if (state.reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }

    // Large text
    if (state.largeText) {
      root.classList.add('large-text');
    } else {
      root.classList.remove('large-text');
    }

    // Font size
    root.setAttribute('data-font-size', state.fontSize);

    // Theme
    if (state.theme !== 'auto') {
      root.setAttribute('data-theme', state.theme);
    } else {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', isDark ? 'dark' : 'light');
    }
  }, [state.highContrast, state.reducedMotion, state.largeText, state.fontSize, state.theme]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!state.keyboardNavigation) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Tab navigation improvements
      if (e.key === 'Tab') {
        document.body.classList.add('keyboard-nav');
      }

      // Skip links activation
      if (e.key === 'Enter' && e.target instanceof HTMLElement && e.target.classList.contains('skip-link')) {
        e.preventDefault();
        const targetId = e.target.getAttribute('href')?.slice(1);
        if (targetId) {
          const target = document.getElementById(targetId);
          if (target) {
            target.focus();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }

      // Arrow key navigation for custom components
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        const activeElement = document.activeElement;
        if (activeElement?.getAttribute('role') === 'listbox' ||
            activeElement?.getAttribute('role') === 'menu' ||
            activeElement?.closest('[role="listbox"]') ||
            activeElement?.closest('[role="menu"]')) {
          handleArrowNavigation(e);
        }
      }

      // Escape key to close modals/dropdowns
      if (e.key === 'Escape') {
        const openModal = document.querySelector('[role="dialog"][aria-hidden="false"]');
        if (openModal) {
          const closeButton = openModal.querySelector('[aria-label*="close" i], [aria-label*="dismiss" i]') as HTMLElement;
          closeButton?.click();
        }
      }
    };

    const handleMouseDown = () => {
      document.body.classList.remove('keyboard-nav');
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [state.keyboardNavigation]);

  // Arrow key navigation handler
  const handleArrowNavigation = (e: KeyboardEvent) => {
    e.preventDefault();
    const container = (e.target as Element).closest('[role="listbox"], [role="menu"]');
    if (!container) return;

    const items = Array.from(container.querySelectorAll('[role="option"], [role="menuitem"]'));
    const currentIndex = items.indexOf(e.target as Element);

    let nextIndex = currentIndex;

    switch (e.key) {
      case 'ArrowDown':
        nextIndex = (currentIndex + 1) % items.length;
        break;
      case 'ArrowUp':
        nextIndex = currentIndex === 0 ? items.length - 1 : currentIndex - 1;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = items.length - 1;
        break;
    }

    if (nextIndex !== currentIndex) {
      (items[nextIndex] as HTMLElement)?.focus();
    }
  };

  // Actions
  const actions = {
    toggleHighContrast: useCallback(() => dispatch({ type: 'TOGGLE_HIGH_CONTRAST' }), []),
    toggleReducedMotion: useCallback(() => dispatch({ type: 'TOGGLE_REDUCED_MOTION' }), []),
    toggleLargeText: useCallback(() => dispatch({ type: 'TOGGLE_LARGE_TEXT' }), []),
    setTheme: useCallback((theme: AccessibilityState['theme']) => dispatch({ type: 'SET_THEME', payload: theme }), []),
    setFontSize: useCallback((size: AccessibilityState['fontSize']) => dispatch({ type: 'SET_FONT_SIZE', payload: size }), []),
    announce: useCallback((message: string) => dispatch({ type: 'ANNOUNCE', payload: message }), []),
    setLiveRegion: useCallback((type: 'polite' | 'assertive', message: string) =>
      dispatch({ type: 'SET_LIVE_REGION', payload: { type, message } }), []),
    clearAnnouncements: useCallback(() => dispatch({ type: 'CLEAR_ANNOUNCEMENTS' }), []),
    setFocus: useCallback((elementId: string | null) => dispatch({ type: 'SET_FOCUS', payload: elementId }), []),
    toggleKeyboardNav: useCallback(() => dispatch({ type: 'TOGGLE_KEYBOARD_NAV' }), []),
    toggleAutoFocus: useCallback(() => dispatch({ type: 'TOGGLE_AUTO_FOCUS' }), [])
  };

  // Utility functions
  const utils = {
    getAriaLabel: useCallback((base: string, context?: string): string => {
      const contextPart = context ? ` ${context}` : '';
      const statusPart = state.highContrast ? ' (High contrast mode)' : '';
      return `${base}${contextPart}${statusPart}`;
    }, [state.highContrast]),

    getFocusableElements: useCallback((container: Element = document.body): Element[] => {
      const focusableSelectors = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
        '[contenteditable="true"]'
      ].join(', ');

      return Array.from(container.querySelectorAll(focusableSelectors))
        .filter(el => {
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden';
        });
    }, []),

    trapFocus: useCallback((container: Element) => {
      const focusableElements = utils.getFocusableElements(container);
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              e.preventDefault();
              lastElement?.focus();
            }
          } else {
            if (document.activeElement === lastElement) {
              e.preventDefault();
              firstElement?.focus();
            }
          }
        }
      };

      container.addEventListener('keydown', handleKeyDown);

      // Auto-focus first element if enabled
      if (state.autoFocus && firstElement) {
        firstElement.focus();
      }

      return () => {
        container.removeEventListener('keydown', handleKeyDown);
      };
    }, [state.autoFocus, utils.getFocusableElements]),

    manageFocus: useCallback((direction: 'next' | 'previous' | 'first' | 'last', container: Element = document.body) => {
      const focusableElements = utils.getFocusableElements(container);
      const currentIndex = focusableElements.indexOf(document.activeElement as Element);

      let nextIndex: number;

      switch (direction) {
        case 'next':
          nextIndex = (currentIndex + 1) % focusableElements.length;
          break;
        case 'previous':
          nextIndex = currentIndex === 0 ? focusableElements.length - 1 : currentIndex - 1;
          break;
        case 'first':
          nextIndex = 0;
          break;
        case 'last':
          nextIndex = focusableElements.length - 1;
          break;
        default:
          return;
      }

      (focusableElements[nextIndex] as HTMLElement)?.focus();
    }, [utils.getFocusableElements])
  };

  const value: AccessibilityContextType = {
    state,
    actions,
    utils
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {/* Skip Links */}
      {state.skipLinks && (
        <div className="skip-links">
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          <a href="#navigation" className="skip-link">
            Skip to navigation
          </a>
        </div>
      )}

      {/* Live Regions for Screen Readers */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      >
        {state.liveRegionPolite}
      </div>

      <div
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        role="alert"
      >
        {state.liveRegionAssertive}
      </div>

      {/* Announcements for Screen Readers */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="sr-only"
        role="log"
      >
        {state.announcements.map((announcement, index) => (
          <div key={index}>{announcement}</div>
        ))}
      </div>

      {children}
    </AccessibilityContext.Provider>
  );
}

// Hook to use accessibility context
export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}

// HOC for adding accessibility features to components
export function withAccessibility<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    autoFocus?: boolean;
    trapFocus?: boolean;
    announceOnMount?: string;
  }
) {
  return function AccessibleComponent(props: P) {
    const { actions, utils } = useAccessibility();
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      if (options?.announceOnMount) {
        actions.announce(options.announceOnMount);
      }

      if (options?.trapFocus && containerRef.current) {
        return utils.trapFocus(containerRef.current);
      }
    }, [actions, utils]);

    return (
      <div ref={containerRef}>
        <Component {...props} />
      </div>
    );
  };
}

// Keyboard shortcut hook
export function useKeyboardShortcuts(shortcuts: Record<string, () => void>) {
  const { state } = useAccessibility();

  React.useEffect(() => {
    if (!state.keyboardNavigation) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = [
        e.ctrlKey && 'ctrl',
        e.metaKey && 'meta',
        e.altKey && 'alt',
        e.shiftKey && 'shift',
        e.key.toLowerCase()
      ].filter(Boolean).join('+');

      const handler = shortcuts[key];
      if (handler) {
        e.preventDefault();
        handler();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, state.keyboardNavigation]);
}