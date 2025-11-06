'use client'

import React, { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'

interface TriggerNodeData {
  label: string
  config?: {
    trigger_type?: 'message_received' | 'contact_created' | 'tag_added' | 'schedule' | 'webhook'
  }
  onEdit?: (nodeId: string) => void
  onDelete?: (nodeId: string) => void
}

function TriggerNode({ id, data }: NodeProps<TriggerNodeData>) {
  return (
    <div className='min-w-[200px] rounded-lg border-2 border-green-700 bg-gradient-to-br from-green-500 to-green-600 px-4 py-3 shadow-lg'>
      <Handle type='source' position={Position.Bottom} className='h-3 w-3' />

      <div className='mb-1 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <span className='text-xl'>🎯</span>
          <span className='text-sm font-bold text-white'>TRIGGER</span>
        </div>
        {data.onEdit && (
          <button
            onClick={() => data.onEdit?.(id)}
            className='text-xs text-white hover:text-green-100'
          >
            ⚙️
          </button>
        )}
      </div>

      <div className='font-medium text-white'>{data.label}</div>
      {data.config?.trigger_type && (
        <div className='mt-1 rounded bg-green-700 px-2 py-1 text-xs text-green-100'>
          {data.config.trigger_type.replace('_', ' ')}
        </div>
      )}
    </div>
  )
}

export default memo(TriggerNode)
