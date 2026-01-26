'use client'

import { useState, useRef, useEffect } from 'react'
import { Palette, Check } from 'lucide-react'
import { useTranslations } from '@/components/providers/translation-provider'

interface BubbleColorPickerProps {
  conversationId: string
  currentColor?: string
  onColorChange: (color: string, textColor: string) => Promise<void>
}

// 6 pastel colors for chat bubbles
const PASTEL_COLORS = [
  {
    key: 'blue',
    bubbleColor: 'bg-blue-100',
    textColor: 'text-blue-900',
    hex: '#dbeafe',
    textHex: '#1e3a8a',
  },
  {
    key: 'green',
    bubbleColor: 'bg-emerald-100',
    textColor: 'text-emerald-900',
    hex: '#d1fae5',
    textHex: '#064e3b',
  },
  {
    key: 'purple',
    bubbleColor: 'bg-purple-100',
    textColor: 'text-purple-900',
    hex: '#e9d5ff',
    textHex: '#581c87',
  },
  {
    key: 'pink',
    bubbleColor: 'bg-pink-100',
    textColor: 'text-pink-900',
    hex: '#fce7f3',
    textHex: '#831843',
  },
  {
    key: 'orange',
    bubbleColor: 'bg-orange-100',
    textColor: 'text-orange-900',
    hex: '#ffedd5',
    textHex: '#7c2d12',
  },
  {
    key: 'yellow',
    bubbleColor: 'bg-yellow-100',
    textColor: 'text-yellow-900',
    hex: '#fef3c7',
    textHex: '#713f12',
  },
]

export default function BubbleColorPicker({
  conversationId,
  currentColor,
  onColorChange,
}: BubbleColorPickerProps) {
  const t = useTranslations('inbox')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedColor, setSelectedColor] = useState(currentColor || PASTEL_COLORS[0].bubbleColor)
  const [isLoading, setIsLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleColorSelect = async (color: typeof PASTEL_COLORS[0]) => {
    setIsLoading(true)
    try {
      await onColorChange(color.bubbleColor, color.textColor)
      setSelectedColor(color.bubbleColor)
      setIsOpen(false)
    } catch (error) {
      console.error('Error changing color:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const currentColorObj = PASTEL_COLORS.find(c => c.bubbleColor === selectedColor) || PASTEL_COLORS[0]

  return (
    <div className='relative inline-block' ref={dropdownRef}>
      {/* Color Picker Button */}
      <button
        type='button'
        onClick={() => setIsOpen(!isOpen)}
        className='flex items-center gap-2 rounded-lg border-2 border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-emerald-400 hover:text-emerald-600'
        title={t('bubbleColor.buttonTitle')}
      >
        <Palette className='h-4 w-4' />
        <div className='flex items-center gap-1.5'>
          <span
            className='h-4 w-4 rounded-full border border-gray-300'
            style={{ backgroundColor: currentColorObj.hex }}
          />
          <span>{t('bubbleColor.title')}</span>
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className='absolute right-0 top-full z-50 mt-2 w-72 rounded-lg border border-gray-200 bg-white shadow-lg'>
          <div className='p-3'>
            <div className='mb-3 text-xs font-medium text-gray-500'>
              {t('bubbleColor.description')}
            </div>
            <div className='grid grid-cols-2 gap-2'>
              {PASTEL_COLORS.map(color => (
                <button
                  type='button'
                  key={color.bubbleColor}
                  onClick={() => handleColorSelect(color)}
                  disabled={isLoading}
                  className='group relative flex flex-col items-center gap-2 rounded-lg border-2 border-gray-200 p-3 hover:border-emerald-400 disabled:opacity-50'
                >
                  {/* Color Preview */}
                  <div className='flex h-16 w-full items-center justify-center rounded-md' style={{ backgroundColor: color.hex }}>
                    <div className={`rounded-lg ${color.bubbleColor} ${color.textColor} px-3 py-2 text-xs font-medium`}>
                      {t('bubbleColor.preview')}
                    </div>
                  </div>

                  {/* Color Name */}
                  <span className='text-xs font-medium text-gray-700'>
                    {t(`bubbleColor.colors.${color.key}`)}
                  </span>

                  {/* Selected Check */}
                  {selectedColor === color.bubbleColor && (
                    <div className='absolute right-1 top-1'>
                      <div className='flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500'>
                        <Check className='h-3 w-3 text-white' />
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Info Text */}
            <div className='mt-3 text-xs text-gray-500'>
              {t('bubbleColor.infoText')}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
