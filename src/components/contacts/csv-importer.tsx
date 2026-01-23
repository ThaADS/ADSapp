'use client'

/**
 * CSV Importer Component
 * Lazy-loaded via @/lib/lazy-imports for bundle optimization
 */

import { useState, useCallback, useRef } from 'react'

interface CSVColumn {
  header: string
  mappedTo?: string
  sample?: string
}

interface CSVImporterProps {
  onImport?: (data: Record<string, string>[]) => void
  onCancel?: () => void
  requiredFields?: string[]
  optionalFields?: string[]
  className?: string
}

export function CSVImporter({
  onImport,
  onCancel,
  requiredFields = ['name', 'phone'],
  optionalFields = ['email', 'company', 'notes'],
  className = '',
}: CSVImporterProps) {
  const [file, setFile] = useState<File | null>(null)
  const [columns, setColumns] = useState<CSVColumn[]>([])
  const [preview, setPreview] = useState<string[][]>([])
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload')
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parseCSV = useCallback((content: string) => {
    const lines = content.split('\n').filter((line) => line.trim())
    if (lines.length < 2) {
      setError('CSV moet minimaal een header en één data rij bevatten')
      return
    }

    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''))
    const dataRows = lines.slice(1, 6).map((line) =>
      line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, ''))
    )

    setColumns(
      headers.map((header, index) => ({
        header,
        sample: dataRows[0]?.[index] || '',
      }))
    )
    setPreview(dataRows)
    setStep('mapping')
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.endsWith('.csv')) {
      setError('Alleen CSV bestanden zijn toegestaan')
      return
    }

    setError(null)
    setFile(selectedFile)

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      parseCSV(content)
    }
    reader.readAsText(selectedFile)
  }, [parseCSV])

  const handleMapping = useCallback((columnIndex: number, field: string) => {
    setColumns((prev) =>
      prev.map((col, i) =>
        i === columnIndex ? { ...col, mappedTo: field } : col
      )
    )
  }, [])

  const handleImport = useCallback(() => {
    const mappedData = preview.map((row) => {
      const record: Record<string, string> = {}
      columns.forEach((col, index) => {
        if (col.mappedTo) {
          record[col.mappedTo] = row[index] || ''
        }
      })
      return record
    })

    onImport?.(mappedData)
  }, [columns, preview, onImport])

  const allFields = [...requiredFields, ...optionalFields]

  return (
    <div className={`rounded-lg border bg-white ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <h3 className="font-semibold">CSV Import</h3>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className={step === 'upload' ? 'text-emerald-600 font-medium' : ''}>
            1. Upload
          </span>
          <span>→</span>
          <span className={step === 'mapping' ? 'text-emerald-600 font-medium' : ''}>
            2. Mapping
          </span>
          <span>→</span>
          <span className={step === 'preview' ? 'text-emerald-600 font-medium' : ''}>
            3. Preview
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Upload Step */}
        {step === 'upload' && (
          <div className="text-center py-12">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-12 cursor-pointer hover:border-emerald-500 hover:bg-emerald-50 transition-colors"
            >
              <div className="text-4xl mb-4">📄</div>
              <p className="text-lg font-medium">Klik om CSV te uploaden</p>
              <p className="text-sm text-gray-500 mt-2">
                Of sleep je bestand hierheen
              </p>
            </div>
            <p className="text-xs text-gray-400 mt-4">
              Ondersteunde velden: {allFields.join(', ')}
            </p>
          </div>
        )}

        {/* Mapping Step */}
        {step === 'mapping' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Koppel de CSV kolommen aan de juiste velden:
            </p>
            <div className="space-y-3">
              {columns.map((col, index) => (
                <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{col.header}</p>
                    <p className="text-xs text-gray-500 truncate">{col.sample}</p>
                  </div>
                  <span className="text-gray-400">→</span>
                  <select
                    value={col.mappedTo || ''}
                    onChange={(e) => handleMapping(index, e.target.value)}
                    className="px-3 py-2 border rounded-lg text-sm bg-white"
                  >
                    <option value="">-- Niet importeren --</option>
                    {allFields.map((field) => (
                      <option key={field} value={field}>
                        {field} {requiredFields.includes(field) ? '*' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <div className="flex justify-between pt-4">
              <button
                onClick={() => {
                  setStep('upload')
                  setFile(null)
                  setColumns([])
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                Terug
              </button>
              <button
                onClick={() => setStep('preview')}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Volgende
              </button>
            </div>
          </div>
        )}

        {/* Preview Step */}
        {step === 'preview' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Preview van de eerste {preview.length} rijen:
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    {columns
                      .filter((c) => c.mappedTo)
                      .map((col, i) => (
                        <th key={i} className="p-2 border text-left font-medium">
                          {col.mappedTo}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-50">
                      {columns
                        .filter((c) => c.mappedTo)
                        .map((col, colIndex) => {
                          const originalIndex = columns.indexOf(col)
                          return (
                            <td key={colIndex} className="p-2 border">
                              {row[originalIndex] || '-'}
                            </td>
                          )
                        })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between pt-4">
              <button
                onClick={() => setStep('mapping')}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                Terug
              </button>
              <div className="flex gap-2">
                <button
                  onClick={onCancel}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuleren
                </button>
                <button
                  onClick={handleImport}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Importeren ({preview.length} rijen)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CSVImporter
