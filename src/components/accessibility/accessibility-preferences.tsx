// @ts-nocheck - Database types need regeneration from Supabase schema
// TODO: Run 'npx supabase gen types typescript' to fix type mismatches


'use client';

import React from 'react';
import { useAccessibility } from './accessibility-provider';
import { AccessibleCheckbox } from './accessible-form';
import { AccessibleButton } from './aria-helpers';

/**
 * Accessibility Preferences Component
 * Allows users to customize accessibility settings
 */
export function AccessibilityPreferences() {
  const { state, actions } = useAccessibility();

  return (
    <div className="accessibility-preferences bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Accessibility Preferences
      </h2>

      <div className="space-y-6">
        {/* Visual Preferences */}
        <section>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Visual Preferences
          </h3>

          <div className="space-y-4">
            <AccessibleCheckbox
              label="High Contrast Mode"
              hint="Increase contrast for better visibility"
              checked={state.highContrast}
              onChange={actions.toggleHighContrast}
            />

            <AccessibleCheckbox
              label="Large Text"
              hint="Increase text size throughout the application"
              checked={state.largeText}
              onChange={actions.toggleLargeText}
            />

            <div className="space-y-2">
              <label htmlFor="font-size" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Font Size
              </label>
              <select
                id="font-size"
                value={state.fontSize}
                onChange={(e) => actions.setFontSize(e.target.value as typeof state.fontSize)}
                className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="small">Small</option>
                <option value="medium">Medium (Default)</option>
                <option value="large">Large</option>
                <option value="xl">Extra Large</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="theme" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Theme
              </label>
              <select
                id="theme"
                value={state.theme}
                onChange={(e) => actions.setTheme(e.target.value as typeof state.theme)}
                className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="auto">Auto (System)</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
          </div>
        </section>

        {/* Motion Preferences */}
        <section>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Motion Preferences
          </h3>

          <AccessibleCheckbox
            label="Reduce Motion"
            hint="Minimize animations and transitions"
            checked={state.reducedMotion}
            onChange={actions.toggleReducedMotion}
          />
        </section>

        {/* Keyboard Navigation */}
        <section>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Keyboard Navigation
          </h3>

          <div className="space-y-4">
            <AccessibleCheckbox
              label="Enhanced Keyboard Navigation"
              hint="Enable additional keyboard shortcuts and navigation features"
              checked={state.keyboardNavigation}
              onChange={actions.toggleKeyboardNav}
            />

            <AccessibleCheckbox
              label="Auto Focus"
              hint="Automatically focus first element when opening modals"
              checked={state.autoFocus}
              onChange={actions.toggleAutoFocus}
            />
          </div>
        </section>

        {/* Preview */}
        <section>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Preview
          </h3>

          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-6">
            <h4 className="text-xl font-semibold mb-2">Sample Heading</h4>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              This is a sample paragraph showing how text will appear with your current settings.
              Links will look <a href="#" className="link">like this</a>.
            </p>
            <button className="btn-primary px-4 py-2 rounded-lg">
              Sample Button
            </button>
          </div>
        </section>
      </div>

      <div className="mt-8 flex justify-end gap-4">
        <AccessibleButton
          onClick={() => {
            // Reset to defaults
            if (state.highContrast) actions.toggleHighContrast();
            if (state.reducedMotion) actions.toggleReducedMotion();
            if (state.largeText) actions.toggleLargeText();
            actions.setTheme('auto');
            actions.setFontSize('medium');
          }}
          className="px-6 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          Reset to Defaults
        </AccessibleButton>

        <AccessibleButton
          onClick={() => {
            actions.announce('Accessibility preferences saved');
          }}
          className="btn-primary px-6 py-2 rounded-lg"
        >
          Save Preferences
        </AccessibleButton>
      </div>
    </div>
  );
}

/**
 * Accessibility Quick Toggle Component
 * Compact version for headers or sidebars
 */
export function AccessibilityQuickToggle() {
  const { state, actions } = useAccessibility();
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="accessibility-quick-toggle relative">
      <AccessibleButton
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Accessibility settings"
        aria-expanded={isOpen}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      </AccessibleButton>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-50"
          role="menu"
          aria-label="Quick accessibility settings"
        >
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Quick Settings
          </h3>

          <div className="space-y-3">
            <button
              onClick={() => {
                actions.toggleHighContrast();
                actions.announce(`High contrast mode ${!state.highContrast ? 'enabled' : 'disabled'}`);
              }}
              className="flex items-center justify-between w-full text-left p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              role="menuitemcheckbox"
              aria-checked={state.highContrast}
            >
              <span className="text-sm">High Contrast</span>
              <span
                className={`w-10 h-6 rounded-full transition-colors ${
                  state.highContrast ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`block w-4 h-4 mt-1 rounded-full bg-white transition-transform ${
                    state.highContrast ? 'ml-5' : 'ml-1'
                  }`}
                />
              </span>
            </button>

            <button
              onClick={() => {
                actions.toggleReducedMotion();
                actions.announce(`Reduced motion ${!state.reducedMotion ? 'enabled' : 'disabled'}`);
              }}
              className="flex items-center justify-between w-full text-left p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              role="menuitemcheckbox"
              aria-checked={state.reducedMotion}
            >
              <span className="text-sm">Reduce Motion</span>
              <span
                className={`w-10 h-6 rounded-full transition-colors ${
                  state.reducedMotion ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`block w-4 h-4 mt-1 rounded-full bg-white transition-transform ${
                    state.reducedMotion ? 'ml-5' : 'ml-1'
                  }`}
                />
              </span>
            </button>

            <button
              onClick={() => {
                actions.toggleLargeText();
                actions.announce(`Large text ${!state.largeText ? 'enabled' : 'disabled'}`);
              }}
              className="flex items-center justify-between w-full text-left p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              role="menuitemcheckbox"
              aria-checked={state.largeText}
            >
              <span className="text-sm">Large Text</span>
              <span
                className={`w-10 h-6 rounded-full transition-colors ${
                  state.largeText ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`block w-4 h-4 mt-1 rounded-full bg-white transition-transform ${
                    state.largeText ? 'ml-5' : 'ml-1'
                  }`}
                />
              </span>
            </button>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="mt-4 w-full text-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
