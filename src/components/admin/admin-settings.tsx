'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from '@/components/providers/translation-provider'
import {
  CogIcon,
  ShieldCheckIcon,
  BellIcon,
  EnvelopeIcon,
  KeyIcon,
  ServerIcon,
  GlobeAltIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline'


export function AdminSettings() {
  const t = useTranslations('admin')

  const sections = useMemo(() => [
    {
      id: 'general',
      title: t('settings.sections.general.title'),
      description: t('settings.sections.general.description'),
      icon: CogIcon,
    },
    {
      id: 'security',
      title: t('settings.sections.security.title'),
      description: t('settings.sections.security.description'),
      icon: ShieldCheckIcon,
    },
    {
      id: 'notifications',
      title: t('settings.sections.notifications.title'),
      description: t('settings.sections.notifications.description'),
      icon: BellIcon,
    },
    {
      id: 'email',
      title: t('settings.sections.email.title'),
      description: t('settings.sections.email.description'),
      icon: EnvelopeIcon,
    },
    {
      id: 'api',
      title: t('settings.sections.api.title'),
      description: t('settings.sections.api.description'),
      icon: KeyIcon,
    },
    {
      id: 'infrastructure',
      title: t('settings.sections.infrastructure.title'),
      description: t('settings.sections.infrastructure.description'),
      icon: ServerIcon,
    },
  ], [t])

  const [activeSection, setActiveSection] = useState('general')
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // General Settings State
  const [platformName, setPlatformName] = useState('ADSapp')
  const [platformUrl, setPlatformUrl] = useState('https://adsapp.com')
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [signupsEnabled, setSignupsEnabled] = useState(true)

  // Security Settings State
  const [enforceStrongPasswords, setEnforceStrongPasswords] = useState(true)
  const [sessionTimeout, setSessionTimeout] = useState('24')
  const [maxLoginAttempts, setMaxLoginAttempts] = useState('5')
  const [requireEmailVerification, setRequireEmailVerification] = useState(true)

  // Notification Settings State
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [slackNotifications, setSlackNotifications] = useState(false)
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('')

  const handleSave = async () => {
    setIsSaving(true)
    setSaveSuccess(false)

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))

      // In production, make actual API call to save settings
      // await fetch('/api/admin/settings', {
      //   method: 'PUT',
      //   body: JSON.stringify({ ... }),
      // });

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'general':
        return (
          <div className='space-y-6'>
            <div>
              <label
                htmlFor='platformName'
                className='mb-2 block text-sm font-medium text-slate-900'
              >
                {t('settings.fields.platformName')}
              </label>
              <input
                type='text'
                id='platformName'
                value={platformName}
                onChange={e => setPlatformName(e.target.value)}
                className='block w-full rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm'
              />
            </div>

            <div>
              <label
                htmlFor='platformUrl'
                className='mb-2 block text-sm font-medium text-slate-900'
              >
                {t('settings.fields.platformUrl')}
              </label>
              <input
                type='url'
                id='platformUrl'
                value={platformUrl}
                onChange={e => setPlatformUrl(e.target.value)}
                className='block w-full rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm'
              />
            </div>

            <div className='flex items-center justify-between rounded-lg bg-slate-50 p-4'>
              <div>
                <h4 className='text-sm font-medium text-slate-900'>{t('settings.fields.maintenanceMode')}</h4>
                <p className='text-sm text-slate-600'>{t('settings.fields.maintenanceModeDesc')}</p>
              </div>
              <button
                type='button'
                onClick={() => setMaintenanceMode(!maintenanceMode)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 focus:outline-none ${maintenanceMode ? 'bg-emerald-600' : 'bg-slate-200'
                  }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${maintenanceMode ? 'translate-x-5' : 'translate-x-0'
                    }`}
                />
              </button>
            </div>

            <div className='flex items-center justify-between rounded-lg bg-slate-50 p-4'>
              <div>
                <h4 className='text-sm font-medium text-slate-900'>{t('settings.fields.signupsEnabled')}</h4>
                <p className='text-sm text-slate-600'>{t('settings.fields.signupsEnabledDesc')}</p>
              </div>
              <button
                type='button'
                onClick={() => setSignupsEnabled(!signupsEnabled)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 focus:outline-none ${signupsEnabled ? 'bg-emerald-600' : 'bg-slate-200'
                  }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${signupsEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                />
              </button>
            </div>
          </div>
        )

      case 'security':
        return (
          <div className='space-y-6'>
            <div className='flex items-center justify-between rounded-lg bg-slate-50 p-4'>
              <div>
                <h4 className='text-sm font-medium text-slate-900'>{t('settings.fields.enforceStrongPasswords')}</h4>
                <p className='text-sm text-slate-600'>
                  {t('settings.fields.enforceStrongPasswordsDesc')}
                </p>
              </div>
              <button
                type='button'
                onClick={() => setEnforceStrongPasswords(!enforceStrongPasswords)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 focus:outline-none ${enforceStrongPasswords ? 'bg-emerald-600' : 'bg-slate-200'
                  }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enforceStrongPasswords ? 'translate-x-5' : 'translate-x-0'
                    }`}
                />
              </button>
            </div>

            <div>
              <label
                htmlFor='sessionTimeout'
                className='mb-2 block text-sm font-medium text-slate-900'
              >
                {t('settings.fields.sessionTimeout')}
              </label>
              <input
                type='number'
                id='sessionTimeout'
                value={sessionTimeout}
                onChange={e => setSessionTimeout(e.target.value)}
                className='block w-full rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm'
              />
            </div>

            <div>
              <label
                htmlFor='maxLoginAttempts'
                className='mb-2 block text-sm font-medium text-slate-900'
              >
                {t('settings.fields.maxLoginAttempts')}
              </label>
              <input
                type='number'
                id='maxLoginAttempts'
                value={maxLoginAttempts}
                onChange={e => setMaxLoginAttempts(e.target.value)}
                className='block w-full rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm'
              />
            </div>

            <div className='flex items-center justify-between rounded-lg bg-slate-50 p-4'>
              <div>
                <h4 className='text-sm font-medium text-slate-900'>{t('settings.fields.requireEmailVerification')}</h4>
                <p className='text-sm text-slate-600'>
                  {t('settings.fields.requireEmailVerificationDesc')}
                </p>
              </div>
              <button
                type='button'
                onClick={() => setRequireEmailVerification(!requireEmailVerification)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 focus:outline-none ${requireEmailVerification ? 'bg-emerald-600' : 'bg-slate-200'
                  }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${requireEmailVerification ? 'translate-x-5' : 'translate-x-0'
                    }`}
                />
              </button>
            </div>
          </div>
        )

      case 'notifications':
        return (
          <div className='space-y-6'>
            <div className='flex items-center justify-between rounded-lg bg-slate-50 p-4'>
              <div>
                <h4 className='text-sm font-medium text-slate-900'>{t('settings.fields.emailNotifications')}</h4>
                <p className='text-sm text-slate-600'>{t('settings.fields.emailNotificationsDesc')}</p>
              </div>
              <button
                type='button'
                onClick={() => setEmailNotifications(!emailNotifications)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 focus:outline-none ${emailNotifications ? 'bg-emerald-600' : 'bg-slate-200'
                  }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${emailNotifications ? 'translate-x-5' : 'translate-x-0'
                    }`}
                />
              </button>
            </div>

            <div className='flex items-center justify-between rounded-lg bg-slate-50 p-4'>
              <div>
                <h4 className='text-sm font-medium text-slate-900'>{t('settings.fields.slackNotifications')}</h4>
                <p className='text-sm text-slate-600'>{t('settings.fields.slackNotificationsDesc')}</p>
              </div>
              <button
                type='button'
                onClick={() => setSlackNotifications(!slackNotifications)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 focus:outline-none ${slackNotifications ? 'bg-emerald-600' : 'bg-slate-200'
                  }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${slackNotifications ? 'translate-x-5' : 'translate-x-0'
                    }`}
                />
              </button>
            </div>

            {slackNotifications && (
              <div>
                <label
                  htmlFor='slackWebhookUrl'
                  className='mb-2 block text-sm font-medium text-slate-900'
                >
                  {t('settings.fields.slackWebhookUrl')}
                </label>
                <input
                  type='url'
                  id='slackWebhookUrl'
                  value={slackWebhookUrl}
                  onChange={e => setSlackWebhookUrl(e.target.value)}
                  placeholder='https://hooks.slack.com/services/...'
                  className='block w-full rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm'
                />
              </div>
            )}
          </div>
        )

      default:
        return (
          <div className='py-12 text-center'>
            <CogIcon className='mx-auto h-12 w-12 text-slate-400' />
            <h3 className='mt-2 text-sm font-medium text-slate-900'>{t('settings.comingSoon')}</h3>
            <p className='mt-1 text-sm text-slate-500'>{t('settings.comingSoonDesc')}</p>
          </div>
        )
    }
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div>
        <h2 className='text-2xl font-bold text-slate-900'>{t('settings.title')}</h2>
        <p className='mt-2 text-sm text-slate-600'>
          {t('settings.subtitle')}
        </p>
      </div>

      {/* Layout */}
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-4'>
        {/* Sidebar Navigation */}
        <div className='lg:col-span-1'>
          <nav className='space-y-1'>
            {sections.map(section => {
              const Icon = section.icon
              const isActive = activeSection === section.id

              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex w-full items-start gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${isActive
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20'
                    : 'text-slate-700 hover:bg-slate-50'
                    }`}
                >
                  <Icon
                    className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`}
                  />
                  <div className='text-left'>
                    <div className='font-medium'>{section.title}</div>
                    <div className='mt-0.5 text-xs text-slate-500'>{section.description}</div>
                  </div>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Content Area */}
        <div className='lg:col-span-3'>
          <div className='rounded-xl bg-white shadow-sm ring-1 ring-slate-900/5'>
            <div className='border-b border-slate-200 p-6'>
              <h3 className='text-lg font-semibold text-slate-900'>
                {sections.find(s => s.id === activeSection)?.title}
              </h3>
            </div>
            <div className='p-6'>{renderSectionContent()}</div>
            <div className='flex items-center justify-between rounded-b-xl border-t border-slate-200 bg-slate-50 p-6'>
              {saveSuccess ? (
                <div className='flex items-center gap-2 text-sm font-medium text-emerald-600'>
                  <CheckCircleIcon className='h-5 w-5' />
                  {t('settings.saveSuccess')}
                </div>
              ) : (
                <div className='text-sm text-slate-600'>{t('settings.savePrompt')}</div>
              )}
              <button
                onClick={handleSave}
                disabled={isSaving}
                className='inline-flex items-center rounded-lg border border-transparent bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50'
              >
                {isSaving ? (
                  <>
                    <div className='mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white'></div>
                    {t('settings.saving')}
                  </>
                ) : (
                  t('settings.saveChanges')
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
