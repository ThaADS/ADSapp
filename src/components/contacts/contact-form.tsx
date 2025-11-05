'use client';

import React, { useState, useEffect } from 'react';
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

interface ContactFormData {
  name: string;
  phone_number: string;
  email: string;
  tags: string[];
  notes: string;
  metadata: Record<string, string>;
}

interface ContactFormProps {
  contact?: {
    id: string;
    name: string;
    phone_number: string;
    email?: string;
    tags?: string[];
    notes?: string;
    metadata?: Record<string, unknown>;
  } | null;
  onSubmit: (data: ContactFormData, contactId?: string) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const AVAILABLE_TAGS = [
  { id: 'vip', label: 'VIP', color: 'bg-purple-100 text-purple-800' },
  { id: 'potential-client', label: 'Potential Client', color: 'bg-blue-100 text-blue-800' },
  { id: 'active-lead', label: 'Active Lead', color: 'bg-green-100 text-green-800' },
  { id: 'marketing', label: 'Marketing', color: 'bg-orange-100 text-orange-800' },
  { id: 'startup', label: 'Startup', color: 'bg-pink-100 text-pink-800' },
  { id: 'tech', label: 'Tech', color: 'bg-indigo-100 text-indigo-800' },
  { id: 'enterprise', label: 'Enterprise', color: 'bg-gray-100 text-gray-800' }
];

export default function ContactForm({ contact, onSubmit, onCancel, isLoading = false }: ContactFormProps) {
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    phone_number: '',
    email: '',
    tags: [],
    notes: '',
    metadata: {}
  });

  const [customFields, setCustomFields] = useState<{ key: string; value: string }[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with contact data if editing
  useEffect(() => {
    if (contact) {
      setFormData({
        name: contact.name || '',
        phone_number: contact.phone_number || '',
        email: contact.email || '',
        tags: contact.tags || [],
        notes: contact.notes || '',
        metadata: {}
      });

      // Convert metadata to custom fields
      if (contact.metadata && typeof contact.metadata === 'object') {
        const fields = Object.entries(contact.metadata)
          .filter(([key]) => !['created_by', 'source', 'updated_by', 'updated_at'].includes(key))
          .map(([key, value]) => ({ key, value: String(value) }));
        setCustomFields(fields);
      }
    }
  }, [contact]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    // Phone number validation
    if (!formData.phone_number.trim()) {
      newErrors.phone_number = 'Phone number is required';
    } else {
      const phoneRegex = /^\+?[1-9]\d{1,14}$/;
      const cleanPhone = formData.phone_number.replace(/[\s-()]/g, '');
      if (!phoneRegex.test(cleanPhone)) {
        newErrors.phone_number = 'Invalid phone number format. Use international format (e.g., +1234567890)';
      }
    }

    // Email validation (optional)
    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Invalid email format';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Convert custom fields to metadata
      const metadata: Record<string, string> = {};
      customFields.forEach(field => {
        if (field.key.trim() && field.value.trim()) {
          metadata[field.key.trim()] = field.value.trim();
        }
      });

      const submitData = {
        ...formData,
        metadata
      };

      await onSubmit(submitData, contact?.id);
    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTag = (tagId: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tagId)
        ? prev.tags.filter(t => t !== tagId)
        : [...prev.tags, tagId]
    }));
  };

  const addCustomField = () => {
    setCustomFields([...customFields, { key: '', value: '' }]);
  };

  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const updateCustomField = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...customFields];
    updated[index][field] = value;
    setCustomFields(updated);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name Field */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Full Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.name ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="John Smith"
          disabled={isSubmitting || isLoading}
          aria-required="true"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
        />
        {errors.name && (
          <p id="name-error" className="mt-1 text-sm text-red-600" role="alert">
            {errors.name}
          </p>
        )}
      </div>

      {/* Phone Number Field */}
      <div>
        <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-1">
          Phone Number <span className="text-red-500">*</span>
        </label>
        <input
          type="tel"
          id="phone_number"
          value={formData.phone_number}
          onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.phone_number ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="+1234567890"
          disabled={isSubmitting || isLoading || !!contact}
          aria-required="true"
          aria-invalid={!!errors.phone_number}
          aria-describedby={errors.phone_number ? 'phone-error' : 'phone-help'}
        />
        {errors.phone_number ? (
          <p id="phone-error" className="mt-1 text-sm text-red-600" role="alert">
            {errors.phone_number}
          </p>
        ) : (
          <p id="phone-help" className="mt-1 text-sm text-gray-500">
            Use international format with country code (e.g., +1234567890)
            {contact && ' - Phone number cannot be changed'}
          </p>
        )}
      </div>

      {/* Email Field */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email (Optional)
        </label>
        <input
          type="email"
          id="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.email ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="john.smith@example.com"
          disabled={isSubmitting || isLoading}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
        />
        {errors.email && (
          <p id="email-error" className="mt-1 text-sm text-red-600" role="alert">
            {errors.email}
          </p>
        )}
      </div>

      {/* Tags Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tags
        </label>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_TAGS.map(tag => (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag.id)}
              disabled={isSubmitting || isLoading}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                formData.tags.includes(tag.id)
                  ? tag.color
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              } disabled:opacity-50`}
              aria-pressed={formData.tags.includes(tag.id)}
            >
              {tag.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Fields */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Custom Fields
          </label>
          <button
            type="button"
            onClick={addCustomField}
            disabled={isSubmitting || isLoading}
            className="flex items-center text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
          >
            <PlusIcon className="w-4 h-4 mr-1" />
            Add Field
          </button>
        </div>
        <div className="space-y-2">
          {customFields.map((field, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={field.key}
                onChange={(e) => updateCustomField(index, 'key', e.target.value)}
                placeholder="Field name"
                disabled={isSubmitting || isLoading}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label={`Custom field ${index + 1} name`}
              />
              <input
                type="text"
                value={field.value}
                onChange={(e) => updateCustomField(index, 'value', e.target.value)}
                placeholder="Value"
                disabled={isSubmitting || isLoading}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label={`Custom field ${index + 1} value`}
              />
              <button
                type="button"
                onClick={() => removeCustomField(index)}
                disabled={isSubmitting || isLoading}
                className="p-2 text-red-600 hover:text-red-700 disabled:opacity-50"
                aria-label={`Remove custom field ${index + 1}`}
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            </div>
          ))}
          {customFields.length === 0 && (
            <p className="text-sm text-gray-500 italic">
              No custom fields added. Click "Add Field" to create one.
            </p>
          )}
        </div>
      </div>

      {/* Notes Field */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="Additional notes about this contact..."
          disabled={isSubmitting || isLoading}
        />
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting || isLoading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {isSubmitting || isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {contact ? 'Saving...' : 'Creating...'}
            </>
          ) : (
            contact ? 'Save Changes' : 'Add Contact'
          )}
        </button>
      </div>
    </form>
  );
}
