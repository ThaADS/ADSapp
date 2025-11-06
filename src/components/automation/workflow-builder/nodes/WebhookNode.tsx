'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface WebhookNodeData {
  label: string;
  config?: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    url?: string;
  };
  onEdit?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
}

function WebhookNode({ id, data }: NodeProps<WebhookNodeData>) {
  return (
    <div className="px-4 py-3 shadow-lg rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 border-2 border-teal-700 min-w-[200px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />

      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔗</span>
          <span className="font-bold text-white text-sm">WEBHOOK</span>
        </div>
        {data.onEdit && (
          <button
            onClick={() => data.onEdit?.(id)}
            className="text-white hover:text-teal-100 text-xs"
          >
            ⚙️
          </button>
        )}
      </div>

      <div className="text-white font-medium">{data.label}</div>
      {data.config?.method && (
        <div className="text-xs text-teal-100 mt-1 bg-teal-700 px-2 py-1 rounded">
          {data.config.method} {data.config.url ? new URL(data.config.url).hostname : ''}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
}

export default memo(WebhookNode);
