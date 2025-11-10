'use client'

/**
 * CRM Field Mapping Component
 */

import { useState, useEffect } from 'react'

interface FieldMapping {
  adsappField: string
  crmField: string
  direction: 'to_crm' | 'from_crm' | 'bidirectional'
  transformRule?: any
}

interface CRMFieldMappingProps {
  organizationId: string
  crmType: string
  onSave: () => void
}

export function CRMFieldMapping({ organizationId, crmType, onSave }: CRMFieldMappingProps) {
  const [mappings, setMappings] = useState<FieldMapping[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadMappings()
  }, [crmType])

  const loadMappings = async () => {
    try {
      const response = await fetch(`/api/crm/mapping?crm_type=${crmType}`)
      const data = await response.json()

      if (data.mappings) {
        setMappings(data.mappings)
      }
    } catch (error) {
      console.error('Error loading mappings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/crm/mapping', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crmType,
          mappings,
        }),
      })

      if (response.ok) {
        alert('Field mappings saved successfully')
        onSave()
      } else {
        alert('Failed to save field mappings')
      }
    } catch (error) {
      console.error('Error saving mappings:', error)
      alert('Failed to save field mappings')
    } finally {
      setSaving(false)
    }
  }

  const updateMapping = (index: number, field: keyof FieldMapping, value: any) => {
    const newMappings = [...mappings]
    newMappings[index] = {
      ...newMappings[index],
      [field]: value,
    }
    setMappings(newMappings)
  }

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'to_crm':
        return '→'
      case 'from_crm':
        return '←'
      case 'bidirectional':
        return '↔'
      default:
        return ''
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Field Mappings</h3>
        <p className="text-sm text-gray-600">
          Configure how fields are mapped between ADSapp and {crmType}
        </p>
      </div>

      {/* Mappings Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                ADSapp Field
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Direction
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                CRM Field
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Transform
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {mappings.map((mapping, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap">
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                    {mapping.adsappField}
                  </code>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <select
                    value={mapping.direction}
                    onChange={e =>
                      updateMapping(index, 'direction', e.target.value as any)
                    }
                    className="border rounded px-2 py-1 text-sm"
                  >
                    <option value="to_crm">→ To CRM</option>
                    <option value="from_crm">← From CRM</option>
                    <option value="bidirectional">↔ Both</option>
                  </select>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <code className="text-sm bg-blue-100 px-2 py-1 rounded">
                    {mapping.crmField}
                  </code>
                </td>
                <td className="px-4 py-3">
                  {mapping.transformRule ? (
                    <span className="text-xs text-green-600">✓ Custom</span>
                  ) : (
                    <span className="text-xs text-gray-400">Default</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center pt-4 border-t">
        <div className="text-sm text-gray-600">
          {mappings.length} field mappings configured
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => loadMappings()}
            className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
              saving
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {saving ? 'Saving...' : 'Save Mappings'}
          </button>
        </div>
      </div>

      {/* Help */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">Field Mapping Guide</h4>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>• <strong>To CRM (→)</strong>: Sync from ADSapp to CRM only</li>
          <li>• <strong>From CRM (←)</strong>: Sync from CRM to ADSapp only</li>
          <li>• <strong>Bidirectional (↔)</strong>: Sync in both directions</li>
          <li>• Custom transforms allow you to modify data during sync</li>
        </ul>
      </div>
    </div>
  )
}
