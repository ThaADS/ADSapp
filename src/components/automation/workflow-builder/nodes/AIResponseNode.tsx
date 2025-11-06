'use client'

import React, { memo } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'

interface AIResponseNodeData {
  label: string
  config?: {
    model?: 'gpt-4' | 'gpt-3.5-turbo' | 'claude-3'
    prompt_template?: string
  }
  onEdit?: (nodeId: string) => void
  onDelete?: (nodeId: string) => void
}

function AIResponseNode({ id, data }: NodeProps<AIResponseNodeData>) {
  return (
    <div className='min-w-[200px] rounded-lg border-2 border-pink-700 bg-gradient-to-br from-pink-500 to-pink-600 px-4 py-3 shadow-lg'>
      <Handle type='target' position={Position.Top} className='h-3 w-3' />

      <div className='mb-1 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <span className='text-xl'>🤖</span>
          <span className='text-sm font-bold text-white'>AI RESPONSE</span>
        </div>
        {data.onEdit && (
          <button
            onClick={() => data.onEdit?.(id)}
            className='text-xs text-white hover:text-pink-100'
          >
            ⚙️
          </button>
        )}
      </div>

      <div className='font-medium text-white'>{data.label}</div>
      {data.config?.model && (
        <div className='mt-1 rounded bg-pink-700 px-2 py-1 text-xs text-pink-100'>
          {data.config.model}
        </div>
      )}

      <Handle type='source' position={Position.Bottom} className='h-3 w-3' />
    </div>
  )
}

export default memo(AIResponseNode)
