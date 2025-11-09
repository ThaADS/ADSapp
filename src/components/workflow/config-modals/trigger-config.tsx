'use client';

/**
 * Trigger Node Configuration Modal
 *
 * Configure trigger settings for workflow start conditions.
 */

import React, { useState } from 'react';
import { Zap } from 'lucide-react';
import { BaseConfigModal, FormSection, FormField } from './base-config-modal';
import type { TriggerNodeData, TriggerEventType } from '@/types/workflow';

// ============================================================================
// INTERFACES
// ============================================================================

export interface TriggerConfigProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<TriggerNodeData>) => void;
  initialData: TriggerNodeData;
}

// ============================================================================
// TRIGGER CONFIG MODAL
// ============================================================================

export function TriggerConfigModal({ isOpen, onClose, onSave, initialData }: TriggerConfigProps) {
  const [formData, setFormData] = useState<TriggerNodeData>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Handle trigger type change
   */
  const handleTriggerTypeChange = (triggerType: TriggerEventType) => {
    setFormData({
      ...formData,
      triggerType,
      triggerConfig: {}, // Reset config when type changes
    });
  };

  /**
   * Validate form
   */
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.label) {
      newErrors.label = 'Label is required';
    }

    if (formData.triggerType === 'tag_applied' && !formData.triggerConfig.tagIds?.length) {
      newErrors.tags = 'At least one tag must be selected';
    }

    if (formData.triggerType === 'date_time' && !formData.triggerConfig.scheduledDate) {
      newErrors.scheduledDate = 'Date is required';
    }

    if (formData.triggerType === 'webhook_received' && !formData.triggerConfig.webhookUrl) {
      newErrors.webhookUrl = 'Webhook URL is required';
    }

    if (formData.triggerType === 'custom_field_changed' && !formData.triggerConfig.fieldName) {
      newErrors.fieldName = 'Field name is required';
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
      title="Configure Trigger"
      description="Set up the event that will start this workflow"
      icon={<Zap className="w-5 h-5 text-emerald-600" />}
    >
      <div className="space-y-6">
        {/* Label */}
        <FormField label="Trigger Label" required error={errors.label}>
          <input
            type="text"
            value={formData.label}
            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            placeholder="e.g., New Contact Added"
          />
        </FormField>

        {/* Description */}
        <FormField label="Description (optional)">
          <textarea
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            rows={2}
            placeholder="Describe when this trigger should fire..."
          />
        </FormField>

        {/* Trigger Type */}
        <FormSection title="Trigger Event" description="When should this workflow start?">
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'contact_added', label: 'Contact Added' },
              { value: 'tag_applied', label: 'Tag Applied' },
              { value: 'webhook_received', label: 'Webhook' },
              { value: 'date_time', label: 'Scheduled' },
              { value: 'contact_replied', label: 'Contact Replied' },
              { value: 'custom_field_changed', label: 'Field Changed' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => handleTriggerTypeChange(option.value as TriggerEventType)}
                className={`
                  px-4 py-3 text-sm font-medium rounded-lg border-2 transition-all
                  ${
                    formData.triggerType === option.value
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
                  }
                `}
              >
                {option.label}
              </button>
            ))}
          </div>
        </FormSection>

        {/* Trigger-specific configuration */}
        {formData.triggerType === 'tag_applied' && (
          <FormField label="Tags" required error={errors.tags}>
            <input
              type="text"
              placeholder="Enter tag IDs (comma-separated)"
              value={formData.triggerConfig.tagIds?.join(', ') || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  triggerConfig: {
                    ...formData.triggerConfig,
                    tagIds: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                  },
                })
              }
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
          </FormField>
        )}

        {formData.triggerType === 'date_time' && (
          <div className="space-y-4">
            <FormField label="Date" required error={errors.scheduledDate}>
              <input
                type="date"
                value={formData.triggerConfig.scheduledDate || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    triggerConfig: { ...formData.triggerConfig, scheduledDate: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </FormField>
            <FormField label="Time">
              <input
                type="time"
                value={formData.triggerConfig.scheduledTime || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    triggerConfig: { ...formData.triggerConfig, scheduledTime: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </FormField>
            <FormField label="Timezone">
              <select
                value={formData.triggerConfig.timezone || 'UTC'}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    triggerConfig: { ...formData.triggerConfig, timezone: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
              </select>
            </FormField>
          </div>
        )}

        {formData.triggerType === 'webhook_received' && (
          <div className="space-y-4">
            <FormField label="Webhook URL" required error={errors.webhookUrl}>
              <input
                type="url"
                value={formData.triggerConfig.webhookUrl || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    triggerConfig: { ...formData.triggerConfig, webhookUrl: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                placeholder="https://example.com/webhook"
              />
            </FormField>
            <FormField label="Webhook Secret (optional)" description="For webhook verification">
              <input
                type="password"
                value={formData.triggerConfig.webhookSecret || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    triggerConfig: { ...formData.triggerConfig, webhookSecret: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                placeholder="Enter secret key..."
              />
            </FormField>
          </div>
        )}

        {formData.triggerType === 'custom_field_changed' && (
          <div className="space-y-4">
            <FormField label="Field Name" required error={errors.fieldName}>
              <input
                type="text"
                value={formData.triggerConfig.fieldName || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    triggerConfig: { ...formData.triggerConfig, fieldName: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                placeholder="e.g., status"
              />
            </FormField>
            <FormField label="Expected Value (optional)">
              <input
                type="text"
                value={formData.triggerConfig.fieldValue || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    triggerConfig: { ...formData.triggerConfig, fieldValue: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                placeholder="Leave empty to trigger on any change"
              />
            </FormField>
          </div>
        )}
      </div>
    </BaseConfigModal>
  );
}
