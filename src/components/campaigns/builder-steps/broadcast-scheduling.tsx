'use client'

/**
 * Broadcast Scheduling Step
 * Step 4: Configure when messages should be sent
 */

import { ClockIcon, CalendarIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { BroadcastCampaignData } from '../broadcast-campaign-builder'

interface Props {
  data: BroadcastCampaignData
  onChange: (updates: Partial<BroadcastCampaignData>) => void
}

export function BroadcastScheduling({ data, onChange }: Props) {
  const schedulingOptions = [
    {
      id: 'immediate' as const,
      name: 'Direct Versturen',
      description: 'Begin onmiddellijk met versturen',
      icon: ClockIcon,
    },
    {
      id: 'scheduled' as const,
      name: 'Plannen voor Later',
      description: 'Kies een specifieke datum en tijd',
      icon: CalendarIcon,
    },
    {
      id: 'recurring' as const,
      name: 'Terugkerende Verzending',
      description: 'Verstuur regelmatig volgens een schema',
      icon: ArrowPathIcon,
    },
  ]

  const formatDateTimeLocal = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  const updateRecurringConfig = (updates: Partial<NonNullable<BroadcastCampaignData['recurringConfig']>>) => {
    onChange({
      recurringConfig: {
        ...data.recurringConfig,
        ...updates,
      } as BroadcastCampaignData['recurringConfig'],
    })
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Planning Instellen</h2>
        <p className="text-sm text-gray-500">Bepaal wanneer je broadcast verstuurd wordt</p>
      </div>

      {/* Scheduling Type Selection */}
      <div className="grid gap-4">
        {schedulingOptions.map(option => (
          <div
            key={option.id}
            onClick={() => onChange({ schedulingType: option.id })}
            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
              data.schedulingType === option.id
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start">
              <option.icon
                className={`h-6 w-6 ${
                  data.schedulingType === option.id ? 'text-blue-600' : 'text-gray-400'
                }`}
              />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-gray-900">{option.name}</h3>
                <p className="mt-1 text-xs text-gray-500">{option.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Immediate Scheduling */}
      {data.schedulingType === 'immediate' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <ClockIcon className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-900">Direct Verzenden</h3>
              <p className="mt-1 text-xs text-blue-700">
                De broadcast start zodra je op "Verstuur Nu" klikt. Berichten worden verzonden met
                een snelheid van {data.settings.sendRateLimit} berichten per seconde.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Scheduled */}
      {data.schedulingType === 'scheduled' && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Datum en Tijd <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={data.scheduledAt ? formatDateTimeLocal(data.scheduledAt) : ''}
              onChange={e => onChange({ scheduledAt: new Date(e.target.value) })}
              min={formatDateTimeLocal(new Date())}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Kies wanneer de broadcast verstuurd moet worden
            </p>
          </div>

          {data.scheduledAt && (
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-700">Gepland voor:</p>
              <p className="text-sm text-gray-900 mt-1">
                {new Date(data.scheduledAt).toLocaleString('nl-NL', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Recurring */}
      {data.schedulingType === 'recurring' && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Frequentie <span className="text-red-500">*</span>
            </label>
            <select
              value={data.recurringConfig?.frequency || 'daily'}
              onChange={e =>
                updateRecurringConfig({
                  frequency: e.target.value as 'daily' | 'weekly' | 'monthly',
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="daily">Dagelijks</option>
              <option value="weekly">Wekelijks</option>
              <option value="monthly">Maandelijks</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Interval <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">Elke</span>
              <input
                type="number"
                min="1"
                max="30"
                value={data.recurringConfig?.interval || 1}
                onChange={e => updateRecurringConfig({ interval: parseInt(e.target.value) })}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-sm text-gray-700">
                {data.recurringConfig?.frequency === 'daily'
                  ? 'dag(en)'
                  : data.recurringConfig?.frequency === 'weekly'
                  ? 'week/weken'
                  : 'maand(en)'}
              </span>
            </div>
          </div>

          {data.recurringConfig?.frequency === 'weekly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dag van de Week
              </label>
              <select
                value={data.recurringConfig?.dayOfWeek || 1}
                onChange={e => updateRecurringConfig({ dayOfWeek: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="1">Maandag</option>
                <option value="2">Dinsdag</option>
                <option value="3">Woensdag</option>
                <option value="4">Donderdag</option>
                <option value="5">Vrijdag</option>
                <option value="6">Zaterdag</option>
                <option value="0">Zondag</option>
              </select>
            </div>
          )}

          {data.recurringConfig?.frequency === 'monthly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dag van de Maand
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={data.recurringConfig?.dayOfMonth || 1}
                onChange={e => updateRecurringConfig({ dayOfMonth: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tijd <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={data.recurringConfig?.time || '09:00'}
              onChange={e => updateRecurringConfig({ time: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Preview */}
          {data.recurringConfig?.frequency && data.recurringConfig?.time && (
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-700">Schema:</p>
              <p className="text-sm text-gray-900 mt-1">
                {data.recurringConfig.frequency === 'daily' &&
                  `Dagelijks om ${data.recurringConfig.time}`}
                {data.recurringConfig.frequency === 'weekly' &&
                  `Elke ${
                    ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'][
                      data.recurringConfig.dayOfWeek || 1
                    ]
                  } om ${data.recurringConfig.time}`}
                {data.recurringConfig.frequency === 'monthly' &&
                  `Elke ${data.recurringConfig.dayOfMonth}e van de maand om ${data.recurringConfig.time}`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Rate Limiting */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Verzend Instellingen</h3>
        <div>
          <label className="block text-sm text-gray-700 mb-2">
            Verzend Snelheid (berichten per seconde)
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="10"
              max="200"
              step="10"
              value={data.settings.sendRateLimit}
              onChange={e =>
                onChange({
                  settings: {
                    ...data.settings,
                    sendRateLimit: parseInt(e.target.value),
                  },
                })
              }
              className="flex-1"
            />
            <span className="text-sm font-medium text-gray-900 w-16 text-right">
              {data.settings.sendRateLimit}/s
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            WhatsApp Business API standaard limiet is 80-200 berichten/seconde
          </p>
        </div>
      </div>

      {/* Warning for immediate sending */}
      {data.schedulingType === 'immediate' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-900">Let op</h3>
              <p className="mt-1 text-xs text-yellow-700">
                Direct versturen start onmiddellijk na bevestiging. Controleer alle instellingen
                zorgvuldig in de volgende stap voordat je bevestigt.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
