'use client';

/**
 * Condition Node Configuration Modal
 *
 * Configure conditional branching logic with multiple conditions.
 */

import React, { useState } from 'react';
import { GitBranch, Plus, Trash2 } from 'lucide-react';
import { BaseConfigModal, FormSection, FormField } from './base-config-modal';
import type { ConditionNodeData, ConditionFieldType, ConditionOperator } from '@/types/workflow';

// ============================================================================
// INTERFACES
// ============================================================================

export interface ConditionConfigProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<ConditionNodeData>) => void;
  initialData: ConditionNodeData;
}

// ============================================================================
// CONDITION CONFIG MODAL
// ============================================================================

export function ConditionConfigModal({ isOpen, onClose, onSave, initialData }: ConditionConfigProps) {
  const [formData, setFormData] = useState<ConditionNodeData>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Validate form
   */
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.label) {
      newErrors.label = 'Label is required';
    }

    if (formData.conditionConfig.operator !== 'is_empty' && formData.conditionConfig.operator !== 'is_not_empty') {
      if (formData.conditionConfig.value === '' || formData.conditionConfig.value === null) {
        newErrors.value = 'Value is required for this operator';
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

  /**
   * Add additional condition
   */
  const addCondition = () => {
    const conditions = formData.conditionConfig.conditions || [];
    setFormData({
      ...formData,
      conditionConfig: {
        ...formData.conditionConfig,
        conditions: [
          ...conditions,
          {
            field: 'tag',
            operator: 'equals',
            value: '',
            logicalOperator: 'AND',
          },
        ],
      },
    });
  };

  /**
   * Remove condition
   */
  const removeCondition = (index: number) => {
    const conditions = formData.conditionConfig.conditions || [];
    setFormData({
      ...formData,
      conditionConfig: {
        ...formData.conditionConfig,
        conditions: conditions.filter((_, i) => i !== index),
      },
    });
  };

  return (
    <BaseConfigModal
      isOpen={isOpen}
      onClose={onClose}
      onSave={handleSave}
      title="Configure Condition"
      description="Set up branching logic based on contact data"
      icon={<GitBranch className="w-5 h-5 text-violet-600" />}
    >
      <div className="space-y-6">
        {/* Label */}
        <FormField label="Condition Label" required error={errors.label}>
          <input
            type="text"
            value={formData.label}
            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            placeholder="e.g., Check if Premium Customer"
          />
        </FormField>

        {/* Primary Condition */}
        <FormSection title="Primary Condition" description="The main condition to evaluate">
          <div className="space-y-4">
            <FormField label="Field">
              <select
                value={formData.conditionConfig.field}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    conditionConfig: {
                      ...formData.conditionConfig,
                      field: e.target.value as ConditionFieldType,
                    },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="tag">Tag</option>
                <option value="custom_field">Custom Field</option>
                <option value="last_message_date">Last Message Date</option>
                <option value="contact_status">Contact Status</option>
                <option value="contact_source">Contact Source</option>
              </select>
            </FormField>

            <FormField label="Operator">
              <select
                value={formData.conditionConfig.operator}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    conditionConfig: {
                      ...formData.conditionConfig,
                      operator: e.target.value as ConditionOperator,
                    },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="equals">Equals</option>
                <option value="not_equals">Not Equals</option>
                <option value="contains">Contains</option>
                <option value="not_contains">Does Not Contain</option>
                <option value="greater_than">Greater Than</option>
                <option value="less_than">Less Than</option>
                <option value="is_empty">Is Empty</option>
                <option value="is_not_empty">Is Not Empty</option>
              </select>
            </FormField>

            {formData.conditionConfig.operator !== 'is_empty' &&
              formData.conditionConfig.operator !== 'is_not_empty' && (
                <FormField label="Value" required error={errors.value}>
                  <input
                    type="text"
                    value={String(formData.conditionConfig.value)}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        conditionConfig: {
                          ...formData.conditionConfig,
                          value: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    placeholder="Enter comparison value..."
                  />
                </FormField>
              )}
          </div>
        </FormSection>

        {/* Additional Conditions */}
        <FormSection
          title="Additional Conditions (Optional)"
          description="Combine multiple conditions with AND/OR logic"
        >
          {formData.conditionConfig.conditions?.map((condition, index) => (
            <div key={index} className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <select
                  value={condition.logicalOperator}
                  onChange={(e) => {
                    const conditions = [...(formData.conditionConfig.conditions || [])];
                    conditions[index].logicalOperator = e.target.value as 'AND' | 'OR';
                    setFormData({
                      ...formData,
                      conditionConfig: { ...formData.conditionConfig, conditions },
                    });
                  }}
                  className="px-3 py-1 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="AND">AND</option>
                  <option value="OR">OR</option>
                </select>
                <button
                  onClick={() => removeCondition(index)}
                  className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <select
                  value={condition.field}
                  onChange={(e) => {
                    const conditions = [...(formData.conditionConfig.conditions || [])];
                    conditions[index].field = e.target.value as ConditionFieldType;
                    setFormData({
                      ...formData,
                      conditionConfig: { ...formData.conditionConfig, conditions },
                    });
                  }}
                  className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="tag">Tag</option>
                  <option value="custom_field">Custom Field</option>
                  <option value="last_message_date">Last Message Date</option>
                  <option value="contact_status">Contact Status</option>
                  <option value="contact_source">Contact Source</option>
                </select>

                <select
                  value={condition.operator}
                  onChange={(e) => {
                    const conditions = [...(formData.conditionConfig.conditions || [])];
                    conditions[index].operator = e.target.value as ConditionOperator;
                    setFormData({
                      ...formData,
                      conditionConfig: { ...formData.conditionConfig, conditions },
                    });
                  }}
                  className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="equals">Equals</option>
                  <option value="not_equals">Not Equals</option>
                  <option value="contains">Contains</option>
                  <option value="not_contains">Not Contains</option>
                  <option value="greater_than">Greater Than</option>
                  <option value="less_than">Less Than</option>
                  <option value="is_empty">Is Empty</option>
                  <option value="is_not_empty">Is Not Empty</option>
                </select>

                <input
                  type="text"
                  value={String(condition.value)}
                  onChange={(e) => {
                    const conditions = [...(formData.conditionConfig.conditions || [])];
                    conditions[index].value = e.target.value;
                    setFormData({
                      ...formData,
                      conditionConfig: { ...formData.conditionConfig, conditions },
                    });
                  }}
                  className="px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  placeholder="Value..."
                />
              </div>
            </div>
          ))}

          <button
            onClick={addCondition}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950 border-2 border-dashed border-violet-300 dark:border-violet-700 rounded-lg transition-colors w-full justify-center"
          >
            <Plus className="w-4 h-4" />
            Add Condition
          </button>
        </FormSection>

        {/* Condition Preview */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
          <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Condition Logic:</div>
          <div className="text-sm text-slate-900 dark:text-slate-100 font-mono">
            {formData.conditionConfig.field} {formData.conditionConfig.operator}{' '}
            {formData.conditionConfig.value}
            {formData.conditionConfig.conditions?.map((cond, i) => (
              <div key={i} className="mt-1">
                {cond.logicalOperator} {cond.field} {cond.operator} {cond.value}
              </div>
            ))}
          </div>
        </div>
      </div>
    </BaseConfigModal>
  );
}
