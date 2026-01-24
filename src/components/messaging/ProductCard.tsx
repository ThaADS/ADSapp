'use client'

/**
 * ProductCard Component
 * Displays a product from the WhatsApp catalog with image, name, price, and availability.
 * Supports both single and multi-select modes for the ProductPicker.
 */

import { CheckIcon } from '@heroicons/react/24/solid'
import type {
  WhatsAppProduct,
  ProductCardProps,
  ProductAvailability,
  FormattedPrice
} from '@/types/whatsapp-catalog'

/**
 * Format price from cents to display string
 */
function formatPrice(amount: number | null, currency: string): FormattedPrice {
  if (amount === null) {
    return { amount: '0', currency, formatted: 'Prijs op aanvraag' }
  }

  const amountInUnits = amount / 100
  const formatted = new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: currency || 'EUR',
  }).format(amountInUnits)

  return {
    amount: amountInUnits.toFixed(2),
    currency,
    formatted,
  }
}

/**
 * Get availability badge styling and text
 */
function getAvailabilityBadge(availability: ProductAvailability): {
  text: string
  className: string
} {
  switch (availability) {
    case 'in stock':
      return {
        text: 'Op voorraad',
        className: 'bg-green-100 text-green-800',
      }
    case 'out of stock':
      return {
        text: 'Niet op voorraad',
        className: 'bg-red-100 text-red-800',
      }
    case 'preorder':
      return {
        text: 'Pre-order',
        className: 'bg-yellow-100 text-yellow-800',
      }
    case 'available for order':
      return {
        text: 'Bestelbaar',
        className: 'bg-blue-100 text-blue-800',
      }
    default:
      return {
        text: 'Onbekend',
        className: 'bg-gray-100 text-gray-800',
      }
  }
}

export function ProductCard({
  product,
  selected,
  selectionMode,
  onToggle,
}: ProductCardProps) {
  const price = formatPrice(product.price_amount, product.price_currency)
  const availability = getAvailabilityBadge(product.availability)
  const isOutOfStock = product.availability === 'out of stock'

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={isOutOfStock}
      className={`
        relative w-full text-left rounded-lg border-2 transition-all duration-200
        ${selected
          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
        }
        ${isOutOfStock ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
      `}
    >
      {/* Selection indicator */}
      {selected && (
        <div className="absolute top-2 right-2 z-10">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-white">
            <CheckIcon className="h-4 w-4" />
          </div>
        </div>
      )}

      {/* Product image */}
      <div className="relative aspect-square w-full overflow-hidden rounded-t-lg bg-gray-100">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
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
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}

        {/* Availability badge overlay */}
        <div className="absolute bottom-2 left-2">
          <span className={`
            inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium
            ${availability.className}
          `}>
            {availability.text}
          </span>
        </div>
      </div>

      {/* Product details */}
      <div className="p-3">
        {/* Brand */}
        {product.brand && (
          <p className="text-xs text-gray-500 uppercase tracking-wide">
            {product.brand}
          </p>
        )}

        {/* Name */}
        <h3 className="mt-1 text-sm font-medium text-gray-900 line-clamp-2">
          {product.name}
        </h3>

        {/* Category */}
        {product.category && (
          <p className="mt-0.5 text-xs text-gray-500">
            {product.category}
          </p>
        )}

        {/* Price */}
        <p className="mt-2 text-lg font-semibold text-gray-900">
          {price.formatted}
        </p>

        {/* SKU/Retailer ID */}
        <p className="mt-1 text-xs text-gray-400">
          SKU: {product.retailer_id}
        </p>
      </div>

      {/* Selection mode indicator for multi-select */}
      {selectionMode === 'multi' && !selected && !isOutOfStock && (
        <div className="absolute top-2 right-2">
          <div className="h-6 w-6 rounded-full border-2 border-gray-300 bg-white" />
        </div>
      )}
    </button>
  )
}

/**
 * Compact version of ProductCard for inline display
 */
export function ProductCardCompact({
  product,
  onRemove,
}: {
  product: WhatsAppProduct
  onRemove?: () => void
}) {
  const price = formatPrice(product.price_amount, product.price_currency)

  return (
    <div className="flex items-center space-x-3 rounded-lg border border-gray-200 bg-white p-2">
      {/* Thumbnail */}
      <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <svg
              className="h-6 w-6 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {product.name}
        </p>
        <p className="text-sm text-gray-600">
          {price.formatted}
        </p>
      </div>

      {/* Remove button */}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 transition-colors"
          title="Verwijderen"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  )
}

export default ProductCard
