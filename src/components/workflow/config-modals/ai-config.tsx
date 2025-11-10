'use client';

/**
 * AI Node Configuration Modal
 *
 * Configure AI-powered actions using GPT/Claude models.
 */

import React, { useState } from 'react';
import { Brain } from 'lucide-react';
import { BaseConfigModal, FormSection, FormField } from './base-config-modal';
import type { AINodeData } from '@/types/workflow';

// ============================================================================
// INTERFACES
// ============================================================================

export interface AIConfigProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<AINodeData>) => void;
  initialData: AINodeData;
}

// ============================================================================
// AI CONFIG MODAL
// ============================================================================

export function AIConfigModal({ isOpen, onClose, onSave, initialData }: AIConfigProps) {
  const [formData, setFormData] = useState<AINodeData>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Validate form
   */
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.label) {
      newErrors.label = 'Label is required';
    }

    const { action } = formData.aiConfig;

    if (action === 'categorize' && !formData.aiConfig.categories?.length) {
      newErrors.categories = 'At least one category is required';
    }

    if (action === 'extract_info' && !formData.aiConfig.extractionPrompt) {
      newErrors.extractionPrompt = 'Extraction prompt is required';
    }

    if (action === 'generate_response' && !formData.aiConfig.responsePrompt) {
      newErrors.responsePrompt = 'Response prompt is required';
    }

    if (action === 'translate') {
      if (!formData.aiConfig.sourceLanguage) {
        newErrors.sourceLanguage = 'Source language is required';
      }
      if (!formData.aiConfig.targetLanguage) {
        newErrors.targetLanguage = 'Target language is required';
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
      title="Configure AI Action"
      description="Leverage AI for intelligent automation"
      icon={<Brain className="w-5 h-5 text-purple-600" />}
    >
      <div className="space-y-6">
        {/* Label */}
        <FormField label="AI Action Label" required error={errors.label}>
          <input
            type="text"
            value={formData.label}
            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            placeholder="e.g., Analyze Sentiment"
          />
        </FormField>

        {/* AI Action Type */}
        <FormSection title="AI Action Type" description="What should the AI do?">
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'sentiment_analysis', label: 'Sentiment Analysis' },
              { value: 'categorize', label: 'Categorize' },
              { value: 'extract_info', label: 'Extract Info' },
              { value: 'generate_response', label: 'Generate Response' },
              { value: 'translate', label: 'Translate' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() =>
                  setFormData({
                    ...formData,
                    aiConfig: {
                      ...formData.aiConfig,
                      action: option.value as any,
                    },
                  })
                }
                className={`
                  px-4 py-3 text-sm font-medium rounded-lg border-2 transition-all
                  ${
                    formData.aiConfig.action === option.value
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
                  }
                `}
              >
                {option.label}
              </button>
            ))}
          </div>
        </FormSection>

        {/* Model Settings */}
        <FormSection title="Model Settings" description="Configure AI model parameters">
          <div className="space-y-4">
            <FormField label="Model">
              <select
                value={formData.aiConfig.model || 'gpt-3.5-turbo'}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    aiConfig: { ...formData.aiConfig, model: e.target.value as any },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Fast & Cheap)</option>
                <option value="gpt-4">GPT-4 (Most Capable)</option>
                <option value="claude-3-sonnet">Claude 3 Sonnet (Balanced)</option>
              </select>
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Temperature" description="0 = Focused, 1 = Creative">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={formData.aiConfig.temperature ?? 0.7}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      aiConfig: { ...formData.aiConfig, temperature: parseFloat(e.target.value) },
                    })
                  }
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="text-center text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {formData.aiConfig.temperature?.toFixed(1) ?? '0.7'}
                </div>
              </FormField>

              <FormField label="Max Tokens" description="Response length limit">
                <input
                  type="number"
                  min="50"
                  max="4000"
                  step="50"
                  value={formData.aiConfig.maxTokens ?? 500}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      aiConfig: { ...formData.aiConfig, maxTokens: parseInt(e.target.value) || 500 },
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </FormField>
            </div>
          </div>
        </FormSection>

        {/* Action-specific configuration */}
        {formData.aiConfig.action === 'sentiment_analysis' && (
          <FormField label="Save Result To Field" description="Where to store sentiment result">
            <input
              type="text"
              value={formData.aiConfig.sentimentField || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  aiConfig: { ...formData.aiConfig, sentimentField: e.target.value },
                })
              }
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              placeholder="e.g., sentiment"
            />
          </FormField>
        )}

        {formData.aiConfig.action === 'categorize' && (
          <div className="space-y-4">
            <FormField label="Categories" required error={errors.categories}>
              <input
                type="text"
                placeholder="Enter categories (comma-separated)"
                value={formData.aiConfig.categories?.join(', ') || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    aiConfig: {
                      ...formData.aiConfig,
                      categories: e.target.value
                        .split(',')
                        .map((c) => c.trim())
                        .filter(Boolean),
                    },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Example: Support, Sales, Billing, General
              </p>
            </FormField>

            <FormField label="Save Category To Field">
              <input
                type="text"
                value={formData.aiConfig.categoryField || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    aiConfig: { ...formData.aiConfig, categoryField: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                placeholder="e.g., message_category"
              />
            </FormField>
          </div>
        )}

        {formData.aiConfig.action === 'extract_info' && (
          <div className="space-y-4">
            <FormField label="Extraction Prompt" required error={errors.extractionPrompt}>
              <textarea
                value={formData.aiConfig.extractionPrompt || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    aiConfig: { ...formData.aiConfig, extractionPrompt: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                rows={4}
                placeholder="Extract the customer's order number and issue description from their message..."
              />
            </FormField>

            <FormField label="Fields to Extract" description="Comma-separated field names">
              <input
                type="text"
                placeholder="order_number, issue, priority"
                value={formData.aiConfig.extractionFields?.join(', ') || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    aiConfig: {
                      ...formData.aiConfig,
                      extractionFields: e.target.value
                        .split(',')
                        .map((f) => f.trim())
                        .filter(Boolean),
                    },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              />
            </FormField>
          </div>
        )}

        {formData.aiConfig.action === 'generate_response' && (
          <div className="space-y-4">
            <FormField label="Response Prompt" required error={errors.responsePrompt}>
              <textarea
                value={formData.aiConfig.responsePrompt || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    aiConfig: { ...formData.aiConfig, responsePrompt: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                rows={4}
                placeholder="Generate a friendly response thanking the customer for their message..."
              />
            </FormField>

            <FormField label="Context (optional)" description="Additional context for AI">
              <textarea
                value={formData.aiConfig.responseContext || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    aiConfig: { ...formData.aiConfig, responseContext: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                rows={2}
                placeholder="Company policies, tone guidelines, etc."
              />
            </FormField>
          </div>
        )}

        {formData.aiConfig.action === 'translate' && (
          <div className="space-y-4">
            <FormField label="Source Language" required error={errors.sourceLanguage}>
              <select
                value={formData.aiConfig.sourceLanguage || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    aiConfig: { ...formData.aiConfig, sourceLanguage: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="">Detect automatically</option>
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="pt">Portuguese</option>
                <option value="zh">Chinese</option>
              </select>
            </FormField>

            <FormField label="Target Language" required error={errors.targetLanguage}>
              <select
                value={formData.aiConfig.targetLanguage || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    aiConfig: { ...formData.aiConfig, targetLanguage: e.target.value },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="">Select target language...</option>
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="pt">Portuguese</option>
                <option value="zh">Chinese</option>
              </select>
            </FormField>
          </div>
        )}
      </div>
    </BaseConfigModal>
  );
}
