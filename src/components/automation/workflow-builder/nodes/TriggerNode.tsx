'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface TriggerNodeData {
  label: string;
  config?: {
    trigger_type?: 'message_received' | 'contact_created' | 'tag_added' | 'schedule' | 'webhook';
  };
  onEdit?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
}

function TriggerNode({ id, data }: NodeProps<TriggerNodeData>) {
  return (
    <div className="px-4 py-3 shadow-lg rounded-lg bg-gradient-to-br from-green-500 to-green-600 border-2 border-green-700 min-w-[200px]">
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />

      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎯</span>
          <span className="font-bold text-white text-sm">TRIGGER</span>
        </div>
        {data.onEdit && (
          <button
            onClick={() => data.onEdit?.(id)}
            className="text-white hover:text-green-100 text-xs"
          >
            ⚙️
          </button>
        )}
      </div>

      <div className="text-white font-medium">{data.label}</div>
      {data.config?.trigger_type && (
        <div className="text-xs text-green-100 mt-1 bg-green-700 px-2 py-1 rounded">
          {data.config.trigger_type.replace('_', ' ')}
        </div>
      )}
    </div>
  );
}

export default memo(TriggerNode);
