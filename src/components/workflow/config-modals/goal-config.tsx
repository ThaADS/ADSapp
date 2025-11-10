'use client';

/**
 * Goal Node Configuration Modal
 *
 * Configure conversion goals and success tracking.
 */

import React, { useState } from 'react';
import { Target } from 'lucide-react';
import { BaseConfigModal, FormSection, FormField } from './base-config-modal';
import type { GoalNodeData } from '@/types/workflow';

// ============================================================================
// INTERFACES
// ============================================================================

export interface GoalConfigProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<GoalNodeData>) => void;
  initialData: GoalNodeData;
}

// ============================================================================
// GOAL CONFIG MODAL
// ============================================================================

export function GoalConfigModal({ isOpen, onClose, onSave, initialData }: GoalConfigProps) {
  const [formData, setFormData] = useState<GoalNodeData>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Validate form
   */
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.label) {
      newErrors.label = 'Label is required';
    }

    if (!formData.goalConfig.goalName) {
      newErrors.goalName = 'Goal name is required';
    }

    if (formData.goalConfig.goalType === 'revenue' && !formData.goalConfig.revenueAmount) {
      newErrors.revenueAmount = 'Revenue amount is required';
    }

    if (formData.goalConfig.notifyOnCompletion && !formData.goalConfig.notificationEmail) {
      newErrors.notificationEmail = 'Notification email is required when notifications are enabled';
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
      title="Configure Goal"
      description="Track conversion goals and workflow success"
      icon={<Target className="w-5 h-5 text-emerald-600" />}
    >
      <div className="space-y-6">
        {/* Label */}
        <FormField label="Goal Label" required error={errors.label}>
          <input
            type="text"
            value={formData.label}
            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            placeholder="e.g., Conversion Complete"
          />
        </FormField>

        {/* Goal Type */}
        <FormSection title="Goal Type" description="What type of goal is this?">
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'conversion', label: 'Conversion' },
              { value: 'engagement', label: 'Engagement' },
              { value: 'revenue', label: 'Revenue' },
              { value: 'custom', label: 'Custom' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() =>
                  setFormData({
                    ...formData,
                    goalConfig: {
                      ...formData.goalConfig,
                      goalType: option.value as any,
                    },
                  })
                }
                className={`
                  px-4 py-3 text-sm font-medium rounded-lg border-2 transition-all
                  ${
                    formData.goalConfig.goalType === option.value
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

        {/* Goal Details */}
        <FormSection title="Goal Details">
          <div className="space-y-4">
            <FormField label="Goal Name" required error={errors.goalName}>
              <input
                type="text"
                value={formData.goalConfig.goalName}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    goalConfig: { ...formData.goalConfig, goalName: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                placeholder="e.g., Trial Sign-up"
              />
            </FormField>

            <FormField label="Goal Description (optional)">
              <textarea
                value={formData.goalConfig.goalDescription || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    goalConfig: { ...formData.goalConfig, goalDescription: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                rows={2}
                placeholder="Describe what this goal represents..."
              />
            </FormField>
          </div>
        </FormSection>

        {/* Revenue-specific fields */}
        {formData.goalConfig.goalType === 'revenue' && (
          <FormSection title="Revenue Details">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Revenue Amount" required error={errors.revenueAmount}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.goalConfig.revenueAmount || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      goalConfig: {
                        ...formData.goalConfig,
                        revenueAmount: parseFloat(e.target.value) || 0,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  placeholder="0.00"
                />
              </FormField>

              <FormField label="Currency">
                <select
                  value={formData.goalConfig.currency || 'USD'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      goalConfig: { ...formData.goalConfig, currency: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="JPY">JPY (¥)</option>
                  <option value="CAD">CAD (C$)</option>
                  <option value="AUD">AUD (A$)</option>
                </select>
              </FormField>
            </div>
          </FormSection>
        )}

        {/* Custom metrics */}
        {formData.goalConfig.goalType === 'custom' && (
          <FormSection
            title="Custom Metrics"
            description="Add custom tracking metrics (optional)"
          >
            <FormField label="Custom Metrics (JSON format)">
              <textarea
                value={JSON.stringify(formData.goalConfig.customMetrics || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const metrics = JSON.parse(e.target.value);
                    setFormData({
                      ...formData,
                      goalConfig: { ...formData.goalConfig, customMetrics: metrics },
                    });
                  } catch {
                    // Invalid JSON, ignore
                  }
                }}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-sm"
                rows={4}
                placeholder={`{\n  "metric1": "value1",\n  "metric2": 123\n}`}
              />
            </FormField>
          </FormSection>
        )}

        {/* Tracking & Notifications */}
        <FormSection title="Tracking & Notifications">
          <div className="space-y-4">
            {/* Track in Analytics */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="trackInAnalytics"
                checked={formData.goalConfig.trackInAnalytics ?? true}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    goalConfig: { ...formData.goalConfig, trackInAnalytics: e.target.checked },
                  })
                }
                className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
              />
              <label htmlFor="trackInAnalytics" className="text-sm text-slate-700 dark:text-slate-300">
                Track in workflow analytics
              </label>
            </div>

            {/* Notify on Completion */}
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="notifyOnCompletion"
                checked={formData.goalConfig.notifyOnCompletion ?? false}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    goalConfig: { ...formData.goalConfig, notifyOnCompletion: e.target.checked },
                  })
                }
                className="mt-0.5 w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
              />
              <div className="flex-1">
                <label htmlFor="notifyOnCompletion" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Send notification when goal is reached
                </label>

                {formData.goalConfig.notifyOnCompletion && (
                  <div className="mt-2">
                    <FormField label="Notification Email" required error={errors.notificationEmail}>
                      <input
                        type="email"
                        value={formData.goalConfig.notificationEmail || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            goalConfig: { ...formData.goalConfig, notificationEmail: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        placeholder="admin@example.com"
                      />
                    </FormField>
                  </div>
                )}
              </div>
            </div>
          </div>
        </FormSection>

        {/* Goal Summary */}
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-800 rounded-lg">
          <div className="text-xs font-medium text-emerald-800 dark:text-emerald-200 mb-2">
            Goal Summary:
          </div>
          <div className="text-sm text-emerald-900 dark:text-emerald-100">
            <div className="font-medium">{formData.goalConfig.goalName || 'Unnamed Goal'}</div>
            <div className="text-xs mt-1 text-emerald-700 dark:text-emerald-300">
              Type: {formData.goalConfig.goalType}
              {formData.goalConfig.goalType === 'revenue' &&
                formData.goalConfig.revenueAmount &&
                ` • ${formData.goalConfig.currency || 'USD'} ${formData.goalConfig.revenueAmount.toFixed(2)}`}
            </div>
          </div>
        </div>
      </div>
    </BaseConfigModal>
  );
}
