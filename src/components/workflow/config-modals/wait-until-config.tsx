'use client';

/**
 * Wait Until Node Configuration Modal
 *
 * Configure event-based waiting with timeout options.
 */

import React, { useState } from 'react';
import { Clock } from 'lucide-react';
import { BaseConfigModal, FormSection, FormField } from './base-config-modal';
import type { WaitUntilNodeData, DelayUnit } from '@/types/workflow';

// ============================================================================
// INTERFACES
// ============================================================================

export interface WaitUntilConfigProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<WaitUntilNodeData>) => void;
  initialData: WaitUntilNodeData;
}

// ============================================================================
// WAIT UNTIL CONFIG MODAL
// ============================================================================

export function WaitUntilConfigModal({ isOpen, onClose, onSave, initialData }: WaitUntilConfigProps) {
  const [formData, setFormData] = useState<WaitUntilNodeData>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Validate form
   */
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.label) {
      newErrors.label = 'Label is required';
    }

    const { eventType } = formData.waitUntilConfig;

    if (eventType === 'tag_applied' && !formData.waitUntilConfig.tagId) {
      newErrors.tagId = 'Tag selection is required';
    }

    if (eventType === 'field_changed' && !formData.waitUntilConfig.fieldName) {
      newErrors.fieldName = 'Field name is required';
    }

    if (eventType === 'specific_date' && !formData.waitUntilConfig.date) {
      newErrors.date = 'Date is required';
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
      title="Configure Wait Until"
      description="Pause workflow until a specific event occurs"
      icon={<Clock className="w-5 h-5 text-cyan-600" />}
    >
      <div className="space-y-6">
        {/* Label */}
        <FormField label="Wait Until Label" required error={errors.label}>
          <input
            type="text"
            value={formData.label}
            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            placeholder="e.g., Wait for Tag Applied"
          />
        </FormField>

        {/* Event Type */}
        <FormSection title="Wait Event" description="What event should we wait for?">
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'tag_applied', label: 'Tag Applied' },
              { value: 'field_changed', label: 'Field Changed' },
              { value: 'message_received', label: 'Message Received' },
              { value: 'specific_date', label: 'Specific Date' },
              { value: 'webhook_received', label: 'Webhook' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() =>
                  setFormData({
                    ...formData,
                    waitUntilConfig: {
                      ...formData.waitUntilConfig,
                      eventType: option.value as any,
                    },
                  })
                }
                className={`
                  px-4 py-3 text-sm font-medium rounded-lg border-2 transition-all
                  ${
                    formData.waitUntilConfig.eventType === option.value
                      ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
                  }
                `}
              >
                {option.label}
              </button>
            ))}
          </div>
        </FormSection>

        {/* Event-specific configuration */}
        {formData.waitUntilConfig.eventType === 'tag_applied' && (
          <FormField label="Tag" required error={errors.tagId}>
            <input
              type="text"
              value={formData.waitUntilConfig.tagId || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  waitUntilConfig: { ...formData.waitUntilConfig, tagId: e.target.value },
                })
              }
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              placeholder="Enter tag ID"
            />
          </FormField>
        )}

        {formData.waitUntilConfig.eventType === 'field_changed' && (
          <div className="space-y-4">
            <FormField label="Field Name" required error={errors.fieldName}>
              <input
                type="text"
                value={formData.waitUntilConfig.fieldName || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    waitUntilConfig: { ...formData.waitUntilConfig, fieldName: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                placeholder="e.g., status"
              />
            </FormField>
            <FormField label="Expected Value (optional)" description="Wait for field to have this specific value">
              <input
                type="text"
                value={formData.waitUntilConfig.expectedValue || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    waitUntilConfig: { ...formData.waitUntilConfig, expectedValue: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                placeholder="Leave empty to wait for any change"
              />
            </FormField>
          </div>
        )}

        {formData.waitUntilConfig.eventType === 'specific_date' && (
          <div className="space-y-4">
            <FormField label="Date" required error={errors.date}>
              <input
                type="date"
                value={formData.waitUntilConfig.date || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    waitUntilConfig: { ...formData.waitUntilConfig, date: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </FormField>
            <FormField label="Time">
              <input
                type="time"
                value={formData.waitUntilConfig.time || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    waitUntilConfig: { ...formData.waitUntilConfig, time: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </FormField>
          </div>
        )}

        {formData.waitUntilConfig.eventType === 'webhook_received' && (
          <FormField label="Webhook URL">
            <input
              type="url"
              value={formData.waitUntilConfig.webhookUrl || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  waitUntilConfig: { ...formData.waitUntilConfig, webhookUrl: e.target.value },
                })
              }
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              placeholder="https://example.com/webhook"
            />
          </FormField>
        )}

        {/* Timeout Configuration */}
        <FormSection title="Timeout (Optional)" description="Continue after timeout if event doesn't occur">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="timeoutEnabled"
                checked={formData.waitUntilConfig.timeoutEnabled ?? false}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    waitUntilConfig: {
                      ...formData.waitUntilConfig,
                      timeoutEnabled: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 text-cyan-600 border-slate-300 rounded focus:ring-cyan-500"
              />
              <label htmlFor="timeoutEnabled" className="text-sm text-slate-700 dark:text-slate-300">
                Enable timeout
              </label>
            </div>

            {formData.waitUntilConfig.timeoutEnabled && (
              <div className="grid grid-cols-2 gap-4 pl-6">
                <FormField label="Timeout Amount">
                  <input
                    type="number"
                    min="1"
                    value={formData.waitUntilConfig.timeoutAmount || 1}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        waitUntilConfig: {
                          ...formData.waitUntilConfig,
                          timeoutAmount: parseInt(e.target.value) || 1,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </FormField>

                <FormField label="Timeout Unit">
                  <select
                    value={formData.waitUntilConfig.timeoutUnit || 'days'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        waitUntilConfig: {
                          ...formData.waitUntilConfig,
                          timeoutUnit: e.target.value as DelayUnit,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                  </select>
                </FormField>
              </div>
            )}
          </div>
        </FormSection>
      </div>
    </BaseConfigModal>
  );
}
