'use client';

import { useState } from 'react';
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
} from '@heroicons/react/24/outline';

interface SettingsSection {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
}

const sections: SettingsSection[] = [
  {
    id: 'general',
    title: 'General Settings',
    description: 'Platform-wide configuration and preferences',
    icon: CogIcon,
  },
  {
    id: 'security',
    title: 'Security & Authentication',
    description: 'Security policies, authentication methods, and access control',
    icon: ShieldCheckIcon,
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Configure system notifications and alerts',
    icon: BellIcon,
  },
  {
    id: 'email',
    title: 'Email Configuration',
    description: 'Email service settings and templates',
    icon: EnvelopeIcon,
  },
  {
    id: 'api',
    title: 'API & Webhooks',
    description: 'API rate limits, webhook configurations, and integrations',
    icon: KeyIcon,
  },
  {
    id: 'infrastructure',
    title: 'Infrastructure',
    description: 'Database, caching, and performance settings',
    icon: ServerIcon,
  },
];

export function AdminSettings() {
  const [activeSection, setActiveSection] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // General Settings State
  const [platformName, setPlatformName] = useState('ADSapp');
  const [platformUrl, setPlatformUrl] = useState('https://adsapp.com');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [signupsEnabled, setSignupsEnabled] = useState(true);

  // Security Settings State
  const [enforceStrongPasswords, setEnforceStrongPasswords] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState('24');
  const [maxLoginAttempts, setMaxLoginAttempts] = useState('5');
  const [requireEmailVerification, setRequireEmailVerification] = useState(true);

  // Notification Settings State
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [slackNotifications, setSlackNotifications] = useState(false);
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('');

  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // In production, make actual API call to save settings
      // await fetch('/api/admin/settings', {
      //   method: 'PUT',
      //   body: JSON.stringify({ ... }),
      // });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'general':
        return (
          <div className="space-y-6">
            <div>
              <label htmlFor="platformName" className="block text-sm font-medium text-slate-900 mb-2">
                Platform Name
              </label>
              <input
                type="text"
                id="platformName"
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
                className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="platformUrl" className="block text-sm font-medium text-slate-900 mb-2">
                Platform URL
              </label>
              <input
                type="url"
                id="platformUrl"
                value={platformUrl}
                onChange={(e) => setPlatformUrl(e.target.value)}
                className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <h4 className="text-sm font-medium text-slate-900">Maintenance Mode</h4>
                <p className="text-sm text-slate-600">Temporarily disable access for all users</p>
              </div>
              <button
                type="button"
                onClick={() => setMaintenanceMode(!maintenanceMode)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 ${
                  maintenanceMode ? 'bg-emerald-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    maintenanceMode ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <h4 className="text-sm font-medium text-slate-900">New Signups Enabled</h4>
                <p className="text-sm text-slate-600">Allow new organizations to sign up</p>
              </div>
              <button
                type="button"
                onClick={() => setSignupsEnabled(!signupsEnabled)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 ${
                  signupsEnabled ? 'bg-emerald-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    signupsEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <h4 className="text-sm font-medium text-slate-900">Enforce Strong Passwords</h4>
                <p className="text-sm text-slate-600">Require minimum 12 characters with special characters</p>
              </div>
              <button
                type="button"
                onClick={() => setEnforceStrongPasswords(!enforceStrongPasswords)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 ${
                  enforceStrongPasswords ? 'bg-emerald-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    enforceStrongPasswords ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div>
              <label htmlFor="sessionTimeout" className="block text-sm font-medium text-slate-900 mb-2">
                Session Timeout (hours)
              </label>
              <input
                type="number"
                id="sessionTimeout"
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(e.target.value)}
                className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="maxLoginAttempts" className="block text-sm font-medium text-slate-900 mb-2">
                Max Login Attempts
              </label>
              <input
                type="number"
                id="maxLoginAttempts"
                value={maxLoginAttempts}
                onChange={(e) => setMaxLoginAttempts(e.target.value)}
                className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <h4 className="text-sm font-medium text-slate-900">Require Email Verification</h4>
                <p className="text-sm text-slate-600">Users must verify email before accessing the platform</p>
              </div>
              <button
                type="button"
                onClick={() => setRequireEmailVerification(!requireEmailVerification)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 ${
                  requireEmailVerification ? 'bg-emerald-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    requireEmailVerification ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <h4 className="text-sm font-medium text-slate-900">Email Notifications</h4>
                <p className="text-sm text-slate-600">Send system alerts via email</p>
              </div>
              <button
                type="button"
                onClick={() => setEmailNotifications(!emailNotifications)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 ${
                  emailNotifications ? 'bg-emerald-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    emailNotifications ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div>
                <h4 className="text-sm font-medium text-slate-900">Slack Notifications</h4>
                <p className="text-sm text-slate-600">Send system alerts to Slack</p>
              </div>
              <button
                type="button"
                onClick={() => setSlackNotifications(!slackNotifications)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2 ${
                  slackNotifications ? 'bg-emerald-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    slackNotifications ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {slackNotifications && (
              <div>
                <label htmlFor="slackWebhookUrl" className="block text-sm font-medium text-slate-900 mb-2">
                  Slack Webhook URL
                </label>
                <input
                  type="url"
                  id="slackWebhookUrl"
                  value={slackWebhookUrl}
                  onChange={(e) => setSlackWebhookUrl(e.target.value)}
                  placeholder="https://hooks.slack.com/services/..."
                  className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                />
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="text-center py-12">
            <CogIcon className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-2 text-sm font-medium text-slate-900">Coming Soon</h3>
            <p className="mt-1 text-sm text-slate-500">
              This section is under development.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Platform Settings</h2>
        <p className="mt-2 text-sm text-slate-600">
          Configure platform-wide settings and preferences
        </p>
      </div>

      {/* Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;

              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <div className="text-left">
                    <div className="font-medium">{section.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{section.description}</div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-sm ring-1 ring-slate-900/5">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">
                {sections.find((s) => s.id === activeSection)?.title}
              </h3>
            </div>
            <div className="p-6">
              {renderSectionContent()}
            </div>
            <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-slate-50 rounded-b-xl">
              {saveSuccess ? (
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
                  <CheckCircleIcon className="h-5 w-5" />
                  Settings saved successfully!
                </div>
              ) : (
                <div className="text-sm text-slate-600">
                  Make changes and click Save to apply
                </div>
              )}
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}