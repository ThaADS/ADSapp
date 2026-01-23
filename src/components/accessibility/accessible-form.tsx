'use client'

import React, { forwardRef, useId } from 'react'
import { useAccessibility } from './accessibility-provider'
import { VisuallyHidden } from './skip-links'

interface AccessibleInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string
  error?: string
  hint?: string
  hideLabel?: boolean
  id?: string
}

/**
 * Accessible Input Component
 * Includes proper label association, error handling, and ARIA attributes
 */
export const AccessibleInput = forwardRef<HTMLInputElement, AccessibleInputProps>(
  ({ label, error, hint, hideLabel, id: providedId, required, className = '', ...props }, ref) => {
    const generatedId = useId()
    const id = providedId || generatedId
    const errorId = `${id}-error`
    const hintId = `${id}-hint`

    const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ')

    const LabelWrapper = hideLabel ? VisuallyHidden : 'label'

    return (
      <div className='accessible-input-group mb-4'>
        <LabelWrapper
          htmlFor={id}
          className='mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300'
        >
          {label}
          {required && (
            <span className='ml-1 text-red-600 dark:text-red-400' aria-label='required'>
              *
            </span>
          )}
        </LabelWrapper>

        {hint && !error && (
          <p id={hintId} className='mb-2 text-sm text-gray-600 dark:text-gray-400'>
            {hint}
          </p>
        )}

        <input
          ref={ref}
          id={id}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={describedBy || undefined}
          className={`w-full rounded-lg border-2 px-4 py-2 transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none ${
            error
              ? 'border-red-500 focus:border-red-500'
              : 'border-gray-300 focus:border-blue-500 dark:border-gray-600'
          } ${className}`}
          {...props}
        />

        {error && (
          <p id={errorId} className='mt-2 text-sm text-red-600 dark:text-red-400' role='alert'>
            {error}
          </p>
        )}
      </div>
    )
  }
)

AccessibleInput.displayName = 'AccessibleInput'

interface AccessibleTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  label: string
  error?: string
  hint?: string
  hideLabel?: boolean
  id?: string
}

/**
 * Accessible Textarea Component
 */
export const AccessibleTextarea = forwardRef<HTMLTextAreaElement, AccessibleTextareaProps>(
  ({ label, error, hint, hideLabel, id: providedId, required, className = '', ...props }, ref) => {
    const generatedId = useId()
    const id = providedId || generatedId
    const errorId = `${id}-error`
    const hintId = `${id}-hint`

    const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ')

    const LabelWrapper = hideLabel ? VisuallyHidden : 'label'

    return (
      <div className='accessible-textarea-group mb-4'>
        <LabelWrapper
          htmlFor={id}
          className='mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300'
        >
          {label}
          {required && (
            <span className='ml-1 text-red-600 dark:text-red-400' aria-label='required'>
              *
            </span>
          )}
        </LabelWrapper>

        {hint && !error && (
          <p id={hintId} className='mb-2 text-sm text-gray-600 dark:text-gray-400'>
            {hint}
          </p>
        )}

        <textarea
          ref={ref}
          id={id}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={describedBy || undefined}
          className={`resize-vertical w-full rounded-lg border-2 px-4 py-2 transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none ${
            error
              ? 'border-red-500 focus:border-red-500'
              : 'border-gray-300 focus:border-blue-500 dark:border-gray-600'
          } ${className}`}
          {...props}
        />

        {error && (
          <p id={errorId} className='mt-2 text-sm text-red-600 dark:text-red-400' role='alert'>
            {error}
          </p>
        )}
      </div>
    )
  }
)

AccessibleTextarea.displayName = 'AccessibleTextarea'

interface AccessibleCheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'id'> {
  label: string
  error?: string
  hint?: string
  id?: string
}

/**
 * Accessible Checkbox Component
 */
export const AccessibleCheckbox = forwardRef<HTMLInputElement, AccessibleCheckboxProps>(
  ({ label, error, hint, id: providedId, required, className = '', ...props }, ref) => {
    const generatedId = useId()
    const id = providedId || generatedId
    const errorId = `${id}-error`
    const hintId = `${id}-hint`

    const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ')

    return (
      <div className='accessible-checkbox-group mb-4'>
        <div className='flex items-start'>
          <input
            ref={ref}
            type='checkbox'
            id={id}
            aria-required={required}
            aria-invalid={!!error}
            aria-describedby={describedBy || undefined}
            className={`mt-0.5 h-5 w-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-gray-600 ${className}`}
            {...props}
          />
          <label htmlFor={id} className='ml-3 block text-sm text-gray-700 dark:text-gray-300'>
            {label}
            {required && (
              <span className='ml-1 text-red-600 dark:text-red-400' aria-label='required'>
                *
              </span>
            )}
          </label>
        </div>

        {hint && !error && (
          <p id={hintId} className='mt-2 ml-8 text-sm text-gray-600 dark:text-gray-400'>
            {hint}
          </p>
        )}

        {error && (
          <p id={errorId} className='mt-2 ml-8 text-sm text-red-600 dark:text-red-400' role='alert'>
            {error}
          </p>
        )}
      </div>
    )
  }
)

AccessibleCheckbox.displayName = 'AccessibleCheckbox'

interface AccessibleRadioGroupProps {
  label: string
  name: string
  options: Array<{ value: string; label: string; disabled?: boolean }>
  value?: string
  onChange: (value: string) => void
  error?: string
  hint?: string
  required?: boolean
  orientation?: 'horizontal' | 'vertical'
}

/**
 * Accessible Radio Group Component
 */
export function AccessibleRadioGroup({
  label,
  name,
  options,
  value,
  onChange,
  error,
  hint,
  required,
  orientation = 'vertical',
}: AccessibleRadioGroupProps) {
  const groupId = useId()
  const errorId = `${groupId}-error`
  const hintId = `${groupId}-hint`

  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ')

  return (
    <fieldset
      className='accessible-radio-group mb-4'
      aria-required={required}
      aria-invalid={!!error}
      aria-describedby={describedBy || undefined}
    >
      <legend className='mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300'>
        {label}
        {required && (
          <span className='ml-1 text-red-600 dark:text-red-400' aria-label='required'>
            *
          </span>
        )}
      </legend>

      {hint && !error && (
        <p id={hintId} className='mb-2 text-sm text-gray-600 dark:text-gray-400'>
          {hint}
        </p>
      )}

      <div
        className={`flex ${orientation === 'horizontal' ? 'flex-row space-x-4' : 'flex-col space-y-2'}`}
      >
        {options.map(option => {
          const optionId = `${name}-${option.value}`

          return (
            <div key={option.value} className='flex items-center'>
              <input
                type='radio'
                id={optionId}
                name={name}
                value={option.value}
                checked={value === option.value}
                onChange={() => onChange(option.value)}
                disabled={option.disabled}
                className='h-5 w-5 border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-gray-600'
              />
              <label
                htmlFor={optionId}
                className={`ml-3 text-sm text-gray-700 dark:text-gray-300 ${
                  option.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                }`}
              >
                {option.label}
              </label>
            </div>
          )
        })}
      </div>

      {error && (
        <p id={errorId} className='mt-2 text-sm text-red-600 dark:text-red-400' role='alert'>
          {error}
        </p>
      )}
    </fieldset>
  )
}

interface AccessibleFormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  /**
   * Error summary for form validation
   */
  errors?: string[]

  /**
   * Form title for screen readers
   */
  ariaLabel?: string
}

/**
 * Accessible Form Container
 * Includes error summary and proper form structure
 */
export function AccessibleForm({
  children,
  errors,
  ariaLabel,
  onSubmit,
  className = '',
  ...props
}: AccessibleFormProps) {
  const { actions } = useAccessibility()
  const errorSummaryRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (errors && errors.length > 0) {
      // Announce errors to screen readers
      actions.setLiveRegion(
        'assertive',
        `Form has ${errors.length} error${errors.length > 1 ? 's' : ''}`
      )

      // Focus error summary
      errorSummaryRef.current?.focus()
    }
  }, [errors, actions])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (errors && errors.length > 0) {
      e.preventDefault()
      actions.announce(
        `Cannot submit form. Please fix ${errors.length} error${errors.length > 1 ? 's' : ''}`
      )
      return
    }

    if (onSubmit) {
      onSubmit(e)
    }
  }

  return (
    <form
      aria-label={ariaLabel}
      onSubmit={handleSubmit}
      className={`accessible-form ${className}`}
      noValidate
      {...props}
    >
      {errors && errors.length > 0 && (
        <div
          ref={errorSummaryRef}
          tabIndex={-1}
          role='alert'
          aria-labelledby='error-summary-title'
          className='mb-6 rounded-lg border-2 border-red-500 bg-red-50 p-4 focus:ring-2 focus:ring-red-500 focus:outline-none dark:bg-red-900/20'
        >
          <h2
            id='error-summary-title'
            className='mb-2 text-lg font-semibold text-red-800 dark:text-red-400'
          >
            There {errors.length === 1 ? 'is' : 'are'} {errors.length} error
            {errors.length > 1 ? 's' : ''} with your submission
          </h2>
          <ul className='list-inside list-disc space-y-1'>
            {errors.map((error, index) => (
              <li key={index} className='text-red-700 dark:text-red-300'>
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {children}
    </form>
  )
}

/**
 * Hook for managing form state with accessibility features
 */
export function useAccessibleForm<T extends Record<string, unknown>>(initialValues: T) {
  const [values, setValues] = React.useState<T>(initialValues)
  const [errors, setErrors] = React.useState<Partial<Record<keyof T, string>>>({})
  const [touched, setTouched] = React.useState<Partial<Record<keyof T, boolean>>>({})
  const { actions } = useAccessibility()

  const handleChange =
    (field: keyof T) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value =
        e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value
      setValues(prev => ({ ...prev, [field]: value }))

      // Clear error when user starts fixing it
      if (errors[field]) {
        setErrors(prev => {
          const newErrors = { ...prev }
          delete newErrors[field]
          return newErrors
        })
      }
    }

  const handleBlur = (field: keyof T) => () => {
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  const setError = (field: keyof T, message: string) => {
    setErrors(prev => ({ ...prev, [field]: message }))
    actions.announce(`Error on ${String(field)}: ${message}`)
  }

  const clearErrors = () => {
    setErrors({})
  }

  const reset = () => {
    setValues(initialValues)
    setErrors({})
    setTouched({})
  }

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    setError,
    clearErrors,
    reset,
    isValid: Object.keys(errors).length === 0,
  }
}
