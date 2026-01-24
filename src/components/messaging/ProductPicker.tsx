'use client'

/**
 * ProductPicker Component
 * Modal dialog for selecting products from the WhatsApp catalog.
 * Supports both single and multi-select modes with search functionality.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { MagnifyingGlassIcon, XMarkIcon, FunnelIcon } from '@heroicons/react/24/outline'
import { ProductCard, ProductCardCompact } from './ProductCard'
import { Button } from '@/components/ui/button'
import type {
  WhatsAppProduct,
  ProductPickerProps,
  ProductAvailability,
  ProductsListQuery,
  MAX_PRODUCTS_PER_MESSAGE,
} from '@/types/whatsapp-catalog'

// Local constant to avoid import issues
const MAX_PRODUCTS = 30

interface ProductPickerState {
  products: WhatsAppProduct[]
  loading: boolean
  error: string | null
  hasMore: boolean
  total: number
}

export function ProductPicker({
  mode,
  onSelect,
  onCancel,
  selectedProducts = [],
  maxProducts = MAX_PRODUCTS,
}: ProductPickerProps) {
  // State
  const [isOpen, setIsOpen] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [availabilityFilter, setAvailabilityFilter] = useState<ProductAvailability | 'all'>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [selected, setSelected] = useState<WhatsAppProduct[]>(selectedProducts)
  const [state, setState] = useState<ProductPickerState>({
    products: [],
    loading: true,
    error: null,
    hasMore: false,
    total: 0,
  })

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Fetch products
  const fetchProducts = useCallback(async (query: ProductsListQuery) => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const params = new URLSearchParams()
      if (query.search) params.set('search', query.search)
      if (query.availability) params.set('availability', query.availability)
      if (query.limit) params.set('limit', query.limit.toString())
      if (query.offset) params.set('offset', query.offset.toString())

      const response = await fetch(`/api/catalog/products?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Producten konden niet worden geladen')
      }

      const data = await response.json()

      setState({
        products: data.products || [],
        loading: false,
        error: null,
        hasMore: data.hasMore || false,
        total: data.total || 0,
      })
    } catch (err) {
      console.error('Failed to fetch products:', err)
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Er is een fout opgetreden',
      }))
    }
  }, [])

  // Load products on mount and when filters change
  useEffect(() => {
    const query: ProductsListQuery = {
      search: debouncedSearch || undefined,
      availability: availabilityFilter !== 'all' ? availabilityFilter : undefined,
      limit: 50,
      offset: 0,
    }
    fetchProducts(query)
  }, [debouncedSearch, availabilityFilter, fetchProducts])

  // Check if product is selected
  const isSelected = useCallback((product: WhatsAppProduct) => {
    return selected.some(p => p.id === product.id)
  }, [selected])

  // Toggle product selection
  const toggleProduct = useCallback((product: WhatsAppProduct) => {
    if (mode === 'single') {
      setSelected([product])
      return
    }

    // Multi-select mode
    setSelected(prev => {
      const isCurrentlySelected = prev.some(p => p.id === product.id)

      if (isCurrentlySelected) {
        return prev.filter(p => p.id !== product.id)
      }

      // Check max limit
      if (prev.length >= maxProducts) {
        return prev
      }

      return [...prev, product]
    })
  }, [mode, maxProducts])

  // Remove product from selection
  const removeProduct = useCallback((productId: string) => {
    setSelected(prev => prev.filter(p => p.id !== productId))
  }, [])

  // Handle confirm
  const handleConfirm = useCallback(() => {
    onSelect(selected)
    setIsOpen(false)
  }, [selected, onSelect])

  // Handle cancel
  const handleCancel = useCallback(() => {
    onCancel()
    setIsOpen(false)
  }, [onCancel])

  // Selection count info
  const selectionInfo = useMemo(() => {
    if (mode === 'single') {
      return selected.length === 1 ? '1 product geselecteerd' : 'Selecteer een product'
    }
    return `${selected.length} / ${maxProducts} producten geselecteerd`
  }, [mode, selected.length, maxProducts])

  // Can confirm?
  const canConfirm = selected.length > 0

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={handleCancel}
      />

      {/* Modal */}
      <div className="absolute inset-4 md:inset-10 lg:inset-20 bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 border-b border-gray-200">
          <div className="flex items-center justify-between p-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {mode === 'single' ? 'Product selecteren' : 'Producten selecteren'}
              </h2>
              <p className="text-sm text-gray-500">
                {selectionInfo}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCancel}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Search and filters */}
          <div className="px-4 pb-4 space-y-3">
            {/* Search bar */}
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Zoek producten..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`
                  p-2 rounded-lg border transition-colors
                  ${showFilters
                    ? 'border-blue-500 bg-blue-50 text-blue-600'
                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }
                `}
              >
                <FunnelIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Filter options */}
            {showFilters && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Beschikbaarheid:</span>
                <select
                  value={availabilityFilter}
                  onChange={(e) => setAvailabilityFilter(e.target.value as ProductAvailability | 'all')}
                  className="text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Alle</option>
                  <option value="in stock">Op voorraad</option>
                  <option value="available for order">Bestelbaar</option>
                  <option value="preorder">Pre-order</option>
                  <option value="out of stock">Niet op voorraad</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {state.loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <span className="ml-3 text-gray-600">Producten laden...</span>
            </div>
          )}

          {state.error && (
            <div className="flex flex-col items-center justify-center py-12">
              <svg
                className="h-12 w-12 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <p className="mt-2 text-gray-600">{state.error}</p>
              <button
                type="button"
                onClick={() => fetchProducts({ limit: 50, offset: 0 })}
                className="mt-4 text-blue-600 hover:text-blue-800 font-medium"
              >
                Opnieuw proberen
              </button>
            </div>
          )}

          {!state.loading && !state.error && state.products.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <svg
                className="h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
              <p className="mt-2 text-gray-600">Geen producten gevonden</p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-2 text-blue-600 hover:text-blue-800 font-medium"
                >
                  Zoekopdracht wissen
                </button>
              )}
            </div>
          )}

          {!state.loading && !state.error && state.products.length > 0 && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {state.products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    selected={isSelected(product)}
                    selectionMode={mode}
                    onToggle={() => toggleProduct(product)}
                  />
                ))}
              </div>

              {/* Results info */}
              <div className="mt-4 text-center text-sm text-gray-500">
                {state.total} {state.total === 1 ? 'product' : 'producten'} gevonden
                {state.hasMore && ' (scroll voor meer)'}
              </div>
            </>
          )}
        </div>

        {/* Selected products preview (multi-select only) */}
        {mode === 'multi' && selected.length > 0 && (
          <div className="flex-shrink-0 border-t border-gray-200 p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Geselecteerde producten ({selected.length})
              </span>
              <button
                type="button"
                onClick={() => setSelected([])}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Alles verwijderen
              </button>
            </div>
            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
              {selected.map((product) => (
                <ProductCardCompact
                  key={product.id}
                  product={product}
                  onRemove={() => removeProduct(product.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-gray-200 bg-white p-4">
          <div className="flex items-center justify-end space-x-3">
            <Button
              variant="outline"
              onClick={handleCancel}
            >
              Annuleren
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!canConfirm}
            >
              {mode === 'single'
                ? 'Product selecteren'
                : `${selected.length} producten selecteren`
              }
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Hook to manage ProductPicker state
 */
export function useProductPicker() {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<'single' | 'multi'>('single')
  const [selectedProducts, setSelectedProducts] = useState<WhatsAppProduct[]>([])

  const openPicker = useCallback((pickerMode: 'single' | 'multi', initialProducts: WhatsAppProduct[] = []) => {
    setMode(pickerMode)
    setSelectedProducts(initialProducts)
    setIsOpen(true)
  }, [])

  const closePicker = useCallback(() => {
    setIsOpen(false)
  }, [])

  return {
    isOpen,
    mode,
    selectedProducts,
    openPicker,
    closePicker,
    setSelectedProducts,
  }
}

export default ProductPicker
