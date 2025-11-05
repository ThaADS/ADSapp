'use client';

import { useState } from 'react';
import Image from 'next/image';

interface WhatsAppSetupWizardProps {
  onComplete: (credentials: WhatsAppCredentials) => void;
  onSkip: () => void;
}

interface WhatsAppCredentials {
  phoneNumberId: string;
  businessAccountId: string;
  accessToken: string;
  webhookVerifyToken: string;
}

type ValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid';

interface FieldValidation {
  phoneNumberId: ValidationStatus;
  businessAccountId: ValidationStatus;
  accessToken: ValidationStatus;
}

export function WhatsAppSetupWizard({ onComplete, onSkip }: WhatsAppSetupWizardProps) {
  const [step, setStep] = useState(1);
  const [credentials, setCredentials] = useState<WhatsAppCredentials>({
    phoneNumberId: '',
    businessAccountId: '',
    accessToken: '',
    webhookVerifyToken: '',
  });
  const [validation, setValidation] = useState<FieldValidation>({
    phoneNumberId: 'idle',
    businessAccountId: 'idle',
    accessToken: 'idle',
  });
  const [showVideo, setShowVideo] = useState(false);

  const validatePhoneNumberId = async (value: string) => {
    if (!value || value.length < 10) {
      setValidation(prev => ({ ...prev, phoneNumberId: 'idle' }));
      return;
    }

    setValidation(prev => ({ ...prev, phoneNumberId: 'validating' }));

    try {
      const response = await fetch('/api/onboarding/validate-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumberId: value }),
      });

      const data = await response.json();
      setValidation(prev => ({
        ...prev,
        phoneNumberId: data.valid ? 'valid' : 'invalid',
      }));
    } catch (error) {
      setValidation(prev => ({ ...prev, phoneNumberId: 'invalid' }));
    }
  };

  const handleFieldChange = (field: keyof WhatsAppCredentials, value: string) => {
    setCredentials(prev => ({ ...prev, [field]: value }));

    // Trigger validation after user stops typing (debounced)
    if (field === 'phoneNumberId') {
      const timeoutId = setTimeout(() => validatePhoneNumberId(value), 500);
      return () => clearTimeout(timeoutId);
    }
  };

  const canProceedToNextStep = () => {
    switch (step) {
      case 1:
        return credentials.phoneNumberId.length > 0;
      case 2:
        return credentials.businessAccountId.length > 0;
      case 3:
        return credentials.accessToken.length > 0;
      default:
        return true;
    }
  };

  const handleComplete = () => {
    onComplete(credentials);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900">WhatsApp Business Setup</h2>
        <p className="mt-2 text-gray-600">
          Connect your WhatsApp Business account in a few simple steps
        </p>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3].map((stepNumber) => (
          <div key={stepNumber} className="flex items-center flex-1">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                stepNumber < step
                  ? 'bg-green-500 text-white'
                  : stepNumber === step
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {stepNumber < step ? '✓' : stepNumber}
            </div>
            {stepNumber < 3 && (
              <div
                className={`flex-1 h-1 mx-2 ${
                  stepNumber < step ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Video Tutorial */}
      {showVideo && (
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-semibold">Video Tutorial</h3>
            <button
              onClick={() => setShowVideo(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
            <video
              controls
              poster="/images/whatsapp-tutorial-thumbnail.jpg"
              className="w-full h-full rounded-lg"
            >
              <source src="/tutorials/whatsapp-setup.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        {/* Step 1: Phone Number ID */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-2">Step 1: Phone Number ID</h3>
              <p className="text-gray-600">
                Your Phone Number ID is found in the Meta Business Suite
              </p>
            </div>

            {/* Visual Helper with Screenshot */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white text-xl">
                    ℹ️
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-900 mb-2">Where to find it:</h4>
                  <ol className="space-y-2 text-sm text-blue-800">
                    <li>1. Go to Meta Business Suite (business.facebook.com)</li>
                    <li>2. Click on "WhatsApp Manager" in the left sidebar</li>
                    <li>3. Select "Phone Numbers"</li>
                    <li>4. Your Phone Number ID appears next to your phone number</li>
                  </ol>
                </div>
              </div>

              {/* Screenshot placeholder */}
              <div className="mt-4 border-2 border-dashed border-blue-300 rounded-lg p-4 bg-white">
                <div className="text-center text-gray-500">
                  <p className="text-sm">Screenshot: Phone Number ID Location</p>
                  <p className="text-xs mt-1">(Annotated image will be placed here)</p>
                </div>
              </div>
            </div>

            {/* Input Field with Live Validation */}
            <div>
              <label htmlFor="phoneNumberId" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number ID
              </label>
              <div className="relative">
                <input
                  id="phoneNumberId"
                  type="text"
                  value={credentials.phoneNumberId}
                  onChange={(e) => handleFieldChange('phoneNumberId', e.target.value)}
                  placeholder="123456789012345"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    validation.phoneNumberId === 'valid'
                      ? 'border-green-500 bg-green-50'
                      : validation.phoneNumberId === 'invalid'
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300'
                  }`}
                />
                {validation.phoneNumberId === 'validating' && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                  </div>
                )}
                {validation.phoneNumberId === 'valid' && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500">
                    ✓ Valid
                  </div>
                )}
                {validation.phoneNumberId === 'invalid' && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500">
                    ✕ Invalid
                  </div>
                )}
              </div>
            </div>

            {/* Help Links */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-gray-900">Need Help?</h4>
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={() => setShowVideo(!showVideo)}
                    className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-2"
                  >
                    <span>📹</span>
                    Watch video tutorial (2 min)
                  </button>
                </li>
                <li>
                  <a
                    href="/docs/whatsapp-setup"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-2"
                  >
                    <span>📚</span>
                    Read detailed setup guide
                  </a>
                </li>
                <li>
                  <button
                    onClick={() => {
                      // TODO: Open support chat
                    }}
                    className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-2"
                  >
                    <span>💬</span>
                    Chat with support
                  </button>
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Step 2: Business Account ID */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-2">Step 2: Business Account ID</h3>
              <p className="text-gray-600">
                Your Business Account ID identifies your WhatsApp Business Account
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Where to find it:</h4>
              <ol className="space-y-2 text-sm text-blue-800">
                <li>1. In Meta Business Suite, go to "Business Settings"</li>
                <li>2. Click on "WhatsApp Accounts" in the left sidebar</li>
                <li>3. Your Business Account ID appears under your account name</li>
              </ol>
            </div>

            <div>
              <label htmlFor="businessAccountId" className="block text-sm font-medium text-gray-700 mb-2">
                Business Account ID
              </label>
              <input
                id="businessAccountId"
                type="text"
                value={credentials.businessAccountId}
                onChange={(e) => handleFieldChange('businessAccountId', e.target.value)}
                placeholder="123456789012345"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        )}

        {/* Step 3: Access Token */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-2">Step 3: Access Token</h3>
              <p className="text-gray-600">
                Generate a permanent access token for API authentication
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <span className="text-yellow-600">⚠️</span>
                <div className="flex-1">
                  <h4 className="font-semibold text-yellow-900 mb-1">Security Notice</h4>
                  <p className="text-sm text-yellow-800">
                    Keep your access token secure. Never share it publicly or commit it to version control.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">How to generate:</h4>
              <ol className="space-y-2 text-sm text-blue-800">
                <li>1. Go to Meta Business Suite → System Users</li>
                <li>2. Create a new system user or select existing one</li>
                <li>3. Click "Generate New Token"</li>
                <li>4. Select your WhatsApp Business Account</li>
                <li>5. Select permissions: whatsapp_business_messaging, whatsapp_business_management</li>
                <li>6. Click "Generate Token" and copy it immediately</li>
              </ol>
            </div>

            <div>
              <label htmlFor="accessToken" className="block text-sm font-medium text-gray-700 mb-2">
                Access Token
              </label>
              <textarea
                id="accessToken"
                value={credentials.accessToken}
                onChange={(e) => handleFieldChange('accessToken', e.target.value)}
                placeholder="EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              />
            </div>

            <div>
              <label htmlFor="webhookVerifyToken" className="block text-sm font-medium text-gray-700 mb-2">
                Webhook Verify Token (Optional)
              </label>
              <input
                id="webhookVerifyToken"
                type="text"
                value={credentials.webhookVerifyToken}
                onChange={(e) => handleFieldChange('webhookVerifyToken', e.target.value)}
                placeholder="my_secure_verify_token_123"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-sm text-gray-500">
                A custom token to verify webhook requests. Leave empty to auto-generate.
              </p>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
          <div className="flex gap-3">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                ← Back
              </button>
            )}
            <button
              onClick={onSkip}
              className="px-6 py-2 text-gray-600 hover:text-gray-800 underline"
            >
              Skip for now - I'll set this up later
            </button>
          </div>

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceedToNextStep()}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={!canProceedToNextStep()}
              className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Complete Setup ✓
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
