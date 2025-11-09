'use client'

/**
 * Broadcast Review Step
 * Step 5: Review all settings before launching
 */

import {
  CheckCircleIcon,
  UserGroupIcon,
  ChatBubbleLeftIcon,
  CalendarIcon,
  TagIcon,
} from '@heroicons/react/24/outline'
import { BroadcastCampaignData } from '../broadcast-campaign-builder'

interface Props {
  data: BroadcastCampaignData
  onChange: (updates: Partial<BroadcastCampaignData>) => void
}

export function BroadcastReview({ data }: Props) {
  const getTargetingDescription = () => {
    if (data.targetingType === 'all') {
      return 'Alle contacten in de database'
    }
    if (data.targetingType === 'tags') {
      return `Contacten met tags: ${data.targetTags.join(', ')}`
    }
    if (data.targetingType === 'custom') {
      return `${data.customFilters.length} custom filter(s) toegepast`
    }
    if (data.targetingType === 'csv') {
      return `${data.csvContacts.length} contacten uit CSV upload`
    }
    return 'Niet ingesteld'
  }

  const getSchedulingDescription = () => {
    if (data.schedulingType === 'immediate') {
      return 'Direct versturen na bevestiging'
    }
    if (data.schedulingType === 'scheduled' && data.scheduledAt) {
      return new Date(data.scheduledAt).toLocaleString('nl-NL', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    }
    if (data.schedulingType === 'recurring' && data.recurringConfig) {
      const { frequency, interval, time } = data.recurringConfig
      if (frequency === 'daily') {
        return `Dagelijks om ${time}`
      }
      if (frequency === 'weekly') {
        const day =
          ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'][
            data.recurringConfig.dayOfWeek || 1
          ]
        return `Elke ${day} om ${time}`
      }
      if (frequency === 'monthly') {
        return `Elke ${data.recurringConfig.dayOfMonth}e van de maand om ${time}`
      }
    }
    return 'Niet ingesteld'
  }

  const getMessageTypeLabel = () => {
    if (data.messageType === 'text') return 'Tekstbericht'
    if (data.messageType === 'template') return 'WhatsApp Template'
    if (data.messageType === 'media') return 'Media Bericht'
    return 'Onbekend'
  }

  const reviewSections = [
    {
      title: 'Campagne Informatie',
      icon: CheckCircleIcon,
      items: [
        { label: 'Naam', value: data.name },
        { label: 'Beschrijving', value: data.description || '-' },
        {
          label: 'Type',
          value:
            data.type === 'one_time'
              ? 'Eenmalig'
              : data.type === 'scheduled'
              ? 'Gepland'
              : 'Terugkerend',
        },
      ],
    },
    {
      title: 'Doelgroep',
      icon: UserGroupIcon,
      items: [
        {
          label: 'Targeting Type',
          value:
            data.targetingType === 'all'
              ? 'Alle Contacten'
              : data.targetingType === 'tags'
              ? 'Op Tags'
              : data.targetingType === 'custom'
              ? 'Custom Filters'
              : 'CSV Upload',
        },
        { label: 'Details', value: getTargetingDescription() },
      ],
    },
    {
      title: 'Bericht',
      icon: ChatBubbleLeftIcon,
      items: [
        { label: 'Type', value: getMessageTypeLabel() },
        {
          label: data.messageType === 'template' ? 'Template ID' : 'Bericht',
          value:
            data.messageType === 'template'
              ? data.templateId || '-'
              : data.messageContent.substring(0, 100) +
                (data.messageContent.length > 100 ? '...' : ''),
        },
      ],
    },
    {
      title: 'Planning',
      icon: CalendarIcon,
      items: [
        {
          label: 'Type',
          value:
            data.schedulingType === 'immediate'
              ? 'Direct'
              : data.schedulingType === 'scheduled'
              ? 'Gepland'
              : 'Terugkerend',
        },
        { label: 'Details', value: getSchedulingDescription() },
        { label: 'Verzend Snelheid', value: `${data.settings.sendRateLimit} berichten/seconde` },
      ],
    },
  ]

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Controleer & Bevestig</h2>
        <p className="text-sm text-gray-500">
          Controleer alle instellingen voordat je de broadcast verstuurt
        </p>
      </div>

      {/* Review Sections */}
      <div className="space-y-4">
        {reviewSections.map((section, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <section.icon className="h-5 w-5 text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-900">{section.title}</h3>
            </div>
            <div className="space-y-3">
              {section.items.map((item, itemIndex) => (
                <div key={itemIndex} className="flex justify-between">
                  <span className="text-sm text-gray-500">{item.label}:</span>
                  <span className="text-sm text-gray-900 font-medium text-right max-w-md">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Tags Preview */}
      {data.targetingType === 'tags' && data.targetTags.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Geselecteerde Tags</h3>
          <div className="flex flex-wrap gap-2">
            {data.targetTags.map(tag => (
              <div
                key={tag}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
              >
                <TagIcon className="h-4 w-4" />
                {tag}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message Preview */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Bericht Preview</h3>
        <div className="bg-white rounded-lg p-4 shadow-sm max-w-md">
          {data.messageType === 'media' && data.mediaUrl && (
            <div className="mb-3">
              <div className="bg-gray-200 rounded-lg p-8 text-center text-gray-500 text-sm">
                📎 {data.mediaUrl}
              </div>
            </div>
          )}
          <p className="text-sm text-gray-900 whitespace-pre-wrap">
            {data.messageContent || 'Geen bericht ingesteld'}
          </p>
          {data.messageType === 'template' && data.templateId && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500">Template: {data.templateId}</p>
            </div>
          )}
        </div>
      </div>

      {/* Settings Summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Instellingen</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            {data.settings.trackOpens ? (
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
            ) : (
              <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
            )}
            <span className="text-sm text-gray-700">Volg Opens</span>
          </div>
          <div className="flex items-center gap-2">
            {data.settings.trackClicks ? (
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
            ) : (
              <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
            )}
            <span className="text-sm text-gray-700">Volg Clicks</span>
          </div>
          <div className="flex items-center gap-2">
            {data.settings.respectOptOuts ? (
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
            ) : (
              <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
            )}
            <span className="text-sm text-gray-700">Respecteer Opt-outs</span>
          </div>
        </div>
      </div>

      {/* Final Warning */}
      <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-6 w-6 text-yellow-600"
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
            <h3 className="text-sm font-semibold text-yellow-900">Controleer Voor Versturen</h3>
            <div className="mt-2 text-xs text-yellow-800">
              <ul className="list-disc list-inside space-y-1">
                <li>Controleer of de doelgroep correct is ingesteld</li>
                <li>Verifieer dat je bericht geen fouten bevat</li>
                <li>Test met een kleine groep contacten indien mogelijk</li>
                <li>Zorg dat je WhatsApp template goedgekeurd is (indien van toepassing)</li>
                <li>
                  {data.schedulingType === 'immediate'
                    ? 'LET OP: Dit bericht wordt direct verstuurd na bevestiging!'
                    : 'De campagne wordt ingepland volgens de ingestelde planning'}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Success Preview */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start">
          <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-900">Klaar om te Versturen</h3>
            <p className="mt-1 text-xs text-green-700">
              {data.schedulingType === 'immediate'
                ? 'Je broadcast wordt direct gestart na het klikken op "Verstuur Nu".'
                : data.schedulingType === 'scheduled'
                ? `Je broadcast wordt automatisch verstuurd op ${getSchedulingDescription()}.`
                : 'Je terugkerende broadcast wordt actief volgens het ingestelde schema.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
