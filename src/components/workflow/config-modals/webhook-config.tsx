'use client';

/**
 * Webhook Node Configuration Modal
 *
 * Configure external API calls with authentication and response handling.
 */

import React, { useState } from 'react';
import { Webhook } from 'lucide-react';
import { BaseConfigModal, FormSection, FormField } from './base-config-modal';
import type { WebhookNodeData } from '@/types/workflow';

// ============================================================================
// INTERFACES
// ============================================================================

export interface WebhookConfigProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<WebhookNodeData>) => void;
  initialData: WebhookNodeData;
}

// ============================================================================
// WEBHOOK CONFIG MODAL
// ============================================================================

export function WebhookConfigModal({ isOpen, onClose, onSave, initialData }: WebhookConfigProps) {
  const [formData, setFormData] = useState<WebhookNodeData>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Validate form
   */
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.label) {
      newErrors.label = 'Label is required';
    }

    if (!formData.webhookConfig.url) {
      newErrors.url = 'Webhook URL is required';
    } else {
      try {
        new URL(formData.webhookConfig.url);
      } catch {
        newErrors.url = 'Invalid URL format';
      }
    }

    if (formData.webhookConfig.authType === 'bearer' && !formData.webhookConfig.authToken) {
      newErrors.authToken = 'Bearer token is required';
    }

    if (formData.webhookConfig.authType === 'basic') {
      if (!formData.webhookConfig.authUsername) {
        newErrors.authUsername = 'Username is required';
      }
      if (!formData.webhookConfig.authPassword) {
        newErrors.authPassword = 'Password is required';
      }
    }

    if (formData.webhookConfig.authType === 'api_key') {
      if (!formData.webhookConfig.authApiKey) {
        newErrors.authApiKey = 'API key is required';
      }
      if (!formData.webhookConfig.authApiKeyHeader) {
        newErrors.authApiKeyHeader = 'Header name is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle save
   */
  const handleSave = () => {
    if (validate()) {
      onSave(formData);
      onClose();
    }
  };

  return (
    <BaseConfigModal
      isOpen={isOpen}
      onClose={onClose}
      onSave={handleSave}
      title="Configure Webhook"
      description="Call external APIs and services"
      icon={<Webhook className="w-5 h-5 text-teal-600" />}
    >
      <div className="space-y-6">
        {/* Label */}
        <FormField label="Webhook Label" required error={errors.label}>
          <input
            type="text"
            value={formData.label}
            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            placeholder="e.g., Call CRM API"
          />
        </FormField>

        {/* Request Configuration */}
        <FormSection title="Request Configuration" description="Set up the HTTP request">
          <div className="space-y-4">
            <FormField label="HTTP Method" required>
              <select
                value={formData.webhookConfig.method}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    webhookConfig: {
                      ...formData.webhookConfig,
                      method: e.target.value as any,
                    },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
            </FormField>

            <FormField label="URL" required error={errors.url}>
              <input
                type="url"
                value={formData.webhookConfig.url}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    webhookConfig: { ...formData.webhookConfig, url: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                placeholder="https://api.example.com/endpoint"
              />
            </FormField>

            {formData.webhookConfig.method !== 'GET' && (
              <FormField label="Request Body (JSON)" description="Use {{variables}} for dynamic values">
                <textarea
                  value={formData.webhookConfig.body || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      webhookConfig: { ...formData.webhookConfig, body: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-sm"
                  rows={6}
                  placeholder={`{\n  "contact_id": "{{contactId}}",\n  "name": "{{firstName}}"\n}`}
                />
              </FormField>
            )}
          </div>
        </FormSection>

        {/* Authentication */}
        <FormSection title="Authentication" description="Secure your webhook calls">
          <div className="space-y-4">
            <FormField label="Authentication Type">
              <select
                value={formData.webhookConfig.authType || 'none'}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    webhookConfig: {
                      ...formData.webhookConfig,
                      authType: e.target.value as any,
                    },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="none">None</option>
                <option value="bearer">Bearer Token</option>
                <option value="basic">Basic Auth</option>
                <option value="api_key">API Key</option>
              </select>
            </FormField>

            {formData.webhookConfig.authType === 'bearer' && (
              <FormField label="Bearer Token" required error={errors.authToken}>
                <input
                  type="password"
                  value={formData.webhookConfig.authToken || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      webhookConfig: { ...formData.webhookConfig, authToken: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-sm"
                  placeholder="Enter bearer token..."
                />
              </FormField>
            )}

            {formData.webhookConfig.authType === 'basic' && (
              <>
                <FormField label="Username" required error={errors.authUsername}>
                  <input
                    type="text"
                    value={formData.webhookConfig.authUsername || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        webhookConfig: { ...formData.webhookConfig, authUsername: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    placeholder="Username"
                  />
                </FormField>
                <FormField label="Password" required error={errors.authPassword}>
                  <input
                    type="password"
                    value={formData.webhookConfig.authPassword || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        webhookConfig: { ...formData.webhookConfig, authPassword: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    placeholder="Password"
                  />
                </FormField>
              </>
            )}

            {formData.webhookConfig.authType === 'api_key' && (
              <>
                <FormField label="Header Name" required error={errors.authApiKeyHeader}>
                  <input
                    type="text"
                    value={formData.webhookConfig.authApiKeyHeader || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        webhookConfig: { ...formData.webhookConfig, authApiKeyHeader: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    placeholder="e.g., X-API-Key"
                  />
                </FormField>
                <FormField label="API Key" required error={errors.authApiKey}>
                  <input
                    type="password"
                    value={formData.webhookConfig.authApiKey || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        webhookConfig: { ...formData.webhookConfig, authApiKey: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-sm"
                    placeholder="Enter API key..."
                  />
                </FormField>
              </>
            )}
          </div>
        </FormSection>

        {/* Response Handling */}
        <FormSection title="Response Handling (Optional)" description="Save response data for later use">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="saveResponse"
                checked={formData.webhookConfig.saveResponse ?? false}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    webhookConfig: { ...formData.webhookConfig, saveResponse: e.target.checked },
                  })
                }
                className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
              />
              <label htmlFor="saveResponse" className="text-sm text-slate-700 dark:text-slate-300">
                Save response data
              </label>
            </div>

            {formData.webhookConfig.saveResponse && (
              <FormField label="Response Field Name" description="Where to store the response in workflow context">
                <input
                  type="text"
                  value={formData.webhookConfig.responseField || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      webhookConfig: { ...formData.webhookConfig, responseField: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  placeholder="e.g., crm_response"
                />
              </FormField>
            )}
          </div>
        </FormSection>

        {/* Retry Settings */}
        <FormSection title="Retry Settings" description="Handle failed webhook calls">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="retryOnFailure"
                checked={formData.webhookConfig.retryOnFailure ?? true}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    webhookConfig: { ...formData.webhookConfig, retryOnFailure: e.target.checked },
                  })
                }
                className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
              />
              <label htmlFor="retryOnFailure" className="text-sm text-slate-700 dark:text-slate-300">
                Retry on failure
              </label>
            </div>

            {formData.webhookConfig.retryOnFailure && (
              <FormField label="Max Retries">
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={formData.webhookConfig.maxRetries ?? 3}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      webhookConfig: {
                        ...formData.webhookConfig,
                        maxRetries: parseInt(e.target.value) || 3,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </FormField>
            )}
          </div>
        </FormSection>
      </div>
    </BaseConfigModal>
  );
}
