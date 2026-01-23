'use client'

import React, { memo } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'

interface DelayNodeData {
  label: string
  config?: {
    delay_type?: 'fixed' | 'business_hours'
    delay_minutes?: number
  }
  onEdit?: (nodeId: string) => void
  onDelete?: (nodeId: string) => void
}

function DelayNode({ id, data }: NodeProps<DelayNodeData>) {
  return (
    <div className='min-w-[200px] rounded-lg border-2 border-orange-700 bg-gradient-to-br from-orange-500 to-orange-600 px-4 py-3 shadow-lg'>
      <Handle type='target' position={Position.Top} className='h-3 w-3' />

      <div className='mb-1 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <span className='text-xl'>⏱️</span>
          <span className='text-sm font-bold text-white'>DELAY</span>
        </div>
        {data.onEdit && (
          <button
            onClick={() => data.onEdit?.(id)}
            className='text-xs text-white hover:text-orange-100'
          >
            ⚙️
          </button>
        )}
      </div>

      <div className='font-medium text-white'>{data.label}</div>
      {data.config?.delay_minutes && (
        <div className='mt-1 rounded bg-orange-700 px-2 py-1 text-xs text-orange-100'>
          {data.config.delay_minutes} minutes
        </div>
      )}

      <Handle type='source' position={Position.Bottom} className='h-3 w-3' />
    </div>
  )
}

export default memo(DelayNode)
