'use client'

import React, { memo } from 'react'
import { Handle, Position, NodeProps } from '@xyflow/react'

interface WebhookNodeData {
  label: string
  config?: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
    url?: string
  }
  onEdit?: (nodeId: string) => void
  onDelete?: (nodeId: string) => void
}

function WebhookNode({ id, data }: NodeProps<WebhookNodeData>) {
  return (
    <div className='min-w-[200px] rounded-lg border-2 border-teal-700 bg-gradient-to-br from-teal-500 to-teal-600 px-4 py-3 shadow-lg'>
      <Handle type='target' position={Position.Top} className='h-3 w-3' />

      <div className='mb-1 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <span className='text-xl'>🔗</span>
          <span className='text-sm font-bold text-white'>WEBHOOK</span>
        </div>
        {data.onEdit && (
          <button
            onClick={() => data.onEdit?.(id)}
            className='text-xs text-white hover:text-teal-100'
          >
            ⚙️
          </button>
        )}
      </div>

      <div className='font-medium text-white'>{data.label}</div>
      {data.config?.method && (
        <div className='mt-1 rounded bg-teal-700 px-2 py-1 text-xs text-teal-100'>
          {data.config.method} {data.config.url ? new URL(data.config.url).hostname : ''}
        </div>
      )}

      <Handle type='source' position={Position.Bottom} className='h-3 w-3' />
    </div>
  )
}

export default memo(WebhookNode)
