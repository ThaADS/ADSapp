'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface ConditionNodeData {
  label: string;
  config?: {
    condition_type?: 'keyword_match' | 'tag_check' | 'field_comparison' | 'time_check';
    keywords?: string[];
    tag?: string;
  };
  onEdit?: (nodeId: string) => void;
  onDelete?: (nodeId: string) => void;
}

function ConditionNode({ id, data }: NodeProps<ConditionNodeData>) {
  return (
    <div className="px-4 py-3 shadow-lg rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 border-2 border-blue-700 min-w-[220px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />

      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-xl">🔀</span>
          <span className="font-bold text-white text-sm">CONDITION</span>
        </div>
        {data.onEdit && (
          <button
            onClick={() => data.onEdit?.(id)}
            className="text-white hover:text-blue-100 text-xs"
          >
            ⚙️
          </button>
        )}
      </div>

      <div className="text-white font-medium mb-2">{data.label}</div>

      {/* Condition details */}
      {data.config?.condition_type && (
        <div className="text-xs text-blue-100 bg-blue-700 px-2 py-1 rounded mb-2">
          {data.config.condition_type.replace('_', ' ')}
        </div>
      )}

      {/* True/False outputs with labels */}
      <div className="flex justify-between mt-2">
        <div className="text-xs text-white bg-green-600 px-2 py-1 rounded-full">
          ✓ True
        </div>
        <div className="text-xs text-white bg-red-600 px-2 py-1 rounded-full">
          ✗ False
        </div>
      </div>

      {/* Output handles */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        style={{ left: '30%' }}
        className="w-3 h-3 bg-green-500"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        style={{ left: '70%' }}
        className="w-3 h-3 bg-red-500"
      />
    </div>
  );
}

export default memo(ConditionNode);
