'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface ActionNodeData {
  label: string;
  config?: {
    action_type?: 'send_message' | 'add_tag' | 'remove_tag' | 'assign_agent' | 'set_priority' | 'create_note';
  };
  onEdit?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
}

function ActionNode({ id, data }: NodeProps<ActionNodeData>) {
  return (
    <div className="px-4 py-3 shadow-lg rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 border-2 border-purple-700 min-w-[200px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />

      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-xl">⚡</span>
          <span className="font-bold text-white text-sm">ACTION</span>
        </div>
        {data.onEdit && (
          <button
            onClick={() => data.onEdit?.(id)}
            className="text-white hover:text-purple-100 text-xs"
          >
            ⚙️
          </button>
        )}
      </div>

      <div className="text-white font-medium">{data.label}</div>
      {data.config?.action_type && (
        <div className="text-xs text-purple-100 mt-1 bg-purple-700 px-2 py-1 rounded">
          {data.config.action_type.replace('_', ' ')}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
}

export default memo(ActionNode);
