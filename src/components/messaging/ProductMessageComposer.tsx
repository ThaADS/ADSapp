'use client'

/**
 * ProductMessageComposer Component
 * Composes product messages for WhatsApp in single product or multi-product (list) mode.
 * Handles section organization for multi-product messages.
 */

import { useState, useCallback, useMemo } from 'react'
import {
  PlusIcon,
  TrashIcon,
  ShoppingBagIcon,
  Squares2X2Icon,
  ArrowsUpDownIcon,
} from '@heroicons/react/24/outline'
import { ProductPicker, useProductPicker } from './ProductPicker'
import { ProductCardCompact } from './ProductCard'
import { Button } from '@/components/ui/button'
import type {
  WhatsAppProduct,
  ProductSection,
  SendProductMessageRequest,
  SendProductListMessageRequest,
} from '@/types/whatsapp-catalog'

// WhatsApp API limits
const MAX_BODY_TEXT = 1024
const MAX_FOOTER_TEXT = 60
const MAX_SECTIONS = 10
const MAX_PRODUCTS_TOTAL = 30

type MessageMode = 'single' | 'multi'

interface ProductMessageComposerProps {
  conversationId: string
  catalogId: string
  onSend: (message: SendProductMessageRequest | SendProductListMessageRequest) => Promise<void>
  onCancel: () => void
  initialMode?: MessageMode
}

interface SectionData {
  id: string
  title: string
  products: WhatsAppProduct[]
}

export function ProductMessageComposer({
  conversationId,
  catalogId,
  onSend,
  onCancel,
  initialMode = 'single',
}: ProductMessageComposerProps) {
  // State
  const [mode, setMode] = useState<MessageMode>(initialMode)
  const [singleProduct, setSingleProduct] = useState<WhatsAppProduct | null>(null)
  const [sections, setSections] = useState<SectionData[]>([
    { id: '1', title: 'Producten', products: [] },
  ])
  const [bodyText, setBodyText] = useState('')
  const [footerText, setFooterText] = useState('')
  const [headerText, setHeaderText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Product picker state
  const picker = useProductPicker()
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null)

  // Calculate total products across all sections
  const totalProducts = useMemo(() => {
    return sections.reduce((sum, section) => sum + section.products.length, 0)
  }, [sections])

  // Validation
  const validation = useMemo(() => {
    const errors: string[] = []

    if (mode === 'single') {
      if (!singleProduct) {
        errors.push('Selecteer een product')
      }
    } else {
      if (totalProducts === 0) {
        errors.push('Voeg minimaal 1 product toe')
      }
      if (totalProducts > MAX_PRODUCTS_TOTAL) {
        errors.push(`Maximaal ${MAX_PRODUCTS_TOTAL} producten toegestaan`)
      }
      if (!headerText.trim()) {
        errors.push('Header tekst is verplicht')
      }
      if (!bodyText.trim()) {
        errors.push('Body tekst is verplicht')
      }
      if (sections.some(s => !s.title.trim())) {
        errors.push('Alle secties moeten een titel hebben')
      }
      if (sections.some(s => s.products.length === 0)) {
        errors.push('Alle secties moeten minimaal 1 product bevatten')
      }
    }

    if (bodyText.length > MAX_BODY_TEXT) {
      errors.push(`Body tekst mag maximaal ${MAX_BODY_TEXT} tekens bevatten`)
    }
    if (footerText.length > MAX_FOOTER_TEXT) {
      errors.push(`Footer tekst mag maximaal ${MAX_FOOTER_TEXT} tekens bevatten`)
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }, [mode, singleProduct, sections, totalProducts, headerText, bodyText, footerText])

  // Open picker for single product
  const openSinglePicker = useCallback(() => {
    picker.openPicker('single', singleProduct ? [singleProduct] : [])
    setEditingSectionId(null)
  }, [picker, singleProduct])

  // Open picker for section
  const openSectionPicker = useCallback((sectionId: string) => {
    const section = sections.find(s => s.id === sectionId)
    if (section) {
      // Calculate remaining capacity
      const otherProducts = sections
        .filter(s => s.id !== sectionId)
        .reduce((sum, s) => sum + s.products.length, 0)
      const remainingCapacity = MAX_PRODUCTS_TOTAL - otherProducts

      picker.openPicker('multi', section.products)
      setEditingSectionId(sectionId)
    }
  }, [picker, sections])

  // Handle product selection
  const handleProductSelect = useCallback((products: WhatsAppProduct[]) => {
    if (mode === 'single' || editingSectionId === null) {
      // Single product mode
      setSingleProduct(products[0] || null)
    } else {
      // Update section products
      setSections(prev =>
        prev.map(section =>
          section.id === editingSectionId
            ? { ...section, products }
            : section
        )
      )
    }
    picker.closePicker()
    setEditingSectionId(null)
  }, [mode, editingSectionId, picker])

  // Add new section
  const addSection = useCallback(() => {
    if (sections.length >= MAX_SECTIONS) return

    const newId = Date.now().toString()
    setSections(prev => [
      ...prev,
      { id: newId, title: `Sectie ${prev.length + 1}`, products: [] },
    ])
  }, [sections.length])

  // Remove section
  const removeSection = useCallback((sectionId: string) => {
    if (sections.length <= 1) return
    setSections(prev => prev.filter(s => s.id !== sectionId))
  }, [sections.length])

  // Update section title
  const updateSectionTitle = useCallback((sectionId: string, title: string) => {
    setSections(prev =>
      prev.map(section =>
        section.id === sectionId
          ? { ...section, title }
          : section
      )
    )
  }, [])

  // Remove product from section
  const removeProductFromSection = useCallback((sectionId: string, productId: string) => {
    setSections(prev =>
      prev.map(section =>
        section.id === sectionId
          ? { ...section, products: section.products.filter(p => p.id !== productId) }
          : section
      )
    )
  }, [])

  // Move section up/down
  const moveSection = useCallback((sectionId: string, direction: 'up' | 'down') => {
    setSections(prev => {
      const index = prev.findIndex(s => s.id === sectionId)
      if (index === -1) return prev

      const newIndex = direction === 'up' ? index - 1 : index + 1
      if (newIndex < 0 || newIndex >= prev.length) return prev

      const newSections = [...prev]
      const [removed] = newSections.splice(index, 1)
      newSections.splice(newIndex, 0, removed)
      return newSections
    })
  }, [])

  // Handle send
  const handleSend = useCallback(async () => {
    if (!validation.isValid) return

    setSending(true)
    setError(null)

    try {
      if (mode === 'single' && singleProduct) {
        const request: SendProductMessageRequest = {
          conversation_id: conversationId,
          product_retailer_id: singleProduct.retailer_id,
          body_text: bodyText.trim() || undefined,
          footer_text: footerText.trim() || undefined,
        }
        await onSend(request)
      } else {
        const request: SendProductListMessageRequest = {
          conversation_id: conversationId,
          header_text: headerText.trim(),
          body_text: bodyText.trim(),
          footer_text: footerText.trim() || undefined,
          sections: sections
            .filter(s => s.products.length > 0)
            .map(s => ({
              title: s.title.trim(),
              product_retailer_ids: s.products.map(p => p.retailer_id),
            })),
        }
        await onSend(request)
      }
    } catch (err) {
      console.error('Failed to send product message:', err)
      setError(err instanceof Error ? err.message : 'Kon bericht niet verzenden')
    } finally {
      setSending(false)
    }
  }, [validation.isValid, mode, singleProduct, sections, bodyText, footerText, headerText, conversationId, onSend])

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Product bericht opstellen
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Mode toggle */}
        <div className="mt-4 flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setMode('single')}
            className={`
              flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${mode === 'single'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }
            `}
          >
            <ShoppingBagIcon className="h-5 w-5" />
            <span>Enkel product</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('multi')}
            className={`
              flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${mode === 'multi'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }
            `}
          >
            <Squares2X2Icon className="h-5 w-5" />
            <span>Productlijst</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Single product mode */}
        {mode === 'single' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product
            </label>
            {singleProduct ? (
              <div className="space-y-2">
                <ProductCardCompact
                  product={singleProduct}
                  onRemove={() => setSingleProduct(null)}
                />
                <button
                  type="button"
                  onClick={openSinglePicker}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Ander product kiezen
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={openSinglePicker}
                className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors"
              >
                <ShoppingBagIcon className="h-8 w-8 mx-auto text-gray-400" />
                <span className="mt-2 block text-sm text-gray-600">
                  Product selecteren
                </span>
              </button>
            )}
          </div>
        )}

        {/* Multi-product mode */}
        {mode === 'multi' && (
          <>
            {/* Header text (required for multi) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Header tekst <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={headerText}
                onChange={(e) => setHeaderText(e.target.value)}
                placeholder="Onze producten voor u"
                maxLength={60}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                {headerText.length} / 60 tekens
              </p>
            </div>

            {/* Sections */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Secties ({sections.length} / {MAX_SECTIONS})
                </label>
                {sections.length < MAX_SECTIONS && (
                  <button
                    type="button"
                    onClick={addSection}
                    className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-800"
                  >
                    <PlusIcon className="h-4 w-4" />
                    <span>Sectie toevoegen</span>
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {sections.map((section, index) => (
                  <div
                    key={section.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    {/* Section header */}
                    <div className="flex items-center space-x-2 mb-3">
                      <input
                        type="text"
                        value={section.title}
                        onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                        placeholder="Sectie titel"
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />

                      {/* Move buttons */}
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => moveSection(section.id, 'up')}
                          disabled={index === 0}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          title="Omhoog"
                        >
                          <ArrowsUpDownIcon className="h-4 w-4 rotate-180" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveSection(section.id, 'down')}
                          disabled={index === sections.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                          title="Omlaag"
                        >
                          <ArrowsUpDownIcon className="h-4 w-4" />
                        </button>
                      </div>

                      {sections.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSection(section.id)}
                          className="p-1 text-red-400 hover:text-red-600"
                          title="Sectie verwijderen"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* Section products */}
                    {section.products.length > 0 ? (
                      <div className="space-y-2">
                        {section.products.map((product) => (
                          <ProductCardCompact
                            key={product.id}
                            product={product}
                            onRemove={() => removeProductFromSection(section.id, product.id)}
                          />
                        ))}
                        <button
                          type="button"
                          onClick={() => openSectionPicker(section.id)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Producten bewerken
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openSectionPicker(section.id)}
                        className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors"
                      >
                        <PlusIcon className="h-6 w-6 mx-auto text-gray-400" />
                        <span className="mt-1 block text-sm text-gray-600">
                          Producten toevoegen
                        </span>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Total products indicator */}
              <p className={`mt-2 text-sm ${totalProducts > MAX_PRODUCTS_TOTAL ? 'text-red-600' : 'text-gray-500'}`}>
                Totaal: {totalProducts} / {MAX_PRODUCTS_TOTAL} producten
              </p>
            </div>
          </>
        )}

        {/* Body text (optional for single, required for multi) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Body tekst {mode === 'multi' && <span className="text-red-500">*</span>}
          </label>
          <textarea
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            placeholder={mode === 'single' ? 'Optionele begeleidende tekst...' : 'Beschrijf de producten...'}
            rows={3}
            maxLength={MAX_BODY_TEXT}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          />
          <p className={`mt-1 text-xs ${bodyText.length > MAX_BODY_TEXT ? 'text-red-600' : 'text-gray-500'}`}>
            {bodyText.length} / {MAX_BODY_TEXT} tekens
          </p>
        </div>

        {/* Footer text */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Footer tekst <span className="text-gray-400">(optioneel)</span>
          </label>
          <input
            type="text"
            value={footerText}
            onChange={(e) => setFooterText(e.target.value)}
            placeholder="Bijv. 'Gratis verzending vanaf 50'"
            maxLength={MAX_FOOTER_TEXT}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className={`mt-1 text-xs ${footerText.length > MAX_FOOTER_TEXT ? 'text-red-600' : 'text-gray-500'}`}>
            {footerText.length} / {MAX_FOOTER_TEXT} tekens
          </p>
        </div>

        {/* Validation errors */}
        {!validation.isValid && validation.errors.length > 0 && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3">
            <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
              {validation.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Send error */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-gray-200 p-4 bg-gray-50">
        <div className="flex items-center justify-end space-x-3">
          <Button variant="outline" onClick={onCancel}>
            Annuleren
          </Button>
          <Button
            onClick={handleSend}
            disabled={!validation.isValid || sending}
          >
            {sending ? (
              <>
                <span className="animate-spin mr-2">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                </span>
                Verzenden...
              </>
            ) : (
              'Product bericht verzenden'
            )}
          </Button>
        </div>
      </div>

      {/* Product Picker Modal */}
      {picker.isOpen && (
        <ProductPicker
          mode={picker.mode}
          onSelect={handleProductSelect}
          onCancel={picker.closePicker}
          selectedProducts={picker.selectedProducts}
          maxProducts={mode === 'multi' ? MAX_PRODUCTS_TOTAL - (totalProducts - (sections.find(s => s.id === editingSectionId)?.products.length || 0)) : 1}
        />
      )}
    </div>
  )
}

export default ProductMessageComposer
