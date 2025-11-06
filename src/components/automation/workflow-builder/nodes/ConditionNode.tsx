'use client'

import React, { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'

interface ConditionNodeData {
  label: string
  config?: {
    condition_type?: 'keyword_match' | 'tag_check' | 'field_comparison' | 'time_check'
    keywords?: string[]
    tag?: string
  }
  onEdit?: (nodeId: string) => void
  onDelete?: (nodeId: string) => void
}

function ConditionNode({ id, data }: NodeProps<ConditionNodeData>) {
  return (
    <div className='min-w-[220px] rounded-lg border-2 border-blue-700 bg-gradient-to-br from-blue-500 to-blue-600 px-4 py-3 shadow-lg'>
      <Handle type='target' position={Position.Top} className='h-3 w-3' />

      <div className='mb-1 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <span className='text-xl'>🔀</span>
          <span className='text-sm font-bold text-white'>CONDITION</span>
        </div>
        {data.onEdit && (
          <button
            onClick={() => data.onEdit?.(id)}
            className='text-xs text-white hover:text-blue-100'
          >
            ⚙️
          </button>
        )}
      </div>

      <div className='mb-2 font-medium text-white'>{data.label}</div>

      {/* Condition details */}
      {data.config?.condition_type && (
        <div className='mb-2 rounded bg-blue-700 px-2 py-1 text-xs text-blue-100'>
          {data.config.condition_type.replace('_', ' ')}
        </div>
      )}

      {/* True/False outputs with labels */}
      <div className='mt-2 flex justify-between'>
        <div className='rounded-full bg-green-600 px-2 py-1 text-xs text-white'>✓ True</div>
        <div className='rounded-full bg-red-600 px-2 py-1 text-xs text-white'>✗ False</div>
      </div>

      {/* Output handles */}
      <Handle
        type='source'
        position={Position.Bottom}
        id='true'
        style={{ left: '30%' }}
        className='h-3 w-3 bg-green-500'
      />
      <Handle
        type='source'
        position={Position.Bottom}
        id='false'
        style={{ left: '70%' }}
        className='h-3 w-3 bg-red-500'
      />
    </div>
  )
}

export default memo(ConditionNode)
