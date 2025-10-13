'use client';

/**
 * MFA Enrollment Component
 *
 * 3-step wizard for MFA enrollment:
 * 1. Generate QR code and backup codes
 * 2. Scan QR code with authenticator app
 * 3. Verify TOTP token to complete enrollment
 */

import { useState } from 'react';
import Image from 'next/image';

interface MFAEnrollmentProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

interface EnrollmentData {
  qrCode: string;
  backupCodes: string[];
}

export default function MFAEnrollment({ onComplete, onCancel }: MFAEnrollmentProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentData | null>(null);
  const [verificationToken, setVerificationToken] = useState('');
  const [backupCodesSaved, setBackupCodesSaved] = useState(false);

  // Step 1: Generate QR code and backup codes
  const handleStartEnrollment = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/mfa/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate enrollment data');
      }

      setEnrollmentData(data.data);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: User scans QR code and saves backup codes
  const handleContinueToVerification = () => {
    if (!backupCodesSaved) {
      setError('Please confirm that you have saved your backup codes securely');
      return;
    }
    setStep(3);
  };

  // Step 3: Verify TOTP token
  const handleVerifyToken = async () => {
    if (!/^\d{6}$/.test(verificationToken)) {
      setError('Verification code must be 6 digits');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verificationToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid verification code');
      }

      // Success!
      onComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  // Download backup codes as text file
  const handleDownloadBackupCodes = () => {
    if (!enrollmentData) return;

    const content = `ADSapp MFA Backup Codes\n\n${enrollmentData.backupCodes.join('\n')}\n\nKeep these codes in a safe place. Each code can only be used once.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'adsapp-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex-1 h-2 rounded-full ${
                s <= step ? 'bg-blue-600' : 'bg-gray-200'
              } ${s < 3 ? 'mr-2' : ''}`}
            />
          ))}
        </div>
        <div className="text-sm text-gray-600 text-center">
          Step {step} of 3: {step === 1 ? 'Start' : step === 2 ? 'Scan QR Code' : 'Verify'}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
          {error}
        </div>
      )}

      {/* Step 1: Introduction */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Enable Two-Factor Authentication</h2>
            <p className="text-gray-600">
              Add an extra layer of security to your account by requiring a verification code from your
              authenticator app when you sign in.
            </p>
          </div>

          <div className="bg-blue-50 p-4 rounded-md">
            <h3 className="font-semibold mb-2">You'll need:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
              <li>An authenticator app (Google Authenticator, Authy, 1Password, etc.)</li>
              <li>A secure place to store backup codes</li>
              <li>5 minutes to complete setup</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleStartEnrollment}
              disabled={loading}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Generating...' : 'Get Started'}
            </button>
            {onCancel && (
              <button
                onClick={onCancel}
                disabled={loading}
                className="px-6 py-3 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Scan QR Code */}
      {step === 2 && enrollmentData && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Scan QR Code</h2>
            <p className="text-gray-600">
              Open your authenticator app and scan this QR code to add your ADSapp account.
            </p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center p-6 bg-gray-50 rounded-lg">
            <Image
              src={enrollmentData.qrCode}
              alt="MFA QR Code"
              width={256}
              height={256}
              className="border-4 border-white shadow-lg"
            />
          </div>

          {/* Backup Codes */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Save Your Backup Codes</h3>
            <p className="text-sm text-yellow-800 mb-3">
              These codes can be used if you lose access to your authenticator app. Each code can only be
              used once.
            </p>
            <div className="bg-white p-3 rounded border border-yellow-300 mb-3">
              <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                {enrollmentData.backupCodes.map((code, index) => (
                  <div key={index} className="text-gray-700">
                    {code}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDownloadBackupCodes}
                className="flex-1 bg-yellow-100 text-yellow-900 px-4 py-2 rounded-md hover:bg-yellow-200 text-sm font-medium"
              >
                Download Codes
              </button>
              <label className="flex items-center gap-2 flex-1 bg-yellow-100 px-4 py-2 rounded-md cursor-pointer hover:bg-yellow-200">
                <input
                  type="checkbox"
                  checked={backupCodesSaved}
                  onChange={(e) => setBackupCodesSaved(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium text-yellow-900">I've saved these codes</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleContinueToVerification}
              disabled={loading || !backupCodesSaved}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Continue to Verification
            </button>
            <button
              onClick={() => setStep(1)}
              disabled={loading}
              className="px-6 py-3 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Verify Token */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">Verify Your Setup</h2>
            <p className="text-gray-600">
              Enter the 6-digit code from your authenticator app to complete setup.
            </p>
          </div>

          <div>
            <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-2">
              Verification Code
            </label>
            <input
              id="token"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={verificationToken}
              onChange={(e) => setVerificationToken(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl font-mono tracking-widest"
              autoComplete="off"
            />
            <p className="mt-2 text-sm text-gray-500">
              The code changes every 30 seconds. Enter the current code from your app.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleVerifyToken}
              disabled={loading || verificationToken.length !== 6}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Verifying...' : 'Verify and Enable MFA'}
            </button>
            <button
              onClick={() => setStep(2)}
              disabled={loading}
              className="px-6 py-3 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
