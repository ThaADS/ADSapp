'use client'

import { useState, useRef, useEffect } from 'react'
import { Palette, Check } from 'lucide-react'

interface BubbleColorPickerProps {
  conversationId: string
  currentColor?: string
  onColorChange: (color: string, textColor: string) => Promise<void>
}

// 6 pastel kleuren voor chat bubbles
const PASTEL_COLORS = [
  {
    name: 'Pastel Blauw',
    bubbleColor: 'bg-blue-100',
    textColor: 'text-blue-900',
    hex: '#dbeafe',
    textHex: '#1e3a8a',
  },
  {
    name: 'Pastel Groen',
    bubbleColor: 'bg-emerald-100',
    textColor: 'text-emerald-900',
    hex: '#d1fae5',
    textHex: '#064e3b',
  },
  {
    name: 'Pastel Paars',
    bubbleColor: 'bg-purple-100',
    textColor: 'text-purple-900',
    hex: '#e9d5ff',
    textHex: '#581c87',
  },
  {
    name: 'Pastel Roze',
    bubbleColor: 'bg-pink-100',
    textColor: 'text-pink-900',
    hex: '#fce7f3',
    textHex: '#831843',
  },
  {
    name: 'Pastel Oranje',
    bubbleColor: 'bg-orange-100',
    textColor: 'text-orange-900',
    hex: '#ffedd5',
    textHex: '#7c2d12',
  },
  {
    name: 'Pastel Geel',
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
        onClick={() => setIsOpen(!isOpen)}
        className='flex items-center gap-2 rounded-lg border-2 border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-emerald-400 hover:text-emerald-600'
        title='Chat bubble kleur'
      >
        <Palette className='h-4 w-4' />
        <div className='flex items-center gap-1.5'>
          <span
            className='h-4 w-4 rounded-full border border-gray-300'
            style={{ backgroundColor: currentColorObj.hex }}
          />
          <span>Bubble kleur</span>
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className='absolute right-0 top-full z-50 mt-2 w-72 rounded-lg border border-gray-200 bg-white shadow-lg'>
          <div className='p-3'>
            <div className='mb-3 text-xs font-medium text-gray-500'>
              Kies een pastel kleur voor de chat bubbles
            </div>
            <div className='grid grid-cols-2 gap-2'>
              {PASTEL_COLORS.map(color => (
                <button
                  key={color.bubbleColor}
                  onClick={() => handleColorSelect(color)}
                  disabled={isLoading}
                  className='group relative flex flex-col items-center gap-2 rounded-lg border-2 border-gray-200 p-3 hover:border-emerald-400 disabled:opacity-50'
                >
                  {/* Color Preview */}
                  <div className='flex h-16 w-full items-center justify-center rounded-md' style={{ backgroundColor: color.hex }}>
                    <div className={`rounded-lg ${color.bubbleColor} ${color.textColor} px-3 py-2 text-xs font-medium`}>
                      Voorbeeld
                    </div>
                  </div>

                  {/* Color Name */}
                  <span className='text-xs font-medium text-gray-700'>
                    {color.name}
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
              De kleur wordt toegepast op berichten van de klant in dit gesprek
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
