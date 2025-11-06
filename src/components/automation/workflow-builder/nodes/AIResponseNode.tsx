'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface AIResponseNodeData {
  label: string;
  config?: {
    model?: 'gpt-4' | 'gpt-3.5-turbo' | 'claude-3';
    prompt_template?: string;
  };
  onEdit?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
}

function AIResponseNode({ id, data }: NodeProps<AIResponseNodeData>) {
  return (
    <div className="px-4 py-3 shadow-lg rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 border-2 border-pink-700 min-w-[200px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />

      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-xl">🤖</span>
          <span className="font-bold text-white text-sm">AI RESPONSE</span>
        </div>
        {data.onEdit && (
          <button
            onClick={() => data.onEdit?.(id)}
            className="text-white hover:text-pink-100 text-xs"
          >
            ⚙️
          </button>
        )}
      </div>

      <div className="text-white font-medium">{data.label}</div>
      {data.config?.model && (
        <div className="text-xs text-pink-100 mt-1 bg-pink-700 px-2 py-1 rounded">
          {data.config.model}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
}

export default memo(AIResponseNode);
