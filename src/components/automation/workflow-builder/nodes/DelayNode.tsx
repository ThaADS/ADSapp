'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface DelayNodeData {
  label: string;
  config?: {
    delay_type?: 'fixed' | 'business_hours';
    delay_minutes?: number;
  };
  onEdit?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
}

function DelayNode({ id, data }: NodeProps<DelayNodeData>) {
  return (
    <div className="px-4 py-3 shadow-lg rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 border-2 border-orange-700 min-w-[200px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />

      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-xl">⏱️</span>
          <span className="font-bold text-white text-sm">DELAY</span>
        </div>
        {data.onEdit && (
          <button
            onClick={() => data.onEdit?.(id)}
            className="text-white hover:text-orange-100 text-xs"
          >
            ⚙️
          </button>
        )}
      </div>

      <div className="text-white font-medium">{data.label}</div>
      {data.config?.delay_minutes && (
        <div className="text-xs text-orange-100 mt-1 bg-orange-700 px-2 py-1 rounded">
          {data.config.delay_minutes} minutes
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
}

export default memo(DelayNode);
