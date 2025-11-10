'use client';

/**
 * Message Node Configuration Modal
 *
 * Configure message content, templates, variables, and media attachments.
 */

import React, { useState } from 'react';
import { MessageSquare, Image, FileText } from 'lucide-react';
import { BaseConfigModal, FormSection, FormField } from './base-config-modal';
import type { MessageNodeData } from '@/types/workflow';

// ============================================================================
// INTERFACES
// ============================================================================

export interface MessageConfigProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<MessageNodeData>) => void;
  initialData: MessageNodeData;
}

// ============================================================================
// MESSAGE CONFIG MODAL
// ============================================================================

export function MessageConfigModal({ isOpen, onClose, onSave, initialData }: MessageConfigProps) {
  const [formData, setFormData] = useState<MessageNodeData>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [messageMode, setMessageMode] = useState<'custom' | 'template'>(
    initialData.messageConfig.customMessage ? 'custom' : 'template'
  );

  /**
   * Validate form
   */
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.label) {
      newErrors.label = 'Label is required';
    }

    if (messageMode === 'custom' && !formData.messageConfig.customMessage) {
      newErrors.message = 'Message content is required';
    }

    if (messageMode === 'template' && !formData.messageConfig.templateId) {
      newErrors.template = 'Template selection is required';
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
   * Insert variable at cursor
   */
  const insertVariable = (variable: string) => {
    setFormData({
      ...formData,
      messageConfig: {
        ...formData.messageConfig,
        customMessage: (formData.messageConfig.customMessage || '') + `{{${variable}}}`,
      },
    });
  };

  return (
    <BaseConfigModal
      isOpen={isOpen}
      onClose={onClose}
      onSave={handleSave}
      title="Configure Message"
      description="Set up the message content and personalization"
      icon={<MessageSquare className="w-5 h-5 text-blue-600" />}
    >
      <div className="space-y-6">
        {/* Label */}
        <FormField label="Message Label" required error={errors.label}>
          <input
            type="text"
            value={formData.label}
            onChange={(e) => setFormData({ ...formData, label: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            placeholder="e.g., Welcome Message"
          />
        </FormField>

        {/* Message Mode */}
        <FormSection title="Message Type" description="Choose between custom message or saved template">
          <div className="flex gap-3">
            <button
              onClick={() => setMessageMode('custom')}
              className={`
                flex-1 px-4 py-3 text-sm font-medium rounded-lg border-2 transition-all
                ${
                  messageMode === 'custom'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
                }
              `}
            >
              Custom Message
            </button>
            <button
              onClick={() => setMessageMode('template')}
              className={`
                flex-1 px-4 py-3 text-sm font-medium rounded-lg border-2 transition-all
                ${
                  messageMode === 'template'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
                }
              `}
            >
              Saved Template
            </button>
          </div>
        </FormSection>

        {/* Custom Message */}
        {messageMode === 'custom' && (
          <FormField label="Message Content" required error={errors.message}>
            <textarea
              value={formData.messageConfig.customMessage || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  messageConfig: { ...formData.messageConfig, customMessage: e.target.value },
                })
              }
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              rows={6}
              placeholder="Hi {{firstName}}, welcome to our service!"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="text-xs text-slate-600 dark:text-slate-400">Quick variables:</span>
              {['firstName', 'lastName', 'company', 'phone', 'email'].map((variable) => (
                <button
                  key={variable}
                  onClick={() => insertVariable(variable)}
                  className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300"
                >
                  {`{{${variable}}}`}
                </button>
              ))}
            </div>
          </FormField>
        )}

        {/* Template Selection */}
        {messageMode === 'template' && (
          <FormField label="Message Template" required error={errors.template}>
            <select
              value={formData.messageConfig.templateId || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  messageConfig: { ...formData.messageConfig, templateId: e.target.value },
                })
              }
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            >
              <option value="">Select a template...</option>
              <option value="welcome">Welcome Message</option>
              <option value="followup">Follow-up Message</option>
              <option value="reminder">Reminder</option>
            </select>
          </FormField>
        )}

        {/* Media Attachment */}
        <FormSection title="Media Attachment (Optional)" description="Add images, videos, or documents">
          <div className="space-y-4">
            <FormField label="Media Type">
              <select
                value={formData.messageConfig.mediaType || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    messageConfig: {
                      ...formData.messageConfig,
                      mediaType: e.target.value as any,
                    },
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
              >
                <option value="">None</option>
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="document">Document</option>
                <option value="audio">Audio</option>
              </select>
            </FormField>

            {formData.messageConfig.mediaType && (
              <FormField label="Media URL">
                <input
                  type="url"
                  value={formData.messageConfig.mediaUrl || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      messageConfig: { ...formData.messageConfig, mediaUrl: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  placeholder="https://example.com/image.jpg"
                />
              </FormField>
            )}
          </div>
        </FormSection>

        {/* Personalization */}
        <FormSection title="Personalization">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="useContactName"
                checked={formData.messageConfig.useContactName ?? true}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    messageConfig: { ...formData.messageConfig, useContactName: e.target.checked },
                  })
                }
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="useContactName" className="text-sm text-slate-700 dark:text-slate-300">
                Use contact's name in message
              </label>
            </div>

            {formData.messageConfig.useContactName && (
              <FormField label="Fallback Name" description="Used when contact name is not available">
                <input
                  type="text"
                  value={formData.messageConfig.fallbackName || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      messageConfig: { ...formData.messageConfig, fallbackName: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  placeholder="e.g., Friend"
                />
              </FormField>
            )}
          </div>
        </FormSection>

        {/* Preview */}
        {formData.messageConfig.customMessage && (
          <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg">
            <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Preview:</div>
            <div className="text-sm text-slate-900 dark:text-slate-100 whitespace-pre-wrap">
              {formData.messageConfig.customMessage
                .replace(/\{\{firstName\}\}/g, 'John')
                .replace(/\{\{lastName\}\}/g, 'Doe')
                .replace(/\{\{company\}\}/g, 'Acme Inc')
                .replace(/\{\{phone\}\}/g, '+1234567890')
                .replace(/\{\{email\}\}/g, 'john@example.com')}
            </div>
          </div>
        )}
      </div>
    </BaseConfigModal>
  );
}
