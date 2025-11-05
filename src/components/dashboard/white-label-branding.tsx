// @ts-nocheck - Database types need regeneration
'use client'

import { useState, useRef } from 'react'
import { PhotoIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline'
import Image from 'next/image'

interface WhiteLabelBrandingProps {
  organizationId: string
  currentLogoUrl?: string | null
  primaryColor?: string
  secondaryColor?: string
}

export default function WhiteLabelBranding({
  organizationId,
  currentLogoUrl,
  primaryColor = '#10b981',
  secondaryColor = '#3b82f6'
}: WhiteLabelBrandingProps) {
  const [logoPreview, setLogoPreview] = useState<string | null>(currentLogoUrl || null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState(false)

  const [brandColors, setBrandColors] = useState({
    primary: primaryColor,
    secondary: secondaryColor
  })

  const [isSavingColors, setIsSavingColors] = useState(false)
  const [colorsSaved, setColorsSaved] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml']
    if (!validTypes.includes(file.type)) {
      setUploadError('Please upload a PNG, JPG, or SVG file')
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('File size must be less than 2MB')
      return
    }

    setSelectedFile(file)
    setUploadError(null)

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setLogoPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUploadLogo = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setUploadError(null)
    setUploadSuccess(false)

    try {
      const formData = new FormData()
      formData.append('logo', selectedFile)

      const response = await fetch(`/api/organizations/${organizationId}/branding`, {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload logo')
      }

      setUploadSuccess(true)
      setSelectedFile(null)

      // Clear success message after 3 seconds
      setTimeout(() => setUploadSuccess(false), 3000)
    } catch (error: any) {
      console.error('Upload error:', error)
      setUploadError(error.message || 'Failed to upload logo')
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveLogo = () => {
    setLogoPreview(null)
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSaveColors = async () => {
    setIsSavingColors(true)
    setColorsSaved(false)

    try {
      const response = await fetch(`/api/organizations/${organizationId}/branding`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryColor: brandColors.primary,
          secondaryColor: brandColors.secondary
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save colors')
      }

      setColorsSaved(true)
      setTimeout(() => setColorsSaved(false), 3000)
    } catch (error: any) {
      console.error('Save colors error:', error)
      setUploadError(error.message || 'Failed to save colors')
    } finally {
      setIsSavingColors(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Logo Upload Section */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <PhotoIcon className="w-5 h-5 text-emerald-600" />
            Organization Logo
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Upload your organization's logo. Recommended size: 512x512px (PNG, JPG, or SVG)
          </p>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* Logo Preview */}
          {logoPreview && (
            <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg border-2 border-gray-200 relative">
              <button
                onClick={handleRemoveLogo}
                className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                title="Remove logo"
              >
                <XMarkIcon className="w-5 h-5 text-gray-600" />
              </button>
              <div className="relative w-32 h-32">
                <Image
                  src={logoPreview}
                  alt="Logo preview"
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          )}

          {/* Upload Input */}
          <div>
            <label className="block">
              <span className="sr-only">Choose logo file</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-semibold
                  file:bg-emerald-50 file:text-emerald-700
                  hover:file:bg-emerald-100
                  cursor-pointer"
              />
            </label>
            <p className="mt-2 text-xs text-gray-500">
              PNG, JPG or SVG. Max size 2MB.
            </p>
          </div>

          {/* Upload Error */}
          {uploadError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{uploadError}</p>
            </div>
          )}

          {/* Upload Success */}
          {uploadSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <CheckIcon className="w-5 h-5 text-green-600" />
              <p className="text-sm text-green-800">Logo uploaded successfully!</p>
            </div>
          )}

          {/* Upload Button */}
          {selectedFile && (
            <button
              onClick={handleUploadLogo}
              disabled={isUploading}
              className="w-full px-4 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <PhotoIcon className="w-5 h-5" />
                  <span>Upload Logo</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Brand Colors Section */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Brand Colors</h3>
          <p className="text-sm text-gray-600 mt-1">
            Customize the primary and secondary colors for your organization's interface
          </p>
        </div>

        <div className="px-6 py-6 space-y-6">
          {/* Primary Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Primary Color
            </label>
            <div className="flex items-center gap-4">
              <input
                type="color"
                value={brandColors.primary}
                onChange={(e) => setBrandColors({ ...brandColors, primary: e.target.value })}
                className="h-12 w-20 rounded-lg border-2 border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={brandColors.primary}
                onChange={(e) => setBrandColors({ ...brandColors, primary: e.target.value })}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="#10b981"
              />
              <div
                className="w-12 h-12 rounded-lg border-2 border-gray-300"
                style={{ backgroundColor: brandColors.primary }}
              />
            </div>
          </div>

          {/* Secondary Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Secondary Color
            </label>
            <div className="flex items-center gap-4">
              <input
                type="color"
                value={brandColors.secondary}
                onChange={(e) => setBrandColors({ ...brandColors, secondary: e.target.value })}
                className="h-12 w-20 rounded-lg border-2 border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={brandColors.secondary}
                onChange={(e) => setBrandColors({ ...brandColors, secondary: e.target.value })}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="#3b82f6"
              />
              <div
                className="w-12 h-12 rounded-lg border-2 border-gray-300"
                style={{ backgroundColor: brandColors.secondary }}
              />
            </div>
          </div>

          {/* Color Success */}
          {colorsSaved && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <CheckIcon className="w-5 h-5 text-green-600" />
              <p className="text-sm text-green-800">Brand colors saved successfully!</p>
            </div>
          )}

          {/* Save Colors Button */}
          <button
            onClick={handleSaveColors}
            disabled={isSavingColors}
            className="w-full px-4 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isSavingColors ? 'Saving...' : 'Save Brand Colors'}
          </button>
        </div>
      </div>
    </div>
  )
}
