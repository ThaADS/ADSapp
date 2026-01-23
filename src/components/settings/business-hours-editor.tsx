'use client'

import { useState, useEffect } from 'react'
import { ClockIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface DayHours {
  enabled: boolean
  start: string
  end: string
}

interface BusinessHours {
  monday: DayHours
  tuesday: DayHours
  wednesday: DayHours
  thursday: DayHours
  friday: DayHours
  saturday: DayHours
  sunday: DayHours
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const

const DEFAULT_HOURS: BusinessHours = {
  monday: { enabled: true, start: '09:00', end: '17:00' },
  tuesday: { enabled: true, start: '09:00', end: '17:00' },
  wednesday: { enabled: true, start: '09:00', end: '17:00' },
  thursday: { enabled: true, start: '09:00', end: '17:00' },
  friday: { enabled: true, start: '09:00', end: '17:00' },
  saturday: { enabled: false, start: '09:00', end: '17:00' },
  sunday: { enabled: false, start: '09:00', end: '17:00' },
}

const TIME_OPTIONS = (() => {
  const options = []
  for (let hour = 0; hour < 24; hour++) {
    for (const minute of ['00', '30']) {
      const time = `${hour.toString().padStart(2, '0')}:${minute}`
      options.push(time)
    }
  }
  return options
})()

interface BusinessHoursEditorProps {
  organizationId: string
}

export function BusinessHoursEditor({ organizationId }: BusinessHoursEditorProps) {
  const [hours, setHours] = useState<BusinessHours>(DEFAULT_HOURS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    fetchBusinessHours()
  }, [])

  const fetchBusinessHours = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/organizations/business-hours')
      if (response.ok) {
        const data = await response.json()
        if (data.business_hours) {
          setHours(data.business_hours)
        }
      }
    } catch (err) {
      console.error('Failed to fetch business hours:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDayToggle = (day: keyof BusinessHours) => {
    setHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        enabled: !prev[day].enabled,
      },
    }))
    setHasChanges(true)
    setSuccess(false)
  }

  const handleTimeChange = (day: keyof BusinessHours, field: 'start' | 'end', value: string) => {
    setHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }))
    setHasChanges(true)
    setSuccess(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess(false)

    try {
      const response = await fetch('/api/organizations/business-hours', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ business_hours: hours }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to save')
      }

      setSuccess(true)
      setHasChanges(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save business hours')
    } finally {
      setSaving(false)
    }
  }

  const handleApplyToAll = (day: keyof BusinessHours) => {
    const template = hours[day]
    const updated = { ...hours }
    for (const d of DAYS) {
      updated[d] = { ...template }
    }
    setHours(updated)
    setHasChanges(true)
    setSuccess(false)
  }

  const formatTimeLabel = (time: string) => {
    const [hourStr, minute] = time.split(':')
    const hour = parseInt(hourStr)
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:${minute} ${period}`
  }

  if (loading) {
    return (
      <div className='rounded-lg border border-gray-200 bg-white p-6'>
        <div className='flex items-center justify-center py-8'>
          <div className='h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent'></div>
          <span className='ml-2 text-gray-500'>Loading business hours...</span>
        </div>
      </div>
    )
  }

  return (
    <div className='rounded-lg border border-gray-200 bg-white shadow-sm'>
      <div className='p-6'>
        <div className='flex items-center justify-between mb-6'>
          <div className='flex items-center gap-3'>
            <div className='flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100'>
              <ClockIcon className='h-5 w-5 text-emerald-600' />
            </div>
            <div>
              <h3 className='text-lg font-semibold text-gray-900'>Business Hours</h3>
              <p className='text-sm text-gray-500'>
                Set your availability for customers
              </p>
            </div>
          </div>
          {hasChanges && (
            <span className='text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded'>
              Unsaved changes
            </span>
          )}
        </div>

        <div className='space-y-4'>
          {DAYS.map(day => (
            <div
              key={day}
              className={`flex items-center gap-4 rounded-lg border p-4 transition-colors ${
                hours[day].enabled
                  ? 'border-gray-200 bg-white'
                  : 'border-gray-100 bg-gray-50'
              }`}
            >
              {/* Day Toggle */}
              <button
                onClick={() => handleDayToggle(day)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                  hours[day].enabled ? 'bg-emerald-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    hours[day].enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>

              {/* Day Name */}
              <span
                className={`w-24 text-sm font-medium capitalize ${
                  hours[day].enabled ? 'text-gray-900' : 'text-gray-400'
                }`}
              >
                {day}
              </span>

              {/* Time Selectors */}
              {hours[day].enabled ? (
                <div className='flex items-center gap-2 flex-1'>
                  <select
                    value={hours[day].start}
                    onChange={e => handleTimeChange(day, 'start', e.target.value)}
                    className='rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500'
                  >
                    {TIME_OPTIONS.map(time => (
                      <option key={time} value={time}>
                        {formatTimeLabel(time)}
                      </option>
                    ))}
                  </select>

                  <span className='text-gray-400'>to</span>

                  <select
                    value={hours[day].end}
                    onChange={e => handleTimeChange(day, 'end', e.target.value)}
                    className='rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500'
                  >
                    {TIME_OPTIONS.map(time => (
                      <option key={time} value={time}>
                        {formatTimeLabel(time)}
                      </option>
                    ))}
                  </select>

                  {/* Apply to all button */}
                  <button
                    onClick={() => handleApplyToAll(day)}
                    className='ml-2 text-xs text-emerald-600 hover:text-emerald-700 hover:underline'
                    title='Apply these hours to all days'
                  >
                    Apply to all
                  </button>
                </div>
              ) : (
                <span className='text-sm text-gray-400 flex-1'>Closed</span>
              )}
            </div>
          ))}
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className='mt-4 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3'>
            <XMarkIcon className='h-5 w-5 text-red-600' />
            <span className='text-sm text-red-700'>{error}</span>
          </div>
        )}

        {success && (
          <div className='mt-4 flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 p-3'>
            <CheckIcon className='h-5 w-5 text-green-600' />
            <span className='text-sm text-green-700'>Business hours saved successfully!</span>
          </div>
        )}

        {/* Save Button */}
        <div className='mt-6 flex justify-end'>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className='rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {saving ? 'Saving...' : 'Save Business Hours'}
          </button>
        </div>

        {/* Info Text */}
        <p className='mt-4 text-xs text-gray-500'>
          Business hours are used for auto-responders, routing, and analytics. Outside business hours,
          automated messages can inform customers of your availability.
        </p>
      </div>
    </div>
  )
}
