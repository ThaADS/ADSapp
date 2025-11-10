'use client';

/**
 * Delay Node Configuration Modal
 *
 * Configure delay/wait duration and advanced scheduling options.
 */

import React, { useState } from 'react';
import { Clock } from 'lucide-react';
import { BaseConfigModal, FormSection, FormField } from './base-config-modal';
import type { DelayNodeData, DelayUnit } from '@/types/workflow';

// ============================================================================
// INTERFACES
// ============================================================================

export interface DelayConfigProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<DelayNodeData>) => void;
  initialData: DelayNodeData;
}

// ============================================================================
// DELAY CONFIG MODAL
// ============================================================================

export function DelayConfigModal({ isOpen, onClose, onSave, initialData }: DelayConfigProps) {
  const [formData, setFormData] = useState<DelayNodeData>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Validate form
   */
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.label) {
      newErrors.label = 'Label is required';
    }

    if (!formData.delayConfig.amount || formData.delayConfig.amount <= 0) {
      newErrors.amount = 'Delay amount must be greater than 0';
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

  /**
   * Calculate total delay in human-readable format
   */
  const getDelayDescription = () => {
    const { amount, unit } = formData.delayConfig;
    if (!amount) return '';

    let totalMinutes = 0;
    switch (unit) {
      case 'minutes':
        totalMinutes = amount;
        break;
      case 'hours':
        totalMinutes = amount * 60;
        break;
      case 'days':
        totalMinutes = amount * 24 * 60;
        break;
      case 'weeks':
        totalMinutes = amount * 7 * 24 * 60;
        break;
    }

    const days = Math.floor(totalMinutes / (24 * 60));
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
    const mins = totalMinutes % 60;

    const parts = [];
    if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
    if (mins > 0) parts.push(`${mins} minute${mins > 1 ? 's' : ''}`);

    return parts.join(', ');
  };

  return (
    <BaseConfigModal
      isOpen={isOpen}
      onClose={onClose}
      onSave={handleSave}
      title="Configure Delay"
      description="Set up the wait time before continuing workflow"
      icon={<Clock className="w-5 h-5 text-amber-600" />}
    >
      <div className="space-y-6">
        {/* Label */}
        <FormField label="Delay Label" required error={errors.label}>
          <input
            type="text"
            value={formData.label}
            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            placeholder="e.g., Wait 24 Hours"
          />
        </FormField>

        {/* Delay Duration */}
        <FormSection title="Delay Duration" description="How long should the workflow wait?">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Amount" required error={errors.amount}>
              <input
                type="number"
                min="1"
                value={formData.delayConfig.amount}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    delayConfig: { ...formData.delayConfig, amount: parseInt(e.target.value) || 0 },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                placeholder="1"
              />
            </FormField>

            <FormField label="Unit" required>
              <select
                value={formData.delayConfig.unit}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    delayConfig: { ...formData.delayConfig, unit: e.target.value as DelayUnit },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
              </select>
            </FormField>
          </div>

          {formData.delayConfig.amount > 0 && (
            <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="text-sm text-amber-900 dark:text-amber-100">
                Total delay: <span className="font-medium">{getDelayDescription()}</span>
              </div>
            </div>
          )}
        </FormSection>

        {/* Advanced Options */}
        <FormSection
          title="Advanced Options"
          description="Fine-tune when the delay should occur"
        >
          <div className="space-y-4">
            {/* Business Hours Only */}
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="businessHoursOnly"
                checked={formData.delayConfig.businessHoursOnly ?? false}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    delayConfig: {
                      ...formData.delayConfig,
                      businessHoursOnly: e.target.checked,
                    },
                  })
                }
                className="mt-0.5 w-4 h-4 text-amber-600 border-slate-300 rounded focus:ring-amber-500"
              />
              <div>
                <label htmlFor="businessHoursOnly" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Business hours only
                </label>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Only count delay during business hours (9 AM - 5 PM)
                </p>
              </div>
            </div>

            {/* Skip Weekends */}
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="skipWeekends"
                checked={formData.delayConfig.skipWeekends ?? false}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    delayConfig: {
                      ...formData.delayConfig,
                      skipWeekends: e.target.checked,
                    },
                  })
                }
                className="mt-0.5 w-4 h-4 text-amber-600 border-slate-300 rounded focus:ring-amber-500"
              />
              <div>
                <label htmlFor="skipWeekends" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Skip weekends
                </label>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Don't count Saturdays and Sundays in delay
                </p>
              </div>
            </div>

            {/* Specific Time */}
            <FormField
              label="Send at specific time (optional)"
              description="After the delay, send at this time of day"
            >
              <input
                type="time"
                value={formData.delayConfig.specificTime || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    delayConfig: { ...formData.delayConfig, specificTime: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </FormField>
          </div>
        </FormSection>

        {/* Example Timeline */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
          <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Example:</div>
          <div className="text-sm text-slate-900 dark:text-slate-100 space-y-1">
            <div>If contact enters at 2:00 PM today:</div>
            <div className="text-amber-600 dark:text-amber-400 font-medium">
              Next step will execute at approximately{' '}
              {formData.delayConfig.specificTime || '2:00 PM'}{' '}
              {formData.delayConfig.amount > 0 ? getDelayDescription() + ' from now' : ''}
            </div>
          </div>
        </div>
      </div>
    </BaseConfigModal>
  );
}
