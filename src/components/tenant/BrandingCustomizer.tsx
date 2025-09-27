/**
 * Tenant Branding Customizer Component
 *
 * Comprehensive branding customization interface with:
 * - Color palette editor
 * - Logo upload and management
 * - Typography settings
 * - Preview functionality
 * - Custom CSS editor
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { BrandingConfig } from '@/lib/tenant-branding';

interface BrandingCustomizerProps {
  organizationId: string;
  initialBranding?: BrandingConfig;
  onBrandingChange?: (branding: BrandingConfig) => void;
  onSave?: (branding: BrandingConfig) => Promise<void>;
  className?: string;
}

export default function BrandingCustomizer({
  organizationId,
  initialBranding,
  onBrandingChange,
  onSave,
  className = '',
}: BrandingCustomizerProps) {
  const [branding, setBranding] = useState<BrandingConfig>(
    initialBranding || getDefaultBranding()
  );
  const [activeTab, setActiveTab] = useState<'colors' | 'logos' | 'typography' | 'advanced'>('colors');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [previewMode, setPreviewMode] = useState(false);

  // Update parent component when branding changes
  useEffect(() => {
    onBrandingChange?.(branding);
  }, [branding, onBrandingChange]);

  const updateBranding = useCallback((updates: Partial<BrandingConfig>) => {
    setBranding(prev => ({ ...prev, ...updates }));
    setErrors([]);
  }, []);

  const updateColors = useCallback((colorUpdates: Partial<BrandingConfig['colors']>) => {
    updateBranding({
      colors: { ...branding.colors, ...colorUpdates }
    });
  }, [branding.colors, updateBranding]);

  const updateTypography = useCallback((typographyUpdates: Partial<BrandingConfig['typography']>) => {
    updateBranding({
      typography: { ...branding.typography, ...typographyUpdates }
    });
  }, [branding.typography, updateBranding]);

  const updateLogos = useCallback((logoUpdates: Partial<BrandingConfig['logos']>) => {
    updateBranding({
      logos: { ...branding.logos, ...logoUpdates }
    });
  }, [branding.logos, updateBranding]);

  const updateCompany = useCallback((companyUpdates: Partial<BrandingConfig['company']>) => {
    updateBranding({
      company: { ...branding.company, ...companyUpdates }
    });
  }, [branding.company, updateBranding]);

  const updateWhiteLabel = useCallback((whiteLabelUpdates: Partial<BrandingConfig['whiteLabel']>) => {
    updateBranding({
      whiteLabel: { ...branding.whiteLabel, ...whiteLabelUpdates }
    });
  }, [branding.whiteLabel, updateBranding]);

  const handleFileUpload = async (file: File, assetType: 'logo' | 'logo_dark' | 'favicon') => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('assetType', assetType);

      const response = await fetch('/api/tenant/branding', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload file');
      }

      const result = await response.json();

      if (assetType === 'logo') {
        updateLogos({ light: result.data.url });
      } else if (assetType === 'logo_dark') {
        updateLogos({ dark: result.data.url });
      } else if (assetType === 'favicon') {
        updateLogos({ favicon: result.data.url });
      }
    } catch (error) {
      setErrors(['Failed to upload file. Please try again.']);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!onSave) return;

    setIsSaving(true);
    setErrors([]);

    try {
      await onSave(branding);
    } catch (error) {
      setErrors(['Failed to save branding settings. Please try again.']);
    } finally {
      setIsSaving(false);
    }
  };

  const generatePreviewCSS = () => {
    return `
      :root {
        --brand-primary: ${branding.colors.primary};
        --brand-secondary: ${branding.colors.secondary};
        --brand-accent: ${branding.colors.accent};
        --brand-background: ${branding.colors.background};
        --brand-text: ${branding.colors.text};
        --brand-font-family: ${branding.typography.fontFamily};
        --brand-font-size: ${branding.typography.fontSize}px;
        --brand-border-radius: ${branding.layout.borderRadius}px;
      }
    `;
  };

  return (
    <div className={`branding-customizer ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Brand Customization</h2>
          <p className="text-gray-600">Customize your organization's branding and appearance</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {previewMode ? 'Exit Preview' : 'Preview'}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="text-red-800 font-medium mb-2">Error</h4>
          <ul className="text-red-700 text-sm space-y-1">
            {errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Configuration Panel */}
        <div className="lg:col-span-2">
          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-6 border-b border-gray-200">
            {[
              { id: 'colors', label: 'Colors' },
              { id: 'logos', label: 'Logos' },
              { id: 'typography', label: 'Typography' },
              { id: 'advanced', label: 'Advanced' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            {activeTab === 'colors' && (
              <ColorsTab
                colors={branding.colors}
                onUpdate={updateColors}
              />
            )}

            {activeTab === 'logos' && (
              <LogosTab
                logos={branding.logos}
                company={branding.company}
                onLogosUpdate={updateLogos}
                onCompanyUpdate={updateCompany}
                onFileUpload={handleFileUpload}
                isUploading={isLoading}
              />
            )}

            {activeTab === 'typography' && (
              <TypographyTab
                typography={branding.typography}
                layout={branding.layout}
                onUpdate={updateTypography}
                onLayoutUpdate={(layoutUpdates) =>
                  updateBranding({ layout: { ...branding.layout, ...layoutUpdates } })
                }
              />
            )}

            {activeTab === 'advanced' && (
              <AdvancedTab
                theme={branding.theme}
                whiteLabel={branding.whiteLabel}
                onThemeUpdate={(themeUpdates) =>
                  updateBranding({ theme: { ...branding.theme, ...themeUpdates } })
                }
                onWhiteLabelUpdate={updateWhiteLabel}
              />
            )}
          </div>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-1">
          <PreviewPanel
            branding={branding}
            previewCSS={generatePreviewCSS()}
            isPreviewMode={previewMode}
          />
        </div>
      </div>
    </div>
  );
}

// Colors Tab Component
function ColorsTab({
  colors,
  onUpdate,
}: {
  colors: BrandingConfig['colors'];
  onUpdate: (updates: Partial<BrandingConfig['colors']>) => void;
}) {
  const colorFields = [
    { key: 'primary', label: 'Primary Color', description: 'Main brand color for buttons and links' },
    { key: 'secondary', label: 'Secondary Color', description: 'Supporting color for accents' },
    { key: 'accent', label: 'Accent Color', description: 'Highlight color for important elements' },
    { key: 'background', label: 'Background Color', description: 'Main background color' },
    { key: 'text', label: 'Text Color', description: 'Primary text color' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Color Palette</h3>
        <p className="text-gray-600 mb-6">Define your brand colors that will be used throughout the interface.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {colorFields.map((field) => (
          <div key={field.key} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {field.label}
            </label>
            <p className="text-xs text-gray-500">{field.description}</p>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={colors[field.key as keyof typeof colors]}
                onChange={(e) => onUpdate({ [field.key]: e.target.value })}
                className="w-12 h-12 border border-gray-300 rounded-lg cursor-pointer"
              />
              <input
                type="text"
                value={colors[field.key as keyof typeof colors]}
                onChange={(e) => onUpdate({ [field.key]: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="#000000"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Logos Tab Component
function LogosTab({
  logos,
  company,
  onLogosUpdate,
  onCompanyUpdate,
  onFileUpload,
  isUploading,
}: {
  logos: BrandingConfig['logos'];
  company: BrandingConfig['company'];
  onLogosUpdate: (updates: Partial<BrandingConfig['logos']>) => void;
  onCompanyUpdate: (updates: Partial<BrandingConfig['company']>) => void;
  onFileUpload: (file: File, assetType: 'logo' | 'logo_dark' | 'favicon') => void;
  isUploading: boolean;
}) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, assetType: 'logo' | 'logo_dark' | 'favicon') => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file, assetType);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Brand Assets</h3>
        <p className="text-gray-600 mb-6">Upload your brand logos and manage company information.</p>
      </div>

      {/* Logo Upload Section */}
      <div className="space-y-6">
        <h4 className="text-md font-medium text-gray-900">Logos</h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { key: 'light', label: 'Light Logo', description: 'Logo for light backgrounds' },
            { key: 'dark', label: 'Dark Logo', description: 'Logo for dark backgrounds' },
            { key: 'favicon', label: 'Favicon', description: 'Small icon for browser tabs' },
          ].map((logoType) => (
            <div key={logoType.key} className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                {logoType.label}
              </label>
              <p className="text-xs text-gray-500">{logoType.description}</p>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                {logos[logoType.key as keyof typeof logos] ? (
                  <div className="space-y-3">
                    <img
                      src={logos[logoType.key as keyof typeof logos]}
                      alt={logoType.label}
                      className="mx-auto max-h-16 max-w-full object-contain"
                    />
                    <div className="space-y-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, logoType.key as any)}
                        className="hidden"
                        id={`logo-${logoType.key}`}
                        disabled={isUploading}
                      />
                      <label
                        htmlFor={`logo-${logoType.key}`}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm text-gray-700 bg-white rounded hover:bg-gray-50 cursor-pointer"
                      >
                        Replace
                      </label>
                      <button
                        onClick={() => onLogosUpdate({ [logoType.key]: undefined })}
                        className="inline-flex items-center px-3 py-1.5 text-sm text-red-600 hover:text-red-800 ml-2"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-gray-400">
                      <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, logoType.key as any)}
                        className="hidden"
                        id={`logo-${logoType.key}`}
                        disabled={isUploading}
                      />
                      <label
                        htmlFor={`logo-${logoType.key}`}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200 cursor-pointer"
                      >
                        {isUploading ? 'Uploading...' : 'Upload Logo'}
                      </label>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, SVG up to 5MB</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Company Information */}
      <div className="space-y-6">
        <h4 className="text-md font-medium text-gray-900">Company Information</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Name
            </label>
            <input
              type="text"
              value={company.name || ''}
              onChange={(e) => onCompanyUpdate({ name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Your Company Name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tagline
            </label>
            <input
              type="text"
              value={company.tagline || ''}
              onChange={(e) => onCompanyUpdate({ tagline: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Your company tagline"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Support Email
            </label>
            <input
              type="email"
              value={company.supportEmail || ''}
              onChange={(e) => onCompanyUpdate({ supportEmail: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="support@company.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Website URL
            </label>
            <input
              type="url"
              value={company.websiteUrl || ''}
              onChange={(e) => onCompanyUpdate({ websiteUrl: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="https://company.com"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company Description
            </label>
            <textarea
              value={company.description || ''}
              onChange={(e) => onCompanyUpdate({ description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Brief description of your company"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Typography Tab Component
function TypographyTab({
  typography,
  layout,
  onUpdate,
  onLayoutUpdate,
}: {
  typography: BrandingConfig['typography'];
  layout: BrandingConfig['layout'];
  onUpdate: (updates: Partial<BrandingConfig['typography']>) => void;
  onLayoutUpdate: (updates: Partial<BrandingConfig['layout']>) => void;
}) {
  const fontOptions = [
    'Inter',
    'Roboto',
    'Open Sans',
    'Lato',
    'Montserrat',
    'Poppins',
    'Source Sans Pro',
    'Nunito',
    'Raleway',
    'Work Sans',
  ];

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Typography & Layout</h3>
        <p className="text-gray-600 mb-6">Customize the typography and visual styling of your interface.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h4 className="text-md font-medium text-gray-900">Typography</h4>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Font Family
            </label>
            <select
              value={typography.fontFamily}
              onChange={(e) => onUpdate({ fontFamily: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {fontOptions.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Base Font Size: {typography.fontSize}px
            </label>
            <input
              type="range"
              min={12}
              max={18}
              value={typography.fontSize}
              onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>12px</span>
              <span>18px</span>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h4 className="text-md font-medium text-gray-900">Layout</h4>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Border Radius: {layout.borderRadius}px
            </label>
            <input
              type="range"
              min={0}
              max={20}
              value={layout.borderRadius}
              onChange={(e) => onLayoutUpdate({ borderRadius: parseInt(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0px (Square)</span>
              <span>20px (Rounded)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Text */}
      <div className="mt-8">
        <h4 className="text-md font-medium text-gray-900 mb-4">Preview</h4>
        <div
          className="p-6 border border-gray-200 rounded-lg bg-white"
          style={{
            fontFamily: typography.fontFamily,
            fontSize: `${typography.fontSize}px`,
            borderRadius: `${layout.borderRadius}px`,
          }}
        >
          <h1 className="text-2xl font-bold mb-2">Sample Heading</h1>
          <p className="mb-4">
            This is a preview of how your typography settings will look. The font family is{' '}
            {typography.fontFamily} with a base size of {typography.fontSize}px.
          </p>
          <button
            className="px-4 py-2 bg-blue-600 text-white font-medium hover:bg-blue-700"
            style={{
              borderRadius: `${layout.borderRadius}px`,
            }}
          >
            Sample Button
          </button>
        </div>
      </div>
    </div>
  );
}

// Advanced Tab Component
function AdvancedTab({
  theme,
  whiteLabel,
  onThemeUpdate,
  onWhiteLabelUpdate,
}: {
  theme: BrandingConfig['theme'];
  whiteLabel: BrandingConfig['whiteLabel'];
  onThemeUpdate: (updates: Partial<BrandingConfig['theme']>) => void;
  onWhiteLabelUpdate: (updates: Partial<BrandingConfig['whiteLabel']>) => void;
}) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Advanced Settings</h3>
        <p className="text-gray-600 mb-6">Configure advanced branding and white-label options.</p>
      </div>

      <div className="space-y-8">
        {/* Theme Settings */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4">Theme Mode</h4>
          <div className="space-y-3">
            {[
              { value: 'light', label: 'Light Mode', description: 'Light theme for bright environments' },
              { value: 'dark', label: 'Dark Mode', description: 'Dark theme for low-light environments' },
              { value: 'auto', label: 'Auto', description: 'Follows system preference' },
            ].map((option) => (
              <label key={option.value} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="theme"
                  value={option.value}
                  checked={theme.mode === option.value}
                  onChange={(e) => onThemeUpdate({ mode: e.target.value as any })}
                  className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900">{option.label}</div>
                  <div className="text-xs text-gray-500">{option.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* White Label Settings */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4">White Label Options</h4>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-900">Hide "Powered by" Branding</label>
                <p className="text-xs text-gray-500">Remove references to the platform in your interface</p>
              </div>
              <input
                type="checkbox"
                checked={whiteLabel.hidePoweredBy}
                onChange={(e) => onWhiteLabelUpdate({ hidePoweredBy: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Footer Text
              </label>
              <input
                type="text"
                value={whiteLabel.customFooter || ''}
                onChange={(e) => onWhiteLabelUpdate({ customFooter: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="© 2024 Your Company. All rights reserved."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Preview Panel Component
function PreviewPanel({
  branding,
  previewCSS,
  isPreviewMode,
}: {
  branding: BrandingConfig;
  previewCSS: string;
  isPreviewMode: boolean;
}) {
  return (
    <div className="sticky top-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Live Preview</h3>

        <div className="space-y-4">
          {/* Style injection for preview */}
          <style dangerouslySetInnerHTML={{ __html: previewCSS }} />

          {/* Preview Interface */}
          <div
            className="border rounded-lg p-4 bg-white"
            style={{
              borderRadius: `${branding.layout.borderRadius}px`,
              fontFamily: branding.typography.fontFamily,
              fontSize: `${branding.typography.fontSize}px`,
              backgroundColor: branding.colors.background,
              color: branding.colors.text,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b">
              <div className="flex items-center space-x-3">
                {branding.logos.light && (
                  <img
                    src={branding.logos.light}
                    alt="Logo"
                    className="h-8 w-auto object-contain"
                  />
                )}
                <div>
                  <h4 className="font-semibold">{branding.company.name || 'Your Company'}</h4>
                  {branding.company.tagline && (
                    <p className="text-xs opacity-75">{branding.company.tagline}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="space-y-3">
              <button
                className="w-full text-white font-medium py-2 px-4 hover:opacity-90 transition-opacity"
                style={{
                  backgroundColor: branding.colors.primary,
                  borderRadius: `${branding.layout.borderRadius}px`,
                }}
              >
                Primary Button
              </button>

              <button
                className="w-full font-medium py-2 px-4 border hover:opacity-90 transition-opacity"
                style={{
                  color: branding.colors.primary,
                  borderColor: branding.colors.primary,
                  backgroundColor: 'transparent',
                  borderRadius: `${branding.layout.borderRadius}px`,
                }}
              >
                Secondary Button
              </button>

              <div
                className="w-full p-3 border"
                style={{
                  borderColor: branding.colors.secondary,
                  borderRadius: `${branding.layout.borderRadius}px`,
                  backgroundColor: branding.colors.secondary + '10',
                }}
              >
                <p className="text-sm">Sample notification or alert message</p>
              </div>

              {!branding.whiteLabel.hidePoweredBy && (
                <p className="text-xs text-center opacity-50 mt-4">
                  Powered by ADSapp
                </p>
              )}

              {branding.whiteLabel.customFooter && (
                <p className="text-xs text-center opacity-75 mt-2">
                  {branding.whiteLabel.customFooter}
                </p>
              )}
            </div>
          </div>

          {/* Color Palette */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Color Palette</h4>
            <div className="grid grid-cols-5 gap-2">
              {Object.entries(branding.colors).map(([name, color]) => (
                <div key={name} className="text-center">
                  <div
                    className="w-full h-12 rounded border border-gray-200 mb-1"
                    style={{ backgroundColor: color }}
                  />
                  <p className="text-xs text-gray-600 capitalize">{name}</p>
                  <p className="text-xs text-gray-400 font-mono">{color}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function for default branding
function getDefaultBranding(): BrandingConfig {
  return {
    colors: {
      primary: '#3B82F6',
      secondary: '#1E40AF',
      accent: '#10B981',
      background: '#FFFFFF',
      text: '#1F2937',
    },
    typography: {
      fontFamily: 'Inter',
      fontSize: 14,
    },
    layout: {
      borderRadius: 8,
    },
    logos: {},
    company: {},
    theme: {
      mode: 'light',
    },
    whiteLabel: {
      hidePoweredBy: false,
    },
  };
}