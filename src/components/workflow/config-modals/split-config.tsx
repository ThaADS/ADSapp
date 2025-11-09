'use client';

/**
 * Split Node Configuration Modal
 *
 * Configure A/B testing and traffic splitting.
 */

import React, { useState } from 'react';
import { GitMerge, Plus, Trash2 } from 'lucide-react';
import { BaseConfigModal, FormSection, FormField } from './base-config-modal';
import type { SplitNodeData } from '@/types/workflow';

// ============================================================================
// INTERFACES
// ============================================================================

export interface SplitConfigProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<SplitNodeData>) => void;
  initialData: SplitNodeData;
}

// ============================================================================
// SPLIT CONFIG MODAL
// ============================================================================

export function SplitConfigModal({ isOpen, onClose, onSave, initialData }: SplitConfigProps) {
  const [formData, setFormData] = useState<SplitNodeData>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Validate form
   */
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.label) {
      newErrors.label = 'Label is required';
    }

    // Validate percentage split adds up to 100%
    if (formData.splitConfig.splitType === 'percentage' || formData.splitConfig.splitType === 'random') {
      const total = formData.splitConfig.branches.reduce((sum, b) => sum + b.percentage, 0);
      if (Math.abs(total - 100) > 0.01) {
        newErrors.percentage = `Total percentage must equal 100% (currently ${total.toFixed(1)}%)`;
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
   * Add branch
   */
  const addBranch = () => {
    const branches = [...formData.splitConfig.branches];
    branches.push({
      id: `branch_${Date.now()}`,
      label: `Branch ${branches.length + 1}`,
      percentage: 0,
    });
    setFormData({
      ...formData,
      splitConfig: { ...formData.splitConfig, branches },
    });
  };

  /**
   * Remove branch
   */
  const removeBranch = (index: number) => {
    if (formData.splitConfig.branches.length <= 2) return; // Keep at least 2 branches
    const branches = formData.splitConfig.branches.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      splitConfig: { ...formData.splitConfig, branches },
    });
  };

  /**
   * Update branch percentage
   */
  const updateBranchPercentage = (index: number, percentage: number) => {
    const branches = [...formData.splitConfig.branches];
    branches[index].percentage = Math.max(0, Math.min(100, percentage));
    setFormData({
      ...formData,
      splitConfig: { ...formData.splitConfig, branches },
    });
  };

  /**
   * Distribute percentages evenly
   */
  const distributeEvenly = () => {
    const branches = [...formData.splitConfig.branches];
    const evenPercentage = 100 / branches.length;
    branches.forEach((branch) => {
      branch.percentage = Math.round(evenPercentage * 10) / 10;
    });
    setFormData({
      ...formData,
      splitConfig: { ...formData.splitConfig, branches },
    });
  };

  return (
    <BaseConfigModal
      isOpen={isOpen}
      onClose={onClose}
      onSave={handleSave}
      title="Configure Split"
      description="Set up A/B testing and traffic distribution"
      icon={<GitMerge className="w-5 h-5 text-indigo-600" />}
    >
      <div className="space-y-6">
        {/* Label */}
        <FormField label="Split Label" required error={errors.label}>
          <input
            type="text"
            value={formData.label}
            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            placeholder="e.g., A/B Test Message Variants"
          />
        </FormField>

        {/* Split Type */}
        <FormSection title="Split Type" description="How should contacts be distributed?">
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'random', label: 'Random' },
              { value: 'percentage', label: 'Percentage' },
              { value: 'field_based', label: 'Field-Based' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() =>
                  setFormData({
                    ...formData,
                    splitConfig: {
                      ...formData.splitConfig,
                      splitType: option.value as any,
                    },
                  })
                }
                className={`
                  px-4 py-3 text-sm font-medium rounded-lg border-2 transition-all
                  ${
                    formData.splitConfig.splitType === option.value
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
                  }
                `}
              >
                {option.label}
              </button>
            ))}
          </div>
        </FormSection>

        {/* Branches */}
        {(formData.splitConfig.splitType === 'random' || formData.splitConfig.splitType === 'percentage') && (
          <FormSection
            title="Distribution Branches"
            description="Define how traffic should be split"
          >
            <div className="space-y-3">
              {formData.splitConfig.branches.map((branch, index) => (
                <div
                  key={branch.id}
                  className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={branch.label}
                        onChange={(e) => {
                          const branches = [...formData.splitConfig.branches];
                          branches[index].label = e.target.value;
                          setFormData({
                            ...formData,
                            splitConfig: { ...formData.splitConfig, branches },
                          });
                        }}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
                        placeholder="Branch label..."
                      />
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="0.1"
                          value={branch.percentage}
                          onChange={(e) => updateBranchPercentage(index, parseFloat(e.target.value))}
                          className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={branch.percentage}
                          onChange={(e) => updateBranchPercentage(index, parseFloat(e.target.value) || 0)}
                          className="w-20 px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
                        />
                        <span className="text-sm text-slate-600 dark:text-slate-400">%</span>
                      </div>
                    </div>
                    {formData.splitConfig.branches.length > 2 && (
                      <button
                        onClick={() => removeBranch(index)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {errors.percentage && (
                <p className="text-sm text-red-600 dark:text-red-400">{errors.percentage}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={addBranch}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 border-2 border-dashed border-indigo-300 dark:border-indigo-700 rounded-lg transition-colors flex-1 justify-center"
                >
                  <Plus className="w-4 h-4" />
                  Add Branch
                </button>
                <button
                  onClick={distributeEvenly}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors"
                >
                  Distribute Evenly
                </button>
              </div>
            </div>
          </FormSection>
        )}

        {/* Field-based split */}
        {formData.splitConfig.splitType === 'field_based' && (
          <FormSection title="Field-Based Distribution" description="Route based on contact field value">
            <FormField label="Field Name" required>
              <input
                type="text"
                value={formData.splitConfig.fieldName || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    splitConfig: { ...formData.splitConfig, fieldName: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                placeholder="e.g., subscription_tier, plan_type"
              />
            </FormField>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
              Contacts will be routed to different branches based on the value of this field.
            </p>
          </FormSection>
        )}

        {/* Distribution Preview */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
          <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-3">Distribution Preview:</div>
          <div className="space-y-2">
            {formData.splitConfig.branches.map((branch) => (
              <div key={branch.id} className="flex items-center gap-2">
                <div className="w-20 text-xs text-slate-600 dark:text-slate-400 font-mono">
                  {branch.percentage.toFixed(1)}%
                </div>
                <div className="flex-1 h-6 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 transition-all duration-300"
                    style={{ width: `${branch.percentage}%` }}
                  />
                </div>
                <div className="text-sm text-slate-900 dark:text-slate-100">{branch.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BaseConfigModal>
  );
}
