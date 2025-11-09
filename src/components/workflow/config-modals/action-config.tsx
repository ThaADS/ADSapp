'use client';

/**
 * Action Node Configuration Modal
 *
 * Configure actions like add/remove tags, update fields, notifications.
 */

import React, { useState } from 'react';
import { Tag } from 'lucide-react';
import { BaseConfigModal, FormSection, FormField } from './base-config-modal';
import type { ActionNodeData, ActionType } from '@/types/workflow';

// ============================================================================
// INTERFACES
// ============================================================================

export interface ActionConfigProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<ActionNodeData>) => void;
  initialData: ActionNodeData;
}

// ============================================================================
// ACTION CONFIG MODAL
// ============================================================================

export function ActionConfigModal({ isOpen, onClose, onSave, initialData }: ActionConfigProps) {
  const [formData, setFormData] = useState<ActionNodeData>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Validate form
   */
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.label) {
      newErrors.label = 'Label is required';
    }

    const { actionType } = formData.actionConfig;

    if ((actionType === 'add_tag' || actionType === 'remove_tag') && !formData.actionConfig.tagIds?.length) {
      newErrors.tags = 'At least one tag is required';
    }

    if (actionType === 'update_field' && !formData.actionConfig.fieldName) {
      newErrors.fieldName = 'Field name is required';
    }

    if ((actionType === 'add_to_list' || actionType === 'remove_from_list') && !formData.actionConfig.listId) {
      newErrors.listId = 'List selection is required';
    }

    if (actionType === 'send_notification' && !formData.actionConfig.notificationEmail) {
      newErrors.notificationEmail = 'Email is required';
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
      title="Configure Action"
      description="Set up actions to perform on contacts"
      icon={<Tag className="w-5 h-5 text-pink-600" />}
    >
      <div className="space-y-6">
        {/* Label */}
        <FormField label="Action Label" required error={errors.label}>
          <input
            type="text"
            value={formData.label}
            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            placeholder="e.g., Add Premium Tag"
          />
        </FormField>

        {/* Action Type */}
        <FormSection title="Action Type" description="What action should be performed?">
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'add_tag', label: 'Add Tag' },
              { value: 'remove_tag', label: 'Remove Tag' },
              { value: 'update_field', label: 'Update Field' },
              { value: 'add_to_list', label: 'Add to List' },
              { value: 'remove_from_list', label: 'Remove from List' },
              { value: 'send_notification', label: 'Send Notification' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() =>
                  setFormData({
                    ...formData,
                    actionConfig: {
                      ...formData.actionConfig,
                      actionType: option.value as ActionType,
                    },
                  })
                }
                className={`
                  px-4 py-3 text-sm font-medium rounded-lg border-2 transition-all
                  ${
                    formData.actionConfig.actionType === option.value
                      ? 'border-pink-500 bg-pink-50 dark:bg-pink-950 text-pink-700 dark:text-pink-300'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
                  }
                `}
              >
                {option.label}
              </button>
            ))}
          </div>
        </FormSection>

        {/* Action-specific configuration */}
        {(formData.actionConfig.actionType === 'add_tag' || formData.actionConfig.actionType === 'remove_tag') && (
          <FormField label="Tags" required error={errors.tags}>
            <input
              type="text"
              placeholder="Enter tag IDs (comma-separated)"
              value={formData.actionConfig.tagIds?.join(', ') || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  actionConfig: {
                    ...formData.actionConfig,
                    tagIds: e.target.value
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean),
                  },
                })
              }
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            />
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              Example: premium, vip, customer
            </p>
          </FormField>
        )}

        {formData.actionConfig.actionType === 'update_field' && (
          <div className="space-y-4">
            <FormField label="Field Name" required error={errors.fieldName}>
              <input
                type="text"
                value={formData.actionConfig.fieldName || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    actionConfig: { ...formData.actionConfig, fieldName: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                placeholder="e.g., status, plan, subscription_tier"
              />
            </FormField>
            <FormField label="Field Value" required>
              <input
                type="text"
                value={formData.actionConfig.fieldValue || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    actionConfig: { ...formData.actionConfig, fieldValue: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                placeholder="New value for the field"
              />
            </FormField>
          </div>
        )}

        {(formData.actionConfig.actionType === 'add_to_list' ||
          formData.actionConfig.actionType === 'remove_from_list') && (
          <FormField label="List" required error={errors.listId}>
            <select
              value={formData.actionConfig.listId || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  actionConfig: { ...formData.actionConfig, listId: e.target.value },
                })
              }
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="">Select a list...</option>
              <option value="list-1">Newsletter Subscribers</option>
              <option value="list-2">Premium Customers</option>
              <option value="list-3">Trial Users</option>
            </select>
          </FormField>
        )}

        {formData.actionConfig.actionType === 'send_notification' && (
          <div className="space-y-4">
            <FormField label="Notification Email" required error={errors.notificationEmail}>
              <input
                type="email"
                value={formData.actionConfig.notificationEmail || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    actionConfig: { ...formData.actionConfig, notificationEmail: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                placeholder="admin@example.com"
              />
            </FormField>
            <FormField label="Notification Message">
              <textarea
                value={formData.actionConfig.notificationMessage || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    actionConfig: { ...formData.actionConfig, notificationMessage: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                rows={3}
                placeholder="Contact has reached this point in the workflow..."
              />
            </FormField>
          </div>
        )}

        {/* Summary */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
          <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Action Summary:</div>
          <div className="text-sm text-slate-900 dark:text-slate-100">
            {formData.actionConfig.actionType === 'add_tag' && `Add tags: ${formData.actionConfig.tagIds?.join(', ') || 'None'}`}
            {formData.actionConfig.actionType === 'remove_tag' && `Remove tags: ${formData.actionConfig.tagIds?.join(', ') || 'None'}`}
            {formData.actionConfig.actionType === 'update_field' && `Set ${formData.actionConfig.fieldName || 'field'} to "${formData.actionConfig.fieldValue || ''}"`}
            {formData.actionConfig.actionType === 'add_to_list' && `Add to list: ${formData.actionConfig.listId || 'None'}`}
            {formData.actionConfig.actionType === 'remove_from_list' && `Remove from list: ${formData.actionConfig.listId || 'None'}`}
            {formData.actionConfig.actionType === 'send_notification' && `Notify ${formData.actionConfig.notificationEmail || 'no one'}`}
          </div>
        </div>
      </div>
    </BaseConfigModal>
  );
}
