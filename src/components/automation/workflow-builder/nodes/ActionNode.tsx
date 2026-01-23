'use client'

import React, { memo } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'

interface ActionNodeData {
  label: string
  config?: {
    action_type?:
      | 'send_message'
      | 'add_tag'
      | 'remove_tag'
      | 'assign_agent'
      | 'set_priority'
      | 'create_note'
  }
  onEdit?: (nodeId: string) => void
  onDelete?: (nodeId: string) => void
}

function ActionNode({ id, data }: NodeProps<ActionNodeData>) {
  return (
    <div className='min-w-[200px] rounded-lg border-2 border-purple-700 bg-gradient-to-br from-purple-500 to-purple-600 px-4 py-3 shadow-lg'>
      <Handle type='target' position={Position.Top} className='h-3 w-3' />

      <div className='mb-1 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <span className='text-xl'>⚡</span>
          <span className='text-sm font-bold text-white'>ACTION</span>
        </div>
        {data.onEdit && (
          <button
            onClick={() => data.onEdit?.(id)}
            className='text-xs text-white hover:text-purple-100'
          >
            ⚙️
          </button>
        )}
      </div>

      <div className='font-medium text-white'>{data.label}</div>
      {data.config?.action_type && (
        <div className='mt-1 rounded bg-purple-700 px-2 py-1 text-xs text-purple-100'>
          {data.config.action_type.replace('_', ' ')}
        </div>
      )}

      <Handle type='source' position={Position.Bottom} className='h-3 w-3' />
    </div>
  )
}

export default memo(ActionNode)
